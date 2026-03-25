# PathOS Backend Completion Roadmap

## 1. Current state summary
- The backend already has a solid runtime shell: FastAPI app factory, startup/readiness validation, SQLite/Postgres support, structured logging, request correlation, migrations, worker orchestration, retention, export integrity, and a real test suite.
- USAJOBS integration is already real and official-API-only at the adapter layer via `app/adapters/usajobs/client.py`, with canonical mapping in `app/adapters/usajobs/normalize.py`, service orchestration in `app/services/job_search_service.py`, and upstream audit persistence in `app/db/repo/upstream_audit_repo.py`.
- The main blockers are not infrastructure absence. They are:
  - the core intelligence layer is still too heuristic in `app/engine/*`
  - snapshot endpoints in `app/intelligence/snapshots/engine.py` are explicitly stubbed contract-first logic
  - auth/trust boundaries are still minimal in `app/core/security.py`
  - deployment is documented but not fully represented by repo artifacts
  - USAJOBS runtime ingestion exists, but it is still request-time search oriented rather than a bounded, production-shaped ingestion foundation
- The repo is therefore ready for a completion phase that first hardens the backend foundation and then tightens USAJOBS ingestion into a bounded v1 ingestion surface that can support the first real deterministic intelligence modules.

## 2. Completion target for current PathOS phase
“Backend complete enough for current PathOS phase” should mean:
- the backend can run as a production-shaped local/staging service with reliable startup, readiness, migrations, logging, retention, and worker controls
- USAJOBS ingestion remains official-API-only and is implemented as a bounded, auditable, versioned runtime data path with raw payload provenance, canonical mapping, checkpointing, and deterministic failure handling
- the backend exposes deterministic runtime-owned logic as first-class code, not just API contracts or LLM wrappers
- the first qualification/evidence/application decision modules have a clear place in the repo and can consume canonical USAJOBS records without changing the trust boundary
- explainability and audit metadata are designed into the runtime outputs before broader feature expansion
- placeholder runtime behavior is either removed, explicitly gated, or clearly marked as non-production

## 3. Recommended implementation phases

### Phase 1: foundation hardening
- objective
  - Harden the runtime shell so later intelligence work lands on a stable, production-shaped backend foundation.
- why it matters
  - Intelligence work built on shaky startup/config/auth/deployment assumptions will create rework and ambiguous failures.
- exact likely files/modules involved
  - `app/core/startup_validation.py`
  - `app/core/config.py`
  - `app/core/security.py`
  - `app/core/readiness.py`
  - `app/main.py`
  - `app/db/connection.py`
  - `app/db/migration_safety.py`
  - `app/services/delivery_transport_service.py`
  - `docs/ops/deployment-local-compose.md`
  - `docs/runbook/backend-runbook-v1.md`
  - likely new deployment artifact files at repo root if chosen
- required tests
  - strengthen `tests/test_health_readiness.py`
  - strengthen `tests/test_auth.py`
  - add startup env normalization/regression tests
  - add tests for production-disabled placeholder delivery behavior if transport semantics change
- docs to update
  - `README.md`
  - `docs/ops/deployment-local-compose.md`
  - `docs/runbook/backend-runbook-v1.md`
  - `docs/audits/backend-completion-roadmap.md`
- dependencies
  - none
- risks
  - over-scoping into full auth redesign
  - mixing foundation work with intelligence implementation too early
- done criteria
  - startup/readiness behavior is explicit and stable across local/staging shells
  - `PATHOS_ENV` handling is hardened
  - placeholder runtime paths are clearly gated or documented
  - deployment expectations are represented by actual repo artifacts or explicitly called out as not yet implemented

### Phase 2: bounded USAJOBS ingestion v1
- objective
  - Move from ad hoc request-time USAJOBS search usage toward a bounded real-data ingestion foundation with preserved provenance and deterministic replay semantics.
- why it matters
  - Qualification and decision modules need canonical job evidence that is stable, auditable, and operationally controlled.
- exact likely files/modules involved
  - `app/adapters/usajobs/client.py`
  - `app/adapters/usajobs/models.py`
  - `app/adapters/usajobs/normalize.py`
  - `app/adapters/usajobs/types.py`
  - `app/domain/jobs/canonical_models.py`
  - `app/services/job_search_service.py`
  - `app/services/saved_search_runner_service.py`
  - `app/services/saved_search_checkpoint_service.py`
  - `app/services/alerts_run_service.py`
  - `app/db/repo/upstream_audit_repo.py`
  - `app/db/repo/saved_search_checkpoint_repo.py`
  - `app/db/repo/saved_search_snapshot_repo.py`
  - `app/db/migrations/009_ingestion_checkpoint_ledger_v1.sql`
  - possible new ingestion-specific repo/service modules under `app/services/` and `app/db/repo/`
