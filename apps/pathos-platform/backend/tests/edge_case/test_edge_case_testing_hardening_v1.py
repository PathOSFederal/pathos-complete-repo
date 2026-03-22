from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.main import create_app
from app.models.job_search import JobSearchResponse


def _zero_result_upstream() -> USAJobsSearchResponse:
    return USAJobsSearchResponse(
        payload={"SearchResult": {"SearchResultCountAll": 0, "SearchResultItems": []}},
        audit=UpstreamAuditSummary(
            endpoint="/api/search",
            query_hash="edge-zero",
            status_code=200,
            latency_ms=2,
            result_count=0,
            error_class=None,
        ),
    )


def _single_remote_upstream() -> USAJobsSearchResponse:
    return USAJobsSearchResponse(
        payload={
            "SearchResult": {
                "SearchResultCountAll": 1,
                "SearchResultItems": [
                    {
                        "MatchedObjectId": "J-DET",
                        "MatchedObjectDescriptor": {
                            "PositionID": "PID-J-DET",
                            "PositionTitle": "Analyst",
                            "OrganizationName": "Agency",
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
        },
        audit=UpstreamAuditSummary(
            endpoint="/api/search",
            query_hash="edge-det",
            status_code=200,
            latency_ms=3,
            result_count=1,
            error_class=None,
        ),
    )


def test_edge_case__upstream_zero_results_maps_to_empty_with_upstream_reason(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # "200 with zero rows" is a common production edge. It must map to an explicit empty reason
    # so clients can distinguish no-op data from actual failures.
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "edge_zero_results.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "ua@example.com")
    monkeypatch.setattr(
        "app.adapters.usajobs.client.USAJobsClient.search_jobs",
        lambda self, query_params: _zero_result_upstream(),  # noqa: ARG005
    )
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        saved_id = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()["id"]
        run = client.post(f"/api/v1/saved-searches/{saved_id}/run")

    assert run.status_code == 200
    assert run.json()["domain_outcome"] == "empty"
    assert run.json()["empty_reason"] == "UPSTREAM_ZERO_RESULTS"


def test_edge_case__enabled_rule_order_is_stable_across_runs_and_normalized_to_zero_contract(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # This combines two fragile edges: deterministic rule ordering and "normalized-to-zero"
    # behavior (total known, results empty). Failures here break reproducibility and outcome semantics.
    db_path = tmp_path / "edge_rule_order_and_normalized_zero.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "ua@example.com")

    fixed_response = JobSearchResponse(
        results=[],
        total=3,
        page=1,
        page_size=20,
        request_id="req-edge",
    )
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: fixed_response,
    )
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        s1 = client.post("/api/v1/saved-searches", json={"name": "A", "query": {"keyword": "analyst"}}).json()
        s2 = client.post("/api/v1/saved-searches", json={"name": "B", "query": {"keyword": "analyst"}}).json()
        r1 = client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": s1["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        ).json()
        r2 = client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": s2["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        ).json()

        first_run = client.post("/api/v1/alerts/run").json()
        second_run = client.post("/api/v1/alerts/run").json()
        saved_search_run = client.post(f"/api/v1/saved-searches/{s1['id']}/run")

    assert first_run["status"] == "success"
    assert second_run["status"] == "success"
    assert [row["alert_rule_id"] for row in first_run["per_rule"]] == [row["alert_rule_id"] for row in second_run["per_rule"]]
    assert sorted([r1["id"], r2["id"]]) == [row["alert_rule_id"] for row in first_run["per_rule"]]

    assert saved_search_run.status_code == 200
    assert saved_search_run.json()["domain_outcome"] == "empty"
    assert saved_search_run.json()["empty_reason"] == "NORMALIZED_TO_ZERO"

    with sqlite3.connect(db_path) as conn:
        # Teacher note:
        # No upstream attempt occurs because search was monkeypatched at service boundary.
        # This guards against accidental audit writes on skip/mocked code paths.
        audit_count = conn.execute("SELECT COUNT(1) FROM upstream_api_audit_records WHERE endpoint='/api/search'").fetchone()
    assert audit_count is not None and int(audit_count[0]) == 0
