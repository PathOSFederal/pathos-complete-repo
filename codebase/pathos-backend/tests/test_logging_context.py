from __future__ import annotations

import logging

from app.core.logging import JsonLogFormatter, log_event
from app.core.request_context import (
    clear_context,
    set_request_id,
    set_rule_id,
    set_run_id,
    set_saved_search_id,
    set_worker_run_id,
)


def test_log_event_includes_correlation_fields_from_context(monkeypatch) -> None:
    captured: dict = {}
    logger = logging.getLogger("test.logger")

    def _capture(level: int, message: str, extra=None):  # noqa: ANN001
        captured["level"] = level
        captured["message"] = message
        captured["extra"] = extra

    monkeypatch.setattr(logger, "log", _capture)
    set_request_id("req-1")
    set_run_id("run-1")
    set_worker_run_id("worker-run-1")
    set_rule_id("rule-1")
    set_saved_search_id("saved-1")

    log_event(
        logger,
        level=logging.INFO,
        event_id="request_complete",
        message="A deterministic test event was emitted.",
        details={"count": 1},
    )

    payload = captured["extra"]["json_extra"]
    assert payload["event_id"] == "request_complete"
    assert payload["request_id"] == "req-1"
    assert payload["run_id"] == "run-1"
    assert payload["worker_run_id"] == "worker-run-1"
    assert payload["rule_id"] == "rule-1"
    assert payload["saved_search_id"] == "saved-1"
    clear_context()


def test_json_formatter_injects_default_service_fields() -> None:
    logger = logging.getLogger("test.service.fields")
    record = logger.makeRecord(
        "test.service.fields",
        logging.INFO,
        __file__,
        1,
        "structured log message",
        (),
        None,
        extra={"json_extra": {"event_id": "request_complete"}},
    )
    payload = JsonLogFormatter().format(record)
    assert '"service"' in payload
    assert '"version"' in payload
    assert '"environment"' in payload
