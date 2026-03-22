# Day 61 — Job Search Job Match Snapshot v1

**Branch:** `feature/day-61-job-search-jobmatchsnapshot-v1`  
**Goal:** Create a clear, deterministic mapping between Career Readiness (person intelligence) and a selected job (job intelligence) in Job Search. Implement a local-only Job Match Snapshot v1, show it as a visible Match Breakdown, and make each dimension row interactive so users can drill into details in PathAdvisor.

## Summary

- **Match for this job:** The Job Search details panel (above tabs) shows a “Match for this job” section with a match level (Strong / Moderate / Stretch), a one-line summary using your readiness score (e.g. 74/100), and a **Match breakdown** with five dimensions (Target Alignment, Specialized Experience, Resume Evidence, Keywords Coverage, Leadership & Scope). Each dimension shows a status (Good / Mixed / Weak), a small bar, and a short “why” sentence.
- **Interactive Match Breakdown:** Each dimension row is clickable. Clicking a row opens a **dimension briefing** in the PathAdvisor rail with: what that dimension measures, your current signal, evidence found, evidence missing, and the fastest fix. A primary button (e.g. “Fix Resume Evidence (+6)” or “Improve Keywords Coverage (+4)”) takes you to Career Readiness with the Action Plan in focus. Hovering a row shows a tooltip: your score, the job’s emphasis for that dimension, and the gap.
- **What you’re missing:** A compact list of 2–5 actionable items (e.g. add quantified outcomes, mirror specialized experience phrasing, add keywords) so users know what to improve.
- **Primary blocker:** One line that either points to a missing readiness input, the main weak dimension for this job, or “None detected” with a nudge to improve the top gap.
- **Open Career Readiness CTA:** A single link/button: “Open Career Readiness: Fix &lt;top gap label&gt; (+&lt;impact&gt;)” that goes to Career Readiness with the Action Plan section in focus (#action-plan).
- **PathAdvisor rail:** When a job is selected, the rail shows Viewing: Job Search, insight bullets, and the next best action button. Clicking a Match Breakdown row opens a dedicated briefing for that dimension in the same rail, with a CTA to improve that dimension.
- **Local only:** All matching logic runs in the browser; no backend. The snapshot is computed from existing Career Readiness mock data and the selected job’s checklist/summary.

- **Option A polish:** Job list now shows match level/score instead of fit stars; match breakdown rows are clearly clickable (chevron, hover, focus-visible); match header clarifies readiness vs job match; single "Explain this match" entrypoint in details panel.
- **Job rows now show a left-edge match bar for scan-first navigation.** (Option A2: 2px bar by match level; selection is background-only.)
- **Mock jobs now show deterministic match score variety for demo/testing (audit-tagged).** (isMockJob + getDemoTargetMatchScore; snapshot override only for mock-js-*; audit.rulesFired includes demoMatchVariety and demoTargetScore.)

## Gates

- **pnpm lint:** Pass.
- **pnpm -r typecheck:** Pass.
- **pnpm test:** All tests passed (including JobSearchScreen and jobMatchSnapshot tests).
- **pnpm build:** Pass.
- **pnpm overlays:check:** Fails on pre-existing issues in ReadinessTrajectoryChart.tsx (not introduced by this change).

## Human Simulation Gate

| Item | Value |
|------|--------|
| Required | No |
| Triggers hit | none |
| Why | Read-only mapping and display; no new Create/Save/Apply/Delete, no store persistence shape change. |

## AI Acceptance Checklist

| Item | Value |
|------|--------|
| Flow | User selects a job → Job Match Snapshot is built from readiness mock + job → “Match for this job” panel and PathAdvisor rail show breakdown and CTA; CTA navigates to Career Readiness #action-plan. |
| Store(s) | pathAdvisorScreenOverridesStore (existing; rail content and onRailNextBestActionClick when job selected). |
| Storage key(s) | none |
| Failure mode | If readiness or job data is missing, snapshot may show fallback or empty; all logic is deterministic and local. |
| How tested | jobMatchSnapshot.test.ts (buildJobDemandProfile, buildJobMatchSnapshot, dimensions, primaryBlocker, audit). JobSearchScreen.test.tsx (Match for this job, conditional breakdown/CTA/blocker assertions when snapshot visible). |
