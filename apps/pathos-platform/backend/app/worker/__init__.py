"""Background worker entrypoint for deterministic alert scheduling."""

from __future__ import annotations

import logging
import signal
import sys
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.core.config import (
    get_alerts_delivery_enabled,
    get_alerts_evaluation_enabled,
    get_alert_run_lock_ttl_seconds,
    get_dry_run_mode,
    get_log_level,
    get_pause_reason,
    get_worker_enabled,
    get_worker_max_jobs_scanned,
    get_worker_max_rules_evaluated,
    get_worker_max_run_seconds,
    get_worker_interval_seconds,
)
from app.core.logging import configure_logging, log_event
from app.core.request_context import clear_context, set_run_id, set_worker_run_id
from app.core.readiness import DatabaseReadinessError, ensure_database_ready
from app.core.startup_validation import StartupValidationError, validate_startup_config
from app.db.connection import get_db_path
from app.db.migration_safety import MigrationSafetyError
from app.db.repo.alert_scheduler_lock_repo import AlertSchedulerLockRepo
from app.services.alerts_run_service import AlertsRunService
from app.worker.scheduler_engine import SchedulerEngine

logger = logging.getLogger("pathos.worker")
WORKER_TICK_LOCK_NAME = "alerts-worker-tick-lock"


@dataclass(frozen=True)
class _WorkerOperationalFlags:
    worker_enabled: bool
    alerts_evaluation_enabled: bool
    alerts_delivery_enabled: bool
    dry_run_mode: bool
    pause_reason: str | None


def _read_worker_operational_flags() -> _WorkerOperationalFlags:
    return _WorkerOperationalFlags(
        worker_enabled=get_worker_enabled(),
        alerts_evaluation_enabled=get_alerts_evaluation_enabled(),
        alerts_delivery_enabled=get_alerts_delivery_enabled(),
        dry_run_mode=get_dry_run_mode(),
        pause_reason=get_pause_reason(),
    )


def _redacted_pause_reason(reason: str | None) -> str | None:
    if reason is None:
        return None
    return "set"


class _WorkerLockRepo:
    def try_acquire(
        self, *, lock_name: str, owner_run_id: str, acquired_at: str, expires_at: str
    ) -> bool:
        return AlertSchedulerLockRepo.try_acquire(
            lock_name=lock_name,
            owner_run_id=owner_run_id,
            acquired_at=acquired_at,
            expires_at=expires_at,
        )

    def release(self, *, lock_name: str, owner_run_id: str) -> bool:
        return AlertSchedulerLockRepo.release(
            lock_name=lock_name, owner_run_id=owner_run_id
        )


def _build_scheduler_engine(flags: _WorkerOperationalFlags) -> SchedulerEngine:
    return SchedulerEngine(
        lock_repo=_WorkerLockRepo(),
        evaluate_fn=lambda request_id: AlertsRunService.run_enabled_rules(
            request_id=request_id,
            max_run_seconds=get_worker_max_run_seconds(),
            max_jobs_scanned=get_worker_max_jobs_scanned(),
            max_rules_evaluated=get_worker_max_rules_evaluated(),
            evaluation_enabled=flags.alerts_evaluation_enabled,
            delivery_enabled=flags.alerts_delivery_enabled,
            dry_run_mode=flags.dry_run_mode,
        ),
        digest_writer=lambda _summary: None,
        lock_name=WORKER_TICK_LOCK_NAME,
        lock_ttl_seconds=get_alert_run_lock_ttl_seconds(),
    )


def _worker_startup_preflight() -> None:
    try:
        validate_startup_config(mode="worker")
        ensure_database_ready(db_path=get_db_path())
    except (StartupValidationError, DatabaseReadinessError, MigrationSafetyError):
        log_event(
            logger,
            level=logging.ERROR,
            event_id="worker_startup_failed",
            message="Worker startup checks failed. Correct environment configuration and database readiness, then restart the worker.",
            details={"check": "startup_preflight"},
        )
        raise
    log_event(
        logger,
        level=logging.INFO,
        event_id="worker_startup_ok",
        message="Worker startup checks passed. The scheduler can begin deterministic alert evaluation ticks.",
        details={"check": "startup_preflight"},
    )


