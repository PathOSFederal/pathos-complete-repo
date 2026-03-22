# PathOS Pipeline v2 (Canonical Workflow)

This document is the canonical operational reference for Pipeline v2 in `dev-pipeline`.

Core principle:
- Scripts define the process.
- Execution engines operate inside the process.
- Scripts verify whether the work counts.

## Tool Charter
- ChatGPT: planner, architect, spec lock, final judge
- Claude Code: default Phase C implementation engine
- Cursor: tiny tweak / repair / local refinement loop
- Codex: independent hardening reviewer
- v0: UI scaffolding / layout ideation
- Scripts: process authority for state transitions, routing, validation, and gating

## Quick Start
```powershell
cd C:\dev\PathOS\dev-pipeline
.\pp.ps1 start -TaskId "my-run-id" -Repo frontend -RequiresVisualApproval
.\pp.ps1 build
.\pp.ps1 resume
```

## Command Surface

### `pp help`
- What: Show wrapper usage.
- When: You need command syntax.
- Next: Run a listed command.

### `pp start -TaskId <run-id> -Repo <frontend|backend|desktop_legacy> [-RequiresVisualApproval]`
- What: Create a new isolated run under `runs/<run-id>/`.
- When: Starting a new pipeline effort.
- Preconditions: `run-id` must be unique.
- Next: `pp build`.

### `pp current`
- What: Show active run dashboard.
- When: Confirm active run context.
- Next: `pp resume` or phase-appropriate command.

### `pp runs`
- What: List known runs and active marker.
- When: You need to pick/switch runs.
- Next: `pp use <run-id>`.

### `pp use <run-id>`
- What: Set active run.
- When: Working across multiple runs.
- Preconditions: Run folder + state/context must exist.
- Next: `pp status` or `pp resume`.

### `pp archive-runs [-AllRuns|-RunId <run-id>]`
- What: Archive historical runs for clean-slate operator-console testing.
- When: You want the active run set to be empty or near-empty without deleting history.
- Preconditions: pass either `-AllRuns` or `-RunId <run-id>`.
- Behavior:
  - moves run folders into `archived-runs/<timestamp>/<run-id>/`
  - marks matching `runs/index.json` entries as archived
  - repairs or clears `runs/current-run.txt` if it pointed to an archived run
- Restore:
  - move the archived run folder back under `runs/<run-id>/`
  - set `archived=false` in `runs/index.json`
  - run `pp use <run-id>`

### `pp status`
- What: Show active run dashboard + recent events.
- When: You need current phase/status and artifact paths.
- Next: phase-appropriate command.

### `pp resume`
- What: Authoritative “what do I do now?” guidance.
- When: Unsure of next action.
- Outputs: waiting actor, next prompt/artifact, recommended command(s), mismatch warnings.
- Next: Follow listed commands.

### `pp launch -Repo <frontend|backend|desktop_legacy> [-AutoLaunch]`
- What: Open terminal in target repo (frontend autolaunch optional).
- When: Starting implementation/hardening work in repo context.
- Next: execute engine pass and update run-local artifacts.

### `pp build`
- What: Prepare Phase C implementation handoff and generate/refresh `builder-prompt.md`.
- When: Spec is locked or implementation loop is re-entered.
- Preconditions: Active run with repo configured.
- Next: implementation engine pass, then `pp implementation-done`.

### `pp implementation-done`
- What: Script-authoritative implementation completion transition.
- When: Implementation artifacts are updated and ready to advance.
- Preconditions:
  - valid implementation state (`ready_for_claude`, `ready_for_cursor`, etc.)
  - `artifacts/task.md` exists
  - `artifacts/current.md` exists and is not placeholder-only
- Transition:
  - visual-gated: `C/awaiting_visual_approval`
  - non-visual: `D/ready_for_codex` (+ codex hardening prompt refresh)
- Next:
  - visual-gated: `pp approve` or `pp revise -Type implementation ...`
  - non-visual: codex hardening pass, then `pp final-review`

### `pp approve`
- What: Record visual approval and route to Codex hardening.
- When: Run is `awaiting_visual_approval`.
- Preconditions: `requires_visual_approval=true`.
- Next: codex hardening, then `pp final-review`.

