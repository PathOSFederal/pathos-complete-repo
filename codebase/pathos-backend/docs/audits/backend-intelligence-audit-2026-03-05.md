# Backend Intelligence Audit - 2026-03-05

## 1) Executive summary
What is working:
- FastAPI backend already has a clear separation of layers (`api` -> `services` -> `adapters`/`db`) and deterministic scoring modules.
- USAJOBS integration exists as a dedicated adapter and uses the official API endpoint (`https://data.usajobs.gov/api/search`).
- Structured JSON logging exists with a central wrapper (`app/core/logging.py`) and request correlation support.
- Alerting pipeline has deterministic ranking/delta logic and run-level audit/metrics entities.

What is missing against the target intelligence architecture:
- The four required deterministic snapshot contracts do not exist as canonical first-class backend outputs.
- Person Graph is partial (profile only); resume + evidence graph model is missing.
- Career Graph concept (role templates, signals, knowledge packs with versioning lifecycle) is not implemented.
- Versioned explainability fields required by target snapshots are inconsistent/missing (`knowledge_pack_version`, `evidence_used`, `missing_evidence`, stable `subscores/spokes` across snapshot types).

Biggest risks:
- Raw upstream payload persistence in upstream audit table can violate logging hardening/trust-first constraints.
- Deterministic and narration concerns are mostly separated but still mixed in `/advisor/evaluate-and-narrate` and via non-deterministic metadata (timestamps/UUIDs) in outputs.
- Snapshot contract gap will force frontend to compose intelligence ad hoc from multiple endpoints and non-uniform schemas.

Read-first status:
- `docs/ai/cursor-house-rules.md`: present
- `docs/ai/testing-standards.md`: present
- `docs/ai/prompt-header.md`: present
- `docs/architecture/*.md`: missing
- `README.md`: present

Repo context:
- Repo root: `C:/dev/PathOS/codebase/pathos-backend`
- Remote: `origin git@github.com:PathOSFederal/pathos-backend.git`
- Branch: `develop`
- Git status porcelain: clean (no entries)

## 2) Architecture map (modules + responsibilities)
Current backend architecture map:

Top-level (concise):
- `.github/`, `alembic/`, `app/`, `artifacts/`, `data/`, `docs/`, `scripts/`, `tests/`

`app/` (key modules):
- `app/main.py`: FastAPI app factory (`create_app`), middleware wiring, router registration.
- `app/api/v1/*.py`: HTTP route layer.
- `app/core/`: config, logging, error handling, startup validation, security.
- `app/middleware/`: request ID and rate-limiting middleware.
- `app/services/`: orchestration/business logic.
- `app/adapters/usajobs/`: official USAJOBS integration and normalization.
- `app/domain/jobs/canonical_models.py`: canonical opportunity models.
- `app/models/`: request/response contracts.
- `app/engine/`: deterministic advisor scoring/reasoning.
- `app/llm/`: optional narration/LLM client.
- `app/db/`: connection, migrations, repositories.
- `app/worker/`: scheduler loop and background alert runs.

Entrypoint and router structure:
- Entrypoint: `app/main.py` -> `create_app(mode: StartupMode = "api")`
- Routers included under `/api/v1`:
  - advisor, advisor_session, alerts, audit, desktop, diagnostics, export, health, jobs, meta, ops, profile, saved_searches, thread_summary, threads, wipe.
- Health is also exposed unprefixed (`/health*`).

Configuration/logging/env handling:
- Env/config: `app/core/config.py` (`Settings`, `refresh_settings()`, `get_*` accessors).
- Logging wrapper: `app/core/logging.py` (`JsonLogFormatter`, `configure_logging`, `log_event`).
- Correlation context: `app/core/request_context.py`.
- Request ID middleware: `app/middleware/request_id.py`.
- Error contract + logging: `app/core/error_handlers.py`.

USAJOBS adapters:
- `app/adapters/usajobs/client.py`: official endpoint call `/api/search` at `data.usajobs.gov`.
- `app/adapters/usajobs/models.py`: upstream schema models.
- `app/adapters/usajobs/normalize.py`: deterministic canonical mapping.
- `app/adapters/usajobs/mapper.py`: compatibility shim.
- `app/adapters/usajobs/types.py`, `errors.py`.

