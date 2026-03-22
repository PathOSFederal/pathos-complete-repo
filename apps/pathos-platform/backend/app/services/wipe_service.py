from __future__ import annotations

import logging

from app.core.logging import log_event
from app.db.connection import connect, init_db
from app.db.repo.audit_repo import AuditRepo
from app.db.repo.thread_repo import ThreadRepo

logger = logging.getLogger("pathos.wipe")


class WipeService:
    @staticmethod
    def _wipe_operational_data() -> dict[str, int]:
        init_db()
        with connect() as conn:
            deleted: dict[str, int] = {}
            for table in (
                "alert_digests",
                "alert_rule_runs",
                "alert_delivery_log",
                "alerts",
                "alert_runs",
                "alert_rules",
                "saved_search_job_snapshots",
                "saved_search_checkpoints",
                "saved_search_ingestion_ledger",
                "saved_search_runs",
                "saved_searches",
                "upstream_api_audit_records",
                "telemetry_metrics",
            ):
                cursor = conn.execute(f"DELETE FROM {table}")
                deleted[f"{table}_deleted"] = int(cursor.rowcount)
            conn.commit()
        return deleted

    @staticmethod
    def wipe(wipe_threads: bool, wipe_audits: bool) -> dict[str, int]:
        threads_deleted = 0
        messages_deleted = 0
        audits_deleted = 0
        operational_deleted: dict[str, int] = {}

        if wipe_threads:
            threads_deleted, messages_deleted = (
                ThreadRepo.delete_all_threads_and_messages()
            )
        if wipe_audits:
            audits_deleted = AuditRepo.delete_all_audits()
        if wipe_threads or wipe_audits:
            operational_deleted = WipeService._wipe_operational_data()

        summary = {
            "threads_deleted": threads_deleted,
            "messages_deleted": messages_deleted,
            "audits_deleted": audits_deleted,
            **operational_deleted,
        }
        log_event(
            logger,
            level=logging.INFO,
            event_id="wipe_operation_completed",
            message="Wipe operation completed with deterministic data class coverage.",
            details=summary,
        )
        return summary
