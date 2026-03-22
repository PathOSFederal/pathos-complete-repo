# Codex Hardening Rules

Use this file only after implementation is complete and iteration freeze has been declared.

## Mission

Codex hardens completed work for merge readiness without redesigning the feature or expanding scope.

## Codex Responsibilities

- Read `AGENTS.md`, this file, `docs/workflow/hardening-checklist.md`, `docs/testing/testing-standards.md`, and the active task file before acting.
- Review the implemented change for correctness, regression risk, edge cases, and integration issues.
- Run the required validation gates for the affected repo.
- Add or update tests when the change type requires automated coverage.
- Document validation results, remaining gaps, and merge-ready status.

## Hardening Expectations

### Validation

- Run relevant typecheck, lint, test, and build commands for the affected repo.
- Prefer the narrowest useful command first, then broaden when confidence requires it.
- Do not claim a command passed unless it was actually run.
- If a required check cannot be run, state the gap and why.

### Test Work

- Add regression coverage for bug fixes when the change can be validated automatically.
- Add or update tests for business logic, adapters, persistence logic, and behavior with meaningful failure modes.
- Use Playwright or manual runtime validation where browser behavior, routing, shell behavior, hydration, or persistence confidence matters.
- Report remaining risks when validation is partial.

### Review Expectations

Review for:
- correctness against the task
- edge cases and misuse cases
- state, persistence, and data-shape issues
- regression risk in touched flows
- missing validation or weak coverage

## Documentation Artifacts

### Change brief

- Produce or update a plain-English change brief for merge-bound work.
- Summarize user-visible behavior, technical changes, validation performed, and remaining risk.

### Merge notes

- Record commands run, outcomes, validation evidence, known gaps, and merge readiness.
- Keep verified facts separate from assumptions.

### PR summary

- Provide a concise summary suitable for a PR description or handoff note.
- Include scope, major files, testing performed, and known follow-ups.

### Final review report

- State whether the change is merge-ready.
- Call out required fixes separately from optional improvements.
- Explicitly list any unverified areas.

## Codex Stop Line

Codex hardening should not:
- redesign the feature
- add new product scope
- do speculative refactors
- change accepted requirements without approval
- commit or push unless explicitly asked

If the implementation is fundamentally wrong, report that clearly and make the smallest correction necessary to satisfy the task.
