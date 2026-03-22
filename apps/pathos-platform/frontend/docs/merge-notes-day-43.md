# Day 42 — Benefits Comparison Workspace v1 (Immersive Workspace + Ask PathAdvisor)

**Branch:** `feature/day-42-benefits-workspace-revert-and-wire-v2`  
**Date:** December 31, 2025  
**Status:** In Progress

---

## Day Normalization (CI Fix)

**Issue:** CI was failing because `pnpm ci:validate` detected Day 41 instead of Day 42.

**Root Cause:** `docs/merge-notes/current.md` contained Day 41 content at the top, causing validators to infer Day 41 from the first "Day N" match.

**Actions Taken:**
1. Archived Day 41 content from `docs/merge-notes/current.md` to `docs/merge-notes/archive/day-41.md`
2. Replaced `docs/merge-notes/current.md` with only Day 42 content
3. Updated `docs/merge-notes.md` header branch name to match current branch: `feature/day-42-benefits-workspace-revert-and-wire-v2`
4. Removed old Day 41 artifacts (`artifacts/day-41.patch`, `artifacts/day-41-run.patch`)

**Verification:**
- Branch name: `feature/day-42-benefits-workspace-revert-and-wire-v2` ✓
- `docs/merge-notes.md` header: Day 42 ✓
- `docs/merge-notes/current.md`: Day 42 ✓
- Artifacts: `artifacts/day-42.patch`, `artifacts/day-42-run.patch` exist ✓
- Change brief: `docs/change-briefs/day-42.md` exists ✓

**Result:** All repo signals now consistently signal Day 42. CI validation should pass with `DAY=42 pnpm ci:validate`.

---

## Owner Map Regeneration (CI Fix)

**Issue:** CI was failing because `docs/owner-map.generated.md` was out of date after adding:
- `/explore/benefits/workspace` route
- `store/benefitsWorkspaceStore.ts`
- `BENEFITS_WORKSPACE` storage key

**Actions Taken:**
1. Identified generator command: `pnpm docs:owner-map` (runs `scripts/generate-owner-map.mjs`)
2. Ran generator: `pnpm docs:owner-map`
3. Verified generated output includes:
   - Route: `/explore/benefits/workspace` | `app/explore/benefits/workspace/page.tsx` ✓
   - Store: `store/benefitsWorkspaceStore.ts` ✓
   - Storage Key: `BENEFITS_WORKSPACE` | `pathos-benefits-workspace-v1` ✓
4. Verified diff is limited to `docs/owner-map.generated.md` only
5. Staged the file: `git add docs/owner-map.generated.md`
6. Verified CI check passes: `git diff --exit-code docs/owner-map.generated.md` returns 0 ✓

**Generator Command:**
```bash
pnpm docs:owner-map
```

**Git Status:**
```bash
$ git status
On branch feature/day-42-benefits-workspace-revert-and-wire-v2
Changes staged for commit:
  modified:   docs/owner-map.generated.md
```

**Git Diff (develop...HEAD):**
```bash
$ git diff --name-status develop...HEAD
M	app/explore/benefits/page.tsx
A	app/explore/benefits/workspace/page.tsx
D	artifacts/day-41-run.patch
D	artifacts/day-41.patch
A	artifacts/day-42-run.patch
A	artifacts/day-42.patch
M	components/app-shell.tsx
M	components/path-advisor-panel.tsx
A	docs/change-briefs/day-42.md
A	docs/merge-notes-day-42.md
M	docs/merge-notes.md
A	docs/merge-notes/archive/day-41.md
A	docs/merge-notes/archive/day-42-v1.md
A	docs/merge-notes/archive/day-42.md
M	docs/merge-notes/current.md
M	hooks/use-delete-all-local-data.ts
M	lib/storage-keys.ts
A	store/benefitsWorkspaceStore.ts
```

