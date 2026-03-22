# Cursor House Rules

> **Purpose**: Canonical guidance for all AI-assisted development in the PathOS Tier 1 Frontend repo.
> This file is the source of truth for Cursor rules. Future prompts should reference this file.
> If any AI doc conflicts, cursor-house-rules.md wins.

---

## Hard Rules (Enforced)

- **Never use `var`**. Always use `const` or `let`.
- **Avoid `?.`, `??`, and `...` (spread)**. Use explicit null checks and manual object/array construction.
- **Over-comment new/modified code** with teaching-level headers explaining why/how.
- **Never run `git commit` or `git push`**. Leave commits to the developer.
- **Always update `docs/merge-notes/current.md`** with git state, diff outputs, and patch artifact info.
- **Always update `docs/change-briefs/day-XX.md`** for the current day's changes.
- **Always log `git diff` and create patch artifact** in `artifacts/` folder.
  - **Preferred method:** Run `pnpm docs:day-patches --day <N>` to auto-generate both patch files (cumulative and incremental). The script generates the canonical baseline patch (develop → working tree) and excludes artifacts.
  - **Fallback (manual):** See "Patch Artifact Rules (Canonical)" section below for the correct commands.

---

## Code Style Rules

### Variables

- **Never use `var`**. Always use `const` or `let`.
- Prefer `const` unless reassignment is genuinely needed.
- Use descriptive variable names that explain intent.

### Operators to Avoid

- **Avoid `?.` (optional chaining)**. Use explicit null checks: `if (x !== null && x !== undefined) { x.prop }`.
- **Avoid `??` (nullish coalescing)**. Use explicit ternary: `x !== null && x !== undefined ? x : defaultValue`.
- **Avoid `...` (spread operator)**. Use explicit loops or Object.assign for object copying.

### Comments

- **Over-comment new logic** with teaching-level comments.
- Comments should explain:
  - **Why** the code exists
  - **How** it works
  - **Where** it fits in the architecture
- Include JSDoc for all exported functions and types.

### Coding Conventions

- Follow existing code style and folder conventions in this repo.
- Use `function` declarations over arrow functions for top-level exports (consistency with existing codebase).
- Avoid `for...of` loops and spread operators in hot paths (browser compatibility).
- Prefer explicit `for` loops when iterating arrays in store/adapter code.

---

## Development Workflow

### Before Making Changes

1. Read and understand relevant files before proposing edits.
2. Check existing patterns in similar files.
3. Verify the change aligns with the component's documented purpose.

### After Making Changes

Run these commands and paste their outputs:

