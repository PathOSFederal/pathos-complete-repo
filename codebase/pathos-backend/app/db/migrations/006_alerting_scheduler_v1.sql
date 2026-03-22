-- WHY THIS FILE EXISTS:
-- Adds deterministic alert-rule evaluation persistence for slices 36-45.

CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY,
    saved_search_id TEXT NOT NULL,
    min_score_threshold INTEGER NOT NULL,
    max_per_day INTEGER NOT NULL,
    cooldown_hours INTEGER NOT NULL,
    delivery_mode TEXT NOT NULL,
    enabled BOOLEAN NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id)
);

CREATE TABLE IF NOT EXISTS alert_delivery_log (
    id TEXT PRIMARY KEY,
    alert_rule_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    last_score INTEGER NOT NULL,
    notified_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(alert_rule_id, job_id),
    FOREIGN KEY(alert_rule_id) REFERENCES alert_rules(id)
);

CREATE TABLE IF NOT EXISTS alert_runs (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    ended_at TEXT NULL,
    status TEXT NOT NULL,
    rules_evaluated INTEGER NOT NULL,
    jobs_scanned INTEGER NOT NULL,
    triggers_count INTEGER NOT NULL,
    error_summary TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_saved_search ON alert_rules(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_rule_job ON alert_delivery_log(alert_rule_id, job_id);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_rule_notified ON alert_delivery_log(alert_rule_id, notified_at);
CREATE INDEX IF NOT EXISTS idx_alert_runs_started_at ON alert_runs(started_at);
