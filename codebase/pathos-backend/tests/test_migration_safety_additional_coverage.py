from __future__ import annotations

import pytest

from app.db.migration_safety import (
    MigrationSafetyError,
    assert_db_at_head,
    get_db_revision,
)


def test_get_db_revision_returns_none_when_query_execution_fails() -> None:
    class _FailingConnection:
        def execute(self, _query: str):
            raise RuntimeError("db unavailable")

    assert get_db_revision(_FailingConnection()) is None


def test_assert_db_at_head_fail_mode_raises_on_deterministic_mismatch(
    monkeypatch,
) -> None:
    monkeypatch.setattr("app.db.migration_safety.get_db_revision", lambda _conn: "old")
    monkeypatch.setattr("app.db.migration_safety.get_alembic_head", lambda: "new")

    with pytest.raises(MigrationSafetyError) as exc:
        assert_db_at_head("fail", connection_or_engine=object())

    assert str(exc.value) == (
        "Database schema revision mismatch detected. "
        "current revision: old; "
        "head revision: new; "
        "remediation: alembic upgrade head"
    )
