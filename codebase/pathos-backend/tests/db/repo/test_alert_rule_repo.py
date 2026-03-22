from __future__ import annotations

import os
from importlib.util import find_spec

import pytest

from app.core.config import refresh_settings
from app.db.connection import connect, init_db
from app.db.repo.alert_rule_repo import AlertRuleRepo


def _insert_alert_rule(*, rule_id: str, saved_search_id: str, enabled: bool) -> None:
    init_db()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO alert_rules (
                id,
                saved_search_id,
                min_score_threshold,
                max_per_day,
                cooldown_hours,
                delivery_mode,
                enabled,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rule_id,
                saved_search_id,
                80,
                10,
                24,
                "digest",
                enabled,
                "2026-02-21T00:00:00+00:00",
                "2026-02-21T00:00:00+00:00",
            ),
        )
        conn.commit()


def _insert_saved_search(saved_search_id: str) -> None:
    init_db()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO saved_searches (id, name, filters_json, is_enabled, last_run_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                saved_search_id,
                f"saved-search-{saved_search_id}",
                "{}",
                True,
                None,
                "2026-02-21T00:00:00+00:00",
                "2026-02-21T00:00:00+00:00",
            ),
        )
        conn.commit()


def test_list_enabled_filters_rows_sqlite(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("DB_DIALECT", "sqlite")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alert_rule_repo.db"))
    refresh_settings()

    _insert_saved_search("saved-sqlite")
    _insert_alert_rule(rule_id="rule-enabled-sqlite", saved_search_id="saved-sqlite", enabled=True)
    _insert_alert_rule(rule_id="rule-disabled-sqlite", saved_search_id="saved-sqlite", enabled=False)

    rows = AlertRuleRepo.list_enabled()
    assert [row["id"] for row in rows] == ["rule-enabled-sqlite"]


def test_list_enabled_filters_rows_postgres(monkeypatch) -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        pytest.skip("DATABASE_URL not set; skipping postgres alert rule repo test.")
    if find_spec("psycopg") is None:
        pytest.skip("psycopg not installed; skipping postgres alert rule repo test.")

    monkeypatch.setenv("DB_DIALECT", "postgres")
    monkeypatch.setenv("DATABASE_URL", database_url)
    refresh_settings()

    saved_search_id = "saved-pg-alert-rule-repo-test"
    enabled_rule_id = "rule-enabled-pg"
    disabled_rule_id = "rule-disabled-pg"

    with connect() as conn:
        conn.execute("DELETE FROM alert_rules WHERE id IN (?, ?)", (enabled_rule_id, disabled_rule_id))
        conn.execute("DELETE FROM saved_searches WHERE id = ?", (saved_search_id,))
        conn.commit()

    _insert_saved_search(saved_search_id)
    _insert_alert_rule(rule_id=enabled_rule_id, saved_search_id=saved_search_id, enabled=True)
    _insert_alert_rule(rule_id=disabled_rule_id, saved_search_id=saved_search_id, enabled=False)

    rows = AlertRuleRepo.list_enabled()
    assert [row["id"] for row in rows if row["id"] in {enabled_rule_id, disabled_rule_id}] == [enabled_rule_id]

    with connect() as conn:
        conn.execute("DELETE FROM alert_rules WHERE id IN (?, ?)", (enabled_rule_id, disabled_rule_id))
        conn.execute("DELETE FROM saved_searches WHERE id = ?", (saved_search_id,))
        conn.commit()


def test_enabled_predicate_changes_by_dialect(monkeypatch) -> None:
    monkeypatch.setenv("DB_DIALECT", "sqlite")
    refresh_settings()
    assert AlertRuleRepo._enabled_predicate() == "enabled = 1"

    monkeypatch.setenv("DB_DIALECT", "postgres")
    refresh_settings()
    assert AlertRuleRepo._enabled_predicate() == "enabled IS TRUE"
