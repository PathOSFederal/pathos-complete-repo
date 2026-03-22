"""Thin diagnostics endpoints for runtime integration visibility."""

from __future__ import annotations

import time

from fastapi import APIRouter, Request

from app.core.config import get_db_dialect, get_runtime_env
from app.core.logging import DEFAULT_SERVICE_VERSION
from app.db.connection import connect, init_db
from app.db.migration_safety import get_alembic_head, get_db_revision
from app.models.diagnostics import (
    DiagnosticsEntityCountsOut,
    DiagnosticsSnapshotOut,
    DiagnosticsTelemetrySummaryOut,
    USAJobsDiagnosticsOut,
)
from app.services.usajobs_diagnostics_service import USAJobsDiagnosticsService
from app.services.alerts_run_service import AlertsRunService
from app.services.telemetry_service import TelemetryService

router = APIRouter()


@router.get("/diagnostics/usajobs", response_model=USAJobsDiagnosticsOut)
def diagnostics_usajobs(request: Request) -> USAJobsDiagnosticsOut:
    request_id = getattr(request.state, "request_id", "missing-request-id")
    result = USAJobsDiagnosticsService.get_status(request_id=request_id)
    request.state.domain_outcome = result.domain_outcome.value
    if result.skip_reason:
        request.state.skip_reason = result.skip_reason.value
    if result.empty_reason:
        request.state.empty_reason = result.empty_reason.value
    return result


def _count_rows(*, table_name: str) -> int:
    init_db()
    with connect() as conn:
        row = conn.execute(f"SELECT COUNT(1) AS c FROM {table_name}").fetchone()
    if row is None:
        return 0
    return int(row.get("c", 0)) if isinstance(row, dict) else int(row["c"])


def _last_error_summaries(limit: int = 5) -> list[str]:
    bounded = max(1, min(limit, 20))
    init_db()
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT error_summary
            FROM alert_runs
            WHERE error_summary IS NOT NULL AND error_summary <> ''
            ORDER BY started_at DESC, id DESC
            LIMIT ?
            """,
            (bounded,),
        ).fetchall()
    summaries: list[str] = []
    for row in rows:
        raw = (
            row.get("error_summary") if isinstance(row, dict) else row["error_summary"]
        )
        if raw is None:
            continue
        summaries.append(str(raw)[:200])
    return summaries


@router.get("/diagnostics/snapshot", response_model=DiagnosticsSnapshotOut)
def diagnostics_snapshot() -> DiagnosticsSnapshotOut:
    started = time.monotonic()
    init_db()
    latest_run = AlertsRunService.get_latest_run()
    with connect() as conn:
        db_revision = get_db_revision(conn)
    response = DiagnosticsSnapshotOut(
        service_version=DEFAULT_SERVICE_VERSION,
        environment=get_runtime_env(),
        db_dialect=get_db_dialect(),
        alembic_head=get_alembic_head(),
        db_revision=db_revision,
        counts=DiagnosticsEntityCountsOut(
            saved_searches=_count_rows(table_name="saved_searches"),
            alert_rules=_count_rows(table_name="alert_rules"),
            alert_runs=_count_rows(table_name="alert_runs"),
        ),
        last_worker_run_at=latest_run.started_at.isoformat() if latest_run else None,
        last_worker_status=latest_run.status if latest_run else None,
        last_error_summaries=_last_error_summaries(limit=5),
    )
    TelemetryService.record_metric(
        metric_key="diagnostics_snapshot_requests",
        duration_ms=int((time.monotonic() - started) * 1000),
    )
    return response


@router.get("/diagnostics/telemetry", response_model=DiagnosticsTelemetrySummaryOut)
def diagnostics_telemetry_summary() -> DiagnosticsTelemetrySummaryOut:
    return TelemetryService.get_summary()
