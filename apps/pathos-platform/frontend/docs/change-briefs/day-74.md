# Day 74 — Job Search Parity and Polish Pass

## What changed visually

- **Tile order standardized.** The key decision tiles at the top of the Job Search detail panel now appear in the same order as Saved Jobs: Salary, Grade & Promotion, Work Mode, Deadline.

- **Agency moved to header.** Agency is no longer a standalone tile in the decision strip. It now appears only in the fixed header area under the job title — the same treatment Saved Jobs uses.

- **Less text clutter.** Helper one-liners removed from the match section. Career readiness CTA shortened to a compact "Fix [gap name]" button. "Explain this match" tightened to "Explain Match."

- **Shared Match Breakdown Table.** Extracted the match-breakdown dimension table into a shared component (`MatchBreakdownTable.tsx`) used by both Job Search and Saved Jobs. Both screens now render the same interactive rows with hover, focus-visible, tooltip, chevron, and consistent column alignment. Header row now includes padding and chevron-column spacer for precise alignment.

- **Redundant summary stats removed.** Both screens had a summary stat grid (Readiness, Weighted Fit/Job Match, Limiting Factor/Primary Blocker) immediately under the "Match Overview" heading. These repeated values already visible in the header badges. The grid has been removed on both pages and replaced with a compact single-line advisory that preserves the useful recommendation guidance ("Top action:" on Saved Jobs, primary blocker message on Job Search) without restating headline metrics.

- **Saved Jobs breakdown rows are now interactive.** Clicking a dimension row in Saved Jobs now publishes an explanation context to PathAdvisor — the same interaction pattern already present in Job Search. Previously, Saved Jobs rows were visual-only with no downstream action.

## How Job Search now aligns better with Saved Jobs

- Same tile scan order: Salary → Grade & Promotion → Work Mode → Deadline.
- Same identity-first header pattern: title + agency above, decision tiles below.
- Same Match Breakdown column widths and alignment (including header padding and chevron spacer).
- Same Match Breakdown interaction model: hover, focus-visible ring, tooltip, chevron on hover.
- Same compact advisory treatment replacing redundant summary stat grids.
- Same PathAdvisor dimension-explanation behavior when clicking breakdown rows.
- Same tile grid minimum width (150px per tile).
- Same restrained text density.

## What was removed and why it is cleaner

The summary stat grids (3 cells on Job Search, 4 cells on Saved Jobs) restated Readiness and match scores that are already prominently displayed in the header badges. Removing them eliminates redundancy, reduces visual noise, and lets the Match Breakdown table — which provides the actual analytical substance — move higher in the viewport. The actionable recommendation content (primary blocker / top action) was preserved as a compact advisory line above the breakdown table.

## What remains intentionally different

- **Tab naming:** Job Search uses "Job Overview" with 9 sub-sections including PathOS Brief. Saved Jobs uses 8 standard announcement sections.
- **Match intelligence actions:** Job Search retains search-specific actions like "Save + Start Tailoring," "Fix [gap]," and "Explain Match." Saved Jobs uses its own action model.
- **Dimension-explain payload depth:** Job Search uses the full `buildDimensionBriefingPayload` with evidence-found/missing detail. Saved Jobs constructs a lighter payload from local `MatchDimension` data. A follow-up could enrich the Saved Jobs payload.
- **Advisory wording:** Job Search renders the primary blocker directly. Saved Jobs prefixes with "Top action:" — both surface equivalent guidance tailored to each screen's vocabulary.

## Validation performed

- 44 JobSearchScreen tests passed
- 10 SavedJobsScreen tests passed (no regression)
- TypeScript: clean (`npx tsc --noEmit` exit 0)
- Linter: clean
- No logic, persistence, or routing changes
