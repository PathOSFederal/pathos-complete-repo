from __future__ import annotations

import sqlite3

from app.models.job_search import JobSearchRequest
from app.models.saved_search import SavedSearchCreateRequest
from app.services.saved_search_checkpoint_service import SavedSearchCheckpointService
from app.services.saved_search_service import SavedSearchService


def _create_saved_search() -> str:
    created = SavedSearchService.create(
        SavedSearchCreateRequest(
            name="Checkpoint",
            query=JobSearchRequest(keyword="analyst"),
        )
    )
    return created.id


def test_checkpoint_updates_only_on_success(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "checkpoint_success_rules.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    saved_search_id = _create_saved_search()

    SavedSearchCheckpointService.record_outcome(
        run_id="run-success-1",
        alert_run_id="alert-run-1",
        alert_rule_id="rule-1",
        saved_search_id=saved_search_id,
        status="success",
        jobs_scanned=5,
        triggers_count=2,
        suppressed_count=3,
        query_fingerprint="fp-1",
        cursor_used={"strategy": "full_refresh", "last_successful_run_at": None, "last_query_fingerprint": None},
        error_summary=None,
        completed_at="2026-02-16T00:00:00+00:00",
    )
    first = SavedSearchCheckpointService.get_last_successful(saved_search_id)
    assert first is not None
    assert first["last_successful_run_id"] == "run-success-1"
    assert first["cursor_state"]["last_query_fingerprint"] == "fp-1"

    SavedSearchCheckpointService.record_outcome(
        run_id="run-failed-2",
        alert_run_id="alert-run-2",
        alert_rule_id="rule-1",
        saved_search_id=saved_search_id,
        status="failed",
        jobs_scanned=0,
        triggers_count=0,
        suppressed_count=0,
        query_fingerprint=None,
        cursor_used={"strategy": "full_refresh", "last_successful_run_at": "2026-02-16T00:00:00+00:00"},
        error_summary="UpstreamError",
        completed_at="2026-02-16T00:05:00+00:00",
    )
    second = SavedSearchCheckpointService.get_last_successful(saved_search_id)
    assert second is not None
    assert second["last_successful_run_id"] == "run-success-1"


def test_checkpoint_ledger_is_idempotent_by_run_id(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "checkpoint_idempotent.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    saved_search_id = _create_saved_search()

    base_cursor = {"strategy": "full_refresh", "last_successful_run_at": None, "last_query_fingerprint": None}
    SavedSearchCheckpointService.record_outcome(
        run_id="run-constant",
        alert_run_id="alert-run-1",
        alert_rule_id="rule-1",
        saved_search_id=saved_search_id,
        status="success",
        jobs_scanned=1,
        triggers_count=1,
        suppressed_count=0,
        query_fingerprint="fp-a",
        cursor_used=base_cursor,
        error_summary=None,
        completed_at="2026-02-16T01:00:00+00:00",
    )
    SavedSearchCheckpointService.record_outcome(
        run_id="run-constant",
        alert_run_id="alert-run-1",
        alert_rule_id="rule-1",
        saved_search_id=saved_search_id,
        status="success",
        jobs_scanned=4,
        triggers_count=2,
        suppressed_count=2,
        query_fingerprint="fp-b",
        cursor_used=base_cursor,
        error_summary=None,
        completed_at="2026-02-16T01:05:00+00:00",
    )

    with sqlite3.connect(db_path) as conn:
        count = conn.execute("SELECT COUNT(1) FROM saved_search_ingestion_ledger WHERE run_id = 'run-constant'").fetchone()
        row = conn.execute(
            """
            SELECT jobs_scanned, triggers_count, suppressed_count, query_fingerprint
            FROM saved_search_ingestion_ledger
            WHERE run_id = 'run-constant'
            """
        ).fetchone()
    assert count is not None and int(count[0]) == 1
    assert row is not None
    assert int(row[0]) == 4
    assert int(row[1]) == 2
    assert int(row[2]) == 2
    assert str(row[3]) == "fp-b"
