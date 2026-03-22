# Day 60 — Dashboard Career Readiness metrics v1

**Branch:** `feature/day-60-dashboard-readiness-metrics-v1`  
**Goal:** Update Dashboard so it reflects the new Career Readiness system (metrics + gaps + action link), keeping trust-first UX and local-only posture. Option A: consistent Briefing tile height, compact Readiness tile, Details popover for gaps + next best action.

## Summary

- **Briefing tiles simplified:** Context (Target, Local-only, Updated) moved into Details popover; primary metrics enlarged (26–28px); CTAs standardized across all four tiles; duplicate Readiness header icon removed (exactly one Details icon per tile with details).
- **Primary metrics emphasis:** Primary metrics emphasis increased for scan-ability. Briefing row tiles use a shared PrimaryMetric style (value: one step larger + bold; secondary label and status: muted/smaller); Readiness shows score bold and "/100" muted on one line; deltas (e.g. "+1 this week") use font-medium and success token; single shared CTA style (muted accent, hover underline) for briefing tile CTAs.
- **Briefing tile height contract:** All four Briefing tiles (Saved Jobs, Tracked Apps, Readiness, Next Milestone) use a shared `BRIEFING_TILE_MIN_H` (160px) so one tile cannot expand the row. Same min-height and visual alignment; no vertical stretching or empty whitespace in other tiles.
- **Shared readiness summary:** `getCareerReadinessSummary()` and `CareerReadinessSummary` type in `careerReadinessMockData.ts` provide a single source of truth for score, label, `updatedAt`, top gaps, and next best action. Dashboard and Today's Focus hero use this.
- **Readiness tile (compact):** Tile shows only: score (e.g. 74/100), label (e.g. "Competitive with improvements"), target ("Target: General readiness"), status line ("Local-only • Updated 2 min ago"), CTA "Open Career Readiness". Inline "Top gaps" list removed from the tile.
- **Details popover:** Small "Details" affordance (Info icon, aria-label "Readiness details") on the Readiness tile opens a Radix Popover with: header "Readiness details", next best action line, "Top gaps" section (3 items with name + impact), footer "Computed locally from profile + resume evidence." Popover trigger is keyboard reachable; accessibility: aria-label on icon-only button.
- **Do now / Next best move:** Today's Focus hero copy and CTA are driven by the readiness summary; handleDoNow appends `#action-plan` when navigating to Career Readiness; Career Readiness screen has `id="action-plan"` and scroll-into-view on hash.
- **Tests:** DashboardScreen.test.tsx (Readiness tile, 74/100, "Open Career Readiness", no inline Top gaps, Details trigger); careerReadinessMockData.test.ts; buildDashboardViewModel.test.ts (focus-hero uses CAREER_READINESS route).

## Gates

- **pnpm lint:** 0 errors, 26 warnings (warnings allowed).
- **pnpm -r typecheck:** Pass.
- **pnpm test:** 765 tests passed.
- **pnpm build:** Pass.

## Patch artifacts

- **Cumulative:** `artifacts/day-60.patch` (main → working tree; develop not in repo).
- **Incremental:** `artifacts/day-60-this-run.patch` (HEAD → working tree).

## Human Simulation Gate

| Item | Value |
|------|--------|
| Required | No |
| Triggers hit | none |
| Why | UI and navigation changes; no new Create/Save/Apply/Delete, no store/persistence shape change. |

## AI Acceptance Checklist

| Item | Value |
|------|--------|
| Flow | Dashboard Briefing shows Readiness tile from summary; hero shows next best action; both CTAs go to Career Readiness (tile → page, hero → page#action-plan). |
| Store(s) | dashboardHeroDoNowStore (existing; hero label/route set from view model). |
| Storage key(s) | none |
| Failure mode | If getCareerReadinessSummary fails, tile/hero could show empty or fallback; mock is in-memory. |
| How tested | Unit tests for summary, view model route, Dashboard render. Manual: open Dashboard, click Readiness tile and hero CTA, confirm Career Readiness and Action Plan scroll. |
