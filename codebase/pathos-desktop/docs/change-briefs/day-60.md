# Day 60 – Job Search ↔ Resume & Career Context Bridging (v1)

## Summary
- Added a shared ActiveJobContext store to track the active Job Search selection.
- Wired Explore role selection to set/clear the active job context.
- Surfaced passive awareness copy in Resume & Career and PathAdvisor.
- Added unit tests for ActiveJobContext switching/clearing behavior.
- Moved Vitest coverage config under `test` to match typing.
- Added resume-career-store unit coverage to meet per-file thresholds.
- Covered a missing renderer diagnostics branch for coverage gates.
- Standardized local scripts for linting, syntax checks, and builds.

## Non-goals honored
- No resume mutations or auto-linking.
- No new prompts, modals, or navigation changes.
- No backend or API changes.

## Tests
- `pnpm test`
- `pnpm test:coverage`

## How to run checks locally
- `pnpm lint`
- `pnpm typecheck` (JavaScript syntax validation, not TypeScript)
- `pnpm build` (unpacked folder)
- `pnpm package` (NSIS installer)
