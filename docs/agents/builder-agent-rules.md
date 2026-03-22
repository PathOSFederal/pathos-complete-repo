# Builder Execution Rules

Use this file during fast iteration for implementation work.

## Purpose

Apply the task intent cleanly inside the approved scope while preserving repo constraints.

## Execution Rules

- Read `AGENTS.md`, this file, `docs/workflow/fast-iteration-checklist.md`, the active task file, and applicable repo-local guidance before editing.
- Follow the precedence order defined in `AGENTS.md`.
- Implement the requested task completely within the targeted surface.
- Keep changes reviewable, scoped, and directly related to the task.
- Fix the actual cause of the issue when practical.
- Leave the code ready for review and later hardening.

## Hard Constraints

- Do not expand scope beyond the task.
- Do not fold unrelated refactors, renames, formatting churn, or file moves into the same run.
- Preserve working behavior outside the task scope.
- Keep public interfaces stable unless the task explicitly changes them.
- Follow repo-local conventions and hard repo constraints.
- Do not commit or push unless explicitly asked.

## Execution Preferences

These are execution preferences, not task-overriding rules:

- Match existing naming, file organization, and patterns unless the task requires a different approach.
- Prefer simple, explicit code over clever abstractions.
- Avoid speculative generalization.
- Keep the diff proportional to the work required by the task.
- Prefer focused changes over incidental churn.

If the task explicitly requires structural UI correction, mock parity, or stronger visual hierarchy inside a targeted surface, make those changes directly. Do not stop at styling-only adjustments just because they are smaller.

## Code Clarity Expectations

- Use consistent types, data shapes, and state boundaries.
- Add comments where they materially improve maintainability.
- If the repo or task expects teaching-level comments or overcommenting, apply that to the touched files.
- Comments should explain purpose, fit, and behavior. Do not add comments that only restate syntax.

## Surface-Specific Guidance

### Frontend work

- Preserve routing, shell behavior, hydration boundaries, and persistence behavior unless the task explicitly requires changes there.
- Treat existing layout and structure as reusable context, not as a blanket veto against targeted page restructuring.
- When a task requires parity, hierarchy correction, or workflow restructuring inside a page or component surface, make the required structural changes while keeping unaffected surfaces stable.

### Backend work

- Keep API contracts, validation rules, and persistence behavior stable unless the task changes them.
- Prefer targeted service, handler, or schema updates over cross-cutting rewrites.
- Protect existing consumers from avoidable breaking changes.

### Fullstack work

- Keep frontend and backend changes tightly coordinated.
- Change only the layers needed for the task.
- Call out any contract assumptions that still need hardening validation.

## Fast Iteration Rules

- Focus on one bounded task at a time.
- Iterate rapidly with short review loops.
- Stop when the requested implementation is functionally correct for the task and ready for freeze.
- Hand off known risks, assumptions, and validation needs clearly.

## What To Report Back

At the end of a builder run, report:
- summary of implementation
- files changed
- validation performed
- blockers or assumptions
- risks or follow-up items for hardening

## Builder Stop Line

Builder work does not replace the hardening pass.

Do not use the builder phase to:
- expand scope beyond the task
- write broad regression plans unrelated to the change
- do merge-prep paperwork as a substitute for implementation
- redesign unrelated working code without task justification
- commit or push unless explicitly asked

Once the task implementation is correct, freeze iteration and hand off to Codex using the hardening docs.
