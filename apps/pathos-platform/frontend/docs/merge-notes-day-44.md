# Day 43 — PathAdvisor Anchor Focus Architecture

**Branch:** `feature/day-43-pathadvisor-anchor-focus-architecture`  
**Date:** January 1, 2026  
**Status:** In Progress

---

## Goal

Implement the canonical UX rule:
**Any "Ask PathAdvisor" action MUST open Focus Mode immediately.**

Sidebar updates still occur silently as shared state. Sidebar is never the primary feedback surface.

## Non-Negotiable Contract

Ask button click must do, in order:
1. Set a PathAdvisorAnchor (first-class structured object)
2. Inject structured context (existing mechanism OK)
3. Open Focus Mode immediately
4. Focus Mode renders anchored content immediately (anchor header + summary + scoped suggested prompts)

---

## Git Status

```bash
$ git status
On branch feature/day-43-pathadvisor-anchor-focus-architecture
nothing to commit, working tree clean
```

```bash
$ git branch --show-current
feature/day-43-pathadvisor-anchor-focus-architecture
```

```bash
$ git diff --cached --name-status
M	app/dashboard/job-search/page.tsx
M	components/career-resume/next-actions-card.tsx
M	components/dashboard/job-details-slideover.tsx
M	components/path-advisor-focus-mode.tsx
A	docs/merge-notes-day-43.md
M	docs/merge-notes.md
A	lib/pathadvisor/anchors.ts
A	lib/pathadvisor/askPathAdvisor.ts
A	lib/pathadvisor/suggestedPrompts.ts
A	store/pathAdvisorStore.ts
```

```bash
$ git diff --cached --stat
 app/dashboard/job-search/page.tsx              |  31 +-
 components/career-resume/next-actions-card.tsx |  20 +-
 components/dashboard/job-details-slideover.tsx |  34 +-
 components/path-advisor-focus-mode.tsx         | 101 ++++-
 docs/merge-notes-day-43.md                     | 430 +++++++++++++++++++
 docs/merge-notes.md                            | 557 +++++++++----------------
 lib/pathadvisor/anchors.ts                     | 161 +++++++
 lib/pathadvisor/askPathAdvisor.ts              | 248 +++++++++++
 lib/pathadvisor/suggestedPrompts.ts            | 101 +++++
 store/pathAdvisorStore.ts                      | 153 +++++++
 10 files changed, 1414 insertions(+), 422 deletions(-)
```

---

## Implementation Summary

### 1. Created Anchor System

#### 1.1 PathAdvisorAnchor Type (`lib/pathadvisor/anchors.ts`)
- **Purpose:** First-class structured object representing where user initiated an "Ask PathAdvisor" action
- **Fields:**
  - `id`: Unique identifier (generated via `buildAnchorId()`)
  - `source`: Anchor source type ('job' | 'resume' | 'benefits' | 'import' | 'retirement' | 'dashboard')
  - `sourceId`: Optional identifier for specific item (e.g., job ID)
  - `sourceLabel`: User-facing name for anchor origin
  - `summary`: Short reason/context for why user asked
  - `createdAt`: Timestamp (milliseconds since epoch)
- **Helper Functions:**
  - `buildAnchorId(source, sourceId?)`: Generates unique anchor ID
  - `normalizeSourceLabel(label, source)`: Normalizes source labels for display

#### 1.2 PathAdvisor Store (`store/pathAdvisorStore.ts`)
- **Purpose:** Global Zustand store for PathAdvisor anchor state
- **State:**
  - `activeAnchor`: Current PathAdvisorAnchor (null if no anchor active)
  - `lastAnchorSource`: Optional diagnostic field tracking source type of last anchor
- **Actions:**
  - `setActiveAnchor(anchor)`: Sets the active anchor (replaces any existing anchor)
  - `clearActiveAnchor()`: Clears the active anchor (sets to null)
- **SSR Safety:** Zustand stores are client-only by default. No localStorage persistence (session-scoped only).

#### 1.3 Global askPathAdvisor Function (`lib/pathadvisor/askPathAdvisor.ts`)
- **Purpose:** Single global function to invoke PathAdvisor from any "Ask PathAdvisor" entry point
- **Day 43 Contract Enforcement:**
  1. Builds PathAdvisorAnchor from params
  2. Sets active anchor in PathAdvisor store
  3. Injects context into AdvisorContext (if contextPayload provided)
  4. Seeds pending prompt (if contextPayload.prompt provided)
  5. Opens Focus Mode immediately via `setShouldOpenFocusMode(true)`
  6. Returns anchor id for tracking
- **Parameters:**
  - `source`: Anchor source type (required)
  - `sourceId`: Optional identifier for specific item
  - `sourceLabel`: User-facing name (required)
  - `summary`: Short reason/context (required)
  - `contextPayload`: Optional context to inject into AdvisorContext
  - `contextFunctions`: Required AdvisorContext functions (from useAdvisorContext hook)
  - `onClose`: Optional callback to restore focus when PathAdvisor closes

### 2. Updated Ask PathAdvisor Entry Points

#### 2.1 Job Details Slideover (`components/dashboard/job-details-slideover.tsx`)
- **Status:** ✅ Updated
- **Changes:**
  - Replaced `openPathAdvisor` import with `askPathAdvisor`
  - Updated `handleAskPathAdvisor` to use `askPathAdvisor()` with:
    - `source: 'job'`
    - `sourceId`: Job ID
    - `sourceLabel`: Job title + series + grade
    - `summary: 'Considering this position'`
    - Context payload with job details and prompt

#### 2.2 Job Search Page (`app/dashboard/job-search/page.tsx`)
- **Status:** ✅ Updated
- **Changes:**
  - Replaced `openPathAdvisor` import with `askPathAdvisor`
  - Updated `handleGetApplicationTips` to use `askPathAdvisor()` with:
    - `source: 'job'`
    - `sourceId`: Job ID
    - `sourceLabel`: Job title + series + grade
    - `summary: 'Considering this position'`
    - Context payload with job details and prompt

