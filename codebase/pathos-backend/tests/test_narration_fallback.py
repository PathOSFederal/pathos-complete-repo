import json
import logging
from pathlib import Path

from app.db.repo.audit_repo import AuditRepo
from app.models.advisor import AdvisorInput
from app.services.advisor_service import AdvisorService
from app.services.narration_service import NarrationService


def test_narration_client_failure_returns_fallback(
    monkeypatch, tmp_path, caplog
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    fixture_path = (
        Path(__file__).parent / "fixtures" / "advisor_input_needs_info_mismatch.json"
    )
    advisor_input = AdvisorInput.model_validate(
        json.loads(fixture_path.read_text(encoding="utf-8"))
    )
    evaluation = AdvisorService.evaluate(advisor_input)
    caplog.set_level(logging.WARNING, logger="pathos.narration")

    def fake_generate_text(*args, **kwargs) -> str:
        raise RuntimeError("simulated llm failure")

    monkeypatch.setattr("app.llm.client.OpenAIClient.generate_text", fake_generate_text)
    narration, mode = NarrationService.narrate(evaluation=evaluation, tone="supportive")
    assert mode == "fallback"
    assert narration.headline == "Deterministic Guidance Summary"
    audit_record = AuditRepo.get_by_trace_id(evaluation.meta.trace_id or "")
    assert audit_record is not None
    assert audit_record["narration_mode"] == "fallback"

    event_ids = [
        payload.get("event_id")
        for payload in (
            getattr(record, "json_extra", None) for record in caplog.records
        )
        if isinstance(payload, dict)
    ]
    assert "narration_fallback_used" in event_ids
