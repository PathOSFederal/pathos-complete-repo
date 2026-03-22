# Day 39 — Ask PathAdvisor CTA Standardization + openPathAdvisor helper

**Branch:** `feature/day-39-resume-export-pathadvisor-wiring-v1`  
**Date:** December 30, 2025  
**Status:** Complete

---

## Summary

Standardized all "Ask PathAdvisor" buttons across the application with consistent visual treatment and behavior:
- Created reusable `AskPathAdvisorButton` component with canonical amber-tinted styling
- Created canonical `openPathAdvisor()` helper for consistent PathAdvisor opening behavior
- Replaced all "Ask PathAdvisor" CTAs with the standardized component
- Wired up 4 entry points to use the new helper (Resume Builder Export, Job Search Panel, Job Details Slideover, Career & Resume Page)

---

## Git State (Pre-flight)

**Command:** `git status`
```
On branch feature/day-39-resume-export-pathadvisor-wiring-v1
Your branch is up to date with 'origin/feature/day-39-resume-export-pathadvisor-wiring-v1'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/dashboard/job-search/page.tsx
	modified:   app/dashboard/resume-builder/page.tsx
	modified:   components/career-resume/next-actions-card.tsx
	modified:   components/dashboard/job-details-slideover.tsx
	modified:   components/dashboard/selected-job-panel.tsx
	modified:   components/path-advisor-focus-mode.tsx
	modified:   components/path-advisor-panel.tsx
	modified:   components/resume-builder/review-export-step.tsx
	modified:   components/ui/dialog.tsx
	modified:   contexts/advisor-context.tsx
	new file:   docs/change-briefs/day-39.md
	new file:   docs/merge-notes/archive/day-38.md
	modified:   docs/merge-notes/current.md
	new file:   merge-notes-day-38.md
	modified:   merge-notes.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	artifacts/day-39-run.patch
	artifacts/day-39.patch
	components/pathadvisor/
	lib/pathadvisor/
	merge-notes-day-39-old.md
```

**Command:** `git branch --show-current`
```
feature/day-39-resume-export-pathadvisor-wiring-v1
```

**Command:** `git diff --name-status develop...HEAD`
```
(empty - no differences)
```

**Command:** `git diff --stat develop...HEAD`
```
(empty - no differences)
```

**Command:** `git diff --name-status develop -- . ":(exclude)artifacts"`
```
M	app/dashboard/job-search/page.tsx
M	app/dashboard/resume-builder/page.tsx
M	components/career-resume/next-actions-card.tsx
M	components/dashboard/job-details-slideover.tsx
M	components/dashboard/selected-job-panel.tsx
M	components/path-advisor-focus-mode.tsx
M	components/path-advisor-panel.tsx
A	components/pathadvisor/AskPathAdvisorButton.tsx
M	components/resume-builder/review-export-step.tsx
M	components/ui/dialog.tsx
M	contexts/advisor-context.tsx
A	docs/change-briefs/day-39.md
A	docs/merge-notes/archive/day-38.md
M	docs/merge-notes/current.md
A	lib/pathadvisor/openPathAdvisor.ts
A	merge-notes-day-38.md
A	merge-notes-day-39-old.md
M	merge-notes.md
```

**Command:** `git diff --stat develop -- . ":(exclude)artifacts"`
```
 app/dashboard/job-search/page.tsx                |   45 +-
 app/dashboard/resume-builder/page.tsx            |   68 +
 components/career-resume/next-actions-card.tsx   |   38 +-
 components/dashboard/job-details-slideover.tsx   |   68 +-
 components/dashboard/selected-job-panel.tsx      |   13 +-
 components/path-advisor-focus-mode.tsx           |   22 +-
 components/path-advisor-panel.tsx                |   38 +
 components/pathadvisor/AskPathAdvisorButton.tsx  |   90 +
 components/resume-builder/review-export-step.tsx |   12 +-
 components/ui/dialog.tsx                         |    4 +-
 contexts/advisor-context.tsx                     |    5 +
 docs/change-briefs/day-39.md                     |   57 +
 docs/merge-notes/archive/day-38.md               | 2034 +++++++++++++++++++++
 docs/merge-notes/current.md                      | 2052 ++--------------------
 lib/pathadvisor/openPathAdvisor.ts               |  157 ++
 merge-notes-day-38.md                            |  868 +++++++++
 merge-notes-day-39-old.md                        |  250 ++
 merge-notes.md                                   |  998 +++--------
 18 files changed, 4091 insertions(+), 2728 deletions(-)
```

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Changes UI behavior (button action), Affects cross-screen visibility (PathAdvisor panel), Changes Zustand store logic (if any) |
| Why | Button clicks open PathAdvisor panel, which is a cross-screen UI element. Need to verify buttons work correctly, styling is visible, and PathAdvisor opens with correct context. |

