# CI Discipline Hardening v1

Recommended branch protection for `develop`:
- Require status checks to pass before merge.
- Require branches to be up to date before merge.
- Require at least one reviewer approval.

Required checks (minimum):
- `CI / quality-gates` (ruff + mypy + pytest + coverage gate + OpenAPI snapshot drift check)

Why:
- Keeps push and pull-request validation behavior aligned.
- Prevents “green PR but broken merge” drift from contract snapshot differences.
- Maintains deterministic backend/API behavior with reproducible contracts.