## 3) Snapshot readiness matrix
| Target snapshot | Exists today | Where implemented | Input contract | Output contract | Deterministic? | Versioned (`rule_version` + `knowledge_pack_version`) | Evidence trail (`evidence_used` + `missing_evidence`) |
|---|---|---|---|---|---|---|---|
| CareerReadinessSnapshot (person vs career) | No | N/A | N/A | N/A | N/A | No | No |
| ResumeReadinessSnapshot (resume vs career) | No | N/A | N/A | N/A | N/A | No | No |
| JobMatchSnapshot (person vs opportunity) | Partial | `app/api/v1/jobs.py`, `app/services/job_scoring_service.py`, `app/models/job_score.py` | `JobScoreRequest` (`search`, `profile`) | `JobScoreResult` (`final_score`, `breakdown`, `reasons`, `risks`, `ruleset_version`) | Partial: scoring logic deterministic, but endpoint fetches live upstream data and emits `computed_at` timestamp | Partial: `ruleset_version` exists; no `knowledge_pack_version` | No (`reasons/risks` exist, but no `evidence_used`/`missing_evidence`) |
| ApplicationConfidenceSnapshot (synthesis readiness + match + heuristics) | Partial | `app/api/v1/advisor.py`, `app/engine/evaluator.py`, `app/models/advisor.py` | `AdvisorInput` (`profile`, `job`, `user_notes`) | `AdvisorOutput` (`recommendation`, `confidence_band`, `reasons`, `risks`, `next_actions`, `meta`) | Partial: rules deterministic; output includes runtime UUID/timestamp metadata | Partial: `ruleset_version` exists in `meta`; no `knowledge_pack_version` | Partial: `evidence` field exists but is empty in evaluator; no explicit `missing_evidence` |

Mixing risk assessment (deterministic + LLM + UI-shaped responses):
- Deterministic and LLM logic are mostly separated by endpoint (`/advisor/evaluate` vs `/advisor/narrate`), but `/advisor/evaluate-and-narrate` mixes them in one call.
- Some responses are UI-oriented (e.g., desktop overview/digest summaries) rather than canonical intelligence snapshot contracts.
- Risk: frontend may consume non-canonical route outputs as source-of-truth, reducing auditability and contract stability.

## 4) Canonical model gap analysis (Person/Career/Opportunity)
Person Graph:
- Present (partial):
  - `app/models/profile.py` (`UserProfileSnapshot`) for advisor input.
  - `app/models/profile_v1.py` + `app/services/profile_service.py` for persisted profile preferences.
- Missing:
  - Canonical resume object(s), evidence graph objects, evidence provenance and missing-evidence tracking.
- Recommendation:
  - Introduce `PersonGraph` aggregate model with `profile`, `resumes[]`, `evidence[]` and stable evidence IDs/pointers.

Career Graph:
- Present (minimal/implicit):
  - `app/engine/scoring.py` keyword heuristics.
  - `artifacts/rulesets/v0.1.0/reason_library.json` (reason text library).
- Missing:
  - Canonical role templates, skill signal taxonomy, knowledge pack entity/version registry.
- Recommendation:
  - Add explicit `CareerGraph` models (`RoleTemplate`, `SignalDefinition`, `KnowledgePackRef`) and persisted/packaged versioned knowledge packs.

Opportunity Graph:
- Present (strongest area):
  - Canonical model: `app/domain/jobs/canonical_models.py`.
  - Mapping: `app/adapters/usajobs/normalize.py`.
  - Upstream audit summary persistence: `app/db/repo/upstream_audit_repo.py`.
- Gaps:
  - Opportunity provenance is good but still tied to endpoint-run outputs; no standalone opportunity graph store/lineage model.
- Recommendation:
  - Keep current canonical job model; add explicit graph identity/lineage fields and optional normalized announcement retention policy.

## 5) USAJOBS compliance + alerts readiness
Compliance (official API only):
- Confirmed: outbound integration is through `app/adapters/usajobs/client.py` with endpoint `/api/search` and base `https://data.usajobs.gov`.
- No scraping libraries or scraping codepaths detected in `app/`.

Rate limiting / backoff / caching:
- Upstream 429 handling: typed errors (`UpstreamRateLimitError` -> service mapping).
- Backoff: worker alert run retry policy in `app/services/alerts_run_service.py` (`_run_with_backoff` + `WorkerRetryPolicy`).
- Caching: in-memory cache in `app/services/job_search_service.py` (`_CACHE`, TTL from `USAJOBS_CACHE_TTL_SECONDS`).