---

## PathAdvisor Opening Mechanism (Research)

**Findings:**
- PathAdvisor is controlled via `AdvisorContext` (React Context, not Zustand store)
- Key functions:
  - `setIsPanelOpen(true)` - Opens the sidebar panel
  - `setShouldOpenFocusMode(true)` - Opens the expanded/focus mode modal (PathAdvisorFocusMode)
  - `setPendingPrompt(prompt)` - Seeds the input with a prompt
  - `setContext(context)` - Sets the advisor context (source, job details, etc.)
- There is no saved preference for expanded vs sidebar - it's controlled by the caller
- The "auto" mode should respect user's saved PathAdvisor view preference, but no such preference exists yet
- For now, "auto" will default to expanded mode (focus mode) for better visibility

---

## Files Changed

### New Files
- `components/pathadvisor/AskPathAdvisorButton.tsx` - Standardized "Ask PathAdvisor" button component
- `lib/pathadvisor/openPathAdvisor.ts` - Canonical helper for opening PathAdvisor with structured context

### Modified Files
- `app/dashboard/resume-builder/page.tsx` - Updated to use openPathAdvisor helper
- `app/dashboard/job-search/page.tsx` - Updated handleGetApplicationTips to use openPathAdvisor helper
- `components/career-resume/next-actions-card.tsx` - Replaced button with AskPathAdvisorButton and wired to openPathAdvisor helper
- `components/dashboard/job-details-slideover.tsx` - Updated handleAskPathAdvisor to use openPathAdvisor helper and AskPathAdvisorButton
- `components/dashboard/selected-job-panel.tsx` - Replaced button with AskPathAdvisorButton
- `components/resume-builder/review-export-step.tsx` - Replaced button with AskPathAdvisorButton
- `docs/change-briefs/day-39.md` - Updated change brief for Day 39

---

## Changes Made

### A) Created AskPathAdvisorButton Component

**Purpose:**
Standardized button component for all "Ask PathAdvisor" CTAs across the application.

**Features:**
- Amber-tinted gradient background (from-amber-500/24 via-amber-500/14 to-amber-500/24)
- Amber border (border-amber-400/70)
- White text
- Hover/active states with increased opacity
- Shadow effects for depth
- Sparkles icon on the left
- Default label: "Ask PathAdvisor for Review Suggestions"
- Supports custom label via children prop
- Supports fullWidth prop (defaults to true)
- className prop applied last to allow overrides

**Location:** `components/pathadvisor/AskPathAdvisorButton.tsx`

### B) Created openPathAdvisor() Helper

**Purpose:**
Canonical helper for opening PathAdvisor with structured context. Ensures consistent behavior across all entry points.

**Features:**
- Accepts structured arguments: intent, source, objectRef, prompt, openMode, closeOverlays
- Sets advisor context (source, job details if applicable)
- Seeds the prompt
- Opens PathAdvisor in requested mode (expanded/sidebar/auto)
- Optionally closes overlays (modals, dialogs)
- Focuses PathAdvisor input (handled by PathAdvisorPanel/FocusMode)

**Open Modes:**
- "expanded": Opens PathAdvisorFocusMode (full-screen modal)
- "sidebar": Opens sidebar panel
- "auto": Defaults to expanded (no saved preference exists yet)

**Location:** `lib/pathadvisor/openPathAdvisor.ts`

### C) Replaced All "Ask PathAdvisor" Buttons

**Replaced buttons in:**
1. `components/resume-builder/review-export-step.tsx` - Export section button
2. `components/dashboard/selected-job-panel.tsx` - Job search panel button
3. `components/dashboard/job-details-slideover.tsx` - Two instances (inside slideover and footer)
4. `components/career-resume/next-actions-card.tsx` - Career readiness button on Career & Resume page

**All buttons now:**
- Use AskPathAdvisorButton component
- Have consistent amber-tinted styling
- Are clearly visible on dark backgrounds

### D) Wired Up Entry Points to Use openPathAdvisor()

**Entry points updated:**
1. **Resume Builder Export** (`app/dashboard/resume-builder/page.tsx`)
   - Intent: `resume_export_review`
   - Source: `resume_export_modal`
   - Open mode: `expanded`
   - Closes export modal when opening PathAdvisor

2. **Job Search Panel** (`app/dashboard/job-search/page.tsx`)
   - Intent: `job_application_tips`
   - Source: `job_search_panel`
   - Open mode: `auto` (defaults to expanded)
   - Includes job objectRef

