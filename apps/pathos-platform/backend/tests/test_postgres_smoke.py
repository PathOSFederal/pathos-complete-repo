from __future__ import annotations

import os
from importlib.util import find_spec
from pathlib import Path

import pytest

from app.core.config import refresh_settings
from app.db.connection import connect
from app.db.migrations.runner import run_migrations


def test_postgres_smoke(monkeypatch) -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        pytest.skip("DATABASE_URL not set; skipping postgres smoke test.")
    if find_spec("psycopg") is None:
        pytest.skip("psycopg not installed; skipping postgres smoke test.")

    monkeypatch.setenv("DB_DIALECT", "postgres")
    refresh_settings()

    run_migrations(Path("data/pathos.db"))
    with connect() as conn:
        row = conn.execute("SELECT 1 AS ok").fetchone()
    assert row is not None
