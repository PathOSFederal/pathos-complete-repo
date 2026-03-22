"""Alert rule and evaluation models for deterministic alert scheduling."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.outcome import DomainOutcome, EmptyReason, SkipReason


class AlertRuleCreateRequest(BaseModel):
    saved_search_id: str = Field(min_length=1)
    min_score_threshold: int = Field(ge=0, le=100)
    max_per_day: int = Field(default=10, ge=1, le=500)
    cooldown_hours: int = Field(default=24, ge=0, le=720)
    delivery_mode: Literal["local_only", "digest_payload", "email_digest_future"] = "local_only"
    enabled: bool = True


class AlertRuleUpdateRequest(BaseModel):
    min_score_threshold: int = Field(ge=0, le=100)
    max_per_day: int = Field(default=10, ge=1, le=500)
    cooldown_hours: int = Field(default=24, ge=0, le=720)
    delivery_mode: Literal["local_only", "digest_payload", "email_digest_future"] = "local_only"
    enabled: bool = True


class AlertRuleOut(BaseModel):
    id: str
    saved_search_id: str
    min_score_threshold: int
    max_per_day: int
    cooldown_hours: int
    delivery_mode: Literal["local_only", "digest_payload", "email_digest_future"]
    enabled: bool
    created_at: datetime
    updated_at: datetime


class AlertDecision(BaseModel):
    job_id: str
    score: int = Field(ge=0, le=100)
    reasons_summary: list[str]
    triggered: bool
    suppression_reason: str | None = None


class AlertRunRuleBreakdown(BaseModel):
    alert_rule_id: str
    saved_search_id: str
    jobs_scanned: int = Field(ge=0)
    triggers_count: int = Field(ge=0)
    suppressed_count: int = Field(ge=0)


class AlertRunSummary(BaseModel):
    run_id: str
    started_at: datetime
    ended_at: datetime
    status: Literal["success", "partial_failure", "failed"]
    rules_evaluated: int = Field(ge=0)
    jobs_scanned: int = Field(ge=0)
    triggers_count: int = Field(ge=0)
    suppressed_count: int = Field(ge=0)
    per_rule: list[AlertRunRuleBreakdown]
    domain_outcome: DomainOutcome
    error_summary: str | None = None
    skip_reason: SkipReason | None = None
    empty_reason: EmptyReason | None = None
    skip_details: str | None = None
