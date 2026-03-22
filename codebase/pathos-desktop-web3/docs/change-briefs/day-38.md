# Day 38 – Resume Builder Revamp (Corrected)

**Date:** December 24, 2025  
**Status:** Complete (with Tailoring Workspace correction + Lint cleanup)

---

## What Changed

The Resume Builder has been completely revamped from a step-by-step wizard into a modern two-pane workspace. Users can now edit their resume in real-time with a live preview, manage multiple versions, switch between different resume views, and receive contextual guidance from PathAdvisor.

**CORRECTION (Day 38):** A dedicated Tailoring Workspace has been implemented that eliminates duplicated context cards and makes editor + preview the hero. When tailoring for a specific job, users see a clean, focused workspace with GuidanceStrip (not the full PathAdvisor panel) and an optional PathAdvisor drawer for deeper assistance.

**OVERLAY v1 (Day 38):** The Tailoring Workspace now appears as a full-screen overlay modal when tailoring mode is active. This provides a completely focused editing experience where Editor + Preview are immediately visible without scrolling. The app shell's PathAdvisor right rail is automatically hidden during tailoring to eliminate duplicate guidance, ensuring users see only one guidance surface (the GuidanceStrip) by default.

**CONTINUATION (Day 38):** Six targeted UX improvements:
1. **Full Job Search Workspace for picking** - "Tailor for a Job" now opens the full Job Search Workspace UI (not a minimal picker), allowing users to search, filter, and select jobs with the same rich interface they're familiar with. The selected job card shows "Tailor my resume for this job" as the primary CTA.
2. **Editor priority** - ResumeWorkspace (Import/Build section) moved above Resume Strength Panel so users land on the editor immediately.
3. **Auto-collapsing guidance** - GuidanceStrip starts expanded briefly when entering the workspace, then automatically collapses after 5 seconds. Users can expand it anytime to view suggestions. Guidance remains quiet during typing activity.
4. **Workspace-aware PathAdvisor** - PathAdvisor drawer in tailoring overlay has local left/right docking controls that work independently from global app preferences. Docking changes only affect the workspace drawer, not the app shell.
5. **No bottom cutoff** - Added padding to both editor and preview panes so all content is fully reachable without clipping.
6. **Session closure (Save/Export/Exit)** - Tailoring Workspace now has explicit session actions in the top bar: Save (creates a version snapshot), Export (opens export modal with PDF/DOCX options), and Exit (with confirmation if unsaved changes exist). Users can clearly finish their tailoring session.

**FINAL FIXES (Day 38):** Three UX regression fixes to ensure merge readiness:
1. **Resume Workspace header actions** - All header actions (Save version, Export, Focus view, Version selector, Tailor for a job button, Close button) are now visible on desktop width. The Close button has been integrated into the header actions component for consistency. Actions wrap or use icons when space is tight, but are never removed.
2. **Focus View click-to-open** - Clicking the resume preview pane now reliably opens Focus View. Interactive elements (format toggle buttons, tabs) are properly excluded from the click handler, so users can interact with controls without accidentally opening Focus View.
3. **PathAdvisor expand icon consistency** - PathAdvisor expand/collapse icons in the workspace now match canonical PathAdvisor: Expand uses Maximize2 icon, Collapse uses Minimize2 icon. Controls are properly grouped on the right with consistent spacing.

**LINT CLEANUP (Day 38):** Cleaned up unused imports/variables and stabilized a hook dependency. All 45 ESLint warnings have been resolved, ensuring the codebase is merge-ready with a clean lint status.

**CI RELIABILITY (Day 38):** Fixed CI "bad object" and "unknown revision" errors by configuring actions/checkout to fetch full git history and explicitly fetching the develop branch, ensuring diff-based validators work reliably.

### Key Features

1. **Two-Pane Workspace**
   - Left pane: Structured editor with all resume sections organized in tabs
   - Right pane: Live preview that updates as you type
   - Responsive layout (stacks on mobile, side-by-side on desktop)

