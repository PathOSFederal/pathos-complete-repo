# Generated Documentation Policy

> **Purpose**: Defines which documentation files are auto-generated, how they are maintained, and how determinism is enforced.

---

## Generated Files

### `docs/owner-map.generated.md`

**Generator:** `scripts/generate-owner-map.mjs`  
**Command:** `pnpm docs:owner-map`  
**Purpose:** Auto-generated reference of routes, Zustand stores, and localStorage keys extracted from the codebase.

**Source Data:**
- Routes: Scanned from `app/**/page.tsx` files
- Stores: Scanned from `store/*.ts` files (excludes `.test.ts`)
- localStorage Keys: Extracted from `lib/storage-keys.ts` STORAGE_KEYS object

**When to Regenerate:**
- When routes change (adding/removing pages in `app/`)
- When stores change (adding/modifying files in `store/`)
- When storage keys change (modifying `lib/storage-keys.ts`)

**Commit Policy:** ✅ **Committed to repository**

The generated file is committed so it can be:
- Reviewed in PRs to verify accuracy
- Referenced without running the generator
- Validated by CI to ensure it stays in sync

---

## Determinism Requirements

### Why Determinism Matters

Generated files must be **deterministic** (produce identical output for identical inputs) because:
1. CI validates generated files by running the generator and checking for diffs
2. Non-deterministic output (e.g., timestamps) causes false CI failures when dates roll over
3. Committed files should only change when source data changes, not due to time passing

### Enforcement

1. **No Timestamps**: Generated files must not include dates, timestamps, or any time-based content
2. **Deterministic Sorting**: All lists must be sorted deterministically (e.g., alphabetical)
3. **Deterministic Formatting**: Output format must be consistent (no random order, consistent whitespace)

### Validation

- **Smoke Test**: `scripts/generate-owner-map.test.mjs` runs the generator twice and verifies identical output
- **CI Check**: `.github/workflows/ci-develop.yml` runs the generator and validates no diff exists
- **Manual Verification**: Run `pnpm docs:owner-map` twice in a row and verify no file changes

---

## CI Validation

The owner map check runs conditionally in CI (only when relevant paths change):
- Triggered by changes to: `app/`, `components/`, `lib/`, `store/`, `pages/`, or `docs/owner-map*`
- Unrelated PRs (docs-only, CI-only, etc.) skip the owner map check

**CI Steps:**
1. Run `pnpm docs:owner-map` to regenerate the file
2. Run `git diff --exit-code docs/owner-map.generated.md` to verify no changes
3. Fail if the generated file differs from what's committed

If CI fails:
- The generator was run but output doesn't match committed file
- Either the committed file is outdated (regenerate and commit)
- Or the generator changed behavior (fix the generator or update committed file)

---

## Maintenance Guidelines

### When Adding New Generated Files

If adding a new generated documentation file:

1. **Ensure Determinism**: No timestamps, dates, or other time-based content
2. **Add Smoke Test**: Create a determinism test (run generator twice, verify identical output)
3. **Update CI**: Add validation step to `.github/workflows/ci-develop.yml`
4. **Update This Policy**: Add entry to "Generated Files" section above
5. **Document Command**: Add script to `package.json` if not already present

### When Modifying Generators

1. **Run Smoke Test**: Verify determinism test still passes
2. **Regenerate Files**: Run generator and commit updated files
3. **Verify CI**: Ensure CI validation passes
4. **Update Policy**: Update this doc if behavior changes

---

## Testing Determinism

**Quick Check:**
```bash
# Run generator twice
pnpm docs:owner-map
pnpm docs:owner-map

# Check if file changed (should show no diff)
git diff docs/owner-map.generated.md
```

**Automated Test:**
```bash
# Run determinism smoke test
node scripts/generate-owner-map.test.mjs
```

---

*Last updated: Day 41*
