# PathOS Pipeline Operator Console

A **thin, read-mostly operator GUI** for supervising the PathOS pipeline automation system.

## Architecture Boundary

This console is a **thin operator layer**. The pipeline scripts remain authoritative.

- **No pipeline logic lives here.** The scripts in `dev-pipeline/scripts/` are the process authority.
- **No second state machine.** This GUI renders state read from authoritative pipeline JSON files.
- **No transition logic.** The GUI only invokes approved script commands and re-reads script-owned state.
- **No hidden persistence.** No database, no shadow state. Reads from `dev-pipeline/runs/` at request time.
- **No hidden automation.** Human gates remain explicit and are not silently advanced from the GUI.

## Quick Start

```bash
cd C:\dev\PathOS\pathos-pipeline-operator
npm run dev
```

The console starts on **http://localhost:3777**

## Current Slice

This slice extends the console into the real operator home for a run:

- Claude/Codex launch can now be prepared and triggered from the run page
- adapter status, last launch attempt, handoff packet, evidence readiness, and finish blockers are shown in one place
- final review is operationalized as a review-packet + decision-capture surface
- `commit` / `no-commit` are now executable from the GUI through the existing bounded bridge
- PR title/description are generated from run-local artifacts and can be persisted as run-local files

The GUI now supports:

- Create/open a run and stay inside one run detail view
- See a top-level exact execution position panel with phase, sub-step, owner, runner state, wait reason, next automatic action, next human action, relevant artifact, last heartbeat, and latest command/result
- See a bounded runner trace that converts run events into an operator-readable execution trail
- Edit and save run-local `runs/<run-id>/artifacts/task.md`
- Build, continue bounded automation, and use simplified Start / Continue / Advance worker actions while keeping prepare/reconcile/finish available under advanced controls
- Reconcile Claude/Codex completion signals when evidence exists but the signal is still scaffold-level
- Record ChatGPT final judgment as `approve_for_commit`, `no_commit`, or `repair_required`
- Commit from the GUI with a required commit message field plus pre-commit scope visibility and suspicious-file warnings
- Record no-commit from the GUI
- Generate, copy, and persist `pr-title.txt` and `pr-description.md`
- Run human gates from the GUI:
  - approve visual review
  - request repair pass
  - start runtime validation
  - mark runtime validation pass/fail from the same runtime panel
- Fill a structured runtime validation form that writes validator-compliant `runtime-validation.md`, carries forward known run metadata, and blocks pass while placeholders remain
- Preview run-local markdown/text/json artifacts directly in the GUI
- View exact command output (`stdout`, `stderr`, exit code, timestamp)
- See a derived run-guidance summary sourced from pipeline state + evidence checks

For clean-slate testing, archive historical runs from the pipeline CLI first:

```powershell
cd C:\dev\PathOS\dev-pipeline
.\pp.ps1 archive-runs -AllRuns
```

Archived runs move to `dev-pipeline/archived-runs/<timestamp>/...`.
The GUI reflects the real remaining run set and will appear empty until a new run is created.

Still intentionally manual in this slice:

- ChatGPT thinking itself
- actual worker output authoring by Claude/Codex
- PR creation / push
- `archive-runs`

## Configuration

Edit `.env.local` to set your pipeline root:

```
PIPELINE_ROOT=C:\dev\PathOS\dev-pipeline
```

Default is `C:\dev\PathOS\dev-pipeline`.

## Pages

| Route | Description |
|-------|-------------|
| `/overview` | Dashboard — all runs, stats, scheduler/service status |
| `/runs` | Active runs list |
| `/runs/[id]` | Run detail — pipeline progress, state machine, worker, gates, artifacts, events |
| `/scheduler` | Scheduler + service host health |
| `/gates` | Human gates pending action |

## Data Sources

All data is read directly from the authoritative pipeline filesystem:

| Data | File |
|------|------|
| Run registry | `dev-pipeline/runs/index.json` |
| Active run | `dev-pipeline/runs/current-run.txt` |
| Run state | `dev-pipeline/runs/<id>/state.json` |
| Run context | `dev-pipeline/runs/<id>/run-context.json` |
| Run events | `dev-pipeline/runs/<id>/events.log` |
| Artifacts | `dev-pipeline/runs/<id>/artifacts/` |
| Service state | `dev-pipeline/logs/pipeline-service.state.json` |
| Scheduler lock | `dev-pipeline/runs/scheduler-loop.lock*.json` |

## Thin Command Bridge

The bridge lives inside the local Next.js app as API routes.

Architecture:

```text
GUI
→ local route handler
→ allowlisted pp.ps1 command
→ script-owned filesystem state
→ GUI refresh from filesystem truth
```

Safety constraints:

- Local-only usage
- Explicit allowlist of supported actions
- No arbitrary shell access
- Argument validation for run id / repo / flow / branch name
- `task.md` editing writes only to `runs/<run-id>/artifacts/task.md`
- Command results are returned as structured JSON

## Supported GUI Actions

Current bounded bridge actions:

