# Day 18 – CI Gates + Definition of Done Enforcement v1

**Branch:** `feature/day-18-ci-gates-dod-enforcement`  
**Date:** December 14, 2025  
**Status:** In Progress

---

## Summary

Implement CI gates for PRs into `develop` with policy validation scripts that enforce:
- Day patch artifacts exist
- Change Brief exists
- Day labels are consistent (no mismatched day numbers)

---

## Git State (Start of Session)

### git status

```
On branch feature/day-18-ci-gates-dod-enforcement
Changes not staged for commit:
	modified:   docs/ai/prompt-header.md
	modified:   merge-notes.md
	modified:   package.json

Untracked files:
	.github/workflows/ci-develop.yml
	artifacts/day-18-this-run.patch
	artifacts/day-18.patch
	docs/change-briefs/day-18.md
	docs/merge-notes/merge-notes-day-17.md
	scripts/validate-change-brief.mjs
	scripts/validate-day-artifacts.mjs
	scripts/validate-day-labels.mjs

no changes added to commit
```

### git branch --show-current

```
feature/day-18-ci-gates-dod-enforcement
```

---

## Day 17 Archive Fixup

**Issue:** The Day 17 archive (`docs/merge-notes/merge-notes-day-17.md`) was created as an untracked copy instead of using `git mv`.

**Fix Applied (Approach A):**
1. Deleted the untracked `docs/merge-notes/merge-notes-day-17.md`
2. Restored `merge-notes.md` to its Day 17 state from develop
3. Executed `git mv merge-notes.md docs/merge-notes/merge-notes-day-17.md`
4. Created this fresh Day 18 `merge-notes.md`

This ensures git tracks the rename properly.

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci-develop.yml` | CI workflow for PRs targeting develop with policy + quality gates |
| `scripts/validate-day-artifacts.mjs` | Validates patch artifacts exist |
| `scripts/validate-change-brief.mjs` | Validates change brief exists |
| `scripts/validate-day-labels.mjs` | Validates day labels are consistent |
| `docs/change-briefs/day-18.md` | Non-technical change brief for Day 18 |
| `docs/merge-notes/merge-notes-day-17.md` | Archived Day 17 merge notes (via git mv) |
| `artifacts/day-18.patch` | Cumulative patch from develop |
| `artifacts/day-18-this-run.patch` | Incremental patch for this run |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Added `ci:validate` script |
| `docs/ai/prompt-header.md` | Updated patch artifact instructions |

---

## CI Workflow Decisions

### .github/workflows/ci-develop.yml

- **Trigger:** `pull_request` targeting `develop`
- **Node version:** 22 (LTS, matches existing CI)
- **Package manager:** pnpm 9 (matches existing repo)
- **Steps in order:**
  1. checkout
  2. setup node
  3. enable pnpm via pnpm/action-setup
  4. pnpm install --frozen-lockfile
  5. pnpm ci:validate (policy checks)
  6. pnpm lint
  7. pnpm typecheck
  8. pnpm test
  9. pnpm build (included — build is stable)

**Build included:** Yes. Build is stable and completes in ~7s, so no reason to skip.

---

## Validation Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate-day-artifacts.mjs` | Verifies `artifacts/day-18.patch` and `artifacts/day-18-this-run.patch` exist |
| `scripts/validate-change-brief.mjs` | Verifies `docs/change-briefs/day-18.md` exists |
| `scripts/validate-day-labels.mjs` | Scans merge-notes and change briefs for mismatched day references |

---

## Commands Run

### pnpm ci:validate

```
> node scripts/validate-day-artifacts.mjs && node scripts/validate-change-brief.mjs && node scripts/validate-day-labels.mjs

============================================================
Validating Day 18 patch artifacts...
============================================================

✓ Found: artifacts/day-18.patch
✓ Found: artifacts/day-18-this-run.patch

✓ All Day 18 patch artifacts present.

============================================================
Validating Day 18 change brief...
============================================================

✓ Found: docs/change-briefs/day-18.md

✓ Day 18 change brief present.

============================================================
Validating Day 18 label consistency...
============================================================

Scanning: merge-notes.md
Scanning: docs/change-briefs/day-18.md

✓ Day label validation passed (with warnings).
```

### pnpm lint

```
> eslint .
(0 errors, 0 warnings)
```

### pnpm typecheck

```
> tsc -p tsconfig.json --noEmit
(success - no output)
```

### pnpm test

