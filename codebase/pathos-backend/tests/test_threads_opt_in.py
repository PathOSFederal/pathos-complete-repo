from fastapi.testclient import TestClient

from app.main import create_app


def test_threads_storage_opt_in(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        ephemeral_response = client.post("/api/v1/threads", json={"title": "Ephemeral thread", "store_thread": False})
        assert ephemeral_response.status_code == 200
        ephemeral_payload = ephemeral_response.json()
        assert ephemeral_payload["stored"] is False

        recent_after_ephemeral = client.get("/api/v1/threads/recent?limit=20")
        assert recent_after_ephemeral.status_code == 200
        recent_titles = [item["title"] for item in recent_after_ephemeral.json()]
        assert "Ephemeral thread" not in recent_titles

        stored_response = client.post("/api/v1/threads", json={"title": "Stored thread", "store_thread": True})
        assert stored_response.status_code == 200
        stored_payload = stored_response.json()
        assert stored_payload["stored"] is True

        recent_after_stored = client.get("/api/v1/threads/recent?limit=20")
        assert recent_after_stored.status_code == 200
        recent_titles = [item["title"] for item in recent_after_stored.json()]
        assert "Stored thread" in recent_titles
