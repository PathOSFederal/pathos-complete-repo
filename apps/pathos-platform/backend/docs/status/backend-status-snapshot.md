# Backend Status Snapshot

## Snapshot Metadata
Captured at: 2026-02-16 (local workspace)
Repo root: `C:\dev\PathOS\codebase\pathos-backend`

### 1) Repo state command outputs

#### `git status`
```text
On branch develop
Your branch is up to date with 'origin/develop'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/status/
	scripts/print_api_routes.py

nothing added to commit but untracked files present (use "git add" to track)
```

#### `git branch --show-current`
```text
develop
```

#### `git rev-parse HEAD`
```text
8b58d368906a0af8071cc570c81e72c56a171cd5
```

#### `ls -la`
```text
Get-ChildItem: A parameter cannot be found that matches parameter name 'la'.
```

PowerShell equivalent used:

#### `Get-ChildItem -Force | Format-Table -AutoSize Mode,LastWriteTime,Length,Name`
```text
Mode  LastWriteTime         Length Name
----  -------------         ------ ----
d--h- 2/15/2026 11:21:13 PM        .git
d---- 2/13/2026 10:28:12 AM        .github
d---- 2/13/2026 6:50:39 PM         .mypy_cache
d---- 2/12/2026 4:41:22 PM         .pytest_cache
d---- 2/12/2026 5:16:22 PM         .ruff_cache
d---- 2/14/2026 9:01:46 AM         .tmp
d---- 2/15/2026 10:37:50 PM        app
d---- 2/15/2026 10:37:50 PM        artifacts
d---- 2/15/2026 11:25:36 PM        data
d---- 2/15/2026 11:28:31 PM        docs
d---- 2/15/2026 11:21:59 PM        scripts
d---- 2/15/2026 10:37:50 PM        tests
-a--- 2/15/2026 11:26:16 PM 282624 .coverage
-a--- 2/13/2026 6:28:48 PM  104    .env
-a--- 2/14/2026 4:23:48 PM  98     .gitattributes
-a--- 2/13/2026 4:24:31 PM  178    .gitignore
-a--- 2/14/2026 8:26:13 PM  28539  merge-notes.md
-a--- 2/12/2026 6:44:36 PM  11294  openapi.json
-a--- 2/14/2026 8:49:46 AM  78047  poetry.lock
-a--- 2/14/2026 8:49:46 AM  720    pyproject.toml
-a--- 2/15/2026 11:19:29 PM 10091  README.md
-a--- 2/13/2026 10:28:12 AM 1409   requirements.txt
```

#### `find . -maxdepth 3 -type f -name "*.md" | sort`
```text
bash unavailable in this sandbox (CreateInstance E_ACCESSDENIED).
```

PowerShell equivalent used:

#### `Get-ChildItem -Recurse -File -Depth 3 -Filter *.md ... | Sort-Object FullName`
```text
docs/ai/repo-context.md
docs/change-briefs/day-30.md
docs/change-briefs/day-35-deterministic-scoring.md
docs/change-briefs/slices-36-45-saved-searches-alerts-scheduler-v1.md
docs/change-briefs/slices-46-55-delta-digests-desktop-contract-v1.md
docs/change-briefs/slices-56-60-delivery-worker-idempotency-metrics-v1.md
docs/ops/deployment-local-compose.md
docs/reviews/backend-review-slices-3-17.md
docs/reviews/ci-discipline-hardening-v1.md
merge-notes.md
README.md
```

#### `find . -maxdepth 4 -type f \( -name "*.py" -o -name "*.toml" -o -name "*.yml" -o -name "*.yaml" \) | sort`
```text
bash unavailable in this sandbox (CreateInstance E_ACCESSDENIED).
```

PowerShell equivalent used:

