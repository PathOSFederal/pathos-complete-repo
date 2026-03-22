from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from app.core.config import (
    get_alerts_evaluation_enabled,
    get_dry_run_mode,
    get_pause_reason,
    get_worker_enabled,
)
from app.core.error_handlers import build_canonical_error_response
from app.core.logging import log_event
from app.core.readiness import DatabaseReadinessError, ensure_database_ready
from app.core.startup_validation import StartupValidationError, validate_startup_config
from app.db.connection import get_db_path
from app.db.repo.alert_scheduler_lock_repo import AlertSchedulerLockRepo
from app.db.repo.migration_audit_repo import MigrationAuditRepo
from app.models.diagnostics import HealthReadyOut
from app.services.alerts_run_service import AlertsRunService

router = APIRouter()
logger = logging.getLogger("pathos.health")


def _request_id(request: Request) -> str:
    existing = getattr(request.state, "request_id", None)
    if existing:
        return str(existing)
    generated = str(uuid4())
    request.state.request_id = generated
    return generated


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/health/live")
def health_live() -> dict:
    return {"status": "live"}


def _readiness_runtime_metadata() -> dict:
    latest_run = AlertsRunService.get_latest_run()
    latest_migration = MigrationAuditRepo.get_latest()
    worker_enabled = get_worker_enabled()
    alerts_evaluation_enabled = get_alerts_evaluation_enabled()
    pause_reason = get_pause_reason()
    worker_operational_state = (
        "paused" if (not worker_enabled or not alerts_evaluation_enabled) else "running"
    )
    lock_state = AlertSchedulerLockRepo.get_lock_state_summary(
        lock_name=AlertsRunService.LOCK_NAME
    )
    return {
        "worker_enabled": worker_enabled,
        "alerts_evaluation_enabled": alerts_evaluation_enabled,
        "dry_run_mode": get_dry_run_mode(),
        "worker_operational_state": worker_operational_state,
        "worker_pause_reason_set": bool(pause_reason),
        "last_worker_run_at": latest_run.started_at.isoformat() if latest_run else None,
        "last_worker_status": latest_run.status if latest_run else None,
        "last_migration_audit_event_at": latest_migration.get("applied_at")
        if latest_migration
        else None,
        "lock_state_summary": lock_state,
    }


@router.get("/health/ready", response_model=HealthReadyOut)
def health_ready(request: Request):
    request_id = _request_id(request)
    try:
        validate_startup_config(mode="api", emit_success_event=False)
        migration_result = ensure_database_ready(
            db_path=get_db_path(),
            include_migration_check=True,
            migration_mode="warn",
        )
    except StartupValidationError:
        log_event(
            logger,
            level=logging.ERROR,
            event_id="health_ready_failed",
            message="Readiness check failed because startup configuration is invalid. Fix environment keys and retry readiness.",
            details={"check": "config_validation"},
            request_id=request_id,
        )
        return build_canonical_error_response(
            status_code=503,
            request_id=request_id,
            explicit_code="CONFIG_VALIDATION_FAILED",
        )
    except DatabaseReadinessError:
        log_event(
            logger,
            level=logging.ERROR,
            event_id="health_ready_failed",
            message="Readiness check failed because database connectivity is unavailable. Restore database access and retry.",
            details={"check": "database_connectivity"},
            request_id=request_id,
        )
        return build_canonical_error_response(
            status_code=503,
            request_id=request_id,
            explicit_code="DATABASE_UNAVAILABLE",
        )

    if migration_result is None:
        migration_result_payload = {
            "db_revision": None,
            "alembic_head": None,
            "migration_status": "unknown",
        }
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                **migration_result_payload,
                **_readiness_runtime_metadata(),
            },
        )

    if migration_result.migration_status != "ok":
        log_event(
            logger,
            level=logging.ERROR,
            event_id="migration_safety_mismatch",
            message="Readiness detected database revision mismatch against Alembic head.",
            details={
                "db_revision": migration_result.db_revision,
                "alembic_head": migration_result.alembic_head,
                "migration_status": migration_result.migration_status,
                "remediation": "alembic upgrade head",
            },
            request_id=request_id,
        )
        log_event(
            logger,
            level=logging.ERROR,
            event_id="health_ready_failed",
            message="Readiness check failed because the database revision is not at Alembic head.",
            details={
                "check": "migration_state",
                "db_revision": migration_result.db_revision,
                "alembic_head": migration_result.alembic_head,
                "migration_status": migration_result.migration_status,
            },
            request_id=request_id,
        )
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "db_revision": migration_result.db_revision,
                "alembic_head": migration_result.alembic_head,
                "migration_status": migration_result.migration_status,
                **_readiness_runtime_metadata(),
            },
        )

    log_event(
        logger,
        level=logging.INFO,
        event_id="health_ready_ok",
        message="Readiness check passed. Configuration, database connectivity, and migration state are ready.",
        details={
            "ready": True,
            "db_revision": migration_result.db_revision,
            "alembic_head": migration_result.alembic_head,
            "migration_status": migration_result.migration_status,
        },
        request_id=request_id,
    )
    return {
        "status": "ready",
        "db_revision": migration_result.db_revision,
        "alembic_head": migration_result.alembic_head,
        "migration_status": migration_result.migration_status,
        **_readiness_runtime_metadata(),
    }
