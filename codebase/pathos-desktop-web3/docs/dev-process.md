# Development Process

> **Purpose**: Codifies the PathOS Tier 1 Frontend development workflow, branching model,
> Definition of Done, and code review checklist.

---

## Branching Model

| Branch | Purpose | Deployed To |
|--------|---------|-------------|
| `main` | Production-ready code | Production |
| `develop` | Integration branch for features | Dev/Staging |
| `feature/day-XX-*` | Feature branches per development day | - |

### Branch Naming

Feature branches follow the pattern:

```
feature/day-XX-short-description
```

Examples:
- `feature/day-13-dashboard-first-principles-refactor`
- `feature/day-14-process-hardening`

### Workflow

1. Create feature branch from `develop`
2. Make changes, commit frequently with descriptive messages
3. Run all quality checks locally
4. Create PR targeting `develop`
5. CI must pass before merge
6. Squash merge to `develop`
7. When ready for production, merge `develop` → `main`

---

## Definition of Done

A Day PR is "done" when:

### 1. Code Quality

- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm test` passes with no failures
- [ ] `pnpm build` succeeds

### 2. Code Standards

- [ ] No `var` declarations (use `const` or `let`)
- [ ] New logic is over-commented (explains why, how, where it fits)
- [ ] Follows existing code style and folder conventions
- [ ] No `@typescript-eslint/no-explicit-any` violations introduced

### 3. State Persistence

- [ ] State that should persist (saved searches, preferences) actually persists across refresh
- [ ] State that should NOT persist (UI-only state) resets on refresh
- [ ] Arrays saved to state/storage are deep cloned (no shared references)

### 4. Accessibility

- [ ] Dialogs have proper focus management
- [ ] Select components support keyboard navigation
- [ ] Interactive elements have appropriate labels/ARIA attributes

### 5. Documentation

- [ ] `merge-notes.md` has a new section appended (never delete existing content)
- [ ] Complex changes have inline documentation

---

## Pre-PR Checklist Commands

Run these commands locally before creating a PR:

```bash
# 1. Lint - catches style issues and potential bugs
pnpm lint

# 2. Type check - catches TypeScript errors
pnpm typecheck

# 3. Test - runs unit tests
pnpm test

# 4. Build - ensures production build works
pnpm build
```

**All four must pass.** If any fails, fix the issues before creating the PR.

---

## Code Review Checklist

When reviewing a PR, check:

### Variables and Types

- [ ] No `var` declarations
- [ ] No `any` types without justification
- [ ] Appropriate use of `const` vs `let`

### State Management

- [ ] Arrays are deep cloned when saved to state/storage
- [ ] Saved searches apply uses deep clone (not shared reference)
- [ ] Visibility state persists correctly

### UI Patterns

- [ ] `Button asChild` + `Link` pattern for navigational buttons
- [ ] `type="button"` on buttons inside forms or Collapsible
- [ ] No `<a>` nested inside `<button>` or vice versa

### Logic Quality

- [ ] Business logic has appropriate test coverage
- [ ] Bug fixes include a regression test
- [ ] Edge cases are handled (null, undefined, empty arrays)

### Comments

- [ ] New complex logic has teaching-level comments
- [ ] File headers explain purpose and architecture fit
- [ ] JSDoc on exported functions

---

## Creating a PR

### PR Title Format

```
feat(scope): Short description

# Examples:
feat(dashboard): Add Job Seeker dashboard reorganization
fix(filters): Correct saved search array cloning
chore(ci): Add GitHub Actions workflow
docs(process): Add development process documentation
```

### PR Description Template

```markdown
## Summary

- Brief description of changes (2-3 bullet points)

## Changes

| File | Change | Reason |
|------|--------|--------|
| `path/to/file.ts` | Added/Modified/Deleted | Why |

## Testing

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes

## Follow-ups

- Items deferred to future PRs (if any)
```

---

## Merge Notes Protocol

After completing a PR, append to `merge-notes.md`:

```markdown
---

## YYYY-MM-DD HH:MM — branch-name — Summary

### Summary

- What changed and why

### Files Changed

| File | Change |
|------|--------|
| `path/to/file.ts` | A (Added) / M (Modified) / D (Deleted) |

### Commands + Outputs

#### pnpm lint
```
(paste output)
```

#### pnpm typecheck
```
(paste output)
```

#### pnpm test
```
(paste output)
```

#### pnpm build
```
(paste output)
```

### Follow-ups

- Any deferred items

---

*Appended: YYYY-MM-DD*
```

**Important**: `merge-notes.md` is append-only. Never delete or modify existing sections.

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `pnpm dev` |
| Lint | `pnpm lint` |
| Type check | `pnpm typecheck` |
| Run tests | `pnpm test` |
| Watch tests | `pnpm test:watch` |
| Production build | `pnpm build` |
| Create new day checklist | `pnpm day:new` |

---

*Last updated: December 2024*