#### `Get-ChildItem -Recurse -File -Depth 4 ... | Sort-Object FullName`
```text
.github/workflows/ci.yml
.github/workflows/codex-autofix.yml
.github/workflows/codex-review.yml
app/__init__.py
app/adapters/__init__.py
app/adapters/usajobs/__init__.py
app/adapters/usajobs/client.py
app/adapters/usajobs/errors.py
app/adapters/usajobs/mapper.py
app/adapters/usajobs/models.py
app/adapters/usajobs/normalize.py
app/adapters/usajobs/types.py
app/api/__init__.py
app/api/v1/__init__.py
app/api/v1/advisor_session.py
app/api/v1/advisor.py
app/api/v1/alerts.py
app/api/v1/audit.py
app/api/v1/desktop.py
app/api/v1/export.py
app/api/v1/health.py
app/api/v1/jobs.py
app/api/v1/meta.py
app/api/v1/profile_v1.py
app/api/v1/saved_searches.py
app/api/v1/thread_summary.py
app/api/v1/threads.py
app/api/v1/wipe.py
app/contracts/__init__.py
app/contracts/desktop_contract.py
app/contracts/error_contract.py
app/core/__init__.py
app/core/config.py
app/core/error_codes.py
app/core/error_handlers.py
app/core/event_ids.py
app/core/logging.py
app/core/readiness.py
app/core/request_context.py
app/core/security.py
app/core/startup_validation.py
app/db/__init__.py
app/db/connection.py
app/db/migration_safety.py
app/db/migrations/__init__.py
app/db/migrations/runner.py
app/db/repo/__init__.py
app/db/repo/advisor_session_repo.py
app/db/repo/alert_delivery_log_repo.py
app/db/repo/alert_digest_repo.py
app/db/repo/alert_repo.py
app/db/repo/alert_rule_repo.py
app/db/repo/alert_rule_run_repo.py
app/db/repo/alert_run_repo.py
app/db/repo/alert_scheduler_lock_repo.py
app/db/repo/audit_repo.py
app/db/repo/profile_repo.py
app/db/repo/saved_search_repo.py
app/db/repo/saved_search_snapshot_repo.py
app/db/repo/thread_repo.py
app/db/repo/upstream_audit_repo.py
app/domain/jobs/__init__.py
app/domain/jobs/canonical_models.py
app/engine/__init__.py
app/engine/evaluator.py
app/engine/reason_library.py
app/engine/scoring.py
app/engine/thread_summary_v1.py
app/llm/__init__.py
app/llm/client.py
app/llm/narrator.py
app/llm/redaction.py
app/llm/schemas.py
app/llm/thread_summarizer.py
app/main.py
app/middleware/rate_limit.py
app/middleware/request_id.py
app/models/__init__.py
app/models/advisor_session.py
app/models/advisor.py
app/models/alert_digest.py
app/models/alert_rule.py
app/models/alerts.py
app/models/common.py
app/models/job_score.py
app/models/job_search.py
app/models/job.py
app/models/narration.py
app/models/profile_v1.py
app/models/profile.py
app/models/saved_search.py
app/models/thread.py
app/services/advisor_service.py
app/services/advisor_session_service.py
app/services/alert_digest_service.py
app/services/alert_evaluator.py
app/services/alert_rule_service.py
app/services/alert_service.py
app/services/alerts_run_service.py
app/services/audit_service.py
app/services/delivery_transport_service.py
app/services/delta_engine_service.py
app/services/digest_builder_service.py
app/services/export_service.py
app/services/job_scoring_ruleset.py
app/services/job_scoring_service.py
app/services/job_search_service.py
app/services/narration_service.py
app/services/profile_service.py
app/services/saved_search_runner_service.py
app/services/saved_search_service.py
app/services/thread_service.py
app/services/wipe_service.py
app/worker.py
pyproject.toml
scripts/__init__.py
scripts/ci_ai/autofix_patch.py
scripts/ci_ai/pr_review.py
scripts/export_openapi.py
scripts/print_api_routes.py
scripts/print_db_schema.py
tests/api/advisor_session/test__categories__advisor_session.py
tests/api/alerts/test__categories__alerts_observability_v1.py
tests/api/alerts/test__categories__alerts_run_v1.py
tests/api/alerts/test__categories__alerts.py
tests/api/jobs/test__categories__job_score.py
tests/api/jobs/test__categories__jobs_search.py
tests/api/jobs/test__equivalence__job_search_service.py
tests/api/jobs/test__missing_usajobs_key_returns_config_error.py
tests/api/jobs/test__positive__normalize.py
tests/api/jobs/test__positive__usajobs_client.py
tests/api/profile/test__categories__profile.py
tests/api/saved_searches/test__categories__saved_searches.py
tests/conftest.py
tests/db/repo/test_alert_scheduler_lock_repo.py
tests/integration/test_jobs_search.py
tests/services/test_alert_evaluator.py
tests/services/test_delivery_transport_service.py
tests/services/test_delta_engine_service.py
tests/services/test_digest_builder_service.py
tests/services/test_job_scoring_service.py
tests/services/test_saved_search_runner_service.py
tests/test_advisor_engine_golden.py
tests/test_advisor_writes_audit.py
tests/test_audit_repo.py
tests/test_auth.py
tests/test_category_boundary_security.py
tests/test_config.py
tests/test_delete_audit.py
tests/test_delete_thread_cascades_messages.py
tests/test_desktop_contract_cors.py
tests/test_error_contract_observability.py
tests/test_evaluate_and_narrate_contract.py
tests/test_export_and_desktop_contracts.py
tests/test_export_thread_includes_linked_audits.py
tests/test_health_readiness.py
tests/test_llm_client.py
tests/test_llm_schemas.py
tests/test_log_event_registry_and_schema.py
tests/test_logging_context.py
tests/test_main_import_side_effects.py
tests/test_meta_openapi.py
tests/test_migrations_runner.py
tests/test_models_validate.py
tests/test_narration_audit_attach.py
tests/test_narration_fallback.py
tests/test_narration_schema_validation.py
tests/test_openapi_snapshot_regression.py
tests/test_rate_limit.py
tests/test_request_completion_logging.py
tests/test_thread_messages_store_toggle.py
tests/test_thread_summary_deterministic.py
tests/test_thread_summary_llm_fallback.py
tests/test_thread_summary_opt_in_enforced.py
tests/test_thread_summary_updates_on_message.py
tests/test_thread_trace_linking.py
tests/test_threads_opt_in.py
tests/test_wipe_requires_confirm.py
tests/test_worker_alerts.py
```

