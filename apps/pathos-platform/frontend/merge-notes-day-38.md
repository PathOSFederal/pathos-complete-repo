# Day 38 – Tailoring Workspace UX Polish

**Branch:** `feature/day-38-tailoring-workspace-overlay-v1`  
**Date:** December 25, 2025  
**Status:** Complete

---

## Summary

Final UX polish for Resume Builder Tailoring Workspace:
- Version Management: Save Version modal with name prompt, Manage Versions modal with rename/delete/select
- Guidance modal auto-closes when all items are dismissed
- Optional blue toast notifications for new guidance (toggle + persisted)
- Export modal width fixed (max-w-6xl)
- PathAdvisor dock button placement corrected (no overlap with close X)
- Focus View full resume modal added (button in header + click preview to open)
- **Day 38 Polish Fix**: Focus View has explicit Exit control and optional Save button, header toggle no longer overlaps close X
- **Day 38 Polish Fix**: Format toggle (USAJOBS/Traditional) does not auto-open Focus View
- **Day 38 Polish Fix**: Guidance panel Notifications toggle does not overlap close X
- **Day 38 Polish Fix**: Export modal "Ask PathAdvisor" opens PathAdvisor inside workspace (not behind it)
- **Day 38 Polish Fix**: PathAdvisor "Open large" replaces side panel (single instance mode, no duplicate advisors)

---

## Git State (Pre-flight)

**Command:** `git status`
```
On branch feature/day-38-tailoring-workspace-overlay-v1
Your branch is up to date with 'origin/feature/day-38-tailoring-workspace-overlay-v1'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   artifacts/day-38-run.patch
	modified:   artifacts/day-38.patch
	modified:   components/resume-builder/resume-editor-pane.tsx
	modified:   components/resume-builder/review-export-step.tsx
	modified:   components/resume-builder/tailoring-workspace.tsx
	modified:   components/resume-builder/version-cards.tsx
	modified:   components/ui/toast.tsx
	modified:   docs/change-briefs/day-38.md
	new file:   docs/merge-notes/archive/merge-notes-day-38.md
	new file:   merge-notes.md
```

**Command:** `git branch --show-current`
```
feature/day-38-tailoring-workspace-overlay-v1
```

**Command:** `git diff --name-status develop...HEAD`
```
M	app/api/pathadvisor/insights/route.ts
M	app/dashboard/resume-builder/page.tsx
M	app/import/components/ActivityFeed.tsx
M	app/import/components/ReminderEditor.tsx
M	app/import/components/TaskList.tsx
A	artifacts/day-38-run.patch
A	artifacts/day-38-this-run.patch
A	artifacts/day-38.patch
M	components/app-shell.tsx
M	components/dashboard/job-search-workspace-dialog.tsx
M	components/dashboard/pathadvisor-insights-card.tsx
M	components/layout/RouteTransition.tsx
M	components/path-advisor-panel.tsx
A	components/resume-builder/guidance-strip.tsx
A	components/resume-builder/job-picker-modal.tsx
A	components/resume-builder/resume-editor-pane.tsx
A	components/resume-builder/resume-preview-pane.tsx
A	components/resume-builder/resume-workspace.tsx
A	components/resume-builder/rewrite-transition-ui.tsx
A	components/resume-builder/tailoring-banner.tsx
A	components/resume-builder/tailoring-workspace-overlay.tsx
A	components/resume-builder/tailoring-workspace.tsx
A	components/resume-builder/version-cards.tsx
M	components/ui/dialog.tsx
M	docs/change-briefs/day-34.md
A	docs/change-briefs/day-38.md
M	docs/merge-notes/current.md
M	hooks/use-pathadvisor-insights.ts
M	lib/api/pathadvisor-client.ts
M	lib/email/index.ts
M	lib/email/parseEml.ts
M	lib/handoff/handoff.ts
M	lib/onboarding/conversation.ts
A	lib/resume/guidance-rules.ts
A	lib/resume/resume-domain-model.ts
A	lib/resume/resume-helpers.test.ts
A	lib/resume/resume-helpers.ts
M	store/guidedTourStore.test.ts
M	store/onboardingStore.test.ts
M	store/onboardingStore.ts
M	types/pathadvisor.ts
```

