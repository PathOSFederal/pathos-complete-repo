-- WHY THIS FILE EXISTS:
-- Adds indexes for Job Seeker API hot paths introduced in 003 migration.

CREATE INDEX IF NOT EXISTS idx_upstream_audit_created_at ON upstream_api_audit_records(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_searches_updated_at ON saved_searches(updated_at);
CREATE INDEX IF NOT EXISTS idx_saved_search_runs_saved_search_run_at ON saved_search_runs(saved_search_id, run_at);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_advisor_sessions_created_at ON advisor_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_advisor_session_events_session_created_at ON advisor_session_events(session_id, created_at);
