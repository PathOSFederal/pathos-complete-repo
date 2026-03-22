# Day 64 — Workspace Focus Mode v1 (Slice A) + Rollback/Stabilization

## What changed (stabilization run)
- **Single Focus toggle:** Moved from a fixed bar above the app shell into a **workbench global bar** that is the first row of the main content. The toggle sits next to the view status (e.g. “Read-only”, “Local list”) and **persists in the same place on every route** (Dashboard, USAJOBS, Explore Careers, Alerts, etc.).
- **PathAdvisor Overview/Focus removed:** The “Overview | Focus” toggle in the PathAdvisor header was removed everywhere. PathAdvisor keeps New/Clear/Export and other controls.
- **Icon-based left nav in Focus Mode:** Replaced letter placeholders (D, U, E, A, R, L, B, S) with **inline SVG icons** (dashboard grid, external link, compass, bell, document, list, shield, settings). Icons use a uniform 20×20 box and are aligned (including shield and settings).
- **No duplicate controls:** Removed the standalone workspace-focus-bar; no duplicate Focus/bell/“Open in browser” in global chrome. “Open in browser” remains only in the embedded USAJOBS toolbar.
- **No orange bar:** Focus indicator is a subtle pill/badge (“Focus Mode Active”) when on; no full-width top bar.
- **Nav remains clickable** in Focus Mode (pointer-events unchanged; PathAdvisor-only `is-focus-mode` rules that dimmed nav were removed).

## Why it changed
- To restore the intended “good” Focus layout: one stable toggle, icon nav, no drift or duplicate UI, and nav that stays usable.

## What users will notice
- **Focus Mode** button, **Active** pill, and **Bell/Alerts** in a **single top bar** (workbench-global-bar) at the top of the main content, same position on all pages. No Read-only tag; no duplicate status or Bell per page.
- With Focus on: left nav shows **icons** (not letters), aligned; “Focus Mode Active” pill appears; layout persists across navigation.
- With Focus off: standard layout. Exiting Focus is done by toggling the same button off (no separate “Exit Focus” button).
- PathAdvisor no longer shows “Overview | Focus”.

## What did NOT change (Slice A)
- Workspace focus store (localStorage, toggle behavior).
- Recent Activity layout and behavior.
- No keyboard shortcut yet (planned for Slice B).
- No compact advisor strip.
- No decision overlays or detached surfaces work.
