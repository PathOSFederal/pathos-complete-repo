# Tech Debt Sweep Practice

> **Purpose**: A lightweight, time-boxed practice for addressing technical debt
> without derailing feature development.

---

## Overview

Technical debt accumulates naturally during rapid development. This practice
provides a structured way to address it without requiring dedicated sprints
or major process changes.

---

## Recommended Cadence

**Every 5–7 development days**, schedule a tech debt sweep.

Examples:
- After Day 5, before starting Day 6
- After Day 12, before starting Day 13
- When transitioning between major features

---

## Time Box

**2–4 hours maximum per sweep.**

This is intentionally short. The goal is incremental improvement, not
perfection. Larger items should be broken down or moved to dedicated tickets.

---

## Selection Rules

### What to Prioritize

Pick the **top 3 highest-leverage items** from:

1. **Bug risk reducers**: Items that, if fixed, would prevent future bugs
   - Missing type definitions
   - Shared reference issues
   - Inconsistent state handling

2. **Developer experience improvements**: Items that slow down future work
   - Confusing code that needs clarification
   - Missing documentation
   - Broken or flaky tests

3. **Performance issues**: Low-hanging fruit only
   - Obvious inefficiencies
   - Unnecessary re-renders
   - Missing memoization in hot paths

### What to Skip

- Large refactors (create a separate ticket)
- "Nice to have" improvements with no concrete benefit
- Stylistic changes that don't affect behavior

---

## Process

### Before the Sweep

1. Review recent `merge-notes.md` entries for noted follow-ups
2. Check for lint warnings or type issues
3. Review any test failures or flaky tests
4. Identify 3–5 candidate items

### During the Sweep

1. Create a branch: `chore/tech-debt-sweep-day-XX`
2. Work through selected items
3. Commit frequently with clear messages
4. Stop when time box expires, even if not all items done

### After the Sweep

1. Run full quality checks:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
2. **Merge only if CI is green**
3. Append to `merge-notes.md`
4. Move incomplete items to next sweep or backlog

---

## Closing Rule

**Do not merge tech debt changes if CI fails.**

If a sweep introduces new failures:
- Revert the problematic changes
- Create a ticket for proper investigation
- Merge only the changes that pass

This prevents tech debt work from becoming a source of new bugs.

---

## Tracking

Keep a simple log of sweeps in this format:

| Date | Items Addressed | Time Spent | Notes |
|------|-----------------|------------|-------|
| 2024-12-14 | Fixed 3 any types, added missing tests | 2h | CI green |

---

## Example Sweep Items

### Good Candidates

- Replace 4 instances of `any` with proper types
- Add missing test for saved search cloning
- Document the visibility persistence logic
- Fix console warning about missing key prop
- Remove unused imports across 3 files

### Bad Candidates (Too Large)

- Refactor entire store architecture
- Migrate from Zustand to Redux
- Add comprehensive E2E test suite
- Rewrite component library

---

## FAQ

**Q: What if I find a critical bug during the sweep?**

A: Fix it immediately, even if it exceeds the time box. Critical bugs take priority.

**Q: Should I write tests for the tech debt fixes?**

A: Yes, if the fix involves logic changes. No, if it's purely cleanup (removing dead code, adding types).

**Q: Can I do a sweep more often than every 5–7 days?**

A: Yes, but keep each sweep short. Frequent small sweeps are better than occasional large ones.

---

*Last updated: December 2024*
