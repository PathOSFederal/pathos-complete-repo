# Change Brief — Day 14

> **Purpose:** Non-technical summary of Day 14 changes for stakeholders, QA, and product team.

---

## Metadata

| Field | Value |
|-------|-------|
| **Date** | December 13, 2025 |
| **Day** | 14 |
| **Branch** | `feature/day-14-career-resume-refactor` |

---

## Summary (2 sentences)

Day 14 establishes a formal documentation protocol requiring merge notes and change briefs for every development day. It also continues the Career & Resume tab refactor, improving the user experience for job seekers and federal employees.

---

## What Changed (3–7 bullets)

- **Documentation protocol established:** Every Day/PR now requires both technical merge notes and a non-technical change brief
- **Merge notes archiving:** Prior day merge notes are now archived to `docs/merge-notes/merge-notes-day-NN.md`
- **Enforcement script added:** A `pnpm docs:check` command verifies that documentation artifacts exist before merging
- **Career Command Strip:** Users now see a single, clear next action with time estimate at the top of the Career page
- **Resume Readiness unified:** Two separate resume cards were merged into one clearer card
- **Deep-link navigation:** Clicking "Fix now" buttons navigates directly to the relevant resume section with visual highlighting

---

## Why It Changed

The team needed a consistent process to ensure:
1. Technical decisions are documented for future maintainers
2. Non-technical stakeholders can understand what shipped without reading code
3. Prior day documentation doesn't get lost or mixed with current work

The Career & Resume improvements ensure users can quickly answer: "What should I do next?" and take action within seconds.

---

## What Users Will Notice

- **Career page:** Clearer action guidance at the top of the page
- **Resume Builder:** Clicking help links from Career page now scrolls to and highlights the relevant section
- **No visual changes to other pages** in this release

---

## Risk and Mitigation

| Risk | Mitigation |
|------|------------|
| Documentation check blocks legitimate PRs | Script only runs when code files change; docs-only PRs are exempt |
| Deep-link scroll fails on slow devices | Retry loop with 10 attempts ensures element is found |

---

## How We Verified

1. `pnpm lint` — Passes (23 pre-existing errors, not introduced by Day 14)
2. `pnpm typecheck` — Passes
3. `pnpm test` — 130 tests pass
4. `pnpm build` — Production build succeeds
5. `pnpm docs:check` — Documentation enforcement script runs correctly

---

## Follow-ups

1. Fix the 23 pre-existing lint errors in a future tech debt sweep
2. Add E2E tests for deep-link navigation flow
3. Persist snooze/dismiss task state to localStorage
4. Consider adding scroll container attributes for more reliable scrolling
