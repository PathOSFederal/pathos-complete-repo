# Deferred Recommendations

This document captures recommendations and improvements that were identified during development but deferred to future work. Each entry is tagged with the day it was identified.

> **Note:** Patch variant guidance prior to Process Polish v1 is deprecated. Use `pnpm docs:day-patches --day <N>` and the two canonical patch files (`day-<N>.patch` and `day-<N>-run.patch`) only. Older entries in this document may reference deprecated patch variants; those references should be ignored.

---

## Day 34 – CI Hardening + Release Readiness v1

**Date:** December 23, 2025  
**Context:** CI hardening and release readiness improvements

> **Note:** Patch variant filenames (`-this-run`, `-working-tree`, `-staged`, `-story`) are deprecated post-Process Polish v1. Use the two canonical patch files only: `day-<N>.patch` and `day-<N>-run.patch`.

### A) Windows-safe UTF-8 patch generation

**Issue:** PowerShell redirect (`>`) writes UTF-16 by default, which violates the "UTF-8 patch artifacts" rule. This can cause issues when patches are reviewed or applied on other systems.

**Recommendation:** Standardize patch generation with UTF-8 encoding explicitly.

**Approach:**
- Use PowerShell `Set-Content -Encoding utf8` when generating patches on Windows
- Consider creating a small script (e.g., `scripts/gen-patches.ps1` or `scripts/gen-patches.sh`) that standardizes patch generation across platforms
- The script should:
  - Accept day number as parameter
  - Generate `artifacts/day-XX.patch` (cumulative from develop)
  - Generate `artifacts/day-XX-this-run.patch` (working tree diff)
  - Generate `artifacts/day-XX-staged.patch` (staged diff, if any)
  - Ensure all patches are UTF-8 encoded
  - Log file sizes for verification

**Current Workaround:** Manual PowerShell commands with `Set-Content -Encoding utf8` (see merge notes)

---

### B) Node version pinning for dev parity

**Issue:** CI uses Node.js 22.x, but developers may have different local Node versions, leading to "works locally" drift.

**Recommendation:** Pin Node version for local development to match CI.

**Approach:**
- Add `.nvmrc` (for nvm users) or `.tool-versions` (for asdf users) with Node version `22`
- Document in README or dev docs that developers should use the pinned Node version
- Consider adding a pre-commit hook or package.json script that warns if Node version doesn't match

**Benefit:** Reduces environment differences between local development and CI

---

### C) Lint policy clarity

**Issue:** Lint is currently non-blocking in `ci.yml` (uses `continue-on-error: true`) but blocking in `ci-develop.yml`. This inconsistency may cause confusion.

**Recommendation:** Decide on a clear lint policy and document it.

**Options:**
1. **Non-blocking (current in ci.yml):** Keep lint as warnings-only, document it clearly in workflow comments and `docs/ci/branch-protection.md`
2. **Blocking (future):** Make lint blocking after fixing pre-existing errors, update both workflows consistently

**Action Items:**
- Document current policy clearly in `docs/ci/branch-protection.md` or workflow notes
- If making blocking later, schedule as a tech debt item and update both workflows together

**Current State:** 
- `ci.yml`: Non-blocking (warnings only, continue-on-error: true)
- `ci-develop.yml`: Blocking (fails workflow on lint errors)

---

### D) Branch protection required checks verification

**Issue:** Branch protection rules must be configured manually in GitHub UI. The exact check names need to be verified after workflows run in Actions, and they must be copied exactly as shown in the GitHub Actions UI.

**Recommendation:** Document the exact required checks after merge and verify they are correctly configured.

**Action Items:**
- After merging Day 34, verify in GitHub Actions UI the exact workflow/job names:
  - For `develop`: Check name for `CI Develop` workflow (likely `Policy + Quality Gates` or `CI Develop`)
  - For `main`: Check name for `CI` workflow (likely `Lint, Type Check, Test, Build` or `CI`)
- **Important:** The check names must be copied exactly from the GitHub Actions UI - they are case-sensitive and must match precisely
- Update `docs/ci/branch-protection.md` with exact check names
- Add a note in `docs/ci/branch-protection.md` that the check names must be copied exactly from the UI
- Verify branch protection settings require these checks
- Add a note in merge notes or change brief to revisit after merge

