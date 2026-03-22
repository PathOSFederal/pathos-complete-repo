"""Versioned deterministic scoring ruleset for canonical jobs."""

from __future__ import annotations

from pydantic import BaseModel, Field


class JobScoringRuleset(BaseModel):
    version: str = Field(min_length=1)
    confidence_high_threshold: int = Field(ge=0, le=100)
    confidence_medium_threshold: int = Field(ge=0, le=100)
    weights: dict[str, int]


DEFAULT_JOB_SCORING_RULESET = JobScoringRuleset(
    version="job-scoring-v1",
    confidence_high_threshold=75,
    confidence_medium_threshold=45,
    weights={
        "series_alignment": 10,
        "grade_alignment": 30,
        "location_alignment": 20,
        "remote_alignment": 20,
        "keyword_alignment": 20,
    },
)
