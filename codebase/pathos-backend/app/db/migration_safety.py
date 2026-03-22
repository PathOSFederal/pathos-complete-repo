"""Migration safety checks that keep runtime schema aligned with Alembic head."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from alembic.config import Config
from alembic.script import ScriptDirectory


@dataclass(frozen=True)
class MigrationSafetyResult:
    """Deterministic migration readiness payload for startup and health checks."""

    db_revision: str | None
    alembic_head: str | None
    migration_status: Literal["ok", "mismatch", "unknown"]
    message: str


class MigrationSafetyError(RuntimeError):
    """Raised when startup migration safety checks fail."""


def _build_alembic_config() -> Config:
    repo_root = Path(__file__).resolve().parents[2]
    config = Config(str(repo_root / "alembic.ini"))
    config.set_main_option("script_location", str(repo_root / "alembic"))
    return config


def get_alembic_head() -> str:
    script_dir = ScriptDirectory.from_config(_build_alembic_config())
    return str(script_dir.get_current_head())


def _extract_revision(row: Any) -> str | None:
    if row is None:
        return None
    if isinstance(row, dict):
        value = row.get("version_num")
        if value is None:
            return None
        return str(value)
    if hasattr(row, "keys"):
        row_keys = row.keys()
        if "version_num" in row_keys:
            return str(row["version_num"])
    if isinstance(row, (list, tuple)) and row:
        return str(row[0])
    value = getattr(row, "version_num", None)
    if value is None:
        return None
    return str(value)


def get_db_revision(connection_or_engine: Any) -> str | None:
    query = "SELECT version_num FROM alembic_version LIMIT 1"
    if hasattr(connection_or_engine, "connect") and not hasattr(
        connection_or_engine, "execute"
    ):
        with connection_or_engine.connect() as conn:
            row = conn.execute(query).fetchone()
            return _extract_revision(row)
    try:
        row = connection_or_engine.execute(query).fetchone()
    except Exception:
        return None
    return _extract_revision(row)


def _build_mismatch_message(
    *, current_revision: str | None, head_revision: str | None
) -> str:
    current = current_revision if current_revision else "None"
    head = head_revision if head_revision else "None"
    return (
        "Database schema revision mismatch detected. "
        f"current revision: {current}; "
        f"head revision: {head}; "
        "remediation: alembic upgrade head"
    )


def assert_db_at_head(
    mode: Literal["fail", "warn"],
    *,
    connection_or_engine: Any,
) -> MigrationSafetyResult:
    db_revision = get_db_revision(connection_or_engine)
    try:
        alembic_head = get_alembic_head()
    except Exception:
        alembic_head = None

    if db_revision is None or alembic_head is None:
        message = _build_mismatch_message(
            current_revision=db_revision, head_revision=alembic_head
        )
        result = MigrationSafetyResult(
            db_revision=db_revision,
            alembic_head=alembic_head,
            migration_status="unknown",
            message=message,
        )
        if mode == "fail":
            raise MigrationSafetyError(message)
        return result

    if db_revision != alembic_head:
        message = _build_mismatch_message(
            current_revision=db_revision, head_revision=alembic_head
        )
        result = MigrationSafetyResult(
            db_revision=db_revision,
            alembic_head=alembic_head,
            migration_status="mismatch",
            message=message,
        )
        if mode == "fail":
            raise MigrationSafetyError(message)
        return result

    return MigrationSafetyResult(
        db_revision=db_revision,
        alembic_head=alembic_head,
        migration_status="ok",
        message="Database schema revision matches Alembic head.",
    )
