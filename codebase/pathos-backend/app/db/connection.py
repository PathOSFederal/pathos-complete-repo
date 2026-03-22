from __future__ import annotations

import os
import sqlite3
import logging
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Literal
from uuid import uuid4

from alembic import command
from alembic.config import Config

from app.core.config import (
    get_database_url,
    get_db_dialect,
    get_runtime_env,
    get_sqlalchemy_database_url,
)
from app.core.logging import DEFAULT_SERVICE_VERSION, log_event
from app.db.migrations.runner import run_migrations
from app.db.migration_safety import (
    MigrationSafetyError,
    assert_db_at_head,
    get_db_revision,
    get_alembic_head,
)


DEFAULT_DB_PATH = Path("data") / "pathos.db"
POSTGRES_CONNECT_TIMEOUT_SECONDS = 5
POSTGRES_STATEMENT_TIMEOUT_MS = 5000
logger = logging.getLogger("pathos.db.connection")


def get_db_path() -> Path:
    configured_path = os.getenv("PATHOS_DB_PATH")
    db_path = Path(configured_path) if configured_path else DEFAULT_DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


def _adapt_sql_placeholders(sql: str) -> str:
    if "?" not in sql:
        return sql
    converted: list[str] = []
    in_single = False
    in_double = False
    for ch in sql:
        if ch == "'" and not in_double:
            in_single = not in_single
            converted.append(ch)
            continue
        if ch == '"' and not in_single:
            in_double = not in_double
            converted.append(ch)
            continue
        if ch == "?" and not in_single and not in_double:
            converted.append("%s")
            continue
        converted.append(ch)
    return "".join(converted)


def _split_sql_statements(sql: str) -> list[str]:
    return [statement.strip() for statement in sql.split(";") if statement.strip()]


def _escape_configparser_value(value: str) -> str:
    """Protect Alembic's ConfigParser from interpolating '%' in database URLs."""
    return value.replace("%", "%%")


def _build_alembic_config() -> Config:
    """Build an Alembic Config that points at the repo's migration scripts."""
    repo_root = Path(__file__).resolve().parents[2]
    config = Config(str(repo_root / "alembic.ini"))
    config.set_main_option("script_location", str(repo_root / "alembic"))
    # Use the app's SQLAlchemy URL normalization, then escape '%' for ConfigParser.
    sqlalchemy_url = get_sqlalchemy_database_url()
    config.set_main_option("sqlalchemy.url", _escape_configparser_value(sqlalchemy_url))
    return config


def _run_postgres_migrations() -> None:
    """Run Alembic upgrade so Postgres schemas exist before repos run."""
    log_event(
        logger,
        level=logging.INFO,
        event_id="migration_upgrade_started",
        message="Starting Alembic migration upgrade to head.",
        details={"dialect": "postgres"},
    )
    command.upgrade(_build_alembic_config(), "head")
    log_event(
        logger,
        level=logging.INFO,
        event_id="migration_upgrade_completed",
        message="Completed Alembic migration upgrade to head.",
        details={"dialect": "postgres"},
    )


def _migration_safety_mode() -> Literal["fail", "warn"]:
    runtime_env = get_runtime_env().strip().lower()
    if runtime_env in {"prod", "production"}:
        return "fail"
    return "warn"


class PostgresConnection:
    def __init__(self, connection) -> None:
        self._connection = connection

    def execute(self, sql: str, params: Iterable[Any] | None = None):
        if params is None:
            return self._connection.execute(sql)
        adapted_sql = _adapt_sql_placeholders(sql)
        return self._connection.execute(adapted_sql, params)

    def executescript(self, sql: str) -> None:
        for statement in _split_sql_statements(sql):
            self.execute(statement)

    def commit(self) -> None:
        self._connection.commit()

    def close(self) -> None:
        self._connection.close()

    def __enter__(self):
        self._connection.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb):
        return self._connection.__exit__(exc_type, exc, tb)


def _connect_postgres() -> PostgresConnection:
    database_url = get_database_url()
    if not database_url:
        raise ValueError("DATABASE_URL must be set when DB_DIALECT=postgres")
    try:
        import psycopg  # type: ignore[import-not-found]
        from psycopg.rows import dict_row  # type: ignore[import-not-found]
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "psycopg is required for postgres support. Install psycopg[binary]."
        ) from exc

    connection = psycopg.connect(
        database_url,
        connect_timeout=POSTGRES_CONNECT_TIMEOUT_SECONDS,
        options=f"-c statement_timeout={POSTGRES_STATEMENT_TIMEOUT_MS}",
        row_factory=dict_row,
    )
    return PostgresConnection(connection)


