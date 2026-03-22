"""app.db.repo.advisor_session_repo

WHY THIS FILE EXISTS:
Persistence adapter for append-only advisor sessions and events.

LAYER FIT:
- Repository layer.

WHAT THIS FILE MUST NOT DO:
- Must not decide business validity for event types.
"""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class AdvisorSessionRepo:
    """SQLite repository for advisor session entities."""

    @staticmethod
    def create_session(record: dict[str, Any]) -> None:
        """Insert a new advisor session row."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO advisor_sessions (id, created_at, closed_at, context_json, request_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["created_at"],
                    record.get("closed_at"),
                    record["context_json"],
                    record["request_id"],
                ),
            )
            conn.commit()

    @staticmethod
    def get_session(session_id: str) -> dict[str, Any] | None:
        """Fetch one session by id."""

        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, created_at, closed_at, context_json, request_id
                FROM advisor_sessions
                WHERE id = ?
                """,
                (session_id,),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def close_session(session_id: str, closed_at: str) -> bool:
        """Close session idempotently and report whether row exists."""

        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                UPDATE advisor_sessions
                SET closed_at = COALESCE(closed_at, ?)
                WHERE id = ?
                """,
                (closed_at, session_id),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def append_event(record: dict[str, Any]) -> None:
        """Insert append-only event row."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO advisor_session_events (id, session_id, event_type, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["session_id"],
                    record["event_type"],
                    record["payload_json"],
                    record["created_at"],
                ),
            )
            conn.commit()

    @staticmethod
    def list_events(session_id: str) -> list[dict[str, Any]]:
        """Return session events in append order."""

        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, session_id, event_type, payload_json, created_at
                FROM advisor_session_events
                WHERE session_id = ?
                ORDER BY created_at ASC
                """,
                (session_id,),
            ).fetchall()
        return [dict(row) for row in rows]
