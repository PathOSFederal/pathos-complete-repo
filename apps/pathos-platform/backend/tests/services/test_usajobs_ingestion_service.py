from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
from typing import Any

import pytest

from app.adapters.usajobs.errors import (
    UpstreamAuthError,
    UpstreamConfigError,
    UpstreamRateLimitError,
    UpstreamResponseError,
    UpstreamUnavailableError,
)
from app.adapters.usajobs.normalize import NormalizedUSAJobsItem
from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.db.connection import connect
from app.db.repo.job_sync_run_repo import JobSyncRunRepo
from app.db.repo.saved_search_ingested_job_repo import SavedSearchIngestedJobRepo
from app.db.repo.upstream_audit_repo import UpstreamAuditRepo
from app.db.repo.usajobs_sync_event_repo import USAJobsSyncEventRepo
from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata
from app.models.job_search import JobSearchRequest, JobSearchResponse
from app.models.saved_search import SavedSearchCreateRequest
from app.services.job_search_service import JobSearchExecutionResult
from app.services.job_search_service import JobSearchConfigError
from app.services.job_search_service import JobSearchRateLimitedError
from app.services.job_search_service import JobSearchService
from app.services.job_search_service import JobSearchUpstreamAuthError
from app.services.job_search_service import JobSearchUpstreamSchemaError
from app.services.job_search_service import JobSearchUpstreamUnavailableError
from app.services.saved_search_service import SavedSearchService
from app.services.usajobs_ingestion_service import USAJobsIngestionService

DAY49_FIXTURE_PATH = Path(__file__).parents[1] / "fixtures" / "usajobs_search_day49_canonical.json"


def _canonical_job(
    job_id: str,
    *,
    title: str = "Analyst",
    locations: list[str] | None = None,
    retrieved_at: str = "2026-02-20T00:00:00+00:00",
    close_date: str = "2026-03-15",
) -> CanonicalJob:
    return CanonicalJob(
        id=job_id,
        title=title,
        organization="Agency",
        locations=locations if locations is not None else ["Remote"],
        compensation=CanonicalCompensation(grade_min=11, grade_max=12),
        open_date="2026-02-01",
        close_date=close_date,
        apply_url=f"https://www.usajobs.gov/job/{job_id}/apply",
        source=CanonicalSourceMetadata(
            source="USAJOBS",
            retrieved_at=retrieved_at,
            mapper_version="usajobs-normalize-v1",
        ),
    )


def _execution(job_ids: list[str], *, source_name: str = "USAJOBS_OFFICIAL_API") -> JobSearchExecutionResult:
    jobs = [_canonical_job(job_id) for job_id in job_ids]
    return JobSearchExecutionResult(
        response=JobSearchResponse(
            results=jobs,
            total=len(jobs),
            page=1,
            page_size=20,
            request_id="req-1",
        ),
        normalized_items=tuple(
            NormalizedUSAJobsItem(
                job=job,
                warnings=("MISSING_APPLY_URL_FALLBACK_USED",) if job.id == "J2" else (),
            )
            for job in jobs
        ),
        query_fingerprint="fp-1",
        mapper_version="usajobs-normalize-v1",
        source_name=source_name,
        fetched_at="2026-02-20T00:00:00+00:00",
        upstream_audit_id="audit-1",
        upstream_raw_hash="raw-1",
        query_slice={
            "page": 1,
            "page_size": 20,
            "remote_only": False,
            "query_fingerprint": "fp-1",
        },
    )


def _execution_with_total(job_ids: list[str], *, total: int) -> JobSearchExecutionResult:
    execution = _execution(job_ids)
    return JobSearchExecutionResult(
        response=JobSearchResponse(
            results=list(execution.response.results),
            total=total,
            page=execution.response.page,
            page_size=execution.response.page_size,
            request_id=execution.response.request_id,
        ),
        normalized_items=execution.normalized_items,
        query_fingerprint=execution.query_fingerprint,
        mapper_version=execution.mapper_version,
        source_name=execution.source_name,
        fetched_at=execution.fetched_at,
        upstream_audit_id=execution.upstream_audit_id,
        upstream_raw_hash=execution.upstream_raw_hash,
        query_slice=execution.query_slice,
    )


def _complete_partition_identity(saved_search_id: str) -> dict[str, str]:
    return {
        "saved_search_id": saved_search_id,
        "query_fingerprint": "fp-1",
        "scope": "complete_saved_search_partition",
    }


def _create_saved_search() -> str:
    created = SavedSearchService.create(
        SavedSearchCreateRequest(
            name="Bounded Ingestion",
            query=JobSearchRequest(keyword="analyst"),
        )
    )
    return created.id


def _table_count(table_name: str) -> int:
    with connect() as conn:
        return int(conn.execute(f"SELECT COUNT(1) FROM {table_name}").fetchone()[0])


def _change_types(saved_search_id: str) -> list[str]:
    return [
        str(row["change_type"])
        for row in SavedSearchIngestedJobRepo.list_change_log(saved_search_id)
    ]