def connect(*, db_path: Path | None = None):
    if get_db_dialect() == "postgres":
        return _connect_postgres()
    connection = sqlite3.connect(db_path or get_db_path())
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _table_columns(conn, table_name: str, *, dialect: str) -> set[str]:
    if dialect == "postgres":
        rows = conn.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ?
            """,
            (table_name,),
        ).fetchall()
        return {row["column_name"] for row in rows}
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def _stamp_sqlite_alembic_head(conn) -> None:
    head_revision = get_alembic_head()
    conn.execute(
        "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)"
    )
    conn.execute("DELETE FROM alembic_version")
    conn.execute(
        "INSERT INTO alembic_version(version_num) VALUES (?)", (head_revision,)
    )


def _enforce_migration_safety(conn, *, mode: Literal["fail", "warn"]) -> None:
    try:
        result = assert_db_at_head(mode, connection_or_engine=conn)
    except MigrationSafetyError as exc:
        db_revision = None
        alembic_head = None
        try:
            db_revision = get_db_revision(conn)
            alembic_head = get_alembic_head()
        except Exception:
            pass
        _record_migration_audit(
            conn,
            status="mismatch",
            db_revision=db_revision,
            alembic_head=alembic_head,
            details={"error": str(exc)},
        )
        log_event(
            logger,
            level=logging.ERROR,
            event_id="migration_safety_mismatch",
            message="Database revision mismatch detected during startup migration safety enforcement.",
            details={"error": str(exc)},
        )
        raise
    if mode == "warn" and result.migration_status != "ok":
        _record_migration_audit(
            conn,
            status="mismatch",
            db_revision=result.db_revision,
            alembic_head=result.alembic_head,
            details={"migration_status": result.migration_status},
        )
        log_event(
            logger,
            level=logging.WARNING,
            event_id="migration_safety_mismatch",
            message="Database revision mismatch detected during startup migration safety enforcement.",
            details={
                "db_revision": result.db_revision,
                "alembic_head": result.alembic_head,
                "migration_status": result.migration_status,
                "remediation": "alembic upgrade head",
            },
        )


def _record_migration_audit(
    conn,
    *,
    status: str,
    db_revision: str | None,
    alembic_head: str | None,
    details: dict[str, Any] | None,
) -> None:
    try:
        conn.execute(
            """
            INSERT INTO db_migration_audit (
                id,
                applied_at,
                db_revision,
                alembic_head,
                status,
                environment,
                service_version,
                details_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                datetime.now(timezone.utc).isoformat(),
                db_revision,
                alembic_head,
                status,
                get_runtime_env(),
                DEFAULT_SERVICE_VERSION,
                json.dumps(details or {}, sort_keys=True),
            ),
        )
        conn.commit()
        log_event(
            logger,
            level=logging.INFO,
            event_id="migration_audit_written",
            message="Migration audit record written.",
            details={
                "status": status,
                "db_revision": db_revision,
                "alembic_head": alembic_head,
            },
        )
    except Exception as exc:
        log_event(
            logger,
            level=logging.WARNING,
            event_id="migration_safety_exception",
            message="Migration audit logging failed while recording migration safety state.",
            details={"error": str(exc), "status": status},
        )


def init_db() -> None:
    dialect = get_db_dialect()
    mode = _migration_safety_mode()
    if dialect == "postgres":
        # Postgres uses Alembic; the sqlite migration runner is file-based and sqlite-only.
        _run_postgres_migrations()
        with connect() as conn:
            _enforce_migration_safety(conn, mode=mode)
            _record_migration_audit(
                conn,
                status="success",
                db_revision=get_db_revision(conn),
                alembic_head=get_alembic_head(),
                details={"dialect": "postgres"},
            )
        return
    log_event(
        logger,
        level=logging.INFO,
        event_id="migration_upgrade_started",
        message="Starting sqlite migration runner upgrade to head-equivalent state.",
        details={"dialect": "sqlite"},
    )
    run_migrations(get_db_path())
    log_event(
        logger,
        level=logging.INFO,
        event_id="migration_upgrade_completed",
        message="Completed sqlite migration runner upgrade to head-equivalent state.",
        details={"dialect": "sqlite"},
    )
    with connect() as conn:
        # Backward-compatible column checks for databases created before summary fields existed.
        thread_columns = _table_columns(conn, "threads", dialect=dialect)
        if "summary" not in thread_columns:
            conn.execute("ALTER TABLE threads ADD COLUMN summary TEXT NULL")
        if "summary_updated_at" not in thread_columns:
            conn.execute("ALTER TABLE threads ADD COLUMN summary_updated_at TEXT NULL")
        if "summary_version" not in thread_columns:
            conn.execute(
                "ALTER TABLE threads ADD COLUMN summary_version TEXT NOT NULL DEFAULT 'v1'"
            )

        saved_search_columns = _table_columns(conn, "saved_searches", dialect=dialect)
        if "query_payload" not in saved_search_columns:
            conn.execute(
                "ALTER TABLE saved_searches ADD COLUMN query_payload TEXT NULL"
            )
        if "profile_payload" not in saved_search_columns:
            conn.execute(
                "ALTER TABLE saved_searches ADD COLUMN profile_payload TEXT NULL"
            )
        if "ruleset_version" not in saved_search_columns:
            conn.execute(
                "ALTER TABLE saved_searches ADD COLUMN ruleset_version TEXT NULL"
            )
        conn.execute(
            """
            UPDATE saved_searches
            SET query_payload = filters_json
            WHERE query_payload IS NULL
            """
        )
        conn.execute(
            """
            UPDATE saved_searches
            SET ruleset_version = 'job-scoring-v1'
            WHERE ruleset_version IS NULL OR ruleset_version = ''
            """
        )
        alert_runs_columns = _table_columns(conn, "alert_runs", dialect=dialect)
        if "skip_reason" not in alert_runs_columns:
            conn.execute("ALTER TABLE alert_runs ADD COLUMN skip_reason TEXT NULL")
        if "skip_details" not in alert_runs_columns:
            conn.execute("ALTER TABLE alert_runs ADD COLUMN skip_details TEXT NULL")
        _stamp_sqlite_alembic_head(conn)
        conn.commit()
        _enforce_migration_safety(conn, mode=mode)
        result = assert_db_at_head("warn", connection_or_engine=conn)
        _record_migration_audit(
            conn,
            status="success" if result.migration_status == "ok" else "mismatch",
            db_revision=result.db_revision,
            alembic_head=result.alembic_head,
            details={"dialect": "sqlite", "migration_status": result.migration_status},
        )
