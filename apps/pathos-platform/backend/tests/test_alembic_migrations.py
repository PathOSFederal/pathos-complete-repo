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
ALEMBIC_HEAD_REVISION = "20260327_000001"
DAY52_SCHEMA_HARDENING_INDEXES = {
    "idx_job_change_log_sync_run",
    "idx_job_change_log_change_type",
    "idx_job_change_log_job",
    "idx_saved_search_ingested_jobs_lifecycle",
    "idx_saved_search_ingested_jobs_job",
    "idx_job_sync_runs_status",
    "idx_job_sync_runs_source_status",
}


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


def _sqlite_index_columns(conn: sqlite3.Connection, index_name: str) -> list[str]:
    rows = conn.execute(f"PRAGMA index_info({index_name})").fetchall()
    return [str(row[2]) for row in rows]


def test_alembic_upgrade_head_sqlite(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "slice86-alembic.sqlite3"
    monkeypatch.setenv("DB_DIALECT", "sqlite")
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.delenv("DATABASE_URL", raising=False)

    command.upgrade(_build_alembic_config(), "head")

    assert db_path.exists()
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT version_num FROM alembic_version").fetchone()
        indexes = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index'"
        ).fetchall()
        index_names = {str(index_row[0]) for index_row in indexes}
        sync_run_columns = _sqlite_index_columns(conn, "idx_job_change_log_sync_run")
        change_type_columns = _sqlite_index_columns(
            conn,
            "idx_job_change_log_change_type",
        )
        change_job_columns = _sqlite_index_columns(conn, "idx_job_change_log_job")
        lifecycle_columns = _sqlite_index_columns(
            conn,
            "idx_saved_search_ingested_jobs_lifecycle",
        )
        ingested_job_columns = _sqlite_index_columns(
            conn,
            "idx_saved_search_ingested_jobs_job",
        )
        sync_status_columns = _sqlite_index_columns(conn, "idx_job_sync_runs_status")
        sync_source_status_columns = _sqlite_index_columns(
            conn,
            "idx_job_sync_runs_source_status",
        )
    assert row is not None
    assert row[0] == ALEMBIC_HEAD_REVISION
    assert sync_run_columns == ["sync_run_id"]
    assert change_type_columns == ["change_type"]
    assert change_job_columns == ["job_id"]
    assert lifecycle_columns == ["lifecycle_state"]
    assert ingested_job_columns == ["job_id"]
    assert sync_status_columns == ["status"]
    assert sync_source_status_columns == ["source", "status"]
    assert "idx_job_change_log_sync_run" in index_names


def test_alembic_day52_downgrade_removes_schema_hardening_indexes(
    monkeypatch,
    tmp_path,
) -> None:
    db_path = tmp_path / "day52-downgrade.sqlite3"
    monkeypatch.setenv("DB_DIALECT", "sqlite")
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.delenv("DATABASE_URL", raising=False)

    config = _build_alembic_config()
    command.upgrade(config, "head")
    command.downgrade(config, "20260326_000001")

    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT version_num FROM alembic_version").fetchone()
        indexes = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index'"
        ).fetchall()
        index_names = {str(index_row[0]) for index_row in indexes}

    assert row is not None
    assert row[0] == "20260326_000001"
    assert DAY52_SCHEMA_HARDENING_INDEXES.isdisjoint(index_names)


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
