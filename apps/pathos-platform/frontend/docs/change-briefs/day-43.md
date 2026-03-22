# Day 43 Change Brief — PathAdvisor Anchor Focus Architecture

## What Changed

Implemented a new architecture where clicking "Ask PathAdvisor" from any card or workspace immediately opens Focus Mode with clear context about where the question originated. **The right rail now updates dynamically based on the anchor source.**

### Key Changes

1. **Anchor System**: Every "Ask PathAdvisor" action now creates an "anchor" that tracks where the question came from (job card, resume builder, benefits workspace, etc.)

2. **Focus Mode First**: Focus Mode (the full-screen PathAdvisor experience) now opens immediately when you click "Ask PathAdvisor" from any card. Previously, some actions only updated the sidebar.

3. **Contextual Prompts**: When Focus Mode opens, it shows:
   - Where you asked from (e.g., "GS-14 Program Analyst")
   - Why you're asking (e.g., "Considering this position")
   - Suggested prompts relevant to that context

4. **Anchor-Aware Right Rail** (NEW): The right-side context panel now updates based on the anchor:
   - **Job Context**: Shows grade, agency, location, series, estimated total comp
   - **Resume Context**: Shows tailoring mode and target job
   - **Benefits Context**: Shows scenario assumptions (salary, coverage, tenure)
   - **Dashboard Context**: Shows profile type, target grade, location, metrics
   - When no anchor exists, falls back to generic Profile/Key Metrics cards

5. **Consistent Experience**: All "Ask PathAdvisor" buttons now behave the same way, providing immediate feedback in Focus Mode.

## Why It Matters

### Trust and Visibility

- **Immediate Feedback**: Users no longer wonder if their click did anything—Focus Mode opens instantly
- **Clear Context**: Users can see where their question originated, reducing confusion
- **Relevant Suggestions**: Suggested prompts are tailored to what the user is working on
- **Contextual Information**: The right rail shows relevant details for the current focus

### User Experience

- **Focused Interaction**: Focus Mode provides a distraction-free environment for PathAdvisor conversations
- **Context Preservation**: The anchor system ensures PathAdvisor knows what the user is asking about
- **Dynamic Right Rail**: The context panel updates instantly when switching between different Ask sources
- **Consistent Behavior**: All "Ask PathAdvisor" buttons work the same way across the app

## What Users Experience Now

1. **From Job Cards**: Click "Ask PathAdvisor" → Focus Mode opens with:
   - Anchor header showing job title
   - Right rail showing "Job Context" card with grade, agency, location, salary
   - Job-specific suggested prompts

2. **From Resume Builder**: Click "Ask PathAdvisor" → Focus Mode opens with:
   - Anchor header showing resume section
   - Right rail showing "Resume Context" card with tailoring mode, target job
   - Resume-specific suggested prompts

3. **From Benefits Workspace**: Click "Ask PathAdvisor" → Focus Mode opens with:
   - Anchor header showing benefits feature
   - Right rail showing "Benefits Context" card with scenario assumptions
   - Benefits-specific suggested prompts

4. **From Dashboard**: Click "Ask PathAdvisor" → Focus Mode opens with:
   - Anchor header showing dashboard card name
   - Right rail showing "Dashboard Context" card with profile and metrics
   - Dashboard-specific suggested prompts

5. **Instant Updates**: Click Ask from a different source → Right rail updates immediately to show new context

6. **Latest Visibility UX** (NEW): Smart scroll behavior that respects user control:
   - **Auto-scroll on Ask**: When Focus Mode opens from an "Ask", it scrolls to the newest message immediately
   - **User control preserved**: If you've scrolled up to read older content, new messages won't yank you away
   - **"Jump to latest" button**: When you're reading old content and new messages arrive, a subtle floating button appears
   - **Highlight on arrival**: The newest assistant message briefly highlights (~1.2s) so you see what changed

## Technical Notes

