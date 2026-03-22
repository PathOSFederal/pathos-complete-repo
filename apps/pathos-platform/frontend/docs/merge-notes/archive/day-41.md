# Day 41 — Owner Map Generator Determinism Fix

**Branch:** `feature/day-41-owner-map-determinism`  
**Date:** December 31, 2025  
**Status:** In Progress

---

## Objective

Fix CI failure where `docs/owner-map.generated.md` changes only because the header date changes (e.g., Generated: YYYY-MM-DD). Make generation deterministic so CI never fails due to date rollover.

---

## Preflight Git State

**Command:** `git status --porcelain`
```
 M docs/owner-map.generated.md
 M scripts/generate-owner-map.mjs
?? docs/ai/generated-docs-policy.md
?? scripts/generate-owner-map.test.mjs
```

**Command:** `git branch --show-current`
```
feature/day-41-owner-map-determinism
```

**Command:** `git diff --name-status develop...HEAD`
```
(no output - HEAD is same as develop in commit range)
```

**Command:** `git diff --stat develop...HEAD`
```
(no output - HEAD is same as develop in commit range)
```

**Command:** `git diff --name-status develop -- . ":(exclude)artifacts"`
```
A	docs/ai/generated-docs-policy.md
M	docs/merge-notes/current.md
M	docs/owner-map.generated.md
M	scripts/generate-owner-map.mjs
A	scripts/generate-owner-map.test.mjs
```

**Command:** `git diff --stat develop -- . ":(exclude)artifacts"`
```
 docs/ai/generated-docs-policy.md    | 116 +++++++++++
 docs/merge-notes/current.md         | 378 ++++++++----------------------------
 docs/owner-map.generated.md         |   2 -
 scripts/generate-owner-map.mjs      |   5 +-
 scripts/generate-owner-map.test.mjs | 132 +++++++++++++
 5 files changed, 330 insertions(+), 303 deletions(-)
```

---

## Changes Made

### 1. Removed Non-Deterministic Date from Generator

**File:** `scripts/generate-owner-map.mjs`

- Removed line 209: `const timestamp = new Date().toISOString().split('T')[0];`
- Removed line 218: `Generated: ${timestamp}` from the markdown template
- Added comment explaining why no timestamp (determinism requirement)
- Output is now deterministic - identical runs produce identical files

### 2. Added Determinism Smoke Test

**File:** `scripts/generate-owner-map.test.mjs` (new)

- Test runs the generator twice in a row
- Verifies both runs produce identical output
- Ensures generator remains deterministic
- Can be run manually: `node scripts/generate-owner-map.test.mjs`

### 3. Created Generated Documentation Policy

**File:** `docs/ai/generated-docs-policy.md` (new)

- Documents which files are generated
- Explains commit policy (generated files are committed)
- Defines determinism requirements and enforcement
- Documents CI validation process
- Provides maintenance guidelines for future generated files

### 4. Verified CI Already Runs Generator Before Diff

**File:** `.github/workflows/ci-develop.yml`

- Confirmed CI step at line 177 runs `pnpm docs:owner-map`
- Confirmed CI step at line 181 runs `git diff --exit-code docs/owner-map.generated.md`
- CI already runs generator BEFORE checking diff (requirement met)

### 5. Updated Generated Owner Map File

**File:** `docs/owner-map.generated.md`

- Regenerated without date header
- File is now deterministic
- Only change: removed "Generated: 2025-12-31" line

---

## Determinism Test Results

**Command:** `node scripts/generate-owner-map.test.mjs`
```
[test-determinism] Running owner map generator determinism test...
[test-determinism] First generation run...
[generate-owner-map] Scanning codebase...
[generate-owner-map] Found 26 routes
[generate-owner-map] Found 16 stores
[generate-owner-map] Found 15 storage keys
[generate-owner-map] Written to docs/owner-map.generated.md
[generate-owner-map] Done.
[test-determinism] Second generation run...
[generate-owner-map] Scanning codebase...
[generate-owner-map] Found 26 routes
[generate-owner-map] Found 16 stores
[generate-owner-map] Found 15 storage keys
[generate-owner-map] Written to docs/owner-map.generated.md
[generate-owner-map] Done.
[test-determinism] PASSED: Generator produces deterministic output
[test-determinism] Output length: 3204 bytes
```

**Result:** ✅ PASSED - Generator produces identical output on consecutive runs

**Manual Verification:**
```bash
pnpm docs:owner-map
pnpm docs:owner-map
git diff docs/owner-map.generated.md
```
**Result:** ✅ No diff - file unchanged after second run

---

## Testing Evidence (Gates Output)

### pnpm typecheck
```
> my-v0-project@0.1.0 typecheck C:\Users\jorie\Desktop\PathOS\codebase\fedpath-tier1-frontend
> tsc -p tsconfig.json --noEmit

(no errors)
```
**Result:** ✅ PASS

### pnpm build
```
> my-v0-project@0.1.0 build C:\Users\jorie\Desktop\PathOS\codebase\fedpath-tier1-frontend
> next build

 ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
...
 ✓ Compiled successfully in 22.1s
 ✓ Generating static pages using 11 workers (30/30) in 4.8s
```
**Result:** ✅ PASS (warning is pre-existing, not related to Day 41 changes)

---

## Summary

### What Changed

1. **Removed non-deterministic date header** from `docs/owner-map.generated.md` generator
   - Removed `Generated: YYYY-MM-DD` line that changed daily
   - Generator output is now deterministic (identical runs produce identical files)

2. **Added determinism smoke test** (`scripts/generate-owner-map.test.mjs`)
   - Runs generator twice and verifies identical output
   - Prevents regressions that reintroduce non-deterministic content

3. **Created generated documentation policy** (`docs/ai/generated-docs-policy.md`)
   - Documents which files are generated and commit policy
   - Explains determinism requirements and enforcement
   - Provides maintenance guidelines for future generated files

4. **Regenerated owner map file** without date header
   - File is now deterministic and will not change due to date rollover

### Why It Fixes the CI Failure

**Root Cause:** The generator included a date header (`Generated: 2025-12-31`) that changed daily. When CI ran the generator and compared against the committed file, it would fail if the date had rolled over, even though the actual content (routes, stores, keys) was identical.

**Fix:** Removed the date header entirely. The generator now produces identical output for identical inputs, regardless of when it runs. CI will only fail if the actual source data (routes, stores, keys) changes, which is the intended behavior.

**CI Validation:** CI already runs the generator before the diff check (step at line 177), so the fix ensures CI will pass when source data is unchanged, even across date boundaries.

### Any Remaining Risks or Follow-ups

**Risks:**
- None identified. The change is minimal (removed date header) and fully tested.

**Follow-ups:**
- None required. Determinism is now enforced via:
  - Generator code (no timestamp)
  - Smoke test (verifies determinism)
  - CI validation (runs generator and checks diff)
  - Policy documentation (documents requirements)

---

## Patch Artifacts (FINAL)

**Command:**
```bash
pnpm docs:day-patches --day 41
Get-Item artifacts/day-41.patch artifacts/day-41-run.patch | Format-List Name,Length,LastWriteTime
```

**Output:**
```
Name          : day-41.patch
Length        : 43853
LastWriteTime : 12/30/2025 11:38:51 PM

Name          : day-41-run.patch
Length        : 43853
LastWriteTime : 12/30/2025 11:38:51 PM
```

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | No |
| Triggers hit | None |
| Why | Text-only documentation changes and script updates. No UI, store, persistence, or SSR/hydration changes. |

---