## Architecture Quick Map
- App factory and router wiring: `app/main.py`
- API routers: `app/api/v1/*.py`
- Core config/startup/readiness: `app/core/config.py`, `app/core/startup_validation.py`, `app/core/readiness.py`
- Persistence: `app/db/connection.py`, `app/db/migrations/*.sql`, `app/db/repo/*.py`
- USAJOBS adapter: `app/adapters/usajobs/*`
- Ingestion and scoring orchestration: `app/services/job_search_service.py`, `app/services/saved_search_runner_service.py`
- Alerts/rules/digests/scheduler: `app/services/alerts_run_service.py`, `app/services/alert_rule_service.py`, `app/services/alert_digest_service.py`, `app/services/delivery_transport_service.py`
- Worker entrypoint: `app/worker.py`
- Desktop contract/endpoints: `app/contracts/desktop_contract.py`, `app/api/v1/desktop.py`

## API Surface (table)
Route table generated via `poetry run python scripts/print_api_routes.py` (openapi mode).

| Method | Path | Name | Source Module |
|---|---|---|---|
| POST | /api/v1/advisor/evaluate | evaluate_advisor | app.api.v1.advisor |
| POST | /api/v1/advisor/evaluate-and-narrate | evaluate_and_narrate | app.api.v1.advisor |
| POST | /api/v1/advisor/narrate | narrate_advisor | app.api.v1.advisor |
| POST | /api/v1/advisor/session | create_advisor_session | app.api.v1.advisor_session |
| GET | /api/v1/advisor/session/{session_id} | get_advisor_session | app.api.v1.advisor_session |
| POST | /api/v1/advisor/session/{session_id}/close | close_advisor_session | app.api.v1.advisor_session |
| POST | /api/v1/advisor/session/{session_id}/events | append_advisor_session_event | app.api.v1.advisor_session |
| GET | /api/v1/alert-rules | list_alert_rules | app.api.v1.alerts |
| POST | /api/v1/alert-rules | create_alert_rule | app.api.v1.alerts |
| DELETE | /api/v1/alert-rules/{alert_rule_id} | delete_alert_rule | app.api.v1.alerts |
| GET | /api/v1/alert-rules/{alert_rule_id} | get_alert_rule | app.api.v1.alerts |
| PUT | /api/v1/alert-rules/{alert_rule_id} | update_alert_rule | app.api.v1.alerts |
| GET | /api/v1/alerts | list_alerts | app.api.v1.alerts |
| GET | /api/v1/alerts/digests | list_alert_digests | app.api.v1.alerts |
| DELETE | /api/v1/alerts/digests/purge | purge_old_digests | app.api.v1.alerts |
| POST | /api/v1/alerts/digests/retain | retain_last_n_digests | app.api.v1.alerts |
| GET | /api/v1/alerts/metrics/recent | list_alert_metrics_recent | app.api.v1.alerts |
| GET | /api/v1/alerts/rules/{alert_rule_id}/history | list_alert_rule_history | app.api.v1.alerts |
| DELETE | /api/v1/alerts/rules/{alert_rule_id}/logs | purge_rule_logs | app.api.v1.alerts |
| POST | /api/v1/alerts/run | run_alerts | app.api.v1.alerts |
| GET | /api/v1/alerts/runs | list_alert_runs | app.api.v1.alerts |
| DELETE | /api/v1/alerts/runs/purge | purge_old_runs | app.api.v1.alerts |
| GET | /api/v1/alerts/{alert_id} | get_alert | app.api.v1.alerts |
| POST | /api/v1/alerts/{alert_id}/ack | ack_alert | app.api.v1.alerts |
| GET | /api/v1/audit/recent | get_recent_audits | app.api.v1.audit |
| DELETE | /api/v1/audit/{trace_id} | delete_audit | app.api.v1.audit |
| GET | /api/v1/audit/{trace_id} | get_audit | app.api.v1.audit |
| GET | /api/v1/desktop/alert-rules | desktop_list_alert_rules | app.api.v1.desktop |
| GET | /api/v1/desktop/alerts/digests | desktop_list_alert_digests | app.api.v1.desktop |
| GET | /api/v1/desktop/info | get_desktop_info | app.api.v1.desktop |
| GET | /api/v1/desktop/overview | desktop_overview | app.api.v1.desktop |
| GET | /api/v1/desktop/ping | desktop_ping | app.api.v1.desktop |
| GET | /api/v1/desktop/saved-searches | desktop_list_saved_searches | app.api.v1.desktop |
| GET | /api/v1/export/audit/{trace_id} | export_audit | app.api.v1.export |
| GET | /api/v1/export/recent | export_recent | app.api.v1.export |
| GET | /api/v1/export/thread/{thread_id} | export_thread | app.api.v1.export |
| GET | /api/v1/health | health | app.api.v1.health |
| GET | /api/v1/health/live | health_live | app.api.v1.health |
| GET | /api/v1/health/ready | health_ready | app.api.v1.health |
| POST | /api/v1/jobs/search | search_jobs | app.api.v1.jobs |
| POST | /api/v1/jobs/{job_id}/score | score_job | app.api.v1.jobs |
| GET | /api/v1/meta/openapi | get_openapi_spec | app.api.v1.meta |
| GET | /api/v1/profile | get_profile | app.api.v1.profile_v1 |
| PUT | /api/v1/profile | put_profile | app.api.v1.profile_v1 |
| GET | /api/v1/saved-searches | list_saved_searches | app.api.v1.saved_searches |
| POST | /api/v1/saved-searches | create_saved_search | app.api.v1.saved_searches |
| DELETE | /api/v1/saved-searches/{saved_search_id} | delete_saved_search | app.api.v1.saved_searches |
| GET | /api/v1/saved-searches/{saved_search_id} | get_saved_search | app.api.v1.saved_searches |
| PUT | /api/v1/saved-searches/{saved_search_id} | update_saved_search | app.api.v1.saved_searches |
| POST | /api/v1/saved-searches/{saved_search_id}/run | run_saved_search | app.api.v1.alerts |
| POST | /api/v1/threads | create_thread | app.api.v1.threads |
| GET | /api/v1/threads/recent | list_recent_threads | app.api.v1.threads |
| DELETE | /api/v1/threads/{thread_id} | delete_thread | app.api.v1.threads |
| GET | /api/v1/threads/{thread_id} | get_thread | app.api.v1.threads |
| POST | /api/v1/threads/{thread_id}/messages | append_thread_message | app.api.v1.threads |
| GET | /api/v1/threads/{thread_id}/summary | get_thread_summary | app.api.v1.thread_summary |
| POST | /api/v1/threads/{thread_id}/summary/recompute | recompute_thread_summary | app.api.v1.thread_summary |
| POST | /api/v1/wipe | wipe_data | app.api.v1.wipe |
| GET | /health | health | app.api.v1.health |
| GET | /health/live | health_live | app.api.v1.health |
| GET | /health/ready | health_ready | app.api.v1.health |

