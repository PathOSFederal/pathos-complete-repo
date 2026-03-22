from fastapi.testclient import TestClient

from app.main import create_app


def test_thread_summary_deterministic(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        thread_response = client.post("/api/v1/threads", json={"title": "Summary thread", "store_thread": True})
        assert thread_response.status_code == 200
        thread_id = thread_response.json()["thread"]["thread_id"]

        client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={
                "role": "user",
                "content": "I want a Backend Engineer role and prefer Remote or Austin, TX. I must avoid relocation.",
                "store_thread": True,
            },
        )
        client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={
                "role": "assistant",
                "content": "I recommend targeting backend engineer postings and next step is tailoring your resume.",
                "store_thread": True,
            },
        )

        summary_response = client.get(f"/api/v1/threads/{thread_id}/summary")
        assert summary_response.status_code == 200
        payload = summary_response.json()
        assert payload["stored"] is True
        assert payload["summary"] is not None
        assert len(payload["summary"]) <= 1200

        lines = payload["summary"].split("\n")
        assert lines[0].startswith("User goal:")
        assert lines[1].startswith("Constraints:")
        assert lines[2].startswith("Target roles:")
        assert lines[3].startswith("Key preferences:")
        assert lines[4].startswith("Open questions:")
        assert lines[5].startswith("Recent decisions:")
