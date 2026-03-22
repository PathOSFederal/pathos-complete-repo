"""app.adapters.usajobs.errors

WHY THIS FILE EXISTS:
Defines explicit, typed adapter exceptions for USAJOBS integration failures.
Typed errors let the service layer map upstream failures to deterministic API responses.

LAYER FIT:
- Adapter integration layer only.

WHAT THIS FILE MUST NOT DO:
- Must not import FastAPI HTTPException types.
- Must not perform logging with secrets.
- Must not perform network calls.
"""

from __future__ import annotations


class UpstreamError(Exception):
    """Base class for controlled USAJOBS upstream failures."""


class UpstreamConfigError(UpstreamError):
    """Raised when USAJOBS API key or user agent is not configured (missing/blank)."""


class UpstreamAuthError(UpstreamError):
    """Raised when USAJOBS credentials are rejected (e.g. 401/403)."""


class UpstreamRateLimitError(UpstreamError):
    """Raised when USAJOBS returns HTTP 429."""


class UpstreamUnavailableError(UpstreamError):
    """Raised for timeout and transient transport/server failures."""


class UpstreamResponseError(UpstreamError):
    """Raised when USAJOBS returns malformed data or unsupported status."""

