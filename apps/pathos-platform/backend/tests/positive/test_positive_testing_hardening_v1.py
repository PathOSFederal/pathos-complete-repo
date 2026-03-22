from __future__ import annotations

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.main import create_app


def _empty_upstream() -> USAJobsSearchResponse:
    return USAJobsSearchResponse(
        payload={"SearchResult": {"SearchResultCountAll": 0, "SearchResultItems": []}},
        audit=UpstreamAuditSummary(
            endpoint="/api/search",
            query_hash="diag-hash",
            status_code=200,
            latency_ms=4,
            result_count=0,
            error_class=None,
        ),
    )


def _single_result_upstream() -> USAJobsSearchResponse:
    return USAJobsSearchResponse(
        payload={
            "SearchResult": {
                "SearchResultCountAll": 1,
                "SearchResultItems": [
                    {
                        "MatchedObjectId": "J-OK",
                        "MatchedObjectDescriptor": {
                            "PositionID": "PID-J-OK",
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
        },
        audit=UpstreamAuditSummary(
            endpoint="/api/search",
            query_hash="run-hash",
            status_code=200,
            latency_ms=5,
            result_count=1,
            error_class=None,
        ),
    )


def test_positive__diagnostics_configured_reports_can_query(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # This checks the "configured and reachable" happy contract for diagnostics. If this fails,
    # operators cannot trust readiness checks before enabling alert automation.
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "positive_diagnostics_can_query.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "ua@example.com")
    monkeypatch.setattr(
        "app.services.usajobs_diagnostics_service.USAJobsClient.search_jobs",
        lambda self, query_params: _empty_upstream(),  # noqa: ARG005
    )
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        response = client.get("/api/v1/diagnostics/usajobs")

    assert response.status_code == 200
    body = response.json()
    assert body["configured"] is True
    assert body["can_query"] is True
    assert body["sample_count"] >= 0


def test_positive__min_interval_skip_reason_is_consistent_in_run_and_metrics(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # Min-interval behavior must be consistent across summary and metrics endpoints.
    # If inconsistent, dashboards and clients disagree about why a run was skipped.
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "positive_min_interval_consistency.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "ua@example.com")
    monkeypatch.setenv("ALERT_RULE_MIN_INTERVAL_MINUTES", "999")
    monkeypatch.setattr(
        "app.adapters.usajobs.client.USAJobsClient.search_jobs",
        lambda self, query_params: _single_result_upstream(),  # noqa: ARG005
    )
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        first = client.post("/api/v1/alerts/run")
        second = client.post("/api/v1/alerts/run")
        metrics = client.get("/api/v1/alerts/metrics/recent")

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["domain_outcome"] == "skipped"
    assert second.json()["skip_reason"] == "MIN_INTERVAL"
    assert metrics.status_code == 200
    assert metrics.json()[0]["domain_outcome"] == "skipped"
    assert metrics.json()[0]["skip_reason"] == "MIN_INTERVAL"

