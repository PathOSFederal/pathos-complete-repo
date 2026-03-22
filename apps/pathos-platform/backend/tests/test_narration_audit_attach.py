import json
from pathlib import Path

from app.db.repo.audit_repo import AuditRepo
from app.models.advisor import AdvisorInput
from app.services.advisor_service import AdvisorService
from app.services.narration_service import NarrationService


def test_narration_attaches_to_audit_record(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    fixture_path = Path(__file__).parent / "fixtures" / "advisor_input_apply_remote.json"
    advisor_input = AdvisorInput.model_validate(json.loads(fixture_path.read_text(encoding="utf-8")))
    evaluation = AdvisorService.evaluate(advisor_input)

    def fake_generate_text(*args, **kwargs) -> str:
        return "not-json"

    monkeypatch.setattr("app.llm.client.OpenAIClient.generate_text", fake_generate_text)
    narration, mode = NarrationService.narrate(evaluation=evaluation, tone="default")

    record = AuditRepo.get_by_trace_id(evaluation.meta.trace_id or "")
    assert record is not None
    assert record["narration_json"] is not None
    assert record["narration_mode"] == mode

    persisted = json.loads(record["narration_json"])
    assert persisted["headline"] == narration.headline
