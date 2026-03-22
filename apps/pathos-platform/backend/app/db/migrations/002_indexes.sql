CREATE INDEX IF NOT EXISTS idx_audit_records_created_at ON audit_records(created_at);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created_at ON thread_messages(thread_id, created_at);
