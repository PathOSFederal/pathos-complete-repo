"""Deterministic intelligence snapshot endpoints (contract pack v1)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request

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
    message = "Deterministic snapshot generated."
    logger.info(
        message,
        extra={
            "json_extra": {
                "message": message,
                "kind": snapshot_kind,
                "snapshot_id": snapshot_id,
                "input_hash": input_hash,
                "rule_version": "snapshot-rules-v1",
                "knowledge_pack_version": "career-pack-v1",
                "request_id": request_id,
            }
        },
    )


@router.post("/intelligence/career-readiness", response_model=CareerReadinessSnapshot)
def career_readiness(
    request: Request, payload: CareerReadinessRequest
) -> CareerReadinessSnapshot:
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
    request: Request, payload: ResumeReadinessRequest
) -> ResumeReadinessSnapshot:
    snapshot = compute_resume_readiness(payload)
    _log_snapshot(
        request=request,
        snapshot_kind=snapshot.meta.kind,
        snapshot_id=snapshot.meta.snapshot_id,
        input_hash=snapshot.meta.input_hash,
    )
    return snapshot


@router.post("/intelligence/job-match", response_model=JobMatchSnapshot)
def job_match(request: Request, payload: JobMatchRequest) -> JobMatchSnapshot:
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
    request: Request, payload: ApplicationConfidenceRequest
) -> ApplicationConfidenceSnapshot:
    snapshot = compute_application_confidence(payload)
    _log_snapshot(
        request=request,
        snapshot_kind=snapshot.meta.kind,
        snapshot_id=snapshot.meta.snapshot_id,
        input_hash=snapshot.meta.input_hash,
    )
    return snapshot
