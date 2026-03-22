"""app.api.v1.advisor_session

WHY THIS FILE EXISTS:
Thin API controller for deterministic advisor sessions and append-only events.

LAYER FIT:
- Router/controller layer.

WHAT THIS FILE MUST NOT DO:
- Must not call LLM/narration layers.
- Must not perform direct DB writes.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.models.advisor_session import (
    AdvisorSessionCreateRequest,
    AdvisorSessionEventOut,
    AdvisorSessionEventRequest,
    AdvisorSessionOut,
)
from app.services.advisor_session_service import (
    AdvisorSessionClosedError,
    AdvisorSessionNotFoundError,
    AdvisorSessionService,
    AdvisorSessionValidationError,
)

router = APIRouter()


@router.post("/advisor/session", response_model=AdvisorSessionOut)
def create_advisor_session(payload: AdvisorSessionCreateRequest, request: Request) -> AdvisorSessionOut:
    """Create advisor session with immutable context snapshot."""

    request_id = getattr(request.state, "request_id", "missing-request-id")
    return AdvisorSessionService.create_session(payload=payload, request_id=request_id)


@router.post("/advisor/session/{session_id}/events", response_model=AdvisorSessionEventOut)
def append_advisor_session_event(session_id: str, payload: AdvisorSessionEventRequest) -> AdvisorSessionEventOut:
    """Append event to open advisor session."""

    try:
        return AdvisorSessionService.append_event(session_id=session_id, payload=payload)
    except AdvisorSessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc
    except AdvisorSessionClosedError as exc:
        raise HTTPException(status_code=409, detail={"code": "BAD_REQUEST"}) from exc
    except AdvisorSessionValidationError as exc:
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST"}) from exc


@router.get("/advisor/session/{session_id}", response_model=AdvisorSessionOut)
def get_advisor_session(session_id: str) -> AdvisorSessionOut:
    """Read advisor session and append-only events."""

    try:
        return AdvisorSessionService.get_session(session_id=session_id)
    except AdvisorSessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc


@router.post("/advisor/session/{session_id}/close", response_model=AdvisorSessionOut)
def close_advisor_session(session_id: str) -> AdvisorSessionOut:
    """Close advisor session idempotently."""

    try:
        return AdvisorSessionService.close_session(session_id=session_id)
    except AdvisorSessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc
