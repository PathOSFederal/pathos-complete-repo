"""Deterministic intelligence snapshot endpoints (contract pack v1)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request, Response

from app.core.runtime_guards import require_placeholder_runtime_allowed
from app.intelligence.snapshots.engine import (
    compute_application_confidence,
    compute_career_readiness,
    compute_job_match,
    compute_resume_readiness,
)
from app.intelligence.snapshots.models import (
    ApplicationConfidenceRequest,
    ApplicationConfidenceSnapshot,
    CareerReadinessRequest,
    CareerReadinessSnapshot,
    JobMatchRequest,
    JobMatchSnapshot,
    ResumeReadinessRequest,
    ResumeReadinessSnapshot,
)

router = APIRouter()
logger = logging.getLogger("pathos.intelligence")


def _log_snapshot(
    request: Request, snapshot_kind: str, snapshot_id: str, input_hash: str
) -> None:
    request_id = getattr(request.state, "request_id", "missing-request-id")
    message = "Deterministic snapshot generated from local-only contract-pack stub logic."
    logger.warning(
        message,
        extra={
            "json_extra": {
                "message": message,
                "kind": snapshot_kind,
                "snapshot_id": snapshot_id,
                "input_hash": input_hash,
                "rule_version": "snapshot-rules-v1",
                "knowledge_pack_version": "career-pack-v1",
                "stubbed_contract_only": True,
                "request_id": request_id,
            }
        },
    )


@router.post("/intelligence/career-readiness", response_model=CareerReadinessSnapshot)
def career_readiness(
    request: Request, response: Response, payload: CareerReadinessRequest
) -> CareerReadinessSnapshot:
    require_placeholder_runtime_allowed(feature_name="intelligence_snapshots_v1")
    response.headers["X-PathOS-Intelligence-Status"] = "stubbed-contract-v1-local-only"
    snapshot = compute_career_readiness(payload)
    _log_snapshot(
        request=request,
        snapshot_kind=snapshot.meta.kind,
        snapshot_id=snapshot.meta.snapshot_id,
        input_hash=snapshot.meta.input_hash,
    )
    return snapshot


@router.post("/intelligence/resume-readiness", response_model=ResumeReadinessSnapshot)
def resume_readiness(
    request: Request, response: Response, payload: ResumeReadinessRequest
) -> ResumeReadinessSnapshot:
    require_placeholder_runtime_allowed(feature_name="intelligence_snapshots_v1")
    response.headers["X-PathOS-Intelligence-Status"] = "stubbed-contract-v1-local-only"
    snapshot = compute_resume_readiness(payload)
    _log_snapshot(
        request=request,
        snapshot_kind=snapshot.meta.kind,
        snapshot_id=snapshot.meta.snapshot_id,
        input_hash=snapshot.meta.input_hash,
    )
    return snapshot


@router.post("/intelligence/job-match", response_model=JobMatchSnapshot)
def job_match(
    request: Request, response: Response, payload: JobMatchRequest
) -> JobMatchSnapshot:
    require_placeholder_runtime_allowed(feature_name="intelligence_snapshots_v1")
    response.headers["X-PathOS-Intelligence-Status"] = "stubbed-contract-v1-local-only"
    snapshot = compute_job_match(payload)
    _log_snapshot(
        request=request,
        snapshot_kind=snapshot.meta.kind,
        snapshot_id=snapshot.meta.snapshot_id,
        input_hash=snapshot.meta.input_hash,
    )
    return snapshot


@router.post(
    "/intelligence/application-confidence", response_model=ApplicationConfidenceSnapshot
)
def application_confidence(
    request: Request, response: Response, payload: ApplicationConfidenceRequest
) -> ApplicationConfidenceSnapshot:
    require_placeholder_runtime_allowed(feature_name="intelligence_snapshots_v1")
    response.headers["X-PathOS-Intelligence-Status"] = "stubbed-contract-v1-local-only"
    snapshot = compute_application_confidence(payload)
    _log_snapshot(
        request=request,
        snapshot_kind=snapshot.meta.kind,
        snapshot_id=snapshot.meta.snapshot_id,
        input_hash=snapshot.meta.input_hash,
    )
    return snapshot
