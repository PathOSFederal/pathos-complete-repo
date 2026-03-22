from __future__ import annotations

import logging
import runpy
from pathlib import Path
from types import SimpleNamespace
from typing import Callable

import pytest

import app.worker
from app.core.startup_validation import StartupValidationError


class _FakeStopEvent:
    def __init__(self) -> None:
        self._is_set = False
        self.wait_calls: list[float] = []

    def is_set(self) -> bool:
        return self._is_set

    def set(self) -> None:
        self._is_set = True

    def wait(self, timeout: float | None = None) -> bool:
        self.wait_calls.append(float(timeout if timeout is not None else 0.0))
        self._is_set = True
        return True


class _FakeEngine:
    def __init__(
        self, result: SimpleNamespace | None = None, exc: Exception | None = None
    ) -> None:
        self._result = result
        self._exc = exc
        self.request_ids: list[str] = []

    def run_once(self, *, request_id: str) -> SimpleNamespace:
        self.request_ids.append(request_id)
        if self._exc is not None:
            raise self._exc
        assert self._result is not None
        return self._result


def test_run_once_happy_path_invokes_engine_and_emits_heartbeat(
    caplog, monkeypatch
) -> None:
    engine = _FakeEngine(
        result=SimpleNamespace(
            tick_started_at="2026-02-22T10:00:00+00:00",
            tick_ended_at="2026-02-22T10:00:01+00:00",
            status="success",
            summary={"run_id": "run-1", "status": "success"},
            lock_acquired=True,
            lock_released=True,
        )
    )
    monkeypatch.setattr(app.worker, "_build_scheduler_engine", lambda _flags: engine)
    monkeypatch.setattr(app.worker, "get_alert_run_lock_ttl_seconds", lambda: 90)
    caplog.set_level(logging.INFO, logger="pathos.worker")

    payload = app.worker.run_once()

    assert payload["status"] == "success"
    assert payload["summary"]["run_id"] == "run-1"
    assert payload["idempotent"] is True
    assert payload["double_run_prevented"] is False
    assert payload["safe_crash_recovery"] is True
    assert payload["scheduler_lock_ttl_seconds"] == 90
    assert len(engine.request_ids) == 1
    assert payload["worker_run_id"] == engine.request_ids[0]

    event_ids = [
        payload.get("event_id")
        for payload in (
            getattr(record, "json_extra", None) for record in caplog.records
        )
        if isinstance(payload, dict)
    ]
    assert "worker_heartbeat" in event_ids


def test_run_once_blocked_path_sets_double_run_prevented(monkeypatch) -> None:
    engine = _FakeEngine(
        result=SimpleNamespace(
            tick_started_at="2026-02-22T10:00:00+00:00",
            tick_ended_at="2026-02-22T10:00:00+00:00",
            status="blocked",
            summary=None,
            lock_acquired=False,
            lock_released=False,
        )
    )
    monkeypatch.setattr(app.worker, "_build_scheduler_engine", lambda _flags: engine)

    payload = app.worker.run_once()

    assert payload["status"] == "blocked"
    assert payload["double_run_prevented"] is True
    assert payload["idempotent"] is True
    assert payload["safe_crash_recovery"] is True
    assert payload["lock_acquired"] is False
    assert payload["lock_released"] is False


def test_run_once_exception_path_clears_context_and_bubbles_error(
    caplog, monkeypatch
) -> None:
    engine = _FakeEngine(exc=RuntimeError("engine-failed"))
    cleared = {"count": 0}

    def _clear_context() -> None:
        cleared["count"] += 1

    monkeypatch.setattr(app.worker, "_build_scheduler_engine", lambda _flags: engine)
    monkeypatch.setattr(app.worker, "clear_context", _clear_context)
    caplog.set_level(logging.INFO, logger="pathos.worker")

    with pytest.raises(RuntimeError, match="engine-failed"):
        app.worker.run_once()

    assert cleared["count"] == 1

    event_ids = [
        payload.get("event_id")
        for payload in (
            getattr(record, "json_extra", None) for record in caplog.records
        )
        if isinstance(payload, dict)
    ]
    assert "worker_heartbeat" in event_ids


def test_run_hourly_success_path_uses_interval_sleep(monkeypatch) -> None:
    fake_stop_event = _FakeStopEvent()
    handlers: dict[int, Callable[[object, object], None]] = {}

    def _capture_signal_handler(
        sig: int, handler: Callable[[object, object], None]
    ) -> None:
        handlers[sig] = handler

    monkeypatch.setattr(app.worker, "_worker_startup_preflight", lambda: None)
    monkeypatch.setattr(app.worker.threading, "Event", lambda: fake_stop_event)
    monkeypatch.setattr(
        app.worker.signal,
        "signal",
        _capture_signal_handler,
    )
    monkeypatch.setattr(app.worker, "run_once", lambda: {"status": "success"})

    monotonic_values = iter([10.0, 11.5])
    monkeypatch.setattr(app.worker.time, "monotonic", lambda: next(monotonic_values))

    app.worker.run_hourly(interval_seconds=5)

    assert fake_stop_event.wait_calls == [3.5]
    assert app.worker.signal.SIGINT in handlers
    assert app.worker.signal.SIGTERM in handlers

    # Execute the captured handler to cover the explicit stop-path branch body.
    sigterm_handler = handlers[app.worker.signal.SIGTERM]
    sigterm_handler(None, None)
    assert fake_stop_event.is_set() is True


def test_run_hourly_failure_path_uses_backoff_sleep(monkeypatch) -> None:
    fake_stop_event = _FakeStopEvent()

    monkeypatch.setattr(app.worker, "_worker_startup_preflight", lambda: None)
    monkeypatch.setattr(app.worker.threading, "Event", lambda: fake_stop_event)
    monkeypatch.setattr(app.worker.signal, "signal", lambda _sig, _handler: None)
    monkeypatch.setattr(app.worker, "run_once", lambda: {"status": "failed"})

    monotonic_values = iter([20.0, 20.25])
    monkeypatch.setattr(app.worker.time, "monotonic", lambda: next(monotonic_values))

    app.worker.run_hourly(interval_seconds=10)

    assert fake_stop_event.wait_calls == [1.75]


def test_run_hourly_scheduler_delegates_to_run_hourly(monkeypatch) -> None:
    calls: list[int] = []
    monkeypatch.setattr(
        app.worker,
        "run_hourly",
        lambda *, interval_seconds: calls.append(interval_seconds),
    )

    app.worker.run_hourly_scheduler(interval_seconds=77)

    assert calls == [77]


def test_main_block_exits_with_code_one_on_startup_failure(monkeypatch) -> None:
    configure_calls: list[str] = []

    monkeypatch.setattr("app.core.config.get_log_level", lambda: "INFO")
    monkeypatch.setattr(
        "app.core.logging.configure_logging",
        lambda level: configure_calls.append(level),
    )
    monkeypatch.setattr("app.core.config.get_worker_interval_seconds", lambda: 30)

    def _raise_startup_error(*, mode: str) -> None:
        assert mode == "worker"
        raise StartupValidationError("invalid")

    monkeypatch.setattr(
        "app.core.startup_validation.validate_startup_config",
        _raise_startup_error,
    )

    with pytest.raises(SystemExit) as exc:
        runpy.run_path(
            str(Path("app/worker/__init__.py")),
            run_name="__main__",
        )

    assert exc.value.code == 1
    assert configure_calls == ["INFO"]
