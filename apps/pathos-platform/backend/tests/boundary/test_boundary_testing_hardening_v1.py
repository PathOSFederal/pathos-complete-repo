from __future__ import annotations

from fastapi.testclient import TestClient

from app.db.repo.alert_scheduler_lock_repo import AlertSchedulerLockRepo
from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata
from app.main import create_app
from app.models.job_search import JobSearchResponse


def test_boundary__jobs_search_results_per_page_min_max_and_overflow(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # Pagination limits are contract boundaries for clients and upstream cost control.
    # A failure here means callers can send invalid windows or unexpectedly fail valid ones.
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "boundary_page_size_limits.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: JobSearchResponse(
            results=[
                CanonicalJob(
                    id="J-BOUNDARY",
                    title="Analyst",
                    organization="Agency",
                    locations=["Remote"],
                    compensation=CanonicalCompensation(),
                    open_date=None,
                    close_date=None,
                    apply_url="https://example.com",
                    source=CanonicalSourceMetadata(
                        source="USAJOBS",
                        retrieved_at="2026-02-21T00:00:00+00:00",
                        mapper_version="usajobs-normalize-v1",
                    ),
                )
            ],
            total=1,
            page=1,
            page_size=20,
            request_id="req-boundary",
        ),
    )
    app = create_app()

    with TestClient(app) as client:
        min_ok = client.post("/api/v1/jobs/search", json={"keyword": "analyst", "page_size": 1})
        max_ok = client.post("/api/v1/jobs/search", json={"keyword": "analyst", "page_size": 100})
        over_limit = client.post("/api/v1/jobs/search", json={"keyword": "analyst", "page_size": 101})

    assert min_ok.status_code == 200
    assert max_ok.status_code == 200
    assert over_limit.status_code == 422


def test_boundary__lock_repo_reclaims_expired_lock_at_exact_cutoff(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # Lock timing boundary correctness prevents duplicate schedulers and deadlocks.
    # The cutoff comparison must consistently free expired ownership.
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "boundary_lock_cutoff.db"))

    first = AlertSchedulerLockRepo.try_acquire(
        lock_name="alerts.run.enabled_rules",
        owner_run_id="run-old",
        acquired_at="2026-02-20T00:00:00+00:00",
        expires_at="2026-02-20T00:05:00+00:00",
    )
    reclaimed = AlertSchedulerLockRepo.try_acquire(
        lock_name="alerts.run.enabled_rules",
        owner_run_id="run-new",
        acquired_at="2026-02-20T00:05:00+00:00",
        expires_at="2026-02-20T00:10:00+00:00",
    )
    wrong_owner_release = AlertSchedulerLockRepo.release(lock_name="alerts.run.enabled_rules", owner_run_id="run-old")
    right_owner_release = AlertSchedulerLockRepo.release(lock_name="alerts.run.enabled_rules", owner_run_id="run-new")

    assert first is True
    assert reclaimed is True
    assert wrong_owner_release is False
    assert right_owner_release is True
