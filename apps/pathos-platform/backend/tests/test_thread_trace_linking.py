import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def test_thread_message_trace_linking(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    def fake_generate_text(*args, **kwargs) -> str:
        return "not-json"

    monkeypatch.setattr("app.llm.client.OpenAIClient.generate_text", fake_generate_text)

    fixture_path = Path(__file__).parent / "fixtures" / "advisor_input_apply_remote.json"
    advisor_input = json.loads(fixture_path.read_text(encoding="utf-8"))

    with TestClient(app) as client:
        evaluate_response = client.post(
            "/api/v1/advisor/evaluate-and-narrate",
            json={"advisor_input": advisor_input, "tone": "default"},
        )
        assert evaluate_response.status_code == 200
        trace_id = evaluate_response.json()["evaluation"]["meta"]["trace_id"]
        assert trace_id

        thread_response = client.post("/api/v1/threads", json={"title": "Trace thread", "store_thread": True})
        assert thread_response.status_code == 200
        thread_id = thread_response.json()["thread"]["thread_id"]

        message_response = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={
                "role": "user",
                "content": "Please explain this recommendation",
                "trace_id": trace_id,
                "store_thread": True,
            },
        )
        assert message_response.status_code == 200
        assert message_response.json()["stored"] is True
        assert message_response.json()["message"]["trace_id"] == trace_id

        detail_response = client.get(f"/api/v1/threads/{thread_id}?limit=50")
        assert detail_response.status_code == 200
        messages = detail_response.json()["messages"]
        assert len(messages) == 1
        assert messages[0]["trace_id"] == trace_id
