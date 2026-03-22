from fastapi.testclient import TestClient

from app.main import create_app


def test_thread_summary_llm_fallback(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    def fake_generate_text(*args, **kwargs) -> str:
        raise RuntimeError("simulated llm failure")

    monkeypatch.setattr("app.llm.client.OpenAIClient.generate_text", fake_generate_text)

    with TestClient(app) as client:
        thread_response = client.post("/api/v1/threads", json={"title": "LLM fallback", "store_thread": True})
        assert thread_response.status_code == 200
        thread_id = thread_response.json()["thread"]["thread_id"]

        client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "user", "content": "I want backend engineer positions in Remote settings.", "store_thread": True},
        )

        recompute_response = client.post(
            f"/api/v1/threads/{thread_id}/summary/recompute",
            json={"store_thread": True, "mode": "llm"},
        )
        assert recompute_response.status_code == 200
        payload = recompute_response.json()
        assert payload["stored"] is True
        assert payload["mode_used"] == "deterministic"
        assert payload["summary"]
