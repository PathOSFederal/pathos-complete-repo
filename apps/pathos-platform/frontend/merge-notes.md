# Current run — Day 73 run 6 (Saved Jobs mock-parity: solid orange, white text)

**Branch:** `savedJobsPage`  
**git branch --show-current:** savedJobsPage  
**git status:** (working tree) — modified: docs, merge-notes.md, packages/core (index, job-types), packages/ui (AskPathAdvisorButton, SavedJobsScreen, PathAdvisorCard, PathAdvisorRail, pathAdvisorScreenOverridesStore); new: AGENTS.md, docs/change-briefs, docs/workflow, scripts/harden.ps1, tasks.  
**git diff --name-status develop...HEAD:** (empty — no commits ahead of develop on this branch.)  
**git diff --name-status (working tree):** A AGENTS.md, M docs/ai/*, A docs/change-briefs/*, M docs/merge-notes/current.md, A docs/workflow/*, M merge-notes.md, M packages/core/*, M packages/ui/src/components/AskPathAdvisorButton.tsx, M packages/ui/src/screens/SavedJobsScreen.tsx, M packages/ui/src/shell/PathAdvisorCard.tsx, M packages/ui/src/shell/PathAdvisorRail.tsx, M packages/ui/src/stores/pathAdvisorScreenOverridesStore.ts, A scripts/harden.ps1, A tasks/*.  
**git diff --stat develop...HEAD:** (empty.)  
**git diff --stat (working tree):** 20 files changed, 2391 insertions(+), 906 deletions(-).  
**Patch artifacts:** artifacts/day-73.patch (cumulative vs develop...HEAD), artifacts/day-73-this-run.patch (incremental = working tree diff). Full log in docs/merge-notes/current.md.

---

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

---

## Day 39 Commit — Line Ending Fix and Patch Regeneration (2025-12-30)

### Goal
Fix CRLF warning for `.patch` files by enforcing LF line endings via `.gitattributes`, regenerate patch artifacts, and commit Day 39 changes.

### Changes Made
1. Created `.gitattributes` with rule: `*.patch text eol=lf`
2. Unstaged existing patch artifacts
3. Regenerated patch artifacts using `pnpm docs:day-patches --day 39`
4. Staged files in controlled order (code → docs → artifacts)
5. Committed all changes locally (no push)

### Commands Run

**Step 1 — Current State:**
```bash
git status
git branch --show-current
git diff --stat
```
- Confirmed on branch: `feature/day-39-resume-export-pathadvisor-wiring-v1`
- Patch files existed and were previously staged

**Step 2 — Create .gitattributes:**
```bash
# Created .gitattributes with: *.patch text eol=lf
git add .gitattributes
```

**Step 3 — Regenerate Patches:**
```bash
git config --get core.autocrlf
# Output: true (autocrlf enabled)

git restore --staged artifacts/day-39.patch artifacts/day-39-run.patch
pnpm docs:day-patches --day 39
```
**Output:**
```
[gen-day-patches] Written: artifacts/day-39.patch (309230 bytes)
[gen-day-patches] Written: artifacts/day-39-run.patch (309230 bytes)
✓ Day 39 patch artifacts generated successfully
```

**Step 4 — Stage Files:**
```bash
# Staged code files first
git add app/dashboard/job-search/page.tsx app/dashboard/resume-builder/page.tsx components/career-resume/next-actions-card.tsx components/dashboard/job-details-slideover.tsx components/dashboard/selected-job-panel.tsx components/path-advisor-focus-mode.tsx components/path-advisor-panel.tsx components/pathadvisor/AskPathAdvisorButton.tsx components/resume-builder/review-export-step.tsx components/ui/dialog.tsx contexts/advisor-context.tsx lib/pathadvisor/openPathAdvisor.ts

# Staged docs
git add docs/change-briefs/day-39.md docs/merge-notes/archive/day-38.md docs/merge-notes/current.md merge-notes.md merge-notes-day-38.md merge-notes-day-39-old.md

# Staged artifacts last
git add artifacts/day-39.patch artifacts/day-39-run.patch
```

**Step 5 — Validation:**
```bash
git diff --cached --stat
```
**Output:** No CRLF warnings present ✓

**Step 6 — Commit:**
```bash
git commit -m '#feature/day-39-resume-export-pathadvisor-wiring-v1 Day 39 – Standardize Ask PathAdvisor CTA + openPathAdvisor helper'
```
**Output:**
```
[feature/day-39-resume-export-pathadvisor-wiring-v1 9bab638] #feature/day-39-resume-export-pathadvisor-wiring-v1 Day 39 – Standardize Ask PathAdvisor CTA + openPathAdvisor helper
 21 files changed, 16559 insertions(+), 2963 deletions(-)
```

**Step 7 — Post-commit Verification:**
```bash
git status
# Output: nothing to commit, working tree clean

git log -1 --oneline
# Output: 9bab638 #feature/day-39-resume-export-pathadvisor-wiring-v1 Day 39 – Standardize Ask PathAdvisor CTA + openPathAdvisor helper

git fetch origin
git diff --stat origin/develop...HEAD
```
**Output:**
```
 21 files changed, 19214 insertions(+), 2716 deletions(-)
```
Shows Day 39 changes vs develop baseline ✓

### Results
- ✅ `.gitattributes` created and staged with LF rule for `.patch` files
- ✅ Patch artifacts regenerated (309230 bytes each)
- ✅ No CRLF warnings in `git diff --cached --stat`
- ✅ All files staged in correct order (code → docs → artifacts)
- ✅ Commit successful (commit hash: 9bab638)
- ✅ Working tree clean after commit
- ✅ Post-commit diff shows Day 39 changes vs develop

### Notes
- `core.autocrlf` is enabled (`true`), but `.gitattributes` rule ensures `.patch` files are stored with LF in the index
- Patch files were regenerated using the repo-standard generator script (`pnpm docs:day-patches --day 39`)
- Commit was made locally; no push performed as requested

**Commit:** 9bab638
**Branch:** feature/day-39-resume-export-pathadvisor-wiring-v1

---

# Day 46 — Desktop-First Front Door (Landing + Download + Trust Alignment)

**Branch:** `feature/day-46-desktop-front-door`  
**Date:** January 22, 2026  
**Status:** Complete

## Summary

- Replaced the root redirect with a desktop-first landing page that explains what PathOS is and is not.
- Added a guided `/download` page with OS placeholders and trust boundary reinforcement before installation.
- Enabled the Windows download button and linked it to the installer path.
- Allowed public landing and download routes to render without onboarding or app chrome.
- Aligned desktop trust boundary copy with the web front door.

## Why

- Make the desktop-first model obvious at first glance.
- Remove any implication that job search happens on the web.
- Keep trust language consistent from discovery to first-run.

## Files Touched

- `app/page.tsx`
- `app/download/page.tsx`
- `components/app-shell.tsx`
- `components/desktop/GuidedUsaJobsDesktopWorkspace.tsx`
- `docs/change-briefs/day-46.md`
- `merge-notes.md`

---

# Day 47 — Windows Installer Download Wiring (Follow-up)

**Branch:** `feature/day-47-desktop-repo-and-installer`  
**Date:** January 23, 2026  
**Status:** In progress

## Summary

- Added a realtime desktop dev loop that loads the local Next.js server.
- Added a packaged QA flow for the unpacked Windows executable.
- Documented the three desktop modes with exact PowerShell commands.

## Why

- Remove reinstall loops during desktop development.
- Enable QA on the packaged app without installing.
- Keep the public installer path stable for downloads.

## Notes

- Windows download button points to `/downloads/pathos-setup.exe` served from `public/downloads/pathos-setup.exe`.
- Verification: `curl -I http://localhost:3000/downloads/pathos-setup.exe` → `200`

## Files Touched

- `pathos-desktop/src/main.js`
- `pathos-desktop/package.json`
- `package.json`
- `docs/dev-docs/desktop-workflows.md`
- `docs/change-briefs/day-47.md`
- `docs/merge-notes/current.md`
- `README.md`

---

# Day 73 — Saved Jobs page mockup alignment

**Branch:** `savedJobsPage`  
**Date:** March 14, 2026  
**Status:** In progress

## Summary

Refined the PathOS Saved Jobs page (`/dashboard/saved-jobs`) to align with the approved mockup: header (prominent title, Search, Sort, Filter), five-metric strip (Total Saved, Ready to Apply, Needs Review, High Match, Recently Saved), left-pane list header and richer cards (status tag, match score, Apply Soon, Guided Apply + Remove on selected card), and detail pane (match score, PathOS Brief, Readiness & Considerations, "Why This May Be Worth Attention" callout, metadata pills). Added optional Job fields in core (matchScore, closeDate, telework, appointmentType, status) so the UI can display mockup structure when data exists. No backend or remote dependencies; local-first preserved.

## Git State (this run)

**Command:** `git status`
```
On branch savedJobsPage
Changes not staged for commit:
	modified:   docs/ai/prompt-header.md
	modified:   docs/ai/testing-standards.md
	modified:   packages/core/src/index.ts
	modified:   packages/core/src/job-types.ts
	modified:   packages/ui/src/screens/SavedJobsScreen.tsx
Untracked: AGENTS.md, docs/change-briefs/_template.md, docs/workflow/, scripts/harden.ps1, tasks/, etc.
```

**Command:** `git branch --show-current`
```
savedJobsPage
```

**Command:** `git diff --name-status develop...HEAD`
```
(empty if no commits on branch vs develop; working tree has changes vs develop)
```

**Command:** `git diff --stat develop`
```
M	docs/ai/prompt-header.md
M	docs/ai/testing-standards.md
M	packages/core/src/index.ts
M	packages/core/src/job-types.ts
M	packages/ui/src/screens/SavedJobsScreen.tsx
 5 files changed, 1154 insertions(+), 595 deletions(-)
```

## Patch Artifacts (FINAL)

- **Cumulative:** `artifacts/day-73.patch` (develop → working tree, excludes artifacts).
- **Incremental:** `artifacts/day-73-run.patch` (HEAD → working tree, excludes artifacts).

**Get-Item output:**
```
Name          : day-73.patch
Length        : 103518
LastWriteTime : 3/14/2026 11:54:19 AM

Name          : day-73-run.patch
Length        : 103518
LastWriteTime : 3/14/2026 11:54:19 AM
```

## Files changed (Saved Jobs task)

- `packages/core/src/job-types.ts` — Added optional Job fields: matchScore, closeDate, telework, appointmentType, status; SavedJobStatus type.
- `packages/core/src/index.ts` — Export SavedJobStatus.
- `packages/ui/src/screens/SavedJobsScreen.tsx` — Header (title, Filter, 5-metric strip), list header "X saved jobs.", SavedJobItem (status, match, Apply Soon, card actions), SavedJobDetails (PathOS Brief, Readiness, callout, metadata), handleStartGuidedApplyForId, handleRemoveId.