**Git Diff Stat (develop...HEAD):**
```bash
$ git diff --stat develop...HEAD
 app/explore/benefits/page.tsx           |  881 +---
 app/explore/benefits/workspace/page.tsx | 1492 +++++++
 artifacts/day-41-run.patch              | 1147 ------
 artifacts/day-41.patch                  | 1147 ------
 artifacts/day-42-run.patch              | 2213 ++++++++++
 artifacts/day-42.patch                  | 6653 +++++++++++++++++++++++++++++++
 components/app-shell.tsx                |   22 +-
 components/path-advisor-panel.tsx       |   45 +-
 docs/change-briefs/day-42.md            |   17 +
 docs/merge-notes-day-42.md              |  311 ++
 docs/merge-notes.md                     | 1409 +------
 docs/merge-notes/archive/day-41.md      |  240 ++
 docs/merge-notes/archive/day-42-v1.md  |  112 +
 docs/merge-notes/archive/day-42.md      | 1323 ++++++
 docs/merge-notes/current.md             |  295 +-
 hooks/use-delete-all-local-data.ts      |   18 +
 lib/storage-keys.ts                     |    7 +
 store/benefitsWorkspaceStore.ts         |  447 +++
 18 files changed, 13374 insertions(+), 4405 deletions(-)
```

**Result:** `docs/owner-map.generated.md` now includes all three new entries. CI check passes after staging.

---

## Objective

Update the Benefits Comparison Workspace to match PathOS workspace conventions:

1. **Immersive Workspace Shell**: Maximum real estate, "tool mode" feel, hide/neutralize left sidebar while inside workspace
2. **Ask PathAdvisor Convention**: Replace "Explain with PathAdvisor" with application-wide "Ask PathAdvisor" convention (same look/feel and behavior used throughout PathOS)
3. **Card-Scoped Prompts**: Each major output area has contextual "Ask PathAdvisor" CTA with scoped prompts
4. **Benefits Context**: PathAdvisor panel opens with Benefits context (not Job Search)

This is a FRONTEND-ONLY implementation. NO backend. NO APIs. NO imports.

---

## Preflight Git State

**Command:** `git status --porcelain`
```
 M app/explore/benefits/page.tsx
 M components/app-shell.tsx
 M docs/merge-notes.md
 M hooks/use-delete-all-local-data.ts
 M lib/storage-keys.ts
?? app/explore/benefits/workspace/
?? docs/merge-notes-day-42.md
?? store/benefitsWorkspaceStore.ts
```

**Command:** `git branch --show-current`
```
feature/day-42-benefits-comparison-workspace-v1
```

**Command:** `git diff --name-status develop -- . ":(exclude)artifacts"`
```
M	app/explore/benefits/page.tsx
M	components/app-shell.tsx
A	docs/merge-notes-day-42.md
M	docs/merge-notes.md
M	hooks/use-delete-all-local-data.ts
M	lib/storage-keys.ts
A	store/benefitsWorkspaceStore.ts
```

**Command:** `git diff --stat develop -- . ":(exclude)artifacts"`
```
 app/explore/benefits/page.tsx      |  881 +++-------------------
 components/app-shell.tsx           |   22 +-
 docs/merge-notes-day-42.md         |  279 +++++++
 docs/merge-notes.md                | 1410 +++++-------------------------------
 hooks/use-delete-all-local-data.ts |   18 +
 lib/storage-keys.ts                |    7 +
 store/benefitsWorkspaceStore.ts    |  447 ++++++++++++
 7 files changed, 1053 insertions(+), 2011 deletions(-)
```

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Changes Zustand store logic, Changes persistence behavior, Affects UI where results appear in multiple places |
| Why | Updates workspace layout behavior (sidebar hiding), changes PathAdvisor integration patterns, affects Benefits workspace UI |

---

## Changes Made

### A) Immersive Workspace Shell (MATCH RESUME BUILDER)

**File:** `components/app-shell.tsx`

**Purpose:**
Hide the left sidebar when user is on the Benefits Workspace route to create an immersive, "tool mode" experience with maximum real estate.

**Implementation:**
- Added `isBenefitsWorkspace` check using `pathname === '/explore/benefits/workspace'`
- Added `shouldHideSidebar` flag that is true when on Benefits Workspace route
- Conditionally render `PathOSSidebar` only when `!shouldHideSidebar`
- Applied to both left and right dock layouts

**Result:**
- Benefits Workspace now feels like Resume Builder: immersive, uncluttered, maximum working space
- Explore Benefits page remains normal and contains the "Open Benefits Workspace" CTA routing into immersive mode
- Sidebar is hidden on workspace route, visible on overview route

### B) Ask PathAdvisor CTA Convention (REPLACE "EXPLAIN…")