- required tests
  - `tests/api/jobs/test__positive__usajobs_client.py`
  - `tests/api/jobs/test__equivalence__job_search_service.py`
  - `tests/adapters/usajobs/test_mapper.py`
  - `tests/services/test_saved_search_runner_service.py`
  - `tests/services/test_saved_search_checkpoint_service.py`
  - `tests/test_upstream_audit_integrity_slice93.py`
  - new sync/idempotency/backoff/malformed-field tests
- docs to update
  - `README.md`
  - `docs/diagnostics/usajobs-wiring-report.md`
  - `docs/runbook/backend-runbook-v1.md`
  - `docs/audits/usajobs-ingestion-v1-plan.md`
- dependencies
  - Phase 1 runtime hardening
- risks
  - widening scope into full general-purpose ETL
  - losing raw payload provenance
  - coupling ingestion semantics to UI-driven endpoint contracts
- done criteria
  - USAJOBS runtime ingestion scope is explicitly bounded
  - canonical mapping/versioning/provenance rules are stable
  - checkpointing/idempotency/backoff are proven by tests
  - failure handling for malformed or partial upstream fields is deterministic and auditable

### Phase 3: deterministic qualification engine v1
- objective
  - Build the first real PathAdvisor qualification engine over canonical jobs and runtime-owned evidence.
- why it matters
  - This is the first phase where the backend becomes a real intelligence layer instead of only an orchestration shell.
- exact likely files/modules involved
  - `app/engine/evaluator.py`
  - `app/engine/scoring.py`
  - `app/engine/reason_library.py`
  - `app/models/advisor.py`
  - `app/models/job.py`
  - `app/models/profile.py`
  - likely new domain modules under `app/engine/` or `app/intelligence/`
  - `app/api/v1/advisor.py`
- required tests
  - extend `tests/test_advisor_engine_golden.py`
  - extend `tests/test_models_validate.py`
  - add qualification edge-case and regression tests under `tests/services/` or top-level deterministic engine tests
- docs to update
  - `README.md`
  - architecture notes under `docs/architecture/`
  - change brief for the phase
- dependencies
  - Phase 2 canonical ingestion assumptions
- risks
  - overfitting to heuristics without evidence provenance
  - embedding qualification logic directly in route handlers or services
- done criteria
  - deterministic qualification outputs exist beyond title/skill/location heuristics
  - rules and reasons are versioned
  - golden tests cover representative PathAdvisor scenarios

### Phase 4: evidence provenance/explainability v1
- objective
  - Add first-class explanation lineage so deterministic outputs can be audited and safely rendered by the conversation layer.
- why it matters
  - PathOS trust UX depends on seeing why a conclusion was reached, not just the conclusion.
- exact likely files/modules involved
  - `app/models/advisor.py`
  - `app/models/job_score.py`
  - `app/intelligence/snapshots/models.py`
  - `app/services/audit_service.py`
  - `app/services/export_service.py`
  - `app/db/repo/audit_repo.py`
  - possibly new provenance models under `app/models/` or `app/intelligence/`
- required tests
  - extend `tests/test_advisor_writes_audit.py`
  - extend `tests/test_export_integrity_slice93.py`
  - add explainability contract tests for evidence refs and rule provenance
- docs to update
  - `README.md`
  - export/audit contract docs
  - runbook guidance for interpreting provenance records
- dependencies
  - Phase 3 deterministic rule outputs
- risks
  - storing only human-readable text without structured provenance
  - leaking sensitive raw evidence into client-facing contracts
- done criteria
  - deterministic outputs carry structured evidence and rule lineage
  - audit/export surfaces preserve that lineage without exposing secrets

### Phase 5: application decision + alert intelligence v1
- objective
  - Connect qualification, match, and readiness reasoning into application decisions and alert intelligence that are still deterministic and bounded.
- why it matters
  - This is where PathAdvisor-style recommendations become operationally useful.
- exact likely files/modules involved
  - `app/intelligence/snapshots/engine.py`
  - `app/intelligence/snapshots/models.py`
  - `app/api/v1/intelligence.py`
  - `app/services/job_scoring_service.py`
  - `app/services/alert_evaluator.py`
  - `app/services/alerts_run_service.py`
  - `app/services/delta_engine_service.py`
  - `app/services/digest_builder_service.py`
- required tests
  - `tests/test_intelligence_snapshot_contract_pack_v1.py`
  - `tests/services/test_job_scoring_service.py`
  - `tests/services/test_alert_evaluator.py`
  - `tests/test_worker_alerts.py`
  - new application-decision goldens and alert-intelligence regressions
