# ARCHIVED: USAJOBS BrowserView Spike (Day 45)

This directory contains the original Electron BrowserView spike code from Day 45.
It is **not** the active desktop runtime. It is preserved for reference only.

## Status: DISABLED by default

The active desktop experience is in `apps/desktop/electron/main.ts` and uses:
- Shared AppShell + screens from `@pathos/ui`
- React Router for in-app navigation
- External browser for USAJOBS (no embedding, no scraping, no credentials)

## To run this experiment (not recommended)

This spike required the old Next.js-based renderer and is not compatible with
the current Vite-based desktop renderer. If you need to revisit this code,
read the original README in this directory.
