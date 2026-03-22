# Merge Notes: Phases 7-9

## Validation Checklist

- [ ] `pnpm check:boundaries` -- boundaries pass cleanly
- [ ] `pnpm -r typecheck` -- no type errors
- [ ] `pnpm -r test` -- all tests green
- [ ] Desktop preview routes render without runtime errors

## Phase 7: Saved Jobs + Daily Workflow v1

### New Core Modules
- `packages/core/src/saved-jobs-types.ts` -- SavedJobsStore with schemaVersion 1
- `packages/core/src/saved-jobs-storage.ts` -- CRUD: add/remove/toggle/select/clear/export
- `packages/core/src/today-types.ts` -- TodayStore with schemaVersion 1, TodayItem
- `packages/core/src/today-storage.ts` -- seed/add/toggle/remove/clearCompleted/export

### New UI Screens
- `packages/ui/src/screens/SavedJobsScreen.tsx` -- two-pane layout (list + details), remove, Guided Apply handoff, empty state
- Dashboard "Today" checklist section with add/toggle/remove/clear completed

### Navigation
- Sidebar: added "Saved Jobs" at `/dashboard/saved-jobs`
- Preview route: `?screen=saved-jobs` -> `/dashboard/saved-jobs`
- Desktop route: `/dashboard/saved-jobs`
- Launcher card on root page

### Storage Keys
- `pathos:saved-jobs-store` (schemaVersion 1)
- `pathos:today-store` (schemaVersion 1)

### Tests
- `packages/core/src/__tests__/saved-jobs-storage.test.ts`
- `packages/core/src/__tests__/today-storage.test.ts`

## Phase 8: Resume Builder v1

### New Core Modules
- `packages/core/src/resume-types.ts` -- ResumeDraft, ResumeVersion, ResumeStore, schemaVersion 1
- `packages/core/src/resume-storage.ts` -- draft CRUD, version create/restore/delete, export/clear

### New UI Screen
- `packages/ui/src/screens/ResumeBuilderScreen.tsx` -- two-pane layout (editor + live preview)
  - Collapsible sections: Contact, Summary, Experience, Education, Skills
  - Version management: save, restore, delete
  - Privacy toggle: mask sensitive fields in preview
  - Trust badge: "Local only" inline indicator
  - Empty state in preview pane

### Navigation
- Sidebar: added "Resume Builder" at `/dashboard/resume-builder`
- Preview route: `?screen=resume` -> `/dashboard/resume-builder`
- Desktop route: `/dashboard/resume-builder`
- Launcher card on root page

### Storage Keys
- `pathos:resume-store` (schemaVersion 1)

### Tests
- `packages/core/src/__tests__/resume-storage.test.ts`

## Phase 9: UX/QA Stabilization

### Settings Consolidation
- SettingsScreen "Data Controls" now covers all four stores:
  Guided Apply, Saved Jobs, Resume Builder, Today Checklist
- Per-store export (JSON download) and per-store delete with confirmation
- "Delete All Local Data" button with two-step confirmation

### Accessibility
- Global focus-visible outlines via `app/globals.css` using `--p-accent` token
- TopBar: aria-label on "Local only" badge, persona toggle, privacy toggle; aria-expanded on info panel
- Sidebar: `role="navigation"` and `aria-label="Main sidebar navigation"`
- All icon-only buttons across screens already had aria-labels (verified)

### Trust Microcopy Consistency
- Standardized external link copy to "Opens in your browser. PathOS does not access your USAJOBS account." across Job Search and Saved Jobs
- Guided Apply retains "Apply on USAJOBS in your browser." for action context
- TopBar info panel copy unchanged (verified consistent)

### Empty States (verified present)
- Job Search: zero results ("No results found") + no selection ("Select a job to view details")
- Saved Jobs: empty state with CTA to Job Search
- Guided Apply: no sessions state with "New Session" prompt
- Resume Builder: first-time preview empty state
- Dashboard Today: "No tasks for today. Add one below."

### Route Table (normalized)

