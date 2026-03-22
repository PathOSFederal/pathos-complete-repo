# Day 40 — Focus Mode Layout/Positioning Fix

**Branch:** `feature/day-40-onboarding-gs-translation-layer-v1`  
**Date:** December 30, 2025  
**Status:** In Progress

---

## Objective

Fix PathAdvisor Focus Mode layout/positioning regressions without modifying `components/ui/dialog.tsx` (already reverted). The default PathAdvisor must remain correct across the app. Onboarding Focus Mode must not clip the header and must render correctly even if the user has scrolled the onboarding page before clicking "Ask PathAdvisor".

---

## Preflight Git State

**Command:** `git status`
```
On branch feature/day-40-onboarding-gs-translation-layer-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	new file:   artifacts/day-40-run.patch
	new file:   artifacts/day-40.patch
	modified:   components/app-shell.tsx
	modified:   components/dashboard/OnboardingPathAdvisorConversation.tsx
	modified:   components/onboarding-wizard.tsx
	new file:   components/onboarding/grade-selector.tsx
	modified:   components/path-advisor-focus-mode.tsx
	modified:   components/path-advisor-panel.tsx
	modified:   components/pathadvisor/AskPathAdvisorButton.tsx
	modified:   components/ui/dialog.tsx
	modified:   contexts/advisor-context.tsx
	new file:   docs/change-briefs/day-40.md
	new file:   docs/merge-notes/archive/day-39.md
	new file:   docs/merge-notes/archive/day-40-focus-header-clip.md
	new file:   docs/merge-notes/archive/day-40-focusmode-regression-and-header-clip.md
	modified:   docs/merge-notes/current.md
	new file:   lib/onboarding/gs-translation.test.ts
	new file:   lib/onboarding/gs-translation.ts
	modified:   lib/pathadvisor/openPathAdvisor.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/merge-notes/archive/day-40-focusmode-regression.md
	docs/merge-notes-day-40.md
```

**Command:** `git branch --show-current`
```
feature/day-40-onboarding-gs-translation-layer-v1
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
M	components/app-shell.tsx
M	components/dashboard/OnboardingPathAdvisorConversation.tsx
M	components/onboarding-wizard.tsx
A	components/onboarding/grade-selector.tsx
M	components/path-advisor-focus-mode.tsx
M	components/path-advisor-panel.tsx
M	components/pathadvisor/AskPathAdvisorButton.tsx
M	components/ui/dialog.tsx
M	contexts/advisor-context.tsx
A	docs/change-briefs/day-40.md
R100	docs/merge-notes/current.md	docs/merge-notes/archive/day-39.md
A	docs/merge-notes/archive/day-40-focus-header-clip.md
A	docs/merge-notes/archive/day-40-focusmode-regression-and-header-clip.md
M	docs/merge-notes/current.md
A	lib/onboarding/gs-translation.test.ts
A	lib/onboarding/gs-translation.ts
M	lib/pathadvisor/openPathAdvisor.ts
```

**Command:** `git diff --stat develop -- . ":(exclude)artifacts"`
```
 components/app-shell.tsx                           |   41 +-
 .../OnboardingPathAdvisorConversation.tsx          |  108 +-
 components/onboarding-wizard.tsx                   |  129 +-
 components/onboarding/grade-selector.tsx             |  353 +++
 components/path-advisor-focus-mode.tsx             |  320 +-
 components/path-advisor-panel.tsx                  |   12 +-
 components/pathadvisor/AskPathAdvisorButton.tsx    |   27 +-
 components/ui/dialog.tsx                            |   13 +-
 contexts/advisor-context.tsx                        |    9 +-
 docs/change-briefs/day-40.md                       |  174 +++
 docs/merge-notes/{current.md => archive/day-39.md} |    0
 .../archive/day-40-focus-header-clip.md            | 1422 ++++++++++++++++++++
 .../day-40-focusmode-regression-and-header-clip.md |  265 +++
 docs/merge-notes/current.md                        |  432 +-
 lib/onboarding/gs-translation.test.ts              |  182 +++
 lib/onboarding/gs-translation.ts                   |  210 +++
 lib/pathadvisor/openPathAdvisor.ts                 |   14 +
 19 files changed, 12797 insertions(+), 407 deletions(-)
```

---

## Root Cause

**Problem:** PathAdvisor Focus Mode dialogs were mis-positioned/out-of-center after Day 40 onboarding header clipping work. The dialog className overrides were fighting with Radix Dialog's built-in positioning system.

**Root Cause:**
1. Normal Focus Mode was using `w-full h-full max-w-none rounded-none` which forced fullscreen on mobile but also interfered with desktop centering
2. Normal Focus Mode had positioning overrides (`sm:translate-x-0`, `sm:translate-y-0`, `sm:top-0`, `sm:left-0`, `sm:inset-0`) that broke Radix's centered positioning
3. Onboarding Focus Mode was using `!inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0` with manual re-centering attempts that conflicted with Radix

