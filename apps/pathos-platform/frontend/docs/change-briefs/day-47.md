# Day 47 — Desktop Dev + QA Loops

**Date:** January 23, 2026  
**Type:** Workflow Enablement

---

## What Changed

- Added a realtime desktop dev loop that points Electron at the local web app.
- Added a packaged QA loop that runs the unpacked Windows app without installing.
- Documented the three desktop modes (dev, QA, installer) with exact commands.

---

## Why This Matters

The desktop workflow is now faster to iterate on and easier to validate without reinstalling. This shortens feedback loops and keeps the installer distribution path consistent.

---

## What Users Will Notice

- Faster local desktop iteration (hot reload via standard browser refresh).
- A clear way to run the packaged app directly for QA.
- Clearer docs for the full desktop lifecycle.

---

## Trust + OPSEC Clarity

- The installer download path remains `public/downloads/pathos-setup.exe`.
- No new automation behavior is introduced.

---

*This change is workflow and documentation only.*
