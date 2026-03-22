from fastapi.testclient import TestClient
import pytest

from app.core.config import get_cors_origins, get_rate_limit_rpm
from app.main import create_app


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("http://localhost:5173,*", ["http://localhost:5173"]),
        (" , capacitor://localhost , ", ["capacitor://localhost"]),
    ],
)
def test_equivalence_cors_origin_parsing(monkeypatch, raw: str, expected: list[str]) -> None:
    monkeypatch.setenv("PATHOS_CORS_ORIGINS", raw)
    assert get_cors_origins() == expected


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("bad", 120),
        ("0", 1),
        ("5", 5),
    ],
)
def test_boundary_rate_limit_rpm_parsing(monkeypatch, raw: str, expected: int) -> None:
    monkeypatch.setenv("PATHOS_RATE_LIMIT_RPM", raw)
    assert get_rate_limit_rpm() == expected


def test_audit_recent_limit_boundaries_and_validation_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        ok = client.get("/api/v1/audit/recent?limit=1")
        bad = client.get("/api/v1/audit/recent?limit=0")

    assert ok.status_code == 200
    assert isinstance(ok.json(), list)

    assert bad.status_code == 422
    assert bad.headers.get("X-Request-ID")
    payload = bad.json()
    assert payload["error"]["code"] == "VALIDATION_ERROR"
    assert payload["error"]["correlation"]["request_id"] == bad.headers.get("X-Request-ID")


def test_security_invalid_authorization_format_returns_401_with_request_id(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "test_pathos.db"))
    app = create_app()

    with TestClient(app) as client:
        invalid = client.get("/api/v1/threads/recent?limit=20", headers={"Authorization": "Token abc"})
        empty = client.get("/api/v1/threads/recent?limit=20", headers={"Authorization": "Bearer    "})

    assert invalid.status_code == 401
    assert empty.status_code == 401
    for response in (invalid, empty):
        payload = response.json()
        assert payload["error"]["code"] == "UNAUTHORIZED"
        assert payload["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")
