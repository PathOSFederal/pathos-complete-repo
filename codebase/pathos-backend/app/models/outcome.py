from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class DomainOutcome(str, Enum):
    SUCCESS = "success"
    SKIPPED = "skipped"
    EMPTY = "empty"
    ERROR = "error"


class SkipReason(str, Enum):
    USJOBS_NOT_CONFIGURED = "USJOBS_NOT_CONFIGURED"
    MIN_INTERVAL = "MIN_INTERVAL"
    LOCKED = "LOCKED"
    BACKOFF = "BACKOFF"
    DISABLED = "DISABLED"
    UNKNOWN = "UNKNOWN"


class EmptyReason(str, Enum):
    UPSTREAM_ZERO_RESULTS = "UPSTREAM_ZERO_RESULTS"
    FILTERED_TO_ZERO = "FILTERED_TO_ZERO"
    NORMALIZED_TO_ZERO = "NORMALIZED_TO_ZERO"
    UNKNOWN = "UNKNOWN"


class BackoffEvent(BaseModel):
    code: str = Field(min_length=1)
    message: str = Field(min_length=1)
    detail: str | None = None