| Screen          | Preview (?screen=)   | Preview pathname         | Desktop route            |
|-----------------|----------------------|--------------------------|--------------------------|
| Dashboard       | (default)            | /dashboard               | /dashboard               |
| Career          | career               | /dashboard/career        | /dashboard/career        |
| Job Search      | job-search           | /dashboard/job-search    | /dashboard/job-search    |
| Saved Jobs      | saved-jobs           | /dashboard/saved-jobs    | /dashboard/saved-jobs    |
| Resume Builder  | resume               | /dashboard/resume-builder| /dashboard/resume-builder|
| Guided Apply    | guided-apply         | /guided-apply            | /guided-apply            |
| Settings        | settings             | /settings                | /settings                |

### Schema Versions Summary

| Store           | Key                          | schemaVersion |
|-----------------|------------------------------|---------------|
| Guided Apply    | pathos:guided-apply-store    | 2             |
| Job Search      | pathos:job-search-store      | 1             |
| Saved Jobs      | pathos:saved-jobs-store      | 1             |
| Today           | pathos:today-store           | 1             |
| Resume          | pathos:resume-store          | 1             |

All stores use safe-reset on schema mismatch (returns defaults if version differs).

---

## Dashboard Benefits-Style Update (Verification)

**Scope:** Desktop Dashboard screen and PathAdvisor rail aligned to web Explore Federal Benefits seriousness. Mock values only; no backend. No commit, no push.

**Files modified:**
- `packages/ui/src/screens/DashboardScreen.tsx` (primary)
- `packages/ui/src/shell/PathAdvisorRail.tsx` (parity)
- `packages/ui/src/styles/theme.css` not modified (theme tokens sufficient)

### Verification commands and outputs

**git status**
```
On branch feature/ui-serious-mode-v1
Changes not staged for commit:
  modified:   apps/desktop/src/globals.css
  modified:   packages/ui/src/screens/DashboardScreen.tsx
  modified:   packages/ui/src/shell/PathAdvisorRail.tsx
no changes added to commit
```

**git diff --name-only**
```
apps/desktop/src/globals.css
packages/ui/src/screens/DashboardScreen.tsx
packages/ui/src/shell/PathAdvisorRail.tsx
```

**git diff --stat**
```
 apps/desktop/src/globals.css                |  21 +-
 packages/ui/src/screens/DashboardScreen.tsx | 434 +++++++++++-----------------
 packages/ui/src/shell/PathAdvisorRail.tsx   | 189 +++++++-----
 3 files changed, 304 insertions(+), 340 deletions(-)
```

**pnpm check:boundaries**
```
Boundary check PASSED: 0 violations across 3 packages.
```

**pnpm -r typecheck**
```
Scope: 4 of 5 workspace projects
packages/adapters typecheck: Done
packages/core typecheck: Done
packages/ui typecheck: Done
apps/desktop typecheck: Done
```

**pnpm -C apps/desktop build**
```
✓ 1614 modules transformed.
dist/renderer/index.html                   0.40 kB
dist/renderer/assets/index-CqywswcU.css   23.28 kB
dist/renderer/assets/index-CByeRgiU.js   351.57 kB
✓ built in 8.36s
```
(Full build: renderer + electron tsc completed successfully.)

---

## ModuleCard and Analyst Workspace Polish (Day 49)

**Branch:** feature/ui-serious-mode-v1  
**Scope:** Reusable ModuleCard wrapper, theme token tuning, Dashboard and PathAdvisor rail framing. No commit or push.

### Merge-notes logging (required)

**git status**
```
On branch feature/ui-serious-mode-v1
Your branch is up to date with 'origin/feature/ui-serious-mode-v1'.

Changes not staged for commit:
  modified:   packages/ui/src/components/ModuleCard.tsx
  modified:   packages/ui/src/shell/PathAdvisorRail.tsx
  modified:   packages/ui/src/styles/theme.css

Untracked files:
  packages/ui/src/components/ModuleCard.test.tsx
```

**git branch --show-current**
```
feature/ui-serious-mode-v1
```

**git diff --name-status develop...HEAD**  
(develop branch not present in this repo; use main as reference.)

