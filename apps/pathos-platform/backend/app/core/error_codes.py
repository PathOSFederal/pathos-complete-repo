"""Deterministic error-code taxonomy for canonical error envelopes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ErrorCategory = Literal["client_error", "server_error"]


@dataclass(frozen=True)
class ErrorSpec:
    code: str
    message: str
    category: ErrorCategory


ERROR_SPECS: dict[str, ErrorSpec] = {
    "VALIDATION_ERROR": ErrorSpec(
        code="VALIDATION_ERROR",
        message="Request payload validation failed. Correct the payload fields and try again.",
        category="client_error",
    ),
    "SAVED_SEARCH_NOT_FOUND": ErrorSpec(
        code="SAVED_SEARCH_NOT_FOUND",
        message="The requested saved search was not found.",
        category="client_error",
    ),
    "ALERT_RULE_NOT_FOUND": ErrorSpec(
        code="ALERT_RULE_NOT_FOUND",
        message="The requested alert rule was not found.",
        category="client_error",
    ),
    "METHOD_NOT_ALLOWED": ErrorSpec(
        code="METHOD_NOT_ALLOWED",
        message="The HTTP method is not allowed for this route.",
        category="client_error",
    ),
    "MIGRATION_REQUIRED": ErrorSpec(
        code="MIGRATION_REQUIRED",
        message="Database migrations must be applied before serving requests.",
        category="server_error",
    ),
    "CONFIG_VALIDATION_FAILED": ErrorSpec(
        code="CONFIG_VALIDATION_FAILED",
        message="Runtime configuration validation failed at startup checks.",
        category="server_error",
    ),
    "FEATURE_NOT_READY": ErrorSpec(
        code="FEATURE_NOT_READY",
        message="This runtime surface is intentionally disabled until production-ready behavior exists.",
        category="server_error",
    ),
    "DATABASE_UNAVAILABLE": ErrorSpec(
        code="DATABASE_UNAVAILABLE",
        message="Database is not reachable for readiness checks.",
        category="server_error",
    ),
    "INTERNAL_SERVER_ERROR": ErrorSpec(
        code="INTERNAL_SERVER_ERROR",
        message="The server encountered an internal error while handling the request.",
        category="server_error",
    ),
    "BAD_REQUEST": ErrorSpec(
        code="BAD_REQUEST",
        message="The request could not be processed because input was invalid.",
        category="client_error",
    ),
    "UNAUTHORIZED": ErrorSpec(
        code="UNAUTHORIZED",
        message="Authentication is required to access this resource.",
        category="client_error",
    ),
    "FORBIDDEN": ErrorSpec(
        code="FORBIDDEN",
        message="Access to this resource is forbidden for the provided credentials.",
        category="client_error",
    ),
    "NOT_FOUND": ErrorSpec(
        code="NOT_FOUND",
        message="The requested resource was not found.",
        category="client_error",
    ),
    "RATE_LIMITED": ErrorSpec(
        code="RATE_LIMITED",
        message="Rate limit exceeded. Wait and retry within allowed request volume.",
        category="client_error",
    ),
    "SERVICE_UNAVAILABLE": ErrorSpec(
        code="SERVICE_UNAVAILABLE",
        message="The service is temporarily unavailable. Retry after a short delay.",
        category="server_error",
    ),
    "UPSTREAM_BAD_RESPONSE": ErrorSpec(
        code="UPSTREAM_BAD_RESPONSE",
        message="An upstream dependency returned an invalid response.",
        category="server_error",
    ),
}

STATUS_DEFAULT_CODE: dict[int, str] = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_SERVER_ERROR",
    502: "UPSTREAM_BAD_RESPONSE",
    503: "SERVICE_UNAVAILABLE",
}


def category_for_status(status_code: int) -> ErrorCategory:
    if status_code >= 500:
        return "server_error"
    return "client_error"


def resolve_error_code(status_code: int, explicit_code: str | None = None) -> str:
    if explicit_code and explicit_code in ERROR_SPECS:
        return explicit_code
    if status_code in STATUS_DEFAULT_CODE:
        return STATUS_DEFAULT_CODE[status_code]
    if status_code >= 500:
        return "INTERNAL_SERVER_ERROR"
    return "BAD_REQUEST"


def resolve_error_spec(status_code: int, explicit_code: str | None = None) -> ErrorSpec:
    code = resolve_error_code(status_code=status_code, explicit_code=explicit_code)
    return ERROR_SPECS[code]
