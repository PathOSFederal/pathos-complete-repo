"""Bounded saved-search ingestion service for official USAJOBS records."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.db.repo.job_sync_run_repo import JobSyncRunRepo
from app.db.repo.saved_search_ingested_job_repo import SavedSearchIngestedJobRepo
from app.services.job_search_service import JobSearchExecutionResult

OFFICIAL_USAJOBS_SOURCE = "USAJOBS_OFFICIAL_API"


class USAJobsIngestionService:
    """Persist bounded canonical USAJOBS records with provenance."""

    @staticmethod
    def ingest_saved_search_results(
        *,
        saved_search_id: str,
        execution: JobSearchExecutionResult,
        trigger_mode: str,
        dry_run: bool = False,
        close_missing: bool = False,
    ) -> dict[str, Any]:
        started = time.monotonic()
        started_at = datetime.now(timezone.utc).isoformat()
        sync_run_id = str(uuid4())
        if execution.source_name != OFFICIAL_USAJOBS_SOURCE:
            raise ValueError(
                f"Unsupported ingestion source={execution.source_name}. "
                "Runtime ingestion only accepts the official USAJOBS API."
            )

        run_mode = "dry_run" if dry_run else "write"
        summary: dict[str, Any] = {
            "sync_run_id": sync_run_id,
            "source": execution.source_name,
            "mapper_version": execution.mapper_version,
            "query_fingerprint": execution.query_fingerprint,
            "upstream_audit_id": execution.upstream_audit_id,
            "upstream_raw_hash": execution.upstream_raw_hash,
            "records_fetched": len(execution.normalized_items),
            "new_count": 0,
            "updated_count": 0,
            "unchanged_count": 0,
            "closed_count": 0,
            "warning_count": 0,
            "dry_run": dry_run,
            "failed_partitions": [],
            "stale_partitions": [],
            "alert_events_queued": 0,
            "indexing_events_queued": 0,
        }
        seen_job_ids: list[str] = []
        for normalized in execution.normalized_items:
            seen_job_ids.append(normalized.job.id)
            source_slice = dict(execution.query_slice)
            source_slice["trigger_mode"] = trigger_mode
            source_slice["saved_search_id"] = saved_search_id
            canonical_job = normalized.job.model_dump(mode="json")
            if dry_run:
                outcome = "new"
            else:
                outcome = SavedSearchIngestedJobRepo.upsert(
                    record_id=str(uuid4()),
                    saved_search_id=saved_search_id,
                    job_id=normalized.job.id,
                    source=execution.source_name,
                    source_slice=source_slice,
                    mapper_version=execution.mapper_version,
                    query_fingerprint=execution.query_fingerprint,
                    upstream_audit_id=execution.upstream_audit_id,
                    upstream_raw_hash=execution.upstream_raw_hash,
                    canonical_job=canonical_job,
                    ingest_warnings=list(normalized.warnings),
                    seen_at=execution.fetched_at,
                    sync_run_id=sync_run_id,
                )
            summary_key = f"{outcome}_count"
            summary[summary_key] = int(summary[summary_key]) + 1
            summary["warning_count"] = int(summary["warning_count"]) + len(
                normalized.warnings
            )
        if close_missing and not dry_run:
            source_slice = dict(execution.query_slice)
            source_slice["trigger_mode"] = trigger_mode
            source_slice["saved_search_id"] = saved_search_id
            closed_count = SavedSearchIngestedJobRepo.mark_missing_as_closed(
                saved_search_id=saved_search_id,
                seen_job_ids=seen_job_ids,
                closed_at=execution.fetched_at,
                source_slice=source_slice,
                upstream_audit_id=execution.upstream_audit_id,
                sync_run_id=sync_run_id,
            )
            summary["closed_count"] = closed_count
            summary["alert_events_queued"] = closed_count
            summary["indexing_events_queued"] = closed_count
        if not dry_run:
            completed_at = datetime.now(timezone.utc).isoformat()
            duration_ms = int((time.monotonic() - started) * 1000)
            event_count = int(summary["new_count"]) + int(summary["updated_count"]) + int(
                summary["closed_count"]
            )
            summary["alert_events_queued"] = event_count
            summary["indexing_events_queued"] = event_count
            JobSyncRunRepo.create(
                {
                    "id": sync_run_id,
                    "saved_search_id": saved_search_id,
                    "source": execution.source_name,
                    "trigger_mode": trigger_mode,
                    "run_mode": run_mode,
                    "status": "success",
                    "started_at": started_at,
                    "completed_at": completed_at,
                    "records_fetched": summary["records_fetched"],
                    "new_jobs": summary["new_count"],
                    "updated_jobs": summary["updated_count"],
                    "unchanged_jobs": summary["unchanged_count"],
                    "closed_jobs": summary["closed_count"],
                    "failed_partitions": summary["failed_partitions"],
                    "stale_partitions": summary["stale_partitions"],
                    "alert_events_queued": summary["alert_events_queued"],
                    "indexing_events_queued": summary["indexing_events_queued"],
                    "duration_ms": duration_ms,
                    "error_summary": None,
                }
            )
        return summary

    @staticmethod
    def record_failed_partition(
        *,
        saved_search_id: str | None,
        trigger_mode: str,
        partition: dict[str, Any],
        error_summary: str,
    ) -> dict[str, Any]:
        """Persist a failed partition without pretending any job rows were synced."""

        now = datetime.now(timezone.utc).isoformat()
        sync_run_id = str(uuid4())
        failed_partitions = [partition]
        JobSyncRunRepo.create(
            {
                "id": sync_run_id,
                "saved_search_id": saved_search_id,
                "source": OFFICIAL_USAJOBS_SOURCE,
                "trigger_mode": trigger_mode,
                "run_mode": "write",
                "status": "failed",
                "started_at": now,
                "completed_at": now,
                "records_fetched": 0,
                "new_jobs": 0,
                "updated_jobs": 0,
                "unchanged_jobs": 0,
                "closed_jobs": 0,
                "failed_partitions": failed_partitions,
                "stale_partitions": [],
                "alert_events_queued": 0,
                "indexing_events_queued": 0,
                "duration_ms": 0,
                "error_summary": error_summary,
            }
        )
        return {
            "sync_run_id": sync_run_id,
            "status": "failed",
            "failed_partitions": failed_partitions,
            "error_summary": error_summary,
        }
