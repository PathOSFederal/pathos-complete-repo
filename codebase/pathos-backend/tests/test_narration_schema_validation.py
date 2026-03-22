import json
from pathlib import Path

from app.models.advisor import AdvisorInput
from app.services.advisor_service import AdvisorService
from app.services.narration_service import NarrationService


def _load_evaluation(monkeypatch, tmp_path):
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    fixture_path = Path(__file__).parent / "fixtures" / "advisor_input_apply_remote.json"
    advisor_input = AdvisorInput.model_validate(json.loads(fixture_path.read_text(encoding="utf-8")))
    return AdvisorService.evaluate(advisor_input)


def test_invalid_json_uses_fallback(monkeypatch, tmp_path) -> None:
    evaluation = _load_evaluation(monkeypatch, tmp_path)

    def fake_generate_text(*args, **kwargs) -> str:
        return "not-json"

    monkeypatch.setattr("app.llm.client.OpenAIClient.generate_text", fake_generate_text)
    narration, mode = NarrationService.narrate(evaluation=evaluation, tone="default")
    assert mode == "fallback"
    assert narration.headline


def test_invalid_citations_uses_fallback(monkeypatch, tmp_path) -> None:
    evaluation = _load_evaluation(monkeypatch, tmp_path)

    bad_payload = {
        "headline": "LLM headline",
        "summary": "LLM summary",
        "bullets": ["One", "Two"],
        "follow_up_questions": [],
        "citations": [{"reason_code": "NOT_A_REASON", "evidence_ref": None}],
    }

    def fake_generate_text(*args, **kwargs) -> str:
        return json.dumps(bad_payload)

    monkeypatch.setattr("app.llm.client.OpenAIClient.generate_text", fake_generate_text)
    narration, mode = NarrationService.narrate(evaluation=evaluation, tone="default")
    assert mode == "fallback"
    assert "deterministic fallback" in narration.summary.lower()
