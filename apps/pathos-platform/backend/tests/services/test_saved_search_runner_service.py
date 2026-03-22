from __future__ import annotations

from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata
from app.models.job_search import JobSearchRequest
from app.models.job_search import JobSearchResponse
from app.services.saved_search_runner_service import SavedSearchRunnerService


def test_saved_search_runner_ranks_with_stable_tie_break(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_runner.db"))

    def _fake_search(*args, **kwargs):  # noqa: ANN002, ANN003
        return JobSearchResponse(
            results=[
                CanonicalJob(
                    id="B",
                    title="Analyst B",
                    organization="Agency",
                    locations=["Remote"],
                    compensation=CanonicalCompensation(grade_min=11, grade_max=12),
                    open_date=None,
                    close_date=None,
                    apply_url="https://example.com/B",
                    source=CanonicalSourceMetadata(
                        source="USAJOBS",
                        retrieved_at="2026-02-14T00:00:00+00:00",
                        mapper_version="usajobs-normalize-v1",
                    ),
                ),
                CanonicalJob(
                    id="A",
                    title="Analyst A",
                    organization="Agency",
                    locations=["Remote"],
                    compensation=CanonicalCompensation(grade_min=11, grade_max=12),
                    open_date=None,
                    close_date=None,
                    apply_url="https://example.com/A",
                    source=CanonicalSourceMetadata(
                        source="USAJOBS",
                        retrieved_at="2026-02-14T00:00:00+00:00",
                        mapper_version="usajobs-normalize-v1",
                    ),
                ),
            ],
            total=2,
            page=1,
            page_size=20,
            request_id="req-1",
        )

    monkeypatch.setattr("app.services.job_search_service.JobSearchService.search_jobs", _fake_search)
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.fingerprint_params", lambda _: "fp-1")

    from app.models.saved_search import SavedSearchCreateRequest
    from app.services.saved_search_service import SavedSearchService

    created = SavedSearchService.create(
        payload=SavedSearchCreateRequest(
            name="My Saved",
            query=JobSearchRequest(keyword="analyst"),
            ruleset_version="job-scoring-v1",
        ),
    )
    output = SavedSearchRunnerService.run_saved_search(created.id, request_id="req-1")

    assert output["ruleset_version"] == "job-scoring-v1"
    assert output["mapper_version"] == "usajobs-normalize-v1"
    assert [row["job"]["id"] for row in output["results"]] == ["A", "B"]
