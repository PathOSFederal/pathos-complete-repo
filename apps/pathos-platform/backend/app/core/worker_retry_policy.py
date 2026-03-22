"""Deterministic retry/backoff policy for worker operations."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WorkerRetryPolicy:
    """Stable retry configuration with bounded exponential backoff."""

    max_attempts: int = 3
    base_backoff_seconds: float = 1.0
    max_backoff_seconds: float = 8.0

    def __post_init__(self) -> None:
        object.__setattr__(self, "max_attempts", max(1, int(self.max_attempts)))
        object.__setattr__(
            self, "base_backoff_seconds", max(0.0, float(self.base_backoff_seconds))
        )
        object.__setattr__(
            self,
            "max_backoff_seconds",
            max(self.base_backoff_seconds, float(self.max_backoff_seconds)),
        )

    def backoff_seconds_for_attempt(self, attempt: int) -> float:
        """Return delay after a failed attempt number (1-indexed)."""
        bounded_attempt = max(1, attempt)
        raw_delay = self.base_backoff_seconds * (2 ** (bounded_attempt - 1))
        return min(raw_delay, self.max_backoff_seconds)


def default_worker_retry_policy() -> WorkerRetryPolicy:
    return WorkerRetryPolicy()
