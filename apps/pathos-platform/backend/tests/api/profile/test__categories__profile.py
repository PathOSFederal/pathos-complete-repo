"""Slice 24 categories covered in this file:
- Use Case, Misuse Case, Boundary, Equivalence, Positive, Negative, Edge Case.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_use_case__profile_update_then_read(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "profile_use_case.db"))
    app = create_app()
    with TestClient(app) as client:
        updated = client.put(
            "/api/v1/profile",
            json={
                "persona": "job_seeker",
                "target_series": ["2210"],
                "target_locations": ["Remote"],
                "skills_keywords": ["python"],
            },
        )
        fetched = client.get("/api/v1/profile")
    assert updated.status_code == 200
    assert fetched.status_code == 200
    assert "2210" in fetched.json()["target_series"]


def test_misuse_case__profile_sensitive_input_rejected(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "profile_misuse.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.put("/api/v1/profile", json={"skills_keywords": ["123-45-6789"], "persona": "job_seeker"})
    assert response.status_code == 400


def test_boundary__profile_list_size_limit(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "profile_boundary.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.put("/api/v1/profile", json={"target_series": [str(i) for i in range(51)]})
    assert response.status_code == 422


def test_equivalence__profile_list_order_canonical(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "profile_equivalence.db"))
    app = create_app()
    with TestClient(app) as client:
        first = client.put("/api/v1/profile", json={"target_series": ["B", "A"], "persona": "job_seeker"}).json()
        second = client.put("/api/v1/profile", json={"target_series": ["A", "B"], "persona": "job_seeker"}).json()
    assert first["target_series"] == second["target_series"] == ["A", "B"]


def test_positive__profile_default_persona(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "profile_positive.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/profile")
    assert response.status_code == 200
    assert response.json()["persona"] == "job_seeker"


def test_negative__profile_invalid_types_validation(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "profile_negative.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.put("/api/v1/profile", json={"target_series": "not-a-list"})
    assert response.status_code == 422


def test_edge_case__profile_empty_fields_canonical(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "profile_edge.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.put("/api/v1/profile", json={"target_series": [], "target_locations": [], "skills_keywords": []})
    assert response.status_code == 200
    assert response.json()["target_series"] == []