#### 2.3 Next Actions Card (`components/career-resume/next-actions-card.tsx`)
- **Status:** ✅ Updated
- **Changes:**
  - Replaced `openPathAdvisor` import with `askPathAdvisor`
  - Updated `handleAskPathAdvisor` to use `askPathAdvisor()` with:
    - `source: 'dashboard'`
    - `sourceLabel: 'Career Readiness Assessment'`
    - `summary: 'Completed career readiness assessment'`
    - Context payload with prompt

### 3. Made Focus Mode Anchor-Aware

#### 3.1 Suggested Prompts (`lib/pathadvisor/suggestedPrompts.ts`)
- **Purpose:** Source-scoped suggested prompts for PathAdvisor Focus Mode
- **Function:** `getScopedPrompts(source)`
- **Behavior:** Returns array of prompt strings relevant to the given anchor source
- **Prompts by Source:**
  - `job`: ["Tell me about this position", "How competitive am I for this role?", ...]
  - `resume`: ["Review my resume", "Suggest improvements", ...]
  - `benefits`: ["Explain these benefits", "How do these compare to private sector?", ...]
  - `import`: ["Help me organize this information", "What should I focus on?", ...]
  - `retirement`: ["Explain my retirement outlook", "How does FERS pension work?", ...]
  - `dashboard`: ["Help me understand my career outlook", "What should I focus on next?", ...]

#### 3.2 Right Rail View Model Builder (`lib/pathadvisor/focusRightRail.ts`) — NEW
- **Purpose:** Builds anchor-aware right rail view models for PathAdvisor Focus Mode
- **Why It Exists:** Day 43 UX contract requires right rail to become anchor-scoped, showing relevant context based on where the user initiated the Ask action
- **Key Types:**
  - `FocusRightRailRow`: A single label/value pair for display
  - `FocusRightRailModel`: Complete view model (title, subtitle, summary, rows, ctas, source)
  - `FocusRightRailDependencies`: External data sources (selectedJob, benefitsScenario, profile, etc.)
- **Main Function:** `buildFocusRightRailModel(activeAnchor, deps)`
  - Routes to source-specific builders based on `anchor.source`
  - Each builder uses anchor data + optional store lookups for context
  - Returns display-ready model with title, rows, and source icon type
- **Source-Specific Builders:**
  - `buildJobModel`: Shows job details (grade, agency, location, salary) from store lookup
  - `buildResumeModel`: Shows tailoring mode and target job from store
  - `buildBenefitsModel`: Shows scenario assumptions (salary, coverage, tenure) from store
  - `buildImportModel`: Minimal placeholder (anchor-only for Day 43)
  - `buildRetirementModel`: Minimal placeholder (anchor-only for Day 43)
  - `buildDashboardModel`: Shows profile and metrics context from stores
- **Graceful Fallback:** If store lookup fails or sourceId doesn't match, shows anchor data with clean fallback

#### 3.3 Focus Mode Updates (`components/path-advisor-focus-mode.tsx`)
- **Changes:**
  - Added import for `usePathAdvisorStore` and `getScopedPrompts`
  - Added imports for anchor-aware right rail: `buildFocusRightRailModel`, `useJobSearchStore`, `useBenefitsWorkspaceStore`, `useDashboardStore`
  - Reads `activeAnchor` from PathAdvisor store
  - **NEW: Store Reads for Context:** Reads from jobSearchStore (selectedJob), benefitsWorkspaceStore (scenarios), dashboardStore (compensation) for right rail context
  - **NEW: Right Rail Model:** Builds `rightRailModel` via `buildFocusRightRailModel()` when anchor exists
  - **Anchor Header:** Displays when `activeAnchor` exists:
    - Shows "Asked from: {sourceLabel}"
    - Shows anchor summary
    - Shows hint: "Ask from a different card to change this focus."
  - **Empty State:** Updated to show anchor-aware message when anchor exists
  - **NEW: Anchor Context Card:** When anchor exists, replaces generic Profile/Key Metrics cards with single "Anchor Context" card driven by the model:
    - Icon based on source type (Briefcase for job, Target for resume/dashboard, BarChart3 for benefits/retirement, etc.)
    - Title from model (e.g., "Job Context", "Benefits Context")
    - Subtitle showing anchor.sourceLabel (e.g., "GS-14 Program Analyst")
    - Summary showing anchor.summary (e.g., "Considering this position")
    - Rows from model (dynamic based on source and store data)
    - Respects privacy mode for sensitive values via `SensitiveValue` component
  - **Fallback:** When no anchor, shows original Profile/Key Metrics cards (backwards compatibility)
  - **Suggested Prompts:** Replaced generic "Suggested topics" with source-scoped prompts when anchor exists
    - Uses `getScopedPrompts(activeAnchor.source)` to get relevant prompts
    - Falls back to generic topics if no anchor (backwards compatibility)

### 4. Sidebar Role (Passive Mirror)

- **Status:** Sidebar continues to receive state updates (threads/context) automatically via AdvisorContext
- **No changes needed:** Sidebar is not relied upon as primary feedback surface (Focus Mode is primary)
- **Future:** Consider adding microcopy to clarify sidebar is a mirror/history surface (optional enhancement)

---

### 5. Onboarding Anchor Support & UX Improvements

#### 5.1 Onboarding Wizard (`components/onboarding-wizard.tsx`)
- **Status:** ✅ Updated with anchor support
- **Changes:**
  - Added imports for anchor system (`usePathAdvisorStore`, `buildAnchorId`, `normalizeSourceLabel`, `PathAdvisorAnchor`)
  - Updated `handlePathAdvisorHelp` to set a 'dashboard' anchor before calling `openPathAdvisor`:
    - `source: 'dashboard'`
    - `sourceId: 'onboarding'`
    - `sourceLabel: 'Onboarding - Grade Selection'`
    - `summary: 'Choosing grade band for job search'`
  - **Note:** Still uses `openPathAdvisor` (not `askPathAdvisor`) to preserve special onboarding behavior (keep wizard open, scroll normalization)

