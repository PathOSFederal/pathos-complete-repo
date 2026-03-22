# Fast Iteration Checklist

Use this lane for rapid UI/fullstack implementation before merge-readiness work begins.

## Intent
- Work one bounded task at a time.
- Use one primary AI builder to reduce overlap and conflicting edits.
- Keep diffs small enough to review quickly.
- Optimize for getting the behavior right before hardening.

## Checklist
- [ ] Start from a clearly bounded task file in `tasks/` or create one from `tasks/_template.md`.
- [ ] Confirm the objective, scope, and constraints before editing.
- [ ] Use one primary AI builder for implementation on this task.
- [ ] Limit changes to the smallest set of files needed.
- [ ] Prefer root-cause fixes over temporary patches when practical.
- [ ] Avoid broad refactors, cleanup passes, or unrelated fixes during iteration.
- [ ] Run only the fastest validation needed to check the change.
- [ ] Review the result visually and/or functionally in the app.
- [ ] Capture what is still wrong or incomplete in plain language.
- [ ] Repeat implementation and review until the task behaves correctly.

## Iteration Loop
1. Pick one bounded task.
2. Make the smallest useful change.
3. Review visually/functionally.
4. Adjust based on what you observed.
5. Repeat until the result is correct.

## Iteration Freeze
Declare an explicit iteration freeze when:
- the core behavior is correct,
- the UI/functionality has been reviewed,
- no further exploratory changes are needed, and
- the task is ready for hardening.

At that point, stop adding new implementation scope and move to `docs/workflow/hardening-checklist.md`.
