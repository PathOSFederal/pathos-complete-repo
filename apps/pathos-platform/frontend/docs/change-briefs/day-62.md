# Day 62 — PathAdvisor Context Log global v1

**Branch:** `feature/day-62-pathadvisor-context-log-global-v1`  
**Goal:** Make PathAdvisor a global, append-only "Context Log" across PathOS and reclaim main-canvas real estate in Job Search by moving long explanations into PathAdvisor.

## Summary (non-technical)

- **PathAdvisor as a log:** PathAdvisor now behaves like a large, open chat box that **appends** new entries whenever you do something meaningful—for example, selecting a job in Job Search, clicking a match dimension, or clicking Today’s Focus on the Dashboard. Each of these actions adds a short, readable “context” block to the PathAdvisor panel instead of crowding the main screen.
- **Job Search cleanup:** The main Job Search panel keeps the important stuff: match score (e.g. 74/100 readiness, 46/100 job match), the five clickable Match Breakdown rows, and a single line: “Details appear in PathAdvisor.” The longer “What you’re missing” list and the detailed blocker text are no longer on the main panel; they appear in PathAdvisor when you select a job or click a dimension.
- **No duplicate clutter:** If you click the same job or the same dimension again, PathAdvisor does not add a duplicate block; it just brings that thread back into view. You can clear all context for the current screen or clear one “thread” (one job or one card) at a time.
- **Privacy:** The static “Privacy: Local only” pill was removed from the PathAdvisor rail. When something is local-only, that is noted inside the relevant log entry instead.
- **Other screens:** Dashboard (Today’s Focus hero), Career Readiness, and Resume Readiness now pass a screen id so that “Clear screen” only clears that screen’s context. Clicking the Today’s Focus hero on the Dashboard adds a short entry to the context log so the pattern is consistent.

## Gates

- **pnpm lint:** (run at end of session)
- **pnpm -r typecheck:** (run at end of session)
- **pnpm test:** (run at end of session)
- **pnpm build:** (run at end of session)
- **pnpm routes:check** / **pnpm overlays:check:** (run at end of session)

## Human Simulation Gate

| Item | Value |
|------|--------|
| Required | Yes |
| Triggers hit | Changes Zustand store logic (pathAdvisorContextLogStore); Affects UI where results appear in multiple places (PathAdvisor rail, Job Search panel). |
| Why | New append-only log and Job Search panel changes require verifying: job select and dimension click append entries; Clear screen clears only current screen; no duplicate entries for same dedupeKey. |

## AI Acceptance Checklist

| Item | Value |
|------|--------|
| Flow | User selects job → context log entry appended (job match summary); user clicks dimension row → dimension entry appended under same job anchor; user clears screen → only job-search entries removed. |
| Store(s) | pathAdvisorContextLogStore (new); pathAdvisorScreenOverridesStore (screenId, railContent removed for Job Search). |
| Storage key(s) | none (in-memory only). |
| Failure mode | If store or publish fails, main canvas still works; PathAdvisor may show empty or stale log. |
| How tested | Unit: pathAdvisorContextLogStore (append, dedupe, clearAnchor, clearScreen); PathAdvisorCard (entries exist → quick prompts collapsed; clear screen); JobSearchScreen (select job appends "Job match", dimension click appends "Match breakdown", no static Privacy pill or static Insight card). |
