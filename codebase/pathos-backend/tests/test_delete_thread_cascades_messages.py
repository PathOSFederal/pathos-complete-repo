from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db.repo.thread_repo import ThreadRepo
from app.main import create_app
from app.services.retention_service import RetentionService


def test_delete_thread_cascades_messages(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        create_response = client.post(
            "/api/v1/threads", json={"title": "Delete me", "store_thread": True}
        )
        assert create_response.status_code == 200
        thread_id = create_response.json()["thread"]["thread_id"]

        msg_response = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "user", "content": "Stored message", "store_thread": True},
        )
        assert msg_response.status_code == 200

        delete_response = client.delete(f"/api/v1/threads/{thread_id}")
        assert delete_response.status_code == 200
        assert delete_response.json() == {"deleted": True, "thread_id": thread_id}

        thread_response = client.get(f"/api/v1/threads/{thread_id}")
        assert thread_response.status_code == 404

        export_response = client.get(f"/api/v1/export/thread/{thread_id}")
        assert export_response.status_code == 404


def test_retention_cleanup_clears_old_thread_summaries(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "retention_thread_summary.db"))
    monkeypatch.setenv("RETENTION_DAYS_THREAD_SUMMARIES", "1")
    app = create_app()

    with TestClient(app) as client:
        create_response = client.post(
            "/api/v1/threads", json={"title": "Keep thread", "store_thread": True}
        )
    assert create_response.status_code == 200
    thread_id = create_response.json()["thread"]["thread_id"]
    old_summary_ts = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    ThreadRepo.set_thread_summary(
        thread_id=thread_id,
        summary="old summary",
        summary_updated_at=old_summary_ts,
        summary_version="v1",
    )

    summary = RetentionService.cleanup()

    assert summary.thread_summaries_cleared >= 1
    stored_summary, summary_updated_at, _summary_version = (
        ThreadRepo.get_thread_summary(thread_id)
    )
    assert stored_summary is None
    assert summary_updated_at is None
