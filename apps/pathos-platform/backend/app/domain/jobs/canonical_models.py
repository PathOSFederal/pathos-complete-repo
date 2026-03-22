"""app.domain.jobs.canonical_models

WHY THIS FILE EXISTS:
Defines the canonical, backend-owned job representation emitted by `/api/v1/jobs/search`.
Owning this model ensures API responses are normalized and never leak upstream USAJOBS shape.

LAYER FIT:
- Domain model layer.

WHAT THIS FILE MUST NOT DO:
- Must not perform network calls.
- Must not perform persistence.
- Must not import FastAPI runtime objects.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CanonicalCompensation(BaseModel):
    """Normalized grade/pay values for one canonical job."""

    grade_min: int | None = Field(default=None, ge=1, le=15)
    grade_max: int | None = Field(default=None, ge=1, le=15)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)


class CanonicalSourceMetadata(BaseModel):
    """Stable source metadata for traceability and deterministic auditing."""

    source: str = "USAJOBS"
    retrieved_at: str = Field(min_length=1)
    mapper_version: str | None = None


class CanonicalJob(BaseModel):
    """Canonical job entity returned from job-search APIs."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    organization: str = Field(min_length=1)
    locations: list[str] = Field(default_factory=list)
    compensation: CanonicalCompensation
    open_date: str | None = None
    close_date: str | None = None
    apply_url: str = Field(min_length=1)
    source: CanonicalSourceMetadata
