-- WHY THIS FILE EXISTS:
-- Adds deterministic delta tracking, digest persistence, and observability history tables.

CREATE TABLE IF NOT EXISTS saved_search_job_snapshots (
    id TEXT PRIMARY KEY,
    saved_search_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    last_fingerprint TEXT NOT NULL,
    previous_score INTEGER NULL,
    last_score INTEGER NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(saved_search_id, job_id),
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id)
);

CREATE TABLE IF NOT EXISTS alert_digests (
    id TEXT PRIMARY KEY,
    alert_run_id TEXT NOT NULL,
    alert_rule_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    delivery_mode TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY(alert_run_id) REFERENCES alert_runs(id),
    FOREIGN KEY(alert_rule_id) REFERENCES alert_rules(id)
);

CREATE TABLE IF NOT EXISTS alert_rule_runs (
    id TEXT PRIMARY KEY,
    alert_run_id TEXT NOT NULL,
    alert_rule_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    status TEXT NOT NULL,
    jobs_scanned INTEGER NOT NULL,
    triggers_count INTEGER NOT NULL,
    suppressed_count INTEGER NOT NULL,
    error_summary TEXT NULL,
    backoff_events_json TEXT NOT NULL,
    FOREIGN KEY(alert_run_id) REFERENCES alert_runs(id),
    FOREIGN KEY(alert_rule_id) REFERENCES alert_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_saved_search_snapshot_search_job ON saved_search_job_snapshots(saved_search_id, job_id);
CREATE INDEX IF NOT EXISTS idx_alert_digests_rule_created ON alert_digests(alert_rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rule_runs_rule_started ON alert_rule_runs(alert_rule_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rule_runs_run_id ON alert_rule_runs(alert_run_id);
