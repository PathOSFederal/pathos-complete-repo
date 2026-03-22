from __future__ import annotations

import os
import sqlite3
from importlib.util import find_spec
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

# WHY: The Alembic upgrade tests should assert against the current head so they
#      catch missing revisions in CI. Update this value whenever a new revision
#      becomes the head of the migration chain.
ALEMBIC_HEAD_REVISION = "20260223_000003"


def _build_alembic_config() -> Config:
    repo_root = Path(__file__).resolve().parents[1]
    config = Config(str(repo_root / "alembic.ini"))
    config.set_main_option("script_location", str(repo_root / "alembic"))
    return config


def _normalize_sqlalchemy_postgres_url(database_url: str) -> str:
    """Force SQLAlchemy tests to use psycopg v3 instead of psycopg2 defaults."""
    if database_url.startswith("postgresql+psycopg://"):
        return database_url
    if database_url.startswith("postgresql://"):
        return f"postgresql+psycopg://{database_url[len('postgresql://') :]}"
    if database_url.startswith("postgres://"):
        return f"postgresql+psycopg://{database_url[len('postgres://') :]}"
    return database_url


def test_alembic_upgrade_head_sqlite(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "slice86-alembic.sqlite3"
    monkeypatch.setenv("DB_DIALECT", "sqlite")
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.delenv("DATABASE_URL", raising=False)

    command.upgrade(_build_alembic_config(), "head")

    assert db_path.exists()
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT version_num FROM alembic_version").fetchone()
    assert row is not None
    assert row[0] == ALEMBIC_HEAD_REVISION


def test_alembic_upgrade_head_postgres_optional(monkeypatch) -> None:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        pytest.skip(
            "DATABASE_URL not set; skipping optional Alembic postgres migration test."
        )
    if find_spec("psycopg") is None:
        pytest.skip(
            "psycopg not installed; skipping optional Alembic postgres migration test."
        )
    if not database_url.startswith(
        ("postgresql://", "postgres://", "postgresql+psycopg://")
    ):
        pytest.skip(
            "DATABASE_URL is not a Postgres URL; skipping optional Alembic postgres migration test."
        )

    monkeypatch.setenv("DB_DIALECT", "postgres")
    monkeypatch.setenv("DATABASE_URL", database_url)

    command.upgrade(_build_alembic_config(), "head")

    engine = create_engine(_normalize_sqlalchemy_postgres_url(database_url))
    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT version_num FROM alembic_version")
        ).first()
    assert row is not None
    assert row[0] == ALEMBIC_HEAD_REVISION
