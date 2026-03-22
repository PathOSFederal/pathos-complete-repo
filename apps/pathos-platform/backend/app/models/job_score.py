"""app.models.job_score

Deterministic scoring and explainability contracts for canonical jobs.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.models.job_search import JobSearchRequest


class PreferredGrades(BaseModel):
    min: int | None = Field(default=None, ge=1, le=15)
    max: int | None = Field(default=None, ge=1, le=15)

    @model_validator(mode="after")
    def validate_range(self) -> "PreferredGrades":
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("preferred_grades.min must be less than or equal to preferred_grades.max")
        return self


class JobScoringProfileV1(BaseModel):
    preferred_series: list[str] = Field(default_factory=list, max_length=50)
    preferred_grades: PreferredGrades | None = None
    preferred_locations: list[str] = Field(default_factory=list, max_length=50)
    remote_preference: Literal["no_preference", "remote_only", "onsite_only"] | bool = "no_preference"
    relocation_radius_miles: int | None = Field(default=None, ge=0, le=10000)
    keywords: list[str] = Field(default_factory=list, max_length=100)

    @staticmethod
    def _canonical(values: list[str]) -> list[str]:
        return sorted({value.strip() for value in values if value.strip()})

    @model_validator(mode="after")
    def normalize_lists(self) -> "JobScoringProfileV1":
        self.preferred_series = self._canonical(self.preferred_series)
        self.preferred_locations = self._canonical(self.preferred_locations)
        self.keywords = self._canonical(self.keywords)
        return self


class JobScoreBreakdown(BaseModel):
    series_alignment: int = Field(ge=0, le=100)
    grade_alignment: int = Field(ge=0, le=100)
    location_alignment: int = Field(ge=0, le=100)
    remote_alignment: int = Field(ge=0, le=100)
    keyword_alignment: int = Field(ge=0, le=100)


class JobScoreReason(BaseModel):
    code: str = Field(min_length=1)
    message: str = Field(min_length=1)


class JobScoreRisk(BaseModel):
    code: str = Field(min_length=1)
    message: str = Field(min_length=1)


class JobScoreResult(BaseModel):
    final_score: int = Field(ge=0, le=100)
    confidence_band: Literal["Low", "Medium", "High"]
    reasons: list[JobScoreReason] = Field(default_factory=list)
    risks: list[JobScoreRisk] = Field(default_factory=list)
    breakdown: JobScoreBreakdown
    ruleset_version: str = Field(min_length=1)
    mapper_version: str | None = None
    computed_at: datetime


class JobScoreRequest(BaseModel):
    search: JobSearchRequest
    profile: JobScoringProfileV1 = Field(default_factory=JobScoringProfileV1)