### `pp revise -Type <implementation|spec> -Notes "<reason>"`
- What: Request loop-back revision.
- When: work is not approved.
- Behavior:
  - `implementation`: repair pass (frontend often routes to Cursor)
  - `spec`: returns to spec revision state
- Next: `pp build` (then implement again).

### `pp final-review`
- What: Unified final-review preparation under `pp`.
- When: Late-stage hardening is complete/ready.
- Preconditions: late-stage status (`ready_for_codex|hardening|...`) and required artifacts.
- Transition: `E/ready_for_final_judgment`, `execution_engine=chatgpt`.
- Outputs: refreshed `prompts/final-review-prompt.md`.
- Next: bring packet to ChatGPT for final judgment, then `pp commit` or `pp no-commit`.

Operator-console note:
- the GUI may also capture the human final judgment into a run-local artifact before triggering `pp commit` / `pp no-commit`
- that capture does not replace the authoritative script transition

### `pp commit -Message "<msg>"`
- What: Commit run changes in target repo.
- When: Final judgment says merge-ready.
- Preconditions: final-judgment boundary reached; repo set.
- Next: run closes with `merge_ready` + committed decision.

Operator-console note:
- GUI commit requires a visible commit message field and shows the exact `pp commit` command/result

### `pp no-commit`
- What: Close run without commit.
- When: Final judgment says do not merge yet (or defer).
- Next: run closes with `merge_ready` + not-committed decision.

Operator-console note:
- GUI no-commit remains bounded to the same authoritative command; it does not infer the decision itself

### `pp events [-Tail <n>] [-RunId <run-id>]`
- What: Show run event history from `runs/<run-id>/events.log`.
- When: You need progress chronology.
- Default: active run, tail 5.

### `pp doctor [-RunId <run-id>]`
- What: Health-check run integrity, state coherence, and required files.
- When: Before/after transitions or when behavior seems inconsistent.
- Output: `HEALTHY`, `HEALTHY WITH WARNINGS`, or `UNHEALTHY` with fixes.

### `pp notify-test`
- What: Validate notification config and emit a test notification for the active run.
- When: Verifying notification delivery and mode configuration.
- Notes: respects run-local logging and configured mode (`none|console|file`).

### `pp scheduler-run [-AllRuns] [-RunId <run-id>] [-DryRun] [-ConsumeCompletions]`
- What: Run one bounded scheduler/supervisor cycle.
- When: Let pipeline act on due retry timing without manual babysitting.
- Behavior:
  - default scope: active run
  - `-AllRuns`: iterate indexed runs
  - `-RunId`: target one run explicitly
  - `-DryRun`: report what would be attempted
  - `-ConsumeCompletions`: attempt bounded Claude/Codex completion evidence consumption before retry-start checks
- Safety:
  - retries only in scheduler-eligible retry states
  - completion auto-consume reuses `claude-finish`/`codex-finish` authoritative logic
  - skips human gates (`awaiting_visual_approval`, runtime gates, final judgment states)
  - skips `worker_blocked`
  - does not auto-run `implementation-done`, visual approval, runtime validation, `final-review`, or final judgment/commit commands

### `pp scheduler-loop [-AllRuns] [-RunId <run-id>] [-IntervalSeconds <n>] [-MaxCycles <n>] [-MaxMinutes <n>] [-ConsumeCompletions] [-DryRun]`
- What: Run recurring bounded scheduler cycles with safe stop conditions.
- When: You want unattended autonomous progress between human gates.
- Behavior:
  - each cycle reuses the authoritative `scheduler-run` command
  - default scope: active run
  - supports `-RunId` or `-AllRuns`
  - supports bounded controls (`-IntervalSeconds`, `-MaxCycles`, `-MaxMinutes`)
  - supports `-ConsumeCompletions` and `-DryRun`
- Stop conditions:
  - max cycles reached (default `20`)
  - max minutes reached (when provided)
  - single-run scope reaches human gate status
  - single-run scope reaches `worker_blocked`
  - explicit interruption/error
- Locking:
  - lock file: `runs/scheduler-loop.lock.json`
  - second concurrent loop invocation is rejected while lock exists
  - lock is removed on loop exit

### `pp scheduler-status [-Json]`
- What: Inspect scheduler-loop lock health.
- Reports:
  - lock existence/path
  - active/stale/invalid/not-present status
  - pid/scope/run-id/all-runs and loop limits
  - heartbeat/cycle timestamps and age values