**Command:** `git diff --stat develop...HEAD`
```
 app/api/pathadvisor/insights/route.ts              |    1 +
 app/dashboard/resume-builder/page.tsx              |  540 +-
 app/import/components/ActivityFeed.tsx             |    1 +
 app/import/components/ReminderEditor.tsx           |    1 +
 app/import/components/TaskList.tsx                 |    1 +
 artifacts/day-38-run.patch                         | 5803 ++++++++++++++++++++
 artifacts/day-38-this-run.patch                    |  Bin 0 -> 1131188 bytes
 artifacts/day-38.patch                             |    0
 components/app-shell.tsx                           |   17 +-
 .../dashboard/job-search-workspace-dialog.tsx      |   39 +-
 components/dashboard/pathadvisor-insights-card.tsx |    1 +
 components/layout/RouteTransition.tsx              |    1 +
 components/path-advisor-panel.tsx                  |   17 +-
 components/resume-builder/guidance-strip.tsx       |  285 +
 components/resume-builder/job-picker-modal.tsx     |  86 +
 components/resume-builder/resume-editor-pane.tsx   |  172 +
 components/resume-builder/resume-preview-pane.tsx  |  364 ++
 components/resume-builder/resume-workspace.tsx     |  641 +++
 .../resume-builder/rewrite-transition-ui.tsx       |  122 +
 components/resume-builder/tailoring-banner.tsx     |  112 +
 .../resume-builder/tailoring-workspace-overlay.tsx |  146 +
 components/resume-builder/tailoring-workspace.tsx  | 1028 ++++
 components/resume-builder/version-cards.tsx        |  203 +
 components/ui/dialog.tsx                           |    1 +
 docs/change-briefs/day-34.md                       |    1 +
 docs/change-briefs/day-38.md                       |  218 +
 docs/merge-notes/current.md                        | 1062 ++++
 hooks/use-pathadvisor-insights.ts                  |    1 +
 lib/api/pathadvisor-client.ts                      |    1 +
 lib/email/index.ts                                 |    1 +
 lib/email/parseEml.ts                              |    1 +
 lib/handoff/handoff.ts                             |    1 +
 lib/onboarding/conversation.ts                     |    1 +
 lib/resume/guidance-rules.ts                       |  197 +
 lib/resume/resume-domain-model.ts                  |  267 +
 lib/resume/resume-helpers.test.ts                  |  312 ++
 lib/resume/resume-helpers.ts                       |  245 +
 store/guidedTourStore.test.ts                      |    1 +
 store/onboardingStore.test.ts                      |    1 +
 store/onboardingStore.ts                          |    1 +
 types/pathadvisor.ts                               |    1 +
 41 files changed, 11553 insertions(+), 341 deletions(-)
```

**Command:** `git diff --name-status develop -- . ":(exclude)artifacts"`
```
M	app/api/pathadvisor/insights/route.ts
M	app/dashboard/resume-builder/page.tsx
M	app/import/components/ActivityFeed.tsx
M	app/import/components/ReminderEditor.tsx
M	app/import/components/TaskList.tsx
M	components/app-shell.tsx
M	components/dashboard/job-search-workspace-dialog.tsx
M	components/dashboard/pathadvisor-insights-card.tsx
M	components/layout/RouteTransition.tsx
M	components/path-advisor-panel.tsx
A	components/resume-builder/guidance-strip.tsx
A	components/resume-builder/job-picker-modal.tsx
A	components/resume-builder/resume-editor-pane.tsx
A	components/resume-builder/resume-preview-pane.tsx
A	components/resume-builder/resume-workspace.tsx
M	components/resume-builder/review-export-step.tsx
A	components/resume-builder/rewrite-transition-ui.tsx
A	components/resume-builder/tailoring-banner.tsx
A	components/resume-builder/tailoring-workspace-overlay.tsx
A	components/resume-builder/tailoring-workspace.tsx
A	components/resume-builder/version-cards.tsx
M	components/ui/dialog.tsx
M	components/ui/toast.tsx
M	docs/change-briefs/day-34.md
A	docs/change-briefs/day-38.md
A	docs/merge-notes/archive/merge-notes-day-38.md
M	docs/merge-notes/current.md
A	merge-notes.md
M	hooks/use-pathadvisor-insights.ts
M	lib/api/pathadvisor-client.ts
M	lib/email/index.ts
M	lib/email/parseEml.ts
M	lib/handoff/handoff.ts
M	lib/onboarding/conversation.ts
A	lib/resume/guidance-rules.ts
A	lib/resume/resume-domain-model.ts
A	lib/resume/resume-helpers.test.ts
A	lib/resume/resume-helpers.ts
M	store/guidedTourStore.test.ts
M	store/onboardingStore.test.ts
M	store/onboardingStore.ts
M	types/pathadvisor.ts
```

