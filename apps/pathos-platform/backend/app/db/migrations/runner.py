from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from app.core.config import get_database_url, get_db_dialect

MIGRATIONS_DIR = Path(__file__).resolve().parent
POSTGRES_CONNECT_TIMEOUT_SECONDS = 5
POSTGRES_STATEMENT_TIMEOUT_MS = 5000


def _ensure_migration_table(connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            migration_id TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        """
    )


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


def _connect_postgres():
    database_url = get_database_url()
    if not database_url:
        raise ValueError("DATABASE_URL must be set when DB_DIALECT=postgres")
    try:
        import psycopg  # type: ignore[import-not-found]
        from psycopg.rows import dict_row  # type: ignore[import-not-found]
    except ModuleNotFoundError as exc:
        raise RuntimeError("psycopg is required for postgres support. Install psycopg[binary].") from exc
    return psycopg.connect(
        database_url,
        connect_timeout=POSTGRES_CONNECT_TIMEOUT_SECONDS,
        options=f"-c statement_timeout={POSTGRES_STATEMENT_TIMEOUT_MS}",
        row_factory=dict_row,
    )


def _execute(connection, sql: str, params: Iterable[Any] | None, *, dialect: str):
    if params is None:
        return connection.execute(sql)
    if dialect == "postgres":
        return connection.execute(_adapt_sql_placeholders(sql), params)
    return connection.execute(sql, params)


def _migration_files() -> list[Path]:
    return sorted(path for path in MIGRATIONS_DIR.glob("*.sql") if path.is_file())


def get_pending_migrations(db_path: Path) -> list[str]:
    dialect = get_db_dialect()
    if dialect != "postgres":
        if not db_path.exists():
            return []
        with sqlite3.connect(db_path) as connection:
            connection.row_factory = sqlite3.Row
            has_table = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations' LIMIT 1"
            ).fetchone()
            if has_table is None:
                return []
            applied_rows = connection.execute("SELECT migration_id FROM schema_migrations").fetchall()
            applied_ids = {str(row["migration_id"]) for row in applied_rows}
    else:
        with _connect_postgres() as connection:
            has_table = connection.execute(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'schema_migrations'
                LIMIT 1
                """
            ).fetchone()
            if has_table is None:
                return []
            applied_rows = connection.execute("SELECT migration_id FROM schema_migrations").fetchall()
            applied_ids = {str(row["migration_id"]) for row in applied_rows}
    all_ids = [path.name for path in _migration_files()]
    return [migration_id for migration_id in all_ids if migration_id not in applied_ids]


def run_migrations(db_path: Path) -> int:
    applied_count = 0
    dialect = get_db_dialect()
    if dialect != "postgres":
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(db_path) as connection:
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA foreign_keys = ON")
            _ensure_migration_table(connection)
            applied_rows = connection.execute("SELECT migration_id FROM schema_migrations").fetchall()
            applied_ids = {row["migration_id"] for row in applied_rows}

            for migration_file in _migration_files():
                migration_id = migration_file.name
                if migration_id in applied_ids:
                    continue
                sql = migration_file.read_text(encoding="utf-8")
                connection.executescript(sql)
                connection.execute(
                    """
                    INSERT INTO schema_migrations (migration_id, applied_at)
                    VALUES (?, ?)
                    """,
                    (migration_id, datetime.now(timezone.utc).isoformat()),
                )
                applied_count += 1
            connection.commit()
    else:
        with _connect_postgres() as connection:
            _ensure_migration_table(connection)
            applied_rows = connection.execute("SELECT migration_id FROM schema_migrations").fetchall()
            applied_ids = {row["migration_id"] for row in applied_rows}

            for migration_file in _migration_files():
                migration_id = migration_file.name
                if migration_id in applied_ids:
                    continue
                sql = migration_file.read_text(encoding="utf-8")
                for statement in _split_sql_statements(sql):
                    _execute(connection, statement, None, dialect=dialect)
                _execute(
                    connection,
                    """
                    INSERT INTO schema_migrations (migration_id, applied_at)
                    VALUES (?, ?)
                    """,
                    (migration_id, datetime.now(timezone.utc).isoformat()),
                    dialect=dialect,
                )
                applied_count += 1
            connection.commit()
    return applied_count
