"""app.models.advisor_session

WHY THIS FILE EXISTS:
Defines deterministic, append-only advisor session contracts (no LLM orchestration).

LAYER FIT:
- Model/validation layer.

WHAT THIS FILE MUST NOT DO:
- Must not run recommendation engines.
- Must not perform persistence writes.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AdvisorSessionCreateRequest(BaseModel):
    """Create request for advisor session context snapshot."""

    profile_snapshot: dict = Field(default_factory=dict)
    selected_job_ids: list[str] = Field(default_factory=list, max_length=200)


class AdvisorSessionEventRequest(BaseModel):
    """Append-only session event payload."""

    event_type: str = Field(min_length=1, max_length=80)
    payload: dict = Field(default_factory=dict)


class AdvisorSessionEventOut(BaseModel):
    """Session event response contract."""

    id: str
    session_id: str
    event_type: str
    payload_json: dict
    created_at: datetime


class AdvisorSessionOut(BaseModel):
    """Advisor session response with append-only event list."""

    id: str
    created_at: datetime
    closed_at: datetime | None = None
    context_json: dict
    request_id: str
    events: list[AdvisorSessionEventOut] = Field(default_factory=list)
