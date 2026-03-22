from fastapi.testclient import TestClient

from app.main import create_app


def test_export_thread_not_found_returns_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/export/thread/missing", headers={"Authorization": "Bearer k1"})

    assert response.status_code == 404
    assert response.headers.get("X-Request-ID")
    payload = response.json()
    assert payload["error"]["code"] == "NOT_FOUND"
    assert payload["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_export_audit_not_found_returns_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/export/audit/missing", headers={"Authorization": "Bearer k1"})

    assert response.status_code == 404
    assert response.headers.get("X-Request-ID")
    payload = response.json()
    assert payload["error"]["code"] == "NOT_FOUND"
    assert payload["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_desktop_ping_is_protected_and_succeeds_with_auth(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        missing = client.get("/api/v1/desktop/ping")
        ok = client.get("/api/v1/desktop/ping", headers={"Authorization": "Bearer k1"})

    assert missing.status_code == 401
    assert ok.status_code == 200
    assert ok.json() == {"status": "ok"}
