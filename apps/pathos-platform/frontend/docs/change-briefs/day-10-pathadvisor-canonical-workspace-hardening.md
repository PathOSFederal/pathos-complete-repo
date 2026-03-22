# PathAdvisor Canonical Workspace Hardening

## What changed
- Hardened the shared `PathAdvisorCard` smoke tests to match the tabbed canonical workspace.
- Added regression coverage that preserves a single trash control in the PathAdvisor header when screen context entries exist.
- Corrected the Job Search screen override to use the shared `briefingHelperText` field so the canonical rail helper copy actually renders in the Guidance tab.

## Why it changed
- The approved UI revision removed the duplicate trash-can control from Job Search and Saved Jobs by consolidating clear-context access into the settings menu.
- The shared smoke test still expected conversation messages to render in the default view, which no longer matches the canonical Guidance/Explain/Actions/History workspace.

## What the user will notice
- Job Search and Saved Jobs keep one clear/trash control in the PathAdvisor header instead of showing two adjacent trash icons.
- The PathAdvisor rail continues to open on the Guidance tab by default; conversation history remains available under the History tab.

## Validation performed
- Typecheck: `pnpm exec tsc --noEmit`
- Build: `pnpm build`
- Tests: `pnpm vitest packages/ui/src/shell/PathAdvisorCard.test.tsx packages/ui/src/screens/JobSearchScreen.test.tsx packages/ui/src/screens/SavedJobsScreen.test.tsx --run`
- Manual/runtime validation: Not run in browser during this hardening pass.

## Hardening follow-up
- Removed the stale `helperParagraph` override field from the shared store contract because it no longer matched the canonical card API and left Job Search helper copy disconnected from the rail.

## Known risks / follow-ups
- The Explain and Actions tabs still render placeholder content in the shared card; that is unchanged from the implementation pass and should be reviewed separately if richer behavior is expected.
- This hardening pass focused on the approved duplicate-trash revision scope and shared regression coverage only.