2. **Version Management**
   - Create, rename, duplicate, and delete named resume versions
   - Each version is an independent snapshot you can tailor for different jobs
   - Version cards show creation date and active status

3. **View Switching**
   - Switch between Federal, Private Sector, One-Page, and Full resume formats
   - Each view has different section inclusions and formatting rules
   - Preview updates automatically when switching views

4. **PathAdvisor Guidance Strip**
   - Low-profile, contextual guidance that appears at key moments
   - Automatically suppresses messages while you're typing (quiet mode)
   - Provides helpful tips about resume completeness, versioning, and tailoring

5. **Tailoring Mode Enhancements**
   - Collapsible banner showing target job information
   - "View job details" button integrates with existing Job Details slide-over
   - Rewrite suggestions UI for accepting/rejecting tailored improvements

6. **Rewrite Transition UI**
   - Shows suggested improvements with old → new comparisons
   - Accept or reject each suggestion individually
   - Badges indicate why suggestions were made (e.g., "GS-calibrated", "keyword coverage")

---

## Why This Matters

### Better User Experience

- **Faster editing**: No more clicking through steps - see changes instantly
- **Better organization**: All sections accessible at once, organized in tabs
- **Version control**: Create tailored versions for different job applications
- **Contextual help**: Guidance appears when needed, stays quiet while you work

### Improved Workflow

- **Live preview**: See exactly how your resume will look as you edit
- **Multiple formats**: Switch between Federal and Private sector formats instantly
- **Tailoring support**: Better integration with job search for targeted resume building

---

## How Users Experience It

### First Time Users

When you open Resume Builder, you'll see:
- A clean two-pane interface with editor on the left and preview on the right
- A "Base" version already created
- Guidance strip with helpful tips to get started
- All resume sections organized in tabs (Profile, Target Roles, Experience, Education, Skills)

### Creating Versions

1. Click "New" in the Versions section
2. A new version card appears with a default name
3. Click the edit icon to rename it (e.g., "GS-13 Program Analyst")
4. Edit your resume - changes are saved to this version
5. Switch between versions anytime to compare or continue editing

### Tailoring for a Job

1. Click "Tailor for a Job" in Resume Builder (or from Job Search, click "Tailor my resume" on any job)
2. **Full Job Search Workspace opens** - Search, filter, and browse jobs with the same rich interface you use on the Job Search page
3. Select a job and click "Tailor my resume for this job"
4. **Full-screen Tailoring Workspace overlay opens** (dedicated modal, not inline in the page)
5. **Compact top bar** shows:
   - Target job name and match percentage
   - **Save** button (creates a version snapshot, shows "Saved" status)
   - **Export** button (opens export modal with PDF/DOCX options)
   - **Change job** button (opens job picker again)
   - **View job details** button
   - **Open PathAdvisor** button (opens drawer with left/right docking)
   - **Exit** button (with confirmation if unsaved changes)
6. **GuidanceStrip** appears expanded briefly, then auto-collapses after 5 seconds (quiet during typing)
7. **Two-pane layout**: Edit on left, see live preview on right (immediately visible, no scrolling needed)
8. **No duplicate guidance**: App shell's PathAdvisor right rail is automatically hidden
9. **No card clutter**: Resume Strength Panel and other cards are hidden in tailoring mode
10. Both panes scroll fully to the bottom with no content cutoff
11. Click "Exit" to close the overlay and return to the regular Resume Builder (with save confirmation if needed)

### Switching Views

1. Use the "View" dropdown in the editor pane
2. Select Federal, Private Sector, One-Page, or Full
3. Preview updates immediately to show the selected format
4. Different views include/exclude different sections (e.g., Private Sector hides KSAs)

---

## Technical Details

### New Components

