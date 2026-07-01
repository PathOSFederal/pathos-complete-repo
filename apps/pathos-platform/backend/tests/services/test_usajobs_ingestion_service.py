from __future__ import annotations

import json

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
from app.db.repo.job_sync_run_repo import JobSyncRunRepo
from app.db.repo.saved_search_ingested_job_repo import SavedSearchIngestedJobRepo
from app.db.repo.upstream_audit_repo import UpstreamAuditRepo
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


def _canonical_job(
    job_id: str,
    *,
    title: str = "Analyst",
    locations: list[str] | None = None,
    retrieved_at: str = "2026-02-20T00:00:00+00:00",
) -> CanonicalJob:
    return CanonicalJob(
        id=job_id,
        title=title,
        organization="Agency",
        locations=locations if locations is not None else ["Remote"],
        compensation=CanonicalCompensation(grade_min=11, grade_max=12),
        open_date="2026-02-01",
        close_date="2026-02-15",
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


def _create_saved_search() -> str:
    created = SavedSearchService.create(
        SavedSearchCreateRequest(
            name="Bounded Ingestion",
            query=JobSearchRequest(keyword="analyst"),
        )
    )
    return created.id


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

    assert summary["new_count"] == 2
    assert summary["updated_count"] == 0
    assert summary["unchanged_count"] == 0
    assert summary["warning_count"] == 1
    assert len(rows) == 2
    first_slice = json.loads(rows[0]["source_slice_json"])
    assert first_slice["trigger_mode"] == "saved_search_runner"
    assert first_slice["query_fingerprint"] == "fp-1"
    assert rows[0]["source"] == "USAJOBS_OFFICIAL_API"
    assert rows[0]["mapper_version"] == "usajobs-normalize-v1"
    assert rows[0]["lifecycle_state"] == "open"


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
    assert second_summary["unchanged_count"] == 1
    assert second_summary["updated_count"] == 0
    assert int(rows[0]["unchanged_run_count"]) == 1
    assert [row["change_type"] for row in changes] == ["new"]


def test_usajobs_ingestion_close_missing_marks_lifecycle_and_queues_events(monkeypatch, tmp_path) -> None:
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
