from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.contracts.error_contract import ErrorBody, ErrorCorrelation, ErrorResponse
from app.core.error_codes import category_for_status, resolve_error_spec
from app.core.logging import log_event
from app.core.request_context import (
    get_request_id,
    get_rule_id,
    get_run_id,
    get_saved_search_id,
    set_request_id,
)
from app.db.migration_safety import MigrationSafetyError

logger = logging.getLogger("pathos.error")


def _get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None) or get_request_id()
    if request_id:
        set_request_id(str(request_id))
        return str(request_id)
    generated = str(uuid4())
    request.state.request_id = generated
    set_request_id(generated)
    return generated


def _extract_explicit_code(detail: object) -> str | None:
    if isinstance(detail, dict):
        raw_code = detail.get("code")
        if isinstance(raw_code, str):
            return raw_code.strip().upper()
    return None


def build_canonical_error_response(*, status_code: int, request_id: str, explicit_code: str | None = None) -> JSONResponse:
    spec = resolve_error_spec(status_code=status_code, explicit_code=explicit_code)
    payload = ErrorResponse(
        error=ErrorBody(
            code=spec.code,
            message=spec.message,
            category=category_for_status(status_code),
            correlation=ErrorCorrelation(
                request_id=request_id,
                run_id=get_run_id(),
                rule_id=get_rule_id(),
                saved_search_id=get_saved_search_id(),
            ),
        )
    )
    response = JSONResponse(status_code=status_code, content=payload.model_dump(mode="json"))
    response.headers["X-Request-ID"] = request_id
    return response


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # FastAPI and Starlette exceptions share status_code/detail fields.
        status_code = int(getattr(exc, "status_code", 500))
        detail = getattr(exc, "detail", None)
        request_id = _get_request_id(request)
        explicit_code = _extract_explicit_code(detail)
        log_event(
            logger,
            level=logging.WARNING if status_code < 500 else logging.ERROR,
            event_id="http_exception",
            message="The request failed with a controlled HTTP error response. Use the error code and request correlation values for deterministic diagnosis.",
            details={"status_code": status_code, "path": request.url.path, "category": category_for_status(status_code)},
            request_id=request_id,
        )
        return build_canonical_error_response(
            status_code=status_code,
            request_id=request_id,
            explicit_code=explicit_code,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = _get_request_id(request)
        log_event(
            logger,
            level=logging.WARNING,
            event_id="validation_exception",
            message="The request payload did not satisfy schema validation rules. Review the API contract and submit corrected fields.",
            details={"path": request.url.path, "error_count": len(exc.errors()), "category": "client_error"},
            request_id=request_id,
        )
        return build_canonical_error_response(
            status_code=422,
            request_id=request_id,
            explicit_code="VALIDATION_ERROR",
        )

    @app.exception_handler(MigrationSafetyError)
    async def migration_exception_handler(request: Request, exc: MigrationSafetyError) -> JSONResponse:
        del exc
        request_id = _get_request_id(request)
        log_event(
            logger,
            level=logging.ERROR,
            event_id="migration_safety_exception",
            message="The request cannot be served because required database migrations are missing. Apply migrations and restart the service.",
            details={"path": request.url.path, "category": "server_error"},
            request_id=request_id,
        )
        return build_canonical_error_response(
            status_code=503,
            request_id=request_id,
            explicit_code="MIGRATION_REQUIRED",
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = _get_request_id(request)
        log_event(
            logger,
            level=logging.ERROR,
            event_id="unhandled_exception",
            message="The request failed due to an unhandled server error. Use correlation identifiers and logs to diagnose root cause safely.",
            details={"path": request.url.path, "exception_type": type(exc).__name__, "category": "server_error"},
            request_id=request_id,
        )
        return build_canonical_error_response(
            status_code=500,
            request_id=request_id,
            explicit_code="INTERNAL_SERVER_ERROR",
        )