- Stale policy:
  - default stale threshold is 300s based on `last_heartbeat_at` (or lock age fallback)
  - optional override: `PATHOS_SCHEDULER_LOCK_STALE_SECONDS`

### `pp scheduler-unlock [-IfStale] [-Force]`
- What: Controlled stale-lock recovery.
- Behavior:
  - default: removes only stale/invalid lock states
  - refuses healthy active lock removal
  - `-Force`: explicit override to remove any lock
- Safety:
  - lock file is moved to a timestamped `.removed.<timestamp>.json` backup

### `pp auto-consume [-RunId <run-id>] [-DryRun]`
- What: Inspect bounded worker completion evidence and consume it only when clearly valid.
- When: You want to close the seam between `claude-check`/`codex-check` and finish transitions.
- Behavior:
  - detects Claude vs Codex completion path from run phase/status/engine
  - validates completion artifacts + placeholder checks + supervisor coherence
  - delegates only to authoritative finish commands (`claude-finish` or `codex-finish`)
  - prints explicit skip reasons when evidence is not eligible
- Safety:
  - does not bypass visual/runtime/final human gates
  - does not auto-run final-review/commit paths

### `pp service-start [-AllRuns|-RunId <run-id>] [-IntervalSeconds <n>] [-MaxCycles <n>] [-MaxMinutes <n>] [-ConsumeCompletions] [-DryRun]`
- What: Start the thin service-host wrapper in the current session.
- When: You want service-style operation without registering a Windows service yet.
- Behavior:
  - runs `scripts/run-pipeline-service.ps1`
  - host wrapper logs startup/config/launch/exit at host level
  - host wrapper delegates loop behavior to authoritative `scheduler-loop`
- Notes:
  - `service-start` is a wrapper; pipeline authority stays in `scheduler-loop` and existing commands.
  - if interval/cycle/minute flags are omitted, host config/env/defaults are used.

### `pp service-status`
- What: Inspect service-host layer status.
- Reports:
  - host state file presence and parsed status
  - effective host log path and recent log lines
  - scheduler lock health snapshot
- Use with:
  - `pp scheduler-status`
  - `pp scheduler-unlock -IfStale`
  - `pp doctor`

### Codex unattended retry
- `pp codex-start` can launch Codex through a retrying unattended wrapper when the built-in Codex adapter driver is enabled.
- Attempt 1 uses a fresh `codex exec --json` run with explicit `-a never` and `-s workspace-write`.
- Retry attempts prefer `codex exec resume --last --json` with a continue instruction that tells Codex not to restart from scratch and to inspect git diff, generated artifacts, and repo state first.
- Resume failures that indicate no usable session fall back to a fresh run automatically.
- Run-local attempt artifacts live under `runs/<run-id>/artifacts/codex-exec/`.
- `runs/<run-id>/artifacts/codex-exec/latest-status.json` is the operator-facing machine-readable snapshot.
- See `docs/codex-unattended-retry.md` for details and tuning.

## Service Host Wrapper

### Host Script
- Script: `scripts/run-pipeline-service.ps1`
- Purpose: thin service-oriented wrapper around authoritative scheduler loop behavior.
- Responsibilities:
  - resolve and set workspace working directory
  - load host config (defaults/config/env/params)
  - write host-level logs
  - invoke `scheduler-loop`
  - record host state and exit outcome
- Non-responsibilities:
  - does not implement retry/state-machine logic
  - does not mutate pipeline state directly
  - does not bypass human gates or finish transitions

### Host Configuration Model
- Precedence: defaults -> config file -> environment -> script parameters.
- Config files (first match):
  - `scripts/config/pipeline-config.json`
  - `pipeline-config.json`
- Config section keys:
  - `service_host.interval_seconds`
  - `service_host.max_cycles`
  - `service_host.max_minutes`
  - `service_host.all_runs`
  - `service_host.run_id`
  - `service_host.consume_completions`
  - `service_host.dry_run`
  - `service_host.log_path`