#### 5.2 Onboarding PathAdvisor Conversation (`components/dashboard/OnboardingPathAdvisorConversation.tsx`)
- **Status:** ✅ Updated with anchor support + UX fix
- **Changes:**
  - Added imports for anchor system
  - Updated `handleGradeHelpMeChoose` to set a 'dashboard' anchor before calling `openPathAdvisor`:
    - `source: 'dashboard'`
    - `sourceId: 'onboarding'`
    - `sourceLabel: 'Onboarding - Grade Selection'`
    - `summary: 'Choosing grade band for job search'`
  - **UX Fix:** Grade selection no longer auto-advances to next step
    - `handleGradeBandSelect` now only calls `answerCurrentStep(band)` without `goNext()`
    - User must click "Help me choose" or "Next" button to proceed
    - "Next" button now shows when `shouldUseGradeSelector && currentGradeBand !== null`
  - **Rationale:** Allows users time to decide if they want PathAdvisor help before advancing

---

## Latest Visibility UX (Day 43 Continuation)

### Goal

Implement Focus Mode "latest visibility" UX:
- When Focus Mode opens due to an "Ask PathAdvisor" action, auto-scroll to the newest message so the user immediately sees the latest inquiry/answer.
- Preserve user control: if the user has scrolled up reading older content, do NOT force-scroll on new messages. Instead show a "Jump to latest" control + subtle "New message" indicator.
- Highlight the newest assistant message for ~1.2 seconds after an Ask-open so it's visually obvious what changed.

### Implementation Summary

#### 6.1 Store Flag for Ask-Open Detection (`store/pathAdvisorStore.ts`)

**Purpose:** Provide a deterministic signal that Focus Mode was opened due to an "Ask" action.

**New State Fields:**
- `lastOpenReason: 'ask' | 'manual' | null` — Why Focus Mode was last opened
- `lastOpenAt: number | null` — Timestamp when Focus Mode was last opened

**New Actions:**
- `setLastOpenReason(reason)` — Called by `askPathAdvisor()` with `'ask'` to signal auto-scroll + highlight
- `clearLastOpenReason()` — Called by Focus Mode after handling the Ask-open event

**Why This Design:**
- Store flag is preferred over heuristic (tracking `activeAnchor` changes) for determinism
- Timestamp allows Focus Mode to detect new Ask events even if reason doesn't change
- Cleared after handling to prevent re-triggering on subsequent re-renders

#### 6.2 Auto-Scroll + Near-Bottom Tracking (`components/path-advisor-focus-mode.tsx`)

**Scroll Container:**
- The scrollable container is `messageListRef` div (the message list)
- Uses `overflow-y-auto` with CSS containment for performance

**End-of-Thread Sentinel:**
- `endSentinelRef` placed after message list: `<div ref={endSentinelRef} aria-hidden="true" />`
- Used as scroll target for `scrollToBottom()`

**Near-Bottom Tracking:**
- `isNearBottom` state (default: `true`)
- Measured in `handleMessageListScroll` handler:
  ```typescript
  const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
  const nearBottom = remaining < 120; // 120px threshold
  ```
- If user scrolls up (not near bottom), subsequent new messages show indicator instead of auto-scroll

**scrollToBottom Helper:**
```typescript
const scrollToBottom = useCallback(function (behavior: 'auto' | 'smooth' = 'smooth') {
  if (endSentinelRef.current) {
    endSentinelRef.current.scrollIntoView({ behavior: behavior, block: 'end' });
  }
}, []);
```

#### 6.3 Auto-Scroll Behavior Rules

**On Ask-Open Event:**
1. Detect via `lastOpenReason === 'ask'` and `lastOpenAt` changed
2. Scroll to bottom immediately with `behavior: 'auto'` (instant for snappy UX)
3. Find newest assistant message and highlight it (1.2s duration)
4. Clear `lastOpenReason` after handling

**On New Messages (during open session):**
1. Detect via `messages.length` increase
2. If `isNearBottom === true`: smooth scroll to bottom
3. If `isNearBottom === false`: show "New message" indicator + "Jump to latest" button

**On Modal Close:**
1. Reset `isNearBottom` to `true`
2. Clear `hasNewMessages` indicator
3. Clear `highlightMessageId`

#### 6.4 Message Highlight After Ask-Open

**State:**
- `highlightMessageId: string | null` — ID of message to highlight

**Trigger:**
- On Ask-open, find newest assistant message:
  ```typescript
  const newestAssistantMessage = messages
    .filter(function (m) { return m.role === 'assistant'; })
    .slice(-1)[0];
  ```
- Set `highlightMessageId(newestAssistantMessage.id)`
- Clear after 1.2 seconds via `setTimeout`

**Styling (trust-first, subtle):**
- Normal assistant message: `border-secondary/30 bg-secondary/20`
- Highlighted: `border-accent/60 bg-accent/10 ring-2 ring-accent/20`
- `transition-all duration-300` for smooth highlight appearance

**Why Subtle:**
A flashy animation would feel aggressive and break trust. The subtle accent border draws attention without being intrusive. The user sees what changed without the UI shouting at them.

#### 6.5 "Jump to Latest" Floating Control

**Shown When:**
- `hasNewMessages === true` (new messages arrived)
- `isNearBottom === false` (user has scrolled up)

**UI:**
- Floating button at bottom of message area
- Small, non-intrusive, doesn't block content
- Uses accent color for attention without aggression

