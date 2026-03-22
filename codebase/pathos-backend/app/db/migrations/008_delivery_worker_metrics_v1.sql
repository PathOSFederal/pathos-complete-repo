-- WHY THIS FILE EXISTS:
-- Adds run metrics and DB-backed scheduler lock for deterministic worker execution.

ALTER TABLE alert_runs ADD COLUMN usajobs_fetch_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alert_runs ADD COLUMN normalize_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alert_runs ADD COLUMN score_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alert_runs ADD COLUMN delta_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alert_runs ADD COLUMN digest_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alert_runs ADD COLUMN suppressed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alert_runs ADD COLUMN backoff_events_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE alert_runs ADD COLUMN lock_acquired INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alert_runs ADD COLUMN lock_released INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS alert_scheduler_locks (
    lock_name TEXT PRIMARY KEY,
    owner_run_id TEXT NOT NULL,
    acquired_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_scheduler_locks_expires ON alert_scheduler_locks(expires_at);
