"""Repository helpers for reading migration audit trail state."""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class MigrationAuditRepo:
    @staticmethod
    def get_latest() -> dict[str, Any] | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, applied_at, db_revision, alembic_head, status, environment, service_version, details_json
                FROM db_migration_audit
                ORDER BY applied_at DESC, id DESC
                LIMIT 1
                """
            ).fetchone()
        return dict(row) if row else None
