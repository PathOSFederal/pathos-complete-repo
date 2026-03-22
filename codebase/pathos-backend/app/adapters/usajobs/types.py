"""app.adapters.usajobs.types

WHY THIS FILE EXISTS:
Provides small typed transport objects shared between USAJOBS adapter and services.
This keeps service logic deterministic without depending on raw httpx response objects.

LAYER FIT:
- Adapter boundary typing layer.

WHAT THIS FILE MUST NOT DO:
- Must not perform IO.
- Must not depend on FastAPI request/response objects.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class UpstreamAuditSummary:
    """Audit-safe metadata captured for each upstream request attempt."""

    endpoint: str
    query_hash: str
    status_code: int
    latency_ms: int
    result_count: int
    error_class: str | None


@dataclass(frozen=True)
class USAJobsSearchResponse:
    """Adapter return object containing parsed JSON and audit summary."""

    payload: dict[str, Any]
    audit: UpstreamAuditSummary