Dedupe polling across users:
- Partial:
  - Query-level in-process cache dedupes identical searches regardless of user context.
  - Global scheduler lock (`AlertSchedulerLockRepo`) prevents concurrent alert run overlap.
  - Saved-search diffing uses snapshots (`saved_search_job_snapshots`) and fingerprints.
- Gap:
  - No distributed cache/lock abstraction for multi-process/multi-instance deployment.

Announcement storage strategy:
- Current state:
  - Canonical job summaries persisted in run/delta artifacts.
  - Upstream audit can persist full `payload_json` in `upstream_api_audit_records`.
- Gap:
  - Full raw upstream payload persistence may exceed “minimize storing full text” objective.

Alert architecture readiness (SearchKeys, diffing, event generation):
- Search keys/fingerprints: present (`query_fingerprint` in saved-search runs).
- Diffing: present (`DeltaEngineService.classify_and_update_snapshots`).
- Event generation/delivery: present (`alerts`, `alert_digests`, transport abstractions, run/rule history).
- Overall: operationally strong for alerting v1, but not yet aligned to the target snapshot contract layer.

## 6) Logging hardening findings
Assessment vs Logging Hardening v1:
- Structured JSON logs: Yes (`app/core/logging.py`).
- Human-readable analytical `message`: Yes, consistently in `log_event` callsites.
- Correlation fields: Yes, payload always includes `request_id`, `run_id`, `worker_run_id`, `rule_id`, `saved_search_id` (nullable where context absent).
- Secret logging avoidance: Partial (headers/api keys are not logged; env presence is redacted). Main risk is raw upstream payload persistence.
- Clear wrapper/middleware: Yes (`log_event` + `request_id_middleware`).

Concrete findings (with paths):
1. Raw upstream payload persistence risk
- Path: `app/services/job_search_service.py`, `app/db/repo/upstream_audit_repo.py`
- Finding: full upstream response can be stored in `payload_json`; this conflicts with strict “no raw upstream payloads” logging hardening posture.

2. Config flags for raw payload control are not enforced in persistence path
- Path: `app/core/config.py`, `app/services/job_search_service.py`, `app/db/repo/upstream_audit_repo.py`
- Finding: `AUDIT_LOG_RAW_UPSTREAM` and `AUDIT_MAX_UPSTREAM_BYTES` exist, but save path does not enforce redaction/truncation policy.

3. Exception string logging may leak sensitive operational details
- Path: `app/db/connection.py`
- Finding: several logs include `details={"error": str(exc)}`; DB/network exceptions may contain connection details.

4. Correlation nullability is acceptable for startup events but not explicitly policy-scoped
- Path: `app/core/logging.py`, `app/core/startup_validation.py`
- Finding: correlation keys are present but often null outside request scope; add policy/tests to require non-null for request-bound events.

Recommended fixes (3-5):
1. Enforce summary-only upstream audit storage by default; gate raw payload behind explicit debug-only flag and strict truncation/redaction.
2. Wire `AUDIT_LOG_RAW_UPSTREAM`/`AUDIT_MAX_UPSTREAM_BYTES` into `JobSearchService._record_upstream_audit` and `UpstreamAuditRepo.save_record`.
3. Replace raw `str(exc)` logging in DB layer with stable error codes/classes plus safe detail allowlist.
4. Add tests that fail when logs/audit rows contain secret-like keys/values or large raw payload blobs.
5. Define event policy by category (startup vs request-bound) and assert required non-null correlation fields for request-bound events.

## 7) Determinism boundary risks
Deterministic modules:
- `app/engine/scoring.py`, `app/engine/evaluator.py`, `app/services/job_scoring_service.py`, `app/adapters/usajobs/normalize.py`, `app/services/delta_engine_service.py`.

Non-deterministic modules:
- `app/llm/client.py` (OpenAI call), `app/llm/narrator.py` (LLM path), upstream fetch path (`app/adapters/usajobs/client.py`), runtime UUID/time generation in service outputs.

Boundary status:
- Mostly clean: deterministic advisor evaluation can run independently; narration is optional and schema-validated.
- Mixed areas:
  - `/api/v1/advisor/evaluate-and-narrate` couples deterministic evaluation and LLM narration in one response.
  - Deterministic outputs include runtime-generated metadata (`trace_id`, timestamps), which reduces strict replay identity.
  - No dedicated snapshot engine package producing the four target snapshot contracts as immutable deterministic artifacts.

