# Day 10 – Job Seeker Intelligence Layer v1

## Objective

Implement frontend-only rules-based signals to provide job seeker intelligence. This includes Locality Power Score, Career Trajectory Preview, Benefit Value Signal, and Retirement Impact Tier displays.

## Key Tasks

- Implement Locality Power Score display component
- Create Career Trajectory Preview visualization
- Build Benefit Value Signal indicator
- Implement Retirement Impact Tier display
- Wire intelligence signals to job listing cards
- Ensure signals display mock/computed values appropriately
- Document signal definitions and display logic

## Use of GPT Assistants

Representative tasks included:

- Designing signal visualization components
- Generating display logic for tiered indicators
- Reviewing information hierarchy for signal presentation

## Completion Criteria

- [ ] Locality Power Score displays on relevant job cards
- [ ] Career Trajectory Preview shows progression indicators
- [ ] Benefit Value Signal indicates benefit quality tier
- [ ] Retirement Impact Tier displays retirement implications
- [ ] All signals are wired to job listing components
- [ ] Signal values come from API layer (mock or real)
- [ ] Signal definitions documented for user understanding

## Validation Commands

```bash
# Run validation suite
pnpm typecheck
pnpm lint
pnpm build
pnpm test

# Manual testing steps:
# 1. Navigate to job search
# 2. Verify intelligence signals appear on job cards
# 3. Check that signal values vary appropriately
# 4. Verify tooltips or help text explain each signal
# 5. Test signal display on mobile viewport
```

## Notes and Decisions

- Intelligence signals are computed by backend (or mocked for now)
- Frontend displays signals but does not calculate them
- This maintains separation: deterministic logic in FastAPI repo
- Signals should be visually distinct and easy to scan
- Consider color-coding for quick tier identification
- Accessibility: ensure signals are not color-only (use icons or text)
- These signals help job seekers make informed decisions quickly

