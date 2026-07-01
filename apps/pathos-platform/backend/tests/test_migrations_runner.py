import sqlite3

from app.db.connection import init_db
from app.db.migration_safety import MigrationSafetyError, assert_db_at_head
from app.db.migrations.runner import MIGRATIONS_DIR, run_migrations
from app.db.repo.audit_repo import AuditRepo
from app.db.repo.thread_repo import ThreadRepo


def _index_columns(conn, index_name: str) -> list[str]:
    rows = conn.execute(f"PRAGMA index_info({index_name})").fetchall()
    return [row[2] for row in rows]


def _has_unique_index(conn, table_name: str, columns: list[str]) -> bool:
    indexes = conn.execute(f"PRAGMA index_list({table_name})").fetchall()
    for index_row in indexes:
        index_name = index_row[1]
        is_unique = bool(index_row[2])
        if is_unique and _index_columns(conn, index_name) == columns:
            return True
    return False


def test_migration_runner_applies_and_is_idempotent(tmp_path) -> None:
    db_path = tmp_path / "migrations_test.db"
    migration_files = sorted(path.name for path in MIGRATIONS_DIR.glob("*.sql"))

    first_run = run_migrations(db_path=db_path)
    second_run = run_migrations(db_path=db_path)

    assert first_run == len(migration_files)
    assert second_run == 0

    with sqlite3.connect(db_path) as conn:
        applied = conn.execute(
            "SELECT migration_id FROM schema_migrations ORDER BY migration_id"
        ).fetchall()
        applied_ids = [row[0] for row in applied]
        assert applied_ids == migration_files

        indexes = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index'"
        ).fetchall()
        index_names = {row[0] for row in indexes}
        assert "idx_audit_records_created_at" in index_names
        assert "idx_threads_updated_at" in index_names
        assert "idx_thread_messages_thread_created_at" in index_names

        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        table_names = {row[0] for row in tables}
        assert "job_alert_events" in table_names
        assert "job_page_indexing_events" in table_names
        for table_name in ("job_alert_events", "job_page_indexing_events"):
            assert _has_unique_index(conn, table_name, ["dedupe_key"])
            prefix = f"idx_{table_name}"
            assert f"{prefix}_sync_run" in index_names
            assert f"{prefix}_status" in index_names
            assert f"{prefix}_type" in index_names
            assert f"{prefix}_job" in index_names
            assert f"{prefix}_canonical_job" in index_names
            assert f"{prefix}_saved_search" in index_names
            assert _index_columns(conn, f"{prefix}_sync_run") == [
                "sync_run_id"
            ]
            assert _index_columns(conn, f"{prefix}_status") == ["status"]
            assert _index_columns(conn, f"{prefix}_type") == ["event_type"]
            assert _index_columns(conn, f"{prefix}_job") == [
                "source_job_id"
            ]
            assert _index_columns(conn, f"{prefix}_canonical_job") == [
                "canonical_job_id"
            ]
            assert _index_columns(conn, f"{prefix}_saved_search") == [
                "saved_search_id"
            ]


def test_recent_repo_methods_work_after_migrations(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "repo_test.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    init_db()

    AuditRepo.save_evaluation(
        {
            "trace_id": "t1",
            "created_at": "2026-02-12T10:00:00+00:00",
            "input_hash": "h1",
            "ruleset_version": "v0.1.0",
            "engine_version": "deterministic-engine-v1",
            "evaluation_json": "{}",
            "narration_json": None,
            "narration_mode": None,
            "prompt_bundle_version": None,
        }
    )
    AuditRepo.save_evaluation(
        {
            "trace_id": "t2",
            "created_at": "2026-02-12T11:00:00+00:00",
            "input_hash": "h2",
            "ruleset_version": "v0.1.0",
            "engine_version": "deterministic-engine-v1",
            "evaluation_json": "{}",
            "narration_json": None,
            "narration_mode": None,
            "prompt_bundle_version": None,
        }
    )

    thread1 = ThreadRepo.create_thread(title="older thread", consent_store=True)
    thread2 = ThreadRepo.create_thread(title="newer thread", consent_store=True)

    audits = AuditRepo.list_recent_audits(limit=2)
    threads = ThreadRepo.list_threads(limit=2)

    assert [row["trace_id"] for row in audits] == ["t2", "t1"]
    assert [row.thread_id for row in threads] == [thread2.thread_id, thread1.thread_id]


def test_migration_safety_check_reports_revision_mismatch_with_remediation() -> None:
    class _Conn:
        def execute(self, *_args, **_kwargs):
            class _Cursor:
                def fetchone(self):
                    return ("old_revision",)

            return _Cursor()

    try:
        assert_db_at_head("fail", connection_or_engine=_Conn())
        assert False, "Expected MigrationSafetyError"
    except MigrationSafetyError as exc:
        message = str(exc)
        assert "current revision: old_revision" in message
        assert "head revision:" in message
        assert "alembic upgrade head" in message
