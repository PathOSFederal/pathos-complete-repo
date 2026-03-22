from fastapi.testclient import TestClient

from app.main import create_app


def test_meta_openapi_authorized(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/meta/openapi", headers={"Authorization": "Bearer k1"})

    assert response.status_code == 200
    payload = response.json()
    assert "openapi" in payload
    assert "paths" in payload


def test_meta_openapi_unauthorized_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/meta/openapi")

    assert response.status_code == 401
    assert response.headers.get("X-Request-ID")
    payload = response.json()
    assert payload["error"]["code"] == "UNAUTHORIZED"
    assert payload["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")