def _day49_payload() -> dict[str, Any]:
    return json.loads(DAY49_FIXTURE_PATH.read_text(encoding="utf-8"))


def _day49_single_item_payload(*, item_index: int = 0) -> dict[str, Any]:
    payload = _day49_payload()
    item = deepcopy(payload["SearchResult"]["SearchResultItems"][item_index])
    payload["SearchResult"]["SearchResultCountAll"] = 1
    payload["SearchResult"]["SearchResultItems"] = [item]
    return payload


def test_usajobs_ingestion_service_enforces_official_source(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_source_guard.db"))
    saved_search_id = _create_saved_search()

    with pytest.raises(ValueError, match="official USAJOBS API"):
        USAJobsIngestionService.ingest_saved_search_results(
            saved_search_id=saved_search_id,
            execution=_execution(["J1"], source_name="NON_OFFICIAL_SOURCE"),
            trigger_mode="saved_search_runner",
        )


def test_usajobs_ingestion_service_persists_provenance_summary(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_summary.db"))
    saved_search_id = _create_saved_search()

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    alert_events = USAJobsSyncEventRepo.list_events("alert")
    indexing_events = USAJobsSyncEventRepo.list_events("indexing")
    health = JobSyncRunRepo.latest_health()

    assert summary["new_count"] == 2
    assert summary["updated_count"] == 0
    assert summary["unchanged_count"] == 0
    assert summary["warning_count"] == 1
    assert summary["alert_events_queued"] == 2
    assert summary["indexing_events_queued"] == 2
    assert health["alert_events_queued"] == 2
    assert health["indexing_events_queued"] == 2
    assert len(rows) == 2
    assert [row["event_type"] for row in alert_events] == [
        "SAVED_SEARCH_JOB_NEW",
        "SAVED_SEARCH_JOB_NEW",
    ]
    assert [row["event_type"] for row in indexing_events] == [
        "URL_UPDATED",
        "URL_UPDATED",
    ]
    assert {row["status"] for row in alert_events + indexing_events} == {"queued"}
    with connect() as conn:
        alerts_count = conn.execute("SELECT COUNT(1) FROM alerts").fetchone()[0]
        delivery_count = conn.execute("SELECT COUNT(1) FROM alert_delivery_log").fetchone()[0]
    assert alerts_count == 0
    assert delivery_count == 0
    first_slice = json.loads(rows[0]["source_slice_json"])
    assert first_slice["trigger_mode"] == "saved_search_runner"
    assert first_slice["query_fingerprint"] == "fp-1"
    assert rows[0]["source"] == "USAJOBS_OFFICIAL_API"
    assert rows[0]["mapper_version"] == "usajobs-normalize-v1"
    assert rows[0]["lifecycle_state"] == "open"
    payload = json.loads(alert_events[0]["payload_summary_json"])
    assert payload["source"] == "USAJOBS_OFFICIAL_API"
    assert "USAJOBS_API_KEY" not in json.dumps(payload)
    assert "Authorization" not in json.dumps(payload)


def test_usajobs_ingestion_queue_failure_rolls_back_sync_run_and_queue_rows(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_queue_atomic.db"))
    saved_search_id = _create_saved_search()
    original_enqueue = USAJobsSyncEventRepo.enqueue
    calls = {"count": 0}

    def _enqueue_then_fail_on_second_call(**kwargs: Any) -> bool:
        calls["count"] += 1
        if calls["count"] == 2:
            raise RuntimeError("simulated queue/counter transaction failure")
        return original_enqueue(**kwargs)

    monkeypatch.setattr(USAJobsSyncEventRepo, "enqueue", _enqueue_then_fail_on_second_call)

    with pytest.raises(RuntimeError, match="simulated queue"):
        USAJobsIngestionService.ingest_saved_search_results(
            saved_search_id=saved_search_id,
            execution=_execution(["J1"]),
            trigger_mode="saved_search_runner",
        )

    with connect() as conn:
        sync_run_count = conn.execute("SELECT COUNT(1) FROM job_sync_runs").fetchone()[0]
        alert_event_count = conn.execute("SELECT COUNT(1) FROM job_alert_events").fetchone()[0]
        indexing_event_count = conn.execute(
            "SELECT COUNT(1) FROM job_page_indexing_events"
        ).fetchone()[0]
        canonical_count = conn.execute(
            "SELECT COUNT(1) FROM saved_search_ingested_jobs WHERE saved_search_id = ?",
            (saved_search_id,),
        ).fetchone()[0]
        change_count = conn.execute(
            "SELECT COUNT(1) FROM job_change_log WHERE saved_search_id = ?",
            (saved_search_id,),
        ).fetchone()[0]

    assert sync_run_count == 0
    assert alert_event_count == 0
    assert indexing_event_count == 0
    assert canonical_count == 0
    assert change_count == 0

    monkeypatch.setattr(USAJobsSyncEventRepo, "enqueue", original_enqueue)
    retry_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="saved_search_runner",
    )
    assert retry_summary["new_count"] == 1
    assert retry_summary["alert_events_queued"] == 1
    assert retry_summary["indexing_events_queued"] == 1
    assert len(SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)) == 1
    assert _change_types(saved_search_id) == ["new"]


def test_usajobs_ingestion_counter_failure_rolls_back_queue_transaction(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_counter_atomic.db"))
    saved_search_id = _create_saved_search()
    original_update = JobSyncRunRepo.update_event_counts

    def _update_then_fail(**kwargs: Any) -> None:
        original_update(**kwargs)
        raise RuntimeError("simulated counter update failure")

    monkeypatch.setattr(JobSyncRunRepo, "update_event_counts", _update_then_fail)

    with pytest.raises(RuntimeError, match="simulated counter"):
        USAJobsIngestionService.ingest_saved_search_results(
            saved_search_id=saved_search_id,
            execution=_execution(["J1"]),
            trigger_mode="saved_search_runner",
        )

    with connect() as conn:
        sync_run_count = conn.execute("SELECT COUNT(1) FROM job_sync_runs").fetchone()[0]
        alert_event_count = conn.execute("SELECT COUNT(1) FROM job_alert_events").fetchone()[0]
        indexing_event_count = conn.execute(
            "SELECT COUNT(1) FROM job_page_indexing_events"
        ).fetchone()[0]
        canonical_count = conn.execute(
            "SELECT COUNT(1) FROM saved_search_ingested_jobs WHERE saved_search_id = ?",
            (saved_search_id,),
        ).fetchone()[0]
        change_count = conn.execute(
            "SELECT COUNT(1) FROM job_change_log WHERE saved_search_id = ?",
            (saved_search_id,),
        ).fetchone()[0]

    assert sync_run_count == 0
    assert alert_event_count == 0
    assert indexing_event_count == 0
    assert canonical_count == 0
    assert change_count == 0

    monkeypatch.setattr(JobSyncRunRepo, "update_event_counts", original_update)
    retry_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="saved_search_runner",
    )
    assert retry_summary["new_count"] == 1
    assert retry_summary["alert_events_queued"] == 1
    assert retry_summary["indexing_events_queued"] == 1
    assert len(SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)) == 1
    assert _change_types(saved_search_id) == ["new"]


