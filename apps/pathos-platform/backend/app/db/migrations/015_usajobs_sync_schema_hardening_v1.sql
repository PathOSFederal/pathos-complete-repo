-- WHY THIS FILE EXISTS:
-- Adds low-risk operational indexes for USAJOBS sync integrity checks.
-- SQLite cannot safely add every desired FK/CHECK constraint in-place, so this
-- migration tightens lookup paths without rebuilding populated tables.

CREATE INDEX IF NOT EXISTS idx_job_change_log_sync_run
    ON job_change_log(sync_run_id);

CREATE INDEX IF NOT EXISTS idx_job_change_log_change_type
    ON job_change_log(change_type);

CREATE INDEX IF NOT EXISTS idx_job_change_log_job
    ON job_change_log(job_id);

CREATE INDEX IF NOT EXISTS idx_saved_search_ingested_jobs_lifecycle
    ON saved_search_ingested_jobs(lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_saved_search_ingested_jobs_job
    ON saved_search_ingested_jobs(job_id);

CREATE INDEX IF NOT EXISTS idx_job_sync_runs_status
    ON job_sync_runs(status);

CREATE INDEX IF NOT EXISTS idx_job_sync_runs_source_status
    ON job_sync_runs(source, status);
