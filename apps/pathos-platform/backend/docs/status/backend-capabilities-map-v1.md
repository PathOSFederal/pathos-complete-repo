# Backend Capabilities Map v1

## Scope
Actionable inventory of backend routes and contracts used by PathOS Desktop.

## Trust Boundaries
- Diagnostics and telemetry responses must never include secrets.
- Diagnostics and telemetry responses must never include raw upstream payloads.
- USAJOBS ingestion remains through the official API adapter only.

## Health
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `GET /health` and `GET /api/v1/health` | Basic liveness status. | `status` | `tests/test_health_readiness.py` |
| `GET /health/live` and `GET /api/v1/health/live` | No-DB live probe. | `status` | `tests/test_health_readiness.py` |
| `GET /health/ready` and `GET /api/v1/health/ready` | **Desktop-critical** readiness + operational metadata contract. | `status`, `db_revision`, `alembic_head`, `migration_status`, `worker_operational_state`, `lock_state_summary`, `last_worker_run_at` | `tests/test_health_readiness.py`, `tests/contract/test_desktop_contracts_v1.py` |

## Diagnostics
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `GET /api/v1/diagnostics/usajobs` | Safe upstream diagnostics probe. | `configured`, `can_query`, `domain_outcome`, `error`, `skip_reason` | `tests/api/diagnostics/test__categories__usajobs_diagnostics.py`, `tests/test_log_event_registry_and_schema.py` |
| `GET /api/v1/diagnostics/snapshot` | **Desktop-critical** safe runtime snapshot for UI health panes. | `service_version`, `environment`, `db_dialect`, `db_revision`, `alembic_head`, `counts`, `last_error_summaries` | `tests/test_health_readiness.py`, `tests/test_diagnostics_snapshot.py`, `tests/contract/test_desktop_contracts_v1.py` |

## Telemetry
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `GET /api/v1/diagnostics/telemetry` | **Desktop-critical** telemetry summary; deterministic disabled response when off. | `telemetry_enabled`, `generated_at`, `counters[]`, `message` | `tests/test_telemetry_v1.py` |

## Jobs
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `POST /api/v1/jobs/search` | Search jobs through USAJOBS adapter and normalization pipeline. | `results[]`, `total`, `request_id` | `tests/api/jobs/test__categories__jobs_search.py`, `tests/api/jobs/test__equivalence__job_search_service.py` |
| `POST /api/v1/jobs/{job_id}/score` | Deterministic score/evaluation for one job. | `score`, `reasons`, `domain_outcome` | `tests/api/jobs/test__categories__job_score.py`, `tests/test_evaluate_and_narrate_contract.py` |

## Alerts
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `POST /api/v1/alerts/run` | Trigger deterministic alerts evaluation run. | `run_id`, `status`, `rules_evaluated`, `jobs_scanned` | `tests/test_worker_alerts.py`, `tests/api/alerts/test__categories__alerts_run_v1.py` |
| `GET /api/v1/alerts/runs` | List recent alert runs. | `id`, `started_at`, `status`, metrics fields | `tests/api/alerts/test__categories__alerts.py` |
| `GET /api/v1/alerts/rules/{alert_rule_id}/history` | Per-rule run history. | `alert_rule_id`, `status`, counts/metrics | `tests/api/alerts/test__categories__alerts.py` |
| `GET /api/v1/alerts/metrics/recent` | Recent metrics for observability. | `run_id`, timing/count fields | `tests/api/alerts/test__categories__alerts_observability_v1.py` |
| `GET /api/v1/alerts/digests` | List digest records. | digest payload list fields | `tests/api/alerts/test__categories__alerts.py` |
| `DELETE /api/v1/alerts/digests/purge` | Purge digests older than cutoff. | `deleted`/summary fields | `tests/api/alerts/test__categories__alerts.py` |
| `POST /api/v1/alerts/digests/retain` | Retention policy application for digests. | retention summary fields | `tests/api/alerts/test__categories__alerts.py` |
| `DELETE /api/v1/alerts/rules/{alert_rule_id}/logs` | Purge rule delivery logs. | deleted summary | `tests/api/alerts/test__categories__alerts.py` |
| `DELETE /api/v1/alerts/runs/purge` | Purge old run rows. | deleted summary | `tests/api/alerts/test__categories__alerts.py` |
| `POST /api/v1/alert-rules` | Create alert rule (legacy path). | alert rule fields | `tests/api/alerts/test__categories__alerts.py` |
| `POST /api/v1/alerts/rules` | Create alert rule (canonical path). | alert rule fields | `tests/api/alerts/test__categories__alerts.py` |
| `GET /api/v1/alert-rules` | List alert rules (legacy path). | list of rules | `tests/api/alerts/test__categories__alerts.py` |
| `GET /api/v1/alerts/rules` | List alert rules (canonical path). | list of rules | `tests/api/alerts/test__categories__alerts.py` |
| `GET /api/v1/alert-rules/{alert_rule_id}` | Get one alert rule. | alert rule fields | `tests/api/alerts/test__categories__alerts.py` |
| `PUT /api/v1/alert-rules/{alert_rule_id}` | Update alert rule. | updated rule fields | `tests/api/alerts/test__categories__alerts.py` |
| `DELETE /api/v1/alert-rules/{alert_rule_id}` | Delete alert rule. | `deleted` / identifier | `tests/api/alerts/test__categories__alerts.py` |
| `POST /api/v1/saved-searches/{saved_search_id}/run` | Run one saved search manually. | run status/outcome fields | `tests/api/alerts/test__categories__alerts.py` |
| `GET /api/v1/alerts` | List alerts. | alert list fields | `tests/api/alerts/test__categories__alerts.py` |
| `GET /api/v1/alerts/{alert_id}` | Get one alert. | alert details | `tests/api/alerts/test__categories__alerts.py` |
| `POST /api/v1/alerts/{alert_id}/ack` | Acknowledge alert. | `acknowledged` state fields | `tests/api/alerts/test__categories__alerts.py` |

