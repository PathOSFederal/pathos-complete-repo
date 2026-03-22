from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient

from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata
from app.main import create_app
from app.models.job_search import JobSearchResponse


def _search_response(job_ids: list[str]) -> JobSearchResponse:
    return JobSearchResponse(
        results=[
            CanonicalJob(
                id=job_id,
                title="Analyst",
                organization="Agency",
                locations=["Remote"],
                compensation=CanonicalCompensation(grade_min=11, grade_max=12),
                open_date=None,
                close_date=None,
                apply_url="https://example.com",
                source=CanonicalSourceMetadata(
                    source="USAJOBS",
                    retrieved_at="2026-02-14T00:00:00+00:00",
                    mapper_version="usajobs-normalize-v1",
                ),
            )
            for job_id in job_ids
        ],
        total=len(job_ids),
        page=1,
        page_size=20,
        request_id="req-1",
    )


def test_use_case__alerts_run_endpoint_is_idempotent(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "alerts_run_v1_use_case.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: _search_response(["J1"]),
    )
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.fingerprint_params", lambda _: "fp-fixed")
    app = create_app()

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        rule = client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        assert rule.status_code == 200

        first = client.post("/api/v1/alerts/run")
        second = client.post("/api/v1/alerts/run")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["triggers_count"] == 1
    assert second.json()["triggers_count"] == 0
    assert second.json()["suppressed_count"] >= 1

    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT COUNT(1) FROM alert_delivery_log").fetchone()
    assert row is not None and int(row[0]) == 1


def test_negative__alerts_run_handles_upstream_failure(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "alerts_run_v1_negative.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))

    def _boom(*a, **k):  # noqa: ANN002, ANN003
        from app.services.job_search_service import JobSearchUpstreamUnavailableError

        raise JobSearchUpstreamUnavailableError("down")

    monkeypatch.setattr("app.services.job_search_service.JobSearchService.search_jobs", _boom)
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        result = client.post("/api/v1/alerts/run")
    assert result.status_code == 200
    assert result.json()["status"] in {"partial_failure", "failed"}


def test_use_case__alert_rule_crud(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_rule_crud.db"))
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        created = client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 70, "max_per_day": 5, "cooldown_hours": 12},
        )
        assert created.status_code == 200
        rule_id = created.json()["id"]
        listed = client.get("/api/v1/alert-rules")
        fetched = client.get(f"/api/v1/alert-rules/{rule_id}")
        updated = client.put(
            f"/api/v1/alert-rules/{rule_id}",
            json={"min_score_threshold": 80, "max_per_day": 2, "cooldown_hours": 6, "enabled": False},
        )
        deleted = client.delete(f"/api/v1/alert-rules/{rule_id}")

    assert listed.status_code == 200
    assert fetched.status_code == 200
    assert updated.status_code == 200
    assert updated.json()["enabled"] is False
    assert deleted.status_code == 200


def test_checkpoint_cursor_is_used_for_resume_decision(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "alerts_checkpoint_resume.db"
    marker_cursor = {
        "strategy": "full_refresh",
        "last_successful_run_at": "2026-02-15T00:00:00+00:00",
        "last_query_fingerprint": "fp-prev",
    }
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: _search_response(["J1"]),
    )
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.fingerprint_params", lambda _: "fp-fixed")
    monkeypatch.setattr(
        "app.services.alerts_run_service.SavedSearchCheckpointService.determine_resume_cursor",
        lambda saved_search_id: marker_cursor,
    )
    captured: dict[str, object] = {}
    original_runner = __import__(
        "app.services.saved_search_runner_service",
        fromlist=["SavedSearchRunnerService"],
    ).SavedSearchRunnerService.run_saved_search

    def _wrapped(saved_search_id: str, request_id: str, *, resume_cursor=None):  # noqa: ANN001
        captured["resume_cursor"] = resume_cursor
        return original_runner(saved_search_id, request_id, resume_cursor=resume_cursor)

    monkeypatch.setattr(
        "app.services.saved_search_runner_service.SavedSearchRunnerService.run_saved_search",
        _wrapped,
    )
    app = create_app()

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        run = client.post("/api/v1/alerts/run")

    assert run.status_code == 200
    assert captured.get("resume_cursor") == marker_cursor


def test_alerts_rules_plural_create_enables_rule_evaluation_and_desktop_digest_visibility(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "alerts_rules_plural_create.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: _search_response(["J1", "J2"]),
    )
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.fingerprint_params", lambda _: "fp-fixed")
    app = create_app()

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        created_rule = client.post(
            "/api/v1/alerts/rules",
            json={
                "saved_search_id": saved["id"],
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
                "delivery_mode": "digest_payload",
            },
        )
        assert created_rule.status_code == 200

        listed_rules = client.get("/api/v1/desktop/alert-rules")
        run = client.post("/api/v1/alerts/run")
        latest_digests = client.get("/api/v1/desktop/digests/latest")

    assert listed_rules.status_code == 200
    assert any(row["id"] == created_rule.json()["id"] for row in listed_rules.json())
    assert run.status_code == 200
    assert run.json()["rules_evaluated"] >= 1
    assert run.json()["jobs_scanned"] > 0
    assert latest_digests.status_code == 200
    assert len(latest_digests.json()) >= 1


def test_use_case__alerts_run_reports_skip_reason_when_usajobs_not_configured(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "alerts_usajobs_missing.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        run = client.post("/api/v1/alerts/run")
        metrics = client.get("/api/v1/alerts/metrics/recent")

    assert run.status_code == 200
    body = run.json()
    assert body["status"] == "success"
    assert body["jobs_scanned"] == 0
    assert body["domain_outcome"] == "skipped"
    assert body["skip_reason"] == "USJOBS_NOT_CONFIGURED"
    assert isinstance(body.get("skip_details"), str)

    assert metrics.status_code == 200
    assert metrics.json()[0]["domain_outcome"] == "skipped"
    assert metrics.json()[0]["skip_reason"] == "USJOBS_NOT_CONFIGURED"
    assert metrics.json()[0]["backoff_events"]
    first_event = metrics.json()[0]["backoff_events"][0]
    assert first_event["code"] == "USJOBS_NOT_CONFIGURED"
    assert isinstance(first_event["message"], str) and first_event["message"]
    assert "detail" in first_event

    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT COUNT(1) FROM upstream_api_audit_records WHERE endpoint = '/api/search'").fetchone()
    assert row is not None
    assert int(row[0]) == 0


def test_use_case__alerts_run_returns_empty_outcome_when_no_jobs_scanned(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "alerts_empty_outcome.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: _search_response([]),
    )
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.fingerprint_params", lambda _: "fp-fixed")
    app = create_app()

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        run = client.post("/api/v1/alerts/run")
        metrics = client.get("/api/v1/alerts/metrics/recent")

    assert run.status_code == 200
    body = run.json()
    assert body["jobs_scanned"] == 0
    assert body["domain_outcome"] == "empty"
    assert body["empty_reason"] == "UNKNOWN"
    assert body["skip_reason"] is None

    assert metrics.status_code == 200
    assert metrics.json()[0]["domain_outcome"] == "empty"
    assert metrics.json()[0]["empty_reason"] == "UNKNOWN"
