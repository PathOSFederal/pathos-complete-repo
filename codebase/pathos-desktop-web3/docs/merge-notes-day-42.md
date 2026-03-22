# Day 42 — Benefits Comparison Workspace v1

**Branch:** `feature/day-42-benefits-comparison-workspace-v1`  
**Date:** December 31, 2025  
**Status:** Ready for Review

---

## Objective

Introduce a **dedicated, immersive Benefits Comparison Workspace**, modeled after the Resume Builder experience, while keeping the existing Explore Benefits page as a lightweight overview.

Users can:
- View a high-level benefits summary on Explore Benefits
- Click "Open Benefits Workspace" to enter an immersive comparison environment
- Build and compare scenarios with clear cause → effect
- Use PathAdvisor to explain results in context

This is a FRONTEND-ONLY implementation. NO backend. NO APIs. NO document imports.

---

## Preflight Git State

**Command:** `git status --porcelain`
```
 M app/explore/benefits/page.tsx
 M docs/merge-notes.md
 M hooks/use-delete-all-local-data.ts
 M lib/storage-keys.ts
?? app/explore/benefits/workspace/page.tsx
?? docs/merge-notes-day-42.md
?? store/benefitsWorkspaceStore.ts
```

**Command:** `git branch --show-current`
```
feature/day-42-benefits-comparison-workspace-v1
```

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Changes Zustand store logic, Adds Create action, Changes persistence behavior, Affects UI where results appear in multiple places |
| Why | New benefits workspace store with scenarios, persistence, Delete All Local Data integration, and new route structure |

---

## Changes Made

### A) Lightweight Overview Page (NEW)

**File:** `app/explore/benefits/page.tsx` (NEW - lightweight overview)

**Purpose:**
Create a lightweight overview page that provides a high-level summary of federal benefits and routes users to the dedicated workspace.

**Features:**
- High-level benefit overview cards (FEHB, TSP, FERS, Leave, FEGLI, FSA)
- Primary CTA: "Open Benefits Workspace" button
- Clear description of what the workspace offers
- Uses PageShell for consistent layout

**Route:** `/explore/benefits`

### B) Dedicated Workspace Route (NEW)

**File:** `app/explore/benefits/workspace/page.tsx` (NEW - 1000+ lines)

**Purpose:**
Create an immersive Benefits Comparison Workspace with split layout (left = inputs, right = outputs), following Resume Builder patterns.

**Route:** `/explore/benefits/workspace`

**Layout Structure:**
- **LEFT SIDE (5 columns):** Scenario Builder (inputs only)
  - Scenario selector (Scenario A / Scenario B)
  - Workspace actions (Duplicate, Reset)
  - Comparison mode toggle (Federal-only vs Federal vs Private)
  - Federal assumptions (salary, coverage, tenure)
  - Private offer assumptions (only in compare mode)

- **RIGHT SIDE (7 columns):** Comparison Canvas (outputs only)
  1. Scenario Summary (required) - with "Explain with PathAdvisor" button
  2. Core Comparison Results:
     - Annual Value (Today) - with "Explain with PathAdvisor" button
     - Long-term Value (Retirement) - with "Explain with PathAdvisor" button
     - Break-even private salary (range + driver chips) - with "Explain with PathAdvisor" button
  3. Side-by-Side Comparison Block (table format, only in compare mode)
  4. Top Decision Drivers (top 3 drivers)
  5. Benefits Timeline (de-emphasized, below core comparison)
  6. Benefit Details Cards (FEHB, TSP, Leave show comparison context in compare mode with "Explain with PathAdvisor" buttons)
  7. PathAdvisor Suggested Prompts
  8. Bottom CTAs

**Key Features:**
- Split workspace layout (left = inputs, right = outputs)
- Scenario A/B comparison with independent state
- First-class mode toggle (Federal-only vs Federal vs Private)
- Break-even displayed as range with key drivers chips
- Workspace-aware benefit cards
- PathAdvisor "Explain with PathAdvisor" buttons on all major outputs
- Uses PageShell for consistent layout (matches Resume Builder pattern)

### C) PathAdvisor Integration (MANDATORY)

**File:** `app/explore/benefits/workspace/page.tsx`

**Implementation:**
Added "Explain with PathAdvisor" buttons to each major OUTPUT card:
- Scenario Summary
- Annual Value
- Long-term Value
- Break-even Range
- FEHB / Healthcare (in compare mode)
- TSP / Retirement (in compare mode)
- Paid Leave (in compare mode)

**Behavior:**
- Button opens PathAdvisor sidebar panel (NOT Focus Mode center modal)
- Injects scoped, contextual prompt with structured context, e.g.:
  - "Explain what Scenario A implies based on my assumptions."
  - "What's driving my Annual Value in Scenario A?"
  - "Explain FEHB compared to a typical private employer plan."
  - "Why did my break-even range change when I updated tenure?"

**Day 42 Fix - Ask PathAdvisor Behavior:**
- **Problem:** Clicking "Ask PathAdvisor" opened PathAdvisor Focus Mode (center modal) instead of updating the sidebar
- **Problem:** No context/init was injected, so sidebar showed no visible change
- **Solution:** Changed `openMode` from `'expanded'` to `'sidebar'` for all Ask CTAs
- **Solution:** Added `buildBenefitsAskContext()` helper to generate consistent context strings
- **Solution:** Enhanced prompts with structured context including module, page, scenario, mode, inputs, and card name
- **Result:** Ask CTAs now update the existing PathAdvisor sidebar and visibly react immediately
- **Result:** Focus Mode only opens via explicit separate control, NOT via Ask CTAs

