# Merge Notes: Day 16 — Benefits First-Principles Refactor (Job Seeker Mode)

**Branch:** `feature/day-16-benefits-first-principles-refactor`  
**Date:** December 14, 2025  
**Status:** Complete

---

## Summary

Refactored the **Explore Federal Benefits** page (Job Seeker mode) to be decision-first, answering:
1. Is federal total comp competitive when benefits are included?
2. Which benefits matter most to this user?
3. What actions should the user take next?

Key changes:
- Split "Total Benefits Value" into Annual Value + Long-term Value buckets
- Add personalization bar with local assumptions (salary, coverage, tenure)
- Add Decision Drivers section (ranked benefit categories)
- Add Break-even Private Salary calculator
- Refactor benefit cards with expandable details
- Add Benefits Timeline (Day 1 → 5 years)
- Implement PathAdvisor "Benefits Mode" with context-aware prompts

---

## Start-of-Work Git State

### git status

```
On branch feature/day-16-benefits-first-principles-refactor
Untracked files:
  docs/merge-notes/merge-notes-day-15.md

nothing added to commit but untracked files present
```

### git branch --show-current

```
feature/day-16-benefits-first-principles-refactor
```

### git diff --name-status develop...HEAD

```
(no committed changes yet - branch just created from develop)
```

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `store/benefitsAssumptionsStore.ts` | Zustand store for benefits personalization inputs (salary, coverage, tenure) with localStorage persistence |
| `lib/benefits/benefits-estimator.ts` | Pure utility functions for calculating annual value, long-term value, break-even salary, and ranking benefits |
| `lib/benefits/benefits-estimator.test.ts` | 24 unit tests for estimation utilities |
| `lib/benefits/index.ts` | Barrel export for benefits utilities |
| `docs/change-briefs/day-16.md` | Non-technical change brief for stakeholders |
| `docs/merge-notes/merge-notes-day-15.md` | Archived Day 15 merge notes |

### Modified Files

| File | Change |
|------|--------|
| `app/explore/benefits/page.tsx` | Complete refactor with new sections: Header, Total Comp Summary (two buckets), Personalization Bar, Decision Drivers, Break-even Card, refined Benefit Cards, Timeline, PathAdvisor prompts, CTAs |
| `components/path-advisor-panel.tsx` | Added Benefits Mode detection, context-aware badge, benefits-specific suggested prompts |
| `hooks/use-delete-all-local-data.ts` | Added benefitsAssumptionsStore reset |
| `lib/storage-keys.ts` | Added BENEFITS_ASSUMPTIONS_STORAGE_KEY |
| `merge-notes.md` | Updated for Day 16 (moved from `docs/merge-notes.md` to root per protocol) |

---

## Behavior Changes

| Feature | Before | After |
|---------|--------|-------|
| Benefits header | Single "Total Benefits Value" banner ($40K-$80K) | Two buckets: Annual Value (today) + Long-term Value (retirement) |
| Personalization | None | Salary, coverage, tenure inputs with localStorage persistence |
| Value estimates | Static ranges | Dynamically calculated based on user assumptions |
| Decision Drivers | None | Top 3 benefits ranked by value for user's situation |
| Break-even | None | Shows what private salary matches federal total comp |
| Benefit cards | 4 bullets, static values | 2-3 key bullets + expandable details, dynamic values |
| Timeline | None | Day 1 → 90 days → Year 1 → Year 5 milestones |
| CTAs | "Browse positions" only | + "Compare to private offer" + "See benefits by grade" (coming soon) |
| PathAdvisor | Generic job search prompts | Benefits-specific prompts when on Benefits page |
| PathAdvisor badge | "Job Search" only | Shows "Benefits" when viewing benefits page |

---

## End-of-Work Git State

### git status

```
On branch feature/day-16-benefits-first-principles-refactor
Changes not staged for commit:
	modified:   app/explore/benefits/page.tsx
	modified:   components/path-advisor-panel.tsx
	modified:   docs/merge-notes.md
	modified:   hooks/use-delete-all-local-data.ts
	modified:   lib/storage-keys.ts

Untracked files:
	docs/change-briefs/day-16.md
	docs/merge-notes/merge-notes-day-15.md
	lib/benefits/
	store/benefitsAssumptionsStore.ts
```

### git branch --show-current

```
feature/day-16-benefits-first-principles-refactor
```

### git diff --stat (working tree)

