# Saved Jobs Page V1

## 1. Objective

Implement the approved Saved Jobs workspace for PathOS at `/dashboard/saved-jobs`.

This is a parity-oriented frontend task. The output target is the approved Saved Jobs mockup and interaction model within the targeted page surface.

Preserve the active shared UI architecture, local-first behavior, and task scope constraints, but do not stop at partial visual alignment when the approved layout, hierarchy, or workflow requires screen-level correction.

## 2. Product Intent

Saved Jobs is a PathOS decision workspace, not a passive favorites list.

The page should help a user:
- understand what they have saved
- quickly find the right saved job again
- review one job in a focused detail workspace
- take the next best action with confidence
- preserve trust that PathOS is managing only local, user-controlled saved data

The experience should communicate calm usefulness, not dashboard clutter. It should feel like a trusted workspace adjacent to Job Search.

## 3. Architecture Constraints

Active route:
- `app/(shared)/dashboard/saved-jobs/page.tsx`

Active implementation path:
- `packages/ui/src/screens/SavedJobsScreen.tsx`
- `packages/ui/src/stores/jobSearchV1Store.ts`
- `packages/core/src/saved-jobs-storage.ts`
- `packages/core/src/saved-jobs-types.ts`
- `packages/core/src/job-types.ts`

Route composition:
- The route page is a thin wrapper that renders `SavedJobsScreen` inside `SharedDashboardRouteShell`.
- `SharedDashboardRouteShell` already composes the shared app shell and the PathAdvisor rail on the right.
- Keep route and shell composition stable unless the task explicitly requires otherwise.

Implementation rules:
- Target the active shared UI plus core path first.
- Avoid extending the older app-layer saved jobs implementation unless strictly necessary for correctness.
- Treat the current internal composition of `SavedJobsScreen` as replaceable inside the page surface when parity requires structural or layout correction.

Legacy path that is not the primary target:
- `store/savedJobsStore.ts`
- legacy dashboard components that still reference `useSavedJobsStore`

## 4. Current State Summary

Current Saved Jobs behavior is functional but limited:
- the route renders `SavedJobsScreen` through the shared dashboard shell
- the page currently presents a left-list and right-detail layout
- the page supports selecting a saved job, removing it, and starting Guided Apply
- the page can open the official listing in a new browser tab
- the empty state routes users back to Job Search

Current gaps relative to the approved page:
- search and sort are underpowered
- summary and metrics are too thin
- list cards do not reflect the intended decision-workspace hierarchy
- the detail workspace is not structured to match the approved page
- trust-first messaging is too weak
- mounted synchronization is too limited

## 5. Scope

In scope:
- implement the approved Saved Jobs page within `/dashboard/saved-jobs`
- rework `SavedJobsScreen` as needed to reach the approved structure, hierarchy, and action flow
- add page-level search and sort inside the active shared UI path
- add summary or metrics derived from local saved jobs
- improve selected-job detail composition and action hierarchy
- preserve or improve Guided Apply and official listing actions
- improve mounted-state behavior so the page reflects local store changes more reliably while open
- keep the experience local-first and deterministic
- make screen-level structural and layout corrections within the Saved Jobs page surface when required for parity

Potentially in scope when required for active-path correctness:
- small additions in `packages/core/src/saved-jobs-storage.ts`
- small shared UI helpers adjacent to the Saved Jobs screen
- narrow tests for derived logic or persistence-sensitive behavior

Out of scope:
- rewriting the older app-layer saved jobs system
- migrating all legacy saved jobs consumers to the shared UI path
- redesigning Job Search itself
- introducing remote persistence, server sync, or account-backed saved jobs
- adding scraping, background refresh, auto-enrichment, or non-deterministic ranking
- broad refactors to shared shell, navigation, or unrelated dashboard surfaces
- commit, push, or branch management changes

## 6. UX Requirements

The page should be structured as a workspace with the following sections.

### Header

Include:
- page title
- concise subtitle framing Saved Jobs as a review and decision workspace
- search input
- sort control
- trust-first microcopy reinforcing local-first behavior and user control

