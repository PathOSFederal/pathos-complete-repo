# Day 56 – Desktop Testing Foundation (Vitest Setup)

## Objective
- Establish a stable Vitest baseline with coverage and smoke tests.

## Changes
- Added Vitest + coverage dependencies and config.
- Added smoke tests for pure utilities.
- Added test scripts for run/watch/coverage.
- Converted smoke tests to ESM for Vitest compatibility.

## Commands run
- See `docs/merge-notes/current.md` for the detailed command log.

## Testing results
- Pending: run `pnpm test` and `pnpm test:coverage`.

## Files changed
- `package.json`
- `pnpm-lock.yaml`
- `vitest.config.ts`
- `tests/benefits-tools.test.mjs`
- `tests/usajobs-navigation.test.mjs`
- `docs/change-briefs/day-56.md`
- `docs/merge-notes/current.md`
- `docs/merge-notes/archive/day-55.md`

## Patch artifacts
- Pending: run patch generation commands in `docs/merge-notes/current.md`.

## Follow-ups / risks
- Renderer `src/renderer/*.test.js` uses `node:test` and is not yet in Vitest.

## Day 56 – Test Coverage Expansion (Continuation)

### Test Coverage Plan
- Bucket A (must-test): pure logic modules (parsers/formatters/validators/mappers/calculators/rules), shared libs used across layers, reducers/selectors/computed state.
- Bucket B (should-test): boundary code via mocks (IPC wrappers, filesystem adapters, HTTP clients, config resolution, persistence adapters, orchestrator/service modules that make decisions).
- Bucket C (skip): types-only files, barrel index re-exports, constants-only files (unless behavior depends on them), build/tool configs, generated files, thin pass-through wiring modules, UI layout-only components.

### Repo Areas
- Main process: `src/main.js`, `src/usajobs-navigation.js`
- Preload/bridge: `src/preload.js`, `src/preload-benefits-popout.js`
- Renderer: `src/renderer/*`
- Shared/lib/utils/domain: renderer UMD helpers (Benefits tools, embedded bar helpers, conversation store, Explore PathOS logic)

### Source File Classification + Planned Tests
| Source file | Bucket | Planned test file path | Notes |
| --- | --- | --- | --- |
| `src/main.js` | B | `tests/main-helpers.test.mjs` | Extract + test pure helpers (sanitizers, owner validation, URL allowlist). Keep Electron handlers thin. |
| `src/main-helpers.js` | A | `tests/main-helpers.test.mjs` | Pure main-process sanitizers + validators. |
| `src/electron-bridge.js` | C | n/a | Thin pass-through to Electron imports for preloads. |
| `src/preload.js` | C | n/a | Thin wrapper that delegates to `preload-bridge`. |
| `src/preload-bridge.js` | B | `tests/preload.test.mjs` | Injected bridge; assert IPC wiring (`send`, `invoke`, `on`) and guards. |
| `src/preload-benefits-popout.js` | C | n/a | Thin wrapper that delegates to `preload-benefits-bridge`. |
| `src/preload-benefits-bridge.js` | B | `tests/preload-benefits-popout.test.mjs` | Injected bridge; assert intent-only IPC calls. |
| `src/usajobs-navigation.js` | A | `tests/usajobs-navigation.test.mjs` | Pure navigation handler; add edge cases for back/forward/refresh + external URL guard. |
| `src/renderer/benefits-tools.js` | A | `tests/benefits-tools.test.mjs` | Pure metadata helpers; expand tests for list/grouping filters. |
| `src/renderer/conversation-store.js` | A | `tests/conversation-store.test.mjs` | Pure state logic; table-driven sanitizer + state mutation helpers. |
| `src/renderer/embedded-bar.js` | A | `tests/embedded-bar.test.mjs` | Pure helpers; table-driven URL normalization + button state toggles. |
| `src/renderer/explore-pathos.js` | A | `tests/explore-pathos.test.mjs` | Pure logic; intent token parsing + recommendations shaping. |
| `src/renderer/alerts-popover.js` | C | n/a | UI-only DOM rendering + event wiring; minimal logic, covered by manual UI checks. |
| `src/renderer/benefits-popout.js` | C | n/a | Heavy DOM + webview + IPC + timing; requires integration/E2E to be meaningful. |
| `src/renderer/renderer.js` | C | n/a | Monolithic UI/DOM/IPC wiring; not isolated for unit testing. |
| `src/renderer/alerts-popover.html` | C | n/a | Static markup asset; layout-only. |
| `src/renderer/benefits-popout.html` | C | n/a | Static markup asset; layout-only. |
| `src/renderer/index.html` | C | n/a | Static markup asset; layout-only. |
| `src/renderer/alerts-popover.css` | C | n/a | Styling-only. |
| `src/renderer/styles.css` | C | n/a | Styling-only. |
| `src/renderer/styles/pathos-theme.css` | C | n/a | Styling-only. |
| `src/renderer/styles/pathos-web-theme.tokens.css` | C | n/a | Styling-only. |

### Commands (to run)
- `pnpm test`
- `pnpm test:coverage`

### Patch Artifacts (to run)
- `mkdir -p artifacts`
- `git diff develop...HEAD > artifacts/day-56.patch`
- `git diff > artifacts/day-56-this-run.patch`
- `ls -lh artifacts/day-56.patch artifacts/day-56-this-run.patch`

---

# Day 58 – Job Search Mental Model Clarification (Explicit Hierarchy)

## Objective
- Clarify that USAJOBS is the official source and PathOS provides guided reasoning.

## Changes
- Updated nav labels to name USAJOBS as official listings and PathOS as guided exploration.
- Added helper lines to the USAJOBS and Explore Careers views to explain their roles.
- Added a dashboard line reinforcing PathOS analysis of USAJOBS listings.

## Follow-ups / risks
- TODO (future day): Modularize `src/renderer/renderer.js` into smaller testable modules to unlock higher coverage targets.

## Commands run
- None.

## Testing results
- Not run (copy-only changes).

## Files changed
- `src/renderer/index.html`
- `src/renderer/explore-pathos.markup.test.js`
- `docs/change-briefs/day-58.md`
- `docs/merge-notes/current.md`
- `docs/merge-notes.md`

## Patch artifacts
- `git diff develop...HEAD > artifacts/day-58.patch`
- `git diff > artifacts/day-58-this-run.patch`
