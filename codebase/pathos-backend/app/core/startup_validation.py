"""Deterministic startup validation for API and worker runtimes."""

from __future__ import annotations

import logging
from typing import Literal

from app.core.config import (
    get_database_url,
    get_db_dialect,
    get_runtime_env,
    get_usajobs_api_key,
    get_usajobs_user_agent,
    get_worker_interval_seconds,
)
from app.core.logging import log_event

logger = logging.getLogger("pathos.startup")

StartupMode = Literal["api", "worker", "openapi"]
ALLOWED_RUNTIME_ENVS = {"local", "test", "ci", "staging", "production", "unknown", "dev"}


class StartupValidationError(RuntimeError):
    """Raised when deterministic startup configuration validation fails."""


def validate_startup_config(*, mode: StartupMode, emit_success_event: bool = True) -> None:
    missing_keys: list[str] = []
    invalid_keys: list[str] = []

    db_dialect = get_db_dialect()
    database_url = get_database_url()
    log_event(
        logger,
        level=logging.INFO,
        event_id="db_config_checked",
        message="Database configuration evaluated.",
        details={"db_dialect": db_dialect, "database_url_present": bool(database_url)},
    )

    runtime_env = get_runtime_env().strip().lower()
    if runtime_env not in ALLOWED_RUNTIME_ENVS:
        invalid_keys.append("PATHOS_ENV")

    if db_dialect not in {"sqlite", "postgres"}:
        invalid_keys.append("DB_DIALECT")

    if db_dialect == "postgres" and not database_url.strip():
        missing_keys.append("DATABASE_URL")

    if mode in {"api", "worker"}:
        if not get_usajobs_api_key().strip():
            missing_keys.append("USAJOBS_API_KEY")
        if not get_usajobs_user_agent().strip():
            missing_keys.append("USAJOBS_USER_AGENT")

    if mode == "worker" and get_worker_interval_seconds() < 1:
        invalid_keys.append("PATHOS_WORKER_INTERVAL_SECONDS")

    if missing_keys or invalid_keys:
        details = {"mode": mode, "missing_keys": sorted(missing_keys), "invalid_keys": sorted(invalid_keys)}
        log_event(
            logger,
            level=logging.ERROR,
            event_id="config_validation_failed",
            message="Startup configuration validation failed. Set the missing and invalid environment variables, then restart the process.",
            details=details,
        )
        raise StartupValidationError("Startup configuration validation failed.")

    if emit_success_event:
        log_event(
            logger,
            level=logging.INFO,
            event_id="config_validation_ok",
            message="Startup configuration validation passed. The process can continue with readiness checks.",
            details={"mode": mode, "runtime_env": runtime_env},
        )
