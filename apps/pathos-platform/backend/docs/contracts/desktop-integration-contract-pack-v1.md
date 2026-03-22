# Desktop Integration Contract Pack v1

## Stable Contracts Used By Desktop
Canonical models live in `app/models/diagnostics.py`; primary contract tests live in `tests/contract/test_desktop_contracts_v1.py`.

## 1) Readiness Contract (`GET /health/ready`)
Response model: `HealthReadyOut`

Required fields:
- `status`: `"ready" | "not_ready"`
- `db_revision`: `string | null`
- `alembic_head`: `string | null`
- `migration_status`: `string | null`
- `worker_enabled`: `boolean`
- `alerts_evaluation_enabled`: `boolean`
- `dry_run_mode`: `boolean`
- `worker_operational_state`: `"running" | "paused"`
- `worker_pause_reason_set`: `boolean`
- `last_worker_run_at`: `string | null`
- `last_worker_status`: `string | null`
- `last_migration_audit_event_at`: `string | null`
- `lock_state_summary`: object with `lock_name`, `lock_held`, `owner_run_id`, `expires_at`, `active_locks`

Test refs:
- `tests/contract/test_desktop_contracts_v1.py`
- `tests/test_health_readiness.py`

## 2) Diagnostics Snapshot Contract (`GET /api/v1/diagnostics/snapshot`)
Response model: `DiagnosticsSnapshotOut`

Required fields:
- `service_version`: `string`
- `environment`: `string`
- `db_dialect`: `string`
- `alembic_head`: `string | null`
- `db_revision`: `string | null`
- `counts`: object with `saved_searches`, `alert_rules`, `alert_runs` (ints)
- `last_worker_run_at`: `string | null`
- `last_worker_status`: `string | null`
- `last_error_summaries`: `string[]`

Test refs:
- `tests/contract/test_desktop_contracts_v1.py`
- `tests/test_diagnostics_snapshot.py`
- `tests/test_health_readiness.py`

## 3) Export Integrity Contract (`GET /api/v1/export/*`)
Response model: `ExportIntegrityOut` (`extra=allow` for endpoint-specific payload keys)

Integrity metadata fields (stable):
- `export_hash`: `string`
- `hash_alg`: always `"sha256"`
- `export_bytes`: `int`
- `timestamp`: `string`

Endpoint-specific top-level payload fields remain stable for desktop:
- `/export/recent`: `threads[]`, `audits[]`
- `/export/thread/{thread_id}`: `thread`, `messages[]`, `linked_audits[]`
- `/export/audit/{trace_id}`: audit object fields

Test refs:
- `tests/contract/test_desktop_contracts_v1.py`
- `tests/test_export_integrity_slice93.py`
- `tests/test_export_thread_includes_linked_audits.py`

## 4) Telemetry Summary Contract (`GET /api/v1/diagnostics/telemetry`)
Response model: `DiagnosticsTelemetrySummaryOut`

Required fields:
- `telemetry_enabled`: `boolean`
- `generated_at`: `string`
- `counters`: array of `{ metric_key, count, total_duration_ms, avg_duration_ms, updated_at }`
- `message`: `string | null` (expected `"telemetry_disabled"` when disabled)

Test refs:
- `tests/test_telemetry_v1.py`

## Compatibility Rules
- Additive changes only for existing desktop-critical responses.
- Do not remove or rename existing top-level fields consumed by desktop.
- If new fields are added, keep old fields valid for at least one desktop release cycle.
- Keep field types stable; do not silently change scalar/object/list types.
- Keep deterministic disabled states (for example telemetry) stable and explicit.
- Update contract tests before shipping intentional contract evolution.

## Never Include
- API keys, auth tokens, passwords, or secret values.
- Raw upstream payload bodies or unredacted upstream content.
- Sensitive headers (for example `Authorization`) in response payloads.
- PII-like free-form content in diagnostics/telemetry aggregates.
