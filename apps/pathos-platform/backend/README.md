# PathOS Backend

FastAPI backend for deterministic advisor evaluation, audit logging, trust controls, and desktop integration contracts.

## Quality Gates
Run from repository root:

```bash
poetry run ruff check .
poetry run mypy app tests
poetry run pytest -q
```

`pytest` enforces coverage gates via `pyproject.toml`:
- source: `app`
- branch coverage enabled
- fail-under: 90%

## OpenAPI Contract Snapshot
Generate the current OpenAPI contract artifact:

```bash
poetry run python scripts/export_openapi.py
```

Regression check:

```bash
poetry run pytest -q tests/test_openapi_snapshot_regression.py
```

The regression test verifies deterministic snapshot output against `artifacts/contracts/openapi.json`.

## CI Behavior
GitHub Actions workflow: `.github/workflows/ci.yml`
- triggers on pull requests to `develop`
- triggers on pushes to `develop`
- enforces:
  - `ruff check .`
  - `mypy app tests`
  - `pytest -q` (coverage gate >= 90%)

## Testing Strategy (9 Categories)
- Use Case: end-to-end API flows (advisor, threads, audit, export, wipe).
- Misuse Case: missing/wrong auth, invalid wipe confirm, request spam.
- Boundary: query limits (e.g., audit recent), truncation and size constraints.
- Equivalence: parameterized valid/invalid auth and config parsing modes.
- Positive: valid payloads return expected contracts.
- Negative: invalid payloads return ErrorResponse with requestId.
- Edge Case: empty/missing records, single-message/limited-context behavior.
- Security: auth boundary, CORS allowlist, request-id traceability, SQL-safe behavior by outcome.
- Regression: deterministic advisor golden tests and OpenAPI snapshot regression.

## Review Workflow
See `docs/reviews/backend-review-slices-3-17.md` for the local review harness, must-fix criteria, and area-to-category mapping.
# PathOS Backend (FastAPI)

PathOS Backend is the local-first runtime service for PathOS Desktop and future deployments. It is built with FastAPI and organized around a deterministic core with optional narration, strict validation, auditability, and trust controls.

---

## What this backend provides

Core capabilities

* Deterministic advisor evaluation (stable, auditable outputs)
* Optional narration layer with strict schema validation and deterministic fallback
* SQLite persistence for audit records
* Opt-in conversation threads and messages (storage off by default)
* Rolling thread summaries (deterministic with optional LLM refinement)
* Trust Controls v1: export, delete, wipe
* Auth v1: Bearer API key protection for `/api/v1/*` (health remains open)
* Request ID middleware and standardized error contract
* Optional CORS allowlist (disabled by default)
* Optional in-memory rate limiting (disabled by default)
* OpenAPI export endpoint and deterministic contract snapshot

---

## Requirements

* Python 3.11+ recommended
* Poetry

---

## Quick start

### 1) Install dependencies

```bash
poetry install
```

### 2) Run the server (development)

