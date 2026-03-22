from fastapi.testclient import TestClient

from app.main import create_app


def test_no_api_keys_env_is_open(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/threads/recent?limit=20")
    assert response.status_code == 200


def test_empty_api_keys_env_is_open(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", " , , ")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/threads/recent?limit=20")
    assert response.status_code == 200


def test_missing_authorization_when_keys_configured(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/threads/recent?limit=20")
    assert response.status_code == 401


def test_wrong_bearer_key_when_keys_configured(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/threads/recent?limit=20", headers={"Authorization": "Bearer wrong"})
    assert response.status_code == 403


def test_valid_bearer_key_when_multiple_keys_configured(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1,k2")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/threads/recent?limit=20", headers={"Authorization": "Bearer k2"})
    assert response.status_code == 200


def test_health_always_open_with_keys(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1,k2")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
