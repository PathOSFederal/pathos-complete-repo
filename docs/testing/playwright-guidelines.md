# Playwright Guidelines

Use Playwright to gain runtime confidence when browser behavior is central to the risk.

## Best Uses

Playwright is a strong fit for:
- route and navigation checks
- shell and layout wiring across pages
- hydration-sensitive UI
- create/save/apply/delete flows that must appear elsewhere
- persistence checks after refresh
- critical end-to-end user journeys

## When To Prefer Playwright

Prefer Playwright over lower-level tests when:
- the main question is whether the app works in the browser
- multiple components or routes must work together
- route guards, loaders, shells, or persisted state are involved
- manual repetition would be error-prone

## When Not To Reach For Playwright First

Do not start with Playwright when:
- the risk is isolated business logic better covered by unit tests
- the change is a pure backend change with no browser surface
- a small deterministic integration test gives the same confidence faster

## Execution Rules

- Keep scenarios focused on the changed user flow.
- Prefer a few stable flows over a wide but shallow script set.
- Assert observable outcomes, not implementation details.
- Include refresh, navigation, and cross-screen checks when persistence or shell behavior matters.
- Capture console or runtime errors when the workflow touches hydration or client initialization.

## Suggested Playwright Targets

Consider Playwright when the task changes:
- app shell structure
- page-to-page routing
- dialogs, drawers, or nested interactive elements
- login/session or guarded routes
- saved items, alerts, searches, settings, or other persisted UI flows
- anything that previously failed only in the browser runtime

## Reporting

When Playwright is used, report:
- scenarios executed
- environment or command used
- pass/fail outcome
- any skipped coverage
- remaining runtime risk
