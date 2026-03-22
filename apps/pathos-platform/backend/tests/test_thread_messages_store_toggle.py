from fastapi.testclient import TestClient

from app.main import create_app


def test_thread_message_store_toggle(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        create_response = client.post("/api/v1/threads", json={"title": "Message toggle thread", "store_thread": True})
        assert create_response.status_code == 200
        thread_id = create_response.json()["thread"]["thread_id"]

        not_stored_response = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "user", "content": "Ephemeral note", "store_thread": False},
        )
        assert not_stored_response.status_code == 200
        assert not_stored_response.json()["stored"] is False

        thread_after_ephemeral = client.get(f"/api/v1/threads/{thread_id}?limit=50")
        assert thread_after_ephemeral.status_code == 200
        assert thread_after_ephemeral.json()["messages"] == []

        stored_response = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "assistant", "content": "Persisted note", "store_thread": True},
        )
        assert stored_response.status_code == 200
        assert stored_response.json()["stored"] is True

        thread_after_store = client.get(f"/api/v1/threads/{thread_id}?limit=50")
        assert thread_after_store.status_code == 200
        messages = thread_after_store.json()["messages"]
        assert len(messages) == 1
        assert messages[0]["content"] == "Persisted note"
