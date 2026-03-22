"""Worker scheduler engine that isolates lock orchestration from evaluation logic."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Protocol
from uuid import uuid4

from app.core.logging import log_event

logger = logging.getLogger("pathos.worker.scheduler_engine")


class LockRepository(Protocol):
    def try_acquire(
        self, *, lock_name: str, owner_run_id: str, acquired_at: str, expires_at: str
    ) -> bool: ...

    def release(self, *, lock_name: str, owner_run_id: str) -> bool: ...


@dataclass(frozen=True)
class SchedulerEngineResult:
    worker_run_id: str
    status: str
    tick_started_at: str
    tick_ended_at: str
    summary: dict[str, Any] | None
    lock_acquired: bool
    lock_released: bool


class SchedulerEngine:
    def __init__(
        self,
        *,
        lock_repo: LockRepository,
        evaluate_fn: Callable[[str], Any],
        digest_writer: Callable[[Any], None] | None,
        lock_name: str,
        lock_ttl_seconds: int,
    ) -> None:
        self._lock_repo = lock_repo
        self._evaluate_fn = evaluate_fn
        self._digest_writer = digest_writer
        self._lock_name = lock_name
        self._lock_ttl_seconds = max(1, int(lock_ttl_seconds))

    def run_once(self, *, request_id: str | None = None) -> SchedulerEngineResult:
        worker_run_id = request_id if request_id else f"worker-{uuid4()}"
        started_at = datetime.now(timezone.utc)
        acquired_at = started_at.isoformat()
        expires_at = (
            started_at + timedelta(seconds=self._lock_ttl_seconds)
        ).isoformat()
        lock_acquired = self._lock_repo.try_acquire(
            lock_name=self._lock_name,
            owner_run_id=worker_run_id,
            acquired_at=acquired_at,
            expires_at=expires_at,
        )
        log_event(
            logger,
            level=logging.INFO if lock_acquired else logging.WARNING,
            event_id="worker_lock_acquired",
            message="Worker scheduler lock acquisition attempted.",
            details={"lock_name": self._lock_name, "lock_acquired": lock_acquired},
            run_id=worker_run_id,
            worker_run_id=worker_run_id,
        )
        if not lock_acquired:
            ended_at = datetime.now(timezone.utc)
            return SchedulerEngineResult(
                worker_run_id=worker_run_id,
                status="blocked",
                tick_started_at=started_at.isoformat(),
                tick_ended_at=ended_at.isoformat(),
                summary=None,
                lock_acquired=False,
                lock_released=False,
            )

        summary_payload: dict[str, Any] | None = None
        status = "failed"
        ended_at = datetime.now(timezone.utc)
        lock_released = False
        try:
            log_event(
                logger,
                level=logging.INFO,
                event_id="worker_run_started",
                message="Worker scheduler run started after lock acquisition.",
                details={"lock_name": self._lock_name},
                run_id=worker_run_id,
                worker_run_id=worker_run_id,
            )
            summary = self._evaluate_fn(worker_run_id)
            if self._digest_writer is not None:
                self._digest_writer(summary)
            ended_at = datetime.now(timezone.utc)
            status = str(getattr(summary, "status", "success"))
            log_event(
                logger,
                level=logging.INFO,
                event_id="worker_run_ended",
                message="Worker scheduler run ended.",
                details={"status": status},
                run_id=worker_run_id,
                worker_run_id=worker_run_id,
            )
            summary_payload = (
                summary.model_dump(mode="json")
                if hasattr(summary, "model_dump")
                else {"result": str(summary)}
            )
        except Exception as exc:  # noqa: BLE001 - converted to deterministic failed status.
            ended_at = datetime.now(timezone.utc)
            status = "failed"
            summary_payload = {"error_type": type(exc).__name__}
            log_event(
                logger,
                level=logging.ERROR,
                event_id="worker_run_failed",
                message="Worker scheduler run failed during evaluation.",
                details={"error_type": type(exc).__name__},
                run_id=worker_run_id,
                worker_run_id=worker_run_id,
            )
        finally:
            lock_released = self._lock_repo.release(
                lock_name=self._lock_name, owner_run_id=worker_run_id
            )
            log_event(
                logger,
                level=logging.INFO,
                event_id="worker_lock_released",
                message="Worker scheduler lock release attempted.",
                details={"lock_name": self._lock_name, "lock_released": lock_released},
                run_id=worker_run_id,
                worker_run_id=worker_run_id,
            )
        return SchedulerEngineResult(
            worker_run_id=worker_run_id,
            status=status,
            tick_started_at=started_at.isoformat(),
            tick_ended_at=ended_at.isoformat(),
            summary=summary_payload,
            lock_acquired=True,
            lock_released=lock_released,
        )