def test_usajobs_ingestion_persists_real_normalized_canonical_fields(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_day49_canonical.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")
    saved_search_id = _create_saved_search()

    execution = JobSearchService.execute_search(
        search=JobSearchRequest(keyword="it", page=1, page_size=5),
        request_id="req-day49-canonical",
        client=_FakeUSAJobsClient(_day49_payload()),
        allow_cache=False,
        record_upstream_audit=False,
    )
    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=execution,
        trigger_mode="saved_search_runner",
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    remote_row = [
        row
        for row in rows
        if row["job_id"] == "800000001"
    ][0]
    canonical_job = json.loads(remote_row["canonical_job_json"])

    assert summary["new_count"] == 5
    assert summary["alert_events_queued"] == 5
    assert summary["indexing_events_queued"] == 5
    assert len(rows) == 5
    assert canonical_job["source_job_id"] == "800000001"
    assert canonical_job["announcement_number"] == "DE-800000001-26"
    assert canonical_job["agency"] == "Office of Personnel Management"
    assert canonical_job["department"] == "Office of Personnel Management"
    assert canonical_job["series"] == ["2210"]
    assert canonical_job["pay_plan"] == "GS"
    assert canonical_job["remote_status"] == "remote"
    assert canonical_job["telework_status"] == "not_eligible"
    assert canonical_job["documents"] == ["Resume", "SF-50"]
    assert canonical_job["qualifications"] == [
        "Experience with secure cloud delivery is qualifying.",
        "Must be able to obtain a public trust clearance.",
        "One year of specialized experience supporting federal IT systems.",
    ]
    assert canonical_job["source_url"] == "https://www.usajobs.gov/job/800000001"
    assert canonical_job["apply_url"] == "https://www.usajobs.gov/job/800000001/apply"


def test_usajobs_ingestion_normalized_field_change_logs_and_queues(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_day49_update.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")
    saved_search_id = _create_saved_search()
    first_payload = _day49_single_item_payload()
    second_payload = _day49_single_item_payload()
    details = second_payload["SearchResult"]["SearchResultItems"][0]["MatchedObjectDescriptor"]["UserArea"]["Details"]
    details["RequiredDocuments"] = "<ul><li>Resume</li><li>SF-50</li><li>Transcripts</li></ul>"
    details["QualificationsRequired"] = "Two years of specialized experience supporting federal IT systems."

    first_execution = JobSearchService.execute_search(
        search=JobSearchRequest(keyword="it", page=1, page_size=1),
        request_id="req-day49-change-1",
        client=_FakeUSAJobsClient(first_payload),
        allow_cache=False,
        record_upstream_audit=False,
    )
    second_execution = JobSearchService.execute_search(
        search=JobSearchRequest(keyword="it", page=1, page_size=1),
        request_id="req-day49-change-2",
        client=_FakeUSAJobsClient(second_payload),
        allow_cache=False,
        record_upstream_audit=False,
    )
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=first_execution,
        trigger_mode="saved_search_runner",
    )
    second_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=second_execution,
        trigger_mode="saved_search_runner",
    )
    changes = SavedSearchIngestedJobRepo.list_change_log(saved_search_id)
    updated_change = [
        row
        for row in changes
        if row["change_type"] == "updated"
    ][0]

    assert second_summary["updated_count"] == 1
    assert second_summary["alert_events_queued"] == 1
    assert second_summary["indexing_events_queued"] == 1
    assert json.loads(updated_change["changed_fields_json"]) == [
        "documents",
        "qualifications",
    ]
    assert len(USAJobsSyncEventRepo.list_events("alert")) == 2
    assert len(USAJobsSyncEventRepo.list_events("indexing")) == 2


