# PathOS Frontend Execution Rules

> **Purpose**: Repo-local execution guidance for AI-assisted development in the PathOS frontend.
> These rules define how to execute work in this repo. They do not redefine task intent.
> Apply them using the precedence model from `C:\dev\PathOS\AGENTS.md`.

---

## How To Apply This File

- Explicit user request and the active task file define what to build.
- This file defines repo-local coding, UI, testing, and workflow standards.
- Hard constraints in this file remain mandatory.
- Soft execution preferences in this file must not override explicit task intent.
- Generic guidance in this file must not be used to avoid structural UI correction or mock-parity work that is explicitly required inside the targeted surface.

---

## Hard Constraints

- **Never use `var`**. Always use `const` or `let`.
- **Avoid `?.`, `??`, and `...` (spread)**. Use explicit null checks and manual object or array construction.
- **Over-comment new or modified code** with teaching-level headers explaining purpose, fit, and behavior.
- **Never run `git commit` or `git push`**. Leave commits to the developer.
- **Always update `docs/merge-notes/current.md`** with git state, diff outputs, and patch artifact info when the active workflow requires it.
- **Always update `docs/change-briefs/day-XX.md`** for the current day's changes when the active workflow requires it.
- **Always log `git diff` and create patch artifacts** in the `artifacts/` folder when the active workflow requires it.

---

## Coding Standards

### Variables

- Never use `var`.
- Prefer `const` unless reassignment is genuinely needed.
- Use descriptive variable names that explain intent.

### Operators To Avoid

- Avoid `?.` (optional chaining). Use explicit null checks.
- Avoid `??` (nullish coalescing). Use explicit ternaries or clear conditionals.
- Avoid `...` (spread operator). Use explicit loops or `Object.assign` for object copying.

### Comments

- Over-comment new logic with teaching-level comments.
- Comments should explain:
  - why the code exists
  - how it works
  - where it fits in the architecture
- Include JSDoc for exported functions and types when that is the local convention.

### Coding Conventions

- Follow existing code style and folder conventions in this repo.
- Use `function` declarations over arrow functions for top-level exports where that matches local convention.
- Avoid `for...of` loops and spread operators in hot paths.
- Prefer explicit `for` loops when iterating arrays in store or adapter code.
- Use explicit, maintainable code over clever abstractions.
- Avoid unrelated rewrites, renames, formatting churn, or file moves.

---

## Execution Guidance

### Reviewable Diffs

- Keep changes proportional to the task and easy to review.
- Keep the diff focused on the requested work.
- Avoid broad incidental churn.
- If the task explicitly requires structural UI correction, mock parity, or stronger visual hierarchy inside the targeted surface, make those changes directly instead of stopping at smaller cosmetic adjustments.

### Architecture Discipline

- Prefer the active architecture path for the feature you are touching.
- Avoid legacy paths unless required for correctness or compatibility.
- Preserve routing, shell behavior, hydration boundaries, and persistence behavior unless the task explicitly requires changes there.
- Treat existing page structure as reusable context, not as an automatic veto against targeted screen restructuring.

### File Organization

- Place new components in the appropriate subdirectory under `components/`.
- Create barrel exports (`index.ts`) for component groups when that is the local pattern.
- Keep component files focused and extract shared logic to hooks or utilities where it improves maintainability.
- Keep pure functions in appropriate `lib/` subdirectories.
- Keep adapters and mappers in the repo's established adapter locations.

---

## UI And Accessibility Standards

- Semantic HTML first. Use native `<button>`, `<a>`, `<input>`, and form labeling before ARIA fallbacks.
- Build 508-ready by default (WCAG-aligned mechanics), but do not claim formal certification or compliance without a completed audit.
- Tooltips for non-obvious controls must include name, short purpose, and keyboard shortcut when available.
- Tooltip behavior must work on hover and keyboard focus, and must not reveal private or sensitive data.
- Trust-first UX and local-first behavior must remain clear where the product depends on them.

### Interaction-State Standard

Every interactive control must show appropriate visible feedback for the states that apply to it. Static, unresponsive controls are not acceptable unless there is a strong product reason.

**Required states** (apply the ones relevant to the control):

