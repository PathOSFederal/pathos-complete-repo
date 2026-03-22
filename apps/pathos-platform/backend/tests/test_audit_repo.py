import json

from app.db.repo.audit_repo import AuditRepo


def test_audit_repo_save_get_and_list_recent(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "test_pathos.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))

    record_old = {
        "trace_id": "trace-old",
        "created_at": "2026-02-12T10:00:00+00:00",
        "input_hash": "hash-old",
        "ruleset_version": "v0.1.0",
        "engine_version": "deterministic-engine-v1",
        "evaluation_json": json.dumps(
            {"recommendation": "shortlist", "confidence_band": "medium"}
        ),
        "narration_json": None,
        "narration_mode": None,
        "prompt_bundle_version": None,
    }
    record_new = {
        "trace_id": "trace-new",
        "created_at": "2026-02-12T11:00:00+00:00",
        "input_hash": "hash-new",
        "ruleset_version": "v0.1.0",
        "engine_version": "deterministic-engine-v1",
        "evaluation_json": json.dumps(
            {"recommendation": "apply", "confidence_band": "high"}
        ),
        "narration_json": None,
        "narration_mode": None,
        "prompt_bundle_version": None,
    }

    AuditRepo.save_evaluation(record_old)
    AuditRepo.save_evaluation(record_new)

    fetched = AuditRepo.get_by_trace_id("trace-new")
    assert fetched is not None
    assert fetched["input_hash"] == "hash-new"

    recent = AuditRepo.list_recent(limit=10)
    assert [item["trace_id"] for item in recent[:2]] == ["trace-new", "trace-old"]


def test_audit_repo_immutable_fields_do_not_change_on_duplicate_trace_id(
    monkeypatch, tmp_path
) -> None:
    db_path = tmp_path / "test_pathos_immutable.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))

    original = {
        "trace_id": "trace-immutable",
        "created_at": "2026-02-23T10:00:00+00:00",
        "input_hash": "hash-original",
        "ruleset_version": "v0.1.0",
        "engine_version": "deterministic-engine-v1",
        "evaluation_json": json.dumps({"recommendation": "shortlist"}),
        "narration_json": None,
        "narration_mode": None,
        "prompt_bundle_version": None,
    }
    attempted_mutation = {
        "trace_id": "trace-immutable",
        "created_at": "2026-02-23T11:00:00+00:00",
        "input_hash": "hash-mutated",
        "ruleset_version": "v0.9.9",
        "engine_version": "different-engine",
        "evaluation_json": json.dumps({"recommendation": "reject"}),
        "narration_json": None,
        "narration_mode": None,
        "prompt_bundle_version": None,
    }

    AuditRepo.save_evaluation(original)
    AuditRepo.save_evaluation(attempted_mutation)

    fetched = AuditRepo.get_by_trace_id("trace-immutable")
    assert fetched is not None
    assert fetched["created_at"] == "2026-02-23T10:00:00+00:00"
    assert fetched["input_hash"] == "hash-original"
    assert fetched["ruleset_version"] == "v0.1.0"
    assert fetched["engine_version"] == "deterministic-engine-v1"
    assert fetched["evaluation_json"] == json.dumps({"recommendation": "shortlist"})