def test_usajobs_ingestion_dry_run_with_real_payload_writes_no_rows(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "ingestion_day49_dry_run.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")

    execution = JobSearchService.execute_search(
        search=JobSearchRequest(keyword="it", page=1, page_size=5),
        request_id="req-day49-dry",
        client=_FakeUSAJobsClient(_day49_payload()),
        allow_cache=False,
        record_upstream_audit=False,
    )
    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id="dry-run-day49",
        execution=execution,
        trigger_mode="staging_validation",
        dry_run=True,
    )

    assert summary["dry_run"] is True
    assert summary["records_fetched"] == 5
    assert summary["alert_events_queued"] == 0
    assert summary["indexing_events_queued"] == 0
    assert not db_path.exists()


def test_usajobs_ingestion_dry_run_does_not_create_database(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "ingestion_dry_run.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id="dry-run-preview",
        execution=_execution(["J1", "J2"]),
        trigger_mode="staging_validation",
        dry_run=True,
    )

    assert summary["dry_run"] is True
    assert summary["records_fetched"] == 2
    assert summary["new_count"] == 2
    assert summary["alert_events_queued"] == 0
    assert summary["indexing_events_queued"] == 0
    assert not db_path.exists()


def test_usajobs_ingestion_repeat_sync_ignores_retrieved_at_only_change(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_repeat.db"))
    saved_search_id = _create_saved_search()
    first = _execution(["J1"])
    second_job = _canonical_job(
        "J1",
        retrieved_at="2026-02-20T00:10:00+00:00",
    )
    second = JobSearchExecutionResult(
        response=JobSearchResponse(
            results=[second_job],
            total=1,
            page=1,
            page_size=20,
            request_id="req-2",
        ),
        normalized_items=(NormalizedUSAJobsItem(job=second_job, warnings=()),),
        query_fingerprint="fp-1",
        mapper_version="usajobs-normalize-v1",
        source_name="USAJOBS_OFFICIAL_API",
        fetched_at="2026-02-20T00:10:00+00:00",
        upstream_audit_id="audit-2",
        upstream_raw_hash="raw-2",
        query_slice={
            "page": 1,
            "page_size": 20,
            "remote_only": False,
            "query_fingerprint": "fp-1",
        },
    )

    first_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=first,
        trigger_mode="saved_search_runner",
    )
    second_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=second,
        trigger_mode="saved_search_runner",
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    changes = SavedSearchIngestedJobRepo.list_change_log(saved_search_id)

    assert first_summary["new_count"] == 1
    assert first_summary["alert_events_queued"] == 1
    assert first_summary["indexing_events_queued"] == 1
    assert second_summary["unchanged_count"] == 1
    assert second_summary["updated_count"] == 0
    assert second_summary["alert_events_queued"] == 0
    assert second_summary["indexing_events_queued"] == 0
    assert int(rows[0]["unchanged_run_count"]) == 1
    assert [row["change_type"] for row in changes] == ["new"]
    assert len(USAJobsSyncEventRepo.list_events("alert")) == 1
    assert len(USAJobsSyncEventRepo.list_events("indexing")) == 1


def test_usajobs_ingestion_indexing_dedupe_spans_saved_searches(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_cross_search_indexing.db"))
    first_saved_search_id = _create_saved_search()
    second_saved_search_id = _create_saved_search()
    execution = _execution(["J1"])

    first_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=first_saved_search_id,
        execution=execution,
        trigger_mode="saved_search_runner",
    )
    second_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=second_saved_search_id,
        execution=execution,
        trigger_mode="saved_search_runner",
    )
    first_repeat = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=first_saved_search_id,
        execution=execution,
        trigger_mode="saved_search_runner",
    )
    second_repeat = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=second_saved_search_id,
        execution=execution,
        trigger_mode="saved_search_runner",
    )
    alert_events = USAJobsSyncEventRepo.list_events("alert")
    indexing_events = USAJobsSyncEventRepo.list_events("indexing")

    assert first_summary["alert_events_queued"] == 1
    assert first_summary["indexing_events_queued"] == 1
    assert second_summary["alert_events_queued"] == 1
    assert second_summary["indexing_events_queued"] == 0
    assert first_repeat["alert_events_queued"] == 0
    assert first_repeat["indexing_events_queued"] == 0
    assert second_repeat["alert_events_queued"] == 0
    assert second_repeat["indexing_events_queued"] == 0
    assert len(alert_events) == 2
    assert len(indexing_events) == 1
    assert {row["saved_search_id"] for row in alert_events} == {
        first_saved_search_id,
        second_saved_search_id,
    }
    assert indexing_events[0]["source_job_id"] == "J1"


