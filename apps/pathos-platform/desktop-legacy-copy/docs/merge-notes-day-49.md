# Merge Notes (Append-Only)

## 2026-01-22 — Day 47 kickoff
- Branch: `feature/day-47-desktop-repo-and-installer`
- Commands:
  - `mkdir -p pathos-desktop/src pathos-desktop/docs/change-briefs pathos-desktop/.github/workflows`
  - `git init pathos-desktop`
  - `git -C pathos-desktop checkout -b feature/day-47-desktop-repo-and-installer`
  - `PNPM_STORE_DIR=/home/joriel/pathos/codebase/fedpath-tier1-frontend/.pnpm-store/v10 pnpm add -D electron electron-builder`
- Build status: FAIL (installer not built yet)
- Artifact location: `release/PathOS Desktop Setup *.exe` (Windows build)
