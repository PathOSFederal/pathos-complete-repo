"""app.adapters.usajobs.client

WHY THIS FILE EXISTS:
This module encapsulates all outbound calls to the official USAJOBS API.
It keeps external integration concerns isolated and fully mockable for tests.

LAYER FIT:
- Adapter/integration layer only.

WHAT THIS FILE MUST NOT DO:
- Must not contain business orchestration logic.
- Must not write directly to databases.
- Must not expose secrets in exceptions/log payloads.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any
from urllib.parse import urlparse

import httpx

from app.adapters.usajobs.errors import (
    UpstreamAuthError,
    UpstreamConfigError,
    UpstreamRateLimitError,
    UpstreamResponseError,
    UpstreamUnavailableError,
)
from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.core.config import (
    get_usajobs_api_base_url,
    get_usajobs_api_key,
    get_usajobs_timeout_seconds,
    get_usajobs_user_agent,
    refresh_settings,
)
from app.core.logging import log_event

logger = logging.getLogger(__name__)


class USAJobsClient:
    """HTTP client wrapper for official USAJOBS search endpoint."""

    def __init__(self, timeout_seconds: float | None = None) -> None:
        refresh_settings()
        self._base_url = (get_usajobs_api_base_url() or "").strip().rstrip("/")
        self._api_key = (get_usajobs_api_key() or "").strip()
        self._user_agent = (get_usajobs_user_agent() or "").strip()
        self._timeout_seconds = timeout_seconds if timeout_seconds is not None else get_usajobs_timeout_seconds()

    def search_jobs(self, query_params: dict[str, Any]) -> USAJobsSearchResponse:
        """Execute deterministic USAJOBS search and capture audit-safe metadata.

        Inputs:
        - `query_params`: already-normalized upstream query params.

        Outputs:
        - Parsed JSON dict and audit payload.

        Error behavior:
        - Raises typed exceptions for 401/403/timeouts/invalid JSON.
        """

        if not self._api_key:
            raise UpstreamConfigError("USAJOBS API key not configured")
        if not self._user_agent:
            raise UpstreamConfigError("USAJOBS user agent not configured")

        endpoint = "/api/search"
        base = self._base_url or "https://data.usajobs.gov"
        url = f"{base.rstrip('/')}{endpoint}"
        host = (urlparse(url).netloc or "data.usajobs.gov").strip()
        headers = {
            "Host": host,
            "User-Agent": self._user_agent,
            "Authorization-Key": self._api_key,
        }
        log_event(
            logger,
            level=logging.INFO,
            event_id="usajobs_request_start",
            message="The adapter is sending a deterministic USAJOBS search request through the backend integration path.",
            details={"endpoint": endpoint, "query_keys": sorted(str(key) for key in query_params.keys())},
        )

        started = time.perf_counter()
        try:
            with httpx.Client(timeout=self._timeout_seconds) as client:
                response = client.get(url, headers=headers, params=query_params)
        except httpx.TimeoutException as exc:
            raise UpstreamUnavailableError("USAJOBS request timed out") from exc
        except httpx.RequestError as exc:
            raise UpstreamUnavailableError("USAJOBS request failed") from exc

        duration_ms = int((time.perf_counter() - started) * 1000)
        query_hash = hashlib.sha256(json.dumps(query_params, sort_keys=True).encode("utf-8")).hexdigest()
        result_count = 0

        if response.status_code == 429:
            raise UpstreamRateLimitError("USAJOBS rate limit exceeded")
        if response.status_code in {401, 403}:
            raise UpstreamAuthError("USAJOBS credentials rejected")
        if response.status_code >= 500:
            raise UpstreamUnavailableError("USAJOBS returned server error")
        if response.status_code >= 400:
            raise UpstreamResponseError(f"USAJOBS returned status {response.status_code}")

        try:
            parsed = response.json()
        except json.JSONDecodeError as exc:
            raise UpstreamResponseError("USAJOBS returned invalid JSON") from exc

        items = parsed.get("SearchResult", {}).get("SearchResultItems")
        if isinstance(items, list):
            result_count = len(items)

        log_event(
            logger,
            level=logging.INFO,
            event_id="usajobs_request_complete",
            message="The upstream search response was accepted and normalized input can proceed to canonical mapping.",
            details={"status_code": response.status_code, "result_count": result_count, "latency_ms": duration_ms},
        )
        return USAJobsSearchResponse(
            payload=parsed,
            audit=UpstreamAuditSummary(
                endpoint=endpoint,
                query_hash=query_hash,
                status_code=response.status_code,
                latency_ms=duration_ms,
                result_count=result_count,
                error_class=None,
            ),
        )
