from __future__ import annotations

from fastapi.testclient import TestClient

from app.db.connection import connect
from app.db.repo.job_sync_run_repo import JobSyncRunRepo
from app.main import create_app


def _headers() -> dict[str, str]:
    return {"Authorization": "Bearer k1"}


def _sync_run(
    *,
    run_id: str,
    status: str = "success",
    completed_at: str = "2026-07-01T12:00:00+00:00",
    records_fetched: int = 5,
    new_jobs: int = 2,
    updated_jobs: int = 1,
    closed_jobs: int = 0,
    failed_partitions: list[dict[str, object]] | None = None,
    stale_partitions: list[dict[str, object]] | None = None,
    alert_events_queued: int = 3,
    indexing_events_queued: int = 2,
    duration_ms: int = 1234,
    error_summary: str | None = None,
) -> dict[str, object]:
    return {
        "id": run_id,
        "saved_search_id": None,
        "source": "USAJOBS_OFFICIAL_API",
        "trigger_mode": "saved_search_runner",
        "run_mode": "write",
        "status": status,
        "started_at": "2026-07-01T11:59:00+00:00",
        "completed_at": completed_at,
        "records_fetched": records_fetched,
        "new_jobs": new_jobs,
        "updated_jobs": updated_jobs,
        "unchanged_jobs": 2,
        "closed_jobs": closed_jobs,
        "failed_partitions": failed_partitions if failed_partitions is not None else [],
        "stale_partitions": stale_partitions if stale_partitions is not None else [],
        "alert_events_queued": alert_events_queued,
        "indexing_events_queued": indexing_events_queued,
        "duration_ms": duration_ms,
        "error_summary": error_summary,
    }


def _client(monkeypatch, tmp_path) -> TestClient:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ops_health.db"))
    app = create_app()
    return TestClient(app)


