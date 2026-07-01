"""Repository helpers for USAJOBS sync validation run summaries."""

from __future__ import annotations

import json
from typing import Any

from app.db.connection import connect, init_db


class JobSyncRunRepo:
    """Persist and expose staging-safe sync run health records."""

    @staticmethod
    def create(record: dict[str, Any]) -> None:
        """Insert one sync run summary row."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO job_sync_runs (
                    id,
                    saved_search_id,
                    source,
                    trigger_mode,
                    run_mode,
                    status,
                    started_at,
                    completed_at,
                    records_fetched,
                    new_jobs,
                    updated_jobs,
                    unchanged_jobs,
                    closed_jobs,
                    failed_partitions_json,
                    stale_partitions_json,
                    alert_events_queued,
                    indexing_events_queued,
                    duration_ms,
                    error_summary
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record.get("saved_search_id"),
                    record["source"],
                    record["trigger_mode"],
                    record["run_mode"],
                    record["status"],
                    record["started_at"],
                    record["completed_at"],
                    int(record["records_fetched"]),
                    int(record["new_jobs"]),
                    int(record["updated_jobs"]),
                    int(record["unchanged_jobs"]),
                    int(record["closed_jobs"]),
                    json.dumps(record.get("failed_partitions", []), sort_keys=True),
                    json.dumps(record.get("stale_partitions", []), sort_keys=True),
                    int(record["alert_events_queued"]),
                    int(record["indexing_events_queued"]),
                    int(record["duration_ms"]),
                    record.get("error_summary"),
                ),
            )
            conn.commit()

    @staticmethod
    def latest_health() -> dict[str, Any]:
        """Return the latest sync health shape expected by staging operators."""

        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT
                    id,
                    saved_search_id,
                    source,
                    trigger_mode,
                    run_mode,
                    status,
                    completed_at,
                    records_fetched,
                    new_jobs,
                    updated_jobs,
                    unchanged_jobs,
                    closed_jobs,
                    failed_partitions_json,
                    stale_partitions_json,
                    alert_events_queued,
                    indexing_events_queued,
                    duration_ms,
                    error_summary
                FROM job_sync_runs
                ORDER BY completed_at DESC
                LIMIT 1
                """
            ).fetchone()
        if row is None:
            return {
                "last_sync_time": None,
                "records_fetched": 0,
                "new_jobs": 0,
                "updated_jobs": 0,
                "closed_jobs": 0,
                "failed_partitions": [],
                "stale_partitions": [],
                "alert_events_queued": 0,
                "indexing_events_queued": 0,
                "duration_ms": 0,
                "error_summary": None,
            }

        payload = dict(row)
        return {
            "last_sync_time": payload["completed_at"],
            "records_fetched": int(payload["records_fetched"]),
            "new_jobs": int(payload["new_jobs"]),
            "updated_jobs": int(payload["updated_jobs"]),
            "closed_jobs": int(payload["closed_jobs"]),
            "failed_partitions": json.loads(payload["failed_partitions_json"]),
            "stale_partitions": json.loads(payload["stale_partitions_json"]),
            "alert_events_queued": int(payload["alert_events_queued"]),
            "indexing_events_queued": int(payload["indexing_events_queued"]),
            "duration_ms": int(payload["duration_ms"]),
            "error_summary": payload.get("error_summary"),
            "status": payload["status"],
            "run_mode": payload["run_mode"],
            "trigger_mode": payload["trigger_mode"],
            "source": payload["source"],
            "saved_search_id": payload.get("saved_search_id"),
        }
