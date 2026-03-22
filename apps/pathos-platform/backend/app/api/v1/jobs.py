"""app.api.v1.jobs

WHY THIS FILE EXISTS:
This router exposes the public `/api/v1/jobs/search` endpoint as a thin controller.
It delegates business flow to service layer and only maps service errors to HTTP status codes.

LAYER FIT:
- API/router layer only.

WHAT THIS FILE MUST NOT DO:
- Must not perform direct HTTP calls to USAJOBS.
- Must not perform direct database writes.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from hashlib import sha256
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request

from app.db.repo.upstream_audit_repo import UpstreamAuditRepo
from app.models.job_score import JobScoreRequest, JobScoreResult
from app.models.job_search import JobSearchRequest, JobSearchResponse
from app.services.job_scoring_service import JobScoringService
from app.services.job_search_service import (
    JobSearchConfigError,
    JobSearchRateLimitedError,
    JobSearchService,
    JobSearchUpstreamAuthError,
    JobSearchUpstreamSchemaError,
    JobSearchUpstreamUnavailableError,
)

router = APIRouter()


def _record_score_audit(
    *,
    request_id: str,
    job_id: str,
    payload: JobScoreRequest,
    status_code: int,
    result_count: int,
    error_class: str | None = None,
) -> None:
    query_hash = sha256(
        json.dumps(
            {"job_id": job_id, "search": payload.search.model_dump(mode="json"), "profile": payload.profile.model_dump()},
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    UpstreamAuditRepo.save_record(
        {
            "id": str(uuid4()),
            "request_id": request_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "endpoint": f"/api/v1/jobs/{job_id}/score",
            "query_hash": query_hash,
            "status_code": status_code,
            "latency_ms": 0,
            "result_count": result_count,
            "error_class": error_class,
        }
    )


@router.post("/jobs/search", response_model=JobSearchResponse)
def search_jobs(payload: JobSearchRequest, request: Request) -> JobSearchResponse:
    """Handle deterministic jobs search request.

    Inputs:
    - `payload`: validated search filters.
    - `request`: FastAPI request used only for request_id extraction.

    Outputs:
    - Normalized `JobSearchResponse`.

    Error behavior:
    - Maps controlled upstream errors to HTTPException so global error handler emits ErrorResponse.
    """

    request_id = getattr(request.state, "request_id", "missing-request-id")
    try:
        return JobSearchService.search_jobs(search=payload, request_id=request_id)
    except JobSearchConfigError as exc:
        raise HTTPException(status_code=503, detail={"code": "SERVICE_UNAVAILABLE"}) from exc
    except JobSearchUpstreamAuthError as exc:
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_BAD_RESPONSE"}) from exc
    except JobSearchUpstreamUnavailableError as exc:
        raise HTTPException(status_code=503, detail={"code": "SERVICE_UNAVAILABLE"}) from exc
    except JobSearchUpstreamSchemaError as exc:
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_BAD_RESPONSE"}) from exc
    except JobSearchRateLimitedError as exc:
        raise HTTPException(status_code=429, detail={"code": "RATE_LIMITED"}) from exc


@router.post("/jobs/{job_id}/score", response_model=JobScoreResult)
def score_job(job_id: str, payload: JobScoreRequest, request: Request) -> JobScoreResult:
    """Resolve a canonical job by id from deterministic search response, then score it."""

    request_id = getattr(request.state, "request_id", "missing-request-id")
    try:
        search_result = JobSearchService.search_jobs(search=payload.search, request_id=request_id)
        job = next((row for row in search_result.results if row.id == job_id), None)
        if job is None:
            _record_score_audit(
                request_id=request_id,
                job_id=job_id,
                payload=payload,
                status_code=404,
                result_count=0,
                error_class="JobNotFoundForScoring",
            )
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

        result = JobScoringService.score_job(job=job, profile=payload.profile)
        _record_score_audit(
            request_id=request_id,
            job_id=job_id,
            payload=payload,
            status_code=200,
            result_count=1,
        )
        return result
    except JobSearchConfigError as exc:
        _record_score_audit(
            request_id=request_id,
            job_id=job_id,
            payload=payload,
            status_code=503,
            result_count=0,
            error_class=type(exc).__name__,
        )
        raise HTTPException(status_code=503, detail={"code": "SERVICE_UNAVAILABLE"}) from exc
    except JobSearchUpstreamAuthError as exc:
        _record_score_audit(
            request_id=request_id,
            job_id=job_id,
            payload=payload,
            status_code=502,
            result_count=0,
            error_class=type(exc).__name__,
        )
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_BAD_RESPONSE"}) from exc
    except JobSearchUpstreamUnavailableError as exc:
        _record_score_audit(
            request_id=request_id,
            job_id=job_id,
            payload=payload,
            status_code=503,
            result_count=0,
            error_class=type(exc).__name__,
        )
        raise HTTPException(status_code=503, detail={"code": "SERVICE_UNAVAILABLE"}) from exc
    except JobSearchUpstreamSchemaError as exc:
        _record_score_audit(
            request_id=request_id,
            job_id=job_id,
            payload=payload,
            status_code=502,
            result_count=0,
            error_class=type(exc).__name__,
        )
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_BAD_RESPONSE"}) from exc
    except JobSearchRateLimitedError as exc:
        _record_score_audit(
            request_id=request_id,
            job_id=job_id,
            payload=payload,
            status_code=429,
            result_count=0,
            error_class=type(exc).__name__,
        )
        raise HTTPException(status_code=429, detail={"code": "RATE_LIMITED"}) from exc