**Command:** `git diff --stat develop -- . ":(exclude)artifacts"`
```
 app/api/pathadvisor/insights/route.ts              |    1 +
 app/dashboard/resume-builder/page.tsx              |  540 +++---
 app/import/components/ActivityFeed.tsx             |    1 +
 app/import/components/ReminderEditor.tsx           |    1 +
 app/import/components/TaskList.tsx                 |    1 +
 components/app-shell.tsx                           |   17 +-
 .../dashboard/job-search-workspace-dialog.tsx      |   39 +-
 components/dashboard/pathadvisor-insights-card.tsx |    1 +
 components/layout/RouteTransition.tsx              |    1 +
 components/path-advisor-panel.tsx                  |   17 +-
 components/resume-builder/guidance-strip.tsx       |  285 +++
 components/resume-builder/job-picker-modal.tsx     |   86 ++
 components/resume-builder/resume-editor-pane.tsx   |  162 ++
 components/resume-builder/resume-preview-pane.tsx  |  364 +++
 components/resume-builder/resume-workspace.tsx     |  641 +++++
 components/resume-builder/review-export-step.tsx   |    3 +-
 .../resume-builder/rewrite-transition-ui.tsx       |  122 ++
 components/resume-builder/tailoring-banner.tsx     |  112 ++
 .../resume-builder/tailoring-workspace-overlay.tsx |  146 ++
 components/resume-builder/tailoring-workspace.tsx  | 1744 ++++++++++++++++++++
 components/resume-builder/version-cards.tsx        |  206 +++
 components/ui/dialog.tsx                           |    1 +
 components/ui/toast.tsx                            |    2 +
 docs/change-briefs/day-34.md                       |    1 +
 docs/change-briefs/day-38.md                       |  247 +++
 docs/merge-notes/archive/merge-notes-day-38.md     |  316 ++++
 docs/merge-notes/current.md                        | 1062 ++++++++++++
 hooks/use-pathadvisor-insights.ts                  |    1 +
 lib/api/pathadvisor-client.ts                      |    1 +
 lib/email/index.ts                                 |    1 +
 lib/email/parseEml.ts                              |    1 +
 lib/handoff/handoff.ts                             |    1 +
 lib/onboarding/conversation.ts                     |    1 +
 lib/resume/guidance-rules.ts                       |  197 +++
 lib/resume/resume-domain-model.ts                  |  267 +++
 lib/resume/resume-helpers.test.ts                  |  312 ++++
 lib/resume/resume-helpers.ts                       |  245 +++
 merge-notes.md                                     |  346 ++++
 store/guidedTourStore.test.ts                      |    1 +
 store/onboardingStore.test.ts                      |    1 +
 store/onboardingStore.ts                           |    1 +
 types/pathadvisor.ts                               |    1 +
 42 files changed, 7154 insertions(+), 342 deletions(-)
```

---

## Files Changed (This Run)

### Modified Files
- `components/resume-builder/tailoring-workspace.tsx` - Added version management modals (Save Version with name prompt, Manage Versions with rename/delete/select), guidance modal auto-close, optional blue toast toggle, Focus View modal, fixed PathAdvisor dock button placement. **Day 38 Polish Fix**: Focus View header with explicit Exit/Save controls, single-instance PathAdvisor mode ('closed' | 'side' | 'full'), format toggle prevents Focus View auto-open
- `components/path-advisor-panel.tsx` - **Day 38 Polish Fix**: Added `onRequestFullScreen` callback prop to support workspace single-instance mode
- `components/resume-builder/review-export-step.tsx` - Fixed export modal width (max-w-6xl), "Ask PathAdvisor" opens workspace PathAdvisor

---

## Changes Made

### A) Version Management (Save/rename/delete/select)
- **Save Version Modal**: "Save version" button now opens a modal with name input (prefilled with suggested name like "<Role> – v3" or "Version 3")
- **Manage Versions Modal**: Version pill in header opens "Manage Versions" modal showing:
  - List of all saved versions with creation/update dates
  - Select button (sets active version)
  - Rename button (inline edit with Enter/Escape support)
  - Delete button (trash icon) with confirmation dialog
  - Active and Base badges
- **Persistence**: Versions are persisted to localStorage (`resume-builder-versions` key)
- **Fallback**: Deleting active version automatically selects previous version or base

### B) Guidance Modal Auto-Close + Badge Behavior
- **Auto-close**: Guidance modal automatically closes when all guidance items are dismissed (count reaches 0)
- **Badge clearing**: Badge count clears when all items dismissed (button remains but shows no count)
- **Optional Blue Toast**: Added toggle "Guidance notifications" in guidance modal header (persisted in localStorage as `resume-builder-guidance-notifications`)
- **Blue Toast**: When enabled and guidance count increases, shows blue toast:
  - Title: "New guidance available"
  - Description: "Open Guidance to review suggestions."
  - Style: Blue border/background (not success/green)
  - Action button: "Open Guidance" that opens the guidance modal
  - Only fires on increments (not on initial load or decreases)
  - Debounced (2 seconds) to prevent spam

### C) Export Modal Width Fix
- **Updated**: Export modal DialogContent className from `max-w-5xl` to `max-w-6xl`
- **Verified**: DialogContent implementation allows className to override base styles
- **Result**: Export modal is now wider and displays preview content better

### D) PathAdvisor Dock Button Placement
- **Fixed**: Dock button is now properly positioned in SheetHeader with correct spacing
- **No overlap**: Dock button does not overlap with close X button
- **Layout**: Dock button is in a flex container with proper gap spacing

### E) Focus View Full Resume Modal
- **Header button**: Added "Focus view" button in workspace header
- **Click preview**: Clicking the resume preview pane also opens Focus View
- **Modal features**:
  - Wide modal: `w-[95vw] max-w-6xl, max-h-[90vh]`
  - Scrollable resume content
  - Format toggle (USAJOBS/Traditional) in header
  - Minimal chrome: title, format toggle, close button
- **Day 38 Polish Fix**: 
  - Explicit "Exit Focus" button and optional "Save version" button in header
  - Default close button hidden (`showCloseButton={false}`, `[&>button.absolute]:hidden`)
  - Format toggle buttons have `data-prevent-focus-view` attribute to prevent Focus View from opening when toggling
  - Header layout prevents toggle overlap with close X (proper flex spacing)

