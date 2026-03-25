# PathOS Backend Gap List

## Critical
- [ ] Replace intelligence snapshot stubs with real deterministic logic
  - evidence: `app/intelligence/snapshots/engine.py:1` calls the module "stubs for contract-first integration"; `app/intelligence/snapshots/engine.py:64` hard-codes `overall_score=74`.
  - impact: Snapshot endpoints look product-ready but do not yet represent a real PathOS intelligence layer.
  - recommended fix: Build artifact-backed deterministic snapshot engines with genuine rule evaluation and evidence lineage.
- [ ] Expand the advisor engine beyond narrow heuristics
  - evidence: `app/engine/scoring.py` only models title keywords, role alignment, experience band, location, and work authorization; `app/engine/evaluator.py` returns `evidence=[]`.
  - impact: Current recommendations are too shallow for PathAdvisor-grade decisions.
  - recommended fix: Add qualification-duty reasoning, document completeness checks, questionnaire-fit modeling, and explicit evidence provenance.
- [ ] Harden auth and trust boundary for production use
  - evidence: `app/core/security.py` is only a shared bearer key gate; if no keys are configured it allows open access.
  - impact: Unsafe for shared, multi-user, or tenant-aware deployments.
  - recommended fix: Introduce explicit authn/authz model, resource ownership, and disable open mode outside local/dev.
- [ ] Add explanation provenance to all intelligence outputs
  - evidence: advisor/job outputs include readable reasons, but not a full rule-evidence lineage; advisor `evidence` is empty by default in `app/engine/evaluator.py`.
  - impact: Trust-first UX and auditability are incomplete.
  - recommended fix: Emit rule IDs, evidence refs, and stable explanation packs across advisor, job scoring, and snapshot modules.

## High
- [ ] Remove placeholder delivery behavior or make it explicitly non-production
  - evidence: `app/services/delivery_transport_service.py:40` marks `EmailDigestFutureTransport.deliver` as a deterministic no-op placeholder.
  - impact: Delivery capabilities can appear implemented when they are not.
  - recommended fix: Either implement real delivery or gate/remove the placeholder from production paths.
- [ ] Fix startup/test fragility caused by ambient environment state
  - evidence: `app/core/startup_validation.py:21` allows `production` but not `prod`; live audit run showed full-suite failure when shell env had `PATHOS_ENV=PROD`.
  - impact: Local/staging/prod operations are brittle and tests can fail for non-code reasons.
  - recommended fix: Normalize accepted env aliases or sanitize env in app/test bootstrap.
- [ ] Add actual deployment artifacts
  - evidence: repo search found deployment docs only; no `Dockerfile`, `docker-compose.yml`, or equivalent manifest is present.
  - impact: Production-shaped deployment is documented but not reproducible from repo artifacts.
  - recommended fix: Add container/build/runtime manifests and keep them under CI validation.
- [ ] Strengthen privacy filtering beyond simple regex checks
  - evidence: `app/services/profile_service.py:31-55` only checks a few patterns like SSN and "secret/top secret".
  - impact: Sensitive user data handling is not robust enough for trust-sensitive workflows.
  - recommended fix: Add structured privacy policies, redaction/classification paths, and export safety controls.

## Medium
- [ ] Consolidate migration strategy
  - evidence: SQLite uses custom SQL runner plus compatibility `ALTER TABLE` patches in `app/db/connection.py`; Postgres uses Alembic; `app/db/sqlalchemy_metadata.py` is scaffolding-only.
  - impact: Higher schema drift risk and more startup complexity.
  - recommended fix: Choose a single authoritative migration story per dialect and reduce startup patching.
- [ ] Stop overloading upstream audit storage for internal CRUD audit markers
  - evidence: `SavedSearchService._record_audit()` writes saved-search create/update/delete markers into `upstream_api_audit_records`.
  - impact: Audit semantics become ambiguous.
  - recommended fix: Separate internal domain audit tables/events from external upstream audit records.
- [ ] Make repo initialization less side-effect heavy
  - evidence: many repos call `init_db()` internally before normal operations.
  - impact: Hidden migration/startup work on routine calls complicates behavior and performance.
  - recommended fix: Centralize DB readiness at startup and keep repo calls side-effect free.

## Low
- [ ] Retire legacy compatibility shims and duplicate routes
  - evidence: `app/adapters/usajobs/mapper.py` is a legacy compatibility shim; `app/api/v1/alerts.py` exposes both legacy and pluralized alert-rule paths.
  - impact: Extra maintenance surface and contract ambiguity.
  - recommended fix: migrate clients and remove deprecated paths.
- [ ] Add richer ops observability integrations
  - evidence: structured logs and telemetry exist, but there is no tracing backend or metrics export pipeline in repo.
  - impact: Harder production diagnosis at scale.
  - recommended fix: add metrics export/tracing aligned with deployment stack.

## Definition of backend completion for current PathOS phase
Complete enough right now should mean:
- deterministic advisor/job/alert intelligence is genuinely rule-driven and artifact-backed, not contract-first stubs
- all user-facing recommendations include clear evidence lineage and stable explanation metadata
- USAJOBS ingestion remains official-API-only and auditable
- runtime trust boundary is stronger than a shared API key and open mode is limited to explicit local/dev use
- local and staging deployments are reproducible from repo artifacts
- the backend can run tests and quality gates without depending on accidental shell environment values
- optional LLM features remain strictly secondary rendering layers that cannot invent deterministic conclusions
