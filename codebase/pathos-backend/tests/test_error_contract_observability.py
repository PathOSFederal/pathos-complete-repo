from fastapi.testclient import TestClient

from app.db.migration_safety import MigrationSafetyError
from app.main import create_app


def _assert_error_shape(payload: dict, *, expected_category: str) -> None:
    assert "error" in payload
    error = payload["error"]
    assert isinstance(error["code"], str)
    assert isinstance(error["message"], str)
    assert error["category"] == expected_category
    correlation = error["correlation"]
    assert isinstance(correlation["request_id"], str)
    assert "run_id" in correlation
    assert "rule_id" in correlation
    assert "saved_search_id" in correlation


def test_request_id_echoed_when_supplied(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/health", headers={"X-Request-ID": "req-123"})
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") == "req-123"


def test_request_id_generated_when_missing(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID")


def test_validation_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/threads",
            headers={"Authorization": "Bearer k1"},
            json={"store_thread": True},
        )
    assert response.status_code == 422
    assert response.headers.get("X-Request-ID")
    payload = response.json()
    _assert_error_shape(payload, expected_category="client_error")
    assert payload["error"]["code"] == "VALIDATION_ERROR"
    assert "validation" in payload["error"]["message"].lower()
    assert payload["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_auth_errors_use_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        unauthorized = client.get("/api/v1/threads/recent?limit=20")
        forbidden = client.get("/api/v1/threads/recent?limit=20", headers={"Authorization": "Bearer bad"})

    assert unauthorized.status_code == 401
    assert forbidden.status_code == 403
    assert unauthorized.headers.get("X-Request-ID")
    assert forbidden.headers.get("X-Request-ID")
    assert "error" in unauthorized.json()
    assert "error" in forbidden.json()
    _assert_error_shape(unauthorized.json(), expected_category="client_error")
    _assert_error_shape(forbidden.json(), expected_category="client_error")


def test_404_and_405_use_canonical_error_envelope(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        missing = client.get("/api/v1/not-a-real-route", headers={"Authorization": "Bearer k1"})
        wrong_method = client.post("/api/v1/desktop/overview", headers={"Authorization": "Bearer k1"})

    assert missing.status_code == 404
    assert wrong_method.status_code == 405
    missing_payload = missing.json()
    wrong_method_payload = wrong_method.json()
    _assert_error_shape(missing_payload, expected_category="client_error")
    _assert_error_shape(wrong_method_payload, expected_category="client_error")
    assert missing_payload["error"]["code"] == "NOT_FOUND"
    assert "not found" in missing_payload["error"]["message"].lower()
    assert wrong_method_payload["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_400_uses_canonical_error_envelope(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/wipe",
            headers={"Authorization": "Bearer k1"},
            json={"confirm": "invalid", "wipe_threads": False, "wipe_audits": False},
        )

    assert response.status_code == 400
    payload = response.json()
    _assert_error_shape(payload, expected_category="client_error")
    assert payload["error"]["code"] == "BAD_REQUEST"


def test_internal_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    @app.get("/api/v1/test-error")
    def test_error() -> dict:
        raise RuntimeError("boom")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/v1/test-error")

    assert response.status_code == 500
    assert response.headers.get("X-Request-ID")
    payload = response.json()
    _assert_error_shape(payload, expected_category="server_error")
    assert payload["error"]["code"] == "INTERNAL_SERVER_ERROR"
    assert "internal error" in payload["error"]["message"].lower()
    assert "runtimeerror" not in payload["error"]["message"].lower()
    assert payload["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_migration_error_contract_includes_request_id(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    @app.get("/api/v1/test-migration-error")
    def test_migration_error() -> dict:
        raise MigrationSafetyError("Run migration runner")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/v1/test-migration-error")

    assert response.status_code == 503
    assert response.headers.get("X-Request-ID")
    payload = response.json()
    _assert_error_shape(payload, expected_category="server_error")
    assert payload["error"]["code"] == "MIGRATION_REQUIRED"
    assert payload["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")