```tsx
<div className="sticky bottom-2 left-0 right-0 flex justify-center pointer-events-none">
  <Button
    variant="secondary"
    size="sm"
    className="pointer-events-auto shadow-lg border border-accent/30 bg-background/95 backdrop-blur-sm hover:bg-accent/10 gap-1.5"
    onClick={handleJumpToLatest}
  >
    <span className="text-xs text-muted-foreground">New message</span>
    <ChevronDown className="w-3 h-3 text-accent" />
    <span className="text-xs font-medium">Jump to latest</span>
  </Button>
</div>
```

**Behavior:**
- Click → smooth scroll to bottom
- Click → set `isNearBottom = true`
- Click → clear `hasNewMessages`

---

### Testing Results (Latest Visibility UX)

#### Build/Lint/Type Verification

```bash
$ pnpm typecheck
✓ tsc -p tsconfig.json --noEmit

$ pnpm lint
✓ eslint . (0 errors, 4 pre-existing warnings)

$ pnpm build
✓ Next.js 16.0.7 (Turbopack)
✓ Compiled successfully in 8.3s
✓ Generating static pages (31/31) in 2.7s
```

#### Manual Testing Checklist

- [ ] Open Focus Mode via Ask from a long Benefits page:
  - **EXPECT:** Focus opens + auto-scroll to newest message; highlight newest assistant message
- [ ] While Focus is open, scroll up several screens, then trigger another Ask:
  - **EXPECT:** No forced scroll; shows "New message / Jump to latest"
- [ ] Click Jump to latest:
  - **EXPECT:** scroll to bottom smoothly; highlight appears on newest assistant message
- [ ] Verify no scroll-jank / infinite scroll loops occur

---

## Bug Fixes (Day 43 Continuation)

### Benefits Page Bottom "Ask" CTA Fix

**Bug:** On the Benefits page, clicking "Ask" from the bottom of the page (suggested prompts section) did not visibly update PathAdvisor. Users were only updating sidebar/shared state off-screen (old behavior via `setIsPanelOpen(true)`). Day 43 contract requires Ask → Anchor → Focus immediately.

**Root Cause:** The `handleSuggestedPrompt()` function in `app/explore/benefits/workspace/page.tsx` was:
1. Setting the anchor manually (good)
2. Setting context and prompt manually (good)
3. Calling `advisorContext.setIsPanelOpen(true)` - Opens sidebar, NOT Focus Mode (bad)
4. Never calling `setShouldOpenFocusMode(true)` (missing)

**Fix:** Replaced entire `handleSuggestedPrompt()` function to use `askPathAdvisor()` from `lib/pathadvisor/askPathAdvisor.ts`:

```tsx
// Before (Day 42):
function handleSuggestedPrompt(prompt: string, intent?: string, cardName?: string) {
  // ... 80+ lines of manual setup ...
  advisorContext.setIsPanelOpen(true); // Opens sidebar, not Focus Mode
}

// After (Day 43):
function handleSuggestedPrompt(prompt: string, intent?: string, cardName?: string) {
  askPathAdvisor({
    source: 'benefits',
    sourceId: activeScenarioId,
    sourceLabel: cardName || 'Benefits Workspace',
    summary: `Asking about ${cardName} in ${modeText}`,
    contextPayload: {
      source: 'scenario',
      prompt: enhancedPrompt,
      scenarioId: activeScenarioId,
      scenarioType: 'benefits',
    },
    contextFunctions: {
      setContext: advisorContext.setContext,
      setPendingPrompt: advisorContext.setPendingPrompt,
      setShouldOpenFocusMode: advisorContext.setShouldOpenFocusMode,
    },
  });
}
```

**Impact:**
- Simplified import: Only `askPathAdvisor` instead of `usePathAdvisorStore`, `buildAnchorId`, `normalizeSourceLabel`, `PathAdvisorAnchor`
- All 6 Benefits Ask CTAs now open Focus Mode immediately:
  - Compare to Private Offer (suggested prompt)
  - What matters for X year stay? (suggested prompt)
  - Explain FEHB like I'm new to insurance (suggested prompt)
  - Plus the card-specific Ask buttons (FEHB, TSP, Leave, etc.)

**Testing (Benefits Page Bottom CTA):**
- [ ] Scroll to very bottom of Benefits workspace
- [ ] Click any suggested prompt button (e.g., "What matters for 3-5 year stay?")
- **Expected:** Focus Mode opens immediately (overlay visible)
- **Expected:** Anchor header shows "Benefits Workspace" or card name + summary
- **Expected:** Right rail shows Benefits Context (scenario, coverage, tenure)
- [ ] Same test when scrolled near top (still works)
- [ ] Click another Ask from different benefits card → anchor replaces cleanly

---

## TODO: Entry Points Still Using openPathAdvisor

The following entry points still use `openPathAdvisor` and should be updated to use `askPathAdvisor()` in future work:

1. **Resume Builder Page** (`app/dashboard/resume-builder/page.tsx`)
   - Needs investigation to find all `openPathAdvisor` calls
   - **Note:** May have resume-specific context requirements

2. **Grade Selector** (`components/onboarding/grade-selector.tsx`)
   - Referenced but may be used via onboarding components above

**Previously in TODO (now complete with anchor support):**
- ~~Resume Builder Page~~ → ✅ Now uses askPathAdvisor + preferredSurface: 'dock' (Day 43 Follow-up)
- ~~Onboarding Wizard~~ → ✅ Now sets dashboard anchor
- ~~Onboarding PathAdvisor Conversation~~ → ✅ Now sets dashboard anchor
- ~~Benefits Workspace~~ → ✅ Now sets benefits anchor (Day 43 fix)
- ~~Job Search Workspace Dialog~~ → ✅ Now sets job anchor (Day 43 fix)
- ~~Tailoring Session Context~~ → ✅ Now sets resume anchor (Day 43 fix)
- ~~Help Menu~~ → ✅ Now sets dashboard anchor (Day 43 fix)