### Summary strip

Include a compact summary strip below the header.

At minimum include:
- total saved jobs
- a recency-oriented count
- at least one additional useful derived indicator supported by current data

### Left pane list

The left pane remains the primary list surface.

Requirements:
- clearly selectable rows or cards
- stronger scannability for title, agency, location, recency, and available supporting fields
- visible selected state
- support search and sort results
- distinct empty-search state
- responsive usability in the existing shared layout
- reflect the approved information hierarchy rather than only a lightly improved version of the current rows

### Main detail workspace

Requirements:
- clear title and agency context
- structured metadata for location, grade, salary, and other available fields
- summary or brief content when present
- clear next-actions section
- strong hierarchy between primary and secondary actions
- coherent empty-selection state
- reflect the approved detail workspace structure and section hierarchy rather than only a lightly improved version of the current detail pane

### Actions

Support:
- Guided Apply
- Open Official Listing
- Ask PathAdvisor
- Remove from Saved

Guided Apply should remain the dominant forward-progress action.
Remove from Saved should remain available but visually secondary.

## 7. Visual Parity Requirements

Approved direction to encode:
- header with title, subtitle, search, sort, and trust-first microcopy
- summary or metrics strip
- richer left-pane saved-job cards
- main detail workspace for the selected job
- PathAdvisor integration when it fits the existing shared shell
- next actions grouped around Guided Apply, official listing, PathAdvisor, and remove

Visual rules:
- preserve PathOS visual language and existing token usage
- match the approved mockup hierarchy and structure within the targeted page surface
- avoid generic enterprise table styling
- avoid making Saved Jobs look like a clone of Job Search
- keep calm density and readable hierarchy
- use existing shared shell and token patterns before introducing new visual systems

Parity rule:
- when the approved mockup and the current screen structure differ, prefer the approved mockup inside the Saved Jobs page surface
- do not treat the current internal layout of `SavedJobsScreen` as fixed
- styling-only updates are not sufficient if structure, hierarchy, spacing, or section composition still diverge materially from the approved page

Trust cues must remain explicit. The page should continue to reinforce that PathOS is not logging into USAJOBS or taking hidden actions on behalf of the user.

## 8. Data And State Requirements

Source of truth:
- `packages/core/src/saved-jobs-storage.ts`
- `packages/core/src/saved-jobs-types.ts`
- storage key: `pathos:saved-jobs-store`

Current data shape:
- `SavedJobsStore.jobs` is an array of `Job`
- `Job` includes `id`, `title`, `agency`, `location`, optional `grade`, optional `salaryRange`, optional `url`, optional `summary`, and `savedAt`

State behavior requirements:
- preserve local-first deterministic storage behavior
- do not introduce remote fetch dependencies for page rendering
- keep selected-job behavior stable and intuitive
- derive search and sort results from the saved jobs source without unnecessary mutation
- keep any derived view model explicit and maintainable
- keep page behavior predictable across refreshes

Mounted sync requirement:
- improve mounted responsiveness to saved-job changes from the active local-first system
- use a clear solution that fits the active architecture and satisfies the task
- do not introduce unnecessary cross-app orchestration

Selection behavior:
- keep selection valid after sort and search changes when possible
- if the selected job is removed, use predictable fallback selection
- if search filters out the selected job, keep the detail behavior coherent

## 9. File Targets

Primary targets:
- `app/(shared)/dashboard/saved-jobs/page.tsx`
- `packages/ui/src/screens/SavedJobsScreen.tsx`
- `packages/ui/src/stores/jobSearchV1Store.ts`
- `packages/core/src/saved-jobs-storage.ts`

Secondary targets only if justified:
- `packages/ui/src/index.ts`
- small shared UI helper files adjacent to the screen
- narrow test files under existing test locations

## 10. Implementation Guidance

Builder instructions:
- keep changes task-scoped and reviewable
- do not do unrelated rewrites
- preserve local-first trust behavior
- use `let` and `const`, never `var`
- favor explicit, maintainable code
- avoid overengineering
- prefer the active shared UI path
- do not commit or push