**Reference:** See `docs/ci/branch-protection.md` for setup instructions

---

## Process Polish v1 – Deferred Recommendations

**Date:** December 24, 2025  
**Context:** Process polish merge readiness fixes

### A) Add scripts/gen-day-patches.ps1 wrapper

**Issue:** The Node.js script `scripts/gen-day-patches.mjs` works well, but a PowerShell wrapper could provide better integration for Windows developers and add convenient file size reporting.

**Recommendation:** Create a small PowerShell wrapper that calls the Node script and prints file sizes.

**Approach:**
- Create `scripts/gen-day-patches.ps1` that:
  - Accepts `--day <N>` parameter (passes through to Node script)
  - Calls `node scripts/gen-day-patches.mjs --day <N>`
  - After script execution, runs `Get-Item artifacts/day-<N>.patch artifacts/day-<N>-run.patch | Format-List Name,Length,LastWriteTime`
  - Prints the file metadata for easy copy-paste into merge notes

**Benefit:** Streamlines patch generation workflow for Windows developers and ensures consistent file size reporting format.

---

### B) Add .nvmrc or .tool-versions for Node parity

**Issue:** CI uses a specific Node version, but developers may have different local Node versions, leading to environment drift.

**Recommendation:** Pin Node version used in CI and document it in process docs.

**Approach:**
- Add `.nvmrc` (for nvm users) or `.tool-versions` (for asdf users) with the Node version used in CI
- Document in README or dev docs that developers should use the pinned Node version
- Consider adding a pre-commit hook or package.json script that warns if Node version doesn't match

**Benefit:** Reduces "works locally" vs CI discrepancies.

---

### C) Clarify lint policy

**Issue:** Lint policy is inconsistent between workflows or unclear in documentation.

**Recommendation:** Decide and document whether lint is blocking (required) or explicitly non-blocking (warning).

**Action Items:**
- Review current lint behavior in both `ci.yml` and `ci-develop.yml`
- Decide on a consistent policy (blocking vs non-blocking)
- Update both workflows to match the policy
- Document the policy clearly in `docs/ci/branch-protection.md` and workflow comments
- Ensure docs and CI agree on the policy

**Current State:** To be verified and documented.

---

### D) Owner-map conditional check robustness

**Issue:** CI changed-files detection for owner-map check may be flaky with shallow fetch settings or PR base SHA detection.

**Recommendation:** Ensure CI changed-files detection uses the PR base SHA and works with shallow fetch settings. If still flaky, downgrade owner-map to warning-only or remove it.

**Action Items:**
- Verify that CI changed-files detection uses the PR base SHA correctly
- Test with shallow fetch settings to ensure it works
- If detection is still flaky:
  - Option 1: Downgrade owner-map check to warning-only (non-blocking)
  - Option 2: Remove owner-map check from CI (rely on manual updates)
- Document the decision and rationale

**Benefit:** Prevents owner-map check from blocking unrelated PRs while maintaining code ownership tracking.

---

## Process Polish v1 – Dedicated Warnings Cleanup Day

**Date:** December 24, 2025  
**Context:** Process polish - warnings policy clarification

### Scope

**Issue:** Lint warnings (unused variables, etc.) are currently allowed in CI and local development. While this prevents warnings from blocking merges, it accumulates technical debt over time.

**Recommendation:** Schedule a dedicated "Warnings Cleanup Day" to systematically eliminate all lint warnings and optionally tighten lint rules.

**Approach:**
- Review all current lint warnings across the codebase
- Fix unused variables, unused imports, and other warning-level issues
- Optionally tighten ESLint rules to prevent similar issues in the future
- Consider making lint stricter after cleanup (e.g., make warnings block merges)
- Document the final lint policy and ensure CI/workflows enforce it consistently

**Action Items:**
- Do NOT perform this cleanup work in Process Polish v1
- Schedule as a future dedicated day when time permits
- Before starting cleanup day, document current warning baseline
- After cleanup, update CI/workflows if policy changes

**Benefit:** Reduces technical debt, improves code quality, and enables stricter lint policies if desired.

---

*Last updated: December 24, 2025*

