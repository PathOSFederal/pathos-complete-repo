# Merge Notes

This directory contains merge notes for PRs.

## Structure

- **`current.md`** - The active merge notes file for the current PR. Update this file for each PR.
- **`archive/`** - Historical merge notes from previous days/PRs.

## Usage

1. When starting a new PR, update `current.md` with the day number and PR details.
2. When archiving a completed PR, move `current.md` to `archive/day-<N>.md` (where N is the day number).
3. Create a fresh `current.md` for the next PR.

## Notes

- Only `current.md` should be updated during active development.
- Historical notes in `archive/` are read-only reference material.

## Artifacts (Patch Files)

Going forward, exactly two patch files are generated per day:
- `artifacts/day-<N>.patch` (cumulative: develop baseline to current working tree)
- `artifacts/day-<N>-run.patch` (incremental: latest Cursor run)

**Deprecated variants:** Older patch files may exist with variants like `-this-run`, `-working-tree`, `-staged`, or `-story`. These are historical and will not be generated anymore. Use `pnpm docs:day-patches --day <N>` to generate the canonical two files. Do not create or reference deprecated patch variants in merge notes.

