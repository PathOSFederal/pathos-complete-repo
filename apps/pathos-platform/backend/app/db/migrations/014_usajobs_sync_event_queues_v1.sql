-- WHY THIS FILE EXISTS:
-- Adds staging-safe USAJOBS sync event queues. These are durable outbox rows
-- for later alert/indexing workers; this migration does not enable delivery.

CREATE TABLE IF NOT EXISTS job_alert_events (
    id TEXT PRIMARY KEY,
    sync_run_id TEXT NOT NULL,
    saved_search_id TEXT NULL,
    source_job_id TEXT NOT NULL,
    canonical_job_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    payload_summary_json TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(sync_run_id) REFERENCES job_sync_runs(id) ON DELETE CASCADE,
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_page_indexing_events (
    id TEXT PRIMARY KEY,
    sync_run_id TEXT NOT NULL,
    saved_search_id TEXT NULL,
    source_job_id TEXT NOT NULL,
    canonical_job_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    payload_summary_json TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(sync_run_id) REFERENCES job_sync_runs(id) ON DELETE CASCADE,
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_job_alert_events_sync_run
    ON job_alert_events(sync_run_id);

CREATE INDEX IF NOT EXISTS idx_job_alert_events_status
    ON job_alert_events(status);

CREATE INDEX IF NOT EXISTS idx_job_alert_events_type
    ON job_alert_events(event_type);

CREATE INDEX IF NOT EXISTS idx_job_alert_events_job
    ON job_alert_events(source_job_id);

CREATE INDEX IF NOT EXISTS idx_job_alert_events_canonical_job
    ON job_alert_events(canonical_job_id);

CREATE INDEX IF NOT EXISTS idx_job_alert_events_saved_search
    ON job_alert_events(saved_search_id);

CREATE INDEX IF NOT EXISTS idx_job_page_indexing_events_sync_run
    ON job_page_indexing_events(sync_run_id);

CREATE INDEX IF NOT EXISTS idx_job_page_indexing_events_status
    ON job_page_indexing_events(status);

CREATE INDEX IF NOT EXISTS idx_job_page_indexing_events_type
    ON job_page_indexing_events(event_type);

CREATE INDEX IF NOT EXISTS idx_job_page_indexing_events_job
    ON job_page_indexing_events(source_job_id);

CREATE INDEX IF NOT EXISTS idx_job_page_indexing_events_canonical_job
    ON job_page_indexing_events(canonical_job_id);

CREATE INDEX IF NOT EXISTS idx_job_page_indexing_events_saved_search
    ON job_page_indexing_events(saved_search_id);
