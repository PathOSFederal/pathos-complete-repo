# Backend Runbook v1

## Scope
This runbook covers operational actions for worker controls, migration safety, diagnostics, retention, and wipe workflows in beta environments.

## Start/Stop Worker (Ops Flags)
1. Set `WORKER_ENABLED=true` to allow worker runs.
2. Set `WORKER_ENABLED=false` to pause worker execution deterministically.
3. Optional controls:
   - `ALERTS_EVALUATION_ENABLED=false` to stop evaluation.
   - `ALERTS_DELIVERY_ENABLED=false` to skip delivery side-effects.
   - `DRY_RUN_MODE=true` to evaluate without digest/delivery writes.
4. Verify state via:
   - `GET /api/v1/ops/status`
   - `GET /health/ready` and check `worker_operational_state`.

## Verify Migrations At Head
1. Call `GET /health/ready`.
2. Confirm:
   - `status=ready`
   - `migration_status=ok`
   - `db_revision == alembic_head`
3. If mismatch:
   - apply migrations (`alembic upgrade head` in deployment workflow)
   - re-check `/health/ready`.

## Interpret Migration Audit
1. Use diagnostics or DB query for latest `migration_audit` row.
2. Expected statuses:
   - `success`: revision aligned at startup/upgrade.
   - `mismatch`: revision drift detected; readiness should report `not_ready`.
   - `failure`: migration operation failed; escalate.

## Verify Readiness + Diagnostics
1. `GET /health/ready` for operational readiness.
2. `GET /api/v1/diagnostics/snapshot` for safe runtime summary.
3. Ensure responses contain no secrets and no raw upstream payload fields.

## Retention Cleanup
1. Run:
   - `poetry run python scripts/ops/run_retention_cleanup.py`
2. Confirm structured event `retention_cleanup_executed` in logs.
3. Re-check key table counts through diagnostics/DB.

## Wipe Procedure
1. Execute wipe endpoint with explicit confirmation token from API client.
2. Confirm response summary indicates deletion counts for threads, audits, searches, alerts, and digest/run records.
3. Confirm structured event `wipe_operation_completed`.

## Common Failure Modes
### Worker Stuck / Lock Contention
- Symptoms: repeated blocked runs, stale lock owner.
- Checks: `lock_state_summary` in `/health/ready`, worker logs around lock acquire/release.
- Next: verify one active scheduler instance, clear stale lock only after TTL and operator validation.

### Migration Mismatch
- Symptoms: `/health/ready` returns `not_ready` with mismatch.
- Checks: `db_revision`, `alembic_head`, latest migration audit status.
- Next: run migration to head and revalidate readiness.

### Integrity Failure (Export/Upstream Hash Mismatch)
- Symptoms: export hash mismatch across expected-identical payloads, upstream tamper detection.
- Checks: compare deterministic inputs and stored hash metadata.
- Next: treat as high-signal integrity incident and preserve evidence before remediation.

### Postgres Unavailable / Timeout
- Symptoms: startup/readiness DB unavailable or timeout exceptions.
- Checks: DB endpoint reachability, credentials/secret injection, network policy, connection limits.
- Next: restore DB connectivity first; then rerun readiness and self-check.
