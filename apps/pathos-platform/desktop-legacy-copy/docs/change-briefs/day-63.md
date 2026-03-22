# Day 63 Change Brief

## Summary
Recent Activity now defaults to collapsed on first load when no preference exists. Activity row actions layout restored: no oversized full-width orange bar; buttons stay in right rail.

## What changed (non-technical)
- Recent Activity starts collapsed until a user expands it.
- Activity row action buttons (View / Add to Resume & Career / Set as current) stay compact in a right-side rail; no giant full-row bar.

## Manual smoke tests
- Not run (requires manual validation).

## Nav hover overlap fix (this run)
- **Bug:** With Recent Activity overlay visible, hovering left-nav items (e.g. Benefits & Compensation) caused nav hover pill/tooltip/background to paint above the overlay.
- **Fix:** Clipped nav hover visuals to the nav rail: added `overflow: hidden` to `.nav-rail` in `src/renderer/styles.css`. Border-radius unchanged (already on same element).
- **Selectors changed:** `.nav-rail` — added comment block + `overflow: hidden`.
