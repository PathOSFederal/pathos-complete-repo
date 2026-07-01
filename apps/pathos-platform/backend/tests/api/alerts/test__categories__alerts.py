"""Slice 23 categories covered in this file:
- Use Case, Misuse Case, Boundary, Equivalence, Positive, Negative, Edge Case.
"""

from __future__ import annotations

import logging
import sqlite3

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata
from app.main import create_app
from app.models.job_search import JobSearchResponse
from app.services.job_search_service import JobSearchUpstreamUnavailableError
from usajobs_execution_helper import execution_from_response


def _mk_response(ids: list[str]) -> JobSearchResponse:
    return JobSearchResponse(
        results=[
            CanonicalJob(
                id=job_id,
                title="Title",
                organization="Agency",
                locations=["Remote"],
                compensation=CanonicalCompensation(),
                open_date=None,
                close_date=None,
                apply_url="https://example.com",
                source=CanonicalSourceMetadata(source="USAJOBS", retrieved_at="2026-02-13T00:00:00+00:00"),
            )
            for job_id in ids
        ],
        total=len(ids),
        page=1,
        page_size=20,
        request_id="req-1",
    )


def test_use_case__alerts_new_jobs_detected_on_second_run(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_use_case.db"))
    responses = iter([_mk_response(["A", "B"]), _mk_response(["A", "B", "C"])])
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: execution_from_response(next(responses)),
    )
    app = create_app()
    with TestClient(app) as client:
        created = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}})
        saved_id = created.json()["id"]
        client.post(f"/api/v1/saved-searches/{saved_id}/run")
        second = client.post(f"/api/v1/saved-searches/{saved_id}/run")
    assert second.status_code == 200
    assert second.json()["new_job_ids"] == ["C"]


def test_misuse_case__alerts_rate_limit_when_enabled(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_misuse.db"))
    monkeypatch.setenv("PATHOS_RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("PATHOS_RATE_LIMIT_RPM", "2")
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: execution_from_response(_mk_response(["A"])),
    )
    app = create_app()
    with TestClient(app) as client:
        saved_id = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()["id"]
        first = client.post(f"/api/v1/saved-searches/{saved_id}/run")
        second = client.post(f"/api/v1/saved-searches/{saved_id}/run")
    assert first.status_code == 200
    assert second.status_code == 429


def test_boundary__alerts_job_id_cap_applied(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_boundary.db"))
    big = [f"ID{i}" for i in range(250)]
    responses = iter([_mk_response([]), _mk_response(big)])
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: execution_from_response(next(responses)),
    )
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()["id"]
        client.post(f"/api/v1/saved-searches/{saved}/run")
        second = client.post(f"/api/v1/saved-searches/{saved}/run")
    assert second.status_code == 200
    assert len(second.json()["new_job_ids"]) == 200


def test_equivalence__alerts_order_change_same_set_no_new_ids(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_equivalence.db"))
    responses = iter([_mk_response(["A", "B"]), _mk_response(["B", "A"])])
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: execution_from_response(next(responses)),
    )
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()["id"]
        client.post(f"/api/v1/saved-searches/{saved}/run")
        second = client.post(f"/api/v1/saved-searches/{saved}/run")
    assert second.status_code == 200
    assert second.json()["new_job_ids"] == []


def test_positive__alerts_ack_sets_timestamp(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_positive.db"))
    responses = iter([_mk_response([]), _mk_response(["A"])])
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: execution_from_response(next(responses)),
    )
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()["id"]
        client.post(f"/api/v1/saved-searches/{saved}/run")
        client.post(f"/api/v1/saved-searches/{saved}/run")
        alert = client.get("/api/v1/alerts").json()[0]
        ack = client.post(f"/api/v1/alerts/{alert['id']}/ack")
    assert ack.status_code == 200
    assert ack.json()["alert"]["acknowledged_at"] is not None


def test_negative__alerts_upstream_failure_does_not_mutate_last_run(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_negative.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchUpstreamUnavailableError("down")),
    )
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: (_ for _ in ()).throw(JobSearchUpstreamUnavailableError("down")),
    )
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()["id"]
        failed = client.post(f"/api/v1/saved-searches/{saved}/run")
        refreshed = client.get(f"/api/v1/saved-searches/{saved}")
    assert failed.status_code == 503
    assert refreshed.json()["last_run_at"] is None


