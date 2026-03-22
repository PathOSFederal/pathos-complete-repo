# PathOS Frontend Execution Guidance

This file adds repo-local execution guidance for `apps/pathos-platform/frontend`.
It does not redefine task intent.
Apply it using the precedence model from the root `AGENTS.md`.

## Working Style

- Use the two-lane workflow in this repo:
  1. Fast iteration first for bounded implementation work
  2. Hardening after explicit iteration freeze
- Start with `docs/workflow/fast-iteration-checklist.md`.
- Move to `docs/workflow/hardening-checklist.md` only after the implementation is behaving correctly for the task.

## Hard Constraints

- Prefer working on the current feature branch unless the user asks otherwise.
- Keep branch scope aligned to one bounded task.
- Do not commit or push unless the user explicitly asks.
- Keep changes directly related to the task.
- Avoid unrelated refactors, renames, or cleanup.
- Respect task definitions in `tasks/` when they exist.

## Local Execution Guidance

- Reuse existing repo conventions before introducing new patterns.
- Prefer fixing root causes over one-off hacks.
- For frontend implementation, visible interaction states are a default requirement for interactive surfaces. Include clear hover, focus-visible, active, and selected or current feedback where relevant. See the Interaction-State Standard in `docs/ai/cursor-house-rules.md` for the full control list and consistency rules.
- Preserve routing, persistence, and shared shell behavior unless the task explicitly requires changes there.
- Existing screen structure may be reorganized inside the targeted surface when the task explicitly requires mock parity, layout correction, or stronger workflow hierarchy.

## Validation And Reporting

- Report files changed.
- Report validation performed and any skipped checks.
- Report known risks, tradeoffs, and follow-ups.
- If hardening is requested or merge readiness matters, run the hardening lane before handing off.
- Keep workflow output repo-native and lightweight unless the active task requires more.