| State | Requirement |
|-------|-------------|
| `hover` | Visible background, border, or opacity change on pointer hover. |
| `focus-visible` | Keyboard-triggered focus ring or equivalent outline. Must be at least as visually obvious as hover. Must use PathOS theme tokens (`--p-accent` ring or equivalent) for consistency across the app. |
| `active` / `pressed` | Brief visual shift (scale, darken, or opacity) confirming the interaction was registered. |
| `selected` / `current` | Persistent highlight that remains while the item is the active selection. Must be visually stronger and more persistent than hover. Must not rely on color alone — use a border, accent bar, icon, check, label, or equivalent secondary signal alongside color. |

**Controls this applies to:**

- Buttons (primary, secondary, icon buttons, ghost buttons)
- Inputs and search boxes (border highlight on focus, visible placeholder change on hover where appropriate)
- List rows and cards (selectable rows, job cards, saved-job rows)
- Tabs and nav items
- Mode switches and segmented controls (workspace mode toggles, view switchers)
- Section-level sub-navigation (document section tabs, content area nav)
- Dropdown triggers and dropdown options
- Chips and filter tags
- Clickable panels, sidebar actions, and similar interactive surfaces

**Consistency rules:**

- Focus-visible treatment must be keyboard-visible (`:focus-visible`, not `:focus`) and consistent across all pages.
- Hover and focus-visible must use PathOS theme tokens, not hardcoded color values.
- Selected/current state must survive hover — hovering a selected item must not make it look unselected.
- When multiple items can be selected or one item is "current," the distinction between selected and unselected must be immediately obvious without relying on color alone.

**Implementation patterns per control type:**

| Control | hover | focus-visible | active | selected |
|---------|-------|---------------|--------|----------|
| Primary button | Slight darken or opacity shift on `var(--p-accent)` fill | `ring-2 ring-[var(--p-accent)]` outline via `:focus-visible` | Scale or opacity shift confirming press | N/A |
| Secondary / ghost button | `var(--p-surface2)` background | `ring-2 ring-[var(--p-accent)]` outline | Slight darken | N/A |
| Icon button | `INTERACTIVE_HOVER_CLASS` (theme.css) | `ring-2 ring-[var(--p-accent)]` inset | Opacity shift | N/A |
| Input / search box | Border brightens to `var(--p-text-dim)` | `ring-2 ring-[var(--p-accent)]` inset ring | N/A | N/A |
| List row / card | `var(--p-surface2)` background (explicit hover tracking) | `ring-2 ring-[var(--p-accent)]` inset ring on focusable child | N/A | Accent-tinted bg (`color-mix`) + accent left border. Must be stronger than hover. |
| Tab / nav item | Subtle background shift | `ring-2 ring-[var(--p-accent)]` | N/A | Accent border-bottom or fill; text color shift to `var(--p-accent)` |
| Mode switch / segmented | Text brightens to `var(--p-text-muted)` + faint underline hint (useState tracking) | `ring-2 ring-[var(--p-accent)]` inset | Opacity reduction (0.75) | Accent text + 2px accent underline + subtle accent bg tint. Must survive hover without regression. |
| Section sub-nav | Text brightens + subtle underline hint (useState tracking, lighter than mode switch) | `ring-2 ring-[var(--p-accent)]` inset | Opacity reduction | Accent text + 2px accent underline + faint accent bg tint. |
| Dropdown trigger | `INTERACTIVE_HOVER_CLASS` + border change | `ring-2 ring-[var(--p-accent)]` inset | N/A | N/A |
| Dropdown option | Background shift to `var(--p-surface2)` | `ring-2 ring-[var(--p-accent)]` inset | N/A | Accent text + tinted background; font-weight 600 |
| Chip / filter tag | Slight background brighten | `ring-2 ring-[var(--p-accent)]` | N/A | Accent-tinted bg if toggleable |

**Recurring-defect prevention rules:**

