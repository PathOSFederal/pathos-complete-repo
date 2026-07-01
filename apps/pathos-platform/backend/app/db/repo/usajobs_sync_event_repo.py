"""Persistence for USAJOBS sync alert and indexing queue rows."""

from __future__ import annotations

import json
from typing import Any, Literal
from uuid import uuid4

from app.db.connection import connect, init_db

QueueName = Literal["alert", "indexing"]


class USAJobsSyncEventRepo:
    """Durable queue/outbox records for staging-safe USAJOBS sync side effects."""

    @staticmethod
    def _table_name(queue_name: QueueName) -> str:
        if queue_name == "alert":
            return "job_alert_events"
        return "job_page_indexing_events"

    @staticmethod
    def enqueue(
        *,
        queue_name: QueueName,
        sync_run_id: str,
        saved_search_id: str | None,
        source_job_id: str,
        canonical_job_id: str,
        event_type: str,
        reason: str,
        payload_summary: dict[str, Any],
        dedupe_key: str,
        created_at: str,
    ) -> bool:
        """Insert a queue row and return True only when a new row was created."""

        table_name = USAJobsSyncEventRepo._table_name(queue_name)
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                f"""
                INSERT INTO {table_name} (
                    id,
                    sync_run_id,
                    saved_search_id,
                    source_job_id,
                    canonical_job_id,
                    event_type,
                    reason,
                    payload_summary_json,
                    dedupe_key,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(dedupe_key) DO NOTHING
                """,
                (
                    str(uuid4()),
                    sync_run_id,
                    saved_search_id,
                    source_job_id,
                    canonical_job_id,
                    event_type,
                    reason,
                    json.dumps(payload_summary, sort_keys=True, separators=(",", ":")),
                    dedupe_key,
                    "queued",
                    created_at,
                    created_at,
                ),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def list_events(queue_name: QueueName) -> list[dict[str, Any]]:
        """Return queue rows for deterministic tests and operator inspection."""

        table_name = USAJobsSyncEventRepo._table_name(queue_name)
        init_db()
        with connect() as conn:
            rows = conn.execute(
                f"""
                SELECT
                    id,
                    sync_run_id,
                    saved_search_id,
                    source_job_id,
                    canonical_job_id,
                    event_type,
                    reason,
                    payload_summary_json,
                    dedupe_key,
                    status,
                    created_at,
                    updated_at
                FROM {table_name}
                ORDER BY created_at ASC, source_job_id ASC, event_type ASC
                """
            ).fetchall()
        return [dict(row) for row in rows]
