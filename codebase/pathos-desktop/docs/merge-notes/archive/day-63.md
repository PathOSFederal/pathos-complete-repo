# Day 63 — Activity Log Intelligence & Cross-Surface Actions v1

## Objective
- Make Activity Log the authoritative coordination layer for job interactions and resume actions.

## Day 63 Final UX fixes
- Raised the Activity Log overlay z-index so nav hover overlays cannot cover the Recent Activity header.
- Added a Current Job indicator pill in Activity Log rows and disabled Set as current for the active job.
- Added helper coverage to verify the CURRENT indicator state.
- Added user-action toast emission for badge increments (add to resume, set current, export).

## Files touched (planned)
- `src/renderer/job-selection-store.js` (activity log model, persistence, helpers)
- `src/renderer/renderer.js` (Activity Log view routing + layout mode + toast wiring)
- `src/renderer/index.html` (Activity Log view shell + toast anchor)
- `src/renderer/styles.css` (Activity Log layout + toast placement)
- `src/renderer/stores/fallback-stores.js` (fallback methods for new log APIs)
- `tests/renderer/job-selection-store.test.js` (Activity Log logic coverage)
- `docs/merge-notes-day-63.md` (archive prior merge-notes)
- `docs/merge-notes/current.md` (run log + checklist)

## Manual test checklist
- [ ] Expand Recent Activity → hover left nav → no overlay overlap observed (not run)
- [ ] Click Set as current → CURRENT badge shows on that row (not run)
- [ ] Set a different row as current → badge moves (not run)
- [ ] CURRENT badge appears in both Recent Activity and Activity Log views (not run)
- [ ] Add to Resume & Career → badge increments + top-center toast appears (not run)
- [ ] Set as current → badge increments (if any) + top-center toast appears (not run)
- [ ] Export for USAJOBS → badge increments + top-center toast appears (not run)
- [ ] Select job → Activity Log shows it (status selected)
- [ ] View job → Activity Log shows it (viewed) and upgrades appropriately
- [ ] Add to Resume & Career from Activity Log → Resume & Career shows job
- [ ] Export for USAJOBS → Activity Log gets an entry, badge increments
- [ ] Open Activity Log → badge clears
- [ ] Refresh app → Activity Log + badge + promoted jobs persist
- [ ] Delete All Local Data → all cleared

## Automated tests added/updated
- `tests/renderer/job-selection-store.test.js`
- `tests/renderer/activity-current-indicator.test.js`
- `tests/renderer/badge-toast.test.js`
- Coverage summary (pnpm test:coverage): All files 99.43% stmts / 92.26% branches / 100% funcs / 99.42% lines; renderer/job-selection-store 100% stmts/lines, 90.27% branches.

## Known follow-ups (future days)
- Manual Activity Log flow simulation pending (Human Simulation Gate).

## Run logs
- `pnpm lint`: not run (pending).
- `pnpm test`: not run (pending).
- `pnpm test:coverage`: not run (pending).
- `pnpm build`: not run (pending).
- Patch artifacts:
  - `artifacts/day-63.patch`: 296669 bytes.
  - `artifacts/day-63-run.patch`: 296669 bytes.

## Desktop Backend Wiring — /jobs/search (this run)

### What changed
- Added `searchJobs(payload)` to `src/backend-client.js` (POST `/jobs/search`, normalized payload, standardized `{ ok, data|error }` result).
- Added IPC handler in `src/main.js`:
  - `backend:jobsSearch` -> `backendClient.searchJobs(payload)`.
- Added preload bridge method in active preload `src/preload.js`:
  - `window.pathosBackend.searchJobs(payload)`.
- Wired Explore submit path in `src/renderer/renderer.js` to call backend search through bridge and render existing Explore UI cards with normalized backend rows.
- Added a dev-only smoke action button in Activity Log backend dev controls:
  - `Test Backend Job Search`.
- Added typings in `src/renderer/types/window.d.ts`.
- Added backend client tests in `tests/backend-client.result.test.mjs`.

### Commands run
- `node -c src/renderer/renderer.js` -> pass
- `pnpm ci:validate` -> fail (`Command "ci:validate" not found`)
- `pnpm lint` -> pass
- `pnpm typecheck` -> pass
- `pnpm test` -> fail (`spawn EPERM` in this environment)
- `pnpm build` -> fail (`spawn EPERM` in this environment)

### Patch artifacts
- `artifacts/day-XX.patch`
- `artifacts/day-XX-this-run.patch`
