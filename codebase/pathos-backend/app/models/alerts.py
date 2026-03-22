"""app.models.alerts

WHY THIS FILE EXISTS:
Defines stable API models for alert derivation from saved search runs.

LAYER FIT:
- Model/validation layer only.

WHAT THIS FILE MUST NOT DO:
- Must not orchestrate job runs.
- Must not perform persistence.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.outcome import DomainOutcome, EmptyReason, SkipReason


class AlertOut(BaseModel):
    """Alert record exposed by alert endpoints."""

    id: str
    saved_search_id: str
    created_at: datetime
    title: str
    summary: str
    job_ids: list[str]
    acknowledged_at: datetime | None = None


class AlertAcknowledgeResponse(BaseModel):
    """Response contract for alert acknowledge operation."""

    acknowledged: bool
    alert: AlertOut


class SavedSearchRunOut(BaseModel):
    saved_search_id: str
    new_job_ids: list[str]
    alert: AlertOut | None = None
    total: int
    domain_outcome: DomainOutcome
    skip_reason: SkipReason | None = None
    empty_reason: EmptyReason | None = None
    skip_details: str | None = None
