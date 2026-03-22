# Documentation Protocol

> **Purpose:** Defines the required documentation artifacts for every Day/PR in the PathOS Tier 1 Frontend repo.

---

## Required Artifacts

Every Day PR that includes code changes must include:

### 1. `merge-notes.md` (Technical)

- **Location:** Root of repository
- **Audience:** Engineers, technical reviewers, future maintainers
- **Content:**
  - Branch name and date
  - Summary of technical changes
  - Files changed with purpose
  - Behavior changes (before/after tables)
  - Commands run and their outputs
  - Follow-up items

### 2. Change Brief (Non-Technical)

- **Location:** `docs/change-briefs/day-NN.md`
- **Audience:** Product managers, QA, stakeholders, non-engineers
- **Content:**
  - 2-sentence summary
  - What changed (3–7 bullets, no code)
  - Why it changed
  - What users will notice
  - Risk and mitigation
  - How we verified
  - Follow-ups

---

## Day Start Procedure

At the start of each new Day:

1. **Archive prior merge notes:**
   - Move `merge-notes.md` content to `docs/merge-notes/merge-notes-day-NN.md`
   - Add an archive header indicating when it was archived

2. **Create fresh merge-notes.md:**
   - Start with Day header, objective, and placeholder sections
   - Reference the archived prior day file

3. **Create Day change brief:**
   - Create `docs/change-briefs/day-NN.md` with the template
   - Fill in metadata (date, day number, branch)

---

## Key Principles

### merge-notes is technical; Change Brief is non-technical

- `merge-notes.md`: Code diffs, file lists, command outputs, technical reasoning
- `change-briefs/day-NN.md`: User-facing impact, business value, plain English

### No post-merge docs-only PR

- Documentation must be included in the same PR as the code changes
- This ensures docs are never forgotten and always in sync with code

### merge-notes.md is append-only (within a day)

- Never delete or modify existing sections from earlier in the day
- Add new dated sections at the end for additional work

### Prior days are archived, not edited

- Once a day's merge notes are archived, they become historical record
- Do not modify archived files except to fix typos

---

## Enforcement

The repository includes a `pnpm docs:check` script that:

1. Determines if code files changed relative to `origin/develop`
2. If code changed, requires:
   - `merge-notes.md` is modified
   - `docs/change-briefs/day-14.md` is modified (update day number as needed)
3. If only docs/config changed, no requirements

Run this before pushing to catch missing documentation early.

---

## Template Files

### merge-notes.md Template

```markdown
# Merge Notes: Day NN — [Title]

**Branch:** `feature/day-NN-description`  
**Date:** [Date]  
**Status:** In Progress

---

## Objective

[1-2 sentences describing the goal]

---

## Summary

[Placeholder — update as work progresses]

---

## Files Changed

| File | Change Type | Purpose |
|------|-------------|---------|
| | | |

---

## Behavior Changes

| Feature | Before | After |
|---------|--------|-------|
| | | |

---

## Commands Run and Outputs

[Placeholder]

---

## Follow-ups

[Placeholder]
```

### Change Brief Template

See `docs/change-briefs/day-14.md` for a complete example.

---

*Last updated: December 2024*