- Every new interactive control must have explicit hover and focus-visible treatment before the PR is considered complete.
- Use `INTERACTIVE_HOVER_CLASS` (from `styles/interactiveHover.ts`) for buttons, triggers, and icon actions — it provides consistent token-based hover via theme.css.
- For selectable list rows, use explicit `useState` hover tracking (not CSS-only `:hover`) when the selected state needs to coexist with hover without visual conflict.
- For mode switches, segmented controls, and section sub-navigation, use explicit `useState` hover tracking with underline-accent patterns (not `INTERACTIVE_HOVER_CLASS`, which applies background-fill hover that conflicts with underline tab semantics). See `WorkspaceModeTab` and `AnnouncementSectionTab` in `SavedJobsScreen.tsx` for the reference implementation.
- Score indicators and progress bars must use consistent color tiers across all surfaces: green (`--p-success`) for strong (>=80), amber (`--p-warning`) for medium (>=60), red (`--p-danger`) for weak (<60). Never hardcode score-tier colors — use `scoreTierColor()` from `styles/scoreTiers.ts`. The same shared function must be used in Saved Jobs, Job Search, and any other surface that renders score-coded indicators. Gap-state labels (Strong / Adequate / Gap) must use the same color scale.
- Horizontal bar fills (e.g. match dimension bars) must include `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label` for accessibility.
- Interactive rows in list panes (saved jobs, search results) must maintain consistent height regardless of selection state. No expanding inline buttons or height changes on hover/select.
- Action icon buttons (trash, remove, etc.) inside list rows must be vertically centered and use `INTERACTIVE_HOVER_CLASS` for consistent feedback. Do not add extra navigational icons (chevrons, arrows) unless they serve a distinct navigation purpose.
- When the same derived value (e.g. readiness score) appears in both a list row and a detail view, both must use the same derivation function to ensure consistency.
- When adding a new page or component, verify interaction states against this table before considering the work complete. Missing states are defects, not optional polish.

---

## State, Persistence, And Testing Expectations

### State And Persistence

- When saving objects to state or localStorage, deep clone arrays to avoid shared references.
- Verify persistence behavior by setting a value, refreshing, and confirming the value persists or does not persist per design.
- Use controlled mode for Radix components when programmatic state access is required.

### Tests

- Tests are required for:
  - business logic functions
  - bug fixes that can be reproduced deterministically
  - adapters and mappers
  - store behavior with persistence expectations
- Tests are optional for:
  - pure UI-only changes such as styling or layout
  - trivial one-line utilities

### Accessibility Checks

- Dialogs must have proper focus management.
- Select components should support keyboard navigation.
- Interactive elements need appropriate accessible names or labels.

Use `C:\dev\PathOS\docs\testing\testing-standards.md` and `C:\dev\PathOS\docs\testing\playwright-guidelines.md` for canonical testing doctrine and runtime validation expectations.

---

## Workflow Outputs

### Validation Commands

Run the repo's required validation commands for the task scope and report what actually ran.

When the active workflow requires full frontend validation, the standard command set is:

```bash
pnpm ci:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Merge Notes And Change Briefs

- `docs/merge-notes/current.md` is append-only.
- Add a new dated section for the run with branch name, summary of changes, files changed, behavior changes, follow-ups, and commands run.
- Update the applicable `docs/change-briefs/day-XX.md` file for the current day's work when required by the workflow.

### Patch Artifact Rules

Key principle: because work often remains uncommitted during a run, the canonical cumulative patch must reflect `develop` to working tree, not `develop...HEAD`.

- Regenerate patch artifacts at the end of the run after final edits.
- Exclude `artifacts/` from patch contents.
- Use UTF-8 output when generating patch files in PowerShell.
- Record artifact filenames and file metadata in merge notes when the workflow requires it.

Required artifacts when the workflow calls for them:
1. `artifacts/day-<N>.patch`
2. `artifacts/day-<N>-run.patch` or the repo's current incremental naming variant

---

## Human Simulation Gate

- Evaluate whether human simulation is required using the canonical testing doctrine.
- Record the decision and triggers in `docs/merge-notes/current.md` when the workflow requires it.
- If required, run the appropriate runtime validation steps and document the evidence.

---

## Quick Reference

| Rule | Do | Don't |
|------|-----|-------|
| Variables | `const x = 1;` | `var x = 1;` |
| Comments | Explain why and how | Restate syntax |
| Arrays | Deep clone when saving | Share references between state |
| Buttons in links | `<Button asChild><Link>` | `<Button><a>` |
| Form buttons | `<button type="button">` | `<button>` |

---

## Hard Rules Summary

- No `var`
- No commit or push
- Reviewable, task-scoped diffs
- Preserve trust-first, local-first, accessibility, and persistence standards where applicable
- Complete required workflow reporting and artifacts when the active workflow requires them

---

*Last updated: March 2026*
