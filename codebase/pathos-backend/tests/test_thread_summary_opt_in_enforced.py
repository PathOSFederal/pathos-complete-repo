from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def test_thread_summary_opt_in_enforced_for_ephemeral(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        thread_response = client.post("/api/v1/threads", json={"title": "Ephemeral", "store_thread": False})
        assert thread_response.status_code == 200
        thread_id = thread_response.json()["thread"]["thread_id"]

        recompute_response = client.post(
            f"/api/v1/threads/{thread_id}/summary/recompute",
            json={"store_thread": False, "mode": "deterministic"},
        )
        assert recompute_response.status_code == 200
        payload = recompute_response.json()
        assert payload["stored"] is False
        assert payload["summary"] is None

        persisted_check = client.get(f"/api/v1/threads/{thread_id}/summary")
        assert persisted_check.status_code == 404

        random_id = str(uuid4())
        recompute_random = client.post(
            f"/api/v1/threads/{random_id}/summary/recompute",
            json={"store_thread": False, "mode": "auto"},
        )
        assert recompute_random.status_code == 200
        assert recompute_random.json()["stored"] is False
