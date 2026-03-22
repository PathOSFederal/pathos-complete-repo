from __future__ import annotations

from fastapi.testclient import TestClient

from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata
from app.main import create_app
from app.models.job_search import JobSearchResponse


def _search(ids: list[str]) -> JobSearchResponse:
    return JobSearchResponse(
        results=[
            CanonicalJob(
                id=job_id,
                title=f"Analyst {job_id}",
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
            for job_id in ids
        ],
        total=len(ids),
        page=1,
        page_size=20,
        request_id="req-1",
    )


def test_use_case__observability_desktop_and_retention_endpoints(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_obs_v1.db"))
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.search_jobs", lambda *a, **k: _search(["A", "B"]))
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.fingerprint_params", lambda _: "fp1")
    app = create_app()

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        rule = client.post(
            "/api/v1/alert-rules",
            json={
                "saved_search_id": saved["id"],
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
                "delivery_mode": "digest_payload",
            },
        ).json()

        run = client.post("/api/v1/alerts/run")
        assert run.status_code == 200

        runs = client.get("/api/v1/alerts/runs")
        history = client.get(f"/api/v1/alerts/rules/{rule['id']}/history")
        metrics = client.get("/api/v1/alerts/metrics/recent")
        digests = client.get("/api/v1/alerts/digests")
        desktop_digests = client.get("/api/v1/desktop/alerts/digests")
        desktop_latest = client.get("/api/v1/desktop/digests/latest")
        desktop_saved = client.get("/api/v1/desktop/saved-searches")
        desktop_rules = client.get("/api/v1/desktop/alert-rules")
        desktop_overview = client.get("/api/v1/desktop/overview")
        retain = client.post("/api/v1/alerts/digests/retain?keep_n=1")
        purge_old = client.delete("/api/v1/alerts/digests/purge?days=1")
        purge_rule_logs = client.delete(f"/api/v1/alerts/rules/{rule['id']}/logs")

    assert runs.status_code == 200 and len(runs.json()) >= 1
    assert history.status_code == 200 and len(history.json()) >= 1
    assert metrics.status_code == 200 and len(metrics.json()) >= 1
    assert digests.status_code == 200 and len(digests.json()) >= 1
    assert desktop_digests.status_code == 200
    assert desktop_latest.status_code == 200 and len(desktop_latest.json()) >= 1
    assert desktop_saved.status_code == 200
    assert desktop_rules.status_code == 200
    assert desktop_overview.status_code == 200
    assert "guardrail_config" in desktop_overview.json()
    assert len(desktop_overview.json().get("latest_digest_summaries", [])) >= 1
    latest_row = desktop_latest.json()[0]
    assert isinstance(latest_row["run_id"], str)
    assert isinstance(latest_row["jobs_scanned"], int)
    assert isinstance(latest_row["triggers_count"], int)
    assert isinstance(latest_row["suppressed_count"], int)
    assert isinstance(latest_row["summary"], str)
    assert retain.status_code == 200
    assert purge_old.status_code == 200
    assert purge_rule_logs.status_code == 200


def test_guardrails__min_interval_blocks_immediate_second_run(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_guardrails_v1.db"))
    monkeypatch.setenv("ALERT_RULE_MIN_INTERVAL_MINUTES", "10000")
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.search_jobs", lambda *a, **k: _search(["A"]))
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.fingerprint_params", lambda _: "fp1")
    app = create_app()

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        rule = client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        ).json()
        first = client.post("/api/v1/alerts/run")
        second = client.post("/api/v1/alerts/run")
        history = client.get(f"/api/v1/alerts/rules/{rule['id']}/history")

    assert first.status_code == 200
    assert second.status_code == 200
    assert history.status_code == 200
    assert any(row.get("error_summary") == "MIN_INTERVAL_GUARD" for row in history.json())


def test_guardrails__db_lock_prevents_concurrent_run(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alerts_lock_v1.db"))
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.search_jobs", lambda *a, **k: _search(["A"]))
    monkeypatch.setattr("app.services.job_search_service.JobSearchService.fingerprint_params", lambda _: "fp1")
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        from app.db.repo.alert_scheduler_lock_repo import AlertSchedulerLockRepo

        AlertSchedulerLockRepo.try_acquire(
            lock_name="alerts.run.enabled_rules",
            owner_run_id="external-holder",
            acquired_at="2026-02-14T00:00:00+00:00",
            expires_at="2099-01-01T00:00:00+00:00",
        )
        run = client.post("/api/v1/alerts/run")

    assert run.status_code == 200
    assert run.json()["status"] == "failed"
    assert "LOCK_NOT_ACQUIRED" in str(run.json().get("error_summary"))