```
 ✓ lib/job-search/filter-jobs.test.ts (25 tests) 22ms
 ✓ lib/job-search/saved-search.test.ts (11 tests) 17ms
 ✓ lib/benefits/benefits-estimator.test.ts (24 tests) 55ms
 ✓ store/userPreferencesStore.test.ts (25 tests) 27ms
 ✓ lib/job-search/job-alerts.test.ts (17 tests) 19ms
 ✓ lib/jobs/adapters/usajobs/v1Mapper.test.ts (26 tests) 77ms
 ✓ lib/jobs/adapters/mock/v1Mapper.test.ts (25 tests) 71ms
 ✓ components/resume-builder/resume-builder-focus-handler.test.ts (24 tests) 20ms

 Test Files  8 passed (8)
      Tests  177 passed (177)
```

### pnpm build

```
   ▲ Next.js 16.0.7 (Turbopack)

   Creating an optimized production build ...
 ✓ Compiled successfully in 8.3s
 ✓ Generating static pages (27/27) in 2.1s
(all routes generated successfully)
```

---

## End-of-Run Git State

### git status

```
On branch feature/day-18-ci-gates-dod-enforcement
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   .github/workflows/ci-develop.yml
	new file:   artifacts/day-18-this-run.patch
	new file:   artifacts/day-18.patch
	modified:   docs/ai/prompt-header.md
	new file:   docs/change-briefs/day-18.md
	new file:   docs/merge-notes/merge-notes-day-17.md
	modified:   merge-notes.md
	modified:   package.json
	new file:   scripts/validate-change-brief.mjs
	new file:   scripts/validate-day-artifacts.mjs
	new file:   scripts/validate-day-labels.mjs
```

### git diff --name-status --cached develop

```
A	.github/workflows/ci-develop.yml
A	artifacts/day-18-this-run.patch
A	artifacts/day-18.patch
M	docs/ai/prompt-header.md
A	docs/change-briefs/day-18.md
A	docs/merge-notes/merge-notes-day-17.md
M	merge-notes.md
M	package.json
A	scripts/validate-change-brief.mjs
A	scripts/validate-day-artifacts.mjs
A	scripts/validate-day-labels.mjs
```

### git diff --stat --cached develop

```
 .github/workflows/ci-develop.yml       |  115 +
 artifacts/day-18-this-run.patch        | 4354 ++++++++++++++++++++++++++++++++
 artifacts/day-18.patch                 | 3428 +++++++++++++++++++++++++
 docs/ai/prompt-header.md               |   26 +
 docs/change-briefs/day-18.md           |   67 +
 docs/merge-notes/merge-notes-day-17.md |  528 ++++
 merge-notes.md                         |  549 +---
 package.json                           |    1 +
 scripts/validate-change-brief.mjs      |  104 +
 scripts/validate-day-artifacts.mjs     |  120 +
 scripts/validate-day-labels.mjs        |  265 ++
 11 files changed, 9099 insertions(+), 458 deletions(-)
```

---

## Patch Artifact

**Commands:**

```powershell
git diff --cached develop | Out-File -FilePath artifacts/day-18.patch -Encoding utf8
git diff | Out-File -FilePath artifacts/day-18-this-run.patch -Encoding utf8
Get-Item artifacts/day-18.patch, artifacts/day-18-this-run.patch | Format-List Name,Length,LastWriteTime
```

**Output:**

```
Name          : day-18.patch
Length        : 944854
LastWriteTime : 12/14/2025 2:39:01 PM

Name          : day-18-this-run.patch
Length        : 1645331
LastWriteTime : 12/14/2025 2:39:03 PM
```

*Note: Patches include themselves, hence the larger size. This is expected.*

---

## Definition of Done Checklist

- [x] Day 17 archive properly created via git mv
- [x] CI workflow created: `.github/workflows/ci-develop.yml`
- [x] Validation script: `scripts/validate-day-artifacts.mjs`
- [x] Validation script: `scripts/validate-change-brief.mjs`
- [x] Validation script: `scripts/validate-day-labels.mjs`
- [x] `ci:validate` script added to package.json
- [x] Change Brief created: `docs/change-briefs/day-18.md`
- [x] `pnpm ci:validate` passes
- [x] `pnpm lint` passes (0 errors, 0 warnings)
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes (177 tests)
- [x] `pnpm build` passes
- [x] Patch artifacts regenerated
- [x] All files staged (tracked)
- [x] No commits made (per instructions)

---

## Suggested Commit Message

```
Day 18 — CI gates + DoD enforcement (policy validation scripts)

- Add ci-develop.yml workflow for PRs targeting develop
- Add validate-day-artifacts.mjs to enforce patch artifacts exist
- Add validate-change-brief.mjs to enforce change brief exists
- Add validate-day-labels.mjs to warn about mismatched day references
- Add ci:validate script to package.json
- Archive Day 17 merge notes via git mv (proper rename tracking)
- Update validate-day-labels.mjs to ignore archived notes under docs/merge-notes/**
```

---

## Suggested PR Title

```
Day 18 — CI gates + Definition of Done enforcement (policy validation scripts)
```

---

**Do not commit or push.**

---

*Last updated: December 14, 2025*