Route count: `61`

## Persistence Surface (tables/migrations)
- DB engine in code: SQLite (`sqlite3`) via `app/db/connection.py`
- DB path resolution: `PATHOS_DB_PATH` env var, else default `data/pathos.db` (`app/db/connection.py`)
- Effective DB path in this workspace at snapshot time: `data/pathos.db`
- Migration framework: custom SQL-file runner in `app/db/migrations/runner.py` (no Alembic references found)
- Migration files present:
  - `app/db/migrations/001_init.sql`
  - `app/db/migrations/002_indexes.sql`
  - `app/db/migrations/003_job_seeker_surface_v1.sql`
  - `app/db/migrations/004_job_seeker_surface_indexes.sql`
  - `app/db/migrations/005_upstream_audit_summary_v1.sql`
  - `app/db/migrations/006_alerting_scheduler_v1.sql`
  - `app/db/migrations/007_delta_digest_observability_v1.sql`
  - `app/db/migrations/008_delivery_worker_metrics_v1.sql`

Tables discovered from live DB (`scripts/print_db_schema.py` + read-only sqlite introspection):
- `advisor_session_events`
- `advisor_sessions`
- `alert_delivery_log`
- `alert_digests`
- `alert_rule_runs`
- `alert_rules`
- `alert_runs`
- `alert_scheduler_locks`
- `alerts`
- `audit_records`
- `profiles`
- `saved_search_job_snapshots`
- `saved_search_runs`
- `saved_searches`
- `schema_migrations`
- `thread_messages`
- `threads`
- `upstream_api_audit_records`

