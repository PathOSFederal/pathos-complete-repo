# Command Reference

## Assumptions

- Node: use repo default (no `engines` or `.nvmrc` present).
- Installer: `pnpm dist` builds Windows-only (NSIS).

## Tests location rule

All tests must live under `tests/**`.
Do not add tests under `src/**`.

## Core checks

- `pnpm lint`  
  Runs ESLint across the repo. Fails on lint errors.
- `pnpm typecheck`  
  Runs TypeScript in JS-checking mode using project references (main, preload, renderer). No files are emitted.
- `pnpm typecheck:watch`  
  Runs TypeScript in watch mode for faster iteration.
- `pnpm test`  
  Runs the Vitest suite in `tests/**`.

## Builds

- `pnpm build`  
  Builds an unpacked Electron app via `electron-builder --dir`. Output goes to `release/` (for Windows, `release/win-unpacked`).
- `pnpm dist`  
  Produces the installer (NSIS) using `electron-builder --win nsis`.
- `pnpm package`  
  Alias for `pnpm dist` (installer packaging).

## CI-style sequence

Run these in order to fail fast:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