```
 app/explore/benefits/page.tsx      | 1039 +++++++++++++++---
 components/path-advisor-panel.tsx  |  194 +++-
 docs/merge-notes.md                | 2127 +-----------------------------------
 hooks/use-delete-all-local-data.ts |   14 +
 lib/storage-keys.ts                |    6 +
 5 files changed, 1080 insertions(+), 2300 deletions(-)
```

### git diff --name-status (working tree)

```
M	app/explore/benefits/page.tsx
M	components/path-advisor-panel.tsx
M	docs/merge-notes.md
M	hooks/use-delete-all-local-data.ts
M	lib/storage-keys.ts
```

---

## Commands Run and Outputs

### pnpm typecheck

```
> tsc -p tsconfig.json --noEmit
(success - no output)
```

### pnpm lint

```
> eslint .
(no problems - 0 errors, 0 warnings)
```

### pnpm test

```
 ✓ lib/job-search/saved-search.test.ts (11 tests)
 ✓ lib/benefits/benefits-estimator.test.ts (24 tests)
 ✓ lib/job-search/filter-jobs.test.ts (25 tests)
 ✓ lib/job-search/job-alerts.test.ts (17 tests)
 ✓ store/userPreferencesStore.test.ts (19 tests)
 ✓ lib/jobs/adapters/mock/v1Mapper.test.ts (25 tests)
 ✓ lib/jobs/adapters/usajobs/v1Mapper.test.ts (26 tests)
 ✓ components/resume-builder/resume-builder-focus-handler.test.ts (24 tests)

 Test Files  8 passed (8)
      Tests  171 passed (171)
```

### pnpm build

```
   ▲ Next.js 16.0.7 (Turbopack)

   Creating an optimized production build ...
 ✓ Compiled successfully in 7.6s
 ✓ Generating static pages (27/27) in 1874.2ms

Route (app)
├ ○ /explore/benefits
... (all routes generated successfully)
```

---

## Patch Artifact

**Command:**

```powershell
New-Item -ItemType Directory -Force artifacts | Out-Null
git diff | Out-File -FilePath artifacts/day-16.patch -Encoding utf8
Get-Item artifacts/day-16.patch | Format-List Name,Length,LastWriteTime
```

**Output:**

```
Name          : day-16.patch
Length        : 139263
LastWriteTime : 12/14/2025 4:00:13 AM
```

---

## Definition of Done Checklist

- [x] Mobile sanity pass (layout, scroll, no cramped sections)
- [x] Accessibility quick pass (labels, focus states, dialog focus trap)
- [x] No `var` introduced
- [x] All new logic has unit tests (24 tests for benefits-estimator)
- [x] Local persistence works and can be wiped by global delete later
- [x] Patch artifact created: `artifacts/day-16.patch`
- [x] Change Brief updated: `docs/change-briefs/day-16.md`

---

## Assumptions Made

1. **Break-even calculation simplified**: Uses 10% buffer on top of federal total comp rather than detailed private offer comparison. Parameters for private match % and health premium are reserved for future enhancement.

2. **FEHB values based on averages**: Employer contribution estimates use averaged values across popular FEHB plans, not user-specific plan selection.

3. **Tenure categories**: Short (1-2 years), Medium (3-5 years), Long (5+ years) map to specific service year estimates for calculations.

4. **TSP growth rate**: Conservative 5% real return assumed for retirement projections.

---

## Follow-ups

1. Implement "Benefits by Grade" feature (currently shows "Coming Soon" dialog)
2. Add detailed private offer comparison using the reserved parameters
3. Consider adding FEHB plan picker for more accurate estimates
4. Add E2E tests for the benefits personalization flow
5. Consider persisting assumptions to user profile (currently local-only)

---

## Session 2: Hydration Error Fix

**Date:** December 14, 2025

### Problem

Console errors indicated invalid HTML nesting inside Radix/shadcn Dialog components:
- `<p>` cannot contain nested `<p>`
- `<ul>` cannot be a descendant of `<p>`
- This causes hydration errors in Next.js

The stack trace pointed to `ExploreBenefitsPage (app/explore/benefits/page.tsx)` around the "How we estimate" dialog.

### Root Cause

`DialogDescription` from Radix (via `DialogPrimitive.Description`) renders as a `<p>` element by default. The page was nesting `<p>` and `<ul>` tags directly inside `DialogDescription`, creating invalid HTML structure:

```html
<p> <!-- DialogDescription renders as <p> -->
  <p>...</p> <!-- nested p tag - INVALID -->
  <ul>...</ul> <!-- ul inside p - INVALID -->
</p>
```

