# Day XX — Desktop /jobs/search IPC Wiring

## Summary
This change wires PathOS Desktop Explore search to backend `/api/v1/jobs/search` through the Electron trust boundary:
- renderer -> preload (`window.pathosBackend.searchJobs`) -> main IPC (`backend:jobsSearch`) -> main backend client (`searchJobs`).

## Why
Renderer must not call backend directly or handle backend secrets. Main process remains the network and secret boundary.

## Files
- `src/backend-client.js`
- `src/main.js`
- `src/preload.js`
- `src/renderer/renderer.js`
- `src/renderer/types/window.d.ts`
- `tests/backend-client.result.test.mjs`

## Validation
- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test`: blocked by environment (`spawn EPERM`)
- `pnpm build`: blocked by environment (`spawn EPERM`)
