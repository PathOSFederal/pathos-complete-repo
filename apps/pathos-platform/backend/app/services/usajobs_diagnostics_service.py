"""Deterministic USAJOBS diagnostics probe with safe, non-secret reporting."""

from __future__ import annotations

import logging
import time

from app.adapters.usajobs.client import USAJobsClient
from app.adapters.usajobs.errors import (
    UpstreamAuthError,
    UpstreamConfigError,
    UpstreamRateLimitError,
    UpstreamResponseError,
    UpstreamUnavailableError,
)
from app.core.logging import log_event
from app.models.diagnostics import DiagnosticsErrorOut, EnvPresenceOut, USAJobsDiagnosticsOut
from app.models.outcome import DomainOutcome, EmptyReason, SkipReason
from app.services.job_search_service import JobSearchService

logger = logging.getLogger("pathos.diagnostics")


class USAJobsDiagnosticsService:
    @staticmethod
    def get_status(*, request_id: str) -> USAJobsDiagnosticsOut:
        env_presence = JobSearchService.usajobs_env_presence()
        log_env_presence = JobSearchService.usajobs_log_env_presence()
        configured = JobSearchService.usajobs_configured()
        env_model = EnvPresenceOut(**env_presence)

        if not configured:
            log_event(
                logger,
                level=logging.INFO,
                event_id="usajobs_config_missing",
                message="USAJOBS diagnostics found missing required environment variables.",
                details={
                    "outcome": "skipped",
                    "env_presence": log_env_presence,
                    "duration_ms": 0,
                },
                request_id=request_id,
            )
            return USAJobsDiagnosticsOut(
                configured=False,
                env=env_model,
                can_query=False,
                sample_count=0,
                duration_ms=0,
                domain_outcome=DomainOutcome.SKIPPED,
                skip_reason=SkipReason.USJOBS_NOT_CONFIGURED,
                error=DiagnosticsErrorOut(
                    code="USJOBS_NOT_CONFIGURED",
                    message="USAJOBS fetch is disabled because required environment variables are missing.",
                ),
            )

        started = time.perf_counter()
        log_event(
            logger,
            level=logging.INFO,
            event_id="usajobs_diagnostics_test_started",
            message="USAJOBS diagnostics test query started.",
            details={"outcome": "started", "env_presence": log_env_presence},
            request_id=request_id,
        )
        try:
            # Teaching note:
            # Keep this probe tiny and deterministic so we verify connectivity/config
            # without pulling large result sets.
            upstream = USAJobsClient(timeout_seconds=5.0).search_jobs(
                query_params={"Keyword": "analyst", "Page": 1, "ResultsPerPage": 1}
            )
            duration_ms = int((time.perf_counter() - started) * 1000)
            sample_count = int(upstream.audit.result_count)
            log_event(
                logger,
                level=logging.INFO,
                event_id="usajobs_diagnostics_test_completed",
                message="USAJOBS diagnostics test query completed successfully.",
                details={
                    "outcome": "empty" if sample_count == 0 else "success",
                    "duration_ms": duration_ms,
                    "sample_count": sample_count,
                    "env_presence": log_env_presence,
                },
                request_id=request_id,
            )
            return USAJobsDiagnosticsOut(
                configured=True,
                env=env_model,
                can_query=True,
                sample_count=sample_count,
                duration_ms=duration_ms,
                domain_outcome=DomainOutcome.EMPTY if sample_count == 0 else DomainOutcome.SUCCESS,
                empty_reason=EmptyReason.UPSTREAM_ZERO_RESULTS if sample_count == 0 else None,
                error=None,
            )
        except UpstreamConfigError:
            return USAJobsDiagnosticsService._failed(
                request_id=request_id,
                env_presence=env_presence,
                log_env_presence=log_env_presence,
                started=started,
                code="USJOBS_NOT_CONFIGURED",
                message="USAJOBS fetch is disabled because required environment variables are missing.",
            )
        except UpstreamAuthError:
            return USAJobsDiagnosticsService._failed(
                request_id=request_id,
                env_presence=env_presence,
                log_env_presence=log_env_presence,
                started=started,
                code="USJOBS_AUTH_FAILED",
                message="USAJOBS credentials were rejected by upstream.",
            )
        except UpstreamRateLimitError:
            return USAJobsDiagnosticsService._failed(
                request_id=request_id,
                env_presence=env_presence,
                log_env_presence=log_env_presence,
                started=started,
                code="USJOBS_RATE_LIMITED",
                message="USAJOBS request was rate-limited.",
            )
        except UpstreamUnavailableError:
            return USAJobsDiagnosticsService._failed(
                request_id=request_id,
                env_presence=env_presence,
                log_env_presence=log_env_presence,
                started=started,
                code="USJOBS_UNAVAILABLE",
                message="USAJOBS upstream is unavailable.",
            )
        except UpstreamResponseError:
            return USAJobsDiagnosticsService._failed(
                request_id=request_id,
                env_presence=env_presence,
                log_env_presence=log_env_presence,
                started=started,
                code="USJOBS_BAD_RESPONSE",
                message="USAJOBS returned an unexpected response.",
            )

    @staticmethod
    def _failed(
        *,
        request_id: str,
        env_presence: dict[str, str],
        log_env_presence: dict[str, str],
        started: float,
        code: str,
        message: str,
    ) -> USAJobsDiagnosticsOut:
        duration_ms = int((time.perf_counter() - started) * 1000)
        log_event(
            logger,
            level=logging.INFO,
            event_id="usajobs_diagnostics_test_failed",
            message="USAJOBS diagnostics test query failed.",
            details={
                "outcome": "error",
                "duration_ms": duration_ms,
                "error_code": code,
                "env_presence": log_env_presence,
            },
            request_id=request_id,
        )
        return USAJobsDiagnosticsOut(
            configured=False if code == "USJOBS_NOT_CONFIGURED" else True,
            env=EnvPresenceOut(**env_presence),
            can_query=False,
            sample_count=0,
            duration_ms=duration_ms,
            domain_outcome=DomainOutcome.ERROR if code != "USJOBS_NOT_CONFIGURED" else DomainOutcome.SKIPPED,
            skip_reason=SkipReason.USJOBS_NOT_CONFIGURED if code == "USJOBS_NOT_CONFIGURED" else None,
            error=DiagnosticsErrorOut(code=code, message=message),
        )
