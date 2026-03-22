# Branch Protection Configuration

This document describes the required GitHub branch protection settings that must be configured after merging Day 34 changes.

## Why Branch Protection?

Branch protection rules enforce that required CI checks pass before code can be merged. This prevents broken code from entering `develop` or `main` branches and ensures release readiness.

## Required Settings

### develop Branch

**Location:** GitHub → Settings → Branches → Branch protection rules → Add rule for `develop`

**Required Settings:**

1. **Require a pull request before merging**
   - ✅ Enable this option
   - Recommended: Require approvals (1 or more, depending on team policy)
   - Recommended: Dismiss stale pull request approvals when new commits are pushed

2. **Require status checks to pass before merging**
   - ✅ Enable this option
   - **Required check:** `CI Develop` (or the exact name shown in GitHub Actions)
     - To find the exact name: Go to Actions → Run a PR workflow → Check the job name
     - Common names: `CI Develop`, `Policy + Quality Gates`, `CI Develop / quality`
   - Recommended: Require branches to be up to date before merging

3. **Optional but Recommended:**
   - Require linear history (prevents merge commits)
   - Do not allow bypassing the above settings (prevents force pushes)

**Why:**
- Ensures all PRs to develop run `ci-develop.yml` which includes:
  - Policy validation (ci:validate)
  - Owner map freshness check
  - Quality gates (lint, typecheck, test, build)

### main Branch

**Location:** GitHub → Settings → Branches → Branch protection rules → Add rule for `main`

**Required Settings:**

1. **Require a pull request before merging**
   - ✅ Enable this option
   - Recommended: Require approvals (2 or more for production)
   - Recommended: Dismiss stale pull request approvals when new commits are pushed

2. **Require status checks to pass before merging**
   - ✅ Enable this option
   - **Required check:** `CI` (or the exact name shown in GitHub Actions)
     - To find the exact name: Go to Actions → Run a PR workflow → Check the job name
     - Common names: `CI`, `Lint, Type Check, Test, Build`, `CI / quality`
   - Recommended: Require branches to be up to date before merging

3. **Optional but Recommended:**
   - Require linear history
   - Do not allow bypassing the above settings
   - Restrict who can push to matching branches (admin-only)

**Why:**
- Ensures all PRs to main run `ci.yml` which validates production readiness
- Prevents direct pushes to production branch

## Finding the Exact Check Name

The check name in GitHub Actions may differ from the workflow file name. To find the exact name:

1. Go to GitHub → Actions tab
2. Open any recent workflow run
3. Look at the job name (e.g., "Policy + Quality Gates" or "Lint, Type Check, Test, Build")
4. **Important:** Copy the check name exactly as shown - it is case-sensitive and must match precisely
5. Use that exact name in the branch protection rule

Alternatively, after creating a PR, the check will appear in the PR's "Checks" tab. Use that exact name.

**Note:** The check names must be copied exactly from the GitHub Actions UI. Do not guess or approximate - verify the exact spelling and capitalization from a recent workflow run.

## What Changed in Day 34

**Before Day 34:**
- Both `ci.yml` and `ci-develop.yml` ran on PRs to develop (duplicate CI)
- No clear single source of truth for PR checks

**After Day 34:**
- `ci-develop.yml` is the single source of truth for PRs to develop
- `ci.yml` runs on:
  - PRs to main (pre-merge validation)
  - Pushes to develop (post-merge verification)
  - Pushes to main (production verification)

**Why Duplicate Checks Were Removed:**
- Eliminates wasted CI resources
- Reduces confusion about which workflow is authoritative
- Clearer separation: `ci-develop.yml` = PR gate, `ci.yml` = post-merge verification

## Verification

After configuring branch protection:

1. Create a test PR to develop
2. Verify that only `CI Develop` check appears (not `CI`)
3. Verify that the PR cannot be merged until `CI Develop` passes
4. Create a test PR to main
5. Verify that `CI` check appears
6. Verify that the PR cannot be merged until `CI` passes

## Troubleshooting

**Issue:** Check name not found in branch protection dropdown
- **Solution:** The check must have run at least once. Create a PR and let CI run, then the check name will appear.

**Issue:** PR can still be merged even with failing checks
- **Solution:** Verify "Require status checks to pass before merging" is enabled and the correct check is selected.

**Issue:** Both `CI` and `CI Develop` appear on PR to develop
- **Solution:** Verify that `ci.yml` no longer has `pull_request` trigger for develop. Check `.github/workflows/ci.yml` file.

---

*Last updated: December 30, 2025*

