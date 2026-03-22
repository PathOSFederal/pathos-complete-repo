# PathOS Backend Repo Context

## Current State
- Runtime: Python >=3.12 (`pyproject.toml`)
- Framework: FastAPI 0.129.x
- ASGI server: Uvicorn 0.40.x
- Dev dependencies: `pytest`, `ruff`, `mypy`
- Current implemented route:
  - `app/api/v1/health.py` defines `GET /api/v1/health` and returns `{"status":"ok"}`
- App bootstrap:
  - `app/main.py` creates the FastAPI app and includes the v1 router with prefix `/api/v1`
- Testing status:
  - `tests/` exists but is currently empty

## Local Development
1. Install dependencies:

```bash
poetry install
```

2. Run the API locally:

```bash
poetry run uvicorn app.main:create_app --factory --reload
```

3. Export OpenAPI locally:

```bash
poetry run python scripts/export_openapi.py
```

Why factory mode is required:
- `app.main` should be import-safe and must not instantiate the app at import time.
- `--factory` calls `create_app` only when the server starts.
- OpenAPI tooling can then call `create_app(mode="openapi")` without requiring runtime USAJOBS environment variables.

4. Open health endpoint:

```bash
http://127.0.0.1:8000/api/v1/health
```

## Testing
Run tests (currently no tests are implemented yet):

```bash
poetry run pytest
```

Optional local quality checks:

```bash
poetry run ruff check .
poetry run mypy app
```

## Routing Conventions
- All API routes must remain under `/api/v1`.
- Add new route modules under `app/api/v1/`.
- Keep routers per domain (for example: `users.py`, `sessions.py`, `jobs.py`) and include them from the v1 API package/main wiring.

## Planned Extension Points (No Restructure Required)
Add the following folders incrementally while keeping existing files and paths intact:

- `app/core/`
  - Purpose: shared config, environment settings, API/version constants
- `app/models/`
  - Purpose: Pydantic request/response/domain models
- `app/engine/`
  - Purpose: deterministic evaluator/business logic engine
- `app/db/`
  - Purpose: SQLite integration, repository layer, persistence adapters
- `app/llm/`
  - Purpose: LLM client wrapper(s), narration schemas, model I/O contracts

## Suggested Near-Term Growth Pattern
1. Keep FastAPI app creation in `app/main.py`.
2. Continue adding domain routers in `app/api/v1/`.
3. Move shared settings/version values into `app/core/`.
4. Define typed payloads in `app/models/`.
5. Place deterministic decision logic in `app/engine/`.
6. Add persistence concerns in `app/db/`.
7. Isolate LLM-facing integrations in `app/llm/`.
