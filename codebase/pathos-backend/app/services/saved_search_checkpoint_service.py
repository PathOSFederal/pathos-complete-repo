"""Deterministic checkpoint/ledger orchestration for saved-search ingestion runs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.db.repo.saved_search_checkpoint_repo import SavedSearchCheckpointRepo


class SavedSearchCheckpointService:
    @staticmethod
    def _safe_cursor(payload: dict[str, Any] | None) -> dict[str, Any]:
        if payload is None:
            return {"strategy": "full_refresh", "last_successful_run_at": None, "last_query_fingerprint": None}
        return json.loads(json.dumps(payload, sort_keys=True))

    @staticmethod
    def determine_resume_cursor(saved_search_id: str) -> dict[str, Any]:
        checkpoint = SavedSearchCheckpointRepo.get_latest_checkpoint(saved_search_id)
        if checkpoint is None:
            return SavedSearchCheckpointService._safe_cursor(None)
        raw = checkpoint.get("cursor_state_json")
        if not isinstance(raw, str) or not raw.strip():
            return SavedSearchCheckpointService._safe_cursor(None)
        return SavedSearchCheckpointService._safe_cursor(json.loads(raw))

    @staticmethod
    def get_last_successful(saved_search_id: str) -> dict[str, Any] | None:
        row = SavedSearchCheckpointRepo.get_latest_checkpoint(saved_search_id)
        if row is None:
            return None
        cursor_state = json.loads(row["cursor_state_json"]) if row.get("cursor_state_json") else {}
        return {
            "saved_search_id": row["saved_search_id"],
            "last_successful_run_id": row["last_successful_run_id"],
            "last_successful_alert_run_id": row["last_successful_alert_run_id"],
            "last_successful_rule_id": row["last_successful_rule_id"],
            "last_successful_at": row["last_successful_at"],
            "last_query_fingerprint": row.get("last_query_fingerprint"),
            "cursor_state": cursor_state,
            "updated_at": row["updated_at"],
        }

    @staticmethod
    def record_outcome(
        *,
        run_id: str,
        alert_run_id: str,
        alert_rule_id: str,
        saved_search_id: str,
        status: str,
        jobs_scanned: int,
        triggers_count: int,
        suppressed_count: int,
        query_fingerprint: str | None,
        cursor_used: dict[str, Any] | None,
        error_summary: str | None,
        completed_at: str | None = None,
    ) -> None:
        completed = completed_at or datetime.now(timezone.utc).isoformat()
        used_cursor = SavedSearchCheckpointService._safe_cursor(cursor_used)
        if status == "success":
            next_cursor = {
                "strategy": "full_refresh",
                "last_successful_run_at": completed,
                "last_query_fingerprint": query_fingerprint,
            }
        else:
            next_cursor = used_cursor

        SavedSearchCheckpointRepo.upsert_ledger(
            {
                "id": str(uuid4()),
                "run_id": run_id,
                "alert_run_id": alert_run_id,
                "alert_rule_id": alert_rule_id,
                "saved_search_id": saved_search_id,
                "status": status,
                "jobs_scanned": jobs_scanned,
                "triggers_count": triggers_count,
                "suppressed_count": suppressed_count,
                "query_fingerprint": query_fingerprint,
                "cursor_used_json": json.dumps(used_cursor, sort_keys=True),
                "cursor_next_json": json.dumps(next_cursor, sort_keys=True),
                "error_summary": error_summary,
                "completed_at": completed,
            }
        )

        if status != "success":
            return

        SavedSearchCheckpointRepo.upsert_checkpoint(
            {
                "saved_search_id": saved_search_id,
                "last_successful_run_id": run_id,
                "last_successful_alert_run_id": alert_run_id,
                "last_successful_rule_id": alert_rule_id,
                "last_successful_at": completed,
                "last_query_fingerprint": query_fingerprint,
                "cursor_state_json": json.dumps(next_cursor, sort_keys=True),
                "updated_at": completed,
            }
        )