---

## Day 43 Follow-up: Resume Builder Ask Visibility + Side-by-Side Workflow

**Date:** December 31, 2025

### Problems Addressed

**Problem A (Bug):** Resume Builder workspace "Ask" buttons did not open a visible PathAdvisor surface. Some CTAs used `requestOpenWorkspacePathAdvisor()` which only opened the sidebar, not a primary visible surface.

**Problem B (UX):** Resume Builder users need to view/edit their resume simultaneously with PathAdvisor guidance. Full Focus Mode hides the resume.

### Solution: `preferredSurface` Parameter

Extended `askPathAdvisor()` with:

```typescript
preferredSurface?: 'focus' | 'dock'
```

- **'focus'** (default): Opens full-screen Focus Mode
- **'dock'**: Opens docked side-by-side panel within Resume Builder

### Files Changed (Day 43 Follow-up)

| File | Purpose |
|------|---------|
| `lib/pathadvisor/askPathAdvisor.ts` | Added `preferredSurface` param with 'focus' \| 'dock' options |
| `store/pathAdvisorStore.ts` | Added `shouldOpenDockedPanel` state + setters |
| `components/pathadvisor/DockedPathAdvisorPanel.tsx` | NEW: Side-by-side docked panel for Resume Builder |
| `components/resume-builder/tailoring-workspace.tsx` | Added docked panel + uses preferredSurface: 'dock' |
| `components/resume-builder/tailoring-workspace-overlay.tsx` | Uses preferredSurface: 'dock' for export modal |
| `components/dashboard/job-details-slideover.tsx` | Uses preferredSurface: 'dock' in tailoring mode |

### Manual Testing — Day 43 Follow-up

- [ ] In Resume Builder workspace, click job details "Ask about this job"
  - EXPECT: Docked PathAdvisor opens (not Focus Mode), anchor shows job context
- [ ] Click "Ask PathAdvisor for Review Suggestions" from export modal
  - EXPECT: Docked PathAdvisor opens, anchor shows resume context
- [ ] Click "Pop out to Focus Mode" button in docked panel
  - EXPECT: Focus Mode opens showing same anchor
- [ ] Verify Benefits/Jobs pages elsewhere still open Focus Mode on Ask
  - EXPECT: Focus Mode (full-screen), not docked panel

### Build Verification

```bash
$ pnpm lint
# Exit code: 0 (only pre-existing warnings)

$ pnpm typecheck
# Exit code: 0

$ pnpm build
# Exit code: 0
```

---

## Files Changed

| File | Purpose |
|------|---------|
| `lib/pathadvisor/anchors.ts` | PathAdvisorAnchor type and helper functions (NEW) |
| `store/pathAdvisorStore.ts` | PathAdvisor store with activeAnchor state + **Day 43 Follow-up: shouldOpenDockedPanel** |
| `lib/pathadvisor/askPathAdvisor.ts` | Global askPathAdvisor function + **Day 43 Follow-up: preferredSurface param** |
| `lib/pathadvisor/suggestedPrompts.ts` | Source-scoped suggested prompts (NEW) |
| `lib/pathadvisor/focusRightRail.ts` | Anchor-aware right rail view model builder (NEW) |
| `components/path-advisor-focus-mode.tsx` | Anchor-aware Focus Mode UI + right rail updates + **Latest Visibility UX** |
| `components/pathadvisor/DockedPathAdvisorPanel.tsx` | **Day 43 Follow-up: NEW** Side-by-side docked panel for Resume Builder |
| `components/dashboard/job-details-slideover.tsx` | Updated to use askPathAdvisor + **Day 43 Follow-up: preferredSurface: 'dock' in tailoring mode** |
| `app/dashboard/job-search/page.tsx` | Updated to use askPathAdvisor |
| `components/career-resume/next-actions-card.tsx` | Updated to use askPathAdvisor |
| `app/explore/benefits/workspace/page.tsx` | FIXED: handleSuggestedPrompt() now uses askPathAdvisor() for immediate Focus Mode |
| `components/dashboard/job-search-workspace-dialog.tsx` | Added anchor setting for Focus Mode right rail |
| `contexts/tailoring-session-context.tsx` | Added anchor setting for Focus Mode right rail |
| `components/help-menu.tsx` | Added anchor setting for Focus Mode right rail |
| `components/onboarding-wizard.tsx` | Added anchor setting + still uses openPathAdvisor for special behavior |
| `components/dashboard/OnboardingPathAdvisorConversation.tsx` | Added anchor setting + UX fix: grade selection no longer auto-advances |
| `components/resume-builder/tailoring-workspace.tsx` | **Day 43 Follow-up:** Added DockedPathAdvisorPanel + preferredSurface: 'dock' |
| `components/resume-builder/tailoring-workspace-overlay.tsx` | **Day 43 Follow-up:** preferredSurface: 'dock' for export modal |

---

## Testing Checklist

### Manual Testing — Right Rail Anchor-Aware Behavior

- [ ] Click Ask from dashboard card → right rail shows "Dashboard Context" with profile info
- [ ] Click Ask from a Job → right rail switches to "Job Context" instantly with job details (grade, agency, location, salary)
- [ ] Trigger another Ask from different job → right rail updates to new job context instantly
- [ ] Ask from Benefits workspace → right rail shows "Benefits Context" with scenario info
- [ ] Ask from Resume Builder → right rail shows "Resume Context" with tailoring mode
- [ ] Confirm Focus Mode still opens immediately for every Ask
- [ ] Confirm anchor header in message area shows correct source label and summary
- [ ] Confirm suggested prompts change based on anchor source
- [ ] Refresh page → anchor clears, right rail falls back to generic Profile/Key Metrics cards

### Manual Testing — Onboarding UX