- docs to update
  - `README.md`
  - `docs/audits/backend-completion-roadmap.md`
  - intelligence-specific architecture docs
- dependencies
  - Phases 2-4
- risks
  - hiding stubs behind production-looking intelligence endpoints
  - turning alerts into opaque score thresholds with weak explainability
- done criteria
  - intelligence endpoints no longer rely on stubbed baseline logic
  - application recommendations and alert triggers are explainable, versioned, and deterministic

## 4. Repo-grounded module map

### API layer
- already exists
  - `app/api/v1/*.py`
  - especially `advisor.py`, `jobs.py`, `alerts.py`, `intelligence.py`, `health.py`, `diagnostics.py`, `export.py`, `ops.py`
- must be added
  - likely no major new API package; prefer extending current route groups with real behavior behind existing contracts

### services
- already exists
  - ingestion/orchestration: `job_search_service.py`, `saved_search_runner_service.py`, `saved_search_checkpoint_service.py`, `alerts_run_service.py`
  - trust/runtime: `audit_service.py`, `export_service.py`, `telemetry_service.py`, `retention_service.py`
  - current scoring: `job_scoring_service.py`, `advisor_service.py`
- must be added
  - a tighter ingestion-oriented service boundary if request-time search and bounded ingestion start diverging
  - possibly a dedicated qualification/application decision service layer if `app/engine/*` expands

### domain/decision logic
- already exists
  - `app/engine/evaluator.py`
  - `app/engine/scoring.py`
  - `app/engine/reason_library.py`
  - `app/intelligence/snapshots/engine.py` but currently stubbed
- must be added
  - real qualification engine modules
  - evidence provenance model
  - application decision logic beyond current snapshot stubs

### adapters/mappers
- already exists
  - `app/adapters/usajobs/client.py`
  - `app/adapters/usajobs/normalize.py`
  - `app/adapters/usajobs/models.py`
  - `app/adapters/usajobs/types.py`
- must be added
  - only if bounded ingestion v1 needs explicit sync-specific mapper/version helpers; do not create parallel mapper stacks without need

### persistence
- already exists
  - repo layer under `app/db/repo/*`
  - migrations under `app/db/migrations/*`
  - connection/migration safety in `app/db/connection.py` and `app/db/migration_safety.py`
- must be added
  - only if ingestion v1 requires dedicated storage for canonicalized job snapshots beyond current saved-search snapshot/checkpoint tables

### background jobs
- already exists
  - `app/worker/__init__.py`
  - `app/worker/scheduler_engine.py`
  - alert-run orchestration in `app/services/alerts_run_service.py`
- must be added
  - possibly a bounded ingestion-specific scheduled path if ingestion is separated from request-time search

### audit/explainability
- already exists
  - `app/services/audit_service.py`
  - `app/db/repo/audit_repo.py`
  - `app/db/repo/upstream_audit_repo.py`
  - `app/services/export_service.py`
  - request/log/migration audit infrastructure
- must be added
  - structured evidence provenance and rule lineage models
  - clearer separation between internal domain audit and external upstream audit if saved-search CRUD continues to expand

### config/security
- already exists
  - `app/core/config.py`
  - `app/core/security.py`
  - `app/core/startup_validation.py`
  - `app/core/readiness.py`
- must be added
  - likely stronger auth/trust boundary machinery
  - stronger env/deployment hardening, not a new config subsystem

## 5. Recommended build order
1. Harden startup, readiness, auth defaults, deployment expectations, and placeholder behavior first.
2. Lock down the bounded USAJOBS ingestion v1 contract next, including provenance, checkpointing, and failure handling.
3. Build qualification engine v1 on top of canonical USAJOBS records and existing profile/job models.
4. Add structured evidence provenance and explanation lineage before broadening intelligence endpoints.
5. Replace intelligence snapshot stubs and connect alert intelligence/application decision behavior to the new deterministic modules.

## 6. Risks and anti-patterns to avoid
- turning the backend into an LLM wrapper
  - Keep LLM code in optional narration/refinement paths only. Do not let `app/llm/*` become the source of deterministic conclusions.
- mixing runtime and learning
  - Runtime should consume versioned artifacts and canonical rules, not training/eval code or mutable learned behavior.
- over-coupling API routes to scoring logic
  - Keep `app/api/v1/*` thin. Put decision logic in `app/engine/*`, `app/intelligence/*`, or tightly scoped service modules.
- hiding placeholder logic behind production-looking endpoints
  - `app/intelligence/snapshots/engine.py` is the current warning sign. Do not ship more polished contracts over stubbed logic.
- losing raw USAJOBS payload provenance
  - Preserve upstream payload hash and bounded raw retention semantics in `upstream_api_audit_records`. Do not normalize away the ability to audit mapper drift or upstream schema changes.
