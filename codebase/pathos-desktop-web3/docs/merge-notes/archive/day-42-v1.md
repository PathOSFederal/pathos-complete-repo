# Day 42 — Benefits Workspace Ask PathAdvisor Wiring v1

**Branch:** `feature/day-42-benefits-workspace-ask-pathadvisor-wiring-v1`  
**Date:** December 31, 2025  
**Status:** In Progress

---

## Objective

Fix "Ask PathAdvisor" so it visibly reacts in Benefits Workspace, matching the working convention used in Resume Builder and other PathOS cards.

Also add PathAdvisor access to each Benefit Detail card, but WITHOUT clutter: use progressive disclosure (small "Explain" affordance) instead of a full-size button on every card.

No backend. No APIs. No document imports.

---

## Preflight Git State

**Command:** `git status --porcelain`
```
```

**Command:** `git branch --show-current`
```
feature/day-42-benefits-workspace-ask-pathadvisor-wiring-v1
```

**Command:** `git diff --name-status develop...HEAD`
```
```

**Command:** `git diff --stat develop...HEAD`
```
```

**Command:** `git diff --name-status develop -- . ":(exclude)artifacts"`
```
```

**Command:** `git diff --stat develop -- . ":(exclude)artifacts"`
```
```

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Changes Zustand store logic (if context setting), Affects UI where results appear in multiple places (PathAdvisor panel) |
| Why | Fixing PathAdvisor integration requires testing that buttons open panel, prompts update, and context is set correctly |

---

## Root Cause Analysis

**Problem:** "Ask PathAdvisor" buttons on Benefits Workspace do not visibly react when clicked.

**Root Cause:** (To be determined after examining current implementation)

**Solution Approach:**
1. Find canonical working "Ask PathAdvisor" implementation (Resume Builder reference)
2. Replace custom onClick logic with canonical `openPathAdvisor` helper
3. Ensure prompt is written to the exact state field the sidebar input binds to
4. Ensure opening the panel uses the correct flag/state
5. Add "Explain" affordances to Benefit Detail cards using progressive disclosure
6. Set Benefits context on workspace route mount

---

## Changes Made

(To be filled as work progresses)

---

## Quality Gates

(To be filled after running commands)

---

## Testing Evidence

(To be filled after manual verification)

---

## Patch Artifacts (FINAL)

(To be filled at end of run)

---

## AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | (To be filled) |
| Store(s) | (To be filled) |
| Storage key(s) | (To be filled) |
| Failure mode | (To be filled) |
| How tested | (To be filled) |

---

## Suggested PR Title + Commit Message

(To be filled at end of run)
