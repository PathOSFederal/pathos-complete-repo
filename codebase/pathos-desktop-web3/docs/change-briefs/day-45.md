# Day 45 — Desktop Shell Spike v1 (Electron)

## What changed
- Added a CommonJS preload bridge (`electron/preload.cjs`) that exposes only `ping()` and `loadUsajobs()`.
- Wired the Electron main process to the new preload and added IPC handlers for ping + BrowserView attach.
- Updated the Guided USAJOBS desktop workspace to detect `window.pathosDesktop` and call `loadUsajobs()`.
- Updated the desktop shell readme to document the minimal bridge surface.
- Fixed Electron main-process import to treat `DesktopShellBounds` as type-only to avoid runtime ESM export errors.
- Added Ask PathAdvisor mode with click-to-explain microcopy in the USAJOBS surface.
- Added a pixel-only screenshot capture flow (IPC + preload + renderer preview) with an ephemeral thumbnail and clear action.
- Added deterministic, context-based explanation copy with a simple state selector (no LLM, no DOM).
- Cleaned up lint errors by removing `any` window casts and dropping the TS preload shim in `preload.cjs`.
- Addressed remaining lint warnings (unused vars, hook deps, and img rule).

## Why it changed
We need the preload bridge to load reliably in Electron (no TS preload) so the renderer can ask the main process to attach the USAJOBS BrowserView while keeping a strict trust boundary.

## Notes for reviewers
- The UI intentionally reserves a left region for the BrowserView; Electron sizes it with fixed layout math.
- Electron defaults are hardened: context isolation, no node integration, and minimal IPC surface.
- Manual Electron verification is still pending (desktop dev command timed out in this run).