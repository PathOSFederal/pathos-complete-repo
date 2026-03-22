"""app.models.profile_v1

WHY THIS FILE EXISTS:
Defines job seeker profile API contract with canonicalized preference fields.

LAYER FIT:
- Model/validation layer.

WHAT THIS FILE MUST NOT DO:
- Must not perform heuristic side effects beyond basic validation.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class ProfileUpdateRequest(BaseModel):
    """Profile update payload with bounded preference fields."""

    persona: str = Field(default="job_seeker", min_length=1, max_length=40)
    target_series: list[str] = Field(default_factory=list, max_length=50)
    grade_min: int | None = Field(default=None, ge=1, le=15)
    grade_max: int | None = Field(default=None, ge=1, le=15)
    target_locations: list[str] = Field(default_factory=list, max_length=50)
    remote_preference: str | None = Field(default=None, max_length=40)
    skills_keywords: list[str] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def validate_grade_range(self) -> "ProfileUpdateRequest":
        """Keep grade range deterministic and valid."""

        if self.grade_min is not None and self.grade_max is not None and self.grade_min > self.grade_max:
            raise ValueError("grade_min must be less than or equal to grade_max")
        return self


class ProfileOut(BaseModel):
    """Stable profile response contract."""

    id: str
    persona: str
    target_series: list[str]
    grade_min: int | None = None
    grade_max: int | None = None
    target_locations: list[str]
    remote_preference: str | None = None
    skills_keywords: list[str]
    created_at: datetime
    updated_at: datetime