```bash
# Set DAY environment variable first (required for ci:validate)
# PowerShell: $env:DAY="34"; pnpm ci:validate
# Bash: DAY=34 pnpm ci:validate
pnpm ci:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

**Day Selection for Validation:**
- Set `DAY` environment variable before running `pnpm ci:validate`
- PowerShell: `$env:DAY="34"; pnpm ci:validate`
- Bash: `DAY=34 pnpm ci:validate`
- This ensures validators check the correct day's artifacts and change briefs

All quality gates must pass before a PR can be merged. **Warnings Policy:** Warnings in lint/typecheck/test/build output are allowed for now. Only hard failures block merging. A dedicated "Warnings Cleanup Day" will be scheduled in the future to eliminate warnings and optionally tighten rules.

### Documentation Updates

- **`docs/merge-notes/current.md` is append-only**. Never delete or modify existing sections.
- **Archiving rule**: When starting a new day, MOVE `docs/merge-notes/current.md` to `docs/merge-notes/archive/day-<N>.md` (where N is the prior day number), then create a fresh `docs/merge-notes/current.md` for the new day.
- Add a new dated section at the end with:
  - Branch name
  - Summary of changes
  - Files changed
  - Behavior changes
  - Follow-ups/deferred items
  - Commands run and outputs

### Patch Artifact Rules (Canonical)

> **Key principle**: Since we do NOT commit during runs, `HEAD` often does not advance. Therefore, the canonical cumulative patch must reflect **develop → working tree** (including staged and unstaged changes), NOT `develop...HEAD`.

- **Patch artifact must be regenerated at end of every run** (after all changes and after `pnpm gates`)
- **Use PowerShell UTF-8 method** — do NOT use `>` (can produce UTF-16)
- **No paraphrased sizes** (e.g., "~260KB" or "approximately 260 KB" is forbidden)
- **If code changes after patch generation, regenerate** before stopping
- **Always exclude `artifacts/` folder** from the patch content
- **Append a "Patch Artifacts (FINAL)" block at the end of each run** — mark it as FINAL and authoritative
- **Do not edit prior "Patch Artifacts" blocks** — since `docs/merge-notes/current.md` is append-only, prior blocks remain for reference

#### Two patches required at the end of each prompt run:

1. **Cumulative day patch (required):** `artifacts/day-<N>.patch` — all changes from develop baseline to current working tree
2. **Incremental patch (required):** `artifacts/day-<N>-run.patch` — incremental changes for the latest Cursor run (HEAD to working tree)

**Note:** Use `pnpm docs:day-patches --day <N>` to generate both patches automatically. The script handles UTF-8 encoding and excludes artifacts/ folder.

#### Preferred method (automated):

```bash
pnpm docs:day-patches --day <N>
```

This generates both patches automatically:
- `artifacts/day-<N>.patch` (cumulative: develop → working tree)
- `artifacts/day-<N>-run.patch` (incremental: HEAD → working tree)

#### Manual method (PowerShell UTF-8):

**Cumulative day patch:**

```powershell
git add -N .
New-Item -ItemType Directory -Force artifacts | Out-Null
git diff --binary develop -- . ":(exclude)artifacts" | Out-File -FilePath artifacts/day-<N>.patch -Encoding utf8
Get-Item artifacts/day-<N>.patch | Format-List Name,Length,LastWriteTime
```

**Incremental patch:**

```powershell
git add -N .
git diff --binary HEAD -- . ":(exclude)artifacts" | Out-File -FilePath artifacts/day-<N>-run.patch -Encoding utf8
Get-Item artifacts/day-<N>-run.patch | Format-List Name,Length,LastWriteTime
```

#### Manual method (Bash):

**Cumulative day patch:**

```bash
git add -N .
mkdir -p artifacts
git diff --binary develop -- . ':(exclude)artifacts' > artifacts/day-<N>.patch
ls -lh artifacts/day-<N>.patch
```

**Incremental patch:**

```bash
git add -N .
git diff --binary HEAD -- . ':(exclude)artifacts' > artifacts/day-<N>-run.patch
ls -lh artifacts/day-<N>-run.patch
```

### Patch Artifact Checklist

Before ending every Cursor run, verify:

- [ ] Patch regenerated at end (overwritten)
- [ ] Patch written as UTF-8 (PowerShell `Out-File -Encoding utf8`)
- [ ] Patch uses develop baseline (NOT `develop...HEAD`)
- [ ] Patch excludes `artifacts/` folder
- [ ] `Get-Item ... | Format-List` output pasted into current.md
- [ ] No diffs pasted into current.md

---

## Change discipline

### Minimal diffs

Make the smallest possible edits required to complete the task. Do not rewrite whole files, reformat broadly, or reorder code unless necessary. If you accidentally create large diffs (auto-formatting, import churn), undo those hunks with `git restore -p` and re-apply a minimal targeted fix.

> **Note**: Patch artifact commands are defined in the "Patch Artifact Rules (Canonical)" section above. Do not use `develop...HEAD` for patch generation — use the canonical develop baseline commands.

---

## File Organization

### Component Files

- Place new components in the appropriate subdirectory under `components/`.
- Create barrel exports (`index.ts`) for component groups.
- Keep component files focused; extract shared logic to hooks or utilities.

### Store Files

- Zustand stores live in `store/`.
- Include detailed file headers explaining the store's purpose.
- Export selectors for all commonly accessed state.

### Library Files

- Pure functions go in `lib/` subdirectories.
- Adapters/mappers go in `lib/jobs/adapters/`.
- API client functions go in `lib/api/`.

---

## Common Pitfalls to Avoid

### State Persistence Bugs

- When saving objects to state or localStorage, **deep clone arrays** to avoid shared references.
- Verify persistence behavior by:
  1. Setting a value
  2. Refreshing the page
  3. Confirming the value persists (or doesn't, per design)

### UI Patterns

- Use `Button asChild` + `Link` for navigational buttons (avoids `<a>` inside `<button>`).
- Add `type="button"` to buttons inside forms or Radix Collapsible components.
- Use controlled mode for Radix components when you need programmatic state access.

### UI and Accessibility Implementation Standards

- Semantic HTML first. Use native `<button>`, `<a>`, `<input>`, and form labeling before ARIA fallbacks.
- Build 508-ready by default (WCAG-aligned mechanics), but do not claim formal certification/compliance without a completed audit.
- Tooltips for non-obvious controls must include name, short purpose, and keyboard shortcut when available.
- Tooltip behavior must work on hover and keyboard focus, and must not reveal private/sensitive data.
- Any interactive element must have visible `hover`, `focus-visible`, `active/pressed`, and `disabled` states.
- Any selectable list row/card/tab/item must show hover highlight, selected state, and focus-visible indicator.
- Selected state must not rely on color alone (use icon/check, border, label, or equivalent).
- Focus-visible must be at least as visually obvious as hover.
- Verification for tooltip behavior and accessibility requirements is enforced in `docs/ai/testing-standards.md` (A11y/508-ready Gate).

### Type Safety

- Avoid `any` types. Use explicit types or `unknown` with type guards.
- Use Zod schemas for runtime validation of external data.
- Cast to extended types only when you've verified the shape.

---

## Quality Standards

### Tests

- Tests are required for:
  - Business logic functions
  - Bug fixes (add a test that would have caught the bug)
  - Adapters/mappers
  - Store behavior with persistence expectations
- Tests are optional for:
  - Pure UI-only changes (styling, layout)
  - Trivial one-liner utilities

### Accessibility

- Dialogs must have proper focus management.
- Select components should support keyboard navigation.
- Interactive elements need appropriate ARIA labels.

---

## Quick Reference

| Rule | Do | Don't |
|------|-----|-------|
| Variables | `const x = 1;` | `var x = 1;` |
| Comments | Explain why and how | Leave complex code unexplained |
| Arrays | Deep clone when saving | Share references between state |
| Buttons in links | `<Button asChild><Link>` | `<Button><a>` |
| Form buttons | `<button type="button">` | `<button>` (defaults to submit) |

---

---

## AI Acceptance Checklist (Required in merge-notes)

Before marking any feature complete, document in `docs/merge-notes/current.md`:

1. **Flow explanation**: Describe the data flow as UI → store → persistence → UI
2. **Store(s) touched**: List all Zustand stores affected
3. **Storage key(s) touched**: List all localStorage keys read/written
4. **Failure mode if broken**: What would happen if this code fails?
5. **How tested**: Manual verification steps or automated tests

Example:

```markdown
### AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | CreateAlert button → jobAlertsStore.createAlert() → pathos-job-alerts → Alerts tab shows new alert |
| Store(s) | jobAlertsStore |
| Storage key(s) | pathos-job-alerts |
| Failure mode | Alert not saved, disappears on refresh |
| How tested | Manual: create → appears → refresh → persists |
```

---

## Owner Map Update Rule

Any PR that changes:
- Routes (adds/removes pages in `app/`)
- Stores (adds/modifies files in `store/`)
- Persistence keys (changes to `lib/storage-keys.ts`)
- Critical flows

**MUST**:
1. Update `docs/owner-map.md` (human-maintained)
2. Regenerate `docs/owner-map.generated.md` by running `pnpm docs:owner-map`
3. Generate/update both files in the same PR. Do not commit or push during Cursor runs; the developer will commit after review.

**CI Behavior:**
- Owner map check runs conditionally in CI (only when relevant paths change: `app/`, `components/`, `lib/`, `store/`, `pages/`, or `docs/owner-map*`)
- CI will fail if the generated owner map is out of sync (only when the check runs)
- Unrelated PRs (docs-only, CI-only, etc.) will skip the owner map check

---

## Human Simulation Gate (required decision per ticket)

> **Purpose**: Ensure human simulation is performed when needed and explicitly skipped when not.
> **Triggers**: Defined in `docs/ai/testing-standards.md` under "Human Simulation Rule (conditional, required)"

### Decision Process

At the start of every ticket, Cursor must:

1. **Evaluate triggers** from `docs/ai/testing-standards.md` (Human Simulation Rule)
2. **Record in `docs/merge-notes/current.md`**:
   - "Human Simulation Gate: required yes/no"
   - "Triggers hit: [list or 'none']"
   - "Why: [brief explanation]"

### When Required

If **any trigger** is hit:

1. Include a "Testing Evidence" section in `docs/merge-notes/current.md`
2. Run the required dev simulation steps (pnpm dev → flow → refresh → localStorage check)
3. If SSR/hydration/routing is involved: also run `pnpm build && pnpm start` and repeat the flow

### When Not Required

If **no triggers** are hit:

- Document: "Human simulation not required"
- Document: "Reason: [e.g., 'text-only change', 'cosmetic CSS update', 'comment-only']"

### Example Gate Entry

```markdown
### Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Changes Zustand store logic, Adds Create action |
| Why | New alert creation action modifies jobAlertsStore |
```

---

## Hard Rules (Summary)

- **No `var`** — use `let` or `const` only
- **Minimal diffs** — do not rewrite whole files
- **Do not commit/push** — leave commits to the developer
- **For any feature with a create button**: Test create → appears elsewhere → refresh → still there, and confirm the intended localStorage key exists and changes

---

*Last updated: March 2026*
