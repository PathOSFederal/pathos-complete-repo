from __future__ import annotations

import json

from app.db.repo.saved_search_ingested_job_repo import SavedSearchIngestedJobRepo
from app.models.job_search import JobSearchRequest
from app.models.saved_search import SavedSearchCreateRequest
from app.services.saved_search_service import SavedSearchService


def _create_saved_search() -> str:
    created = SavedSearchService.create(
        SavedSearchCreateRequest(
            name="Ingested Jobs",
            query=JobSearchRequest(keyword="analyst"),
        )
    )
    return created.id


def test_saved_search_ingested_job_repo_upsert_is_idempotent(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_search_ingested_jobs.db"))
    saved_search_id = _create_saved_search()
    canonical_job = {
        "id": "USA-1",
        "title": "Analyst",
        "organization": "Agency",
        "locations": ["Remote"],
        "compensation": {
            "grade_min": 11,
            "grade_max": 12,
            "salary_min": 75000,
            "salary_max": 98000,
        },
        "open_date": "2026-02-01",
        "close_date": "2026-02-15",
        "apply_url": "https://www.usajobs.gov/job/1/apply",
        "source": {
            "source": "USAJOBS",
            "retrieved_at": "2026-02-20T00:00:00+00:00",
            "mapper_version": "usajobs-normalize-v1",
        },
    }

    first = SavedSearchIngestedJobRepo.upsert(
        record_id="ing-1",
        saved_search_id=saved_search_id,
        job_id="USA-1",
        source="USAJOBS_OFFICIAL_API",
        source_slice={"page": 1, "page_size": 20, "trigger_mode": "saved_search_runner"},
        mapper_version="usajobs-normalize-v1",
        query_fingerprint="fp-1",
        upstream_audit_id="audit-1",
        upstream_raw_hash="raw-1",
        canonical_job=canonical_job,
        ingest_warnings=["MISSING_LOCATION_FALLBACK_USED"],
        seen_at="2026-02-20T00:00:00+00:00",
    )
    second = SavedSearchIngestedJobRepo.upsert(
        record_id="ing-2",
        saved_search_id=saved_search_id,
        job_id="USA-1",
        source="USAJOBS_OFFICIAL_API",
        source_slice={"page": 1, "page_size": 20, "trigger_mode": "saved_search_runner"},
        mapper_version="usajobs-normalize-v1",
        query_fingerprint="fp-1",
        upstream_audit_id="audit-1",
        upstream_raw_hash="raw-1",
        canonical_job=canonical_job,
        ingest_warnings=["MISSING_LOCATION_FALLBACK_USED"],
        seen_at="2026-02-20T00:05:00+00:00",
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)

    assert first == "new"
    assert second == "unchanged"
    assert len(rows) == 1
    assert json.loads(rows[0]["source_slice_json"])["trigger_mode"] == "saved_search_runner"
    assert json.loads(rows[0]["ingest_warnings_json"]) == ["MISSING_LOCATION_FALLBACK_USED"]
    assert rows[0]["upstream_raw_hash"] == "raw-1"
    assert int(rows[0]["unchanged_run_count"]) == 1


def test_saved_search_ingested_job_repo_marks_changed_payload_as_updated(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_search_ingested_jobs_updated.db"))
    saved_search_id = _create_saved_search()
    base_job = {
        "id": "USA-1",
        "title": "Analyst",
        "organization": "Agency",
        "locations": ["Remote"],
        "compensation": {
            "grade_min": 11,
            "grade_max": 12,
            "salary_min": 75000,
            "salary_max": 98000,
        },
        "open_date": None,
        "close_date": None,
        "apply_url": "https://www.usajobs.gov/job/1/apply",
        "source": {
            "source": "USAJOBS",
            "retrieved_at": "2026-02-20T00:00:00+00:00",
            "mapper_version": "usajobs-normalize-v1",
        },
    }
    SavedSearchIngestedJobRepo.upsert(
        record_id="ing-1",
        saved_search_id=saved_search_id,
        job_id="USA-1",
        source="USAJOBS_OFFICIAL_API",
        source_slice={"page": 1, "page_size": 20, "trigger_mode": "saved_search_runner"},
        mapper_version="usajobs-normalize-v1",
        query_fingerprint="fp-1",
        upstream_audit_id="audit-1",
        upstream_raw_hash="raw-1",
        canonical_job=base_job,
        ingest_warnings=[],
        seen_at="2026-02-20T00:00:00+00:00",
    )
    updated = SavedSearchIngestedJobRepo.upsert(
        record_id="ing-2",
        saved_search_id=saved_search_id,
        job_id="USA-1",
        source="USAJOBS_OFFICIAL_API",
        source_slice={"page": 1, "page_size": 20, "trigger_mode": "saved_search_runner"},
        mapper_version="usajobs-normalize-v1",
        query_fingerprint="fp-2",
        upstream_audit_id="audit-2",
        upstream_raw_hash="raw-2",
        canonical_job={**base_job, "title": "Senior Analyst"},
        ingest_warnings=[],
        seen_at="2026-02-20T00:05:00+00:00",
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)

    assert updated == "updated"
    assert len(rows) == 1
    assert rows[0]["query_fingerprint"] == "fp-2"
    assert rows[0]["upstream_audit_id"] == "audit-2"
    assert rows[0]["unchanged_run_count"] == 0
    assert json.loads(rows[0]["canonical_job_json"])["title"] == "Senior Analyst"


def test_saved_search_ingested_job_repo_prevents_duplicates(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_search_ingested_jobs_dupes.db"))
    saved_search_id = _create_saved_search()
    canonical_job = {
        "id": "USA-DUPE",
        "title": "Analyst",
        "organization": "Agency",
        "locations": ["Remote"],
        "compensation": {"grade_min": 11, "grade_max": 12},
        "open_date": None,
        "close_date": None,
        "apply_url": "https://www.usajobs.gov/job/dupe/apply",
        "source": {
            "source": "USAJOBS",
            "retrieved_at": "2026-02-20T00:00:00+00:00",
            "mapper_version": "usajobs-normalize-v1",
        },
    }

    first = SavedSearchIngestedJobRepo.upsert(
        record_id="ing-dupe-1",
        saved_search_id=saved_search_id,
        job_id="USA-DUPE",
        source="USAJOBS_OFFICIAL_API",
        source_slice={"page": 1},
        mapper_version="usajobs-normalize-v1",
        query_fingerprint="fp-dupe",
        upstream_audit_id="audit-dupe-1",
        upstream_raw_hash="raw-dupe-1",
        canonical_job=canonical_job,
        ingest_warnings=[],
        seen_at="2026-02-20T00:00:00+00:00",
    )
    second = SavedSearchIngestedJobRepo.upsert(
        record_id="ing-dupe-2",
        saved_search_id=saved_search_id,
        job_id="USA-DUPE",
        source="USAJOBS_OFFICIAL_API",
        source_slice={"page": 1},
        mapper_version="usajobs-normalize-v1",
        query_fingerprint="fp-dupe",
        upstream_audit_id="audit-dupe-2",
        upstream_raw_hash="raw-dupe-2",
        canonical_job=canonical_job,
        ingest_warnings=[],
        seen_at="2026-02-20T00:05:00+00:00",
    )
    rows = SavedSearchIngestedJobRepo.list_by_saved_search(saved_search_id)
    changes = SavedSearchIngestedJobRepo.list_change_log(saved_search_id)

    assert first == "new"
    assert second == "unchanged"
    assert len(rows) == 1
    assert [row["change_type"] for row in changes] == ["new"]


def test_saved_search_ingested_job_repo_logs_meaningful_canonical_field_changes(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_search_ingested_jobs_changes.db"))
    saved_search_id = _create_saved_search()
    base_job = {
        "id": "USA-CHANGE",
        "title": "IT Specialist",
        "organization": "Agency",
        "locations": ["Tampa, Florida"],
        "remote_status": "onsite",
        "documents": ["resume"],
        "qualifications": ["one year specialized experience"],
        "compensation": {
            "grade_min": 11,
            "grade_max": 12,
            "salary_min": 80000,
            "salary_max": 95000,
        },
        "open_date": "2026-02-01",
        "close_date": "2026-02-15",
        "apply_url": "https://www.usajobs.gov/job/change/apply",
        "source": {
            "source": "USAJOBS",
            "retrieved_at": "2026-02-20T00:00:00+00:00",
            "mapper_version": "usajobs-normalize-v1",
        },
    }
    updated_job = json.loads(json.dumps(base_job))
    updated_job["locations"] = ["Remote"]
    updated_job["remote_status"] = "remote"
    updated_job["documents"] = ["resume", "transcripts"]
    updated_job["qualifications"] = ["two years specialized experience"]
    updated_job["compensation"] = {
        "grade_min": 12,
        "grade_max": 13,
        "salary_min": 90000,
        "salary_max": 125000,
    }
    updated_job["close_date"] = "2026-02-28"

    SavedSearchIngestedJobRepo.upsert(
        record_id="ing-change-1",
        saved_search_id=saved_search_id,
        job_id="USA-CHANGE",
        source="USAJOBS_OFFICIAL_API",
        source_slice={"page": 1},
        mapper_version="usajobs-normalize-v1",
        query_fingerprint="fp-change-1",
        upstream_audit_id="audit-change-1",
        upstream_raw_hash="raw-change-1",
        canonical_job=base_job,
        ingest_warnings=[],
        seen_at="2026-02-20T00:00:00+00:00",
    )
    outcome = SavedSearchIngestedJobRepo.upsert(
        record_id="ing-change-2",
        saved_search_id=saved_search_id,
        job_id="USA-CHANGE",
        source="USAJOBS_OFFICIAL_API",
        source_slice={"page": 1},
        mapper_version="usajobs-normalize-v1",
        query_fingerprint="fp-change-2",
        upstream_audit_id="audit-change-2",
        upstream_raw_hash="raw-change-2",
        canonical_job=updated_job,
        ingest_warnings=[],
        seen_at="2026-02-20T00:05:00+00:00",
    )
    changes = SavedSearchIngestedJobRepo.list_change_log(saved_search_id)
    update_rows = [row for row in changes if row["change_type"] == "updated"]
    changed_fields = json.loads(update_rows[0]["changed_fields_json"])

    assert outcome == "updated"
    assert changed_fields == [
        "locations",
        "compensation",
        "close_date",
        "remote_status",
        "documents",
        "qualifications",
    ]
