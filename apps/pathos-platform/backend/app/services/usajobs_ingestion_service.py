"""Bounded saved-search ingestion service for official USAJOBS records."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from hashlib import sha256
import json
from typing import Any
from uuid import uuid4

from app.db.repo.job_sync_run_repo import JobSyncRunRepo
from app.db.repo.saved_search_ingested_job_repo import SavedSearchIngestedJobRepo
from app.db.repo.usajobs_sync_event_repo import USAJobsSyncEventRepo
from app.services.job_search_service import JobSearchExecutionResult

OFFICIAL_USAJOBS_SOURCE = "USAJOBS_OFFICIAL_API"
INDEXING_URL_UPDATED = "URL_UPDATED"
INDEXING_URL_DELETED = "URL_DELETED"
ALERT_JOB_NEW = "SAVED_SEARCH_JOB_NEW"
ALERT_JOB_UPDATED = "SAVED_SEARCH_JOB_UPDATED"
ALERT_JOB_CLOSED = "SAVED_SEARCH_JOB_CLOSED"


def _safe_job_payload(
    *,
    canonical_job: dict[str, Any] | None,
    source_job_id: str,
    change_type: str,
    canonical_hash: str,
) -> dict[str, Any]:
    """Build an audit summary without raw USAJOBS payloads or credentials."""

    payload: dict[str, Any] = {
        "source": OFFICIAL_USAJOBS_SOURCE,
        "source_job_id": source_job_id,
        "change_type": change_type,
        "canonical_hash": canonical_hash,
    }
    if canonical_job is not None:
        for field_name in (
            "title",
            "organization",
            "close_date",
            "remote_status",
            "telework_status",
            "source_url",
        ):
            value = canonical_job.get(field_name)
            if value is not None:
                payload[field_name] = value
        locations = canonical_job.get("locations")
        if isinstance(locations, list):
            payload["location_count"] = len(locations)
    return payload


def _hashed_dedupe_key(identity: dict[str, Any]) -> str:
    """Hash stable event identity fields into a compact database key."""

    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":"))
    return "usajobs-sync:" + sha256(encoded.encode("utf-8")).hexdigest()


def _alert_dedupe_key(
    *,
    event_type: str,
    saved_search_id: str,
    source_job_id: str,
    canonical_hash: str,
) -> str:
    """Alert identity is saved-search scoped because subscribers differ."""

    identity = {
        "queue": "alert",
        "event_type": event_type,
        "saved_search_id": saved_search_id,
        "source_job_id": source_job_id,
        "canonical_hash": canonical_hash,
    }
    return _hashed_dedupe_key(identity)


def _indexing_dedupe_key(
    *,
    event_type: str,
    source_job_id: str,
    canonical_job_id: str,
    canonical_hash: str,
    lifecycle_event: str | None = None,
) -> str:
    """Indexing identity is page/job/content scoped, not saved-search scoped."""

    identity = {
        "queue": "indexing",
        "event_type": event_type,
        "source_job_id": source_job_id,
        "canonical_job_id": canonical_job_id,
        "canonical_hash": canonical_hash,
    }
    if lifecycle_event is not None:
        identity["lifecycle_event"] = lifecycle_event
    return _hashed_dedupe_key(identity)


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
        partition_complete: bool = False,
        partition_identity: dict[str, Any] | None = None,
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
            "close_missing_skipped": False,
            "close_missing_skip_reason": None,
        }
        seen_job_ids: list[str] = []
        queue_candidates: list[dict[str, Any]] = []
        for normalized in execution.normalized_items:
            seen_job_ids.append(normalized.job.id)
            source_slice = dict(execution.query_slice)
            source_slice["trigger_mode"] = trigger_mode
            source_slice["saved_search_id"] = saved_search_id
            canonical_job = normalized.job.model_dump(mode="json")
            canonical_hash = SavedSearchIngestedJobRepo.canonical_hash(canonical_job)
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
                if outcome in {"new", "updated", "reopened", "expired"}:
                    queue_candidates.append(
                        {
                            "source_job_id": normalized.job.source_job_id or normalized.job.id,
                            "canonical_job_id": normalized.job.id,
                            "canonical_hash": canonical_hash,
                            "canonical_job": canonical_job,
                            "outcome": outcome,
                        }
                    )
            summary_outcome = "updated" if outcome in {"reopened", "expired"} else outcome
            summary_key = f"{summary_outcome}_count"
            summary[summary_key] = int(summary[summary_key]) + 1
            summary["warning_count"] = int(summary["warning_count"]) + len(
                normalized.warnings
            )
        close_guard = USAJobsIngestionService._close_missing_guard(
            close_missing=close_missing,
            dry_run=dry_run,
            trigger_mode=trigger_mode,
            partition_complete=partition_complete,
            partition_identity=partition_identity,
            execution=execution,
        )
        if close_guard["allowed"]:
            source_slice = dict(execution.query_slice)
            source_slice["trigger_mode"] = trigger_mode
            source_slice["saved_search_id"] = saved_search_id
            source_slice["partition_identity"] = partition_identity
            closed_jobs = SavedSearchIngestedJobRepo.mark_missing_as_closed_jobs(
                saved_search_id=saved_search_id,
                seen_job_ids=seen_job_ids,
                closed_at=execution.fetched_at,
                source_slice=source_slice,
                upstream_audit_id=execution.upstream_audit_id,
                sync_run_id=sync_run_id,
            )
            closed_count = len(closed_jobs)
            summary["closed_count"] = closed_count
            for closed_job in closed_jobs:
                queue_candidates.append(
                    {
                        "source_job_id": closed_job["job_id"],
                        "canonical_job_id": closed_job["job_id"],
                        "canonical_hash": closed_job["canonical_job_sha256"],
                        "canonical_job": None,
                        "outcome": "closed",
                    }
                )
        elif close_missing:
            summary["close_missing_skipped"] = True
            summary["close_missing_skip_reason"] = close_guard["reason"]
            summary["stale_partitions"].append(close_guard["stale_partition"])
        if not dry_run:
            completed_at = datetime.now(timezone.utc).isoformat()
            duration_ms = int((time.monotonic() - started) * 1000)
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
                    "alert_events_queued": 0,
                    "indexing_events_queued": 0,
                    "duration_ms": duration_ms,
                    "error_summary": None,
                }
            )
            queued_counts = USAJobsIngestionService._queue_events(
                sync_run_id=sync_run_id,
                saved_search_id=saved_search_id,
                queued_at=completed_at,
                candidates=queue_candidates,
            )
            summary["alert_events_queued"] = queued_counts["alert"]
            summary["indexing_events_queued"] = queued_counts["indexing"]
            JobSyncRunRepo.update_event_counts(
                sync_run_id=sync_run_id,
                alert_events_queued=summary["alert_events_queued"],
                indexing_events_queued=summary["indexing_events_queued"],
            )
        return summary

    @staticmethod
    def _close_missing_guard(
        *,
        close_missing: bool,
        dry_run: bool,
        trigger_mode: str,
        partition_complete: bool,
        partition_identity: dict[str, Any] | None,
        execution: JobSearchExecutionResult,
    ) -> dict[str, Any]:
        """Allow close-missing only when the caller proves a complete partition."""

        if not close_missing:
            return {"allowed": False, "reason": "close_missing_disabled"}

        reason: str | None = None
        if dry_run:
            reason = "dry_run"
        elif trigger_mode == "staging_validation":
            reason = "staging_bounded_validation"
        elif not partition_complete:
            reason = "partition_not_marked_complete"
        elif not partition_identity:
            reason = "partition_identity_missing"
        elif bool(partition_identity.get("max_pages_reached")):
            reason = "max_pages_reached"
        elif bool(partition_identity.get("max_records_reached")):
            reason = "max_records_reached"
        elif int(execution.response.total) != len(execution.normalized_items):
            reason = "pagination_incomplete"

        if reason is None:
            return {"allowed": True, "reason": None}

        return {
            "allowed": False,
            "reason": reason,
            "stale_partition": {
                "reason": reason,
                "partition_identity": partition_identity,
                "records_fetched": len(execution.normalized_items),
                "upstream_total": int(execution.response.total),
            },
        }

    @staticmethod
    def _queue_events(
        *,
        sync_run_id: str,
        saved_search_id: str,
        queued_at: str,
        candidates: list[dict[str, Any]],
    ) -> dict[str, int]:
        """Persist queue-only alert/indexing rows and count new insertions."""

        queued_counts = {"alert": 0, "indexing": 0}
        for candidate in candidates:
            outcome = str(candidate["outcome"])
            source_job_id = str(candidate["source_job_id"])
            canonical_hash = str(candidate["canonical_hash"])
            canonical_job = candidate["canonical_job"]
            if outcome == "closed":
                alert_event_type = ALERT_JOB_CLOSED
                indexing_event_type = INDEXING_URL_DELETED
                reason = "closed_missing_from_complete_partition"
                dedupe_lifecycle_event = None
            elif outcome == "reopened":
                alert_event_type = ALERT_JOB_UPDATED
                indexing_event_type = INDEXING_URL_UPDATED
                reason = "reopened_canonical_job"
                dedupe_lifecycle_event = "reopened"
            elif outcome == "expired":
                alert_event_type = ALERT_JOB_UPDATED
                indexing_event_type = INDEXING_URL_UPDATED
                reason = "expired_close_date"
                dedupe_lifecycle_event = "expired"
            elif outcome == "updated":
                alert_event_type = ALERT_JOB_UPDATED
                indexing_event_type = INDEXING_URL_UPDATED
                reason = "meaningful_canonical_update"
                dedupe_lifecycle_event = None
            else:
                alert_event_type = ALERT_JOB_NEW
                indexing_event_type = INDEXING_URL_UPDATED
                reason = "new_canonical_job"
                dedupe_lifecycle_event = None
            payload_summary = _safe_job_payload(
                canonical_job=canonical_job,
                source_job_id=source_job_id,
                change_type=outcome,
                canonical_hash=canonical_hash,
            )
            alert_inserted = USAJobsSyncEventRepo.enqueue(
                queue_name="alert",
                sync_run_id=sync_run_id,
                saved_search_id=saved_search_id,
                source_job_id=source_job_id,
                canonical_job_id=str(candidate["canonical_job_id"]),
                event_type=alert_event_type,
                reason=reason,
                payload_summary=payload_summary,
                dedupe_key=_alert_dedupe_key(
                    event_type=alert_event_type,
                    saved_search_id=saved_search_id,
                    source_job_id=source_job_id,
                    canonical_hash=canonical_hash,
                ),
                created_at=queued_at,
            )
            if alert_inserted:
                queued_counts["alert"] += 1
            indexing_inserted = USAJobsSyncEventRepo.enqueue(
                queue_name="indexing",
                sync_run_id=sync_run_id,
                saved_search_id=saved_search_id,
                source_job_id=source_job_id,
                canonical_job_id=str(candidate["canonical_job_id"]),
                event_type=indexing_event_type,
                reason=reason,
                payload_summary=payload_summary,
                dedupe_key=_indexing_dedupe_key(
                    event_type=indexing_event_type,
                    source_job_id=source_job_id,
                    canonical_job_id=str(candidate["canonical_job_id"]),
                    canonical_hash=canonical_hash,
                    lifecycle_event=dedupe_lifecycle_event,
                ),
                created_at=queued_at,
            )
            if indexing_inserted:
                queued_counts["indexing"] += 1
        return queued_counts

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
