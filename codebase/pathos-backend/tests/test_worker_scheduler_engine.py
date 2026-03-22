from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import create_app
from app.models.alert_rule import AlertRunSummary
from app.models.outcome import DomainOutcome
from app.worker import run_once
from app.worker.scheduler_engine import SchedulerEngine


class _InMemoryLockRepo:
    def __init__(self) -> None:
        self._held: set[str] = set()
        self.release_calls = 0

    def try_acquire(
        self, *, lock_name: str, owner_run_id: str, acquired_at: str, expires_at: str
    ) -> bool:
        del owner_run_id, acquired_at, expires_at
        if lock_name in self._held:
            return False
        self._held.add(lock_name)
        return True

    def release(self, *, lock_name: str, owner_run_id: str) -> bool:
        del owner_run_id
        self.release_calls += 1
        if lock_name not in self._held:
            return False
        self._held.remove(lock_name)
        return True


class _NonReleasingLockRepo(_InMemoryLockRepo):
    def release(self, *, lock_name: str, owner_run_id: str) -> bool:
        del lock_name, owner_run_id
        self.release_calls += 1
        return True


class _Summary:
    status = "success"

    def model_dump(self, *, mode: str):  # noqa: ANN001
        del mode
        return {"run_id": "run-1", "status": "success"}


def test_scheduler_engine_blocks_second_run_on_lock_contention() -> None:
    lock_repo = _NonReleasingLockRepo()
    calls = {"count": 0}

    def _evaluate(_request_id: str) -> _Summary:
        calls["count"] += 1
        return _Summary()

    engine = SchedulerEngine(
        lock_repo=lock_repo,
        evaluate_fn=_evaluate,
        digest_writer=None,
        lock_name="worker-lock",
        lock_ttl_seconds=300,
    )

    first = engine.run_once(request_id="worker-run-1")
    second = engine.run_once(request_id="worker-run-2")

    assert first.status == "success", "first run should execute when lock is free"
    assert second.status == "blocked", (
        "second run should be blocked by existing lock holder"
    )
    assert calls["count"] == 1, (
        "evaluation should execute once when second run is blocked"
    )


def test_scheduler_engine_marks_double_run_prevention_via_blocked_status() -> None:
    lock_repo = _NonReleasingLockRepo()
    engine = SchedulerEngine(
        lock_repo=lock_repo,
        evaluate_fn=lambda _request_id: _Summary(),
        digest_writer=None,
        lock_name="worker-lock",
        lock_ttl_seconds=300,
    )

    engine.run_once(request_id="worker-run-1")
    blocked = engine.run_once(request_id="worker-run-2")

    assert blocked.status == "blocked", (
        "blocked status is the deterministic double-run prevention signal"
    )
    assert blocked.lock_acquired is False, "blocked run must report lock_acquired=False"


def test_scheduler_engine_releases_lock_after_evaluation_exception() -> None:
    lock_repo = _InMemoryLockRepo()

    def _raise(_request_id: str):
        raise RuntimeError("boom")

    engine = SchedulerEngine(
        lock_repo=lock_repo,
        evaluate_fn=_raise,
        digest_writer=None,
        lock_name="worker-lock",
        lock_ttl_seconds=300,
    )

    result = engine.run_once(request_id="worker-run-err")

    assert result.status == "failed"
    assert result.summary == {"error_type": "RuntimeError"}
    assert lock_repo.release_calls == 1, (
        "lock release must be attempted after evaluation exceptions"
    )


def test_worker_run_once_pauses_when_worker_disabled(monkeypatch) -> None:
    monkeypatch.setenv("WORKER_ENABLED", "false")
    monkeypatch.setenv("ALERTS_EVALUATION_ENABLED", "true")

    called = {"count": 0}

    def _unexpected(**_kwargs) -> AlertRunSummary:
        called["count"] += 1
        return AlertRunSummary(
            run_id="unused",
            started_at=datetime(2026, 2, 23, 0, 0, tzinfo=timezone.utc),
            ended_at=datetime(2026, 2, 23, 0, 1, tzinfo=timezone.utc),
            status="success",
            rules_evaluated=0,
            jobs_scanned=0,
            triggers_count=0,
            suppressed_count=0,
            per_rule=[],
            domain_outcome=DomainOutcome.SKIPPED,
            error_summary=None,
        )

    monkeypatch.setattr(
        "app.worker.AlertsRunService.run_enabled_rules",
        _unexpected,
    )

    payload = run_once()

    assert payload["status"] == "paused"
    assert payload["summary"]["reason"] == "WORKER_ENABLED_FALSE"
    assert called["count"] == 0


def test_worker_run_once_forwards_dry_run_and_delivery_flags(monkeypatch) -> None:
    monkeypatch.setenv("WORKER_ENABLED", "true")
    monkeypatch.setenv("ALERTS_EVALUATION_ENABLED", "true")
    monkeypatch.setenv("DRY_RUN_MODE", "true")
    monkeypatch.setenv("ALERTS_DELIVERY_ENABLED", "false")
    monkeypatch.setenv("PATHOS_DB_PATH", "/tmp/pathos_worker_flags.db")

    captured: dict[str, object] = {}

    def _fake_run_enabled_rules(**kwargs) -> AlertRunSummary:  # noqa: ANN003
        captured.update(kwargs)
        return AlertRunSummary(
            run_id="run-flags",
            started_at=datetime(2026, 2, 23, 0, 0, tzinfo=timezone.utc),
            ended_at=datetime(2026, 2, 23, 0, 1, tzinfo=timezone.utc),
            status="success",
            rules_evaluated=0,
            jobs_scanned=0,
            triggers_count=0,
            suppressed_count=0,
            per_rule=[],
            domain_outcome=DomainOutcome.SKIPPED,
            error_summary=None,
        )

    monkeypatch.setattr(
        "app.worker.AlertsRunService.run_enabled_rules",
        _fake_run_enabled_rules,
    )

    payload = run_once()

    assert payload["status"] == "success"
    assert captured.get("dry_run_mode") is True
    assert captured.get("delivery_enabled") is False
    assert captured.get("evaluation_enabled") is True


def test_ops_status_endpoint_reports_operational_flags(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ops_status.db"))
    monkeypatch.setenv("WORKER_ENABLED", "false")
    monkeypatch.setenv("ALERTS_EVALUATION_ENABLED", "false")
    monkeypatch.setenv("ALERTS_DELIVERY_ENABLED", "false")
    monkeypatch.setenv("DRY_RUN_MODE", "true")
    monkeypatch.setenv("PAUSE_REASON", "maintenance")
    app = create_app()

    with TestClient(app) as client:
        response = client.get(
            "/api/v1/ops/status", headers={"Authorization": "Bearer k1"}
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["worker_enabled"] is False
    assert payload["alerts_evaluation_enabled"] is False
    assert payload["alerts_delivery_enabled"] is False
    assert payload["dry_run_mode"] is True
    assert payload["pause_reason_set"] is True