## USAJOBS Ingestion Status
Exists and wired:
- Adapter client: `app/adapters/usajobs/client.py`
- Mapper/normalization: `app/adapters/usajobs/mapper.py`, `app/adapters/usajobs/normalize.py`
- Response models/types: `app/adapters/usajobs/models.py`, `app/adapters/usajobs/types.py`
- Service orchestration: `app/services/job_search_service.py`
- API entrypoint: `POST /api/v1/jobs/search` in `app/api/v1/jobs.py`

Runner/checkpoint evidence:
- Saved-search runner: `app/services/saved_search_runner_service.py`
- Saved-search run history: `saved_search_runs` via `app/db/repo/saved_search_repo.py`
- Delta snapshot state: `saved_search_job_snapshots` via `app/db/repo/saved_search_snapshot_repo.py`
- Upstream audit trail: `upstream_api_audit_records` via `app/db/repo/upstream_audit_repo.py`
- No explicit module named checkpoint/ledger found (`rg checkpoint|ledger` returned no matches).

## Saved Searches / Alert Rules / Digests Status
Saved searches:
- CRUD API: `app/api/v1/saved_searches.py`
- Service/repo: `app/services/saved_search_service.py`, `app/db/repo/saved_search_repo.py`

Alert rules and runs:
- CRUD + run endpoints: `app/api/v1/alerts.py`
- Rule service: `app/services/alert_rule_service.py`
- Scheduler run orchestration: `app/services/alerts_run_service.py`
- Worker loop: `app/worker.py`
- Scheduler lock table/repo: `alert_scheduler_locks` + `app/db/repo/alert_scheduler_lock_repo.py`

