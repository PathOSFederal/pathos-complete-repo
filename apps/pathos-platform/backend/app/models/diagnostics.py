"""Diagnostics API contracts for runtime environment and upstream probe visibility."""

from __future__ import annotations

from typing import Literal

from pydantic import ConfigDict
from pydantic import BaseModel

from app.models.outcome import DomainOutcome, EmptyReason, SkipReason


class EnvPresenceOut(BaseModel):
    USAJOBS_API_KEY: str
    USAJOBS_USER_AGENT: str


class DiagnosticsErrorOut(BaseModel):
    code: str
    message: str


class USAJobsDiagnosticsOut(BaseModel):
    configured: bool
    env: EnvPresenceOut
    can_query: bool
    sample_count: int
    duration_ms: int
    domain_outcome: DomainOutcome
    skip_reason: SkipReason | None = None
    empty_reason: EmptyReason | None = None
    error: DiagnosticsErrorOut | None = None


class DiagnosticsEntityCountsOut(BaseModel):
    saved_searches: int
    alert_rules: int
    alert_runs: int


class DiagnosticsSnapshotOut(BaseModel):
    service_version: str
    environment: str
    db_dialect: str
    alembic_head: str | None = None
    db_revision: str | None = None
    counts: DiagnosticsEntityCountsOut
    last_worker_run_at: str | None = None
    last_worker_status: str | None = None
    last_error_summaries: list[str]


class WorkerLockStateSummaryOut(BaseModel):
    lock_name: str
    lock_held: bool
    owner_run_id: str | None = None
    expires_at: str | None = None
    active_locks: int


class HealthReadyOut(BaseModel):
    status: Literal["ready", "not_ready"]
    db_revision: str | None = None
    alembic_head: str | None = None
    migration_status: str | None = None
    worker_enabled: bool
    alerts_evaluation_enabled: bool
    dry_run_mode: bool
    worker_operational_state: Literal["running", "paused"]
    worker_pause_reason_set: bool
    last_worker_run_at: str | None = None
    last_worker_status: str | None = None
    last_migration_audit_event_at: str | None = None
    lock_state_summary: WorkerLockStateSummaryOut


class ExportIntegrityOut(BaseModel):
    export_hash: str
    hash_alg: Literal["sha256"]
    export_bytes: int
    timestamp: str

    # Preserve backward compatibility for endpoint-specific payload keys
    # while locking integrity metadata required by desktop clients.
    model_config = ConfigDict(extra="allow")


class TelemetryCounterOut(BaseModel):
    metric_key: str
    count: int
    total_duration_ms: int
    avg_duration_ms: float
    updated_at: str


class DiagnosticsTelemetrySummaryOut(BaseModel):
    telemetry_enabled: bool
    generated_at: str
    counters: list[TelemetryCounterOut]
    message: str | None = None
