# PathOS Repo Contract

This file defines repository-wide execution constraints and document precedence for AI-assisted work in this repository.

## Core Rules

- Work on the current branch unless a task explicitly says otherwise.
- Treat `develop` as the normal integration baseline and `main` as the protected production baseline unless the active repo says differently.
- Do not commit, push, merge, or rewrite git history unless the user explicitly asks.
- Keep changes scoped, reviewable, and directly related to the task.
- Prefer root-cause fixes over quick hacks.
- Do not fold unrelated cleanup or refactors into the same task.
- Read the active task file before editing.
- Separate verified results from assumptions in every handoff.

## Precedence

Use this order when instructions overlap:

1. Explicit user request
2. Active task file
3. Repo-local app guidance
4. Root implementation guidance
5. Workflow and process docs

Hard repo constraints remain mandatory at every level.
Soft guidance must not override explicit task intent.
Generic guidance must not be used to avoid structural UI correction, mock parity, or other task-specific implementation work that is explicitly requested inside the targeted surface.

## Operating Sequence

1. Read `tasks/<task>.md` first when one exists for the work.
2. Use the fast-iteration workflow while the feature is being built and refined.
3. Declare an explicit iteration freeze once the requested implementation is functionally correct for the task.
4. Hand off to Codex hardening only after iteration freeze.
5. Do final commit and push steps only if the user explicitly asks.

## Canonical Instruction Files

Use these files instead of repeating long instruction blocks in prompts.

### Builder execution stack

Read:
- `AGENTS.md`
- `docs/agents/builder-agent-rules.md`
- `docs/workflow/fast-iteration-checklist.md`
- `tasks/<task>.md`
- applicable repo-local guidance for the active app or package

Use this set for implementation work during fast iteration.

### Codex hardening stack

Read:
- `AGENTS.md`
- `docs/agents/codex-hardening-rules.md`
- `docs/workflow/hardening-checklist.md`
- `docs/testing/testing-standards.md`
- `tasks/<task>.md`
- applicable repo-local guidance for the active app or package

Use this set only after iteration freeze, when implementation is already in place and the goal is validation, hardening, testing, and merge preparation.

## Document Roles

- `docs/agents/builder-agent-rules.md`: root execution guidance for implementation work
- `docs/agents/codex-hardening-rules.md`: post-freeze hardening guidance
- `docs/workflow/fast-iteration-checklist.md`: builder-phase workflow expectations
- `docs/workflow/hardening-checklist.md`: post-freeze workflow expectations
- `docs/testing/testing-standards.md`: canonical validation and test doctrine
- `docs/testing/playwright-guidelines.md`: focused Playwright guidance
- `docs/change-briefs/_template.md`: plain-English change brief template
- `tasks/_template.md`: task contract template

## Prompting Rule

Do not inline entire policy blocks into every prompt. Point the agent to the canonical files above and keep the task prompt focused on the work to be done.