- [ ] Onboarding "Help me choose" button → Focus Mode shows "Dashboard Context" (not stale anchor)
- [ ] Onboarding grade selection does NOT auto-advance to location step
- [ ] After selecting a grade, "Next" button appears to manually advance
- [ ] User can click "Help me choose" after selecting a grade (before clicking Next)
- [ ] Onboarding wizard stays open when Focus Mode opens (special behavior preserved)

### Previous Manual Testing (Anchor System)

- [ ] Ask from Jobs → Focus opens immediately, anchor shows correct source and summary
- [ ] Ask from Resume → Focus opens immediately, anchor correct
- [ ] Ask from Benefits → Focus opens immediately, anchor correct
- [ ] New Ask replaces anchor cleanly
- [ ] Sidebar still shows updated thread state after asks
- [ ] Refresh page: verify expected persistence behavior (anchor should not persist - session-scoped only)

### Automated Testing

- [ ] `pnpm lint` - **Status:** Pending
- [ ] `pnpm typecheck` - **Status:** Pending
- [ ] `pnpm test` - **Status:** Not run (tests may exist but not required for Day 43)
- [ ] `pnpm build` - **Status:** Pending

---

## Patch Artifacts

```bash
$ dir artifacts\day-43*.patch
    Directory: C:\Users\jorie\Desktop\PathOS\codebase\fedpath-tier1-frontend\artifacts

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        12/31/2025   4:24 PM         174956 day-43-this-run.patch
-a----        12/31/2025   4:24 PM              0 day-43.patch

$ git diff --stat (unstaged changes for Latest Visibility UX)
 app/explore/benefits/workspace/page.tsx            |  97 ++-
 components/OnboardingPathAdvisorConversation.tsx   |  23 +-
 components/dashboard/job-search-workspace-dialog.tsx |  17 +
 components/help-menu.tsx                           |  17 +
 components/onboarding-wizard.tsx                   |  17 +
 components/path-advisor-focus-mode.tsx             | 681 ++++++++++++++----
 contexts/tailoring-session-context.tsx             |  17 +
 docs/change-briefs/day-43.md                       |  54 +-
 docs/merge-notes.md                                | 353 ++++++++++-
 lib/pathadvisor/askPathAdvisor.ts                  |   7 +
 store/pathAdvisorStore.ts                          |  81 ++-
 13 files changed, 1131 insertions(+), 233 deletions(-)
```

**Status:** `day-43-this-run.patch` contains all unstaged changes (174KB)

---

## Day 43 Option A: Collapsible Context Panel (Single-Column Layouts)

**Decision: Option A (LOCKED)**

### Problem

In Focus Mode, when the layout is single-column (e.g., Resume Builder, mobile/tablet views), there is NO right rail to show anchor context cards. The Day 43 visibility contract requires that Focus Mode ALWAYS has an anchor-aware context surface.

### Solution: Collapsible Context Panel

Instead of forcing a right rail into single-column layouts, we render a COLLAPSIBLE "Context" panel at the top of the thread (below anchor header).

**New Component:** `components/pathadvisor/AnchorContextPanel.tsx`

**Responsibilities:**
- Read `activeAnchor` from PathAdvisor store
- Build context model using existing `buildFocusRightRailModel()` helper
- Show collapsible card with anchor context (source label, summary, rows)
- Auto-expand when Focus Mode opens via Ask action (Day 43 visibility contract)
- User can collapse to save space
- New Ask action re-expands (visibility contract)

### Layout Rules

| Screen Size | Context Surface |
|-------------|----------------|
| Below lg (mobile/tablet) | AnchorContextPanel inline (primary surface) |
| lg+ (desktop) | Right rail cards (AnchorContextPanel hidden via `lg:hidden`) |

### Auto-Expand Behavior

**When Focus Mode opens via Ask action:**
1. `lastOpenReason === 'ask'` detected in store
2. `AnchorContextPanel` listens for `lastOpenAt` changes
3. Panel auto-expands to show full context
4. User can collapse; new Ask re-expands

### UX Hint (Day 43 Clarity Enhancement)

A subtle microcopy hint appears in both surfaces:

> "Ask from another card to change this focus."

This reinforces the anchor mental model without adding new behavior.

### Resume Builder Updates

All Resume Builder Ask CTAs now use `askPathAdvisor()`:

1. **`app/dashboard/resume-builder/page.tsx`**
   - `handleAskPathAdvisorForExport()` updated
   - Creates anchor: `source: 'resume'`, `sourceLabel: 'Resume Export Review'`

2. **`components/resume-builder/tailoring-workspace.tsx`**
   - `ReviewExportStep.onAskPathAdvisor` updated
   - Creates anchor with target job context if available

3. **`components/resume-builder/tailoring-workspace-overlay.tsx`**
   - `ReviewExportStep.onAskPathAdvisor` updated
   - Creates anchor for general resume export review

### Why Resume Builder Was Missing Cards

Resume Builder focus mode operates in a modal overlay context. The right rail with lg:flex is hidden because:
1. The overlay is full-screen and captures focus
2. On smaller screens (below lg), right rail was always hidden
3. Even on desktop, the overlay layout doesn't include the right rail

The AnchorContextPanel solves this by providing inline context regardless of layout.

### Files Changed

- `components/pathadvisor/AnchorContextPanel.tsx` (NEW)
- `components/path-advisor-focus-mode.tsx` (renders AnchorContextPanel, adds hint to right rail)
- `app/dashboard/resume-builder/page.tsx` (uses askPathAdvisor)
- `components/resume-builder/tailoring-workspace.tsx` (uses askPathAdvisor)
- `components/resume-builder/tailoring-workspace-overlay.tsx` (uses askPathAdvisor)

---

## Day 43 (Continuation) — Resume Review MODAL Workspace Mode

**Date:** December 31, 2025

### Core Principles (LOCKED)

1. **Resume Review is a MODE, not a destination.**
   - Must NOT navigate away from Resume Builder.
   - Must preserve scroll, cursor, and edit state.