```bash
poetry run uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

### 3) Verify health

```bash
curl http://127.0.0.1:8000/api/v1/health
```

PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

---

## Environment variables

### Auth

`/api/v1/health` is always open.
Everything else under `/api/v1/*` is:

* open only in explicit local-style runtimes: `local`, `dev`, `test`, `ci`
* fail-closed in `staging`, `production`, and `unknown`

* `PATHOS_API_KEYS`

  * Comma-separated API keys
  * required for `staging` and `production` API startup
  * non-local keys must be non-trivial shared secrets; short placeholder keys are rejected at startup

Example:

```bash
export PATHOS_API_KEYS="local-dev-api-key-1234"
poetry run uvicorn app.main:create_app --factory --reload
```

PowerShell:

```powershell
$env:PATHOS_API_KEYS="desktop-dev-key"
poetry run uvicorn app.main:create_app --factory --reload
```

---

### Database

* `PATHOS_DB_PATH`

  * Path to SQLite DB file
  * If unset, defaults to a DB under `data/` (example: `data/pathos.db`)

Example:

```bash
export PATHOS_DB_PATH="data/pathos.db"
```

---

### CORS (optional)

CORS is disabled by default. Enable it only when you explicitly set an allowlist.

* `PATHOS_CORS_ORIGINS`

  * Comma-separated origin allowlist
  * Example: `http://localhost:5173,capacitor://localhost`
  * If unset or empty, CORS stays disabled

Example:

```bash
export PATHOS_CORS_ORIGINS="http://localhost:5173"
```

---

### Environment metadata (desktop info)

* `PATHOS_ENV`

  * Used by `/api/v1/desktop/info` and startup guardrails
  * Default: `local`
  * Allowed values after normalization: `local`, `dev`, `test`, `ci`, `staging`, `production`, `unknown`
  * `PROD` is normalized to `production`

* `PATHOS_BASE_URL`

  * Used by `/api/v1/desktop/info`
  * Default: `/api/v1`

---

### Rate limiting (optional)

Rate limiting is disabled by default.

* `PATHOS_RATE_LIMIT_ENABLED`

  * `true` or `false`
  * Default: `false`

* `PATHOS_RATE_LIMIT_RPM`

  * Requests per minute
  * Default: `120`

Example:

```bash
export PATHOS_RATE_LIMIT_ENABLED="true"
export PATHOS_RATE_LIMIT_RPM="60"
```

---

## Common development commands

### Run server

```bash
poetry run uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

### Export OpenAPI snapshot

```bash
poetry run python scripts/export_openapi.py
```

Factory mode matters here:
- Runtime uses `create_app` in API mode through `--factory`, so startup validation runs only when the server is actually started.
- OpenAPI export uses `create_app(mode=\"openapi\")`, which avoids import-time runtime-only validation and keeps CI snapshot generation deterministic.

### Run tests

```bash
poetry run pytest -q
```

### Lint

```bash
poetry run ruff check .
```

### Typecheck

```bash
poetry run mypy app tests
```

### Run all quality gates

```bash
poetry run ruff check .
poetry run mypy app tests
poetry run pytest -q
```

### Run with Docker Compose

1. Copy `.env.example` to `.env`
2. Fill in real values for:
   * `PATHOS_API_KEYS`
   * `USAJOBS_API_KEY`
   * `USAJOBS_USER_AGENT`
3. Start API + worker:

```bash
docker compose up --build
```

### Run Alembic migrations (SQLite local)

```bash
DB_DIALECT=sqlite PATHOS_DB_PATH=data/pathos.db poetry run alembic upgrade head
```

### Run Alembic migrations (Postgres)

```bash
DB_DIALECT=postgres DATABASE_URL=postgresql://user:pass@localhost:5432/pathos poetry run alembic upgrade head
```

### Generate a new Alembic revision

```bash
poetry run alembic revision -m "describe-change"
```

---

## API usage

### Authorization header

When `PATHOS_API_KEYS` is set, pass:

`Authorization: Bearer <key>`

Example:

```bash
curl -H "Authorization: Bearer desktop-dev-key" \
  http://127.0.0.1:8000/api/v1/desktop/info
```

PowerShell:

```powershell
Invoke-RestMethod `
  -Headers @{ Authorization = "Bearer desktop-dev-key" } `
  http://127.0.0.1:8000/api/v1/desktop/info
```

---

### Error contract and Request ID

Every response includes `X-Request-ID`.
Errors return a standardized JSON shape:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human-readable message",
    "requestId": "uuid-or-provided-id",
    "details": {}
  }
}
```

If you send `X-Request-ID` in the request, the backend echoes it back.

---

## Desktop integration endpoints

### Desktop info

* `GET /api/v1/desktop/info` (protected)

Returns:

* version
* env
* authRequired
* baseUrl
* serverTime

### Intelligence snapshot endpoints

The current `/api/v1/intelligence/*` snapshot endpoints remain contract-pack stubs.

* In `local`, `dev`, `test`, and `ci`, they are available and return header `X-PathOS-Intelligence-Status: stubbed-contract-v1-local-only`
* In `staging`, `production`, and `unknown`, they are disabled with a canonical `503 FEATURE_NOT_READY` response

---

### OpenAPI contract

* `GET /api/v1/meta/openapi` (protected)

Export a deterministic snapshot:

```bash
poetry run python scripts/export_openapi.py
```

This writes to:

```
artifacts/contracts/openapi.json
```

---

## Data model and migrations

The backend uses SQLite and runs a lightweight migration runner on startup.

Migration files live under:

```
app/db/migrations/
```

They are applied in order and recorded in `schema_migrations`. The runner is idempotent and safe to execute on each startup.

---

## High-level API groups

Advisor

* Evaluate (deterministic)
* Narrate (optional, validated)
* Evaluate and narrate

Audit

* Persist evaluations
* Fetch by trace_id
* List recent

Threads (opt-in storage)

* Create thread
* Append message
* Get thread + messages
* List recent threads

Summaries

* Get summary
* Recompute summary

Trust Controls

* Export thread, audit, recent
* Delete thread (cascades messages), delete audit
* Wipe (requires confirm token)

---

## Recommended local development workflow

1. Set API keys (recommended)

```powershell
$env:PATHOS_API_KEYS="desktop-dev-key"
```

2. Start backend

```powershell
poetry run uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

3. Run checks before pushing

```powershell
poetry run ruff check .
poetry run mypy app tests
poetry run pytest -q
poetry run python scripts/export_openapi.py
```

---

## Troubleshooting

### Startup fails in staging or production

Check:

* `PATHOS_ENV` is set correctly
* `PATHOS_API_KEYS` is present for API startup
* each configured API key is a real secret, not a short placeholder
* `USAJOBS_API_KEY` and `USAJOBS_USER_AGENT` are set for API and worker modes

### 401 or 403 on protected routes

* 401: missing or malformed Authorization header.
* 403: key present but not included in `PATHOS_API_KEYS`.

Ensure:

* `PATHOS_API_KEYS` includes your key
* You send `Authorization: Bearer <key>`

---

### Reset local data (development only)

* Use the trust wipe endpoint (requires confirm token)
* Or delete the SQLite file at `PATHOS_DB_PATH`

---

## Design Notes

* Deterministic engine outputs are reproducible and auditable.
* Optional narration must be validated and never override deterministic truth.
* Secrets remain server-side. Desktop communicates through a controlled boundary.
* Placeholder delivery and intelligence stub paths are local-only until production-ready implementations exist.

## Codex Automated Reviews and Autofix PRs (GitHub Actions)

Two stateless GitHub Actions workflows provide Codex automation around CI without replacing human review:

- `.github/workflows/codex-review.yml`
  - Runs on PR events (`opened`, `reopened`, `synchronize`)
  - Skips forked PRs
  - Fetches PR diff context and calls OpenAI Responses API through `scripts/ci_ai/pr_review.py`
  - Posts an automated PR comment with sections: Summary, Risks, Suggested Changes, Tests/Quality Gates, Security Notes
  - Review output is advisory only

- `.github/workflows/codex-autofix.yml`
  - Runs when the `CI` workflow completes with failure on `develop`
  - Re-runs `ruff`, `mypy`, and `pytest` locally in the runner and captures failure logs
  - Calls OpenAI Responses API through `scripts/ci_ai/autofix_patch.py` to generate a unified diff patch
  - Applies patch with `git apply` and re-runs quality gates
  - Opens a PR targeting `develop` only if all gates pass after patch application
  - Autofix PRs are proposals and require human review before merge

Required GitHub secrets:

- `OPENAI_API_KEY` (used for OpenAI API calls in review/autofix)
- `CODEX_PR_TOKEN` (used only for PR creation in autofix workflow)

Safety constraints:

- CI gates remain the merge blockers.
- Codex reviews do not bypass lint/type/test/coverage requirements.
- Autofix runs only for failed CI runs on `develop` and keeps scope minimal.