- `ResumeWorkspace` - Main orchestrator component
- `ResumeEditorPane` - Left editor pane with tabs
- `ResumePreviewPane` - Right live preview pane
- `VersionCards` - Version management UI
- `GuidanceStrip` - PathAdvisor guidance component
- `TailoringBanner` - Tailoring mode banner
- `RewriteTransitionUI` - Accept/reject suggestions UI

### Domain Model

- `ResumeDocument` - Canonical resume object with views, versions, and tailoring state
- `ResumeVersion` - Named version snapshots
- `ResumeView` - View configurations (Federal, Private, etc.)
- `TailoringState` - Tailoring session state
- `SuggestedRewrite` - Rewrite suggestions

### Helpers

- `createDefaultResumeDocument()` - Creates new resume with safe defaults
- `cloneResumeDocumentDeep()` - Deep clones for versioning
- `applyTailoringHints()` - Generates rewrite suggestions (frontend-only, deterministic)
- `getGuidanceMessages()` - Deterministic guidance rules

---

## What Stayed the Same

- All existing resume data is preserved and works with the new workspace
- Tailoring mode still integrates with Job Search the same way
- Job Details slide-over integration unchanged
- Privacy settings and sensitive value masking still work
- Resume Strength Panel still shows at the top

---

## Future Enhancements

- Backend integration for more sophisticated tailoring suggestions
- Export functionality directly from the workspace
- Version comparison view
- Collaborative editing (future)
- Voice guidance (deferred per requirements)

---

## Layout & Scroll Fixes (Correction Part 2)

**FIXED:** Critical layout and scroll ownership issues that were causing content cutoff and scroll trapping.

**What was broken:**
- Workspace content was getting clipped/scroll-trapped
- Bottom content was not reachable due to improper flex container structure
- Nested scroll containers were preventing proper scrolling

**What changed:**
- Fixed TailoringWorkspace layout structure with proper `min-h-0` and `overflow-hidden` constraints
- Each pane (editor and preview) now scrolls independently within the workspace
- The workspace container properly defines scroll boundaries
- Bottom content is now fully accessible without cutoff

**Technical approach:**
- Added `min-h-0` to root container and pane divs to allow proper flex shrinking
- Added `overflow-hidden` to two-pane grid container to prevent scroll trapping
- Changed pane divs to use `min-h-0 overflow-y-auto` for proper scroll ownership
- Added `flex flex-col` to page container wrapper for proper flex layout

## UX Polish (Day 38 Continuation)

**Six targeted improvements to polish the Tailoring Workspace:**

1. **Save version toast feedback** - Shows loading toast when save starts, updates to green success or red error. Users get clear feedback that their version was saved.

2. **Export modal width** - Fixed narrow rendering issue. Export modal now uses full width (w-[95vw] max-w-5xl) so users can see the full preview without scrolling horizontally.

3. **Workspace real estate** - Made header sticky so it stays visible, improved flex layout so editor and preview panes scroll properly without bottom content being cut off.

4. **Job picker** - Already uses full Job Search Workspace modal in picker mode (verified working). Users get the same rich interface they're familiar with from Job Search.

5. **PathAdvisor controls** - Removed duplicate sidebar buttons (only one dock toggle shown in workspace header), fixed overlap with close button, ensured "dock left" works within workspace (not global app sidebar).

6. **Saved resumes discoverable** - Versions now persist to localStorage and are automatically selected after save. Users can see their saved versions immediately in the Versions list with clear "(Active)" badge.

## UX Polish (Day 38 Final Polish)

**Additional UX improvements:**

1. **Toast success/error colors** - Save version now shows green toast on success, red toast on error. Clear visual feedback for save operations.

2. **Export modal width** - Verified export modal uses full width (w-[95vw] max-w-5xl) with proper scrolling. Preview content is fully visible without horizontal scrolling.

3. **Workspace real estate** - Added padding-bottom to both editor and preview panes to ensure all content is fully reachable without cutoff. Proper flex layout maintained.