2. **PathAdvisor is a COLLABORATIVE REVIEWER, not a ChatGPT author.**
   - No silent edits.
   - No automatic rewrites.
   - All changes must be visible, justified, and user-approved.

3. **During Resume Review:**
   - Resume MUST remain editable.
   - PathAdvisor MUST remain visible.
   - Suggested changes are secondary artifacts, not the main interaction.

### Implementation Summary

#### PART A — Convert Resume Review to Modal Workspace Mode

**Before (route-based):**
- "Review my resume" button navigated to `/dashboard/resume-builder/review`
- Resume Builder was unmounted
- User lost editing context

**After (modal mode):**
- "Review my resume" button sets `resumeReviewMode = true`
- Full-screen modal overlay opens ABOVE Resume Builder
- Resume Builder remains mounted underneath (dimmed)
- No URL change, no scroll reset, no unmounting editor state

#### PART B — Modal Workspace Layout

```
+------------------------------------------------------------------+
| ✨ Resume Review    Reviewing with PathAdvisor    [Exit Review]  |
+------------------------------------------------------------------+
|                          |                                       |
|   LEFT PANE (60%):       |   RIGHT PANE (40%):                   |
|   Live, EDITABLE resume  |   PathAdvisor Review Panel            |
|   - Same editor as       |   - Anchor header                     |
|     Resume Builder       |   - Conversational guidance           |
|   - Cursor/typing works  |   - Collapsible "Proposed             |
|   - Scroll preserved     |     Improvements" section             |
|                          |   - Chat input                        |
|                          |                                       |
+------------------------------------------------------------------+
```

**Exit Behavior:**
- Click "Exit Review" → `resumeReviewMode = false`
- Modal closes
- User returns to exact prior editing context
- NO navigation, NO reload, NO loss of state

#### PART C — PathAdvisor Behavior in Review Mode

**Auto-anchor on open:**
When `resumeReviewMode` becomes true, PathAdvisor anchor is set:
- `source: 'resume'`
- `sourceLabel: 'Resume Review'`
- `summary: 'Collaboratively reviewing your resume for federal readiness and job alignment'`

**Conversational posture (IMPORTANT):**
PathAdvisor opens with guidance, NOT a list of changes:

> "I'm reviewing your resume against federal expectations and your selected role.
> As you edit, I'll flag opportunities to improve clarity, scope, and alignment."

**Proposed Improvements are SECONDARY:**
- Section renamed to "Proposed Improvements"
- Collapsible by default (`isProposalsOpen = false`)
- Appears only AFTER PathAdvisor interaction OR explicit user request

#### PART D — Change Proposal Contract (NO SILENT EDITS)

All resume rewrite suggestions use `PathAdvisorChangeProposal` objects.

Each proposal MUST show:
- **BEFORE text** - Original user content
- **AFTER text** - Suggested improvement
- **WHY this change** - Explicit justification
- **MAPS TO** - Job requirement, USAJOBS expectation, GS-level norm

**Actions:**
- Copy - Always enabled
- Dismiss - Always enabled
- Apply - Only enabled if wiring exists

**CRITICAL:** Changes are NEVER applied automatically.

#### PART E — Live Collaboration Rules

1. Resume remains editable at all times
2. User can type freely while PathAdvisor is open
3. PathAdvisor reacts contextually
4. No blocking overlays or locks

**PathAdvisor edit assistance gating:**
PathAdvisor may ONLY generate a Change Proposal when:
- User explicitly asks for a rewrite
- User clicks "Suggest improvement" / "Review this section"
- NEVER auto-generate proposals on load

### Files Changed

| File | Purpose |
|------|---------|
| `components/resume-builder/resume-review-modal.tsx` | **NEW:** Full-screen modal overlay for collaborative resume review |
| `app/dashboard/resume-builder/page.tsx` | Added `resumeReviewMode` state, updated button to set mode instead of navigate, rendered ResumeReviewModal |

### Manual Testing Checklist

- [ ] Click "Review my resume"
  - **EXPECT:** No route change
  - **EXPECT:** Modal workspace opens (full-screen overlay)
  - **EXPECT:** Resume is editable in left pane
  - **EXPECT:** PathAdvisor visible on the right

- [ ] Type in resume while PathAdvisor is open
  - **EXPECT:** No interruptions
  - **EXPECT:** No forced rewrites
  - **EXPECT:** Changes persist

- [ ] Ask PathAdvisor for a rewrite
  - **EXPECT:** Expand "Proposed Improvements" section
  - **EXPECT:** Change Proposal Card appears with Before/After/Why/MapsTo
  - **EXPECT:** Nothing is applied until user clicks Apply

- [ ] Exit review
  - **EXPECT:** Modal closes
  - **EXPECT:** Editor state preserved
  - **EXPECT:** URL unchanged

---

## Day 43 (Final) — Resume Review Consolidation & Anchor Reset

**Date:** December 31, 2025

### Authoritative UX Rules (DO NOT VIOLATE)

1. **Resume Review is a MODE inside the Resume Workspace, not a separate page.**
2. **Clicking "Review my resume" must NOT navigate away.**
3. **The resume must remain visible and editable during review.**
4. **PathAdvisor provides guidance while the user edits, not a read-only analysis.**
5. **PathAdvisor anchor context must reset or re-anchor on route changes.**

### Changes Made

#### PART 1: Resume Review Mode (Workspace-Level)

**Problem:** "Review my resume" button navigated to `/dashboard/resume-builder/review`, unmounting the Resume Builder.

**Solution:**
- Replaced navigation with `resumeReviewMode` state flag
- Updated `TailoringWorkspace` and `TailoringWorkspaceOverlay` to accept `onReviewResume` callback
- Updated `/dashboard/resume-builder/review` route to redirect to Resume Builder with `?openReview=true` query param
- Resume Builder detects query param and auto-opens Review modal