## Saved Searches
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `POST /api/v1/saved-searches` | Create saved search. | saved search object | `tests/api/saved_searches/test__categories__saved_searches.py` |
| `GET /api/v1/saved-searches` | List saved searches. | saved search list | `tests/api/saved_searches/test__categories__saved_searches.py` |
| `GET /api/v1/saved-searches/{saved_search_id}` | Get saved search by id. | saved search object | `tests/api/saved_searches/test__categories__saved_searches.py` |
| `PUT /api/v1/saved-searches/{saved_search_id}` | Update saved search. | updated search object | `tests/api/saved_searches/test__categories__saved_searches.py` |
| `DELETE /api/v1/saved-searches/{saved_search_id}` | Delete saved search. | `deleted` / identifier | `tests/api/saved_searches/test__categories__saved_searches.py` |

## Export
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `GET /api/v1/export/thread/{thread_id}` | **Desktop-critical** export thread bundle with integrity hash. | `export_hash`, `hash_alg`, `export_bytes`, `timestamp`, plus `thread/messages/linked_audits` | `tests/test_export_integrity_slice93.py`, `tests/test_export_thread_includes_linked_audits.py`, `tests/contract/test_desktop_contracts_v1.py` |
| `GET /api/v1/export/audit/{trace_id}` | Export one audit with integrity metadata. | `export_hash`, `hash_alg`, `export_bytes`, `timestamp` + audit fields | `tests/test_export_and_desktop_contracts.py`, `tests/test_export_integrity_slice93.py` |
| `GET /api/v1/export/recent` | **Desktop-critical** recent threads/audits export with integrity metadata. | `threads[]`, `audits[]`, `export_hash`, `hash_alg`, `export_bytes`, `timestamp` | `tests/test_export_integrity_slice93.py`, `tests/contract/test_desktop_contracts_v1.py` |

## Ops
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `GET /api/v1/ops/status` | **Desktop-critical** operational flags snapshot (safe, read-only). | `worker_enabled`, `alerts_evaluation_enabled`, `alerts_delivery_enabled`, `dry_run_mode`, `pause_reason_set` | `tests/test_worker_scheduler_engine.py` |

