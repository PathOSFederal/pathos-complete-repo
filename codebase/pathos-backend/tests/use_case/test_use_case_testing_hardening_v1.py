from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata
from app.main import create_app
from app.models.job_search import JobSearchRequest, JobSearchResponse
from app.models.saved_search import SavedSearchCreateRequest
from app.services.saved_search_runner_service import SavedSearchRunnerService
from app.services.saved_search_service import SavedSearchService


def _usajobs_payload(*, job_id: str = "J-001") -> dict:
    return {
        "SearchResult": {
            "SearchResultCountAll": 1,
            "SearchResultItems": [
                {
                    "MatchedObjectId": job_id,
                    "MatchedObjectDescriptor": {
                        "PositionID": f"PID-{job_id}",
                        "PositionTitle": "Data Analyst",
                        "OrganizationName": "Agency X",
                        "PositionLocationDisplay": "Remote",
                        "PositionLocation": [{"LocationName": "Remote"}],
                        "PositionRemuneration": [{"MinimumRange": "60000", "MaximumRange": "90000"}],
                        "UserArea": {
                            "Details": {
                                "LowGrade": "9",
                                "HighGrade": "11",
                                "PositionURI": "https://www.usajobs.gov/job/1",
                                "ApplyURI": ["https://www.usajobs.gov/job/1/apply"],
                                "RemoteIndicator": True,
                                "PublicationStartDate": "2026-01-01",
                                "ApplicationCloseDate": "2026-01-10",
                            }
                        },
                    },
                }
            ],
        }
    }


def test_use_case__alerts_run_happy_path_attempts_upstream_writes_audit_and_creates_digest(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # This validates the highest-risk success workflow end-to-end: run orchestration should
    # attempt upstream fetch, persist one audit row, and produce a digest artifact. If this
    # fails, we lose traceability or delivery evidence even when runs return HTTP 200.
    db_path = tmp_path / "use_case_alerts_happy_path.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "ua@example.com")

    def _fake_search(self, query_params):  # noqa: ANN001
        del self, query_params
        return USAJobsSearchResponse(
            payload=_usajobs_payload(job_id="J-HAPPY"),
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="hash-happy",
                status_code=200,
                latency_ms=7,
                result_count=1,
                error_class=None,
            ),
        )

    monkeypatch.setattr("app.adapters.usajobs.client.USAJobsClient.search_jobs", _fake_search)
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S1", "query": {"keyword": "analyst"}}).json()
        created_rule = client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        assert created_rule.status_code == 200
        run = client.post("/api/v1/alerts/run")

    assert run.status_code == 200
    assert run.json()["domain_outcome"] == "success"
    assert run.json()["jobs_scanned"] >= 1

    with sqlite3.connect(db_path) as conn:
        audit_count = conn.execute("SELECT COUNT(1) FROM upstream_api_audit_records WHERE endpoint = '/api/search'").fetchone()
        digest_count = conn.execute("SELECT COUNT(1) FROM alert_digests").fetchone()
    assert audit_count is not None and int(audit_count[0]) == 1
    assert digest_count is not None and int(digest_count[0]) >= 1


def test_use_case__saved_search_runner_same_input_produces_same_fingerprint_and_order(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # Determinism is required for trustworthy diffs and checkpointing. This test proves that
    # identical saved-search input yields a stable fingerprint and stable ranking order.
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "use_case_saved_search_determinism.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "ua@example.com")

    def _fake_search(*, search: JobSearchRequest, request_id: str, client=None) -> JobSearchResponse:  # noqa: ANN001
        del search, request_id, client
        return JobSearchResponse(
            results=[
                CanonicalJob(
                    id="B-ID",
                    title="Analyst II",
                    organization="Agency",
                    locations=["Remote"],
                    compensation=CanonicalCompensation(),
                    open_date=None,
                    close_date=None,
                    apply_url="https://example.com/b",
                    source=CanonicalSourceMetadata(
                        source="USAJOBS",
                        retrieved_at="2026-02-20T00:00:00+00:00",
                        mapper_version="usajobs-normalize-v1",
                    ),
                ),
                CanonicalJob(
                    id="A-ID",
                    title="Analyst I",
                    organization="Agency",
                    locations=["Remote"],
                    compensation=CanonicalCompensation(),
                    open_date=None,
                    close_date=None,
                    apply_url="https://example.com/a",
                    source=CanonicalSourceMetadata(
                        source="USAJOBS",
                        retrieved_at="2026-02-20T00:00:00+00:00",
                        mapper_version="usajobs-normalize-v1",
                    ),
                ),
            ],
            total=2,
            page=1,
            page_size=20,
            request_id="req-deterministic",
        )

    monkeypatch.setattr("app.services.job_search_service.JobSearchService.search_jobs", _fake_search)
    created = SavedSearchService.create(
        SavedSearchCreateRequest(name="Determinism", query=JobSearchRequest(keyword="analyst"))
    )
    first = SavedSearchRunnerService.run_saved_search(saved_search_id=created.id, request_id="req-1")
    second = SavedSearchRunnerService.run_saved_search(saved_search_id=created.id, request_id="req-2")

    first_ids = [row["job"]["id"] for row in first["results"]]
    second_ids = [row["job"]["id"] for row in second["results"]]
    assert first["query_fingerprint"] == second["query_fingerprint"]
    assert first_ids == second_ids