- Environment overrides:
  - `PATHOS_SERVICE_INTERVAL_SECONDS`
  - `PATHOS_SERVICE_MAX_CYCLES`
  - `PATHOS_SERVICE_MAX_MINUTES`
  - `PATHOS_SERVICE_ALL_RUNS`
  - `PATHOS_SERVICE_RUN_ID`
  - `PATHOS_SERVICE_CONSUME_COMPLETIONS`
  - `PATHOS_SERVICE_DRY_RUN`
  - `PATHOS_SERVICE_LOG_PATH`

### Host Logs and State
- Host log (default): `logs/pipeline-service.log`
- Host state file: `logs/pipeline-service.state.json`
- Host log entries include:
  - host started
  - effective config
  - scheduler-loop launch
  - scheduler-loop exit + code
  - host interruption/failure events

### Manual Test Flow
```powershell
cd C:\dev\PathOS\dev-pipeline
.\pp.ps1 service-start -IntervalSeconds 30 -MaxCycles 3 -ConsumeCompletions
.\pp.ps1 service-status
.\pp.ps1 scheduler-status
```

### Shutdown and Recovery Notes
- Graceful stop:
  - stop the running host process (Ctrl+C in interactive mode).
  - scheduler-loop cleanup path should release lock on normal exit.
- Forced termination:
  - stale lock may remain; this is expected for hard kills.
  - inspect and recover with:
    - `.\pp.ps1 scheduler-status`
    - `.\pp.ps1 scheduler-unlock -IfStale`

### Windows Service Registration Guidance (Docs-Only)
- Recommended: validate with `pp service-start` first, then register externally.
- Example with Task Scheduler:
  - run at startup/logon: `powershell.exe -ExecutionPolicy Bypass -File C:\dev\PathOS\dev-pipeline\scripts\run-pipeline-service.ps1`
- Example with NSSM (if used in your environment):
  - point NSSM application to `powershell.exe`
  - arguments:
    - `-ExecutionPolicy Bypass -File C:\dev\PathOS\dev-pipeline\scripts\run-pipeline-service.ps1`
- Keep service wrapper thin; do not move pipeline logic out of `pipeline.ps1`.

## Notification Configuration
- Environment variables:
  - `PATHOS_NOTIFY_ENABLED=true|false`
  - `PATHOS_NOTIFY_MODE=none|console|file|webhook`
  - `PATHOS_NOTIFY_TARGET=<path-or-url>` (central file path for `file`, webhook URL for `webhook`)
  - `PATHOS_NOTIFY_WEBHOOK_TIMEOUT_SECONDS=<1..120>` (optional, default 10)
- Optional config files (first match wins):
  - `scripts/config/pipeline-config.json`
  - `pipeline-config.json`
- Supported baseline modes:
  - `none`: disabled
  - `console`: emits structured notification to terminal and run-local `notifications.log`
  - `file`: emits structured notification to run-local `notifications.log` and central log (default `notifications.log` at repo root unless target provided)
  - `webhook`: emits structured JSON payload to configured URL; failures are logged as warning events and do not break pipeline transitions

Webhook payload fields:
- `timestamp`
- `run_id`
- `flow_type`
- `phase`
- `status`
- `supervisor_state`
- `severity`
- `reason`
- `message`
- `next_action`

## Canonical Lifecycle

### Happy path (frontend/UI)
1. `pp start -TaskId <id> -Repo frontend -RequiresVisualApproval`
2. `pp build`
3. Implementation engine pass (usually Claude) updates repo + `artifacts/current.md`
4. `pp implementation-done`
5. `pp approve` (visual gate passes)
6. Codex hardening pass updates `artifacts/codexReview.md`
7. `pp final-review`
8. ChatGPT final judgment
9. `pp commit -Message "<msg>"` or `pp no-commit`

### Repair path
1. `pp revise -Type implementation -Notes "<feedback>"`
2. `pp build`
3. Repair pass (frontend commonly Cursor)
4. `pp implementation-done`
5. `pp approve`
6. Continue hardening/final-review flow

## Run-Based Storage (Authoritative)
- `runs/index.json`: run registry summary
- `runs/current-run.txt`: active run id
- `runs/<run-id>/state.json`: authoritative phase/status/routing flags
- `runs/<run-id>/run-context.json`: operator/context metadata and pending action
- `runs/<run-id>/artifacts/`: task/current/codex/visual/final packet files
  - includes `artifacts/design-reference/` for implementation-input mockup references
  - includes `artifacts/design-reference/design-notes.md` for primary/flexible UI design constraints