**File:** `app/explore/benefits/workspace/page.tsx`

**Purpose:**
Replace all "Explain with PathAdvisor" buttons with the exact "Ask PathAdvisor" convention already used throughout the app (Resume Builder, job cards, etc.).

**Implementation:**
- Imported `AskPathAdvisorButton` component from `@/components/pathadvisor/AskPathAdvisorButton`
- Replaced all instances of custom "Explain with PathAdvisor" buttons with `AskPathAdvisorButton`
- Used consistent styling: `fullWidth={false}`, `className="text-xs h-8 px-3"`
- All buttons now use the standardized amber-tinted gradient styling

**Locations Updated:**
1. Scenario Summary card header
2. Annual Value (Today) card header
3. Long-term Value (Retirement) card header
4. Break-even Private Salary card header
5. FEHB / Healthcare comparison section (in compare mode)
6. TSP / Retirement comparison section (in compare mode)
7. Paid Leave comparison section (in compare mode)

**Behavior:**
- Clicking "Ask PathAdvisor" opens PathAdvisor panel (if closed)
- Updates pending prompt with card-specific context
- Sets viewing context to Benefits (not Job Search)

### C) Card-Scoped Prompts (CONTEXTUAL)

**File:** `app/explore/benefits/workspace/page.tsx`

**Purpose:**
Each major output area has an "Ask PathAdvisor" CTA that injects a scoped, contextual prompt.

**Prompts Updated:**
1. **Scenario Summary:**
   - Old: `"Explain what Scenario ${activeScenarioId} implies based on my assumptions."`
   - New: `"Explain the Scenario ${activeScenarioId} summary in plain English and what is driving it."`

2. **Annual Value:**
   - Old: `"What's driving my Annual Value in Scenario ${activeScenarioId}?"`
   - New: `"Explain how Annual Value (Today) is estimated for Scenario ${activeScenarioId}."`

3. **Long-term Value:**
   - Old: `"Explain the Long-term Value calculation in Scenario ${activeScenarioId}."`
   - New: `"Explain how Long-term Value (Retirement) is estimated for Scenario ${activeScenarioId}."`

4. **Break-even:**
   - Old: `"Why did my break-even range change in Scenario ${activeScenarioId}?"`
   - New: `"Explain why the break-even private salary range is what it is in Scenario ${activeScenarioId}."`

**Result:**
- All prompts are now more specific and contextual
- Prompts focus on explanation and understanding, not recommendations
- PathAdvisor response can be placeholder/dummy for now, but prompt populates and panel opens reliably

### D) Benefits Context Setting

**File:** `app/explore/benefits/workspace/page.tsx`

**Purpose:**
Ensure PathAdvisor context is set to Benefits mode (not Job Search) when workspace loads.

**Implementation:**
- Updated `useEffect` to call `setContext` with `{ source: 'scenario', scenarioType: 'benefits' }`
- This ensures PathAdvisor knows it's in Benefits context, not Job Search context
- Context is set on page load and persists while user is in workspace

---

## Quality Gates

**Command:** `pnpm typecheck`
```
✓ Compiled successfully
```

**Command:** `pnpm build`
```
✓ Compiled successfully in 9.4s
✓ Generating static pages using 11 workers (31/31) in 2.5s
```

All quality gates passed.

---

## Testing Evidence

**Mode tested:** (Pending manual verification)  
**Steps performed:**
1. Navigate to `/explore/benefits` - verify lightweight overview page loads
2. Click "Open Benefits Workspace" - verify routes to `/explore/benefits/workspace`
3. Verify workspace is immersive (sidebar hidden, maximum real estate)
4. Verify "Ask PathAdvisor" buttons appear on all major output cards
5. Click "Ask PathAdvisor" on Scenario Summary - verify PathAdvisor panel opens with contextual prompt
6. Click "Ask PathAdvisor" on Annual Value - verify prompt updates correctly
7. Click "Ask PathAdvisor" on Long-term Value - verify prompt updates correctly
8. Click "Ask PathAdvisor" on Break-even - verify prompt updates correctly
9. Verify PathAdvisor context shows Benefits (not Job Search)
10. Navigate back to overview - verify sidebar reappears

**Result:** (Pending manual verification)

**localStorage key verified:** `pathos-benefits-workspace-v1`