def test_usajobs_ingestion_updated_job_queues_url_updated_and_alert(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_updated_events.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="saved_search_runner",
    )
    updated_job = _canonical_job("J1", title="Senior Analyst")
    updated_execution = JobSearchExecutionResult(
        response=JobSearchResponse(
            results=[updated_job],
            total=1,
            page=1,
            page_size=20,
            request_id="req-updated",
        ),
        normalized_items=(NormalizedUSAJobsItem(job=updated_job, warnings=()),),
        query_fingerprint="fp-1",
        mapper_version="usajobs-normalize-v1",
        source_name="USAJOBS_OFFICIAL_API",
        fetched_at="2026-02-20T00:30:00+00:00",
        upstream_audit_id="audit-updated",
        upstream_raw_hash="raw-updated",
        query_slice={
            "page": 1,
            "page_size": 20,
            "remote_only": False,
            "query_fingerprint": "fp-1",
        },
    )

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=updated_execution,
        trigger_mode="saved_search_runner",
    )
    alert_events = USAJobsSyncEventRepo.list_events("alert")
    indexing_events = USAJobsSyncEventRepo.list_events("indexing")

    assert summary["updated_count"] == 1
    assert summary["alert_events_queued"] == 1
    assert summary["indexing_events_queued"] == 1
    assert [row["event_type"] for row in alert_events] == [
        "SAVED_SEARCH_JOB_NEW",
        "SAVED_SEARCH_JOB_UPDATED",
    ]
    assert [row["event_type"] for row in indexing_events] == [
        "URL_UPDATED",
        "URL_UPDATED",
    ]
    assert json.loads(alert_events[-1]["payload_summary_json"])["title"] == "Senior Analyst"


