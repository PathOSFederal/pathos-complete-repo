"""Slice 21 categories covered in this file:
- Use Case, Misuse Case, Boundary, Equivalence, Positive, Negative, Edge Case.
"""

from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.main import create_app
from app.services.job_search_service import (
    JobSearchRateLimitedError,
    JobSearchUpstreamAuthError,
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
                        "PositionLocation": [{"LocationName": location}, {"LocationName": "Austin, TX"}],
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


def _mock_search(monkeypatch, payload: dict, truncated: bool = False, response_bytes: int = 100) -> None:
    del truncated
    del response_bytes

    def _fake(self, query_params):
        return USAJobsSearchResponse(
            payload=payload,
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="abc123",
                status_code=200,
                latency_ms=12,
                result_count=1,
                error_class=None,
            ),
        )

    monkeypatch.setattr("app.adapters.usajobs.client.USAJobsClient.search_jobs", _fake)


def test_use_case__jobs_search_keyword_and_location(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_use_case.db"))
    _mock_search(monkeypatch, _payload())
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"keyword": "analyst", "location": "Austin, TX"})
    assert response.status_code == 200
    body = response.json()
    assert body["results"][0]["id"] == "J1"
    assert body["results"][0]["source"]["source"] == "USAJOBS"
    assert body["request_id"]


def test_misuse_case__jobs_search_injection_like_keyword_and_rate_limit(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_misuse.db"))
    monkeypatch.setenv("PATHOS_RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("PATHOS_RATE_LIMIT_RPM", "1")
    _mock_search(monkeypatch, _payload())
    app = create_app()
    with TestClient(app) as client:
        first = client.post("/api/v1/jobs/search", json={"keyword": "analyst' OR 1=1 --"})
        second = client.post("/api/v1/jobs/search", json={"keyword": "analyst' OR 1=1 --"})
    assert first.status_code == 200
    assert second.status_code == 429


def test_boundary__jobs_search_invalid_pagination_and_keyword_length(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_boundary.db"))
    app = create_app()
    with TestClient(app) as client:
        bad_page = client.post("/api/v1/jobs/search", json={"keyword": "analyst", "page": 0})
        too_long = client.post("/api/v1/jobs/search", json={"keyword": "x" * 201})
    assert bad_page.status_code == 422
    assert too_long.status_code == 422


def test_equivalence__jobs_search_keywords_have_same_shape(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_equivalence.db"))
    _mock_search(monkeypatch, _payload())
    app = create_app()
    keys = []
    with TestClient(app) as client:
        for keyword in ["analyst", "data analyst", "C++ developer"]:
            response = client.post("/api/v1/jobs/search", json={"keyword": keyword})
            assert response.status_code == 200
            keys.append(sorted(response.json()["results"][0].keys()))
    assert keys[0] == keys[1] == keys[2]


def test_positive__jobs_search_maps_and_audits_response(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "jobs_positive.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    _mock_search(monkeypatch, _payload(job_id="JPOS"))
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"keyword": "analyst"})
    assert response.status_code == 200
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT query_hash, status_code FROM upstream_api_audit_records").fetchone()
    assert row is not None
    assert row[0] == "abc123"
    assert row[1] == 200


def test_negative__jobs_search_upstream_schema_drift_maps_to_error_response(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_negative.db"))
    _mock_search(monkeypatch, {"unexpected": "shape"})
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"keyword": "analyst"})
    assert response.status_code == 502
    body = response.json()
    assert body["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_negative__jobs_search_upstream_auth_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_negative_auth.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchUpstreamAuthError("bad-key")),
    )
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"keyword": "analyst"})
    assert response.status_code == 502
    assert response.json()["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_negative__jobs_search_upstream_timeout_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_negative_timeout.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchUpstreamUnavailableError("timeout")),
    )
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"keyword": "analyst"})
    assert response.status_code == 503
    assert response.json()["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_negative__jobs_search_upstream_rate_limit_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_negative_rate.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchRateLimitedError("upstream-rate-limit")),
    )
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"keyword": "analyst"})
    assert response.status_code == 429
    assert response.json()["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_edge_case__jobs_search_missing_salary_multiloc_and_missing_close_date(monkeypatch, tmp_path) -> None:
    edge_payload = _payload(job_id="EDGE", location="Remote")
    descriptor = edge_payload["SearchResult"]["SearchResultItems"][0]["MatchedObjectDescriptor"]
    descriptor["PositionRemuneration"] = []
    descriptor["PositionLocationDisplay"] = ""
    descriptor["UserArea"]["Details"]["ApplicationCloseDate"] = None

    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "jobs_edge.db"))
    _mock_search(monkeypatch, edge_payload, truncated=True, response_bytes=999999)
    app = create_app()
    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"keyword": "analyst", "remote_only": True})
    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["compensation"]["salary_min"] is None
    assert result["close_date"] is None
