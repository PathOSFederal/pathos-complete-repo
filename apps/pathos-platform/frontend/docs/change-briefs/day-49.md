# Day 49 — ModuleCard and Analyst Workspace Polish

**Date:** February 26, 2026  
**Type:** UI Enhancement

---

## What Changed

The Dashboard and PathAdvisor rail now use a shared card style so the app feels like a clear, professional analyst workspace instead of flat stacked boxes. Cards have a consistent header, a subtle top highlight, and light shadow so sections are easy to scan.

### Dashboard

- **Unified card treatment**: Annual Value, Long-term Value, Assumptions, and Top Decision Drivers are each wrapped in the same card component.
- **Clear hierarchy**: Each block has a title bar, optional description, and body content with consistent padding and spacing.
- **No platform-specific code**: All of this lives in shared UI that works in both the web preview and the desktop app.

### PathAdvisor Rail

- **Framed sections**: The intro message and suggested prompts are now inside the same card style as the dashboard.
- **Prompt list**: Suggested prompts are a clear list with even row height, light separators, and a hover state so it’s obvious they’re clickable.

### Theme Tweaks

- **Surface separation**: Slight token tweaks so the app background, card surface, and input/chip level read as distinct layers.
- **Shadow token**: A dedicated elevation token is used for cards so shadows stay consistent and easy to adjust later.

---

## Why This Matters

**Before**: The dashboard and rail looked like a set of similar rectangles with little structure.

**After**: The same card pattern is used everywhere. Titles, optional subtitles, and content sit in a clear hierarchy, so the workspace feels intentional and easier to use.

---

## Technical Details

- New reusable **ModuleCard** component: header (optional icon, title, right action), optional subtitle, 1px top accent line, border, radius, and theme shadow.
- **ModuleCard** has two variants: default (more padding) and dense (tighter) for the rail.
- Theme: comment and token updates for surface hierarchy; added `--p-shadow-elev-1` for card elevation.
- PathAdvisor: message block and suggested prompts wrapped in ModuleCard (dense); prompt rows use `.pathos-prompt-row` with min-height and spacing.
- A small Vitest smoke test was added for ModuleCard rendering.

---

## User Impact

- **Easier to scan**: Sections are clearly separated and labeled.
- **More consistent**: The same card style appears on the dashboard and in the PathAdvisor rail.
- **Clearer actions**: Suggested prompts look like a designed list with obvious hover feedback.

---

*This change is frontend-only. No backend or data storage changes.*