- `runs/<run-id>/prompts/`: builder/codex-hardening/final-review prompts
- `runs/<run-id>/events.log`: append-only run event history (NDJSON)
- `archived-runs/<timestamp>/<run-id>/`: reversible archive location for historical runs

Runs are isolated. Active run selection is explicit via `pp use`.

## Routing Defaults
- Frontend default implementation: Claude (`ready_for_claude`)
- Frontend repair/tiny tweak loop: Cursor (`ready_for_cursor`)
- Hardening: Codex (`ready_for_codex|hardening`)
- Final judgment: ChatGPT (`ready_for_final_judgment`)

Engines do not self-advance the pipeline. Scripts do.

## Observability and Health
- `pp resume`: what do I do now?
- `pp events`: what happened recently?
- `pp doctor`: is this run healthy?

Use these three together before changing direction.

## Common Recovery Patterns
- No active run selected:
  - `pp runs`
  - `pp use <run-id>`
- Wrong run selected:
  - `pp runs`
  - `pp use <correct-run-id>`
- Missing prompt/artifact:
  - run `pp doctor`
  - follow suggested command (often `pp build`, `pp implementation-done`, or `pp final-review`)
- `implementation-done` fails for `current.md`:
  - update `runs/<run-id>/artifacts/current.md` with concrete implementation notes
  - re-run `pp implementation-done`
- Visual approval required:
  - run `pp approve` after user approval
  - otherwise `pp revise -Type implementation -Notes "<reason>"`
- Doctor warnings/errors:
  - resolve `ERROR` items first
  - re-run `pp doctor`
- Stale scheduler lock:
  - `pp scheduler-status`
  - `pp scheduler-unlock -IfStale`
- Blocked worker:
  - inspect with `pp worker-status`
  - restart with `pp worker-start`
  - continue with `pp scheduler-run` (or `pp scheduler-loop`)
- Degraded worker:
  - review `next_retry_at` and retry cadence in `pp worker-status`
  - run `pp scheduler-run` for bounded retry
  - escalate manually if repeated failures persist
- Index/current-run drift:
  - `pp use <run-id>` to reselect
  - `pp status`, then `pp doctor`

## Design Reference Artifacts
Purpose:
- Provide implementation-input UI references (mockups/screenshots/exported design images).
- These are not runtime-validation proof artifacts.

Paths:
- `runs/<run-id>/artifacts/design-reference/`
- `runs/<run-id>/artifacts/design-reference/design-notes.md`

Behavior:
- Run scaffold always creates the folder and notes template.
- Pipeline state tracks:
  - `has_design_reference`
  - `design_reference_path`
- Builder prompt and Claude handoff surface design-reference context for frontend/fullstack flows.
- Backend/tooling flows are not forced to provide design references.

## Operator Runbook (Compact)
Normal unattended loop:
1. `pp start -TaskId <id> -Repo <frontend|backend|desktop_legacy>`
2. `pp build`
3. `pp scheduler-loop -IntervalSeconds 30 -ConsumeCompletions`
4. On human gate notifications, return and run gate command (`pp approve`, `pp runtime-start`, etc.)

Service-host mode:
1. Test manually: `pp service-start -IntervalSeconds 30 -MaxCycles 3 -DryRun`
2. Inspect: `pp service-status`, `pp scheduler-status`, `pp doctor`
3. Operate continuously with service host wrapper and external service manager (Task Scheduler/NSSM/sc.exe strategy)
4. After forced termination: inspect lock and recover via `pp scheduler-unlock -IfStale`

Degraded/block recovery:
1. `pp worker-status`
2. `pp events -Tail 20`
3. `pp doctor`
4. If blocked, restart with `pp worker-start`
5. Resume bounded automation via `pp scheduler-run` or `pp scheduler-loop`

## Phase/Status Glossary (Compact)
- `B/spec_locked`: spec ready for implementation prep
- `C/ready_for_claude`: implementation pass routed to Claude
- `C/ready_for_cursor`: repair/refinement pass routed to Cursor
- `C/awaiting_visual_approval`: waiting on user visual decision
- `D/ready_for_codex` or `D/hardening`: Codex hardening stage
- `E/ready_for_final_judgment`: packet ready for ChatGPT judgment
- `E/merge_ready`: decision boundary reached (commit or no-commit recorded)