def run_once() -> dict[str, Any]:
    worker_run_id = f"worker-{datetime.now(timezone.utc).isoformat()}"
    flags = _read_worker_operational_flags()
    set_worker_run_id(worker_run_id)
    set_run_id(worker_run_id)
    if flags.worker_enabled:
        log_event(
            logger,
            level=logging.INFO,
            event_id="worker_resumed",
            message="Worker is enabled and eligible to execute deterministic scheduler ticks.",
            details={"pause_reason": _redacted_pause_reason(flags.pause_reason)},
            run_id=worker_run_id,
            worker_run_id=worker_run_id,
        )
    else:
        log_event(
            logger,
            level=logging.WARNING,
            event_id="worker_paused",
            message="Worker execution is paused by operational flag.",
            details={"pause_reason": _redacted_pause_reason(flags.pause_reason)},
            run_id=worker_run_id,
            worker_run_id=worker_run_id,
        )
        clear_context()
        return {
            "tick_started_at": datetime.now(timezone.utc).isoformat(),
            "tick_ended_at": datetime.now(timezone.utc).isoformat(),
            "status": "paused",
            "summary": {"reason": "WORKER_ENABLED_FALSE"},
            "worker_run_id": worker_run_id,
            "lock_acquired": False,
            "lock_released": False,
            "double_run_prevented": False,
            "idempotent": True,
            "safe_crash_recovery": True,
            "scheduler_lock_name": WORKER_TICK_LOCK_NAME,
            "scheduler_lock_ttl_seconds": get_alert_run_lock_ttl_seconds(),
        }
    if not flags.alerts_evaluation_enabled:
        log_event(
            logger,
            level=logging.WARNING,
            event_id="worker_paused",
            message="Worker tick skipped because alert evaluation is disabled.",
            details={"pause_reason": "alerts_evaluation_disabled"},
            run_id=worker_run_id,
            worker_run_id=worker_run_id,
        )
        clear_context()
        return {
            "tick_started_at": datetime.now(timezone.utc).isoformat(),
            "tick_ended_at": datetime.now(timezone.utc).isoformat(),
            "status": "paused",
            "summary": {"reason": "ALERTS_EVALUATION_DISABLED"},
            "worker_run_id": worker_run_id,
            "lock_acquired": False,
            "lock_released": False,
            "double_run_prevented": False,
            "idempotent": True,
            "safe_crash_recovery": True,
            "scheduler_lock_name": WORKER_TICK_LOCK_NAME,
            "scheduler_lock_ttl_seconds": get_alert_run_lock_ttl_seconds(),
        }
    log_event(
        logger,
        level=logging.INFO,
        event_id="worker_heartbeat",
        message="Worker scheduler heartbeat started. Running one deterministic evaluation tick.",
        details={},
        run_id=worker_run_id,
        worker_run_id=worker_run_id,
    )
    try:
        result = _build_scheduler_engine(flags).run_once(request_id=worker_run_id)
        payload = {
            "tick_started_at": result.tick_started_at,
            "tick_ended_at": result.tick_ended_at,
            "status": result.status,
            "summary": result.summary,
            "worker_run_id": worker_run_id,
            "lock_acquired": result.lock_acquired,
            "lock_released": result.lock_released,
            "double_run_prevented": result.status == "blocked",
            "idempotent": result.status
            in {"success", "partial_failure", "failed", "blocked"},
            "safe_crash_recovery": result.lock_released or result.status == "blocked",
            "scheduler_lock_name": WORKER_TICK_LOCK_NAME,
            "scheduler_lock_ttl_seconds": get_alert_run_lock_ttl_seconds(),
        }
        return payload
    finally:
        clear_context()


def run_alerts_once() -> dict[str, Any]:
    _worker_startup_preflight()
    return run_once()


def run_hourly(interval_seconds: int = 3600) -> None:
    _worker_startup_preflight()
    stop_event = threading.Event()

    def _handle_stop(signum, frame):  # noqa: ANN001
        del signum, frame
        stop_event.set()

    signal.signal(signal.SIGINT, _handle_stop)
    signal.signal(signal.SIGTERM, _handle_stop)

    failure_streak = 0
    while not stop_event.is_set():
        started = time.monotonic()
        tick = run_once()
        if tick["status"] in {"success", "paused"}:
            failure_streak = 0
            sleep_seconds = interval_seconds
        else:
            failure_streak += 1
            sleep_seconds = min(interval_seconds, 2 ** min(failure_streak, 8))

        elapsed = time.monotonic() - started
        remaining = max(0.0, sleep_seconds - elapsed)
        stop_event.wait(timeout=remaining)


def run_hourly_scheduler(interval_seconds: int = 3600) -> None:
    run_hourly(interval_seconds=interval_seconds)


if __name__ == "__main__":
    configure_logging(get_log_level())
    try:
        run_hourly(interval_seconds=get_worker_interval_seconds())
    except (StartupValidationError, DatabaseReadinessError, MigrationSafetyError):
        sys.exit(1)