Implementation approach:
- treat `SavedJobsScreen` as the main implementation surface
- keep the route file thin unless a route-level composition change is truly required
- reuse existing core storage helpers before adding new persistence patterns
- keep search and sort logic close to the screen unless there is a clear reason to move it
- avoid speculative abstractions for future saved-jobs features
- reuse shared UI primitives, tokens, and shell composition where practical
- fit PathAdvisor integration into the current shared dashboard shell rather than creating a competing advisor pattern
- restructure the page surface as needed to reach parity without refactoring unrelated shell or route concerns

## 11. Acceptance Criteria

- [ ] `/dashboard/saved-jobs` remains routed through `app/(shared)/dashboard/saved-jobs/page.tsx` and the shared dashboard shell.
- [ ] The implementation primarily targets `packages/ui/src/screens/SavedJobsScreen.tsx` and the active shared UI plus core path.
- [ ] The page presents the approved header structure with title, subtitle, search, sort, and trust-first microcopy.
- [ ] The page includes the required summary or metrics strip derived from local data.
- [ ] The left pane reflects the approved card structure and information hierarchy rather than only a lightly improved version of the current rows.
- [ ] The main pane reflects the approved detail workspace structure and action hierarchy rather than only a lightly improved version of the current detail view.
- [ ] Guided Apply, Open Official Listing, and Remove from Saved remain functional.
- [ ] Ask PathAdvisor is included if it fits the active composition cleanly. If not included, document the reason.
- [ ] The page still handles true empty state cleanly.
- [ ] Search-empty and no-selection states are handled coherently.
- [ ] Local-first deterministic behavior is preserved.
- [ ] The implementation avoids broad work in the inactive legacy saved-jobs path.
- [ ] Any added derived logic is explicit, maintainable, and bounded.
- [ ] Structural and layout corrections required for parity are implemented inside the Saved Jobs page surface instead of deferred in favor of styling-only updates.

## 12. Validation Checklist

Builder run expectations:
- capture `git status`
- capture `git branch --show-current`
- capture `git diff --name-status develop...HEAD`
- capture `git diff --stat develop...HEAD`

Artifact workflow if required by the active workflow:
- generate `git diff develop...HEAD > artifacts/day-<N>.patch`
- generate `git diff > artifacts/day-<N>-this-run.patch`
- log artifact filenames and `ls -lh` output in merge notes if required
- do not paste full diffs unless explicitly required

Functional validation:
- verify the page renders under `/dashboard/saved-jobs`
- verify empty state still works
- verify a populated saved-jobs state renders the required header, metrics, list, and detail workspace
- verify search behavior
- verify sort behavior
- verify selecting a card updates the detail workspace
- verify removing a job updates the visible workspace correctly
- verify Guided Apply still routes correctly from a saved job
- verify Official Listing still opens externally
- verify local-first trust cues remain visible and accurate

If the implementation introduces persistence-sensitive or mounted-sync behavior:
- verify behavior after refresh
- verify the page does not present stale or obviously incorrect state while mounted
- document any remaining limitation clearly for hardening

Hardening note:
- broader typecheck, build, automated tests, and regression review belong to the hardening lane after iteration freeze

## 13. Notes

This task is intentionally bounded.

The goal is to deliver the approved Saved Jobs page inside the shared UI architecture already in use.

Assume:
- the active route and shell composition are correct
- the shared UI screen layer is the preferred place for page-level UX work
- the core saved-jobs store is the correct persisted source of truth
- the older app-layer saved jobs store is legacy context, not the preferred target
- the current internal composition of `SavedJobsScreen` may be changed as needed to reach parity inside the page surface

When tradeoffs appear:
- prefer clarity over cleverness
- prefer complete parity within the targeted page surface over partial improvement that leaves the approved structure unmet
- prefer truthful local-first UX over speculative intelligence
- leave a clean handoff for hardening once the task implementation is functionally correct
