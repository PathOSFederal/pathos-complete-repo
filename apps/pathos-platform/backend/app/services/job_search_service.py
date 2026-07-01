"""app.services.job_search_service

WHY THIS FILE EXISTS:
This service orchestrates deterministic federal job search flow:
request validation -> upstream adapter call -> schema validation -> normalized mapping -> response envelope.

LAYER FIT:
- Service/business orchestration layer.

WHAT THIS FILE MUST NOT DO:
- Must not define FastAPI routing.
- Must not leak raw USAJOBS response shape to API callers.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from datetime import datetime, timezone
from hashlib import sha256
import logging
import time
from typing import Any
from typing import Protocol
from uuid import uuid4

from app.adapters.usajobs.client import USAJobsClient
from app.adapters.usajobs.errors import (
    UpstreamAuthError,
    UpstreamConfigError,
    UpstreamRateLimitError,
    UpstreamResponseError,
    UpstreamUnavailableError,
)
from app.adapters.usajobs.models import USAJobsEnvelope
from app.adapters.usajobs.types import USAJobsSearchResponse
from app.adapters.usajobs.normalize import (
    USAJOBS_MAPPER_VERSION,
    NormalizedUSAJobsItem,
    normalize_search_items_with_warnings,
)
from app.core.config import (
    get_usajobs_cache_ttl_seconds,
    get_usajobs_api_key,
    get_usajobs_user_agent,
)
from app.core.logging import log_event
from app.db.repo.upstream_audit_repo import UpstreamAuditRepo
from app.models.job_search import JobSearchRequest, JobSearchResponse

logger = logging.getLogger("pathos.job_search")


class JobSearchUpstreamUnavailableError(Exception):
    """Raised when upstream is unavailable/timeouts and request should map to 503/504."""


class JobSearchConfigError(Exception):
    """Raised when USAJOBS API key or user agent is not configured; maps to 503."""


class JobSearchUpstreamAuthError(Exception):
    """Raised when upstream credentials are invalid and request should map to 502."""


class JobSearchUpstreamSchemaError(Exception):
    """Raised when upstream payload does not match expected response schema."""


class JobSearchRateLimitedError(Exception):
    """Raised when upstream responds with rate-limit status."""


class USAJobsSearchClient(Protocol):
    """Minimal official-API client seam used by tests and staging validation."""

    def search_jobs(self, query_params: dict[str, Any]) -> USAJobsSearchResponse:
        """Execute one official USAJOBS search request."""


@dataclass(frozen=True)
class JobSearchExecutionResult:
    """Full search execution output for bounded ingestion and audit use."""

    response: JobSearchResponse
    normalized_items: tuple[NormalizedUSAJobsItem, ...]
    query_fingerprint: str
    mapper_version: str
    source_name: str
    fetched_at: str
    upstream_audit_id: str | None
    upstream_raw_hash: str | None
    query_slice: dict[str, Any]


_CACHE: dict[str, tuple[float, JobSearchExecutionResult]] = {}


class JobSearchService:
    """Deterministic orchestrator for jobs search endpoint."""

    @staticmethod
    def usajobs_env_presence() -> dict[str, str]:
        """Return env presence flags without exposing any secret values."""

        api_key_present = bool((get_usajobs_api_key() or "").strip())
        user_agent_present = bool((get_usajobs_user_agent() or "").strip())
        return {
            "USAJOBS_API_KEY": "present" if api_key_present else "missing",
            "USAJOBS_USER_AGENT": "present" if user_agent_present else "missing",
        }

    @staticmethod
    def usajobs_configured() -> bool:
        """Return True when all required USAJOBS env vars are present."""

        env_presence = JobSearchService.usajobs_env_presence()
        return all(value == "present" for value in env_presence.values())

    @staticmethod
    def usajobs_log_env_presence() -> dict[str, str]:
        """Return log-safe env presence keys without sensitive-looking key names."""

        env_presence = JobSearchService.usajobs_env_presence()
        return {
            "usajobs_key": env_presence["USAJOBS_API_KEY"],
            "usajobs_user_agent": env_presence["USAJOBS_USER_AGENT"],
        }

    @staticmethod
    def clear_cache() -> None:
        """Clear in-memory cache (used by tests/app bootstrap isolation)."""

        _CACHE.clear()

    @staticmethod
    def _canonical_query_params(search: JobSearchRequest) -> dict[str, Any]:
        """Build deterministic USAJOBS query parameters from internal request.

        Inputs:
        - Validated `JobSearchRequest`.

        Outputs:
        - Dict ready for USAJOBS querystring.

        Deterministic assumptions:
        - Lists are sorted before joining to avoid order-sensitive query variance.
        - Whitespace trimming is applied consistently.
        """

        params: dict[str, Any] = {
            "Keyword": search.keyword.strip(),
            "Page": search.page,
            "ResultsPerPage": search.page_size,
        }
        if search.location:
            params["LocationName"] = search.location.strip()
        if search.remote_only is True:
            # USAJOBS remote fields are inconsistent; service still applies a post-filter.
            params["RemoteIndicator"] = "true"
        if search.grade_min is not None:
            params["MinGrade"] = search.grade_min
        if search.grade_max is not None:
            params["MaxGrade"] = search.grade_max
        if search.series:
            params["JobCategoryCode"] = ";".join(
                sorted({value.strip() for value in search.series if value.strip()})
            )
        if search.agency_codes:
            params["Organization"] = ";".join(
                sorted(
                    {value.strip() for value in search.agency_codes if value.strip()}
                )
            )
        if search.appointment_type:
            params["PositionOfferingTypeCode"] = search.appointment_type.strip()
        if search.work_schedule:
            params["WorkSchedule"] = search.work_schedule.strip()
        if search.salary_min is not None:
            params["MinimumSalary"] = search.salary_min
        if search.date_posted_days is not None:
            params["DatePosted"] = search.date_posted_days
        return params

    @staticmethod
    def _cache_key(search: JobSearchRequest) -> str:
        """Build stable cache key from canonical query params."""

        params = JobSearchService._canonical_query_params(search)
        return sha256(json.dumps(params, sort_keys=True).encode("utf-8")).hexdigest()

    @staticmethod
    def _record_upstream_audit(
        request_id: str,
        *,
        endpoint: str,
        query_hash: str,
        status_code: int,
        latency_ms: int,
        result_count: int,
        error_class: str | None,
        upstream_raw_payload: dict[str, Any] | None = None,
    ) -> dict[str, str | None]:
        """Persist deterministic upstream audit row without secrets.

        Inputs:
        - Request ID from middleware.
        - Summary metadata from adapter/service boundary.

        Outputs:
        - None.

        Deterministic assumptions:
        - Stores only hashed query identity, never raw query text.
        """

        return UpstreamAuditRepo.save_record(
            {
                "id": str(uuid4()),
                "request_id": request_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "endpoint": endpoint,
                # Intentionally store only hash for privacy and deterministic traceability.
                "query_hash": query_hash,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "result_count": result_count,
                "error_class": error_class,
                "upstream_raw_payload": upstream_raw_payload,
            }
        )

    @staticmethod
    def _record_upstream_audit_if_enabled(
        record_upstream_audit: bool,
        request_id: str,
        *,
        endpoint: str,
        query_hash: str,
        status_code: int,
        latency_ms: int,
        result_count: int,
        error_class: str | None,
        upstream_raw_payload: dict[str, Any] | None = None,
    ) -> dict[str, str | None] | None:
        """Write upstream audit only for mutating search paths.

        Day 47 hardens staging dry-run semantics: when
        `record_upstream_audit=False`, this service may still call the official
        USAJOBS API and normalize the response, but it must not initialize the
        database or write audit/snapshot rows on either success or failure.
        """

        if not record_upstream_audit:
            return None
        return JobSearchService._record_upstream_audit(
            request_id=request_id,
            endpoint=endpoint,
            query_hash=query_hash,
            status_code=status_code,
            latency_ms=latency_ms,
            result_count=result_count,
            error_class=error_class,
            upstream_raw_payload=upstream_raw_payload,
        )

    @staticmethod
    def _response_from_execution(
        execution: JobSearchExecutionResult,
    ) -> JobSearchResponse:
        return execution.response

    @staticmethod
    def execute_search(
        search: JobSearchRequest,
        request_id: str,
        client: USAJobsSearchClient | None = None,
        *,
        allow_cache: bool = True,
        record_upstream_audit: bool = True,
    ) -> JobSearchExecutionResult:
        """Perform deterministic job search and return audit/provenance metadata.

        The staging validation dry-run path sets `record_upstream_audit=False` so
        it can fetch, validate, and normalize official USAJOBS responses without
        mutating staging data. Normal API and worker paths keep the default audit
        write so raw source snapshots remain preserved for real ingestions.
        """

        env_presence = JobSearchService.usajobs_log_env_presence()
        if not JobSearchService.usajobs_configured():
            log_event(
                logger,
                level=logging.INFO,
                event_id="usajobs_config_missing",
                message="USAJOBS fetch is skipped because required environment variables are missing.",
                details={
                    "outcome": "skipped",
                    "env_presence": env_presence,
                    "duration_ms": 0,
                },
                request_id=request_id,
            )
            raise JobSearchConfigError(
                "USAJOBS fetch is disabled because required environment variables are missing."
            )

        adapter = client or USAJobsClient()
        query_params = JobSearchService._canonical_query_params(search)
        cache_key = JobSearchService._cache_key(search)
        ttl_seconds = get_usajobs_cache_ttl_seconds()
        now = time.monotonic()
        effective_allow_cache = allow_cache and record_upstream_audit
        if effective_allow_cache:
            cached = _CACHE.get(cache_key)
            if cached and cached[0] > now:
                return cached[1]

        upstream_audit_id: str | None = None
        upstream_raw_hash: str | None = None
        try:
            upstream = adapter.search_jobs(query_params=query_params)
            if record_upstream_audit:
                upstream_record = JobSearchService._record_upstream_audit(
                    request_id=request_id,
                    endpoint=upstream.audit.endpoint,
                    query_hash=upstream.audit.query_hash,
                    status_code=upstream.audit.status_code,
                    latency_ms=upstream.audit.latency_ms,
                    result_count=upstream.audit.result_count,
                    error_class=upstream.audit.error_class,
                    upstream_raw_payload=upstream.payload,
                )
                upstream_audit_id = upstream_record.get("id")
                upstream_raw_hash = upstream_record.get("upstream_raw_hash")
            else:
                payload_json = json.dumps(
                    upstream.payload,
                    sort_keys=True,
                    separators=(",", ":"),
                )
                upstream_raw_hash = sha256(payload_json.encode("utf-8")).hexdigest()
        except UpstreamRateLimitError as exc:
            JobSearchService._record_upstream_audit_if_enabled(
                record_upstream_audit,
                request_id=request_id,
                endpoint="/api/search",
                query_hash=cache_key,
                status_code=429,
                latency_ms=0,
                result_count=0,
                error_class=type(exc).__name__,
            )
            raise JobSearchRateLimitedError("USAJOBS rate limit exceeded") from exc
        except UpstreamConfigError as exc:
            log_event(
                logger,
                level=logging.INFO,
                event_id="usajobs_config_missing",
                message="USAJOBS fetch is skipped because adapter configuration is incomplete.",
                details={
                    "outcome": "skipped",
                    "env_presence": JobSearchService.usajobs_log_env_presence(),
                    "duration_ms": 0,
                },
                request_id=request_id,
            )
            raise JobSearchConfigError(
                "USAJOBS fetch is disabled because required environment variables are missing."
            ) from exc
        except UpstreamAuthError as exc:
            JobSearchService._record_upstream_audit_if_enabled(
                record_upstream_audit,
                request_id=request_id,
                endpoint="/api/search",
                query_hash=cache_key,
                status_code=403,
                latency_ms=0,
                result_count=0,
                error_class=type(exc).__name__,
            )
            raise JobSearchUpstreamAuthError("USAJOBS authentication failed") from exc
        except UpstreamUnavailableError as exc:
            JobSearchService._record_upstream_audit_if_enabled(
                record_upstream_audit,
                request_id=request_id,
                endpoint="/api/search",
                query_hash=cache_key,
                status_code=503,
                latency_ms=0,
                result_count=0,
                error_class=type(exc).__name__,
            )
            raise JobSearchUpstreamUnavailableError("USAJOBS is unavailable") from exc
        except UpstreamResponseError as exc:
            JobSearchService._record_upstream_audit_if_enabled(
                record_upstream_audit,
                request_id=request_id,
                endpoint="/api/search",
                query_hash=cache_key,
                status_code=502,
                latency_ms=0,
                result_count=0,
                error_class=type(exc).__name__,
            )
            raise JobSearchUpstreamSchemaError(str(exc)) from exc

        try:
            envelope = USAJobsEnvelope.model_validate(upstream.payload)
        except Exception as exc:  # noqa: BLE001 - mapped to controlled service error.
            raise JobSearchUpstreamSchemaError(
                "USAJOBS response schema validation failed"
            ) from exc

        retrieved_at = datetime.now(timezone.utc).isoformat()
        normalized_items = normalize_search_items_with_warnings(
            envelope.SearchResult.SearchResultItems,
            retrieved_at=retrieved_at,
        )
        if search.remote_only is True:
            normalized_items = [
                row
                for row in normalized_items
                if row.job.remote_status == "remote"
            ]

        total_raw = envelope.SearchResult.SearchResultCountAll
        if isinstance(total_raw, int):
            total = total_raw
        else:
            total = int(str(total_raw or "0"))

        if search.remote_only is True:
            total = len(normalized_items)

        response = JobSearchResponse(
            results=[row.job for row in normalized_items],
            total=total,
            page=search.page,
            page_size=search.page_size,
            request_id=request_id,
        )
        execution = JobSearchExecutionResult(
            response=response,
            normalized_items=tuple(normalized_items),
            query_fingerprint=cache_key,
            mapper_version=USAJOBS_MAPPER_VERSION,
            source_name="USAJOBS_OFFICIAL_API",
            fetched_at=retrieved_at,
            upstream_audit_id=upstream_audit_id,
            upstream_raw_hash=upstream_raw_hash,
            query_slice={
                "page": search.page,
                "page_size": search.page_size,
                "remote_only": bool(search.remote_only),
                "query_fingerprint": cache_key,
            },
        )
        if effective_allow_cache:
            _CACHE[cache_key] = (now + ttl_seconds, execution)
        return execution

    @staticmethod
    def search_jobs(
        search: JobSearchRequest,
        request_id: str,
        client: USAJobsSearchClient | None = None,
    ) -> JobSearchResponse:
        """Perform deterministic jobs search flow.

        Inputs:
        - `search`: validated internal request filters.
        - `request_id`: request trace identifier from middleware.
        - `client`: optional injected adapter client for tests.

        Outputs:
        - `JobSearchResponse` with normalized stable records.

        Error behavior:
        - Raises typed errors for API layer to map to ErrorResponse-compatible HTTP exceptions.
        """

        return JobSearchService._response_from_execution(
            JobSearchService.execute_search(
                search=search,
                request_id=request_id,
                client=client,
                allow_cache=True,
            )
        )

    @staticmethod
    def fingerprint_params(search: JobSearchRequest) -> str:
        """Build deterministic fingerprint for saved-search run comparisons."""

        params = JobSearchService._canonical_query_params(search)
        return sha256(json.dumps(params, sort_keys=True).encode("utf-8")).hexdigest()
