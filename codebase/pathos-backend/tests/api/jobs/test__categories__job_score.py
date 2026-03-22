"""Category coverage for `/api/v1/jobs/{job_id}/score`."""

from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.main import create_app
from app.services.job_search_service import (
    JobSearchConfigError,
    JobSearchRateLimitedError,
    JobSearchUpstreamAuthError,
    JobSearchUpstreamSchemaError,
    JobSearchUpstreamUnavailableError,
)


def _payload(job_id: str = "J1", location: str = "Remote") -> dict:
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
                        "PositionLocationDisplay": location,
                        "PositionLocation": [{"LocationName": location}],
                        "PositionRemuneration": [{"MinimumRange": "70000", "MaximumRange": "90000"}],
                        "UserArea": {
                            "Details": {
                                "LowGrade": "11",
                                "HighGrade": "12",
                                "PositionURI": "https://www.usajobs.gov/job/1",
                                "ApplyURI": ["https://www.usajobs.gov/job/1/apply"],
                            }
                        },
                    },
                }
            ],
        }
    }


def _mock_search(monkeypatch, payload: dict) -> None:
    def _fake(self, query_params):
        return USAJobsSearchResponse(
            payload=payload,
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="hash-score",
                status_code=200,
                latency_ms=10,
                result_count=1,
                error_class=None,
            ),
        )

    monkeypatch.setattr("app.adapters.usajobs.client.USAJobsClient.search_jobs", _fake)


def test_use_case__job_score_happy_path(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "job_score_use_case.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    _mock_search(monkeypatch, _payload(job_id="J-SCORE", location="Remote"))

    app = create_app()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/jobs/J-SCORE/score",
            json={
                "search": {"keyword": "analyst"},
                "profile": {
                    "preferred_grades": {"min": 11, "max": 12},
                    "preferred_locations": ["Remote"],
                    "remote_preference": "remote_only",
                    "keywords": ["analyst"],
                },
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["final_score"] <= 100
    assert body["confidence_band"] in {"Low", "Medium", "High"}
    assert body["ruleset_version"] == "job-scoring-v1"
    assert body["mapper_version"] == "usajobs-normalize-v1"
    assert "breakdown" in body and "reasons" in body and "risks" in body

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT endpoint, status_code, error_class FROM upstream_api_audit_records WHERE endpoint LIKE '%/score' "
            "ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
    assert row is not None
    assert row[0] == "/api/v1/jobs/J-SCORE/score"
    assert row[1] == 200
    assert row[2] is None


def test_negative__job_score_job_not_found_error_is_wrapped(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "job_score_not_found.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    _mock_search(monkeypatch, _payload(job_id="OTHER"))

    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/MISSING/score", json={"search": {"keyword": "analyst"}})

    assert response.status_code == 404
    assert response.json()["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT endpoint, status_code, error_class FROM upstream_api_audit_records WHERE endpoint LIKE '%/score' "
            "ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
    assert row is not None
    assert row[0] == "/api/v1/jobs/MISSING/score"
    assert row[1] == 404
    assert row[2] == "JobNotFoundForScoring"


def test_negative__job_score_maps_job_search_config_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "job_score_config.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchConfigError("missing-key")),
    )
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/J1/score", json={"search": {"keyword": "analyst"}})
    assert response.status_code == 503


def test_negative__job_score_maps_job_search_auth_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "job_score_auth.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchUpstreamAuthError("bad-auth")),
    )
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/J1/score", json={"search": {"keyword": "analyst"}})
    assert response.status_code == 502


def test_negative__job_score_maps_job_search_unavailable_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "job_score_unavailable.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchUpstreamUnavailableError("timeout")),
    )
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/J1/score", json={"search": {"keyword": "analyst"}})
    assert response.status_code == 503


def test_negative__job_score_maps_job_search_schema_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "job_score_schema.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchUpstreamSchemaError("schema")),
    )
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/J1/score", json={"search": {"keyword": "analyst"}})
    assert response.status_code == 502


def test_negative__job_score_maps_job_search_rate_limit_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "job_score_rate_limit.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchRateLimitedError("rate-limited")),
    )
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/J1/score", json={"search": {"keyword": "analyst"}})
    assert response.status_code == 429
