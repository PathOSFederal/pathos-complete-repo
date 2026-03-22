# Hardening Checklist

Use this lane only after iteration freeze. The goal is merge readiness, not more feature exploration.

## Preconditions
- [ ] Iteration freeze has been declared.
- [ ] Scope is stable and bounded.
- [ ] Any known gaps are documented, deferred, or fixed.

## Validation
- [ ] Run typecheck.
- [ ] Run build.
- [ ] Run tests if the repo or changed area has relevant tests.
- [ ] Run targeted tests for the changed area when available.
- [ ] Perform runtime/manual validation for the user-visible flow.
- [ ] Confirm no obvious regressions in touched areas.

## Documentation
- [ ] Create or update a change brief from `docs/change-briefs/_template.md`.
- [ ] Update task notes if actual scope differs from planned scope.
- [ ] Add or update merge notes if this change needs reviewer context.

## Review Summary
- [ ] Summarize files changed.
- [ ] Summarize validations performed.
- [ ] Summarize risks, tradeoffs, and follow-ups.
- [ ] Prepare a concise PR summary in plain English.

## Final Gate
- [ ] Confirm the change is implementation-complete.
- [ ] Confirm hardening checks are complete or intentionally skipped with reasons.
- [ ] Confirm final approval before commit/push.
- [ ] Do not commit or push unless explicitly requested.

## Suggested Command
- `./scripts/harden.ps1`
