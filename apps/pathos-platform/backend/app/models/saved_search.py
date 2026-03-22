"""app.models.saved_search

WHY THIS FILE EXISTS:
Defines public contracts for saved search CRUD and deterministic filter canonicalization payloads.

LAYER FIT:
- Model/validation layer.

WHAT THIS FILE MUST NOT DO:
- Must not perform IO or database writes.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.job_score import JobScoringProfileV1
from app.models.job_search import JobSearchRequest


class SavedSearchCreateRequest(BaseModel):
    """Create payload for deterministic saved search rows."""

    name: str = Field(min_length=1, max_length=120)
    query: JobSearchRequest | None = None
    profile: JobScoringProfileV1 | None = None
    ruleset_version: str = Field(default="job-scoring-v1", min_length=1, max_length=80)
    filters: JobSearchRequest | None = None

    @model_validator(mode="after")
    def validate_query_alias(self) -> "SavedSearchCreateRequest":
        if self.query is None and self.filters is None:
            raise ValueError("query is required")
        if self.query is None:
            self.query = self.filters
        return self


class SavedSearchUpdateRequest(BaseModel):
    """Update payload for saved search rows."""

    name: str = Field(min_length=1, max_length=120)
    query: JobSearchRequest | None = None
    profile: JobScoringProfileV1 | None = None
    ruleset_version: str = Field(default="job-scoring-v1", min_length=1, max_length=80)
    filters: JobSearchRequest | None = None

    @model_validator(mode="after")
    def validate_query_alias(self) -> "SavedSearchUpdateRequest":
        if self.query is None and self.filters is None:
            raise ValueError("query is required")
        if self.query is None:
            self.query = self.filters
        return self


class SavedSearchOut(BaseModel):
    """API output contract for saved searches."""

    id: str
    name: str
    query_payload: dict
    profile_payload: dict | None = None
    ruleset_version: str
    filters_json: dict
    is_enabled: bool = True
    last_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