def test_usajobs_sync_health_requires_valid_api_key(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ops_health_auth.db"))
    app = create_app()

    with TestClient(app) as client:
        missing = client.get("/api/v1/ops/usajobs-sync/health")
        invalid = client.get(
            "/api/v1/ops/usajobs-sync/health",
            headers={"Authorization": "Bearer wrong"},
        )
        authorized = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    assert missing.status_code == 401
    assert invalid.status_code == 403
    assert authorized.status_code == 200


def test_usajobs_sync_health_no_rows_returns_never_run(monkeypatch, tmp_path) -> None:
    with _client(monkeypatch, tmp_path) as client:
        response = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    payload = response.json()
    assert response.status_code == 200
    assert payload["status"] == "never_run"
    assert payload["last_sync_time"] is None
    assert payload["last_success_time"] is None
    assert payload["records_fetched"] == 0
    assert payload["failed_partitions"] == []
    assert payload["stale_partitions"] == []
    assert payload["error_summary"] is None
    assert "traceback" not in str(payload).lower()


def test_usajobs_sync_health_reports_latest_successful_run(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ops_health_success.db"))
    JobSyncRunRepo.create(
        _sync_run(
            run_id="sync-success",
            completed_at="2026-07-01T12:00:00+00:00",
            records_fetched=8,
            new_jobs=3,
            updated_jobs=2,
            closed_jobs=1,
            alert_events_queued=4,
            indexing_events_queued=5,
            duration_ms=4567,
        )
    )
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    payload = response.json()
    assert response.status_code == 200
    assert payload["status"] == "healthy"
    assert payload["sync_run_status"] == "success"
    assert payload["last_sync_time"] == "2026-07-01T12:00:00+00:00"
    assert payload["last_success_time"] == "2026-07-01T12:00:00+00:00"
    assert payload["records_fetched"] == 8
    assert payload["new_jobs"] == 3
    assert payload["updated_jobs"] == 2
    assert payload["closed_jobs"] == 1
    assert payload["failed_partitions"] == []
    assert payload["stale_partitions"] == []
    assert payload["alert_events_queued"] == 4
    assert payload["indexing_events_queued"] == 5
    assert payload["duration_ms"] == 4567
    assert payload["close_missing_skipped"] is False
    assert payload["close_missing_skip_reason"] is None


def test_usajobs_sync_health_reports_stale_close_missing_skip(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ops_health_stale.db"))
    JobSyncRunRepo.create(
        _sync_run(
            run_id="sync-stale",
            stale_partitions=[
                {
                    "reason": "pagination_incomplete",
                    "partition_identity": {"series": "2210", "location": "Florida"},
                    "records_fetched": 1,
                    "upstream_total": 2,
                }
            ],
            closed_jobs=0,
        )
    )
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    payload = response.json()
    assert response.status_code == 200
    assert payload["status"] == "stale"
    assert payload["closed_jobs"] == 0
    assert payload["close_missing_skipped"] is True
    assert payload["close_missing_skip_reason"] == "pagination_incomplete"
    assert payload["stale_partitions"][0]["reason"] == "pagination_incomplete"


def test_usajobs_sync_health_reports_degraded_success_with_failed_partitions(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ops_health_degraded.db"))
    JobSyncRunRepo.create(
        _sync_run(
            run_id="sync-degraded",
            failed_partitions=[
                {"partition": "series=2210&state=FL", "reason": "rate_limited"}
            ],
            stale_partitions=[],
            alert_events_queued=1,
            indexing_events_queued=1,
        )
    )
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    payload = response.json()
    assert response.status_code == 200
    assert payload["status"] == "degraded"
    assert payload["sync_run_status"] == "success"
    assert payload["failed_partitions"] == [
        {"partition": "series=2210&state=FL", "reason": "rate_limited"}
    ]
    assert payload["stale_partitions"] == []
    assert payload["alert_events_queued"] == 1
    assert payload["indexing_events_queued"] == 1
    assert payload["close_missing_skipped"] is False
    assert payload["close_missing_skip_reason"] is None


def test_usajobs_sync_health_reports_failed_run_with_safe_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ops_health_failed.db"))
    JobSyncRunRepo.create(
        _sync_run(
            run_id="sync-success-earlier",
            completed_at="2026-07-01T11:00:00+00:00",
        )
    )
    unsafe_error = (
        "Traceback (most recent call last):\n"
        '  File "app/adapters/usajobs/client.py", line 1, in search\n'
        "UpstreamUnavailableError: Authorization: Bearer secret-token-123 "
        "USAJOBS_API_KEY=secret-api-key user=operator@example.com "
        "postgresql://user:pass@localhost/pathos raw upstream payload"
    )
    JobSyncRunRepo.create(
        _sync_run(
            run_id="sync-failed",
            status="failed",
            completed_at="2026-07-01T12:00:00+00:00",
            records_fetched=0,
            new_jobs=0,
            updated_jobs=0,
            closed_jobs=0,
            failed_partitions=[
                {
                    "series": "2210",
                    "headers": {"Authorization-Key": "secret-api-key"},
                    "raw_upstream_payload_json": {"secret": "do-not-return"},
                    "database_url": "postgresql://user:pass@localhost/pathos",
                }
            ],
            stale_partitions=[
                {
                    "reason": "upstream_unavailable",
                    "authorization": "Bearer secret-token-123",
                }
            ],
            alert_events_queued=0,
            indexing_events_queued=0,
            error_summary=unsafe_error,
        )
    )
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    payload = response.json()
    encoded = str(payload)
    assert response.status_code == 200
    assert payload["status"] == "failed"
    assert payload["sync_run_status"] == "failed"
    assert payload["last_success_time"] == "2026-07-01T11:00:00+00:00"
    assert payload["failed_partitions"][0]["headers"] == "[REDACTED]"
    assert payload["failed_partitions"][0]["raw_upstream_payload_json"] == "[REDACTED]"
    assert payload["failed_partitions"][0]["database_url"] == "[REDACTED]"
    assert payload["stale_partitions"][0]["authorization"] == "[REDACTED]"
    assert "secret-token-123" not in encoded
    assert "secret-api-key" not in encoded
    assert "operator@example.com" not in encoded
    assert "postgresql://user:pass" not in encoded
    assert "Traceback" not in encoded
    assert 'File "app/adapters' not in encoded
    assert "raw_upstream_payload_json': {'secret'" not in encoded


def test_usajobs_sync_health_sanitizes_auth_schemes_and_stringified_headers(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ops_health_auth_strings.db"))
    unsafe_error = "\n".join(
        [
            "High-level upstream auth failure remains visible",
            "Authorization: Basic basic-secret-123",
            "Authorization: Token token-secret-123",
            "Authorization: Bearer bearer-secret-123",
            "authorization: basic lowercase-secret-123",
            "Authorization: anything with spaces",
            "authorization: anything with spaces",
            "Authorization = anything with spaces",
            "authorization='anything with spaces'",
            'authorization="anything with spaces"',
            "headers={'Authorization-Key': 'header-secret-key'}",
            'headers={"Authorization": "Bearer dict-bearer-secret"}',
            "headers={'X-API-Key': 'x-api-secret-key'}",
            "headers={'User-Agent': 'safe', 'Authorization-Key': 'mixed-secret-key'}",
            "USAJOBS_API_KEY=usajobs-secret-key",
            "api_key=snake-secret-key",
            "api-key: kebab-secret-key",
            "postgresql://user:db-secret@localhost/pathos",
            "https://user:url-secret@example.com/path",
            '  File "app/adapters/usajobs/client.py", line 7, in search',
        ]
    )
    JobSyncRunRepo.create(
        _sync_run(
            run_id="sync-auth-sanitized",
            status="failed",
            records_fetched=0,
            new_jobs=0,
            updated_jobs=0,
            closed_jobs=0,
            failed_partitions=[],
            stale_partitions=[],
            alert_events_queued=0,
            indexing_events_queued=0,
            error_summary=unsafe_error,
        )
    )
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    payload = response.json()
    encoded = str(payload)
    assert response.status_code == 200
    assert payload["status"] == "failed"
    assert "High-level upstream auth failure remains visible" in payload["error_summary"]
    for forbidden in (
        "basic-secret-123",
        "token-secret-123",
        "bearer-secret-123",
        "lowercase-secret-123",
        "header-secret-key",
        "dict-bearer-secret",
        "x-api-secret-key",
        "mixed-secret-key",
        "usajobs-secret-key",
        "snake-secret-key",
        "kebab-secret-key",
        "db-secret",
        "url-secret",
        "Authorization: Basic",
        "Authorization: Token",
        "Authorization: Bearer",
        "authorization: basic",
        "anything",
        "with",
        "spaces",
        "headers={'Authorization-Key'",
        'headers={"Authorization"',
        "headers={'X-API-Key'",
        "postgresql://user:",
        "https://user:",
        'File "app/adapters/usajobs/client.py"',
    ):
        assert forbidden not in encoded


def test_usajobs_sync_health_handles_malformed_partition_json(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "ops_health_malformed_partition.db"
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    JobSyncRunRepo.create(
        _sync_run(
            run_id="sync-malformed-partitions",
            failed_partitions=[],
            stale_partitions=[],
        )
    )
    with connect() as conn:
        conn.execute(
            """
            UPDATE job_sync_runs
            SET failed_partitions_json = ?
            WHERE id = ?
            """,
            ("{not-json", "sync-malformed-partitions"),
        )
        conn.commit()
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    payload = response.json()
    encoded = str(payload)
    assert response.status_code == 200
    assert payload["status"] == "degraded"
    assert payload["failed_partitions"] == [
        {
            "reason": "malformed_failed_partitions_json",
            "detail": "partition summary unavailable",
        }
    ]
    assert "{not-json" not in encoded


def test_usajobs_sync_health_handles_malformed_stale_partition_json(
    monkeypatch, tmp_path
) -> None:
    db_path = tmp_path / "ops_health_malformed_stale_partition.db"
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    JobSyncRunRepo.create(
        _sync_run(
            run_id="sync-malformed-stale-partitions",
            failed_partitions=[],
            stale_partitions=[],
        )
    )
    with connect() as conn:
        conn.execute(
            """
            UPDATE job_sync_runs
            SET stale_partitions_json = ?
            WHERE id = ?
            """,
            ("{not-json", "sync-malformed-stale-partitions"),
        )
        conn.commit()
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/v1/ops/usajobs-sync/health", headers=_headers())

    payload = response.json()
    encoded = str(payload)
    assert response.status_code == 200
    assert payload["status"] == "degraded"
    assert payload["stale_partitions"] == [
        {
            "reason": "malformed_stale_partitions_json",
            "detail": "partition summary unavailable",
        }
    ]
    assert payload["close_missing_skipped"] is True
    assert payload["close_missing_skip_reason"] == "malformed_stale_partitions_json"
    assert "{not-json" not in encoded
