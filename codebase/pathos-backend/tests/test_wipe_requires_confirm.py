import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.db.repo.alert_rule_repo import AlertRuleRepo
from app.db.repo.alert_run_repo import AlertRunRepo
from app.db.repo.saved_search_repo import SavedSearchRepo
from app.db.repo.upstream_audit_repo import UpstreamAuditRepo
from app.main import create_app


def _load_fixture(name: str) -> dict:
    fixture_path = Path(__file__).parent / "fixtures" / name
    return json.loads(fixture_path.read_text(encoding="utf-8"))


def test_wipe_requires_confirm(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "test_pathos.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    app = create_app()

    with TestClient(app) as client:
        eval_response = client.post(
            "/api/v1/advisor/evaluate",
            json=_load_fixture("advisor_input_apply_remote.json"),
        )
        assert eval_response.status_code == 200

        create_thread = client.post(
            "/api/v1/threads", json={"title": "Wipe thread", "store_thread": True}
        )
        assert create_thread.status_code == 200
        thread_id = create_thread.json()["thread"]["thread_id"]
        msg = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "user", "content": "Persist me", "store_thread": True},
        )
        assert msg.status_code == 200

        bad_confirm = client.post(
            "/api/v1/wipe",
            json={"confirm": "NOPE", "wipe_threads": True, "wipe_audits": True},
        )
        assert bad_confirm.status_code == 400

        good_confirm = client.post(
            "/api/v1/wipe",
            json={"confirm": "WIPE_ALL", "wipe_threads": True, "wipe_audits": True},
        )
        assert good_confirm.status_code == 200
        counts = good_confirm.json()
        assert counts["threads_deleted"] >= 1
        assert counts["messages_deleted"] >= 1
        assert counts["audits_deleted"] >= 1

        threads_after = client.get("/api/v1/threads/recent?limit=20")
        audits_after = client.get("/api/v1/audit/recent?limit=20")
        assert threads_after.status_code == 200
        assert audits_after.status_code == 200
        assert threads_after.json() == []
        assert audits_after.json() == []

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        saved_search_count = conn.execute(
            "SELECT COUNT(1) AS c FROM saved_searches"
        ).fetchone()
        alert_rule_count = conn.execute(
            "SELECT COUNT(1) AS c FROM alert_rules"
        ).fetchone()
        alert_run_count = conn.execute(
            "SELECT COUNT(1) AS c FROM alert_runs"
        ).fetchone()
        alert_digest_count = conn.execute(
            "SELECT COUNT(1) AS c FROM alert_digests"
        ).fetchone()
        upstream_count = conn.execute(
            "SELECT COUNT(1) AS c FROM upstream_api_audit_records"
        ).fetchone()
    assert saved_search_count is not None and int(saved_search_count["c"]) == 0
    assert alert_rule_count is not None and int(alert_rule_count["c"]) == 0
    assert alert_run_count is not None and int(alert_run_count["c"]) == 0
    assert alert_digest_count is not None and int(alert_digest_count["c"]) == 0
    assert upstream_count is not None and int(upstream_count["c"]) == 0


def test_wipe_clears_operational_data_classes(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "wipe_operational.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    app = create_app()

    now = datetime.now(timezone.utc).isoformat()
    SavedSearchRepo.create(
        {
            "id": "saved-wipe-1",
            "name": "wipe",
            "filters_json": "{}",
            "query_payload": "{}",
            "profile_payload": None,
            "ruleset_version": "job-scoring-v1",
            "is_enabled": True,
            "last_run_at": None,
            "created_at": now,
            "updated_at": now,
        }
    )
    AlertRuleRepo.create(
        {
            "id": "rule-wipe-1",
            "saved_search_id": "saved-wipe-1",
            "min_score_threshold": 1,
            "max_per_day": 1,
            "cooldown_hours": 1,
            "delivery_mode": "digest_payload",
            "enabled": True,
            "created_at": now,
            "updated_at": now,
        }
    )
    AlertRunRepo.create(
        {
            "id": "run-wipe-1",
            "started_at": now,
            "ended_at": now,
            "status": "success",
            "rules_evaluated": 1,
            "jobs_scanned": 1,
            "triggers_count": 1,
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
            "id": "digest-wipe-1",
            "alert_run_id": "run-wipe-1",
            "alert_rule_id": "rule-wipe-1",
            "created_at": now,
            "delivery_mode": "digest_payload",
            "payload_json": "{}",
        }
    )
    UpstreamAuditRepo.save_record(
        {
            "id": "upstream-wipe-1",
            "request_id": "req-wipe-1",
            "created_at": now,
            "endpoint": "/api/search",
            "query_hash": "q",
            "status_code": 200,
            "latency_ms": 1,
            "result_count": 0,
            "upstream_raw_payload": {"SearchResult": {"SearchResultItems": []}},
            "error_class": None,
        }
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/wipe",
            json={"confirm": "WIPE_ALL", "wipe_threads": True, "wipe_audits": True},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["saved_searches_deleted"] >= 1
    assert body["alert_rules_deleted"] >= 1
    assert body["alert_runs_deleted"] >= 1
    assert body["alert_digests_deleted"] >= 1
    assert body["upstream_api_audit_records_deleted"] >= 1
