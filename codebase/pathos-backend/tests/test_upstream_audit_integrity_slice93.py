from __future__ import annotations

import sqlite3
from hashlib import sha256

import pytest

from app.db.repo.upstream_audit_repo import UpstreamAuditRepo


def test_upstream_raw_hash_is_computed_deterministically(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "upstream_hash.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))

    UpstreamAuditRepo.save_record(
        {
            "id": "u1",
            "request_id": "req-1",
            "created_at": "2026-02-23T00:00:00+00:00",
            "endpoint": "/api/search",
            "query_hash": "qh-1",
            "status_code": 200,
            "latency_ms": 12,
            "result_count": 1,
            "error_class": None,
            "upstream_raw_payload": {
                "SearchResult": {
                    "SearchResultItems": [{"MatchedObjectId": "123"}],
                    "SearchResultCountAll": 1,
                }
            },
        }
    )

    rows = UpstreamAuditRepo.list_recent(limit=5)
    assert len(rows) == 1
    expected_raw = '{"SearchResult":{"SearchResultCountAll":1,"SearchResultItems":[{"MatchedObjectId":"123"}]}}'
    expected_hash = sha256(expected_raw.encode("utf-8")).hexdigest()
    assert rows[0]["upstream_raw_payload_json"] == expected_raw
    assert rows[0]["upstream_raw_hash"] == expected_hash


def test_upstream_raw_payload_tamper_is_detected(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "upstream_tamper.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))

    UpstreamAuditRepo.save_record(
        {
            "id": "u2",
            "request_id": "req-2",
            "created_at": "2026-02-23T00:00:00+00:00",
            "endpoint": "/api/search",
            "query_hash": "qh-2",
            "status_code": 200,
            "latency_ms": 10,
            "result_count": 1,
            "error_class": None,
            "upstream_raw_payload": {"SearchResult": {"SearchResultItems": []}},
        }
    )

    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "UPDATE upstream_api_audit_records SET payload_json = ? WHERE id = ?",
            ('{"tampered":true}', "u2"),
        )
        conn.commit()

    with pytest.raises(
        ValueError,
        match="Upstream payload integrity mismatch detected for upstream audit id=u2",
    ):
        UpstreamAuditRepo.list_recent(limit=5)
