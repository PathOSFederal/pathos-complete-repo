"""Readiness checks shared by API health and worker startup."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from app.db.connection import connect
from app.db.migration_safety import MigrationSafetyResult, assert_db_at_head


class DatabaseReadinessError(RuntimeError):
    """Raised when database connectivity/readiness checks fail."""


def ensure_database_connectivity() -> None:
    try:
        with connect() as conn:
            conn.execute("SELECT 1").fetchone()
    except Exception as exc:
        raise DatabaseReadinessError("Database connectivity check failed.") from exc


def ensure_database_ready(
    *,
    db_path: Path,
    include_migration_check: bool = False,
    migration_mode: Literal["fail", "warn"] = "warn",
) -> MigrationSafetyResult | None:
    del db_path
    ensure_database_connectivity()
    if not include_migration_check:
        return None
    with connect() as conn:
        return assert_db_at_head(migration_mode, connection_or_engine=conn)
