import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def _load_fixture(name: str) -> dict:
    fixture_path = Path(__file__).parent / "fixtures" / name
    return json.loads(fixture_path.read_text(encoding="utf-8"))


def test_export_thread_includes_linked_audits(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        eval1 = client.post("/api/v1/advisor/evaluate", json=_load_fixture("advisor_input_apply_remote.json"))
        eval2 = client.post("/api/v1/advisor/evaluate", json=_load_fixture("advisor_input_shortlist_junior.json"))
        assert eval1.status_code == 200
        assert eval2.status_code == 200
        trace1 = eval1.json()["meta"]["trace_id"]
        trace2 = eval2.json()["meta"]["trace_id"]

        thread_response = client.post("/api/v1/threads", json={"title": "Export thread", "store_thread": True})
        assert thread_response.status_code == 200
        thread_id = thread_response.json()["thread"]["thread_id"]

        msg1 = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "user", "content": "First linked message", "trace_id": trace1, "store_thread": True},
        )
        msg2 = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"role": "assistant", "content": "Second linked message", "trace_id": trace2, "store_thread": True},
        )
        assert msg1.status_code == 200
        assert msg2.status_code == 200

        export_response = client.get(f"/api/v1/export/thread/{thread_id}")
        assert export_response.status_code == 200
        payload = export_response.json()
        assert payload["thread"]["thread_id"] == thread_id
        assert len(payload["messages"]) == 2
        linked_trace_ids = {row["trace_id"] for row in payload["linked_audits"]}
        assert trace1 in linked_trace_ids
        assert trace2 in linked_trace_ids