**Files Changed:**
| File | Change |
|------|--------|
| `components/resume-builder/tailoring-workspace.tsx` | Added `onReviewResume` prop, replaced navigation with callback |
| `components/resume-builder/tailoring-workspace-overlay.tsx` | Added `onReviewResume` prop, replaced navigation with callback |
| `app/dashboard/resume-builder/page.tsx` | Added `onReviewResume` callback to overlay, added `openReview` query param detection |
| `app/dashboard/resume-builder/review/page.tsx` | Deprecated: Now redirects to Resume Builder with `?openReview=true` |

#### PART 2: New `resume-review` Anchor Type

**Purpose:** Distinct anchor type for Resume Review mode to enable specialized guidance.

**Changes:**
- Added `'resume-review'` to `PathAdvisorAnchorSource` type
- Added fallback label `'Resume Review'` to `normalizeSourceLabel()`
- Added scoped prompts for `resume-review` in `getScopedPrompts()`
- Added `buildResumeReviewModel()` in `focusRightRail.ts`
- Updated Focus Mode to show `FileCheck` icon for `resume-review` source
- Updated `resume-review-modal.tsx` to use `'resume-review'` source type

**Scoped Prompts for Resume Review:**
```typescript
'resume-review': [
  'How does my resume align with federal standards?',
  'Are my accomplishments specific enough?',
  'What keywords am I missing for this series?',
  'Help me strengthen this bullet',
  'Is my experience described at the right level?',
  'What would make this section stronger?',
]
```

#### PART 3: Anchor Reset on Route Navigation (Critical Bug Fix)

**Problem:** PathAdvisor retained stale anchor/card UI when navigating between pages.

**Solution:** Created `useAnchorRouteReset` hook that:
- Watches for route changes via `usePathname()`
- Clears active anchor on navigation
- Optionally clears proposals for old anchor
- Preserves conversation thread history (stored in AdvisorContext)

**Files Created:**
| File | Purpose |
|------|---------|
| `hooks/use-anchor-route-reset.ts` | Custom hook for anchor cleanup on navigation |

**Integration:**
- Hook is called in `components/app-shell.tsx`
- Runs on every route change
- Ensures sidebar never shows cards from previous page's anchor

### Testing Checklist

- [ ] Click "Review my resume" from Resume Builder
  - **EXPECT:** No navigation (URL stays at /dashboard/resume-builder)
  - **EXPECT:** Resume Review modal opens
  - **EXPECT:** Resume is editable in left pane

- [ ] Navigate to `/dashboard/resume-builder/review` directly
  - **EXPECT:** Redirect to `/dashboard/resume-builder?openReview=true`
  - **EXPECT:** Resume Review modal opens automatically

- [ ] Ask PathAdvisor from Job Search, then navigate to Resume Builder
  - **EXPECT:** Job anchor cleared on navigation
  - **EXPECT:** Sidebar shows no cards from Job context
  - **EXPECT:** Resume Builder starts with clean slate

- [ ] Open Resume Review, then navigate away
  - **EXPECT:** Resume Review anchor cleared
  - **EXPECT:** New page has no stale context

---

## Definition of Done Checklist

- [x] Every Ask CTA uses askPathAdvisor() (key entry points updated, TODOs documented)
- [x] Focus Mode opens immediately on Ask, every time (via askPathAdvisor)
- [x] Focus Mode displays anchor origin + summary + scoped prompts (implemented)
- [x] Sidebar is not used as confirmation surface (Focus Mode is primary)
- [x] **Latest Visibility UX:** Auto-scroll to newest message on Ask-open
- [x] **Latest Visibility UX:** Near-bottom tracking preserves user control
- [x] **Latest Visibility UX:** "Jump to latest" control when user scrolls up
- [x] **Latest Visibility UX:** Highlight newest assistant message after Ask-open (~1.2s)
- [x] **Option A:** Collapsible Context Panel for single-column layouts (Resume Builder)
- [x] **Option A:** AnchorContextPanel auto-expands on Ask-open
- [x] **Option A:** UX hint text in both panel and right rail
- [x] **Resume Builder:** All Ask CTAs use askPathAdvisor()
- [x] **Resume Review Modal:** MODE, not navigation (Day 43 Continuation)
- [x] **Resume Review Modal:** Editable resume + PathAdvisor split view
- [x] **Resume Review Modal:** Auto-anchor on open
- [x] **Resume Review Modal:** Collapsible Proposed Improvements section
- [x] **Resume Review Modal:** No silent edits (Change Proposal contract)
- [x] **Resume Review Consolidation:** "Review my resume" no longer navigates (Day 43 Final)
- [x] **Resume Review Consolidation:** Deprecated `/resume-builder/review` redirects to modal
- [x] **Resume Review Consolidation:** New `resume-review` anchor type with scoped prompts
- [x] **Anchor Reset:** `useAnchorRouteReset` hook clears anchor on navigation
- [x] **Anchor Reset:** Sidebar never shows stale cards from previous page
- [x] merge-notes + change brief updated
- [x] patch artifacts generated (day-43.patch, day-43-this-run.patch)
- [x] lint/typecheck/build pass (verified Dec 31, 2025)

---

## Notes

- **Onboarding Entry Points:** Left as TODO because they may have special requirements (keeping wizard open, etc.)
- **Benefits Workspace:** ✅ FIXED - `handleSuggestedPrompt()` now uses `askPathAdvisor()` so Focus Mode opens immediately
- **Resume Builder:** ✅ FIXED (Day 43 Option A) - All Ask CTAs now use `askPathAdvisor()` and Context panel shows in single-column layout
- **Backwards Compatibility:** Focus Mode still shows generic suggested topics when no anchor exists (backwards compatible)
- **Session Scope:** Anchors are session-scoped (no persistence) - cleared on page refresh
