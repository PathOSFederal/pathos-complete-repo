# Local Compose Deployment (Production Shape)

This backend is deployed as one image with two runtime commands:

- API: `poetry run uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000`
- Worker: `poetry run python -m app.worker`
- OpenAPI export: `poetry run python scripts/export_openapi.py`

The API command uses Uvicorn factory mode so importing `app.main` does not create the app at import time.
This keeps startup validation tied to actual runtime startup and allows OpenAPI export tooling to build the app in `openapi` mode without requiring runtime USAJOBS secrets.

Repo artifacts added for this shape:

- `Dockerfile`
- `compose.yaml`
- `.env.example`

## Required Environment Variables

- `PATHOS_DB_PATH`
- `PATHOS_ENV`
- `USAJOBS_API_KEY`
- `USAJOBS_USER_AGENT`
- `PATHOS_WORKER_INTERVAL_SECONDS` (worker loop interval in seconds)

Both API and worker run strict startup checks. They validate configuration, database connectivity, and migration readiness before serving requests or processing alert runs.

Additional API startup guardrails:

- `PATHOS_API_KEYS` is required for non-local API startup (`staging`, `production`, `unknown`)
- short placeholder API keys are rejected for non-local API startup
- placeholder intelligence and email-delivery paths are not allowed outside `local`, `dev`, `test`, and `ci`

## Health Endpoints

- `GET /health/live`
  - Liveness probe only.
  - Returns `200` when process and router are running.
  - Does not require database access.
- `GET /health/ready`
  - Readiness probe.
  - Returns `200` only when configuration is valid, database is reachable, and migrations are ready.
  - Returns canonical deterministic error envelope when not ready.

Backward-compatible API-prefixed routes are also available under `/api/v1/health/live` and `/api/v1/health/ready`.

## Network Model

- USAJOBS is ingestion-only and is called from backend adapter code.
- Clients do not call USAJOBS directly.
- Database should remain private to backend containers.
- HTTPS termination and reverse proxy handling are outside this repository.

## Compose Usage

1. Copy `.env.example` to `.env`.
2. Fill in real values for `PATHOS_API_KEYS`, `USAJOBS_API_KEY`, and `USAJOBS_USER_AGENT`.
3. Start the stack:

```bash
docker compose up --build
```