def test_edge_case__alerts_duplicate_ids_are_deduped(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_edge.db"))
    responses = iter([_mk_response([]), _mk_response(["A", "A", "B", "B"])])
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: execution_from_response(next(responses)),
    )
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()["id"]
        client.post(f"/api/v1/saved-searches/{saved}/run")
        second = client.post(f"/api/v1/saved-searches/{saved}/run")
    assert second.status_code == 200
    assert second.json()["new_job_ids"] == ["A", "B"]


def test_saved_search_run_existing_uuid_does_not_return_not_found_and_logs_correlation(
    monkeypatch, tmp_path, caplog
) -> None:  # noqa: ANN001
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_saved_search_run_uuid.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: execution_from_response(_mk_response(["A"])),
    )
    app = create_app()
    caplog.set_level(logging.INFO, logger="pathos.saved_search_run")

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()
        run = client.post(f"/api/v1/saved-searches/{saved['id']}/run")

    assert run.status_code == 200
    assert run.json()["saved_search_id"] == saved["id"]
    completion_rows = [
        getattr(record, "json_extra", {})
        for record in caplog.records
        if isinstance(getattr(record, "json_extra", None), dict)
        and getattr(record, "json_extra", {}).get("event_id") == "saved_search_runner_complete"
    ]
    assert completion_rows
    assert completion_rows[-1]["saved_search_id"] == saved["id"]


def test_saved_search_run_attempted_upstream_writes_audit_and_returns_empty_outcome(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "alerts_saved_search_upstream_audit.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "k1")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "agent@example.com")

    def _fake_search(self, query_params):  # noqa: ANN001
        del self, query_params
        return USAJobsSearchResponse(
            payload={"SearchResult": {"SearchResultItems": [], "SearchResultCountAll": 0}},
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="query-hash",
                status_code=200,
                latency_ms=5,
                result_count=0,
                error_class=None,
            ),
        )

    monkeypatch.setattr("app.services.job_search_service.USAJobsClient.search_jobs", _fake_search)
    app = create_app(mode="openapi")
    with TestClient(app) as client:
        saved_id = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()["id"]
        run = client.post(f"/api/v1/saved-searches/{saved_id}/run")

    assert run.status_code == 200
    assert run.json()["domain_outcome"] == "empty"
    assert run.json()["empty_reason"] == "UPSTREAM_ZERO_RESULTS"
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT COUNT(1) FROM upstream_api_audit_records WHERE endpoint = '/api/search'").fetchone()
    assert row is not None
    assert int(row[0]) == 1


def test_saved_search_run_config_missing_skips_without_upstream_audit(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "alerts_saved_search_skip_no_audit.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")
    app = create_app(mode="openapi")
    with TestClient(app) as client:
        saved_id = client.post("/api/v1/saved-searches", json={"name": "S", "filters": {"keyword": "analyst"}}).json()["id"]
        run = client.post(f"/api/v1/saved-searches/{saved_id}/run")

    assert run.status_code == 200
    assert run.json()["domain_outcome"] == "skipped"
    assert run.json()["skip_reason"] == "USJOBS_NOT_CONFIGURED"
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT COUNT(1) FROM upstream_api_audit_records WHERE endpoint = '/api/search'").fetchone()
    assert row is not None
    assert int(row[0]) == 0


def test_alert_rule_rejects_placeholder_delivery_mode_outside_local(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_ENV", "staging")
    monkeypatch.setenv("PATHOS_API_KEYS", "production-api-key-1234")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_placeholder_rejected.db"))
    app = create_app()

    with TestClient(app) as client:
        saved = client.post(
            "/api/v1/saved-searches",
            headers={"Authorization": "Bearer production-api-key-1234"},
            json={"name": "S", "filters": {"keyword": "analyst"}},
        ).json()
        response = client.post(
            "/api/v1/alert-rules",
            headers={"Authorization": "Bearer production-api-key-1234"},
            json={
                "saved_search_id": saved["id"],
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
                "delivery_mode": "email_digest_future",
            },
        )

    assert response.status_code == 400
