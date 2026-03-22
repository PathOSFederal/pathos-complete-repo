# PathOS Desktop (Day 47)

Minimal Electron shell that opens USAJOBS in a desktop window.

## What this repo is
- A dedicated desktop repo for a trust-first, desktop-first shell.
- A minimal Electron app that loads `https://www.usajobs.gov/`.
- A reproducible Windows NSIS installer build via `electron-builder`.

## What this repo is not
- No PathAdvisor features or resume logic.
- No automation, autofill, submit, or DOM scraping.
- No UI polish or updater implementation beyond placeholders.

## Trust boundaries (non-negotiable)
- USAJOBS is loaded unmodified and authoritative.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- `preload.js` is intentionally empty (no DOM access or injection).

## Development
Requires `pnpm`.

```bash
pnpm install
pnpm dev
```

## Build Windows installer (NSIS)
Run the build from Windows PowerShell (preferred for a local `.exe`):

```powershell
pnpm install
pnpm dist
```

Installer output directory:
- `release/` (look for `PathOS Desktop Setup *.exe`)

## Optional CI build
There is an optional GitHub Actions workflow to build a Windows installer
on `windows-latest` and upload the `.exe` as a CI artifact.
