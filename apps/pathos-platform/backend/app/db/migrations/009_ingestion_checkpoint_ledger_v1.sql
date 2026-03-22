-- WHY THIS FILE EXISTS:
-- Adds explicit ingestion ledger and checkpoint state for deterministic replayability.
-- Uses portable SQL to support SQLite and Postgres.

CREATE TABLE IF NOT EXISTS saved_search_ingestion_ledger (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    alert_run_id TEXT NOT NULL,
    alert_rule_id TEXT NOT NULL,
    saved_search_id TEXT NOT NULL,
    status TEXT NOT NULL,
    jobs_scanned INTEGER NOT NULL,
    triggers_count INTEGER NOT NULL,
    suppressed_count INTEGER NOT NULL,
    query_fingerprint TEXT NULL,
    cursor_used_json TEXT NOT NULL,
    cursor_next_json TEXT NOT NULL,
    error_summary TEXT NULL,
    completed_at TEXT NOT NULL,
    UNIQUE(run_id),
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_search_checkpoints (
    saved_search_id TEXT PRIMARY KEY,
    last_successful_run_id TEXT NOT NULL,
    last_successful_alert_run_id TEXT NOT NULL,
    last_successful_rule_id TEXT NOT NULL,
    last_successful_at TEXT NOT NULL,
    last_query_fingerprint TEXT NULL,
    cursor_state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_search_ingestion_ledger_search_completed
    ON saved_search_ingestion_ledger(saved_search_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_search_checkpoints_updated
    ON saved_search_checkpoints(updated_at DESC);
