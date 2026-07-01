"""app.models.job_search

WHY THIS FILE EXISTS:
This module defines the internal, stable API contract for federal job search requests and responses.
We intentionally own these models so API callers do not depend on raw USAJOBS payload structure.

LAYER FIT:
- Model layer only (Pydantic validation and shape contracts).
- Used by API/router (request validation), service orchestration, and mapping output.

WHAT THIS FILE MUST NOT DO:
- Must not perform HTTP calls.
- Must not perform database persistence.
- Must not import FastAPI router/runtime objects.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from app.domain.jobs.canonical_models import CanonicalJob


class JobSearchRequest(BaseModel):
    """Validated search filters for deterministic USAJOBS query building.

    Inputs:
    - Search keyword plus optional filters.

    Outputs:
    - Pydantic-normalized object with bounded fields.

    Deterministic assumptions:
    - Pagination is always explicit (`page`, `page_size`) to keep result windows predictable.
    - Grade range validation is stable and order-sensitive.

    Error behavior:
    - Raises validation errors for empty/oversized inputs or invalid grade range.
    """

    keyword: str = Field(min_length=1, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    remote_only: bool | None = None
    grade_min: int | None = Field(default=None, ge=1, le=15)
    grade_max: int | None = Field(default=None, ge=1, le=15)
    series: list[str] | None = Field(default=None, max_length=25)
    agency_codes: list[str] | None = Field(default=None, max_length=25)
    appointment_type: str | None = Field(default=None, max_length=30)
    work_schedule: str | None = Field(default=None, max_length=30)
    salary_min: int | None = Field(default=None, ge=0)
    date_posted_days: int | None = Field(default=None, ge=1, le=30)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @model_validator(mode="after")
    def validate_grade_range(self) -> "JobSearchRequest":
        """Enforce deterministic grade range constraints.

        Inputs:
        - `grade_min` and `grade_max` values.

        Outputs:
        - The same object when valid.

        Error behavior:
        - Raises ValueError when min exceeds max.
        """

        if self.grade_min is not None and self.grade_max is not None and self.grade_min > self.grade_max:
            raise ValueError("grade_min must be less than or equal to grade_max")
        return self


class JobSearchResponse(BaseModel):
    """Top-level API response for `/jobs/search`.

    Inputs:
    - Normalized results and metadata from service orchestration.

    Outputs:
    - Deterministic response envelope used by clients.
    """

    results: list[CanonicalJob]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    request_id: str = Field(min_length=1)