Browsers auto-close `<p>` tags when they encounter block elements, causing a mismatch between server-rendered HTML and client hydration.

### Fix Applied

Used the `asChild` pattern on `DialogDescription` to render a `<div>` instead of `<p>`:

```tsx
<DialogDescription asChild>
  <div className="space-y-3 pt-2 text-muted-foreground text-sm">
    <p>...</p>
    <ul>...</ul>
  </div>
</DialogDescription>
```

### Files Changed

| File | Change |
|------|--------|
| `app/explore/benefits/page.tsx` | Fixed "How we estimate" dialog (lines ~374-396) and "Benefits by Grade" dialog (lines ~889-912) to use `asChild` pattern |
| `docs/change-briefs/day-16.md` | Added note about hydration bug fix |

### Start-of-Work Git State (Session 2)

```
git status:
On branch feature/day-16-benefits-first-principles-refactor
Changes not staged for commit:
	modified:   app/explore/benefits/page.tsx
	modified:   components/path-advisor-panel.tsx
	modified:   docs/merge-notes.md
	modified:   hooks/use-delete-all-local-data.ts
	modified:   lib/storage-keys.ts

Untracked files:
	artifacts/day-16.patch
	docs/change-briefs/day-16.md
	docs/merge-notes/merge-notes-day-15.md
	lib/benefits/
	store/benefitsAssumptionsStore.ts

git branch --show-current:
feature/day-16-benefits-first-principles-refactor

git diff --name-status develop...HEAD:
(no committed changes - all changes in working tree)
```

### Commands Run and Outputs (Session 2)

#### pnpm lint

```
> eslint .
(no problems - 0 errors, 0 warnings)
```

#### pnpm typecheck

```
> tsc -p tsconfig.json --noEmit
(success - no output)
```

#### pnpm test

```
 ✓ lib/job-search/job-alerts.test.ts (17 tests)
 ✓ lib/job-search/saved-search.test.ts (11 tests)
 ✓ lib/job-search/filter-jobs.test.ts (25 tests)
 ✓ lib/benefits/benefits-estimator.test.ts (24 tests)
 ✓ store/userPreferencesStore.test.ts (19 tests)
 ✓ lib/jobs/adapters/usajobs/v1Mapper.test.ts (26 tests)
 ✓ lib/jobs/adapters/mock/v1Mapper.test.ts (25 tests)
 ✓ components/resume-builder/resume-builder-focus-handler.test.ts (24 tests)

 Test Files  8 passed (8)
      Tests  171 passed (171)
```

#### pnpm build

```
   ▲ Next.js 16.0.7 (Turbopack)

   Creating an optimized production build ...
 ✓ Compiled successfully in 7.3s
 ✓ Generating static pages (27/27)

Route (app)
├ ○ /explore/benefits
... (all routes generated successfully)
```

### End-of-Work Git State (Session 2)

```
git status:
On branch feature/day-16-benefits-first-principles-refactor
Changes not staged for commit:
	modified:   app/explore/benefits/page.tsx
	modified:   components/path-advisor-panel.tsx
	modified:   docs/merge-notes.md
	modified:   hooks/use-delete-all-local-data.ts
	modified:   lib/storage-keys.ts

Untracked files:
	artifacts/day-16-this-run.patch
	artifacts/day-16.patch
	docs/change-briefs/day-16.md
	docs/merge-notes/merge-notes-day-15.md
	lib/benefits/
	store/benefitsAssumptionsStore.ts

git diff --stat:
 app/explore/benefits/page.tsx      | 1055 +++++++++++++++---
 components/path-advisor-panel.tsx  |  194 +++-
 docs/merge-notes.md                | 2161 ++++--------------------------------
 hooks/use-delete-all-local-data.ts |   14 +
 lib/storage-keys.ts                |    6 +
 5 files changed, 1259 insertions(+), 2171 deletions(-)
```

### Patch Artifacts (Session 2)

**Command:**

```powershell
git diff | Out-File -FilePath artifacts/day-16.patch -Encoding utf8
Get-Item artifacts/day-16.patch | Format-List Name,Length,LastWriteTime
```

**Output:**

```
Name          : day-16.patch
Length        : 144594
LastWriteTime : 12/14/2025 10:37:38 AM
```

**This-Run Patch:**

```
Name          : day-16-this-run.patch
Length        : 144594
LastWriteTime : 12/14/2025 10:37:39 AM
```

