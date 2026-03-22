# Incident Playbook: Migration Mismatch

## Trigger
- `/health/ready` reports `status=not_ready` and `migration_status=mismatch`.

## Immediate Checks
1. Capture `db_revision` and `alembic_head` from readiness response.
2. Review latest migration audit event status/details.
3. Confirm deployed service version and migration package alignment.

## Triage
1. Determine whether mismatch is forward drift or rollback drift.
2. Block write traffic if consistency risk exists.
3. Prepare migration plan to align revision to head.

## Recovery
1. Run migration workflow to head.
2. Re-check `/health/ready` until `migration_status=ok`.
3. Verify a `migration_audit_written` success event after alignment.
