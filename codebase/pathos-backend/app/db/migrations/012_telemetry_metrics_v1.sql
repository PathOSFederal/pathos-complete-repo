-- WHY THIS FILE EXISTS:
-- Adds bounded telemetry counters/timings storage with no content payload capture.

CREATE TABLE IF NOT EXISTS telemetry_metrics (
    metric_key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    total_duration_ms INTEGER NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_metrics_updated_at
ON telemetry_metrics(updated_at);
