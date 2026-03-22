# PathOS Dev Pipeline Guidance

## Purpose
This workspace contains AI workflow tooling and artifacts for PathOS development.
It is not an application repo.

## Read first
Before making changes, read:
- `..\AGENTS.md`
- `..\docs\agents\builder-agent-rules.md` or `..\docs\agents\codex-hardening-rules.md` as appropriate
- `..\docs\workflow\fast-iteration-checklist.md` or `..\docs\workflow\hardening-checklist.md` as appropriate
- `..\docs\testing\testing-standards.md` for hardening work
- `ai-pipeline\task.md`
- `repos.json`

## Working rules
- Keep diffs minimal.
- Do not rewrite unrelated files.
- Do not commit or push.
- Do not claim tests passed unless they were actually run.
- Separate verified results from assumptions.
- Prefer focused fixes over broad refactors.

## Pipeline rules
- Follow the current phase in `ai-pipeline\pipeline-state.json`.
- During implementation, use the builder docs and update `ai-pipeline\artifacts\current.md`.
- During hardening, use the Codex docs and update `ai-pipeline\artifacts\codexReview.md`.
- For frontend/UI tasks marked as requiring visual approval, do not proceed to hardening until visual approval is granted.

## Reporting
Record files changed, commands run, validation results, blockers, and assumptions.