Refactor plan (boundary cleanup):
1. Introduce `app/intelligence/snapshots/` deterministic engine package for four canonical snapshots.
2. Keep narration endpoints separate and accept snapshot IDs/payloads only; narration never mutates snapshot records.
3. Store deterministic snapshot artifacts with stable IDs derived from canonical input hashes + version tuple.
4. Reserve runtime metadata (request IDs, generated_at) for transport/audit envelope, not core snapshot score payloads.

## 8) Testing/CI posture
Framework and gates:
- Test framework: `pytest`.
- Coverage gate: `--cov=app --cov-branch --cov-fail-under=90` (from `pyproject.toml`).
- Lint/type: `ruff`, `mypy`.

Commands executed:
- `python --version` -> `Python 3.12.10`
- `poetry --version` -> `Poetry 2.3.2`
- `poetry install` -> succeeded
- `poetry run pytest -q` -> did not complete in this run (tool timeout; pytest emitted terminal `OSError: [Errno 22] Invalid argument`)
- `poetry run ruff check .` -> passed (`All checks passed!`)
- `poetry run mypy .` -> passed (`Success: no issues found in 224 source files`)

Readiness summary:
- Static quality gates currently healthy (`ruff`, `mypy`).
- Full runtime confidence is incomplete due failed/timeout pytest run in this execution environment.

## 9) Recommended roadmap
0-2 weeks (highest priority):
1. Define and implement canonical Pydantic snapshot contracts for all four target snapshots.
2. Build deterministic snapshot service layer and expose dedicated `/api/v1/intelligence/snapshots/*` endpoints.
3. Enforce upstream audit hardening: summary-only by default, configurable redaction/truncation, no full raw payloads.
4. Add knowledge-pack and ruleset version tuple to every snapshot response and persisted snapshot row.

2-6 weeks:
1. Introduce canonical Person Graph models including resumes/evidence references and missing-evidence semantics.
2. Introduce Career Graph package (role templates, signal taxonomy, knowledge packs) with explicit version lifecycle.
3. Add deterministic ApplicationConfidence synthesis that composes readiness + match + heuristics into one auditable snapshot.
4. Add contract/regression tests for snapshot determinism and explainability field completeness.

6+ weeks:
1. Add distributed cache/lock strategy for multi-instance alert/search dedupe.
2. Add lineage-aware opportunity graph persistence with retention controls.
3. Add observability SLO dashboards and structured event schema enforcement in CI.

## 10) Contract Pack recommendation
Proposed Pydantic snapshot contracts (names + fields):

```python
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field

class SnapshotReason(BaseModel):
    code: str
    message: str

class SnapshotEvidenceRef(BaseModel):
    source: str
    pointer: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)

class SnapshotSpoke(BaseModel):
    key: str
    score: float = Field(ge=0, le=100)

class SnapshotMeta(BaseModel):
    snapshot_id: str
    snapshot_type: str
    generated_at: datetime
    rule_version: str
    knowledge_pack_version: str
    input_hash: str

class BaseSnapshot(BaseModel):
    score: float = Field(ge=0, le=100)
    subscores: list[SnapshotSpoke] = Field(default_factory=list)
    reasons: list[SnapshotReason] = Field(default_factory=list)
    evidence_used: list[SnapshotEvidenceRef] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    meta: SnapshotMeta

class CareerReadinessSnapshot(BaseSnapshot):
    person_id: str
    career_id: str

class ResumeReadinessSnapshot(BaseSnapshot):
    person_id: str
    resume_id: str
    career_id: str

class JobMatchSnapshot(BaseSnapshot):
    person_id: str
    opportunity_id: str
    career_id: str | None = None

class ApplicationConfidenceSnapshot(BaseSnapshot):
    person_id: str
    opportunity_id: str
    career_readiness_snapshot_id: str | None = None
    resume_readiness_snapshot_id: str | None = None
    job_match_snapshot_id: str | None = None
```

Versioning requirement:
- All four snapshots should include both `rule_version` and `knowledge_pack_version` in `meta` and in persistence indexes for reproducible recompute/audit.

---
Audit confidence: Medium-High
- High confidence on architecture, model, and logging findings (source-backed).
- Medium confidence on full test posture because `pytest -q` did not complete in this run environment.
