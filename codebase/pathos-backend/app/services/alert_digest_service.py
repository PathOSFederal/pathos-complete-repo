"""Service helpers for alert digest persistence and retention controls."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.db.repo.alert_rule_run_repo import AlertRuleRunRepo
from app.db.repo.alert_run_repo import AlertRunRepo
from app.models.alert_digest import AlertDigestOut, DesktopLatestDigestOut


class AlertDigestService:
    @staticmethod
    def _safe_count(value: object) -> int:
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, int):
            return max(0, value)
        if isinstance(value, float):
            return max(0, int(value))
        if isinstance(value, str):
            text = value.strip()
            if text.isdigit():
                return int(text)
        return 0

    @staticmethod
    def list_recent(limit: int = 50) -> list[AlertDigestOut]:
        rows = AlertDigestRepo.list_recent(limit=limit)
        output: list[AlertDigestOut] = []
        for row in rows:
            output.append(
                AlertDigestOut(
                    id=row["id"],
                    alert_run_id=row["alert_run_id"],
                    alert_rule_id=row["alert_rule_id"],
                    created_at=datetime.fromisoformat(row["created_at"]),
                    delivery_mode=row["delivery_mode"],
                    payload_json=json.loads(row["payload_json"]),
                )
            )
        return output

    @staticmethod
    def list_desktop_latest(limit: int = 50) -> list[DesktopLatestDigestOut]:
        rows = AlertDigestRepo.list_recent(limit=limit)
        output: list[DesktopLatestDigestOut] = []
        for row in rows:
            payload = json.loads(row["payload_json"])
            totals = payload.get("totals", {}) if isinstance(payload, dict) else {}
            metadata = payload.get("run_metadata", {}) if isinstance(payload, dict) else {}
            triggers = AlertDigestService._safe_count(totals.get("above_threshold") if isinstance(totals, dict) else 0)
            suppressed = AlertDigestService._safe_count(totals.get("suppressed") if isinstance(totals, dict) else 0)
            jobs_scanned = triggers + suppressed
            run_id = row["alert_run_id"]
            if isinstance(metadata, dict):
                candidate = metadata.get("run_id")
                if isinstance(candidate, str) and candidate.strip():
                    run_id = candidate.strip()
            output.append(
                DesktopLatestDigestOut(
                    run_id=run_id,
                    created_at=datetime.fromisoformat(row["created_at"]),
                    jobs_scanned=jobs_scanned,
                    triggers_count=triggers,
                    suppressed_count=suppressed,
                    summary=(
                        f"Digest run {run_id} scanned {jobs_scanned} jobs; "
                        f"{triggers} triggered and {suppressed} were suppressed."
                    ),
                )
            )
        return output

    @staticmethod
    def purge_older_than(days: int) -> int:
        bounded = max(1, min(days, 3650))
        cutoff = (datetime.now(timezone.utc) - timedelta(days=bounded)).isoformat()
        return AlertDigestRepo.purge_older_than(cutoff)

    @staticmethod
    def keep_last_n_per_rule(keep_n: int) -> int:
        return AlertDigestRepo.keep_last_n_per_rule(keep_n=keep_n)

    @staticmethod
    def purge_for_rule(alert_rule_id: str) -> dict[str, int]:
        deleted_digests = AlertDigestRepo.delete_for_rule(alert_rule_id=alert_rule_id)
        deleted_rule_runs = AlertRuleRunRepo.delete_by_rule(alert_rule_id=alert_rule_id)
        return {
            "deleted_digests": deleted_digests,
            "deleted_rule_runs": deleted_rule_runs,
        }

    @staticmethod
    def purge_global_runs_older_than(days: int) -> int:
        bounded = max(1, min(days, 3650))
        cutoff = (datetime.now(timezone.utc) - timedelta(days=bounded)).isoformat()
        return AlertRunRepo.purge_older_than(cutoff)
