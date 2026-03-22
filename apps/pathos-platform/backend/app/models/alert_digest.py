"""Digest and observability contracts for alerting v1."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.outcome import BackoffEvent, DomainOutcome, EmptyReason, SkipReason
from app.models.alert_rule import AlertRuleOut
from app.models.saved_search import SavedSearchOut


class JobDelta(BaseModel):
    job_id: str
    status: str
    score_delta: int
    threshold_crossed: bool


class AlertDigestPayload(BaseModel):
    totals: dict[str, int]
    top_jobs: list[dict]
    reasons_summary: list[str]
    risks_summary: list[str]
    run_metadata: dict


class AlertDigestOut(BaseModel):
    id: str
    alert_run_id: str
    alert_rule_id: str
    created_at: datetime
    delivery_mode: str
    payload_json: dict


class DesktopLatestDigestOut(BaseModel):
    run_id: str
    created_at: datetime
    jobs_scanned: int = Field(ge=0)
    triggers_count: int = Field(ge=0)
    suppressed_count: int = Field(ge=0)
    summary: str


class AlertRunsOut(BaseModel):
    id: str
    started_at: datetime
    ended_at: datetime | None = None
    status: str
    rules_evaluated: int = Field(ge=0)
    jobs_scanned: int = Field(ge=0)
    triggers_count: int = Field(ge=0)
    suppressed_count: int = Field(ge=0)
    domain_outcome: DomainOutcome
    error_summary: str | None = None
    usajobs_fetch_ms: int = Field(ge=0)
    normalize_ms: int = Field(ge=0)
    score_ms: int = Field(ge=0)
    delta_ms: int = Field(ge=0)
    digest_ms: int = Field(ge=0)
    backoff_events: list[BackoffEvent] = Field(default_factory=list)
    lock_acquired: bool = False
    lock_released: bool = False
    skip_reason: SkipReason | None = None
    empty_reason: EmptyReason | None = None
    skip_details: str | None = None


class AlertRuleHistoryOut(BaseModel):
    id: str
    alert_run_id: str
    alert_rule_id: str
    started_at: datetime
    ended_at: datetime
    status: str
    jobs_scanned: int
    triggers_count: int
    suppressed_count: int
    error_summary: str | None = None
    backoff_events: list[BackoffEvent]


class DeliveryIntent(BaseModel):
    run_id: str
    alert_rule_id: str
    saved_search_id: str
    delivery_mode: str
    created_at: datetime
    digest_payload: AlertDigestPayload
    triggered_job_ids: list[str]


class AlertMetricsOut(BaseModel):
    run_id: str
    started_at: datetime
    status: str
    usajobs_fetch_ms: int = Field(ge=0)
    normalize_ms: int = Field(ge=0)
    score_ms: int = Field(ge=0)
    delta_ms: int = Field(ge=0)
    digest_ms: int = Field(ge=0)
    jobs_scanned: int = Field(ge=0)
    triggers_count: int = Field(ge=0)
    suppressed_count: int = Field(ge=0)
    domain_outcome: DomainOutcome
    backoff_events: list[BackoffEvent] = Field(default_factory=list)
    skip_reason: SkipReason | None = None
    empty_reason: EmptyReason | None = None
    skip_details: str | None = None


class GuardrailConfigOut(BaseModel):
    min_interval_minutes: int = Field(ge=1)
    max_jobs_scanned: int = Field(ge=1)
    global_rules_per_run: int = Field(ge=1)
    lock_ttl_seconds: int = Field(ge=1)


class DesktopOverviewOut(BaseModel):
    latest_digests: list[AlertDigestOut]
    latest_digest_summaries: list[DesktopLatestDigestOut] = Field(default_factory=list)
    saved_searches: list[SavedSearchOut]
    alert_rules: list[AlertRuleOut]
    last_alert_run: AlertRunsOut | None = None
    guardrail_config: GuardrailConfigOut
