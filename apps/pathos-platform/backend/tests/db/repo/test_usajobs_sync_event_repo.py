from __future__ import annotations

import json

import pytest

from app.db.repo.job_sync_run_repo import JobSyncRunRepo
from app.db.repo.usajobs_sync_event_repo import QueueName, USAJobsSyncEventRepo
from app.models.job_search import JobSearchRequest
from app.models.saved_search import SavedSearchCreateRequest
from app.services.saved_search_service import SavedSearchService


def _saved_search_id(name: str) -> str:
    saved = SavedSearchService.create(
        SavedSearchCreateRequest(
            name=name,
            query=JobSearchRequest(keyword="analyst"),
        )
    )
    return saved.id


def _sync_run(sync_run_id: str, saved_search_id: str | None) -> None:
    JobSyncRunRepo.create(
        {
            "id": sync_run_id,
            "saved_search_id": saved_search_id,
            "source": "USAJOBS_OFFICIAL_API",
            "trigger_mode": "repo_test",
            "run_mode": "write",
            "status": "success",
            "started_at": "2026-02-20T00:00:00+00:00",
            "completed_at": "2026-02-20T00:00:00+00:00",
            "records_fetched": 1,
            "new_jobs": 1,
            "updated_jobs": 0,
            "unchanged_jobs": 0,
            "closed_jobs": 0,
            "failed_partitions": [],
            "stale_partitions": [],
            "alert_events_queued": 0,
            "indexing_events_queued": 0,
            "duration_ms": 1,
            "error_summary": None,
        }
    )


def _enqueue(
    *,
    queue_name: QueueName,
    sync_run_id: str,
    saved_search_id: str | None,
    dedupe_key: str,
) -> bool:
    return USAJobsSyncEventRepo.enqueue(
        queue_name=queue_name,
        sync_run_id=sync_run_id,
        saved_search_id=saved_search_id,
        source_job_id="J1",
        canonical_job_id="J1",
        event_type="URL_UPDATED" if queue_name == "indexing" else "SAVED_SEARCH_JOB_NEW",
        reason="repo_duplicate_test",
        payload_summary={
            "source": "USAJOBS_OFFICIAL_API",
            "source_job_id": "J1",
            "canonical_hash": "hash-1",
        },
        dedupe_key=dedupe_key,
        created_at="2026-02-20T00:00:00+00:00",
    )


def test_usajobs_sync_event_repo_dedupes_duplicate_indexing_enqueue(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "queue_repo_indexing.db"))
    _sync_run("sync-indexing-1", None)

    first_inserted = _enqueue(
        queue_name="indexing",
        sync_run_id="sync-indexing-1",
        saved_search_id=None,
        dedupe_key="indexing:J1:hash-1",
    )
    second_inserted = _enqueue(
        queue_name="indexing",
        sync_run_id="sync-indexing-1",
        saved_search_id=None,
        dedupe_key="indexing:J1:hash-1",
    )
    rows = USAJobsSyncEventRepo.list_events("indexing")

    assert first_inserted is True
    assert second_inserted is False
    assert len(rows) == 1
    assert json.loads(rows[0]["payload_summary_json"])["canonical_hash"] == "hash-1"


def test_usajobs_sync_event_repo_alert_dedupe_is_saved_search_scoped(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "queue_repo_alert.db"))
    first_saved_search_id = _saved_search_id("Alert Queue 1")
    second_saved_search_id = _saved_search_id("Alert Queue 2")
    _sync_run("sync-alert-1", first_saved_search_id)
    _sync_run("sync-alert-2", second_saved_search_id)

    first_inserted = _enqueue(
        queue_name="alert",
        sync_run_id="sync-alert-1",
        saved_search_id=first_saved_search_id,
        dedupe_key=f"alert:{first_saved_search_id}:J1:hash-1",
    )
    second_saved_search_inserted = _enqueue(
        queue_name="alert",
        sync_run_id="sync-alert-2",
        saved_search_id=second_saved_search_id,
        dedupe_key=f"alert:{second_saved_search_id}:J1:hash-1",
    )
    duplicate_first_inserted = _enqueue(
        queue_name="alert",
        sync_run_id="sync-alert-1",
        saved_search_id=first_saved_search_id,
        dedupe_key=f"alert:{first_saved_search_id}:J1:hash-1",
    )
    rows = USAJobsSyncEventRepo.list_events("alert")

    assert first_inserted is True
    assert second_saved_search_inserted is True
    assert duplicate_first_inserted is False
    assert len(rows) == 2
    assert {row["saved_search_id"] for row in rows} == {
        first_saved_search_id,
        second_saved_search_id,
    }


def test_usajobs_sync_event_repo_rejects_invalid_queue_name(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "queue_repo_invalid.db"))
    _sync_run("sync-invalid-queue", None)

    with pytest.raises(ValueError, match="queue_name"):
        USAJobsSyncEventRepo.enqueue(
            queue_name="notifications",
            sync_run_id="sync-invalid-queue",
            saved_search_id=None,
            source_job_id="J1",
            canonical_job_id="J1",
            event_type="URL_UPDATED",
            reason="invalid_queue_test",
            payload_summary={
                "source": "USAJOBS_OFFICIAL_API",
                "source_job_id": "J1",
                "canonical_hash": "hash-1",
            },
            dedupe_key="invalid:J1:hash-1",
            created_at="2026-02-20T00:00:00+00:00",
        )

    assert USAJobsSyncEventRepo.list_events("alert") == []
    assert USAJobsSyncEventRepo.list_events("indexing") == []
