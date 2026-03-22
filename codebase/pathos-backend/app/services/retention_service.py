"""Deterministic retention cleanup routines for operational data control."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.core.config import (
    get_retention_days_audit,
    get_retention_days_digests,
    get_retention_days_thread_summaries,
    get_retention_days_upstream_raw,
)
from app.core.logging import log_event
from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.db.repo.alert_run_repo import AlertRunRepo
from app.db.repo.audit_repo import AuditRepo
from app.db.repo.telemetry_repo import TelemetryRepo
from app.db.repo.thread_repo import ThreadRepo
from app.db.repo.upstream_audit_repo import UpstreamAuditRepo

logger = logging.getLogger("pathos.retention")


@dataclass(frozen=True)
class RetentionCleanupSummary:
    digests_deleted: int
    runs_deleted: int
    audits_deleted: int
    upstream_raw_deleted: int
    thread_summaries_cleared: int
    telemetry_deleted: int


class RetentionService:
    @staticmethod
    def cleanup() -> RetentionCleanupSummary:
        now = datetime.now(timezone.utc)
        digest_cutoff = (now - timedelta(days=get_retention_days_digests())).isoformat()
        audit_cutoff = (now - timedelta(days=get_retention_days_audit())).isoformat()
        thread_cutoff = (
            now - timedelta(days=get_retention_days_thread_summaries())
        ).isoformat()
        upstream_cutoff = (
            now - timedelta(days=get_retention_days_upstream_raw())
        ).isoformat()

        digests_deleted = AlertDigestRepo.purge_older_than(digest_cutoff)
        runs_deleted = AlertRunRepo.purge_older_than(digest_cutoff)
        audits_deleted = AuditRepo.purge_older_than(audit_cutoff)
        upstream_raw_deleted = UpstreamAuditRepo.purge_older_than(upstream_cutoff)
        thread_summaries_cleared = ThreadRepo.purge_summaries_older_than(thread_cutoff)
        telemetry_deleted = TelemetryRepo.purge_older_than(audit_cutoff)

        summary = RetentionCleanupSummary(
            digests_deleted=digests_deleted,
            runs_deleted=runs_deleted,
            audits_deleted=audits_deleted,
            upstream_raw_deleted=upstream_raw_deleted,
            thread_summaries_cleared=thread_summaries_cleared,
            telemetry_deleted=telemetry_deleted,
        )
        log_event(
            logger,
            level=logging.INFO,
            event_id="retention_cleanup_executed",
            message="Retention cleanup executed with deterministic deletion order.",
            details={
                "digests_deleted": summary.digests_deleted,
                "runs_deleted": summary.runs_deleted,
                "audits_deleted": summary.audits_deleted,
                "upstream_raw_deleted": summary.upstream_raw_deleted,
                "thread_summaries_cleared": summary.thread_summaries_cleared,
                "telemetry_deleted": summary.telemetry_deleted,
            },
        )
        return summary