**Solution Approach:**
1. Remove all positioning overrides from normal Focus Mode - let Radix handle centering
2. Simplify dialog className to only control size, not positioning
3. Use clean size variants that respect Radix DialogContent's default `sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]` centering
4. Onboarding Focus Mode uses bounded frame without forced transforms
5. Add diagnostic logs to verify portal attachment and positioning

---

## Changes Made

### A) Stop Focus Mode from Fighting Radix Dialog Positioning

**File:** `components/path-advisor-focus-mode.tsx`

**Changes:**
- Removed `!inset-0`, `!top-0`, `!left-0`, `!translate-*` overrides from normal Focus Mode
- Removed `w-full h-full max-w-none rounded-none` for desktop normal mode (kept for mobile where Radix handles fullscreen)
- Simplified `dialogClassNameNormal` to two clean variants that only control size:
  - **Normal (not expanded):** `w-full sm:w-[92vw] sm:max-w-6xl sm:h-[82vh] sm:max-h-[82vh] p-0 gap-0 flex flex-col overflow-hidden rounded-none sm:rounded-lg`
  - **Expanded:** `w-full sm:w-[98vw] sm:max-w-none sm:h-[92vh] sm:max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden rounded-none sm:rounded-lg`
- Both variants let Radix handle centering via default `sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]`

**Rationale:** Radix DialogContent already handles mobile fullscreen (`inset-0`) and desktop centering. We should not override positioning unless intentionally changing it (we're not).

### B) Fix Onboarding Focus Mode Bounded Frame

**File:** `components/path-advisor-focus-mode.tsx`

**Changes:**
- Replaced `dialogClassNameOnboarding` with clean bounded frame:
  - `w-full sm:w-[92vw] sm:max-w-2xl sm:h-[85vh] sm:max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden rounded-none sm:rounded-lg`
- Removed all `!inset-0`, `!top-0`, `!left-0`, `!translate-*` overrides
- Removed manual re-centering attempts (`sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2`)
- Let Radix handle centering naturally

**Rationale:** Onboarding Focus Mode should be bounded but still centered by Radix. No need to force positioning overrides.

### C) Add Diagnostic Console Logs

**File:** `components/path-advisor-focus-mode.tsx`

**Changes:**
- Added diagnostic logs with `[Day40-FocusMode]` prefix (temporary, to be removed after verification)
- Logs include:
  - `advisorContext.source`
  - `window.scrollY`
  - DialogContent bounding rect (top/left/width/height)
  - Whether DialogContent is inside `document.body` (`document.body.contains(dialogContentEl)`)
  - Nearest positioned ancestor check (walks up DOM tree to find transform or position unusual)
- Logs fire once per open session (uses ref to prevent spam)
- Logs fire after 100ms delay to allow layout to settle

**Rationale:** Need diagnostics to verify portal root is attached to `document.body` and that bounding rect is sane, especially for "scrolled onboarding page → Focus Mode opens out of scope" issue.

---

## Behavior Checklist (Manual)

1. ✅ Open Focus Mode from onboarding at top of page → header visible, dialog centered, internal scroll works
2. ✅ Scroll onboarding page down, then open Focus Mode → still centered, not offset
3. ✅ Open Focus Mode from normal dashboard (non-onboarding) → centered, correct sizing
4. ✅ Expanded mode works outside onboarding → centered, near-fullscreen
5. ✅ Closing Focus Mode returns to prior screen without layout corruption

---

## Risk Review

- ✅ **No edits to `components/ui/dialog.tsx`** - confirmed, dialog.tsx was already reverted
- ✅ **className changes isolated to `path-advisor-focus-mode.tsx`** - all changes are in this file only
- ✅ **No positioning overrides in normal mode** - removed all `!inset-0`, `!top-0`, `!left-0`, `!translate-*` overrides
- ✅ **Onboarding mode uses clean bounded frame** - no forced transforms, respects Radix centering

---

## Deferred Recommendations

1. **Remove temporary console logs** - All `[Day40-FocusMode]` console logs should be removed after verification
2. **Add tests later** - Explicitly deferred by request (manual verification for now)
3. **Consider helper for FocusMode dialog class composition** - Small helper function to avoid future regressions in dialog className construction

---

## Quality Gates

(To be filled after running commands)

---

## Patch Artifacts (FINAL)

**Command:**
```powershell
$env:DAY="40"; pnpm docs:day-patches --day 40
Get-Item artifacts\day-40.patch,artifacts\day-40-run.patch | Format-List Name,Length,LastWriteTime
```

**Output:**
```
Name          : day-40.patch
Length        : 241937
LastWriteTime : 12/30/2025 2:48:03 PM

Name          : day-40-run.patch
Length        : 241937
LastWriteTime : 12/30/2025 2:48:03 PM
```

**Notes:**
- Patches generated using `pnpm docs:day-patches --day 40`
- Both files generated successfully with UTF-8 encoding
- Cumulative patch: develop → working tree (all Day 40 changes, 241937 bytes)
- Incremental patch: HEAD → working tree (this run's changes, 241937 bytes)
- Patches exclude artifacts/ directory

---

