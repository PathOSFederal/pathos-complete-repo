"""Repository for deterministic saved-search ingestion ledger/checkpoint state."""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class SavedSearchCheckpointRepo:
    @staticmethod
    def upsert_ledger(record: dict[str, Any]) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO saved_search_ingestion_ledger (
                    id, run_id, alert_run_id, alert_rule_id, saved_search_id, status,
                    jobs_scanned, triggers_count, suppressed_count, query_fingerprint,
                    cursor_used_json, cursor_next_json, error_summary, completed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_id) DO UPDATE SET
                    alert_run_id = excluded.alert_run_id,
                    alert_rule_id = excluded.alert_rule_id,
                    status = excluded.status,
                    jobs_scanned = excluded.jobs_scanned,
                    triggers_count = excluded.triggers_count,
                    suppressed_count = excluded.suppressed_count,
                    query_fingerprint = excluded.query_fingerprint,
                    cursor_used_json = excluded.cursor_used_json,
                    cursor_next_json = excluded.cursor_next_json,
                    error_summary = excluded.error_summary,
                    completed_at = excluded.completed_at
                """,
                (
                    record["id"],
                    record["run_id"],
                    record["alert_run_id"],
                    record["alert_rule_id"],
                    record["saved_search_id"],
                    record["status"],
                    int(record["jobs_scanned"]),
                    int(record["triggers_count"]),
                    int(record["suppressed_count"]),
                    record.get("query_fingerprint"),
                    record["cursor_used_json"],
                    record["cursor_next_json"],
                    record.get("error_summary"),
                    record["completed_at"],
                ),
            )
            conn.commit()

    @staticmethod
    def get_latest_checkpoint(saved_search_id: str) -> dict[str, Any] | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT
                    saved_search_id,
                    last_successful_run_id,
                    last_successful_alert_run_id,
                    last_successful_rule_id,
                    last_successful_at,
                    last_query_fingerprint,
                    cursor_state_json,
                    updated_at
                FROM saved_search_checkpoints
                WHERE saved_search_id = ?
                """,
                (saved_search_id,),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def upsert_checkpoint(record: dict[str, Any]) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO saved_search_checkpoints (
                    saved_search_id, last_successful_run_id, last_successful_alert_run_id,
                    last_successful_rule_id, last_successful_at, last_query_fingerprint,
                    cursor_state_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(saved_search_id) DO UPDATE SET
                    last_successful_run_id = excluded.last_successful_run_id,
                    last_successful_alert_run_id = excluded.last_successful_alert_run_id,
                    last_successful_rule_id = excluded.last_successful_rule_id,
                    last_successful_at = excluded.last_successful_at,
                    last_query_fingerprint = excluded.last_query_fingerprint,
                    cursor_state_json = excluded.cursor_state_json,
                    updated_at = excluded.updated_at
                """,
                (
                    record["saved_search_id"],
                    record["last_successful_run_id"],
                    record["last_successful_alert_run_id"],
                    record["last_successful_rule_id"],
                    record["last_successful_at"],
                    record.get("last_query_fingerprint"),
                    record["cursor_state_json"],
                    record["updated_at"],
                ),
            )
            conn.commit()