| GUI action | Script command |
|------------|----------------|
| Create Run | `.\pp.ps1 start ...` |
| Build | `.\pp.ps1 use <run-id>` then `.\pp.ps1 build` |
| Continue automation | `.\pp.ps1 scheduler-run -RunId <run-id> -ConsumeCompletions` |
| Start Claude | `.\pp.ps1 use <run-id>` then `.\pp.ps1 claude-start` |
| Prepare Claude | `.\pp.ps1 use <run-id>` then `.\pp.ps1 claude-start -PrepareOnly` |
| Finish Claude | `.\pp.ps1 use <run-id>` then `.\pp.ps1 claude-finish` |
| Reconcile Claude Signal | `.\pp.ps1 use <run-id>` then `.\pp.ps1 reconcile-claude-completion` |
| Approve Visual Review | `.\pp.ps1 use <run-id>` then `.\pp.ps1 approve` |
| Request Repair Pass | `.\pp.ps1 use <run-id>` then `.\pp.ps1 revise -Type implementation -Notes ...` |
| Start Runtime Validation | `.\pp.ps1 use <run-id>` then `.\pp.ps1 runtime-start` |
| Runtime Pass | `.\pp.ps1 use <run-id>` then `.\pp.ps1 runtime-done` |
| Runtime Fail | `.\pp.ps1 use <run-id>` then `.\pp.ps1 runtime-fail` |
| Start Codex | `.\pp.ps1 use <run-id>` then `.\pp.ps1 codex-start` |
| Prepare Codex | `.\pp.ps1 use <run-id>` then `.\pp.ps1 codex-start -PrepareOnly` |
| Finish Codex | `.\pp.ps1 use <run-id>` then `.\pp.ps1 codex-finish` |
| Reconcile Codex Signal | `.\pp.ps1 use <run-id>` then `.\pp.ps1 reconcile-codex-completion` |
| Worker Retry | `.\pp.ps1 use <run-id>` then `.\pp.ps1 worker-retry` |
| Refresh Final Review | `.\pp.ps1 use <run-id>` then `.\pp.ps1 final-review` |
| Commit | `.\pp.ps1 use <run-id>` then `.\pp.ps1 commit -Message "<msg>"` |
| No Commit | `.\pp.ps1 use <run-id>` then `.\pp.ps1 no-commit` |

If `claude-start` or `codex-start` runs in prepare-only/manual-handoff mode, the GUI surfaces that honestly using script-owned state and artifact paths.

## Final Review + PR Prep

- The GUI does not invent final judgment. The operator records the external ChatGPT decision into `runs/<run-id>/artifacts/final-judgment.json`.
- Commit/no-commit buttons are gated by that recorded decision in the GUI.
- PR prep is generated from `task.md`, `current.md`, `codexReview.md`, and branch context, then can be persisted to:
  - `runs/<run-id>/artifacts/pr-title.txt`
  - `runs/<run-id>/artifacts/pr-description.md`

## Run Guidance

The run detail page now includes a top-level guidance block derived from:

- `state.json`
- `run-context.json`
- recent `events.log`
- artifact presence/content checks
- completion-signal checks
- worker heartbeat freshness

It answers:

- what stage the run is in
- who owns the next move
- whether the run is active, waiting, blocked, degraded, or complete
- what just happened
- the exact next step
- whether the operator can act now
- why the run is blocked when applicable

The GUI does not invent transitions; it explains script-owned reality.

## Runtime Validation

The runtime validation panel now writes a validator-compliant `runtime-validation.md` with required sections and accepted status/decision values.

Operators no longer need to guess the parser schema after `runtime-start`.

## Completion Readiness

Claude and Codex readiness are surfaced at artifact level:

- handoff present?
- implementation/review evidence present?
- completion signal present?
- completion signal still scaffold-level or ready?
- exact blocker preventing authoritative finish

The reconcile helpers are intentionally narrow:

- they only operate on the active run
- they only update the completion signal
- they require real non-placeholder evidence
- finish remains script-authoritative (`claude-finish` / `codex-finish`)

## Terminal Commands Still Useful

Later-stage and diagnostic actions still belong in the terminal:

```powershell
# Navigate to pipeline scripts
cd C:\dev\PathOS\dev-pipeline

# Common commands
pp status              # Dashboard
pp resume              # What to do next
pp doctor              # Health check
pp current             # Active run
pp events              # Event timeline
pp scheduler-status    # Scheduler health
pp scheduler-unlock -IfStale  # Recover stale lock
```

## Tech Stack

- **Next.js 15** (App Router, TypeScript, server components)
- **Tailwind CSS 3** (dark operator theme)
- **Lucide React** (icons)
- No Zustand, no database, no external state management

## Development

```bash
npm run dev        # Start dev server on :3777
npm run build      # Build for production
npm run typecheck  # TypeScript check
```

## Limitations (Phase 1)

- Phase 2A supports only `start`, `build`, `claude-start`, and task spec editing.
- Worker Health, Logs & Events, Notifications, Settings pages are placeholders (planned Phase 2).
- Event timeline parses NDJSON events.log — format depends on pipeline version.
- No auto-refresh polling (use browser refresh or action-triggered refresh).
- No authentication — intended for local operator use only.

## Non-Negotiable Truths Preserved

1. Scripts are authoritative — the GUI does not own transitions or status changes.
2. Workers operate inside the pipeline process — not controlled from here.
3. Scripts validate whether work counts — not the GUI.
4. Human gates remain human gates — this slice does not execute gates from the GUI.
5. No second state machine — state is read directly from pipeline JSON.
6. No re-implemented transition logic — transitions are shown informatively only.
7. Service host stays thin — GUI does not start, stop, or schedule the service.
