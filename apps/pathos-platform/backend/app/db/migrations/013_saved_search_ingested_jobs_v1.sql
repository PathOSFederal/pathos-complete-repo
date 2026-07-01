-- WHY THIS FILE EXISTS:
-- Persists bounded canonical USAJOBS records per saved-search slice.
-- Preserves mapper version, upstream lineage, and deterministic upsert state.

CREATE TABLE IF NOT EXISTS saved_search_ingested_jobs (
    id TEXT PRIMARY KEY,
    saved_search_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    source TEXT NOT NULL,
    source_slice_json TEXT NOT NULL,
    mapper_version TEXT NOT NULL,
    query_fingerprint TEXT NOT NULL,
    upstream_audit_id TEXT NULL,
    upstream_raw_hash TEXT NULL,
    canonical_job_sha256 TEXT NOT NULL,
    canonical_job_json TEXT NOT NULL,
    ingest_warnings_json TEXT NOT NULL,
    lifecycle_state TEXT NOT NULL DEFAULT 'open',
    closed_at TEXT NULL,
    first_ingested_at TEXT NOT NULL,
    last_ingested_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    last_changed_at TEXT NOT NULL,
    unchanged_run_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(saved_search_id, job_id),
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_sync_runs (
    id TEXT PRIMARY KEY,
    saved_search_id TEXT NULL,
    source TEXT NOT NULL,
    trigger_mode TEXT NOT NULL,
    run_mode TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    records_fetched INTEGER NOT NULL,
    new_jobs INTEGER NOT NULL,
    updated_jobs INTEGER NOT NULL,
    unchanged_jobs INTEGER NOT NULL,
    closed_jobs INTEGER NOT NULL,
    failed_partitions_json TEXT NOT NULL,
    stale_partitions_json TEXT NOT NULL,
    alert_events_queued INTEGER NOT NULL,
    indexing_events_queued INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_summary TEXT NULL,
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_change_log (
    id TEXT PRIMARY KEY,
    sync_run_id TEXT NULL,
    saved_search_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    change_type TEXT NOT NULL,
    changed_fields_json TEXT NOT NULL,
    previous_hash TEXT NULL,
    new_hash TEXT NULL,
    source_slice_json TEXT NOT NULL,
    upstream_audit_id TEXT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_search_ingested_jobs_search_seen
    ON saved_search_ingested_jobs(saved_search_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_search_ingested_jobs_query_fingerprint
    ON saved_search_ingested_jobs(query_fingerprint);

CREATE INDEX IF NOT EXISTS idx_job_sync_runs_completed
    ON job_sync_runs(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_change_log_search_created
    ON job_change_log(saved_search_id, created_at DESC);