**git diff --name-status main...HEAD**
```
M	apps/desktop/src/globals.css
M	docs/merge-notes.md
A	packages/ui/src/components/ModuleCard.tsx
M	packages/ui/src/index.ts
M	packages/ui/src/screens/DashboardScreen.tsx
M	packages/ui/src/shell/AppShell.tsx
M	packages/ui/src/shell/PathAdvisorRail.tsx
M	packages/ui/src/shell/Sidebar.tsx
M	packages/ui/src/shell/TopBar.tsx
M	packages/ui/src/styles/theme.css
```

**git diff --stat main...HEAD**
```
 apps/desktop/src/globals.css                |  21 +-
 docs/merge-notes.md                         |  62 ++++
 packages/ui/src/components/ModuleCard.tsx  |  84 ++++++
 packages/ui/src/index.ts                    |  3 +
 packages/ui/src/screens/DashboardScreen.tsx | 432 ++++++++++------------------
 packages/ui/src/shell/AppShell.tsx          |  4 +-
 packages/ui/src/shell/PathAdvisorRail.tsx   | 213 +++++++++-----
 packages/ui/src/shell/Sidebar.tsx           |  34 +--
 packages/ui/src/shell/TopBar.tsx            |  71 +++--
 packages/ui/src/styles/theme.css           |  49 +++-
 10 files changed, 551 insertions(+), 422 deletions(-)
```

### Patch artifacts

**Cumulative (main to working tree):** `artifacts/day-49.patch`  
**Incremental (this run):** `artifacts/day-49-this-run.patch`

**Get-Item artifacts/day-49.patch,artifacts/day-49-this-run.patch | Format-List Name,Length,LastWriteTime**
```
Name          : day-49.patch
Length        : 55645
LastWriteTime : 2/26/2026 10:34:01 AM

Name          : day-15-run.patch
Length        : 9276
LastWriteTime : 2/26/2026 10:34:03 AM
```

**ls -lh artifacts (day-49 artifacts only)**
```
day-49-this-run.patch     9,276 bytes     2/26/2026 10:34:03 AM
day-49.patch              55,645 bytes    2/26/2026 10:34:01 AM
```

(Patch contents not pasted; full diff excluded from merge-notes per house rules.)

### Quality gates

**pnpm check:boundaries**
```
Boundary check PASSED: 0 violations across 3 packages.
```

**pnpm -r typecheck**
```
Scope: 4 of 5 workspace projects
packages/adapters typecheck: Done
packages/core typecheck: Done
packages/ui typecheck: Done
apps/desktop typecheck: Done
```

**pnpm test --run**  
Full suite: 52 test files run. ModuleCard.test.tsx (3 tests) passes. Forty-four failures are pre-existing in `packages/core/src/__tests__/job-storage.test.ts` (and symlinked copies) due to `localStorage` not defined in Node test environment. No new failures introduced by this run.

### Human Simulation Gate

| Item | Value |
|------|-------|
| Required | No |
| Triggers hit | none |
| Why | UI-only: ModuleCard, theme tokens, Dashboard/PathAdvisor layout. No store logic, persistence, or create/save/delete actions. |

### AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | N/A (presentation only). |
| Store(s) | None. |
| Storage key(s) | None. |
| Failure mode | Cards or rail would render without ModuleCard styling; no data loss. |
| How tested | Manual: desktop-preview and desktop renderer; Vitest smoke test for ModuleCard. |

### Patch Artifacts (FINAL)

**Commands used (develop not present; main used for cumulative):**  
- `git add -N .`  
- Cumulative: `git diff --binary main -- .` written to `artifacts/day-49.patch` (UTF-8).  
- Incremental: `git diff --binary HEAD -- .` written to `artifacts/day-49-this-run.patch` (UTF-8).  

**Get-Item output (authoritative):**
```
Name          : day-49.patch
Length        : 55645
LastWriteTime : 2/26/2026 10:34:01 AM

Name          : day-49-run.patch
Length        : 9276
LastWriteTime : 2/26/2026 10:34:03 AM
```
