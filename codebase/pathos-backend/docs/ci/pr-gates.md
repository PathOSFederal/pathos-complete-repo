# PR Gates for `develop`

This repository expects branch protection on `develop` with **required status checks** enabled.

Required checks:
- `CI / quality-gates`
  - `poetry run ruff check .`
  - `poetry run mypy .`
  - `poetry run pytest -q` (coverage gate enforced by pytest config: `--cov-fail-under=90`)
  - OpenAPI contract drift gate:
    - `poetry run python scripts/export_openapi.py`
    - `git diff --exit-code artifacts/contracts/openapi.json`
  - Migration file sanity gate:
    - migration files must follow `NNN_description.sql`
    - migration numbers must be contiguous
    - migration SQL files must not be empty

## Run locally before opening a PR

```bash
poetry run ruff check .
poetry run mypy .
poetry run pytest -q
poetry run python scripts/export_openapi.py
git diff --exit-code artifacts/contracts/openapi.json
```

## Contract drift meaning and fix

Contract drift means API behavior changed but `artifacts/contracts/openapi.json` was not refreshed.

Fix:
1. Run `poetry run python scripts/export_openapi.py`
2. Review `artifacts/contracts/openapi.json`
3. Include the updated contract file in the PR
