"""Deterministic saved-search runner with canonical scoring output."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.core.logging import log_event
from app.core.request_context import set_request_id, set_saved_search_id
from app.models.job_score import JobScoringProfileV1
from app.models.job_search import JobSearchRequest
from app.services.job_scoring_ruleset import DEFAULT_JOB_SCORING_RULESET
from app.services.job_scoring_service import JobScoringService
from app.services.job_search_service import JobSearchService
from app.services.saved_search_service import SavedSearchService
from app.services.usajobs_ingestion_service import USAJobsIngestionService

logger = logging.getLogger("pathos.saved_search_runner")


class SavedSearchRunnerService:
    @staticmethod
    def run_saved_search(
        saved_search_id: str,
        request_id: str,
        *,
        resume_cursor: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        set_request_id(request_id)
        set_saved_search_id(saved_search_id)
        saved = SavedSearchService.get(saved_search_id)
        if saved.ruleset_version != DEFAULT_JOB_SCORING_RULESET.version:
            raise ValueError(f"Unsupported ruleset_version={saved.ruleset_version}")

        filters_blob = saved.query_payload.get("filters", {})
        search_request = JobSearchRequest.model_validate(filters_blob)
        fetch_started = time.monotonic()
        execution = JobSearchService.execute_search(
            search=search_request,
            request_id=request_id,
            allow_cache=False,
        )
        search_result = execution.response
        fetch_ms = int((time.monotonic() - fetch_started) * 1000)
        ingestion_summary = USAJobsIngestionService.ingest_saved_search_results(
            saved_search_id=saved_search_id,
            execution=execution,
            trigger_mode="saved_search_runner",
        )

        profile = (
            JobScoringProfileV1.model_validate(saved.profile_payload)
            if saved.profile_payload is not None
            else JobScoringProfileV1()
        )
        scored_rows: list[dict[str, Any]] = []
        normalize_started = time.monotonic()
        normalize_ms = 0
        score_started = 0.0
        for job in search_result.results:
            if score_started == 0.0:
                normalize_ms = int((time.monotonic() - normalize_started) * 1000)
                score_started = time.monotonic()
            score = JobScoringService.score_job(job=job, profile=profile)
            scored_rows.append(
                {
                    "job": job.model_dump(mode="json"),
                    "score": score.model_dump(mode="json"),
                }
            )
        if score_started == 0.0:
            normalize_ms = int((time.monotonic() - normalize_started) * 1000)
            score_ms = 0
        else:
            score_ms = int((time.monotonic() - score_started) * 1000)

        ranked = sorted(
            scored_rows,
            key=lambda row: (
                -int(row["score"]["final_score"]),
                str(row["job"]["id"]),
                str(row["job"]["title"]),
            ),
        )

        log_event(
            logger,
            level=logging.INFO,
            event_id="saved_search_runner_complete",
            message="The saved search completed and results were ranked deterministically. Use the returned fingerprint to compare subsequent runs.",
            details={
                "result_total": search_result.total,
                "ranked_count": len(ranked),
                "ruleset_version": saved.ruleset_version,
            },
            request_id=request_id,
            saved_search_id=saved_search_id,
        )

        return {
            "saved_search_id": saved_search_id,
            "ruleset_version": saved.ruleset_version,
            "mapper_version": execution.mapper_version,
            "total": search_result.total,
            "results": ranked,
            "query_fingerprint": execution.query_fingerprint,
            "upstream_audit_id": execution.upstream_audit_id,
            "upstream_raw_hash": execution.upstream_raw_hash,
            "ingestion_summary": ingestion_summary,
            "profile_payload": json.loads(json.dumps(saved.profile_payload, sort_keys=True))
            if saved.profile_payload is not None
            else None,
            "resume_cursor_used": json.loads(json.dumps(resume_cursor or {}, sort_keys=True)),
            "timings_ms": {
                "usajobs_fetch_ms": fetch_ms,
                "normalize_ms": normalize_ms,
                "score_ms": score_ms,
            },
        }
