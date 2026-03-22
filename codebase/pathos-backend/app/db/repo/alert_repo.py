"""app.db.repo.alert_repo

WHY THIS FILE EXISTS:
Persistence adapter for alerts derived from saved search runs.

LAYER FIT:
- Repository layer.

WHAT THIS FILE MUST NOT DO:
- Must not call upstream APIs.
- Must not include business diff logic.
"""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class AlertRepo:
    """SQLite repository for alert records."""

    @staticmethod
    def create(record: dict[str, Any]) -> None:
        """Insert alert row."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO alerts (id, saved_search_id, created_at, title, summary, job_ids_json, acknowledged_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["saved_search_id"],
                    record["created_at"],
                    record["title"],
                    record["summary"],
                    record["job_ids_json"],
                    record.get("acknowledged_at"),
                ),
            )
            conn.commit()

    @staticmethod
    def list_all(limit: int) -> list[dict[str, Any]]:
        """List most recent alerts first."""

        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, saved_search_id, created_at, title, summary, job_ids_json, acknowledged_at
                FROM alerts
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def get_by_id(alert_id: str) -> dict[str, Any] | None:
        """Return single alert by id."""

        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, saved_search_id, created_at, title, summary, job_ids_json, acknowledged_at
                FROM alerts
                WHERE id = ?
                """,
                (alert_id,),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def acknowledge(alert_id: str, acknowledged_at: str) -> bool:
        """Set acknowledged timestamp and report whether row exists."""

        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                UPDATE alerts
                SET acknowledged_at = ?
                WHERE id = ?
                """,
                (acknowledged_at, alert_id),
            )
            conn.commit()
            return cursor.rowcount > 0
