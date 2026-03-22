from fastapi.testclient import TestClient

from app.main import create_app


def test_no_cors_headers_when_origins_unset(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_CORS_ORIGINS", raising=False)
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.options(
            "/api/v1/desktop/info",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.headers.get("access-control-allow-origin") is None


def test_cors_preflight_allows_listed_origin(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_CORS_ORIGINS", "http://localhost:5173,capacitor://localhost")
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.options(
            "/api/v1/desktop/info",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization,Content-Type",
            },
        )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_preflight_denies_unlisted_origin(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.options(
            "/api/v1/desktop/info",
            headers={
                "Origin": "http://evil.local",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.headers.get("access-control-allow-origin") is None


def test_desktop_info_auth_missing_and_wrong_and_success(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1,k2")
    monkeypatch.delenv("PATHOS_CORS_ORIGINS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        missing = client.get("/api/v1/desktop/info")
        wrong = client.get("/api/v1/desktop/info", headers={"Authorization": "Bearer nope"})
        ok = client.get("/api/v1/desktop/info", headers={"Authorization": "Bearer k2"})

    assert missing.status_code == 401
    assert wrong.status_code == 403
    assert ok.status_code == 200
    payload = ok.json()
    assert payload["version"] == "0.1.0"
    assert isinstance(payload["env"], str)
    assert payload["authRequired"] is True
    assert payload["baseUrl"] == "/api/v1"
    assert "serverTime" in payload