Digests/delivery:
- Digest builder: `app/services/digest_builder_service.py`
- Digest persistence: `app/db/repo/alert_digest_repo.py`
- Transport abstraction: `app/services/delivery_transport_service.py`
- Partial/placeholder: `EmailDigestFutureTransport.deliver` is explicit deterministic no-op placeholder.

## Desktop Integration Status
Backend desktop-facing contract exists:
- Models: `app/contracts/desktop_contract.py`
- Endpoints: `app/api/v1/desktop.py`
  - `/api/v1/desktop/info`
  - `/api/v1/desktop/ping`
  - `/api/v1/desktop/alerts/digests`
  - `/api/v1/desktop/saved-searches`
  - `/api/v1/desktop/alert-rules`
  - `/api/v1/desktop/overview`

Callers/coverage in this repo:
- Desktop endpoint tests in `tests/test_desktop_contract_cors.py`, `tests/test_export_and_desktop_contracts.py`, `tests/api/alerts/test__categories__alerts_observability_v1.py`.
- No separate desktop client code found in this repository; backend contract is exercised by backend tests/docs only.

## Test & CI Status
How to run:
- Lint: `poetry run ruff check .`
- Typecheck: `poetry run mypy app tests`
- Tests: `poetry run pytest -q`
- OpenAPI snapshot: `poetry run python scripts/export_openapi.py`

CI (`.github/workflows/ci.yml`) gates:
- `ruff`
- `mypy`
- `pytest -q` with coverage gate from `pyproject.toml` (`--cov-fail-under=90`)
- OpenAPI snapshot drift check against `artifacts/contracts/openapi.json`

Executed in this snapshot:
```text
poetry run pytest -q
174 passed, 208 warnings in 68.76s
Required test coverage of 90% reached. Total coverage: 90.82%
```

Notable warning evidence from test run:
- FastAPI `@app.on_event("startup")` deprecation warning from `app/main.py`.

## Remaining Work Candidates (evidence only)
1. Implement non-noop delivery for `email_digest_future` mode.
Evidence: `app/services/delivery_transport_service.py` marks it as "placeholder delivery path: deterministic no-op by design"; docs also call out future placeholder.
2. Migrate FastAPI startup hook to lifespan handlers.
Evidence: pytest warnings report deprecation for `@app.on_event("startup")` in `app/main.py`.
3. Decide whether to keep or formalize `scripts/print_api_routes.py` in source control.
Evidence: `git status` shows it as untracked while it is useful for deterministic API-surface introspection.
4. Add direct test coverage for legacy `map_usajobs_item` shim or retire shim.
Evidence: coverage report shows `app/adapters/usajobs/mapper.py` at 0%.