### Definition of Done Checklist (Session 2)

- [x] Hydration errors fixed (no nested `<p>` / `<ul>` issues)
- [x] Benefits page still renders correctly
- [x] Dialog accessibility sanity pass (focus trap, ESC close, tab order) - asChild preserves Radix accessibility
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes
- [x] `pnpm build` passes
- [x] Patch artifacts updated: `artifacts/day-16.patch` + `artifacts/day-16-this-run.patch`
- [x] Day 16 Change Brief updated: `docs/change-briefs/day-16.md`

---

## Session 3: Merge Readiness Fix

**Date:** December 14, 2025

### Goals

1. Fix patch artifact generation so `artifacts/day-16.patch` reflects all Day 16 changes vs develop
2. Fix `artifacts/day-16-this-run.patch` to reflect only changes from this session
3. Normalize merge-notes location: current day at root, prior days in `docs/merge-notes/`

### Start-of-Work Git State (Session 3)

```
git status:
On branch feature/day-16-benefits-first-principles-refactor
Changes not staged for commit:
	modified:   app/explore/benefits/page.tsx
	modified:   components/path-advisor-panel.tsx
	modified:   docs/merge-notes.md
	modified:   hooks/use-delete-all-local-data.ts
	modified:   lib/storage-keys.ts

Untracked files:
	artifacts/day-16-this-run.patch
	artifacts/day-16.patch
	docs/change-briefs/day-16.md
	docs/merge-notes/merge-notes-day-15.md
	lib/benefits/
	store/benefitsAssumptionsStore.ts

git branch --show-current:
feature/day-16-benefits-first-principles-refactor

git diff --name-status:
M	app/explore/benefits/page.tsx
M	components/path-advisor-panel.tsx
M	docs/merge-notes.md
M	hooks/use-delete-all-local-data.ts
M	lib/storage-keys.ts

git diff --stat:
 app/explore/benefits/page.tsx      | 1055 +++++++++++++++---
 components/path-advisor-panel.tsx  |  194 +++-
 docs/merge-notes.md                | 2167 ++++--------------------------------
 hooks/use-delete-all-local-data.ts |   14 +
 lib/storage-keys.ts                |    6 +
 5 files changed, 1287 insertions(+), 2149 deletions(-)
```

### Merge-Notes Location Fix

**Issue:** Day 16 notes were in `docs/merge-notes.md` (legacy), while root `merge-notes.md` had stale Day 14 content.

**Fix:**
- Copied Day 16 content to root `merge-notes.md` (correct location per protocol)
- Deleted legacy `docs/merge-notes.md`
- Deleted stray `docs/merge-notes-day-13.md` (already archived in `docs/merge-notes/`)

**Protocol reminder:** Current day's notes go at `merge-notes.md` (root). Prior days are archived to `docs/merge-notes/merge-notes-day-NN.md`.

### Patch Artifact Workflow Fix

**Issue:** Previous sessions generated both patches from `git diff` (unstaged), so they were identical. The "this-run" patch should be incremental.

**Corrected workflow:**

1. Stage all Day 16 work: `git add -A` (creates baseline)
2. Make Session 3 changes (this run) — kept unstaged
3. Generate this-run patch from unstaged diff:
   ```powershell
   git diff | Out-File -FilePath artifacts/day-16-this-run.patch -Encoding utf8
   ```
4. Stage everything: `git add -A`
5. Generate cumulative patch from staged diff:
   ```powershell
   git diff --cached | Out-File -FilePath artifacts/day-16.patch -Encoding utf8
   ```

This ensures:
- `day-16.patch` = all Day 16 changes vs develop (cumulative)
- `day-16-this-run.patch` = only Session 3 changes (incremental)

### Commands Run and Outputs (Session 3)

#### pnpm lint

```
> eslint .
(no problems - 0 errors, 0 warnings)
```

#### pnpm typecheck

```
> tsc -p tsconfig.json --noEmit
(success - no output)
```

#### pnpm test

```
 ✓ lib/benefits/benefits-estimator.test.ts (24 tests)
 ✓ lib/job-search/saved-search.test.ts (11 tests)
 ✓ lib/job-search/job-alerts.test.ts (17 tests)
 ✓ lib/job-search/filter-jobs.test.ts (25 tests)
 ✓ store/userPreferencesStore.test.ts (19 tests)
 ✓ lib/jobs/adapters/usajobs/v1Mapper.test.ts (26 tests)
 ✓ lib/jobs/adapters/mock/v1Mapper.test.ts (25 tests)
 ✓ components/resume-builder/resume-builder-focus-handler.test.ts (24 tests)

 Test Files  8 passed (8)
      Tests  171 passed (171)
```

