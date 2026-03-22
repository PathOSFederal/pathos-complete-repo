# Change Brief — Slices 93–95 Trust Boundary + Deterministic Integrity v1

## Summary
This sprint strengthens PathOS backend trust guarantees and pre-beta integrity by adding export integrity hashing, upstream payload immutability checks, migration audit traceability, stronger deterministic vs narration isolation, and a full-system integrity harness.

## What changed
- Export responses now include deterministic integrity metadata (SHA-256 hash and related fields), with structured logging.
- Audit behavior is enforced as append-only, preventing silent mutation of audit history.
- Upstream raw job payloads now have stored integrity hashes and verification to detect tampering or unintended mutation.
- Migration events are now traceable:
  - Added an Alembic migration for Postgres and a SQLite migration for the audit table.
  - Runtime records migration upgrade/mismatch events for operational traceability.
- Strengthened deterministic vs narration isolation:
  - Narration failures no longer risk affecting deterministic evaluation outcomes.
  - Added/strengthened tests to enforce the boundary and fallback behavior.
- Added a full system integrity harness test that exercises the pipeline end-to-end using fixtures and deterministic invariants.

## Why it changed
- Prevent silent data drift and strengthen “trust-first” guarantees as the backend matures toward beta readiness.
- Provide stronger observability and auditability for later compliance posture.
- Ensure deterministic decision logic remains stable even when narration fails.

## What to watch for
- Any changes to export payload structure will change export hashes; update tests accordingly.
- Integrity verification will surface upstream payload mutations as deterministic failures and should be treated as high-signal alerts.
- Migration audit behavior depends on successful DB connectivity; ensure readiness/migrat
