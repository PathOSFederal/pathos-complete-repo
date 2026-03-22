from __future__ import annotations

import os
from importlib.util import find_spec

import pytest

from app.core.config import refresh_settings
from app.db.connection import connect
from app.db.repo.alert_scheduler_lock_repo import AlertSchedulerLockRepo


def test_lock_repo_acquire_and_release(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "lock_repo.db"))

    acquired = AlertSchedulerLockRepo.try_acquire(
        lock_name="alerts.run.enabled_rules",
        owner_run_id="run-1",
        acquired_at="2026-02-14T00:00:00+00:00",
        expires_at="2026-02-14T01:00:00+00:00",
    )
    second = AlertSchedulerLockRepo.try_acquire(
        lock_name="alerts.run.enabled_rules",
        owner_run_id="run-2",
        acquired_at="2026-02-14T00:10:00+00:00",
        expires_at="2026-02-14T01:10:00+00:00",
    )
    released = AlertSchedulerLockRepo.release(lock_name="alerts.run.enabled_rules", owner_run_id="run-1")
    third = AlertSchedulerLockRepo.try_acquire(
        lock_name="alerts.run.enabled_rules",
        owner_run_id="run-3",
        acquired_at="2026-02-14T00:20:00+00:00",
        expires_at="2026-02-14T01:20:00+00:00",
    )

    assert acquired is True
    assert second is False
    assert released is True
    assert third is True


def test_lock_repo_acquire_and_release_postgres(monkeypatch) -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        pytest.skip("DATABASE_URL not set; skipping postgres lock repo test.")
    if find_spec("psycopg") is None:
        pytest.skip("psycopg not installed; skipping postgres lock repo test.")

    monkeypatch.setenv("DB_DIALECT", "postgres")
    monkeypatch.setenv("DATABASE_URL", database_url)
    refresh_settings()

    lock_name = "alerts.run.enabled_rules.pg-test"
    with connect() as conn:
        conn.execute("DELETE FROM alert_scheduler_locks WHERE lock_name = ?", (lock_name,))
        conn.commit()

    acquired = AlertSchedulerLockRepo.try_acquire(
        lock_name=lock_name,
        owner_run_id="run-1",
        acquired_at="2026-02-14T00:00:00+00:00",
        expires_at="2026-02-14T01:00:00+00:00",
    )
    second = AlertSchedulerLockRepo.try_acquire(
        lock_name=lock_name,
        owner_run_id="run-2",
        acquired_at="2026-02-14T00:10:00+00:00",
        expires_at="2026-02-14T01:10:00+00:00",
    )
    released = AlertSchedulerLockRepo.release(lock_name=lock_name, owner_run_id="run-1")
    third = AlertSchedulerLockRepo.try_acquire(
        lock_name=lock_name,
        owner_run_id="run-3",
        acquired_at="2026-02-14T00:20:00+00:00",
        expires_at="2026-02-14T01:20:00+00:00",
    )

    assert acquired is True
    assert second is False
    assert released is True
    assert third is True