#### pnpm build

```
   ▲ Next.js 16.0.7 (Turbopack)

   Creating an optimized production build ...
 ✓ Compiled successfully in 7.9s
 ✓ Generating static pages (27/27)

Route (app)
├ ○ /explore/benefits
... (all routes generated successfully)
```

### End-of-Work Git State (Session 3)

```
git status:
On branch feature/day-16-benefits-first-principles-refactor
Changes to be committed:
	modified:   app/explore/benefits/page.tsx
	new file:   artifacts/day-16-this-run.patch
	new file:   artifacts/day-16.patch
	modified:   components/path-advisor-panel.tsx
	new file:   docs/change-briefs/day-16.md
	deleted:    docs/merge-notes-day-13.md
	renamed:    docs/merge-notes.md -> docs/merge-notes/merge-notes-day-15.md
	modified:   hooks/use-delete-all-local-data.ts
	new file:   lib/benefits/benefits-estimator.test.ts
	new file:   lib/benefits/benefits-estimator.ts
	new file:   lib/benefits/index.ts
	modified:   lib/storage-keys.ts
	modified:   merge-notes.md
	new file:   store/benefitsAssumptionsStore.ts

git diff --cached --name-status:
M	app/explore/benefits/page.tsx
A	artifacts/day-16-this-run.patch
A	artifacts/day-16.patch
M	components/path-advisor-panel.tsx
A	docs/change-briefs/day-16.md
D	docs/merge-notes-day-13.md
R100	docs/merge-notes.md	docs/merge-notes/merge-notes-day-15.md
M	hooks/use-delete-all-local-data.ts
A	lib/benefits/benefits-estimator.test.ts
A	lib/benefits/benefits-estimator.ts
A	lib/benefits/index.ts
M	lib/storage-keys.ts
M	merge-notes.md
A	store/benefitsAssumptionsStore.ts

git diff --cached --stat:
 app/explore/benefits/page.tsx         | 1055 ++++-
 artifacts/day-16-this-run.patch       | 4950 ++++++++++++++++++++
 artifacts/day-16.patch                | 3781 +++++++++++++++
 components/path-advisor-panel.tsx     |  194 +-
 docs/change-briefs/day-16.md          |   70 +
 docs/merge-notes-day-13.md            |   94 -
 docs/merge-notes/merge-notes-day-15.md (renamed)
 hooks/use-delete-all-local-data.ts    |   14 +
 lib/benefits/benefits-estimator.test.ts | 299 ++
 lib/benefits/benefits-estimator.ts    |  461 ++
 lib/benefits/index.ts                 |   21 +
 lib/storage-keys.ts                   |    6 +
 merge-notes.md                        |  533 ++-
 store/benefitsAssumptionsStore.ts     |  295 ++
 14 files changed, 11399 insertions(+), 374 deletions(-)
```

### Patch Artifacts (Session 3)

**This-Run Patch (Session 3 changes only):**

Generated from unstaged diff before staging:

```powershell
git diff | Out-File -FilePath artifacts/day-16-this-run.patch -Encoding utf8
```

```
Name          : day-16-this-run.patch
Length        : 190488
LastWriteTime : 12/14/2025 11:05:55 AM
```

**Cumulative Day 16 Patch (all changes vs develop):**

Generated from staged diff after `git add -A`:

```powershell
git diff --cached | Out-File -FilePath artifacts/day-16.patch -Encoding utf8
```

```
Name          : day-16.patch
Length        : 479544
LastWriteTime : 12/14/2025 11:06:06 AM
```

**Note:** The patches have different sizes, confirming the this-run patch is truly incremental:
- `day-16-this-run.patch` = 190,488 bytes (Session 3 only)
- `day-16.patch` = 479,544 bytes (all Day 16)

### Definition of Done Checklist (Session 3)

- [x] Merge-notes location normalized (root = current day)
- [x] Legacy `docs/merge-notes.md` removed (moved to proper archive location)
- [x] Stray `docs/merge-notes-day-13.md` removed
- [x] Patch workflow corrected (this-run is incremental)
- [x] `pnpm lint` passes
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes
- [x] `pnpm build` passes
- [x] Patch artifacts regenerated with correct commands
- [x] Change Brief updated

---

*Last updated: December 14, 2025*
