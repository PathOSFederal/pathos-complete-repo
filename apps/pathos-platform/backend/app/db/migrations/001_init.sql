CREATE TABLE IF NOT EXISTS threads (
    thread_id TEXT PRIMARY KEY,
    created_at TEXT,
    updated_at TEXT,
    title TEXT,
    consent_store BOOLEAN,
    summary TEXT NULL,
    summary_updated_at TEXT NULL,
    summary_version TEXT NOT NULL DEFAULT 'v1'
);

CREATE TABLE IF NOT EXISTS thread_messages (
    message_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    created_at TEXT,
    role TEXT CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    trace_id TEXT NULL,
    FOREIGN KEY(thread_id) REFERENCES threads(thread_id)
);

CREATE TABLE IF NOT EXISTS audit_records (
    trace_id TEXT PRIMARY KEY,
    created_at TEXT,
    input_hash TEXT,
    ruleset_version TEXT,
    engine_version TEXT,
    evaluation_json TEXT NOT NULL,
    narration_json TEXT NULL,
    narration_mode TEXT NULL,
    prompt_bundle_version TEXT NULL
);
