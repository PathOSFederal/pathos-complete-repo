-- WHY THIS FILE EXISTS:
-- Introduces Job Seeker API surface persistence (slices 21-25) and upstream adapter audit rows.
-- The schema is append-focused and idempotent with IF NOT EXISTS guards.

CREATE TABLE IF NOT EXISTS upstream_api_audit_records (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    query_params_json TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    response_bytes INTEGER NOT NULL,
    truncated BOOLEAN NOT NULL,
    response_sha256 TEXT NOT NULL,
    payload_json TEXT NULL
);

CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    filters_json TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    last_run_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_search_runs (
    id TEXT PRIMARY KEY,
    saved_search_id TEXT NOT NULL,
    run_at TEXT NOT NULL,
    query_fingerprint TEXT NOT NULL,
    job_ids_json TEXT NOT NULL,
    total INTEGER NOT NULL,
    request_id TEXT NOT NULL,
    upstream_trace_hash TEXT NOT NULL,
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id)
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    saved_search_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    job_ids_json TEXT NOT NULL,
    acknowledged_at TEXT NULL,
    FOREIGN KEY(saved_search_id) REFERENCES saved_searches(id)
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    persona TEXT NOT NULL,
    target_series_json TEXT NOT NULL,
    grade_min INTEGER NULL,
    grade_max INTEGER NULL,
    target_locations_json TEXT NOT NULL,
    remote_preference TEXT NULL,
    skills_keywords_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS advisor_sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    closed_at TEXT NULL,
    context_json TEXT NOT NULL,
    request_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS advisor_session_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES advisor_sessions(id)
);
