import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.db.repo.alert_rule_repo import AlertRuleRepo
from app.db.repo.alert_run_repo import AlertRunRepo
from app.db.repo.audit_repo import AuditRepo
from app.db.repo.saved_search_repo import SavedSearchRepo
from app.db.repo.upstream_audit_repo import UpstreamAuditRepo
from app.main import create_app
from app.services.retention_service import RetentionService


def test_delete_audit(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    fixture_path = (
        Path(__file__).parent / "fixtures" / "advisor_input_apply_remote.json"
    )
    advisor_input = json.loads(fixture_path.read_text(encoding="utf-8"))

    with TestClient(app) as client:
        eval_response = client.post("/api/v1/advisor/evaluate", json=advisor_input)
        assert eval_response.status_code == 200
        trace_id = eval_response.json()["meta"]["trace_id"]

        delete_response = client.delete(f"/api/v1/audit/{trace_id}")
        assert delete_response.status_code == 200
        assert delete_response.json() == {"deleted": True, "trace_id": trace_id}

        get_response = client.get(f"/api/v1/audit/{trace_id}")
        assert get_response.status_code == 404


def test_retention_cleanup_purges_old_records(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "retention_cleanup.db"))
    monkeypatch.setenv("RETENTION_DAYS_AUDIT", "1")
    monkeypatch.setenv("RETENTION_DAYS_DIGESTS", "1")
    monkeypatch.setenv("RETENTION_DAYS_THREAD_SUMMARIES", "1")
    monkeypatch.setenv("RETENTION_DAYS_UPSTREAM_RAW", "1")
    create_app()

    old_ts = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    now_ts = datetime.now(timezone.utc).isoformat()
    SavedSearchRepo.create(
        {
            "id": "saved-retention-1",
            "name": "retention",
            "filters_json": "{}",
            "query_payload": "{}",
            "profile_payload": None,
            "ruleset_version": "job-scoring-v1",
            "is_enabled": True,
            "last_run_at": None,
            "created_at": now_ts,
            "updated_at": now_ts,
        }
    )
    AlertRuleRepo.create(
        {
            "id": "rule-retention-1",
            "saved_search_id": "saved-retention-1",
            "min_score_threshold": 1,
            "max_per_day": 1,
            "cooldown_hours": 1,
            "delivery_mode": "digest_payload",
            "enabled": True,
            "created_at": now_ts,
            "updated_at": now_ts,
        }
    )
    AlertRunRepo.create(
        {
            "id": "run-retention-old",
            "started_at": old_ts,
            "ended_at": old_ts,
            "status": "success",
            "rules_evaluated": 0,
            "jobs_scanned": 0,
            "triggers_count": 0,
            "suppressed_count": 0,
            "error_summary": None,
            "usajobs_fetch_ms": 0,
            "normalize_ms": 0,
            "score_ms": 0,
            "delta_ms": 0,
            "digest_ms": 0,
            "backoff_events_json": "[]",
            "lock_acquired": True,
            "lock_released": True,
            "skip_reason": None,
            "skip_details": None,
        }
    )
    AlertDigestRepo.create(
        {
            "id": "digest-retention-old",
            "alert_run_id": "run-retention-old",
            "alert_rule_id": "rule-retention-1",
            "created_at": old_ts,
            "delivery_mode": "digest_payload",
            "payload_json": "{}",
        }
    )
    AuditRepo.save_evaluation(
        {
            "trace_id": "trace-old",
            "created_at": old_ts,
            "input_hash": "h",
            "ruleset_version": "job-scoring-v1",
            "engine_version": "v1",
            "evaluation_json": "{}",
            "narration_json": None,
            "narration_mode": None,
            "prompt_bundle_version": None,
        }
    )
    UpstreamAuditRepo.save_record(
        {
            "id": "upstream-old",
            "request_id": "req-old",
            "created_at": old_ts,
            "endpoint": "/api/search",
            "query_hash": "q-old",
            "status_code": 200,
            "latency_ms": 1,
            "result_count": 0,
            "upstream_raw_payload": {"SearchResult": {"SearchResultItems": []}},
            "error_class": None,
        }
    )

    summary = RetentionService.cleanup()

    assert summary.digests_deleted >= 1
    assert summary.runs_deleted >= 1
    assert summary.audits_deleted >= 1
    assert summary.upstream_raw_deleted >= 1