4. **PathAdvisor dock button** - Verified only one dock button exists in workspace header, positioned correctly with no collision with close button.

5. **Resume Library** - Added "Resume Library" button in workspace header. Clicking opens a modal listing all saved versions with "Open" button to load them back into the workspace. Versions section renamed to "Saved Versions" with microcopy: "Saved locally on this device."

## UX Polish (Day 38 Continuation - Workspace Space Optimization)

**Additional UX improvements to optimize workspace real estate:**

1. **Guidance now badge-triggered drawer** - Removed persistent Guidance block that consumed vertical space. Guidance is now shown as a badge button in the workspace header (only when guidance items exist). Clicking opens a Sheet drawer with the full guidance content. The main workspace layout no longer reserves space for guidance when closed.

2. **Saved Versions moved to modal/drawer** - Removed large inline VersionCards section from the editor pane. Versions are now shown as a compact "Current Version: <name>" chip/button in the workspace header. Clicking opens the Resume Library modal. The left pane now prioritizes the resume editing form and stays above-the-fold.

3. **Export modal sizing fix** - Updated Export modal to use `max-w-6xl` (was `max-w-5xl`) for better preview visibility. DialogContent implementation correctly allows className overrides.

4. **PathAdvisor dock toggle placement fix** - Verified and ensured only one dock toggle button exists in the Sheet header, positioned correctly with no collision with the close button. PathAdvisorPanel receives `hideDockSelector={true}` to prevent duplicate buttons.

5. **Toast notification for new guidance** - Added toast notification when new guidance items appear (guidance count increases). Toast includes "Open Guidance" action button. Debounced to prevent spam (2 seconds). Only fires on subsequent increases, not on initial load.

## Final UX Polish (Day 38 Continuation)

**Six additional improvements to complete the Tailoring Workspace:**

1. **Version Management Modals** - "Save version" button now opens a modal with name input (prefilled with suggested name). Version pill in header opens "Manage Versions" modal with rename, delete, and select functionality. All version operations persist to localStorage and survive page refreshes.

2. **Guidance Modal Auto-Close** - Guidance modal automatically closes when all guidance items are dismissed. Badge count clears when empty. Added optional "Guidance notifications" toggle in guidance modal header (persisted in localStorage).

3. **Blue Toast for New Guidance** - When notifications are enabled, a blue toast appears when new guidance items arrive (not green/success). Toast includes "Open Guidance" action button. Only fires on count increases, debounced to prevent spam.

4. **Export Modal Width Fix** - Export modal now uses `max-w-6xl` (was `max-w-5xl`) for better preview visibility. Content scrolls properly without horizontal scrolling.

5. **PathAdvisor Dock Button Placement** - Fixed dock button placement in Sheet header. No overlap with close X button. Proper spacing and layout.

6. **Focus View Full Resume Modal** - Added "Focus view" button in workspace header. Clicking the resume preview pane also opens Focus View. Modal is wide (`w-[95vw] max-w-6xl`), scrollable, with format toggle (USAJOBS/Traditional) in header.

7. **PathAdvisor Expand Icon Consistency** - Aligned Open Workspace PathAdvisor expand icon with standard PathOS convention. The expand button now uses the same `Maximize2` icon as the sidebar PathAdvisor, ensuring visual consistency across all PathAdvisor instances.

## Notes

- This is a frontend-only implementation - no backend changes
- All guidance is deterministic and local-only
- Versioning is stored locally in the browser (localStorage)
- The workspace replaces the wizard UI but maintains backward compatibility with existing resume data
- Layout fixes ensure proper scroll ownership and eliminate content cutoff issues
- Toast notifications use existing toast system (no new dependencies)
- PathAdvisor dock state is local to workspace (doesn't affect global app preferences)
- Guidance visibility is now opt-in (badge button) rather than always-visible, improving workspace focus
- CI validation now derives Day number from branch name automatically
- Regenerated owner map to reflect new stores and storage keys

