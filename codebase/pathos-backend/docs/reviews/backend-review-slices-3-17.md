# Backend Review Harness (Slices 3-17)

## Local Quality Gate
Run all checks from repo root:

```bash
poetry run ruff check .
poetry run mypy app tests
poetry run pytest -q
poetry run pytest -q --cov=app --cov-branch --cov-report=term-missing --cov-fail-under=90
```

## OpenAPI Determinism Workflow
1. Export current contract snapshot:

```bash
poetry run python scripts/export_openapi.py
```

2. Validate deterministic snapshot regression:

```bash
poetry run pytest -q tests/test_openapi_snapshot_regression.py
```

3. If routes/contracts intentionally changed, regenerate `artifacts/contracts/openapi.json` and re-run tests.

## Must-Fix vs Nice-to-Have
- Must-fix:
  - Any failing quality gate (ruff, mypy, pytest, coverage threshold)
  - Any deterministic regression in evaluator outputs or OpenAPI snapshot
  - Any ErrorResponse/requestId contract break in error paths
  - Any auth/rate-limit/cors trust boundary regression
- Nice-to-have:
  - Test readability improvements
  - Additional non-blocking assertions on optional response metadata
  - Extra fixture variations that do not close known risk gaps

## Area-to-Test Category Mapping
- Auth/API key guard:
  - Use Case, Misuse, Equivalence, Positive, Negative, Security
- Request-ID + ErrorResponse middleware:
  - Use Case, Equivalence, Negative, Security, Regression
- CORS and rate limiting middleware:
  - Boundary, Equivalence, Misuse, Security, Regression
- Advisor deterministic engine + narration fallback:
  - Use Case, Positive, Negative, Edge Case, Regression
- Threads + summaries:
  - Use Case, Boundary, Edge Case, Misuse, Security
- Audit/export/delete/wipe:
  - Use Case, Misuse, Boundary, Negative, Security, Regression
