# Day 18 — CI Gates + Definition of Done Enforcement

**Date:** December 14, 2025

---

## What Changed

- **New CI workflow for PRs**: Added a dedicated GitHub Actions workflow (`ci-develop.yml`) that runs automatically when opening or updating a pull request targeting the `develop` branch.

- **Policy validation scripts**: Created three validation scripts that check Definition of Done requirements:
  - Patch artifacts exist (`day-XX.patch` files)
  - Change brief exists (`docs/change-briefs/day-XX.md`)
  - Day labels are consistent (no mismatched day references)

- **New `ci:validate` command**: Added a single command that runs all policy checks at once, usable both locally and in CI.

---

## Why It Matters

- **Consistent quality**: Every pull request now goes through the same automated checks, reducing the chance of incomplete or inconsistent changes slipping through.

- **Faster feedback**: Developers know immediately if they're missing required artifacts or documentation, rather than discovering it during code review.

- **Audit trail**: Patch artifacts and change briefs create a traceable history of what changed and why, making it easier to understand the project's evolution.

- **Reduced manual checking**: Reviewers no longer need to manually verify that all required files exist — the CI does it automatically.

---

## What to Notice

### For Developers

- Before opening a PR, run `pnpm ci:validate` to verify all requirements are met.
- If the CI fails, check the error messages — they explain exactly what's missing and how to fix it.
- The validation scripts check for files matching the current day number (Day 18), so make sure your artifacts and change briefs use the correct day.

### For Reviewers

- PRs that pass CI have already been verified to have:
  - Patch artifacts (`artifacts/day-XX.patch`, `artifacts/day-XX-this-run.patch`)
  - A change brief for stakeholders
  - Consistent day labeling

### What Was Not Enforced Before

| Requirement | Before Day 18 | After Day 18 |
|-------------|---------------|--------------|
| Patch artifacts exist | Manual check | Automated CI gate |
| Change brief exists | Manual check | Automated CI gate |
| Day labels consistent | Not checked | Automated warning |
| All four quality gates | Run in CI | Still run in CI (unchanged) |

---

## Technical Notes

- Validation scripts are written as ES modules (`.mjs`) for Node.js compatibility
- Scripts work on both Windows and Linux (no bash-only assumptions)
- Day label validation uses heuristics and produces warnings, not blocking errors
- The existing `ci.yml` workflow remains unchanged for backward compatibility

---

*This change brief is for Day 18 of the PathOS development cycle.*
