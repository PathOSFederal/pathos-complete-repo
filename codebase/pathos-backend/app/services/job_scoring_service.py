"""Pure deterministic scoring for canonical jobs."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Literal

from app.domain.jobs.canonical_models import CanonicalJob
from app.models.job_score import (
    JobScoreBreakdown,
    JobScoreReason,
    JobScoreResult,
    JobScoreRisk,
    JobScoringProfileV1,
)
from app.services.job_scoring_ruleset import DEFAULT_JOB_SCORING_RULESET, JobScoringRuleset


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _tokenize(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", _normalize_text(value)) if len(token) > 1}


class JobScoringService:
    @staticmethod
    def score_job(
        *,
        job: CanonicalJob,
        profile: JobScoringProfileV1,
        ruleset: JobScoringRuleset = DEFAULT_JOB_SCORING_RULESET,
        computed_at: datetime | None = None,
    ) -> JobScoreResult:
        reasons: list[JobScoreReason] = []
        risks: list[JobScoreRisk] = []

        if profile.preferred_series:
            series_alignment = 30
            risks.append(
                JobScoreRisk(
                    code="SERIES_NOT_AVAILABLE",
                    message="Series preference provided but canonical job series is unavailable",
                )
            )
        else:
            series_alignment = 50

        pref_grades = profile.preferred_grades
        job_min = job.compensation.grade_min
        job_max = job.compensation.grade_max
        if pref_grades is None or (pref_grades.min is None and pref_grades.max is None):
            grade_alignment = 50
        elif job_min is None and job_max is None:
            grade_alignment = 20
            risks.append(JobScoreRisk(code="GRADE_UNKNOWN", message="Job grade information is missing"))
        else:
            pref_min = pref_grades.min if pref_grades and pref_grades.min is not None else 1
            pref_max = pref_grades.max if pref_grades and pref_grades.max is not None else 15
            effective_min = job_min if job_min is not None else job_max
            effective_max = job_max if job_max is not None else job_min
            if effective_min is None or effective_max is None:
                grade_alignment = 20
                risks.append(JobScoreRisk(code="GRADE_UNKNOWN", message="Job grade information is missing"))
            elif effective_max < pref_min or effective_min > pref_max:
                grade_alignment = 0
                risks.append(JobScoreRisk(code="GRADE_OUT_OF_RANGE", message="Job grade does not match preferred range"))
            elif effective_min >= pref_min and effective_max <= pref_max:
                grade_alignment = 100
                reasons.append(JobScoreReason(code="GRADE_MATCH", message="Job grade falls within preferred range"))
            else:
                grade_alignment = 60
                reasons.append(JobScoreReason(code="GRADE_PARTIAL_MATCH", message="Job grade partially overlaps range"))

        normalized_locations = {_normalize_text(location) for location in job.locations}
        if not profile.preferred_locations:
            location_alignment = 50
        else:
            preferred_locations = {_normalize_text(location) for location in profile.preferred_locations}
            if normalized_locations.intersection(preferred_locations):
                location_alignment = 100
                reasons.append(JobScoreReason(code="LOCATION_MATCH", message="Job location matches preference"))
            elif any("remote" in value for value in normalized_locations):
                location_alignment = 70
                reasons.append(JobScoreReason(code="REMOTE_LOCATION", message="Job is listed as remote"))
            elif profile.relocation_radius_miles is not None and profile.relocation_radius_miles > 0:
                location_alignment = 40
                risks.append(JobScoreRisk(code="LOCATION_NO_EXACT_MATCH", message="No exact location match found"))
            else:
                location_alignment = 0
                risks.append(JobScoreRisk(code="LOCATION_MISMATCH", message="Job location does not match preference"))

        remote_preference = profile.remote_preference
        if isinstance(remote_preference, bool):
            remote_mode = "remote_only" if remote_preference else "onsite_only"
        else:
            remote_mode = remote_preference
        job_is_remote = any("remote" in value for value in normalized_locations)
        if remote_mode == "no_preference":
            remote_alignment = 50
        elif remote_mode == "remote_only":
            if job_is_remote:
                remote_alignment = 100
                reasons.append(JobScoreReason(code="REMOTE_MATCH", message="Remote preference is satisfied"))
            else:
                remote_alignment = 0
                risks.append(JobScoreRisk(code="REMOTE_REQUIRED", message="Profile requires remote work"))
        else:
            if job_is_remote:
                remote_alignment = 20
                risks.append(JobScoreRisk(code="ONSITE_PREFERRED", message="Profile prefers onsite roles"))
            else:
                remote_alignment = 100
                reasons.append(JobScoreReason(code="ONSITE_MATCH", message="Onsite preference is satisfied"))

        if profile.keywords:
            haystack = _tokenize(f"{job.title} {job.organization}")
            desired = {_normalize_text(value) for value in profile.keywords}
            matched = sorted(value for value in desired if value in haystack)
            if matched:
                keyword_alignment = min(100, int((len(matched) / len(desired)) * 100))
                reasons.append(JobScoreReason(code="KEYWORDS_MATCH", message=f"Matched keywords: {', '.join(matched)}"))
            else:
                keyword_alignment = 0
                risks.append(JobScoreRisk(code="KEYWORDS_MISSING", message="No preferred keywords matched"))
        else:
            keyword_alignment = 50

        breakdown = JobScoreBreakdown(
            series_alignment=series_alignment,
            grade_alignment=grade_alignment,
            location_alignment=location_alignment,
            remote_alignment=remote_alignment,
            keyword_alignment=keyword_alignment,
        )

        total_weight = sum(ruleset.weights.values())
        weighted_sum = (
            breakdown.series_alignment * ruleset.weights["series_alignment"]
            + breakdown.grade_alignment * ruleset.weights["grade_alignment"]
            + breakdown.location_alignment * ruleset.weights["location_alignment"]
            + breakdown.remote_alignment * ruleset.weights["remote_alignment"]
            + breakdown.keyword_alignment * ruleset.weights["keyword_alignment"]
        )
        final_score = int((weighted_sum / total_weight) + 0.5)

        confidence_band: Literal["Low", "Medium", "High"]
        if final_score >= ruleset.confidence_high_threshold:
            confidence_band = "High"
        elif final_score >= ruleset.confidence_medium_threshold:
            confidence_band = "Medium"
        else:
            confidence_band = "Low"

        return JobScoreResult(
            final_score=final_score,
            confidence_band=confidence_band,
            reasons=reasons,
            risks=risks,
            breakdown=breakdown,
            ruleset_version=ruleset.version,
            mapper_version=job.source.mapper_version,
            computed_at=computed_at or datetime.now(timezone.utc),
        )
