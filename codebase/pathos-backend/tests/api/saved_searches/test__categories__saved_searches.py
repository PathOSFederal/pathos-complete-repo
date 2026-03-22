"""Slice 22 categories covered in this file:
- Use Case, Misuse Case, Boundary, Equivalence, Positive, Negative, Edge Case.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def _create(client: TestClient, name: str = "My Search", filters: dict | None = None):
    return client.post(
        "/api/v1/saved-searches",
        json={
            "name": name,
            "filters": filters or {"keyword": "analyst", "agency_codes": ["XYZ", "ABC"]},
        },
    )


def test_use_case__saved_search_crud_flow(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_use_case.db"))
    app = create_app()
    with TestClient(app) as client:
        created = _create(client)
        saved_id = created.json()["id"]
        listed = client.get("/api/v1/saved-searches")
        fetched = client.get(f"/api/v1/saved-searches/{saved_id}")
        updated = client.put(
            f"/api/v1/saved-searches/{saved_id}",
            json={"name": "Updated", "filters": {"keyword": "data"}, "is_enabled": False},
        )
        deleted = client.delete(f"/api/v1/saved-searches/{saved_id}")
    assert created.status_code == 200
    assert listed.status_code == 200
    assert fetched.status_code == 200
    assert updated.status_code == 200
    assert deleted.status_code == 200


def test_misuse_case__saved_search_oversized_name_rejected(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_misuse.db"))
    app = create_app()
    with TestClient(app) as client:
        response = _create(client, name="x" * 121)
    assert response.status_code == 422


def test_boundary__saved_search_name_min_max(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_boundary.db"))
    app = create_app()
    with TestClient(app) as client:
        min_ok = _create(client, name="a")
        max_ok = _create(client, name="b" * 120)
    assert min_ok.status_code == 200
    assert max_ok.status_code == 200


def test_equivalence__saved_search_filter_order_canonicalized(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_equivalence.db"))
    app = create_app()
    with TestClient(app) as client:
        first = _create(client, filters={"keyword": "analyst", "agency_codes": ["B", "A"]}).json()
        second = _create(client, filters={"keyword": "analyst", "agency_codes": ["A", "B"]}).json()
    assert first["filters_json"] == second["filters_json"]


def test_positive__saved_search_enabled_default_true(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_positive.db"))
    app = create_app()
    with TestClient(app) as client:
        response = _create(client)
    assert response.status_code == 200
    assert response.json()["is_enabled"] is True


def test_negative__saved_search_invalid_id_returns_404_error_contract(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_negative.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/saved-searches/not-found")
    assert response.status_code == 404
    assert response.json()["error"]["correlation"]["request_id"] == response.headers.get("X-Request-ID")


def test_edge_case__saved_search_empty_optional_filters_canonical(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "saved_edge.db"))
    app = create_app()
    with TestClient(app) as client:
        response = _create(client, filters={"keyword": "analyst", "series": [], "agency_codes": []})
    assert response.status_code == 200
    assert response.json()["filters_json"]["filters"]["keyword"] == "analyst"
