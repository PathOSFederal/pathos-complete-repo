from __future__ import annotations

import logging
import sqlite3

import pytest

from app.db.connection import init_db
from app.db.migration_safety import MigrationSafetyError, MigrationSafetyResult


def test_init_db_production_raises_on_migration_mismatch(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_ENV", "production")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "slice87-prod.db"))

    def _raise(*_args, **_kwargs):
        raise MigrationSafetyError(
            "Database schema revision mismatch detected. current revision: old; head revision: new; remediation: alembic upgrade head"
        )

    monkeypatch.setattr("app.db.connection.assert_db_at_head", _raise)

    with pytest.raises(MigrationSafetyError):
        init_db()


def test_init_db_dev_warns_on_migration_mismatch(monkeypatch, tmp_path, caplog) -> None:
    monkeypatch.setenv("PATHOS_ENV", "local")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "slice87-dev.db"))

    monkeypatch.setattr(
        "app.db.connection.assert_db_at_head",
        lambda *_args, **_kwargs: MigrationSafetyResult(
            db_revision="old_revision",
            alembic_head="new_revision",
            migration_status="mismatch",
            message=(
                "Database schema revision mismatch detected. current revision: old_revision; "
                "head revision: new_revision; remediation: alembic upgrade head"
            ),
        ),
    )

    with caplog.at_level(logging.WARNING):
        init_db()

    matching_records = [
        record
        for record in caplog.records
        if record.getMessage()
        == "Database revision mismatch detected during startup migration safety enforcement."
    ]
    assert matching_records
    record = matching_records[0]
    details = getattr(record, "json_extra", {}).get("details")
    if isinstance(details, dict):
        assert details["db_revision"] == "old_revision"
        assert details["alembic_head"] == "new_revision"
        assert "alembic upgrade head" in details["remediation"]
    else:
        assert record.db_revision == "old_revision"
        assert record.alembic_head == "new_revision"
        assert "alembic upgrade head" in record.remediation


def test_init_db_mismatch_writes_migration_audit_row(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "slice87-migration-audit.db"
    monkeypatch.setenv("PATHOS_ENV", "local")
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))

    monkeypatch.setattr(
        "app.db.connection.assert_db_at_head",
        lambda *_args, **_kwargs: MigrationSafetyResult(
            db_revision="old_revision",
            alembic_head="new_revision",
            migration_status="mismatch",
            message=(
                "Database schema revision mismatch detected. current revision: old_revision; "
                "head revision: new_revision; remediation: alembic upgrade head"
            ),
        ),
    )

    init_db()

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT status, db_revision, alembic_head, details_json
            FROM db_migration_audit
            ORDER BY applied_at DESC
            LIMIT 1
            """
        ).fetchone()
    assert row is not None
    assert row[0] == "mismatch"
    assert row[1] == "old_revision"
    assert row[2] == "new_revision"
    assert "mismatch" in str(row[3])
