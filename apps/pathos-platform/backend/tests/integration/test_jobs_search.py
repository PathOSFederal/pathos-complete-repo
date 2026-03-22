"""Integration tests for `/api/v1/jobs/search` (Slice 30).

Coverage intent:
- Verifies canonical response shape without leaking raw USAJOBS structure.
- Verifies upstream audit summary row is written.
- Verifies in-memory cache avoids duplicate upstream calls for same query.
"""

from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.main import create_app


def test_jobs_search_integration__canonical_shape_audit_and_cache(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "jobs_integration.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("PATHOS_API_KEYS", "")
    monkeypatch.setenv("USAJOBS_CACHE_TTL_SECONDS", "60")
    call_count = {"count": 0}

    payload = {
        "SearchResult": {
            "SearchResultCountAll": 1,
            "SearchResultItems": [
                {
                    "MatchedObjectId": "INT-1",
                    "MatchedObjectDescriptor": {
                        "PositionTitle": "Data Engineer",
                        "OrganizationName": "Agency Integration",
                        "PositionLocationDisplay": "Austin, TX",
                        "PositionLocation": [{"LocationName": "Austin, TX"}],
                        "PositionRemuneration": [{"MinimumRange": "90000", "MaximumRange": "120000"}],
                        "UserArea": {"Details": {"ApplyURI": ["https://www.usajobs.gov/job/INT-1/apply"]}},
                    },
                }
            ],
        }
    }

    def _fake_search(self, query_params):
        call_count["count"] += 1
        return USAJobsSearchResponse(
            payload=payload,
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="hash-int-1",
                status_code=200,
                latency_ms=8,
                result_count=1,
                error_class=None,
            ),
        )

    monkeypatch.setattr("app.adapters.usajobs.client.USAJobsClient.search_jobs", _fake_search)

    app = create_app()
    with TestClient(app) as client:
        first = client.post("/api/v1/jobs/search", json={"keyword": "engineer", "location": "Austin, TX"})
        second = client.post("/api/v1/jobs/search", json={"keyword": "engineer", "location": "Austin, TX"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert call_count["count"] == 1

    body = first.json()
    first_job = body["results"][0]
    assert set(first_job.keys()) == {
        "id",
        "title",
        "organization",
        "locations",
        "compensation",
        "open_date",
        "close_date",
        "apply_url",
        "source",
    }
    assert "MatchedObjectDescriptor" not in str(body)

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT endpoint, query_hash, status_code, result_count, error_class FROM upstream_api_audit_records"
        ).fetchone()
    assert row is not None
    assert row[0] == "/api/search"
    assert row[1] == "hash-int-1"
    assert row[2] == 200
    assert row[3] == 1
    assert row[4] is None

