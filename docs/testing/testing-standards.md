# Testing Standards

This file is the canonical validation and testing doctrine for Codex hardening prompts.

## Testing Priorities

The goal is confidence, not test count. Choose the smallest validation set that meaningfully reduces risk.

The main test categories are:
- static validation: lint, typecheck, schema/codegen checks
- unit tests: business logic, parsers, mappers, utilities with real decision logic
- integration tests: API boundaries, stores, persistence, database flows, multi-module behavior
- end-to-end or Playwright checks: route transitions, shell behavior, hydration-sensitive UI, persistence flows, critical user journeys
- manual runtime validation: focused browser or app checks where automation is unnecessary or too expensive for the risk

## Expectations By Change Type

### UI or layout change

Usually sufficient:
- build or typecheck if the repo expects it
- visual/runtime validation of the affected screen
- Playwright or manual verification for navigation, route shell, responsive states, or hydration-sensitive behavior

Automated tests are optional when the change is cosmetic and does not alter behavior.

### Frontend behavior change

Expected:
- typecheck and build when available
- automated tests for meaningful client logic, state transitions, persistence, or bug regressions
- Playwright or manual validation when browser behavior is part of the risk

### Backend logic change

Expected:
- lint/typecheck/test for the affected backend
- automated coverage for business logic, handlers, validation, persistence, and regression cases
- integration coverage when multiple layers or contracts are involved

### Fullstack feature change

Expected:
- validation on both sides of the contract
- automated tests where logic is stable enough to encode
- runtime validation for the end-to-end feature path
- Playwright when navigation, route wiring, persistence, or UI/runtime integration is part of the risk

## When Playwright Or Manual Validation Is Enough

Playwright or manual runtime validation may be enough when:
- the change is primarily route wiring, shell composition, layout, or navigation
- the main risk is browser runtime behavior rather than pure logic
- the workflow is short, deterministic, and expensive to unit test meaningfully
- the change is cosmetic but still needs runtime confidence

Manual-only validation is acceptable only when automated coverage would add little value or is not feasible within scope. Record that choice explicitly.

## When Automated Tests Are Expected

Automated tests are expected when the change introduces or modifies:
- business rules or branching logic
- bug-prone transformations or adapters
- persistence or store behavior
- API or backend validation behavior
- contract-sensitive fullstack flows
- fixes for regressions that can be reproduced deterministically

## Regression Doctrine

- Every important bug fix should get a regression test when practical.
- Test observable behavior, not internal implementation details.
- Prefer focused tests that cover real failure modes.
- Avoid adding broad or brittle tests that do not improve confidence.

## Validation Reporting Rules For Codex

Codex must report:
- commands actually run
- what passed
- what failed
- what was not run
- why any step was skipped
- remaining risks or blind spots
- whether the change is merge-ready, conditionally ready, or blocked

## Manual And Runtime Evidence

When validation depends on runtime behavior, record:
- environment used
- steps performed
- expected result
- actual result
- any persistence keys or cross-screen checks reviewed
- whether console/runtime errors were observed

## Playwright Pointer

For browser-runtime guidance, use `docs/testing/playwright-guidelines.md` alongside this file.
