# PathOS Pipeline v2 Overview

Canonical operations reference:
- `scripts/README.md`

Pipeline v2 is run-based and script-authoritative. Workers emit evidence; scripts decide transitions.

## Flow Profiles
- `frontend`: visual approval + runtime validation + codex hardening + final judgment
- `backend`: runtime validation + codex hardening + final judgment
- `fullstack`: visual approval + runtime validation + codex hardening + final judgment
- `tooling`: flow-aware hardening/final-judgment path, typically without visual gate

## Authoritative Worker Lifecycle
Claude (Phase C implementation):
- `pp claude-start`
- `pp claude-check`
- `pp reconcile-claude-completion` (bounded signal repair helper when `current.md` is real but the signal is still scaffold-level)
- `pp claude-finish` (authoritative evidence consumption helper)

Codex (Phase D hardening):
- `pp codex-start`
- `pp codex-check`
- `pp reconcile-codex-completion` (bounded signal repair helper when `codexReview.md` is real but the signal is still scaffold-level)
- `pp codex-finish` (authoritative evidence consumption helper)

Codex unattended retry/recovery:
- `pp codex-start` can launch Codex through the built-in retrying CLI wrapper.
- See `docs/codex-unattended-retry.md` for retry policy, status artifacts, and log locations.

Auto-consume bridge:
- `pp auto-consume` delegates only to authoritative finish logic (`claude-finish` / `codex-finish`) when evidence is clearly valid.

## Scheduler Lifecycle
- `pp scheduler-run`: one bounded cycle
- `pp scheduler-loop`: recurring bounded cycles
- `pp scheduler-status`: lock health inspection
- `pp scheduler-unlock`: controlled stale/corrupt lock recovery

Scheduler safety:
- retries only in eligible retry states
- no bypass of visual/runtime/final human gates
- no auto final judgment or commit decision

## Notifications
- `pp notify-test` validates active notification configuration.
- Modes:
  - `none`
  - `console`
  - `file`
  - `webhook`

Notifications are deduped and state-change driven, not per-heartbeat spam.

## Service Host Layer
- `pp service-start`
- `pp service-status`

Service host is a thin wrapper around `scheduler-loop`:
- host log: `logs/pipeline-service.log`
- host state: `logs/pipeline-service.state.json`

The service host does not own pipeline transitions or retries.

## Runtime Validation and Human Gates
Human gates remain explicit:
- visual approval (`pp approve`)
- runtime validation (`pp runtime-start`, `pp runtime-done`, `pp runtime-fail`)
- final judgment boundary (`pp final-review` then ChatGPT judgment)

The operator console may trigger these bounded commands, but it does not own the transitions.

Current operator-console slice:
- worker launch can be prepared or triggered from the GUI, but worker execution is still evidenced by run-local artifacts and supervisor state
- final judgment is captured in the GUI as operator evidence, not inferred by the GUI
- commit/no-commit can be triggered from the GUI through the same bounded `pp` commands
- PR prep is generated from run-local artifacts and may be persisted as run-local artifacts for copy/use

## Design Reference Artifacts (UI Implementation Input)
For frontend/fullstack implementation guidance:
- `runs/<run-id>/artifacts/design-reference/`
- `runs/<run-id>/artifacts/design-reference/design-notes.md`

These are implementation references (mockups/screens), not runtime-validation evidence.

## Core Recovery Commands
- `pp doctor` for coherence/health checks
- `pp events` for timeline inspection
- `pp worker-status` for supervisor/retry state
- `pp scheduler-status` + `pp scheduler-unlock -IfStale` for stale lock recovery

## Canonical High-Level Flow
1. `pp start ...`
2. `pp build`
3. Implementation worker pass (Claude/Cursor route)
4. `pp implementation-done` (or bounded consume path where eligible)
5. visual/runtime gates as required
6. Codex hardening pass
7. `pp final-review`
8. ChatGPT final judgment
9. `pp commit` or `pp no-commit`