- Sidebar still updates automatically with conversation history (it's a "passive mirror")
- Focus Mode is now the primary feedback surface for "Ask" actions
- Anchors are session-scoped (not persisted—cleared on page refresh)
- Right rail uses a view model pattern (`focusRightRail.ts`) for clean separation
- Sensitive values (salary, comp) respect privacy mode via `SensitiveValue` component
- The anchor system is extensible for future entry points
- **Latest Visibility**: Uses store flag (`lastOpenReason`) for deterministic Ask-open detection
- **Trust-first design**: Subtle highlight styling, no aggressive animations, user scroll position respected

## Areas Updated

- Job Search page and job detail cards
- Career/Resume next actions card
- Focus Mode UI (anchor header, scoped prompts, anchor-aware right rail)
- New: `lib/pathadvisor/focusRightRail.ts` for right rail view model building

## Day 43 Option A: Collapsible Context Panel (Single-Column Layouts)

**Decision: Option A (LOCKED)**

In Focus Mode, when the layout is single-column (like Resume Builder on mobile/tablet), we now render a COLLAPSIBLE "Context" panel at the top of the thread (below the anchor header).

### Why Option A?

- **Wide layouts** (Dashboard, Benefits on desktop): Keep the right-rail cards
- **Single-column layouts** (Resume Builder, mobile views): Show collapsible Context panel inline
- **No forced right-rail**: We explicitly chose NOT to force a right rail into single-column layouts

### Context Panel Behavior

1. **Location**: Below anchor header, above message thread
2. **Hidden on lg+**: On large screens where right rail is visible, the inline panel is hidden (`lg:hidden`)
3. **Visible below lg**: On smaller screens, this IS the primary context surface

### Auto-Expand on Ask

- When Focus Mode opens via "Ask PathAdvisor", the Context panel auto-expands
- User can collapse to save space
- New Ask action re-expands (Day 43 visibility contract)

### UX Hint (Clarity Enhancement)

A subtle microcopy hint appears in both the Context panel and right-rail:

> "Ask from another card to change this focus."

This reinforces the anchor mental model without adding new behavior.

### Resume Builder Updates

All Resume Builder Ask CTAs now use `askPathAdvisor()`:
- `app/dashboard/resume-builder/page.tsx` - handleAskPathAdvisorForExport
- `components/resume-builder/tailoring-workspace.tsx` - ReviewExportStep onAskPathAdvisor
- `components/resume-builder/tailoring-workspace-overlay.tsx` - ReviewExportStep onAskPathAdvisor

Each creates a proper anchor with:
- `source: 'resume'`
- `sourceLabel`: "Resume Export Review" or includes target role
- `summary`: Describes the review context

## Day 43 Follow-up: Resume Builder Ask Visibility + Side-by-Side Workflow

**Date:** December 31, 2025

### Problem A (Bug Fixed)

Resume Builder workspace "Ask" buttons did not open a visible PathAdvisor surface. Some CTAs were using the old `requestOpenWorkspacePathAdvisor()` approach which only opened a sidebar panel, not a primary visible surface. This violated the Day 43 visibility contract.

### Problem B (UX Enhancement)

When helping with resumes, users need to view/edit the resume simultaneously. Full Focus Mode takeover hides the resume, breaking the side-by-side workflow.

### Solution: `preferredSurface` Parameter

Extended `askPathAdvisor()` with a new optional parameter:

```typescript
preferredSurface?: 'focus' | 'dock'
```

- **'focus'** (default): Opens full-screen Focus Mode (existing behavior)
- **'dock'**: Opens docked side-by-side panel within Resume Builder

### Key Changes

1. **Extended `askPathAdvisor()`** (`lib/pathadvisor/askPathAdvisor.ts`):
   - Added `preferredSurface` param with 'focus' | 'dock' options
   - 'dock' opens docked panel via store flag
   - 'focus' (default) opens Focus Mode (preserves existing behavior)

2. **Updated PathAdvisor Store** (`store/pathAdvisorStore.ts`):
   - Added `shouldOpenDockedPanel` state flag
   - Added `setShouldOpenDockedPanel()` and `clearShouldOpenDockedPanel()` actions

3. **Created DockedPathAdvisorPanel** (`components/pathadvisor/DockedPathAdvisorPanel.tsx`):
   - Side-by-side docked panel for Resume Builder
   - Shows anchor header + collapsible AnchorContextPanel + thread
   - "Pop out to Focus Mode" button in header
   - Same auto-scroll + highlight logic as Focus Mode

4. **Updated Resume Builder CTAs**:
   - `components/resume-builder/tailoring-workspace.tsx`: Export modal uses `preferredSurface: 'dock'`
   - `components/resume-builder/tailoring-workspace-overlay.tsx`: Export modal uses `preferredSurface: 'dock'`
   - `components/dashboard/job-details-slideover.tsx`: When in tailoring mode, uses `preferredSurface: 'dock'`

### Day 43 Visibility Contract: PRESERVED

Both 'focus' and 'dock' surfaces guarantee immediate visibility:
- Anchor is set before opening either surface
- User always sees PathAdvisor respond to their Ask action
- The only difference is WHERE the response appears (full-screen vs side panel)

### User Experience

**In Resume Builder workspace:**
- Click "Ask PathAdvisor for Review Suggestions" → Docked panel opens
- Resume remains visible for side-by-side editing
- Click "Pop out to Focus Mode" for full-screen if needed

**Outside Resume Builder:**
- Click "Ask PathAdvisor" → Focus Mode opens (unchanged behavior)

### Manual Test Checklist

- [ ] In Resume Builder workspace, click job details "Ask about this job"
  - EXPECT: Docked PathAdvisor opens, anchor shows job context, newest message visible
- [ ] Click "Ask PathAdvisor for Review Suggestions" from export modal
  - EXPECT: Docked PathAdvisor opens, anchor shows resume context
- [ ] Click "Pop out to Focus Mode"
  - EXPECT: Focus Mode opens showing the same latest messages and anchor
- [ ] Verify Benefits/Jobs elsewhere still open Focus Mode on Ask

## Areas Not Yet Updated (Future Work)

- Onboarding wizard "Help me choose" buttons
- Other specialized entry points with unique context requirements

These will be updated in future work to maintain consistency.
