import ast
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.models.advisor import AdvisorInput
from app.services.advisor_service import AdvisorService
from app.main import create_app


def test_evaluate_and_narrate_endpoint_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    def fake_generate_text(*args, **kwargs) -> str:
        return "not-json"

    monkeypatch.setattr("app.llm.client.OpenAIClient.generate_text", fake_generate_text)

    fixture_path = (
        Path(__file__).parent
        / "fixtures"
        / "advisor_input_shortlist_unknown_range.json"
    )
    advisor_input = json.loads(fixture_path.read_text(encoding="utf-8"))

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/advisor/evaluate-and-narrate",
            json={"advisor_input": advisor_input, "tone": "direct"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert "evaluation" in payload
    assert "narration" in payload
    assert payload["narration_mode"] in {"llm", "fallback"}
    assert payload["evaluation"]["recommendation"] in {
        "apply",
        "shortlist",
        "skip",
        "needs_info",
    }


def test_llm_failure_does_not_change_deterministic_evaluation_fields(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos_eval.db"))
    fixture_path = (
        Path(__file__).parent
        / "fixtures"
        / "advisor_input_shortlist_unknown_range.json"
    )
    advisor_input_payload = json.loads(fixture_path.read_text(encoding="utf-8"))
    advisor_input = AdvisorInput.model_validate(advisor_input_payload)
    deterministic_only = AdvisorService.evaluate(advisor_input).model_dump(mode="json")

    def fake_generate_text(*args, **kwargs) -> str:
        raise RuntimeError("forced narration failure")

    monkeypatch.setattr("app.llm.client.OpenAIClient.generate_text", fake_generate_text)
    app = create_app()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/advisor/evaluate-and-narrate",
            json={"advisor_input": advisor_input_payload, "tone": "direct"},
        )

    assert response.status_code == 200
    payload = response.json()
    evaluated = payload["evaluation"]
    assert payload["narration_mode"] == "fallback"
    assert evaluated["recommendation"] == deterministic_only["recommendation"]
    assert evaluated["confidence_band"] == deterministic_only["confidence_band"]
    assert evaluated["reasons"] == deterministic_only["reasons"]
    assert evaluated["risks"] == deterministic_only["risks"]
    assert evaluated["next_actions"] == deterministic_only["next_actions"]
    assert evaluated["evidence"] == deterministic_only["evidence"]


def test_evaluator_module_has_no_llm_dependency() -> None:
    source = Path("app/engine/evaluator.py").read_text(encoding="utf-8")
    module = ast.parse(source)
    forbidden_prefixes = ("app.llm",)
    for node in ast.walk(module):
        if isinstance(node, ast.Import):
            for name in node.names:
                assert not name.name.startswith(forbidden_prefixes)
        if isinstance(node, ast.ImportFrom) and node.module is not None:
            assert not node.module.startswith(forbidden_prefixes)
