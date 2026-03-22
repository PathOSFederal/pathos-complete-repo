from __future__ import annotations

from datetime import datetime, timezone

from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata
from app.models.job_score import JobScoringProfileV1, PreferredGrades
from app.services.job_scoring_service import JobScoringService


def _job(*, locations: list[str], grade_min: int | None = 11, grade_max: int | None = 12) -> CanonicalJob:
    return CanonicalJob(
        id="JOB-1",
        title="Data Analyst",
        organization="Agency Test",
        locations=locations,
        compensation=CanonicalCompensation(
            grade_min=grade_min,
            grade_max=grade_max,
            salary_min=80000,
            salary_max=100000,
        ),
        open_date="2026-01-01",
        close_date="2026-01-10",
        apply_url="https://example.test/apply",
        source=CanonicalSourceMetadata(
            source="USAJOBS",
            retrieved_at="2026-01-01T00:00:00+00:00",
            mapper_version="usajobs-normalize-v1",
        ),
    )


def test_scoring_is_deterministic_for_same_inputs() -> None:
    profile = JobScoringProfileV1(
        preferred_grades=PreferredGrades(min=11, max=12),
        preferred_locations=["Remote"],
        remote_preference="remote_only",
        keywords=["analyst", "data"],
    )
    job = _job(locations=["Remote"])
    computed_at = datetime(2026, 2, 14, 0, 0, tzinfo=timezone.utc)

    first = JobScoringService.score_job(job=job, profile=profile, computed_at=computed_at)
    second = JobScoringService.score_job(job=job, profile=profile, computed_at=computed_at)

    assert first.model_dump(mode="json") == second.model_dump(mode="json")


def test_scoring_changes_predictably_for_remote_preference() -> None:
    job = _job(locations=["Austin, TX"])
    baseline = JobScoringService.score_job(
        job=job,
        profile=JobScoringProfileV1(preferred_locations=["Austin, TX"], remote_preference="no_preference"),
    )
    remote_only = JobScoringService.score_job(
        job=job,
        profile=JobScoringProfileV1(preferred_locations=["Austin, TX"], remote_preference="remote_only"),
    )

    assert remote_only.final_score < baseline.final_score
    assert any(risk.code == "REMOTE_REQUIRED" for risk in remote_only.risks)


def test_scoring_emits_specific_risk_for_grade_mismatch() -> None:
    result = JobScoringService.score_job(
        job=_job(locations=["Remote"], grade_min=11, grade_max=12),
        profile=JobScoringProfileV1(preferred_grades=PreferredGrades(min=13, max=14)),
    )

    assert any(risk.code == "GRADE_OUT_OF_RANGE" for risk in result.risks)
    assert result.breakdown.grade_alignment == 0


def test_scoring_covers_series_partial_grade_location_and_keywords_missing() -> None:
    result = JobScoringService.score_job(
        job=_job(locations=["Remote"], grade_min=10, grade_max=12),
        profile=JobScoringProfileV1(
            preferred_series=["0343"],
            preferred_grades=PreferredGrades(min=11, max=13),
            preferred_locations=["Denver, CO"],
            relocation_radius_miles=25,
            remote_preference=False,
            keywords=["kubernetes"],
        ),
    )

    assert any(risk.code == "SERIES_NOT_AVAILABLE" for risk in result.risks)
    assert any(reason.code == "GRADE_PARTIAL_MATCH" for reason in result.reasons)
    assert any(reason.code == "REMOTE_LOCATION" for reason in result.reasons)
    assert any(risk.code == "ONSITE_PREFERRED" for risk in result.risks)
    assert any(risk.code == "KEYWORDS_MISSING" for risk in result.risks)


def test_scoring_grade_unknown_and_onsite_match_path() -> None:
    result = JobScoringService.score_job(
        job=_job(locations=["Austin, TX"], grade_min=None, grade_max=None),
        profile=JobScoringProfileV1(
            preferred_grades=PreferredGrades(min=9, max=11),
            preferred_locations=["Seattle, WA"],
            relocation_radius_miles=50,
            remote_preference="onsite_only",
        ),
    )

    assert any(risk.code == "GRADE_UNKNOWN" for risk in result.risks)
    assert any(risk.code == "LOCATION_NO_EXACT_MATCH" for risk in result.risks)
    assert any(reason.code == "ONSITE_MATCH" for reason in result.reasons)