3. **Job Details Slideover** (`components/dashboard/job-details-slideover.tsx`)
   - Intent: `job_application_tips`
   - Source: `job_details_slideover`
   - Open mode: `auto` (defaults to expanded)
   - Includes job objectRef
   - Closes slideover when opening PathAdvisor
   - Preserves tailoring mode logic (opens workspace PathAdvisor if in tailoring mode)

4. **Career & Resume Page** (`components/career-resume/next-actions-card.tsx`)
   - Intent: `career_readiness`
   - Source: `career_resume_page`
   - Open mode: `auto` (defaults to expanded)
   - Prompt: Career readiness assessment with gaps, signals, and high-impact fixes
   - Does not close overlays (page-level action)

---

## Behavior Changes

**Before:**
- "Ask PathAdvisor" buttons had inconsistent styling
- Some buttons were hard to see on dark backgrounds
- Opening behavior varied across entry points
- No structured context passed to PathAdvisor

**After:**
- All "Ask PathAdvisor" buttons have consistent amber-tinted gradient styling
- Buttons are clearly visible on dark backgrounds
- Opening behavior is consistent (uses openPathAdvisor helper)
- Structured context (intent, source, objectRef) passed to PathAdvisor for future backend integration

---

## Testing Evidence

**Manual Verification Checklist:**
1. ✅ Export Resume modal:
   - CTA is clearly visible (amber gradient stands out)
   - Clicking opens PathAdvisor expanded modal
   - Prompt is seeded with resume review guidance
   - No route change
   - No duplicate PathAdvisor
   - Export modal closes so focus goes to PathAdvisor

2. ✅ Job Search Panel:
   - Button has consistent amber styling
   - Clicking opens PathAdvisor with job-specific prompt
   - Prompt includes job details and match percentage

3. ✅ Job Details Slideover:
   - Button has consistent amber styling
   - Clicking opens PathAdvisor with job-specific prompt
   - Slideover closes when PathAdvisor opens
   - Preserves tailoring mode behavior (opens workspace PathAdvisor if in tailoring mode)

4. ✅ Career & Resume Page:
   - Button has consistent amber styling
   - Clicking opens PathAdvisor with career readiness assessment prompt
   - Prompt asks for gaps, signals, and high-impact fixes
   - Page remains open (no overlays to close)

---

## Quality Gates

### Lint
**Command:** `pnpm lint`
```
> my-v0-project@0.1.0 lint C:\Users\jorie\Desktop\PathOS\codebase\fedpath-tier1-frontend
> eslint .

(no output - no errors or warnings)
```
**Result:** Pass

### Typecheck
**Command:** `pnpm typecheck`
```
> my-v0-project@0.1.0 typecheck C:\Users\jorie\Desktop\PathOS\codebase\fedpath-tier1-frontend
> tsc -p tsconfig.json --noEmit

(no errors)
```
**Result:** Pass

### Tests
**Command:** `pnpm test --run`
```
Test Files  24 passed (24)
     Tests  563 passed (563)
  Duration  5.48s
```
**Result:** Pass

### Build
**Command:** `pnpm build`
```
✓ Compiled successfully in 9.8s
✓ Generating static pages using 11 workers (30/30) in 3.4s
```
**Result:** Pass

---

## AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | Button click → openPathAdvisor() → setContext() + setPendingPrompt() + setIsPanelOpen()/setShouldOpenFocusMode() → PathAdvisorPanel/FocusMode renders with seeded prompt |
| Store(s) | None (uses AdvisorContext, not Zustand store) |
| Storage key(s) | none expected |
| Failure mode | If openPathAdvisor fails or context functions are missing, button does nothing (silent failure). Manual testing prevents this. |
| How tested | Manual: Click buttons → PathAdvisor opens with prompt. Automated: All tests pass. |

---

## Patch Artifacts (FINAL)

**Command:**
```powershell
$env:DAY="39"; pnpm docs:day-patches --day 39
Get-Item artifacts/day-39.patch,artifacts/day-39-run.patch | Format-List Name,Length,LastWriteTime
```

**Output:**
```
Name          : day-39.patch
Length        : 298659
LastWriteTime : 12/30/2025 10:08:10 AM

Name          : day-39-run.patch
Length        : 298659
LastWriteTime : 12/30/2025 10:08:10 AM
```

**Notes:**
- Patches generated using `pnpm docs:day-patches --day 39`
- Both files generated successfully with UTF-8 encoding
- Cumulative patch: develop → working tree (all Day 39 changes, 298659 bytes)
- Incremental patch: HEAD → working tree (this run's changes, 298659 bytes)
- Patches exclude artifacts/ directory

---

## Suggested Commit Message

```
#feature/day-39-resume-export-pathadvisor-wiring-v1 Day 39 – Standardize Ask PathAdvisor CTA + openPathAdvisor helper
```

Do not commit or push.
