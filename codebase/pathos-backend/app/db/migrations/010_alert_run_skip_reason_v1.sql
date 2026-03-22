-- WHY THIS FILE EXISTS:
-- Adds explicit skip metadata so alert-run results can honestly report non-scan outcomes.

ALTER TABLE alert_runs ADD COLUMN skip_reason TEXT NULL;
ALTER TABLE alert_runs ADD COLUMN skip_details TEXT NULL;
