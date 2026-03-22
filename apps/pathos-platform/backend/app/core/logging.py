"""Structured JSON logging helpers with deterministic fields."""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

from app.core.event_ids import ALL_EVENT_IDS
from app.core.request_context import (
    get_request_id,
    get_rule_id,
    get_run_id,
    get_saved_search_id,
    get_worker_run_id,
)

DEFAULT_SERVICE_NAME = os.getenv("PATHOS_SERVICE_NAME", "pathos-backend")
DEFAULT_SERVICE_VERSION = os.getenv("PATHOS_VERSION", "0.1.0")
DEFAULT_ENVIRONMENT = os.getenv("PATHOS_ENV", "local")


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": DEFAULT_SERVICE_NAME,
            "version": DEFAULT_SERVICE_VERSION,
            "environment": DEFAULT_ENVIRONMENT,
        }
        extras = getattr(record, "json_extra", None)
        if isinstance(extras, dict):
            payload.update(extras)
        return json.dumps(payload, sort_keys=True)


def configure_logging(level_name: str) -> None:
    level = getattr(logging, level_name.upper(), logging.INFO)
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Teaching note:
    # Pytest injects an in-memory capture handler (LogCaptureHandler).
    # If we replace all handlers unconditionally, caplog-based regression
    # tests cannot observe structured records. We therefore preserve capture
    # handlers and replace only our own stdout JSON handler deterministically.
    preserved_handlers = [
        handler
        for handler in root_logger.handlers
        if handler.__class__.__name__ == "LogCaptureHandler"
    ]
    existing_json_handlers = [
        handler
        for handler in root_logger.handlers
        if getattr(handler, "name", "") == "pathos-json-stdout"
    ]
    for handler in existing_json_handlers:
        try:
            root_logger.removeHandler(handler)
        except ValueError:
            continue
    handler = logging.StreamHandler(sys.stdout)
    handler.name = "pathos-json-stdout"
    handler.setLevel(level)
    handler.setFormatter(JsonLogFormatter())
    root_logger.handlers = [*preserved_handlers, handler]


def log_event(
    logger: logging.Logger,
    *,
    level: int,
    event_id: str,
    message: str,
    details: dict[str, Any] | None = None,
    request_id: str | None = None,
    run_id: str | None = None,
    worker_run_id: str | None = None,
    rule_id: str | None = None,
    saved_search_id: str | None = None,
) -> None:
    if event_id not in ALL_EVENT_IDS:
        raise ValueError(f"Unknown event_id={event_id}")
    payload = {
        "event_id": event_id,
        "event": event_id,
        "message": message,
        "details": details or {},
        "request_id": request_id if request_id is not None else get_request_id(),
        "run_id": run_id if run_id is not None else get_run_id(),
        "worker_run_id": worker_run_id
        if worker_run_id is not None
        else get_worker_run_id(),
        "rule_id": rule_id if rule_id is not None else get_rule_id(),
        "saved_search_id": saved_search_id
        if saved_search_id is not None
        else get_saved_search_id(),
    }
    logger.log(level, message, extra={"json_extra": payload})
