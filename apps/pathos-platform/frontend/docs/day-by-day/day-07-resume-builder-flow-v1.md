# Day 7 – Resume Builder Flow v1

## Objective

Implement the resume builder step-by-step flow, export and preview UX, tailoring entry points, and resolve modal layout issues. Ensure persistence behavior is correct where implemented.

## Key Tasks

- Build resume builder multi-step flow
- Implement each step's form fields and validation
- Create export functionality (PDF or other formats)
- Build preview UX for resume content
- Add tailoring entry points (customize resume for specific jobs)
- Fix modal layout issues affecting usability
- Ensure resume data persists correctly (local-first)

## Use of GPT Assistants

Representative tasks included:

- Designing multi-step form architecture
- Generating form validation patterns
- Reviewing resume export strategies

## Completion Criteria

- [ ] Resume builder flow navigable through all steps
- [ ] Each step collects and validates appropriate data
- [ ] Export functionality produces downloadable resume
- [ ] Preview displays resume content accurately
- [ ] Tailoring entry points accessible from relevant locations
- [ ] Modal layouts render correctly without overflow issues
- [ ] Resume data persists in local storage across sessions

## Validation Commands

```bash
# Run validation suite
pnpm typecheck
pnpm lint
pnpm build
pnpm test

# Manual testing steps:
# 1. Navigate to Resume Builder
# 2. Complete each step of the flow
# 3. Verify data persists when navigating back
# 4. Preview the resume
# 5. Export the resume
# 6. Refresh page - verify data persists
# 7. Test tailoring entry points from job listings
```

## Notes and Decisions

- Resume builder follows local-first pattern; data saves to browser before any sync
- Multi-step flow should support navigation forward and backward
- Export format decisions documented (PDF generation approach)
- Tailoring connects resume builder to job search features
- Modal z-index and overflow issues must be resolved for usability
- Consider autosave behavior for form fields to prevent data loss