def test_usajobs_ingestion_partial_partition_does_not_close_missing_jobs(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_partial_no_close.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution_with_total(["J1"], total=2),
        trigger_mode="saved_search_runner",
        close_missing=True,
        partition_complete=True,
        partition_identity=_complete_partition_identity(saved_search_id),
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    changes = SavedSearchIngestedJobRepo.list_change_log(saved_search_id)
    missing_job = [row for row in rows if row["job_id"] == "J2"][0]

    assert summary["closed_count"] == 0
    assert summary["close_missing_skipped"] is True
    assert summary["close_missing_skip_reason"] == "pagination_incomplete"
    assert missing_job["lifecycle_state"] == "open"
    assert "closed" not in [row["change_type"] for row in changes]
    assert [row["event_type"] for row in USAJobsSyncEventRepo.list_events("indexing")] == [
        "URL_UPDATED",
        "URL_UPDATED",
    ]


def test_usajobs_ingestion_close_missing_without_complete_partition_is_skipped(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_unproven_no_close.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="saved_search_runner",
        close_missing=True,
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    missing_job = [row for row in rows if row["job_id"] == "J2"][0]

    assert summary["closed_count"] == 0
    assert summary["close_missing_skip_reason"] == "partition_not_marked_complete"
    assert missing_job["lifecycle_state"] == "open"


def test_usajobs_ingestion_failed_partition_does_not_close_existing_jobs(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_failed_no_close.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )

    USAJobsIngestionService.record_failed_partition(
        saved_search_id=saved_search_id,
        trigger_mode="saved_search_runner",
        partition={"saved_search_id": saved_search_id, "query_fingerprint": "fp-1"},
        error_summary="JobSearchRateLimitedError",
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    changes = SavedSearchIngestedJobRepo.list_change_log(saved_search_id)

    assert {row["lifecycle_state"] for row in rows} == {"open"}
    assert "closed" not in [row["change_type"] for row in changes]
    assert [row["event_type"] for row in USAJobsSyncEventRepo.list_events("indexing")] == [
        "URL_UPDATED",
        "URL_UPDATED",
    ]


def test_usajobs_ingestion_dry_run_cannot_close_missing_jobs(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_dry_no_close.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="saved_search_runner",
        dry_run=True,
        close_missing=True,
        partition_complete=True,
        partition_identity=_complete_partition_identity(saved_search_id),
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    missing_job = [row for row in rows if row["job_id"] == "J2"][0]

    assert summary["dry_run"] is True
    assert summary["closed_count"] == 0
    assert summary["alert_events_queued"] == 0
    assert summary["indexing_events_queued"] == 0
    assert summary["close_missing_skip_reason"] == "dry_run"
    assert missing_job["lifecycle_state"] == "open"


def test_usajobs_ingestion_complete_partition_close_marks_lifecycle_and_queues_events(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_closed.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="complete_partition_validation",
        close_missing=True,
        partition_complete=True,
        partition_identity=_complete_partition_identity(saved_search_id),
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    changes = SavedSearchIngestedJobRepo.list_change_log(saved_search_id)
    closed = [row for row in rows if row["job_id"] == "J2"][0]

    assert summary["closed_count"] == 1
    assert summary["alert_events_queued"] == 1
    assert summary["indexing_events_queued"] == 1
    assert closed["lifecycle_state"] == "closed"
    assert closed["closed_at"] == "2026-02-20T00:00:00+00:00"
    assert [row["change_type"] for row in changes].count("closed") == 1
    assert USAJobsSyncEventRepo.list_events("alert")[-1]["event_type"] == "SAVED_SEARCH_JOB_CLOSED"
    assert USAJobsSyncEventRepo.list_events("indexing")[-1]["event_type"] == "URL_DELETED"


def test_usajobs_ingestion_close_missing_failure_rolls_back_lifecycle(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_close_rollback.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )
    original_update = JobSyncRunRepo.update_event_counts
    before_sync_runs = _table_count("job_sync_runs")
    before_alert_events = _table_count("job_alert_events")
    before_indexing_events = _table_count("job_page_indexing_events")
    before_changes = _change_types(saved_search_id)

    def _update_then_fail(**kwargs: Any) -> None:
        original_update(**kwargs)
        raise RuntimeError("simulated close-missing counter failure")

    monkeypatch.setattr(JobSyncRunRepo, "update_event_counts", _update_then_fail)

    with pytest.raises(RuntimeError, match="simulated close-missing"):
        USAJobsIngestionService.ingest_saved_search_results(
            saved_search_id=saved_search_id,
            execution=_execution(["J1"]),
            trigger_mode="complete_partition_validation",
            close_missing=True,
            partition_complete=True,
            partition_identity=_complete_partition_identity(saved_search_id),
        )

    rows_after_failure = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    missing_after_failure = [row for row in rows_after_failure if row["job_id"] == "J2"][0]
    indexing_types_after_failure = [
        str(row["event_type"])
        for row in USAJobsSyncEventRepo.list_events("indexing")
    ]

    assert missing_after_failure["lifecycle_state"] == "open"
    assert missing_after_failure["closed_at"] is None
    assert _change_types(saved_search_id) == before_changes
    assert "URL_DELETED" not in indexing_types_after_failure
    assert _table_count("job_sync_runs") == before_sync_runs
    assert _table_count("job_alert_events") == before_alert_events
    assert _table_count("job_page_indexing_events") == before_indexing_events

    monkeypatch.setattr(JobSyncRunRepo, "update_event_counts", original_update)
    retry_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="complete_partition_validation",
        close_missing=True,
        partition_complete=True,
        partition_identity=_complete_partition_identity(saved_search_id),
    )
    closed_after_retry = [
        row
        for row in SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
        if row["job_id"] == "J2"
    ][0]

    assert retry_summary["closed_count"] == 1
    assert retry_summary["indexing_events_queued"] == 1
    assert closed_after_retry["lifecycle_state"] == "closed"
    assert closed_after_retry["closed_at"] == "2026-02-20T00:00:00+00:00"
    assert "closed" in _change_types(saved_search_id)
    assert USAJobsSyncEventRepo.list_events("indexing")[-1]["event_type"] == "URL_DELETED"


def test_usajobs_ingestion_reappeared_closed_job_logs_reopen_and_queues_update(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_reopened.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="complete_partition_validation",
        close_missing=True,
        partition_complete=True,
        partition_identity=_complete_partition_identity(saved_search_id),
    )

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="complete_partition_validation",
        partition_complete=True,
        partition_identity=_complete_partition_identity(saved_search_id),
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    changes = SavedSearchIngestedJobRepo.list_change_log(saved_search_id)
    reopened = [row for row in rows if row["job_id"] == "J2"][0]

    assert summary["updated_count"] == 1
    assert summary["alert_events_queued"] == 1
    assert summary["indexing_events_queued"] == 1
    assert reopened["lifecycle_state"] == "open"
    assert reopened["closed_at"] is None
    assert "reopened" in [row["change_type"] for row in changes]
    assert USAJobsSyncEventRepo.list_events("indexing")[-1]["event_type"] == "URL_UPDATED"


def test_usajobs_ingestion_reappeared_failure_rolls_back_reopen(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_reopen_rollback.db"))
    saved_search_id = _create_saved_search()
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="saved_search_runner",
    )
    USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1"]),
        trigger_mode="complete_partition_validation",
        close_missing=True,
        partition_complete=True,
        partition_identity=_complete_partition_identity(saved_search_id),
    )
    original_update = JobSyncRunRepo.update_event_counts
    before_sync_runs = _table_count("job_sync_runs")
    before_alert_events = _table_count("job_alert_events")
    before_indexing_events = _table_count("job_page_indexing_events")
    before_changes = _change_types(saved_search_id)

    def _update_then_fail(**kwargs: Any) -> None:
        original_update(**kwargs)
        raise RuntimeError("simulated reopen counter failure")

    monkeypatch.setattr(JobSyncRunRepo, "update_event_counts", _update_then_fail)

    with pytest.raises(RuntimeError, match="simulated reopen"):
        USAJobsIngestionService.ingest_saved_search_results(
            saved_search_id=saved_search_id,
            execution=_execution(["J1", "J2"]),
            trigger_mode="complete_partition_validation",
            partition_complete=True,
            partition_identity=_complete_partition_identity(saved_search_id),
        )

    rows_after_failure = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    reappeared_after_failure = [row for row in rows_after_failure if row["job_id"] == "J2"][0]

    assert reappeared_after_failure["lifecycle_state"] == "closed"
    assert reappeared_after_failure["closed_at"] == "2026-02-20T00:00:00+00:00"
    assert _change_types(saved_search_id) == before_changes
    assert _table_count("job_sync_runs") == before_sync_runs
    assert _table_count("job_alert_events") == before_alert_events
    assert _table_count("job_page_indexing_events") == before_indexing_events

    monkeypatch.setattr(JobSyncRunRepo, "update_event_counts", original_update)
    retry_summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=_execution(["J1", "J2"]),
        trigger_mode="complete_partition_validation",
        partition_complete=True,
        partition_identity=_complete_partition_identity(saved_search_id),
    )
    reopened_after_retry = [
        row
        for row in SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
        if row["job_id"] == "J2"
    ][0]

    assert retry_summary["updated_count"] == 1
    assert retry_summary["indexing_events_queued"] == 1
    assert reopened_after_retry["lifecycle_state"] == "open"
    assert reopened_after_retry["closed_at"] is None
    assert "reopened" in _change_types(saved_search_id)
    assert USAJobsSyncEventRepo.list_events("indexing")[-1]["event_type"] == "URL_UPDATED"


def test_usajobs_ingestion_past_close_date_marks_job_expired(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_expired.db"))
    saved_search_id = _create_saved_search()
    expired_job = _canonical_job("J-EXPIRED", close_date="2026-02-15")

    summary = USAJobsIngestionService.ingest_saved_search_results(
        saved_search_id=saved_search_id,
        execution=JobSearchExecutionResult(
            response=JobSearchResponse(
                results=[expired_job],
                total=1,
                page=1,
                page_size=20,
                request_id="req-expired",
            ),
            normalized_items=(NormalizedUSAJobsItem(job=expired_job, warnings=()),),
            query_fingerprint="fp-1",
            mapper_version="usajobs-normalize-v1",
            source_name="USAJOBS_OFFICIAL_API",
            fetched_at="2026-02-20T00:00:00+00:00",
            upstream_audit_id="audit-expired",
            upstream_raw_hash="raw-expired",
            query_slice={
                "page": 1,
                "page_size": 20,
                "remote_only": False,
                "query_fingerprint": "fp-1",
            },
        ),
        trigger_mode="saved_search_runner",
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)

    assert summary["new_count"] == 1
    assert rows[0]["lifecycle_state"] == "expired"


def test_usajobs_ingestion_failed_partition_records_health(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "ingestion_failed.db"))

    result = USAJobsIngestionService.record_failed_partition(
        saved_search_id=None,
        trigger_mode="staging_validation",
        partition={"series": "2210", "location": "Florida", "page": 1},
        error_summary="UpstreamUnavailableError",
    )
    health = JobSyncRunRepo.latest_health()

    assert result["status"] == "failed"
    assert health["status"] == "failed"
    assert health["records_fetched"] == 0
    assert health["failed_partitions"] == [
        {"series": "2210", "location": "Florida", "page": 1}
    ]
    assert health["error_summary"] == "UpstreamUnavailableError"


def _official_payload(*, job_id: str, remote: bool, telework: bool, location: str) -> dict:
    return {
        "SearchResult": {
            "SearchResultCountAll": 1,
            "SearchResultItems": [
                {
                    "MatchedObjectId": job_id,
                    "MatchedObjectDescriptor": {
                        "PositionID": job_id,
                        "PositionTitle": "IT Specialist",
                        "OrganizationName": "Agency",
                        "PositionLocationDisplay": location,
                        "PositionLocation": [{"LocationName": location}],
                        "PositionRemuneration": [
                            {"MinimumRange": "90000", "MaximumRange": "120000"}
                        ],
                        "UserArea": {
                            "Details": {
                                "RemoteIndicator": remote,
                                "TeleworkEligible": telework,
                                "ApplyURI": [f"https://www.usajobs.gov/job/{job_id}/apply"],
                            }
                        },
                    },
                }
            ],
        }
    }


class _FakeUSAJobsClient:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def search_jobs(self, query_params: dict) -> USAJobsSearchResponse:
        return USAJobsSearchResponse(
            payload=self.payload,
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="query-hash-1",
                status_code=200,
                latency_ms=1,
                result_count=1,
                error_class=None,
            ),
        )


class _CountingUSAJobsClient:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.calls = 0

    def search_jobs(self, query_params: dict) -> USAJobsSearchResponse:
        self.calls += 1
        return USAJobsSearchResponse(
            payload=self.payload,
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="query-hash-counting",
                status_code=200,
                latency_ms=1,
                result_count=1,
                error_class=None,
            ),
        )