## Meta (plus support endpoints)
| Route | Summary | Key Response Fields | Relevant Tests |
|---|---|---|---|
| `GET /api/v1/meta/openapi` | OpenAPI document for desktop/client codegen. | OpenAPI schema object | `tests/test_meta_openapi.py`, `tests/test_openapi_snapshot_regression.py` |
| `GET /api/v1/desktop/info` | Desktop bootstrap metadata. | `version`, `env`, `authRequired`, `baseUrl`, `serverTime` | `tests/test_desktop_contract_cors.py` |
| `GET /api/v1/desktop/ping` | Auth-protected desktop ping. | `status` | `tests/test_export_and_desktop_contracts.py` |
| `GET /api/v1/desktop/alerts/digests` | Desktop digest list view. | digest list fields | `tests/test_desktop_contract_cors.py` |
| `GET /api/v1/desktop/digests/latest` | Desktop latest digest summary list. | summary list fields | `tests/test_desktop_contract_cors.py` |
| `GET /api/v1/desktop/saved-searches` | Desktop saved searches list. | saved search list | `tests/test_desktop_contract_cors.py` |
| `GET /api/v1/desktop/alert-rules` | Desktop alert rules list. | alert rule list | `tests/test_desktop_contract_cors.py` |
| `GET /api/v1/desktop/overview` | Desktop aggregate overview. | `latest_digests`, `saved_searches`, `alert_rules`, `last_alert_run`, guardrails | `tests/test_desktop_contract_cors.py` |
| `GET /api/v1/audit/recent` | Recent audits feed. | audits list | `tests/test_delete_audit.py` |
| `GET /api/v1/audit/{trace_id}` | Get one audit. | audit object | `tests/test_delete_audit.py` |
| `DELETE /api/v1/audit/{trace_id}` | Delete audit by trace id. | `deleted`, `trace_id` | `tests/test_delete_audit.py` |
| `POST /api/v1/threads` | Create thread. | thread object | `tests/test_delete_thread_cascades_messages.py`, `tests/test_threads_opt_in.py` |
| `POST /api/v1/threads/{thread_id}/messages` | Add message to thread. | message response | `tests/test_delete_thread_cascades_messages.py` |
| `GET /api/v1/threads/recent` | List recent threads. | thread list | `tests/test_threads_opt_in.py` |
| `GET /api/v1/threads/{thread_id}` | Get thread detail. | thread + messages | `tests/test_threads_opt_in.py` |
| `DELETE /api/v1/threads/{thread_id}` | Delete thread (+ cascade). | `deleted`, `thread_id` | `tests/test_delete_thread_cascades_messages.py` |
| `POST /api/v1/threads/{thread_id}/summary/recompute` | Recompute thread summary. | summary fields | `tests/test_thread_summary_updates_on_message.py` |
| `GET /api/v1/threads/{thread_id}/summary` | Get thread summary. | summary fields | `tests/test_thread_summary_deterministic.py` |
| `POST /api/v1/wipe` | Destructive wipe endpoint with explicit confirm. | class deletion counts | `tests/test_wipe_requires_confirm.py` |
| `POST /api/v1/advisor/evaluate` | Deterministic advisor evaluation. | advisor output fields | `tests/test_advisor_engine_golden.py` |
| `POST /api/v1/advisor/narrate` | Narration for evaluation output. | narration fields | `tests/test_narration_fallback.py` |
| `POST /api/v1/advisor/evaluate-and-narrate` | Combined deterministic + narration response. | deterministic output + narration | `tests/test_evaluate_and_narrate_contract.py` |
| `POST /api/v1/advisor/session` | Create advisor session. | session fields | `tests/api/advisor_session/test__categories__advisor_session.py` |
| `POST /api/v1/advisor/session/{session_id}/events` | Append advisor session event. | event fields | `tests/api/advisor_session/test__categories__advisor_session.py` |
| `GET /api/v1/advisor/session/{session_id}` | Get advisor session. | session fields | `tests/api/advisor_session/test__categories__advisor_session.py` |
| `POST /api/v1/advisor/session/{session_id}/close` | Close advisor session. | closed session fields | `tests/api/advisor_session/test__categories__advisor_session.py` |
| `GET /api/v1/profile` | Read profile v1. | profile fields | `tests/api/profile/test__categories__profile.py` |
| `PUT /api/v1/profile` | Upsert profile v1. | profile fields | `tests/api/profile/test__categories__profile.py` |

## What Desktop Should Build Next
- Build a typed desktop client from `/api/v1/meta/openapi` and pin schema version in CI.
- Add a desktop health panel using `GET /health/ready` + `GET /api/v1/diagnostics/snapshot` + `GET /api/v1/diagnostics/telemetry`.
- Add export verification UX: display `export_hash` and `hash_alg`, and provide copy/verify action.
- Add ops status widget using `GET /api/v1/ops/status` and show paused/dry-run/delivery-disabled banners.
- Add resilient UI fallback rules for telemetry disabled state (`message=telemetry_disabled`).
