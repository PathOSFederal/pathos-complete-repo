from __future__ import annotations

import sys
import types
from pathlib import Path

from app.core.config import refresh_settings
from app.db import connection as connection_module
from app.db.migrations import runner as runner_module


class FakeCursor:
    def __init__(self, rows=None) -> None:
        self._rows = rows or []

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakeConnection:
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple | None]] = []

    def execute(self, sql: str, params=None):
        self.calls.append((sql, params))
        if "information_schema.tables" in sql:
            return FakeCursor([{"exists": 1}])
        if "SELECT migration_id FROM schema_migrations" in sql:
            return FakeCursor([])
        if "SELECT 1" in sql:
            return FakeCursor([{"ok": 1}])
        return FakeCursor([])

    def commit(self) -> None:
        return None

    def close(self) -> None:
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def _install_fake_psycopg(monkeypatch, created):
    def fake_connect(*_args, **_kwargs):
        created["conn"] = FakeConnection()
        return created["conn"]

    fake_psycopg = types.SimpleNamespace(connect=fake_connect)
    fake_rows = types.SimpleNamespace(dict_row=object())
    monkeypatch.setitem(sys.modules, "psycopg", fake_psycopg)
    monkeypatch.setitem(sys.modules, "psycopg.rows", fake_rows)


def test_postgres_connection_adapts_placeholders_and_executescript(monkeypatch) -> None:
    created: dict[str, FakeConnection] = {}
    _install_fake_psycopg(monkeypatch, created)
    monkeypatch.setenv("DB_DIALECT", "postgres")
    monkeypatch.setenv("DATABASE_URL", "postgresql://fake")
    refresh_settings()

    conn = connection_module.connect()
    conn.execute("SELECT ? AS value", (1,))
    conn.executescript("SELECT 1; SELECT 2;")
    conn.commit()
    conn.close()

    recorded = created["conn"].calls
    assert recorded[0][0] == "SELECT %s AS value"
    assert len([call for call in recorded if call[0].startswith("SELECT")]) >= 3
    assert connection_module._adapt_sql_placeholders("SELECT 1") == "SELECT 1"


def test_postgres_table_columns_path() -> None:
    class FakeColumnsConnection(FakeConnection):
        def execute(self, *_args, **_kwargs):
            return FakeCursor([{"column_name": "summary"}])

    columns = connection_module._table_columns(FakeColumnsConnection(), "threads", dialect="postgres")
    assert "summary" in columns


def test_runner_connect_postgres_uses_fake_psycopg(monkeypatch) -> None:
    created: dict[str, FakeConnection] = {}
    _install_fake_psycopg(monkeypatch, created)
    monkeypatch.setenv("DATABASE_URL", "postgresql://fake")
    refresh_settings()
    conn = runner_module._connect_postgres()
    assert isinstance(conn, FakeConnection)


def test_postgres_migration_runner_paths(monkeypatch) -> None:
    fake_connection = FakeConnection()
    monkeypatch.setattr(runner_module, "get_db_dialect", lambda: "postgres")
    monkeypatch.setattr(runner_module, "_connect_postgres", lambda: fake_connection)

    pending = runner_module.get_pending_migrations(Path("data/pathos.db"))
    expected = sorted(path.name for path in runner_module.MIGRATIONS_DIR.glob("*.sql"))
    assert pending == expected

    applied = runner_module.run_migrations(Path("data/pathos.db"))
    assert applied == len(list(runner_module.MIGRATIONS_DIR.glob("*.sql")))