### F) PathAdvisor Single Instance Mode (Day 38 Polish Fix)
- **Problem**: Clicking "Open large" created a second advisor behind the side sheet
- **Solution**: Introduced single source of truth for workspace advisor display mode:
  - `pathAdvisorMode: 'closed' | 'side' | 'full'`
  - Only ONE PathAdvisor instance rendered at a time
  - When mode === 'side': renders Sheet with PathAdvisorPanel
  - When mode === 'full': renders Dialog with PathAdvisorPanel (full-screen)
  - When mode === 'closed': renders nothing
- **Behavior**: 
  - "Open large" button sets mode to 'full' and closes side sheet
  - Exiting full mode returns to 'side' mode (was previously open)
  - Added `onRequestFullScreen` callback prop to PathAdvisorPanel
  - Workspace controls the mode transition, PathAdvisorPanel calls the callback

### G) Format Toggle Prevents Focus View Auto-Open (Day 38 Polish Fix)
- **Problem**: Clicking USAJOBS/Traditional toggle opened Focus View (click bubbled up from preview container)
- **Solution**: 
  - Added `data-prevent-focus-view` attribute to format toggle buttons
  - Preview container onClick handler checks for interactive elements using `closest('button, a, input, textarea, select, [role="tab"], [data-prevent-focus-view]')`
  - If click originated from interactive element, Focus View does not open
  - Format toggle buttons now safely toggle without opening Focus View

### H) Guidance Panel Notifications Toggle Fix (Day 38 Polish Fix)
- **Already implemented**: Notifications toggle and close button are in same flex row with proper spacing
- **Verified**: No overlap, only one close control visible

### I) Export Modal "Ask PathAdvisor" Fix (Day 38 Polish Fix)
- **Already implemented**: Button calls `onAskPathAdvisor` callback which closes export modal and opens workspace PathAdvisor
- **Verified**: PathAdvisor opens in workspace layer (side mode), visible immediately

---

## Behavior Changes

**Before:**
- Save version created unnamed versions
- No way to rename or delete versions
- Guidance modal stayed open even when empty
- No notifications for new guidance
- Export modal was narrow
- PathAdvisor dock button placement was incorrect
- No full-screen resume preview

**After:**
- Save version opens modal with name prompt
- Versions can be renamed, deleted, and selected via Manage Versions modal
- Guidance modal auto-closes when all items dismissed
- Optional blue toast appears when new guidance arrives (if enabled)
- Export modal is wider (max-w-6xl)
- PathAdvisor dock button correctly placed with no overlap
- Focus View modal provides distraction-free full-screen resume preview
- Focus View has explicit Exit and Save controls, no header overlap
- Format toggle does not auto-open Focus View
- PathAdvisor "Open large" replaces side panel (single instance, no duplicates)
- Export "Ask PathAdvisor" opens advisor inside workspace (visible immediately)

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Changes Zustand store logic (version management), Adds Create/Save/Delete actions (versions), Changes persistence behavior (localStorage keys) |
| Why | Version management adds create/rename/delete actions with localStorage persistence. Guidance notifications toggle adds persistence. |

---

## Testing Evidence

| Item | Value |
|------|-------|
| Mode tested | dev |
| Steps performed | 1. Save version (named) → toast success, 2. Rename version → persists after refresh, 3. Delete version → persists after refresh, 4. Guidance dismiss all → modal auto-closes, 5. Guidance toast toggle ON → blue toast on new guidance, 6. Export dialog → wide and usable, 7. PathAdvisor dock button → correct placement, no overlap, 8. Focus view modal → opens/closes, scroll works |
| Result | pass |
| localStorage key verified | `resume-builder-versions`, `resume-builder-guidance-notifications` |
| Console clean | yes |

---

## Quality Gates

### Lint
**Command:** `pnpm lint`
```
✖ 34 problems (0 errors, 34 warnings)
```
**Result:** Pass (warnings allowed, no errors)

### Typecheck
**Command:** `pnpm typecheck`
```
✓ No type errors
```
**Result:** Pass

### Tests
**Command:** `pnpm test --run`
```
✓ Test Files  24 passed (24)
✓ Tests  563 passed (563)
```
**Result:** Pass

---

## AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | Save Version button → Save Version modal → name input → save → version created → persisted to localStorage → appears in Manage Versions list. Manage Versions → rename/delete/select → updates localStorage → persists after refresh |
| Store(s) | None (local state in TailoringWorkspace component) |
| Storage key(s) | `resume-builder-versions`, `resume-builder-guidance-notifications` |
| Failure mode | If localStorage fails, versions won't persist across refreshes. If version management fails, users can't save/rename/delete versions. |
| How tested | Manual: Save version → appears in list → refresh → still there. Rename → persists. Delete → persists. Guidance dismiss all → modal closes. Toast toggle → persists. |

---

## Patch Artifacts (FINAL)

**Command:**
```powershell
$env:DAY="38"; pnpm docs:day-patches --day 38
Get-Item artifacts/day-38.patch,artifacts/day-38-run.patch | Format-List Name,Length,LastWriteTime
```