class _FailingUSAJobsClient:
    def __init__(self, exc: Exception) -> None:
        self.exc = exc

    def search_jobs(self, query_params: dict) -> USAJobsSearchResponse:
        raise self.exc


def test_job_search_preserves_raw_snapshot_for_write_path(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "raw_snapshot.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")
    payload = _official_payload(
        job_id="RAW-1",
        remote=True,
        telework=False,
        location="Remote",
    )

    execution = JobSearchService.execute_search(
        search=JobSearchRequest(keyword="it", page=1, page_size=1),
        request_id="req-raw",
        client=_FakeUSAJobsClient(payload),
        allow_cache=False,
    )
    audit_rows = UpstreamAuditRepo.list_recent(limit=1)

    assert execution.upstream_audit_id == audit_rows[0]["id"]
    assert execution.upstream_raw_hash == audit_rows[0]["upstream_raw_hash"]
    assert json.loads(audit_rows[0]["upstream_raw_payload_json"]) == payload


def test_job_search_dry_run_suppresses_raw_snapshot_write(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "raw_snapshot_dry_run.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")

    execution = JobSearchService.execute_search(
        search=JobSearchRequest(keyword="it", page=1, page_size=1),
        request_id="req-dry",
        client=_FakeUSAJobsClient(
            _official_payload(
                job_id="DRY-1",
                remote=True,
                telework=False,
                location="Remote",
            )
        ),
        allow_cache=False,
        record_upstream_audit=False,
    )

    assert execution.upstream_audit_id is None
    assert execution.upstream_raw_hash is not None
    assert not db_path.exists()


