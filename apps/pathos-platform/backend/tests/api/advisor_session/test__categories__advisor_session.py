"""Slice 25 categories covered in this file:
- Use Case, Misuse Case, Boundary, Equivalence, Positive, Negative, Edge Case.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_use_case__advisor_session_flow(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "session_use_case.db"))
    app = create_app()
    with TestClient(app) as client:
        created = client.post("/api/v1/advisor/session", json={"profile_snapshot": {"k": "v"}, "selected_job_ids": ["1"]})
        session_id = created.json()["id"]
        event = client.post(
            f"/api/v1/advisor/session/{session_id}/events",
            json={"event_type": "user_note_added", "payload": {"text": "hello"}},
        )
        read = client.get(f"/api/v1/advisor/session/{session_id}")
        closed = client.post(f"/api/v1/advisor/session/{session_id}/close")
    assert created.status_code == 200
    assert event.status_code == 200
    assert read.status_code == 200
    assert closed.status_code == 200


def test_misuse_case__advisor_session_invalid_event_type(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "session_misuse.db"))
    app = create_app()
    with TestClient(app) as client:
        created = client.post("/api/v1/advisor/session", json={})
        session_id = created.json()["id"]
        response = client.post(
            f"/api/v1/advisor/session/{session_id}/events",
            json={"event_type": "drop_database", "payload": {}},
        )
    assert response.status_code == 400


def test_boundary__advisor_session_payload_size_limit(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "session_boundary.db"))
    app = create_app()
    with TestClient(app) as client:
        created = client.post("/api/v1/advisor/session", json={})
        session_id = created.json()["id"]
        response = client.post(
            f"/api/v1/advisor/session/{session_id}/events",
            json={"event_type": "user_note_added", "payload": {"blob": "x" * 9000}},
        )
    assert response.status_code == 400


def test_equivalence__advisor_session_payload_order_canonicalized(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "session_equivalence.db"))
    app = create_app()
    with TestClient(app) as client:
        created = client.post("/api/v1/advisor/session", json={})
        session_id = created.json()["id"]
        client.post(
            f"/api/v1/advisor/session/{session_id}/events",
            json={"event_type": "user_note_added", "payload": {"b": 1, "a": 2}},
        )
        read = client.get(f"/api/v1/advisor/session/{session_id}")
    assert read.status_code == 200
    assert read.json()["events"][0]["payload_json"] == {"a": 2, "b": 1}


def test_positive__advisor_session_multiple_events_accumulate(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "session_positive.db"))
    app = create_app()
    with TestClient(app) as client:
        session_id = client.post("/api/v1/advisor/session", json={}).json()["id"]
        client.post(f"/api/v1/advisor/session/{session_id}/events", json={"event_type": "user_note_added", "payload": {}})
        client.post(f"/api/v1/advisor/session/{session_id}/events", json={"event_type": "job_selected", "payload": {}})
        read = client.get(f"/api/v1/advisor/session/{session_id}")
    assert read.status_code == 200
    assert len(read.json()["events"]) == 2


def test_negative__advisor_session_append_to_closed_rejected(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "session_negative.db"))
    app = create_app()
    with TestClient(app) as client:
        session_id = client.post("/api/v1/advisor/session", json={}).json()["id"]
        client.post(f"/api/v1/advisor/session/{session_id}/close")
        response = client.post(
            f"/api/v1/advisor/session/{session_id}/events",
            json={"event_type": "user_note_added", "payload": {}},
        )
    assert response.status_code == 409


def test_edge_case__advisor_session_close_idempotent_and_read_closed(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "session_edge.db"))
    app = create_app()
    with TestClient(app) as client:
        session_id = client.post("/api/v1/advisor/session", json={}).json()["id"]
        first = client.post(f"/api/v1/advisor/session/{session_id}/close")
        second = client.post(f"/api/v1/advisor/session/{session_id}/close")
        read = client.get(f"/api/v1/advisor/session/{session_id}")
    assert first.status_code == 200
    assert second.status_code == 200
    assert read.status_code == 200
    assert read.json()["closed_at"] is not None