**Output:**
```
Name          : day-38.patch
Length        : 316118
LastWriteTime : 12/25/2025 7:08:46 PM

Name          : day-38-run.patch
Length        : 77814
LastWriteTime : 12/25/2025 7:08:46 PM
```

**Notes:**
- Patches generated using `pnpm docs:day-patches --day 38`
- Both files generated successfully with UTF-8 encoding
- Cumulative patch: develop → working tree (all Day 38 changes, 316118 bytes)
- Incremental patch: HEAD → working tree (this run's changes, 77814 bytes)

---

---

## PathAdvisor UX/State Fixes (PathAdvisor UX Fix)

### Files Changed
- `components/path-advisor-panel.tsx` - Added `isExpandedMode` and `hideExpandButton` props to support collapse behavior and external control of expand button
- `components/resume-builder/tailoring-workspace.tsx` - Fixed PathAdvisor mode transitions and header control placement

### What/Why

**Issue 1: Collapse doesn't retract**
- **Problem**: In expanded/full mode, clicking the "make large / collapse" button did nothing (no-op callback)
- **Fix**: Added `isExpandedMode` prop to PathAdvisorPanel. When true, the "Open large" button shows Minimize2 icon and "Collapse" tooltip. The callback now sets mode to 'side' (retracts to sidebar)

**Issue 2: Closing expanded falls back to sidebar**
- **Problem**: X close button in expanded view returned to sidebar mode instead of fully closing
- **Fix**: Changed close button in full mode Dialog to set `pathAdvisorMode` to 'closed' instead of 'side'. Also updated `onOpenChange` handler (e.g., ESC key) to fully close

**Issue 3: Sidebar header controls not in standard placement**
- **Problem**: Dock toggle was next to title on left side, not grouped with other controls on right
- **Fix**: Moved dock toggle to right side of SheetHeader, grouped with expand button and close button. Added `hideExpandButton` prop to PathAdvisorPanel and moved expand button to SheetHeader for standard PathOS placement (title left, controls right)

### Implementation Details

**Single-instance state machine:**
- PathAdvisor uses `pathAdvisorMode: 'closed' | 'side' | 'full'` as single source of truth
- Only one PathAdvisor instance rendered at a time (prevents "sidebar + expanded behind it")
- Mode transitions:
  - Open PathAdvisor in workspace → 'side'
  - Expand from sidebar → 'full' (sidebar not shown)
  - Collapse from expanded → 'side'
  - Close (X) from sidebar → 'closed'
  - Close (X) from expanded → 'closed'

**PathAdvisorPanel changes:**
- Added `isExpandedMode?: boolean` prop - when true, shows Minimize2 icon and "Collapse" tooltip
- Added `hideExpandButton?: boolean` prop - when true, hides the expand button (used when controlled externally)
- Button behavior: When `isExpandedMode` is true, clicking calls `onRequestFullScreen()` to collapse

**Workspace header layout:**
- Sidebar SheetHeader: Title on left, controls grouped on right (dock toggle + expand + close)
- Full mode Dialog header: Title on left, controls grouped on right (dock toggle + collapse + close)
- Expand button moved from PathAdvisorPanel header to SheetHeader for consistency

### How to Test

1. **Collapse retracts to sidebar:**
   - Open workspace → Click "Open PathAdvisor" → sidebar opens
   - Click "Open large" (Maximize2 icon) → sidebar disappears, expanded opens
   - Click "Collapse" (Minimize2 icon) in expanded → expanded disappears, sidebar returns

2. **Expanded close fully closes:**
   - With PathAdvisor in expanded mode, click X close button → PathAdvisor fully closes (no sidebar)
   - With PathAdvisor in expanded mode, press ESC → PathAdvisor fully closes

3. **Sidebar close fully closes:**
   - With PathAdvisor in sidebar mode, click X close button → PathAdvisor fully closes

4. **Sidebar header layout:**
   - Open PathAdvisor sidebar → Verify title "PathAdvisor" is on left
   - Verify dock toggle, expand button, and close button are grouped together on right
   - Verify controls don't overlap

5. **Full mode header layout:**
   - Open PathAdvisor in expanded mode → Verify title "PathAdvisor" is on left
   - Verify dock toggle, collapse button, and close button are grouped together on right

6. **No duplicate instances:**
   - Open sidebar → Click "Open large" → Verify sidebar disappears (not both visible)
   - Collapse from expanded → Verify expanded disappears (not both visible)

---

## 2025-12-29 — PathAdvisor Expand Icon Mismatch Fix

### Summary

Fixed icon mismatch in "Open workspace" PathAdvisor header. The expand control was using `Target` icon instead of the standard `Maximize2` icon used by the canonical PathAdvisor component. Replaced with `Maximize2` to maintain PathOS convention.

### Files Changed

| File | Change |
|------|--------|
| `components/resume-builder/tailoring-workspace-overlay.tsx` | M - Replaced `Target` icon with `Maximize2` icon in PathAdvisor expand button to match canonical PathAdvisor implementation |

### Implementation Details

**Icon Fix:**
- Added `Maximize2` to imports from `lucide-react`
- Replaced `<Target className="h-4 w-4" />` with `<Maximize2 className="w-4 h-4" />` in PathAdvisor expand button
- Icon size and styling now matches canonical PathAdvisor exactly (`w-4 h-4`)
- Button variant, size, className, tooltip, and aria-label remain unchanged

**Canonical Reference:**
- Standard PathAdvisor expand icon is defined in `components/path-advisor-panel.tsx` (lines 660-664)
- Uses `Maximize2` icon with `w-4 h-4` className
- Button uses `variant="ghost"`, `size="icon"`, `className="h-8 w-8"`

### Commands Run

```bash
pnpm typecheck
# Exit code: 0 (passed)
```

### How to Verify

1. **Canonical PathAdvisor expand icon:**
   - Open sidebar PathAdvisor (any page with PathAdvisor visible)
   - Verify expand button shows `Maximize2` icon (two overlapping squares)
   - Hover to see "Open large" tooltip

2. **Open workspace PathAdvisor expand icon:**
   - Navigate to Resume Builder page
   - Click "Open workspace" button
   - Click "Open PathAdvisor" button in workspace header
   - Verify expand button shows `Maximize2` icon (matches sidebar exactly)
   - Hover to see "Open large" tooltip
   - Click expand to verify behavior unchanged

3. **Visual consistency:**
   - Compare expand icons side-by-side (sidebar vs workspace)
   - Verify icons are identical (same glyph, same size)
   - Verify hover/focus states match
   - Verify tooltip text matches

---

## 2025-12-29 — Open Workspace Entry Experience Fix

### Summary

Fixed the "Open Workspace" entry experience for Resume Builder. Previously, users could only access the full workspace by clicking "Tailor for a Job", even if they already had saved resume versions. Now, Resume Builder offers a direct "Open workspace" entry point, and "Tailor for a job" has been moved into the workspace experience.

**Key changes:**
- Replaced "Tailor for a Job" CTA with "Open workspace" primary button on Resume Builder page
- Updated TailoringWorkspaceOverlay to support general workspace mode (renders without activeTargetJob)
- Added "Tailor for a job" button inside workspace overlay header when no job is active
- Workspace overlay now opens in two modes:
  - **Tailoring mode**: When activeTargetJob is present, shows TailoringWorkspace with tailoring-specific UI
  - **General workspace mode**: When no activeTargetJob, shows ResumeWorkspace with general editing UI
- Workspace state (isWorkspaceOpen) is now separate from tailoring mode state

### Files Changed

| File | Change |
|------|--------|
| `components/resume-builder/tailoring-workspace-overlay.tsx` | M - Added support for general workspace mode, conditional rendering based on activeTargetJob, header with "Tailor for a job" button in general mode |
| `app/dashboard/resume-builder/page.tsx` | M - Replaced "Tailor for a Job" button with "Open workspace" primary button, added isWorkspaceOpen state management separate from tailoring mode |

### Implementation Details

**TailoringWorkspaceOverlay changes:**
- Removed guard that returned null when activeTargetJob was missing
- Added conditional rendering: TailoringWorkspace when activeTargetJob exists, ResumeWorkspace when it doesn't
- Added header bar for general workspace mode only (TailoringWorkspace has its own header)
- Header includes "Tailor for a job" button in general mode and close button

**Resume Builder page changes:**
- Changed primary CTA from "Tailor for a Job" (outline) to "Open workspace" (default/primary)
- Renamed state from `isTailoringOverlayOpen` to `isWorkspaceOpen` to reflect dual-purpose nature
- Updated overlay open logic to use isWorkspaceOpen state
- Overlay automatically opens when tailoring mode becomes active (existing behavior preserved)

### How to Verify

1. **Open workspace without job:**
   - Navigate to Resume Builder page
   - Click "Open workspace" button (primary button)
   - Verify workspace overlay opens and shows ResumeWorkspace (general mode)
   - Verify header shows "Resume Workspace" title and "Tailor for a job" button

2. **Tailor for a job from workspace:**
   - With workspace open in general mode, click "Tailor for a job" button in header
   - Verify job picker modal opens
   - Select a job
   - Verify workspace transitions to tailoring mode (shows TailoringWorkspace with job context)
   - Verify TailoringWorkspace header shows job title and "Change job" button

3. **Workspace opens with saved versions:**
   - Open workspace without an active job
   - Verify saved resume versions are accessible
   - Verify preview is visible and workspace is immediately usable

4. **Tailoring mode still opens overlay automatically:**
   - Navigate to Job Search and select "Tailor my resume for this job"
   - Verify workspace overlay opens automatically in tailoring mode
   - Verify existing tailoring mode functionality works as before

5. **Close workspace:**
   - With workspace open, click "Close" button in header
   - Verify overlay closes
   - If in tailoring mode, verify tailoring session is cleared

---

## 2025-12-29 — Repository Resync (Network Timeout Recovery)

### Git State (Resync)

**Command:** `git status`
```
On branch feature/day-38-tailoring-workspace-overlay-v1
Your branch is up to date with 'origin/feature/day-38-tailoring-workspace-overlay-v1'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	modified:   app/api/pathadvisor/insights/route.ts
	modified:   app/import/components/ActivityFeed.tsx
	modified:   app/import/components/ReminderEditor.tsx
	modified:   app/import/components/TaskList.tsx
	modified:   components/dashboard/pathadvisor-insights-card.tsx
	modified:   components/layout/RouteTransition.tsx
	modified:   components/resume-builder/tailoring-banner.tsx
	modified:   docs/change-briefs/day-34.md
	modified:   hooks/use-pathadvisor-insights.ts
	modified:   lib/api/pathadvisor-client.ts
	modified:   lib/email/index.ts
	modified:   lib/email/parseEml.ts
	modified:   lib/handoff/handoff.ts
	modified:   lib/onboarding/conversation.ts
	modified:   lib/resume/resume-domain-model.ts
	modified:   store/guidedTourStore.test.ts
	modified:   store/onboardingStore.test.ts
	modified:   store/onboardingStore.ts
	modified:   types/pathadvisor.ts

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/api/pathadvisor/insights/route.ts
	modified:   app/dashboard/resume-builder/page.tsx
	modified:   app/import/components/ActivityFeed.tsx
	modified:   app/import/components/ReminderEditor.tsx
	modified:   app/import/components/TaskList.tsx
	modified:   artifacts/day-38-run.patch
	modified:   artifacts/day-38-this-run.patch
	modified:   artifacts/day-38.patch
	modified:   components/dashboard/job-details-slideover.tsx
	modified:   components/dashboard/pathadvisor-insights-card.tsx
	modified:   components/layout/RouteTransition.tsx
	modified:   components/path-advisor-panel.tsx
	modified:   components/resume-builder/resume-preview-pane.tsx
	new file:   components/resume-builder/resume-workspace-header-actions.tsx
	modified:   components/resume-builder/resume-workspace.tsx
	modified:   components/resume-builder/review-export-step.tsx
	modified:   components/resume-builder/tailoring-banner.tsx
	modified:   components/resume-builder/tailoring-workspace-overlay.tsx
	modified:   components/resume-builder/tailoring-workspace.tsx
	modified:   docs/change-briefs/day-34.md
	modified:   docs/change-briefs/day-38.md
	modified:   docs/merge-notes/current.md
	modified:   hooks/use-pathadvisor-insights.ts
	modified:   lib/api/pathadvisor-client.ts
	modified:   lib/email/index.ts
	modified:   lib/email/parseEml.ts
	modified:   lib/handoff/handoff.ts
	modified:   lib/onboarding/conversation.ts
	modified:   lib/resume/resume-domain-model.ts
	modified:   merge-notes.md
	modified:   store/guidedTourStore.test.ts
	modified:   store/onboardingStore.test.ts
	modified:   store/onboardingStore.ts
	new file:   store/tailoringWorkspaceStore.ts
	modified:   types/pathadvisor.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	components/resume-builder/resume-actions-bar.tsx
```

**Command:** `git branch --show-current`
```
feature/day-38-tailoring-workspace-overlay-v1
```

**Command:** `git diff --name-status develop...HEAD`
```
M	app/api/pathadvisor/insights/route.ts
M	app/dashboard/resume-builder/page.tsx
M	app/import/components/ActivityFeed.tsx
M	app/import/components/ReminderEditor.tsx
M	app/import/components/TaskList.tsx
A	artifacts/day-38-run.patch
A	artifacts/day-38-this-run.patch
A	artifacts/day-38.patch
M	components/app-shell.tsx
M	components/dashboard/job-search-workspace-dialog.tsx
M	components/dashboard/pathadvisor-insights-card.tsx
M	components/layout/RouteTransition.tsx
M	components/path-advisor-panel.tsx
A	components/resume-builder/guidance-strip.tsx
A	components/resume-builder/job-picker-modal.tsx
A	components/resume-builder/resume-editor-pane.tsx
A	components/resume-builder/resume-preview-pane.tsx
A	components/resume-builder/resume-workspace.tsx
M	components/resume-builder/review-export-step.tsx
A	components/resume-builder/rewrite-transition-ui.tsx
A	components/resume-builder/tailoring-banner.tsx
A	components/resume-builder/tailoring-workspace-overlay.tsx
A	components/resume-builder/tailoring-workspace.tsx
A	components/resume-builder/version-cards.tsx
M	components/ui/dialog.tsx
M	components/ui/toast.tsx
M	docs/change-briefs/day-34.md
A	docs/change-briefs/day-38.md
A	docs/merge-notes/archive/merge-notes-day-38.md
M	docs/merge-notes/current.md
M	hooks/use-pathadvisor-insights.ts
M	lib/api/pathadvisor-client.ts
M	lib/email/index.ts
M	lib/email/parseEml.ts
M	lib/handoff/handoff.ts
M	lib/onboarding/conversation.ts
A	lib/resume/guidance-rules.ts
A	lib/resume/resume-domain-model.ts
A	lib/resume/resume-helpers.test.ts
A	lib/resume/resume-helpers.ts
A	merge-notes.md
M	store/guidedTourStore.test.ts
M	store/onboardingStore.test.ts
M	store/onboardingStore.ts
M	types/pathadvisor.ts
```

**Command:** `git diff --stat develop...HEAD`
```
 app/api/pathadvisor/insights/route.ts              |    1 +
 app/dashboard/resume-builder/page.tsx              |  540 +-
 app/import/components/ActivityFeed.tsx             |    1 +
 app/import/components/ReminderEditor.tsx           |    1 +
 app/import/components/TaskList.tsx                 |    1 +
 artifacts/day-38-run.patch                         | 1776 +++++
 artifacts/day-38-this-run.patch                    |  Bin 0 -> 1131188 bytes
 artifacts/day-38.patch                             | 7959 ++++++++++++++++++++
 components/app-shell.tsx                           |   17 +-
 .../dashboard/job-search-workspace-dialog.tsx      |   39 +-
 components/dashboard/pathadvisor-insights-card.tsx |    1 +
 components/layout/RouteTransition.tsx              |    1 +
 components/path-advisor-panel.tsx                  |   17 +-
 components/resume-builder/guidance-strip.tsx       |  285 +
 components/resume-builder/job-picker-modal.tsx     |  285 +
 components/resume-builder/resume-editor-pane.tsx   |  162 +
 components/resume-builder/resume-preview-pane.tsx  |  364 +
 components/resume-builder/resume-workspace.tsx     |  641 ++
 components/resume-builder/review-export-step.tsx   |    3 +-
 .../resume-builder/rewrite-transition-ui.tsx       |  122 +
 components/resume-builder/tailoring-banner.tsx     |  112 +
 .../resume-builder/tailoring-workspace-overlay.tsx |  146 +
 components/resume-builder/tailoring-workspace.tsx  | 1744 +++++
 components/resume-builder/version-cards.tsx        |  206 +
 components/ui/dialog.tsx                           |    1 +
 components/ui/toast.tsx                            |    2 +
 docs/change-briefs/day-34.md                       |    1 +
 docs/change-briefs/day-38.md                       |  263 +
 docs/merge-notes/archive/merge-notes-day-38.md     |  316 +
 docs/merge-notes/current.md                        | 1062 +++
 hooks/use-pathadvisor-insights.ts                  |    1 +
 lib/api/pathadvisor-client.ts                      |    1 +
 lib/email/index.ts                                 |    1 +
 lib/email/parseEml.ts                              |    1 +
 lib/handoff/handoff.ts                             |    1 +
 lib/onboarding/conversation.ts                     |    1 +
 lib/resume/guidance-rules.ts                       |  197 +
 lib/resume/resume-domain-model.ts                  |  267 +
 lib/resume/resume-helpers.test.ts                  |  312 +
 lib/resume/resume-helpers.ts                       |  245 +
 merge-notes.md                                     |  398 +
 store/guidedTourStore.test.ts                      |    1 +
 store/onboardingStore.test.ts                      |    1 +
 store/onboardingStore.ts                           |    1 +
 types/pathadvisor.ts                               |    1 +
 45 files changed, 16957 insertions(+), 342 deletions(-)
```

### Patch Artifacts (Regenerated)

**Command:** `$env:DAY="38"; pnpm docs:day-patches --day 38`
```
============================================================
Generating Day 38 patch artifacts...
============================================================

[gen-day-patches] Generating cumulative patch for day 38...
[gen-day-patches] Written: C:\Users\jorie\Desktop\PathOS\codebase\fedpath-tier1-frontend\artifacts\day-38.patch (440460 bytes)
[gen-day-patches] Generating incremental patch for day 38...
[gen-day-patches] Written: C:\Users\jorie\Desktop\PathOS\codebase\fedpath-tier1-frontend\artifacts\day-38-run.patch (162073 bytes)

============================================================
✓ Day 38 patch artifacts generated successfully
============================================================

Files created:
  - artifacts/day-38.patch (cumulative)
  - artifacts/day-38-run.patch (incremental)
```

**Command:** `Get-Item artifacts/day-38.patch,artifacts/day-38-run.patch | Format-List Name,Length,LastWriteTime`
```
Name          : day-38.patch
Length        : 440460
LastWriteTime : 12/29/2025 10:03:04 PM

Name          : day-38-run.patch
Length        : 162073
LastWriteTime : 12/29/2025 10:03:05 PM
```

**Notes:**
- Patches regenerated using `pnpm docs:day-patches --day 38`
- Cumulative patch: `artifacts/day-38.patch` (develop → working tree, all Day 38 changes, 440460 bytes)
- Incremental patch: `artifacts/day-38-run.patch` (HEAD → working tree, this run's changes, 162073 bytes)
- Patches are UTF-8 encoded and exclude artifacts/ directory

### Current Work Summary

**Status:** Resynced repository after network timeout. Ready to continue feature work.

**Active changes:**
- New files: `components/resume-builder/resume-workspace-header-actions.tsx`, `store/tailoringWorkspaceStore.ts`, `components/resume-builder/resume-actions-bar.tsx` (untracked)
- Modified files: Multiple tailoring workspace components, resume workspace, review export step, path advisor panel

**Next steps:** Continue implementing open items from merge-notes.

---

*Last updated: December 29, 2025*
