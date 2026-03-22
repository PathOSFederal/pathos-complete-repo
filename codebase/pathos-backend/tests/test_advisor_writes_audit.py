import json
from pathlib import Path

from app.db.repo.audit_repo import AuditRepo
from app.models.advisor import AdvisorInput
from app.services.advisor_service import AdvisorService


def test_advisor_service_writes_audit_record(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "test_pathos.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))

    fixture_path = Path(__file__).parent / "fixtures" / "advisor_input_apply_remote.json"
    advisor_input = AdvisorInput.model_validate(json.loads(fixture_path.read_text(encoding="utf-8")))

    output = AdvisorService.evaluate(advisor_input)
    assert output.meta.trace_id is not None

    record = AuditRepo.get_by_trace_id(output.meta.trace_id)
    assert record is not None
    assert record["trace_id"] == output.meta.trace_id
    assert record["input_hash"] == output.meta.input_hash

    evaluation = json.loads(record["evaluation_json"])
    assert evaluation["recommendation"] == output.recommendation.value
    assert evaluation["confidence_band"] == output.confidence_band.value
    assert evaluation["meta"]["trace_id"] == output.meta.trace_id
