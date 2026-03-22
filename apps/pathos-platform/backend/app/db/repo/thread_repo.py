from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, cast
from uuid import uuid4

from app.db.connection import connect, init_db
from app.models.thread import MessageOut, ThreadOut


class ThreadRepo:
    @staticmethod
    def _normalize_role(role: str) -> Literal["user", "assistant"]:
        if role == "user":
            return "user"
        return cast(Literal["assistant"], role)

    @staticmethod
    def create_thread(title: str, consent_store: bool) -> ThreadOut:
        init_db()
        now = datetime.now(timezone.utc).isoformat()
        thread_id = str(uuid4())
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO threads (
                    thread_id,
                    created_at,
                    updated_at,
                    title,
                    consent_store,
                    summary,
                    summary_updated_at,
                    summary_version
                )
                VALUES (?, ?, ?, ?, ?, NULL, NULL, 'v1')
                """,
                (thread_id, now, now, title, int(consent_store)),
            )
            conn.commit()
        return ThreadOut(
            thread_id=thread_id,
            created_at=datetime.fromisoformat(now),
            updated_at=datetime.fromisoformat(now),
            title=title,
            consent_store=consent_store,
        )

    @staticmethod
    def get_thread(thread_id: str) -> ThreadOut | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT thread_id, created_at, updated_at, title, consent_store
                FROM threads
                WHERE thread_id = ?
                """,
                (thread_id,),
            ).fetchone()
        if row is None:
            return None
        return ThreadOut(
            thread_id=row["thread_id"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            title=row["title"],
            consent_store=bool(row["consent_store"]),
        )

    @staticmethod
    def get_thread_record(thread_id: str) -> dict | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT
                    thread_id,
                    created_at,
                    updated_at,
                    title,
                    consent_store,
                    summary,
                    summary_updated_at,
                    summary_version
                FROM threads
                WHERE thread_id = ?
                """,
                (thread_id,),
            ).fetchone()
        return dict(row) if row is not None else None

    @staticmethod
    def list_threads(limit: int) -> list[ThreadOut]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT thread_id, created_at, updated_at, title, consent_store
                FROM threads
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [
            ThreadOut(
                thread_id=row["thread_id"],
                created_at=datetime.fromisoformat(row["created_at"]),
                updated_at=datetime.fromisoformat(row["updated_at"]),
                title=row["title"],
                consent_store=bool(row["consent_store"]),
            )
            for row in rows
        ]

    @staticmethod
    def list_thread_records(limit: int) -> list[dict]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    thread_id,
                    created_at,
                    updated_at,
                    title,
                    consent_store,
                    summary,
                    summary_updated_at,
                    summary_version
                FROM threads
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def add_message(
        thread_id: str, role: str, content: str, trace_id: str | None
    ) -> MessageOut:
        init_db()
        message_id = str(uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO thread_messages (message_id, thread_id, created_at, role, content, trace_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (message_id, thread_id, created_at, role, content, trace_id),
            )
            conn.commit()
        return MessageOut(
            message_id=message_id,
            thread_id=thread_id,
            created_at=datetime.fromisoformat(created_at),
            role=ThreadRepo._normalize_role(role),
            content=content,
            trace_id=trace_id,
        )

    @staticmethod
    def list_messages(thread_id: str, limit: int, offset: int = 0) -> list[MessageOut]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT message_id, thread_id, created_at, role, content, trace_id
                FROM thread_messages
                WHERE thread_id = ?
                ORDER BY created_at ASC
                LIMIT ?
                OFFSET ?
                """,
                (thread_id, limit, offset),
            ).fetchall()
        return [
            MessageOut(
                message_id=row["message_id"],
                thread_id=row["thread_id"],
                created_at=datetime.fromisoformat(row["created_at"]),
                role=ThreadRepo._normalize_role(row["role"]),
                content=row["content"],
                trace_id=row["trace_id"],
            )
            for row in rows
        ]

    @staticmethod
    def list_thread_messages(thread_id: str) -> list[dict]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    message_id,
                    thread_id,
                    created_at,
                    role,
                    content,
                    trace_id
                FROM thread_messages
                WHERE thread_id = ?
                ORDER BY created_at ASC
                """,
                (thread_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def update_thread_timestamp(thread_id: str) -> None:
        init_db()
        updated_at = datetime.now(timezone.utc).isoformat()
        with connect() as conn:
            conn.execute(
                """
                UPDATE threads
                SET updated_at = ?
                WHERE thread_id = ?
                """,
                (updated_at, thread_id),
            )
            conn.commit()

    @staticmethod
    def set_thread_summary(
        thread_id: str, summary: str, summary_updated_at: str, summary_version: str
    ) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                UPDATE threads
                SET
                    summary = ?,
                    summary_updated_at = ?,
                    summary_version = ?,
                    updated_at = ?
                WHERE thread_id = ?
                """,
                (
                    summary,
                    summary_updated_at,
                    summary_version,
                    summary_updated_at,
                    thread_id,
                ),
            )
            conn.commit()

    @staticmethod
    def get_thread_summary(thread_id: str) -> tuple[str | None, str | None, str]:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT summary, summary_updated_at, summary_version
                FROM threads
                WHERE thread_id = ?
                """,
                (thread_id,),
            ).fetchone()
        if row is None:
            return None, None, "v1"
        summary_version = row["summary_version"] if row["summary_version"] else "v1"
        return row["summary"], row["summary_updated_at"], summary_version

    @staticmethod
    def delete_thread(thread_id: str) -> bool:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                DELETE FROM thread_messages
                WHERE thread_id = ?
                """,
                (thread_id,),
            )
            cursor = conn.execute(
                """
                DELETE FROM threads
                WHERE thread_id = ?
                """,
                (thread_id,),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete_all_threads_and_messages() -> tuple[int, int]:
        init_db()
        with connect() as conn:
            message_cursor = conn.execute("DELETE FROM thread_messages")
            thread_cursor = conn.execute("DELETE FROM threads")
            conn.commit()
            return thread_cursor.rowcount, message_cursor.rowcount

    @staticmethod
    def purge_summaries_older_than(cutoff_ts: str) -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                UPDATE threads
                SET summary = NULL, summary_updated_at = NULL
                WHERE summary_updated_at IS NOT NULL AND summary_updated_at < ?
                """,
                (cutoff_ts,),
            )
            conn.commit()
            return int(cursor.rowcount)
