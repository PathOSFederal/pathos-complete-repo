-- WHY THIS FILE EXISTS:
-- Adds append-only migration safety audit rows for traceability.

CREATE TABLE IF NOT EXISTS db_migration_audit (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL,
    db_revision TEXT NULL,
    alembic_head TEXT NULL,
    status TEXT NOT NULL,
    environment TEXT NOT NULL,
    service_version TEXT NOT NULL,
    details_json TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_db_migration_audit_applied_at
ON db_migration_audit(applied_at);
