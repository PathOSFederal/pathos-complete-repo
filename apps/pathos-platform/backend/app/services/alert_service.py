"""app.services.alert_service

WHY THIS FILE EXISTS:
Orchestrates deterministic saved-search runs and derived alert generation by job_id set diff.

LAYER FIT:
- Service/business orchestration layer.

WHAT THIS FILE MUST NOT DO:
- Must not perform FastAPI request/response handling.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.core.logging import log_event
from app.db.repo.alert_repo import AlertRepo
from app.db.repo.saved_search_repo import SavedSearchRepo
from app.models.alerts import AlertOut, SavedSearchRunOut
from app.models.job_search import JobSearchRequest
from app.models.outcome import DomainOutcome, EmptyReason, SkipReason
from app.services.job_search_service import JobSearchService
from app.services.saved_search_service import SavedSearchNotFoundError
from app.services.usajobs_ingestion_service import USAJobsIngestionService

MAX_ALERT_JOB_IDS = 200
logger = logging.getLogger("pathos.saved_search_run")


class AlertNotFoundError(Exception):
    """Raised when requested alert ID does not exist."""


class AlertService:
    """Deterministic alert service for saved-search run workflows."""

    @staticmethod
    def _to_alert(row: dict[str, Any]) -> AlertOut:
        """Convert persisted alert row into API model."""

        return AlertOut(
            id=row["id"],
            saved_search_id=row["saved_search_id"],
            created_at=datetime.fromisoformat(row["created_at"]),
            title=row["title"],
            summary=row["summary"],
            job_ids=json.loads(row["job_ids_json"]),
            acknowledged_at=datetime.fromisoformat(row["acknowledged_at"]) if row.get("acknowledged_at") else None,
        )

    @staticmethod
    def run_saved_search(saved_search_id: str, request_id: str) -> SavedSearchRunOut:
        """Run saved search and create derived alert for new job IDs only.

        Error behavior:
        - Raises SavedSearchNotFoundError for unknown saved search IDs.
        - Propagates job search upstream errors and does not mutate run state on failure.
        """

        normalized_saved_search_id = saved_search_id.strip()
        saved = SavedSearchRepo.get_by_id(normalized_saved_search_id)
        if saved is None:
            raise SavedSearchNotFoundError(f"Saved search not found for id={normalized_saved_search_id}")

        source_blob = saved.get("query_payload") or saved["filters_json"]
        filters_blob = json.loads(source_blob).get("filters", {})
        search_request = JobSearchRequest.model_validate(filters_blob)

        if not JobSearchService.usajobs_configured():
            env_presence = JobSearchService.usajobs_log_env_presence()
            log_event(
                logger,
                level=logging.INFO,
                event_id="usajobs_config_missing",
                message="Saved-search run skipped because required USAJOBS environment variables are missing.",
                details={"outcome": "skipped", "duration_ms": 0, "env_presence": env_presence},
                request_id=request_id,
                saved_search_id=normalized_saved_search_id,
            )
            log_event(
                logger,
                level=logging.INFO,
                event_id="alert_run_skipped",
                message="Saved-search run completed without scanning because USAJOBS is not configured.",
                details={
                    "outcome": "skipped",
                    "skip_reason": "USJOBS_NOT_CONFIGURED",
                    "skip_details": "USAJOBS fetch skipped (missing env).",
                    "duration_ms": 0,
                    "env_presence": env_presence,
                },
                request_id=request_id,
                saved_search_id=normalized_saved_search_id,
            )
            return SavedSearchRunOut(
                saved_search_id=normalized_saved_search_id,
                new_job_ids=[],
                alert=None,
                total=0,
                domain_outcome=DomainOutcome.SKIPPED,
                skip_reason=SkipReason.USJOBS_NOT_CONFIGURED,
                skip_details="USAJOBS fetch skipped (missing env).",
            )

        execution = JobSearchService.execute_search(
            search=search_request,
            request_id=request_id,
            allow_cache=False,
        )
        result = execution.response
        USAJobsIngestionService.ingest_saved_search_results(
            saved_search_id=normalized_saved_search_id,
            execution=execution,
            trigger_mode="manual_saved_search_run",
        )

        current_ids = sorted({row.id for row in result.results})
        previous = SavedSearchRepo.get_last_run(normalized_saved_search_id)
        previous_ids = sorted(set(json.loads(previous["job_ids_json"]))) if previous else []

        previous_set = set(previous_ids)
        new_ids = [job_id for job_id in current_ids if job_id not in previous_set]
        capped_new_ids = new_ids[:MAX_ALERT_JOB_IDS]

        now = datetime.now(timezone.utc).isoformat()
        SavedSearchRepo.create_run(
            {
                "id": str(uuid4()),
                "saved_search_id": normalized_saved_search_id,
                "run_at": now,
                "query_fingerprint": execution.query_fingerprint,
                "job_ids_json": json.dumps(current_ids, sort_keys=True),
                "total": result.total,
                "request_id": request_id,
                "upstream_trace_hash": execution.upstream_raw_hash
                or execution.query_fingerprint,
            }
        )
        SavedSearchRepo.set_last_run(normalized_saved_search_id, now)

        alert = None
        if capped_new_ids:
            alert_row = {
                "id": str(uuid4()),
                "saved_search_id": normalized_saved_search_id,
                "created_at": now,
                "title": f"New jobs for {saved['name']}",
                "summary": f"{len(capped_new_ids)} new jobs detected",
                "job_ids_json": json.dumps(capped_new_ids, sort_keys=True),
                "acknowledged_at": None,
            }
            AlertRepo.create(alert_row)
            alert = AlertService._to_alert(alert_row)

        log_event(
            logger,
            level=logging.INFO,
            event_id="saved_search_runner_complete",
            message="The saved search run completed with deterministic comparison against the prior run snapshot.",
            details={
                "result_total": result.total,
                "new_job_count": len(capped_new_ids),
            },
            request_id=request_id,
            saved_search_id=normalized_saved_search_id,
        )

        if result.total == 0:
            domain_outcome = DomainOutcome.EMPTY
            empty_reason = EmptyReason.UPSTREAM_ZERO_RESULTS
        elif not result.results:
            domain_outcome = DomainOutcome.EMPTY
            empty_reason = EmptyReason.NORMALIZED_TO_ZERO
        else:
            domain_outcome = DomainOutcome.SUCCESS
            empty_reason = None

        return SavedSearchRunOut(
            saved_search_id=normalized_saved_search_id,
            new_job_ids=capped_new_ids,
            alert=alert,
            total=result.total,
            domain_outcome=domain_outcome,
            empty_reason=empty_reason,
        )

    @staticmethod
    def list_alerts(limit: int = 100) -> list[AlertOut]:
        """List recent alerts with deterministic ordering."""

        return [AlertService._to_alert(row) for row in AlertRepo.list_all(limit=limit)]

    @staticmethod
    def get_alert(alert_id: str) -> AlertOut:
        """Fetch one alert row by id."""

        row = AlertRepo.get_by_id(alert_id)
        if row is None:
            raise AlertNotFoundError(f"Alert not found for id={alert_id}")
        return AlertService._to_alert(row)

    @staticmethod
    def acknowledge(alert_id: str) -> AlertOut:
        """Acknowledge alert and return updated record."""

        updated = AlertRepo.acknowledge(alert_id, datetime.now(timezone.utc).isoformat())
        if not updated:
            raise AlertNotFoundError(f"Alert not found for id={alert_id}")
        row = AlertRepo.get_by_id(alert_id)
        assert row is not None
        return AlertService._to_alert(row)
