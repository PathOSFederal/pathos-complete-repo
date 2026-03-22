from datetime import datetime
import time

from fastapi.testclient import TestClient

from app.main import create_app


def test_thread_summary_updates_on_message(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        thread_response = client.post("/api/v1/threads", json={"title": "Update summary", "store_thread": True})
        assert thread_response.status_code == 200
        thread_id = thread_response.json()["thread"]["thread_id"]

        first_message = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "user", "content": "I prefer remote roles.", "store_thread": True},
        )
        assert first_message.status_code == 200

        first_summary = client.get(f"/api/v1/threads/{thread_id}/summary")
        assert first_summary.status_code == 200
        first_timestamp = first_summary.json()["summary_updated_at"]
        assert first_timestamp is not None

        time.sleep(0.01)

        second_message = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "assistant", "content": "I suggest searching backend engineer remote listings.", "store_thread": True},
        )
        assert second_message.status_code == 200

        second_summary = client.get(f"/api/v1/threads/{thread_id}/summary")
        assert second_summary.status_code == 200
        second_timestamp = second_summary.json()["summary_updated_at"]
        assert second_timestamp is not None
        assert datetime.fromisoformat(second_timestamp) >= datetime.fromisoformat(first_timestamp)
