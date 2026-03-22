from fastapi.testclient import TestClient

from app.main import create_app


def test_rate_limit_disabled_allows_repeated_calls(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_RATE_LIMIT_ENABLED", "false")
    monkeypatch.setenv("PATHOS_RATE_LIMIT_RPM", "1")
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        statuses = [client.get("/api/v1/threads/recent?limit=20").status_code for _ in range(3)]
    assert statuses == [200, 200, 200]


def test_rate_limit_enabled_returns_429_with_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("PATHOS_RATE_LIMIT_RPM", "2")
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        first = client.get("/api/v1/threads/recent?limit=20")
        second = client.get("/api/v1/threads/recent?limit=20")
        third = client.get("/api/v1/threads/recent?limit=20")

    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 429
    assert third.headers.get("X-Request-ID")
    payload = third.json()
    assert payload["error"]["code"] == "RATE_LIMITED"
    assert payload["error"]["correlation"]["request_id"] == third.headers.get("X-Request-ID")
