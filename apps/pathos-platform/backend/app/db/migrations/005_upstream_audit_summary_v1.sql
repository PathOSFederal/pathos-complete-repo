-- WHY THIS FILE EXISTS:
-- Converts upstream audit storage from raw payload-centric fields to summary-only fields.
-- The migration is idempotent because each column add uses IF NOT EXISTS.

ALTER TABLE upstream_api_audit_records ADD COLUMN query_hash TEXT;
ALTER TABLE upstream_api_audit_records ADD COLUMN latency_ms INTEGER;
ALTER TABLE upstream_api_audit_records ADD COLUMN result_count INTEGER;
ALTER TABLE upstream_api_audit_records ADD COLUMN error_class TEXT;

CREATE INDEX IF NOT EXISTS idx_upstream_audit_query_hash ON upstream_api_audit_records(query_hash);