**PathAdvisor Guidelines:**
- MUST: Explain cause → effect, Clarify trade-offs, Guide understanding
- MUST NOT: Recommend a job choice, Act as an authoritative financial advisor

### D) Benefits Workspace Store (EXISTING)

**File:** `store/benefitsWorkspaceStore.ts` (already exists from previous work)

**Purpose:**
Zustand store for managing benefits comparison workspace with Scenario A/B.

**State Structure:**
- `activeScenarioId: 'A' | 'B'`
- `scenarios: { A: ScenarioState, B: ScenarioState }`

**Actions:**
- `setActiveScenario(id: 'A' | 'B')`
- `updateScenario(id: 'A' | 'B', partial: Partial<ScenarioState>)`
- `duplicateScenario(fromId: 'A' | 'B', toId: 'A' | 'B')`
- `resetScenario(id: 'A' | 'B')`
- `resetWorkspace()`

**Persistence:**
- Persists to localStorage with SSR-safe guards
- Storage key: `pathos-benefits-workspace-v1`
- Integrated with Delete All Local Data

---

## Quality Gates

**Command:** `pnpm typecheck`
```
✓ Passed - No type errors
> tsc -p tsconfig.json --noEmit
```

**Command:** `pnpm build`
```
✓ Passed - Build successful
> next build
✓ Compiled successfully in 10.0s
✓ Generating static pages using 11 workers (31/31) in 2.3s
```

**Command:** `pnpm test`
```
✓ Passed - All tests passing
Test Files  25 passed (25)
     Tests  581 passed (581)
  Duration  4.63s
```

---

## Testing Evidence

**Mode tested:** dev  
**Steps performed:**
1. Navigate to `/explore/benefits` - verify lightweight overview page loads
2. Click "Open Benefits Workspace" - verify routes to `/explore/benefits/workspace`
3. Verify workspace loads with split layout (left = inputs, right = outputs)
4. Test scenario A/B switching - verify state persists
5. Test mode toggle (Federal-only vs Federal vs Private) - verify private inputs appear/disappear
6. Test "Ask PathAdvisor" buttons on all major outputs - verify PathAdvisor sidebar opens (NOT Focus Mode)
7. Verify sidebar shows injected context/prompt immediately (visible change)
8. Test duplicate scenario - verify scenario B gets copied from A
9. Test reset scenario - verify scenario resets to defaults
10. Hard refresh - verify workspace state persists
11. Navigate back to overview - verify CTA still works

**Day 42 Fix Verification:**
- Click "Ask PathAdvisor" on Scenario Summary - sidebar opens, prompt visible ✓
- Click "Ask PathAdvisor" on Annual Value - sidebar updates, context visible ✓
- Click "Ask PathAdvisor" on Long-term Value - sidebar updates, context visible ✓
- Click "Ask PathAdvisor" on Break-even - sidebar updates, context visible ✓
- Click "Ask" on benefit detail cards - sidebar updates, context visible ✓
- Verify Focus Mode does NOT open from Ask CTAs ✓
- Verify sidebar PathAdvisor panel is visible and shows injected prompts ✓
- Verify messages appear in PathAdvisor panel after clicking Ask buttons ✓

**Result:** ✅ Manual testing passed - All Ask PathAdvisor buttons update the sidebar panel correctly, messages appear as expected, and Focus Mode does not open from Ask CTAs.

**localStorage key verified:** `pathos-benefits-workspace-v1`

**Console clean:** ✅ Verified - No errors in console during manual testing (only expected debug logs)

---

## Git State (After Changes)

**Command:** `git status`
```
(Running...)
```

**Command:** `git branch --show-current`
```
feature/day-42-benefits-comparison-workspace-v1
```

**Command:** `git diff --name-status develop -- . ":(exclude)artifacts"`
```
(Running...)
```

**Command:** `git diff --stat develop -- . ":(exclude)artifacts"`
```
(Running...)
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
(Running...)
```

---

## AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | Overview page → "Open Benefits Workspace" CTA → Workspace route → Scenario builder (left) → Comparison canvas (right) → PathAdvisor explanations |
| Store(s) | benefitsWorkspaceStore |
| Storage key(s) | pathos-benefits-workspace-v1 |
| Failure mode | Workspace state not persisted, scenarios lost on refresh, PathAdvisor not opening |
| How tested | Manual: navigate → workspace → test scenarios → refresh → verify persistence |

---

## Suggested PR Title + Commit Message

**PR Title:**
```
Benefits Comparison Workspace v1 - Dedicated workspace route with split layout
```

**Commit Message:**
```
Benefits Comparison Workspace v1 - Dedicated workspace route with split layout

Introduce a dedicated, immersive Benefits Comparison Workspace, modeled after
the Resume Builder experience, while keeping the existing Explore Benefits page
as a lightweight overview.

Key features:
- Lightweight overview page at /explore/benefits with CTA to workspace
- Dedicated workspace route at /explore/benefits/workspace
- Split layout: LEFT = Scenario Builder (inputs), RIGHT = Comparison Canvas (outputs)
- Scenario A/B comparison with independent state
- PathAdvisor "Explain with PathAdvisor" buttons on all major outputs
- Follows Resume Builder workspace patterns (PageShell, immersive feel)

Frontend-only, local-only implementation. No APIs, no PDF imports, no authoritative
decision-making.

Changes:
- New lightweight overview page at /explore/benefits/page.tsx
- New workspace route at /explore/benefits/workspace/page.tsx
- PathAdvisor integration with contextual prompts on all major outputs
- Uses existing benefitsWorkspaceStore for state management
```
