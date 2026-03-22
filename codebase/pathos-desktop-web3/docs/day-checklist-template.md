# Day Checklist Template

> **Usage**: Copy this template or run `pnpm day:new` to create a new day checklist.

---

## Day XX — [Title]

**Branch**: `feature/day-XX-short-slug`  
**Date**: YYYY-MM-DD  
**Status**: 🟡 In Progress

---

### Objective

_What is the primary goal of this day's work?_

- [ ] Primary objective description

---

### Key Tasks

_Break down the work into specific, actionable tasks._

#### Setup

- [ ] Create feature branch from `develop`
- [ ] Review relevant existing code

#### Implementation

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

#### Testing

- [ ] Add/update unit tests
- [ ] Manual testing of affected features

#### Documentation

- [ ] Update `merge-notes.md`
- [ ] Add inline comments for complex logic

---

### AI Tool Usage

_Track how AI tools (Cursor, Copilot, etc.) were used._

| Tool | Usage | Notes |
|------|-------|-------|
| Cursor | Initial scaffolding | - |
| Cursor | Bug fix assistance | - |

---

### Completion Criteria

_How do we know this day is "done"?_

- [ ] Primary objective achieved
- [ ] All key tasks completed
- [ ] Quality checks pass (see below)
- [ ] PR created and ready for review

---

### Verification Commands

Run these before marking complete:

```bash
# All must pass
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

| Check | Status |
|-------|--------|
| `pnpm lint` | ⬜ |
| `pnpm typecheck` | ⬜ |
| `pnpm test` | ⬜ |
| `pnpm build` | ⬜ |

---

### Follow-ups / Deferred to Backlog

_Items identified during work but deferred to keep scope focused._

| Item | Reason for Deferral | Priority |
|------|---------------------|----------|
| - | - | - |

---

### Notes

_Any additional context, decisions made, or lessons learned._

---

*Created: YYYY-MM-DD*
