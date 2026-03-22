# Process Card (Pinned)

> **Status**: Active Process v2  
> **Purpose**: Single source of truth for development process rules  
> **Last Updated**: December 2025

---

## Core Process Rules

### Merge Notes

- **Single file**: `docs/merge-notes/current.md` (one file per PR)
- **Append-only**: Never delete or modify existing sections
- **Archiving**: When starting a new day, move `current.md` to `docs/merge-notes/archive/day-<N>.md`, then create a fresh `current.md`

### Patch Artifacts

- **Exactly two files** per day:
  - `artifacts/day-<N>.patch` (cumulative: develop baseline → current working tree)
  - `artifacts/day-<N>-run.patch` (incremental: HEAD → current working tree)
- **Generation**: Use `pnpm docs:day-patches --day <N>` (preferred) or manual PowerShell UTF-8 commands
- **Exclusions**: Always exclude `artifacts/` folder from patch content
- **Encoding**: UTF-8 only (PowerShell: `Out-File -Encoding utf8`, never use `>`)

### Validation

- **DAY environment variable**: Required for `pnpm ci:validate`
  - PowerShell: `$env:DAY="<N>"; pnpm ci:validate`
  - Bash: `DAY=<N> pnpm ci:validate`
- **Quality gates** (run in order):
  1. `pnpm ci:validate` (must pass first)
  2. `pnpm lint`
  3. `pnpm typecheck`
  4. `pnpm test`
  5. `pnpm build`

### Warnings Policy

- **Warnings allowed**: Warnings in lint/typecheck/test/build output are allowed
- **Only hard failures block merging**
- **Future work**: Dedicated "Warnings Cleanup Day" scheduled to eliminate warnings and optionally tighten rules

---

## Deprecated Variants

**Do not use or reference:**
- Legacy patch filenames: `-this-run`, `-working-tree`, `-staged`, `-story`
- Multiple merge-notes files per PR
- Hardcoded day numbers in validation scripts

---

*This is the pinned source of truth. All process documentation should reference this file and defer to it when conflicts arise.*

