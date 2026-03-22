from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import Request

from app.core.logging import log_event
from app.core.request_context import clear_context, set_request_id

logger = logging.getLogger("pathos.request")


def _classify_status(status_code: int) -> tuple[int, str, str, str]:
    if 200 <= status_code < 300:
        return (
            logging.INFO,
            "Request completed (HTTP {status_code}).",
            "success",
            "2xx",
        )
    if 300 <= status_code < 400:
        return (
            logging.INFO,
            "Request redirected (HTTP {status_code}).",
            "redirect",
            "3xx",
        )
    if 400 <= status_code < 500:
        return (
            logging.WARNING,
            "Client request rejected (HTTP {status_code}).",
            "client_error",
            "4xx",
        )
    return (
        logging.ERROR,
        "Server error (HTTP {status_code}).",
        "server_error",
        "5xx",
    )


async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = request_id
    set_request_id(request_id)
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        clear_context()
        raise

    duration_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    status_code = response.status_code
    log_level, message_template, http_outcome, status_family = _classify_status(status_code)
    completion_message = message_template.format(status_code=status_code)
    response_bytes_header = response.headers.get("content-length")
    response_bytes = int(response_bytes_header) if response_bytes_header and response_bytes_header.isdigit() else None
    details = {
        "method": request.method,
        "path": request.url.path,
        "status_code": status_code,
        "status_family": status_family,
        "http_outcome": http_outcome,
        "duration_ms": round(duration_ms, 2),
    }
    if response_bytes is not None:
        details["response_bytes"] = response_bytes
    domain_outcome = getattr(request.state, "domain_outcome", None)
    if domain_outcome is not None:
        details["domain_outcome"] = domain_outcome
    skip_reason = getattr(request.state, "skip_reason", None)
    if skip_reason is not None:
        details["skip_reason"] = skip_reason
    empty_reason = getattr(request.state, "empty_reason", None)
    if empty_reason is not None:
        details["empty_reason"] = empty_reason
    run_id = getattr(request.state, "run_id", None)
    saved_search_id = getattr(request.state, "saved_search_id", None)
    log_event(
        logger,
        level=log_level,
        event_id="request_complete",
        message=completion_message,
        details=details,
        request_id=request_id,
        run_id=run_id,
        saved_search_id=saved_search_id,
    )
    clear_context()
    return response