def test_job_search_dry_run_does_not_mutate_cache(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "dry_run_cache.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")
    JobSearchService.clear_cache()
    client = _CountingUSAJobsClient(
        _official_payload(
            job_id="CACHE-DRY-1",
            remote=True,
            telework=False,
            location="Remote",
        )
    )

    for request_number in range(2):
        execution = JobSearchService.execute_search(
            search=JobSearchRequest(keyword="it", page=1, page_size=1),
            request_id=f"req-dry-cache-{request_number}",
            client=client,
            allow_cache=True,
            record_upstream_audit=False,
        )
        assert execution.upstream_audit_id is None

    assert client.calls == 2
    assert not db_path.exists()


@pytest.mark.parametrize(
    ("upstream_exc", "service_exc"),
    [
        (UpstreamRateLimitError("rate limited"), JobSearchRateLimitedError),
        (UpstreamAuthError("bad credentials"), JobSearchUpstreamAuthError),
        (UpstreamConfigError("missing config"), JobSearchConfigError),
        (UpstreamUnavailableError("timeout"), JobSearchUpstreamUnavailableError),
        (UpstreamResponseError("schema drift"), JobSearchUpstreamSchemaError),
        (RuntimeError("unexpected adapter failure"), RuntimeError),
    ],
)
def test_job_search_dry_run_failure_paths_write_no_audit_rows(
    monkeypatch,
    tmp_path,
    upstream_exc: Exception,
    service_exc: type[Exception],
) -> None:
    db_path = tmp_path / f"dry_run_failure_{type(upstream_exc).__name__}.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")

    with pytest.raises(service_exc):
        JobSearchService.execute_search(
            search=JobSearchRequest(keyword="it", page=1, page_size=1),
            request_id="req-dry-failure",
            client=_FailingUSAJobsClient(upstream_exc),
            allow_cache=False,
            record_upstream_audit=False,
        )

    assert not db_path.exists()


def test_job_search_dry_run_schema_validation_failure_writes_no_audit_rows(
    monkeypatch, tmp_path
) -> None:
    db_path = tmp_path / "dry_run_schema_validation.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")

    with pytest.raises(JobSearchUpstreamSchemaError):
        JobSearchService.execute_search(
            search=JobSearchRequest(keyword="it", page=1, page_size=1),
            request_id="req-dry-schema",
            client=_FakeUSAJobsClient({"not": "a usajobs response"}),
            allow_cache=False,
            record_upstream_audit=False,
        )

    assert not db_path.exists()


def test_remote_only_filter_does_not_treat_telework_as_remote(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "telework_filter.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "tests@example.com")

    execution = JobSearchService.execute_search(
        search=JobSearchRequest(keyword="it", remote_only=True, page=1, page_size=1),
        request_id="req-telework",
        client=_FakeUSAJobsClient(
            _official_payload(
                job_id="TEL-1",
                remote=False,
                telework=True,
                location="Tampa, Florida",
            )
        ),
        allow_cache=False,
        record_upstream_audit=False,
    )

    assert execution.response.results == []
    assert execution.response.total == 0