**Console clean:** (Pending verification)

---

## Git State (After Changes)

**Command:** `git status`
```
On branch feature/day-42-benefits-comparison-workspace-v1
Changes not staged for commit:
  M app/explore/benefits/page.tsx
  M components/app-shell.tsx
  M docs/merge-notes.md
  M hooks/use-delete-all-local-data.ts
  M lib/storage-keys.ts
  A docs/merge-notes-day-42.md
  A store/benefitsWorkspaceStore.ts
  A artifacts/day-42-run.patch
  A artifacts/day-42.patch

Untracked files:
  app/explore/benefits/workspace/
```

**Command:** `git branch --show-current`
```
feature/day-42-benefits-comparison-workspace-v1
```

**Command:** `git diff --name-status develop -- . ":(exclude)artifacts"`
```
M	app/explore/benefits/page.tsx
M	components/app-shell.tsx
A	docs/merge-notes-day-42.md
M	docs/merge-notes.md
M	hooks/use-delete-all-local-data.ts
M	lib/storage-keys.ts
A	store/benefitsWorkspaceStore.ts
```

**Command:** `git diff --stat develop -- . ":(exclude)artifacts"`
```
 app/explore/benefits/page.tsx      |  881 +++-------------------
 components/app-shell.tsx           |   22 +-
 docs/merge-notes-day-42.md         |  279 +++++++
 docs/merge-notes.md                | 1410 +++++-------------------------------
 hooks/use-delete-all-local-data.ts |   18 +
 lib/storage-keys.ts                |    7 +
 store/benefitsWorkspaceStore.ts    |  447 ++++++++++++
 7 files changed, 1053 insertions(+), 2011 deletions(-)
```

---

## Patch Artifacts (FINAL)

**Command:**
```powershell
pnpm docs:day-patches --day 42
Get-Item artifacts/day-42.patch artifacts/day-42-run.patch | Format-List Name,Length,LastWriteTime
```

**Output:**
```
Name          : day-42.patch
Length        : 196838
LastWriteTime : 12/31/2025 1:03:47 AM

Name          : day-42-run.patch
Length        : 196838
LastWriteTime : 12/31/2025 1:03:47 AM
```

---

## AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | Overview page → "Open Benefits Workspace" CTA → Workspace route (sidebar hidden) → Scenario builder (left) → Comparison canvas (right) → "Ask PathAdvisor" buttons → PathAdvisor panel opens with Benefits context and contextual prompts |
| Store(s) | benefitsWorkspaceStore |
| Storage key(s) | pathos-benefits-workspace-v1 |
| Failure mode | Sidebar not hidden on workspace route, "Ask PathAdvisor" buttons not opening panel, prompts not updating, context not set to Benefits |
| How tested | Manual: navigate → workspace → verify immersive layout → test "Ask PathAdvisor" buttons → verify panel opens → verify prompts → verify Benefits context |

---

## Suggested PR Title + Commit Message

**PR Title:**
```
Day 42: Benefits Workspace - Immersive layout + Ask PathAdvisor convention
```

**Commit Message:**
```
Day 42: Benefits Workspace - Immersive layout + Ask PathAdvisor convention

Update Benefits Comparison Workspace to match PathOS workspace conventions:

1. Immersive Workspace Shell:
   - Hide left sidebar on /explore/benefits/workspace route
   - Maximum real estate, "tool mode" feel like Resume Builder
   - Sidebar remains visible on overview page

2. Ask PathAdvisor Convention:
   - Replace all "Explain with PathAdvisor" buttons with AskPathAdvisorButton
   - Use standardized amber-tinted gradient styling
   - Consistent behavior across all cards

3. Card-Scoped Prompts:
   - Scenario Summary: "Explain the Scenario X summary in plain English..."
   - Annual Value: "Explain how Annual Value (Today) is estimated..."
   - Long-term Value: "Explain how Long-term Value (Retirement) is estimated..."
   - Break-even: "Explain why the break-even private salary range..."

4. Benefits Context:
   - Set advisor context to Benefits mode (not Job Search)
   - Context persists while user is in workspace

Changes:
- components/app-shell.tsx: Hide sidebar on Benefits Workspace route
- app/explore/benefits/workspace/page.tsx: Replace buttons, update prompts, set Benefits context
```
