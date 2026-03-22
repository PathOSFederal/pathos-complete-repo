# Codex Unattended Retry

`codex-start` now launches Codex Phase D hardening through a retrying wrapper instead of a single fire-and-forget CLI call.

## How It Works
- Attempt 1 starts a fresh non-interactive Codex session with explicit unattended settings: `-a never`, `-s workspace-write`, and `--json`.
- Later attempts prefer `codex exec resume --last --json` with a follow-up instruction that tells Codex to continue from the interruption, not restart from scratch, and to inspect repo state, diffs, artifacts, and logs before taking new action.
- If a resume attempt fails immediately because there is no resumable session, or the session appears unusable before any real JSONL progress is observed, the wrapper falls back to a fresh `codex exec` run automatically.
- Success is only recorded when JSONL shows a successful completion event (`turn.completed`) later than any failure/error event.

## Logs and Status Files
- Per-run attempt root: `runs/<run-id>/artifacts/codex-exec/`
- Per-attempt raw Codex JSONL log: `runs/<run-id>/artifacts/codex-exec/attempt-###/codex-output.jsonl`
- Per-attempt stderr log: `runs/<run-id>/artifacts/codex-exec/attempt-###/codex-error.log`
- Per-attempt status file: `runs/<run-id>/artifacts/codex-exec/attempt-###/status.json`
- Latest status snapshot for GUI/operator use: `runs/<run-id>/artifacts/codex-exec/latest-status.json`

`latest-status.json` includes:
- local attempt id
- current attempt number and max attempts
- actual mode used on that attempt (`fresh` or `resume`)
- timestamps
- exit classification (`success`, `retryable_failure`, `terminal_failure`)
- last detected Codex event type
- raw log path

The wrapper also updates `state.json` and `run-context.json` fields already shown by the operator console:
- `codex_execution_last_result`
- `codex_execution_last_command`
- `codex_execution_last_attempt_at`
- `supervisor_state`
- `last_error_type`
- `last_error_message`

## Tuning
Config can come from `scripts/config/pipeline-config.json`, `pipeline-config.json`, or environment overrides.

Supported Codex adapter retry settings:
- `codex_adapter.max_attempts`
- `codex_adapter.initial_backoff_seconds`
- `codex_adapter.max_backoff_seconds`
- `codex_adapter.sandbox_mode`
- `codex_adapter.approval_policy`
- `codex_adapter.codex_executable`
- `codex_adapter.driver`

Environment equivalents:
- `PATHOS_CODEX_ADAPTER_MAX_ATTEMPTS`
- `PATHOS_CODEX_ADAPTER_INITIAL_BACKOFF_SECONDS`
- `PATHOS_CODEX_ADAPTER_MAX_BACKOFF_SECONDS`
- `PATHOS_CODEX_ADAPTER_SANDBOX_MODE`
- `PATHOS_CODEX_ADAPTER_APPROVAL_POLICY`
- `PATHOS_CODEX_ADAPTER_EXECUTABLE`
- `PATHOS_CODEX_ADAPTER_DRIVER`

Default posture:
- sandbox: `workspace-write`
- approval: `never`
- attempts: `3`
- initial backoff: `5s`
- backoff cap: `60s`

## Assumptions and Limits
- Failure classification is intentionally conservative and partly heuristic. Transient network/stream/provider failures are inferred from CLI output text because Codex does not guarantee a stable transient-error taxonomy in JSONL.
- Resume uses `--last`, so it assumes the most recent non-interactive Codex session in the target repo is the one created by the current hardening run.
- The wrapper does not auto-finish Phase D. Script authority is unchanged: `codex-check` / `codex-finish` still decide whether the evidence counts.
