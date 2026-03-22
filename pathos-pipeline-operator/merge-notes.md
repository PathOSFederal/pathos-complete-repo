# Merge Notes — PathOS Pipeline Operator Console (Phase 1)

**Task:** Build the first thin operator GUI for the PathOS pipeline automation system.
**Date:** 2026-03-12
**Scope:** New standalone project — `C:\dev\PathOS\pathos-pipeline-operator`
**Branch:** N/A (new directory, not part of existing repo)

---

## Directory Decision

Created at: `C:\dev\PathOS\pathos-pipeline-operator`

**Rationale for new directory (not using `apps/pathos-platform/frontend/`):**

The existing `apps/pathos-platform/frontend` is a Next.js app for the PathOS career advisor product (job search, resume builder, PathAdvisor). It is a product-facing app for end users, not a pipeline operator console.

Adding a pipeline operator console inside that app would:
1. Mix operator tooling with product code
2. Create import boundary violations (operator tools importing product types)
3. Confuse architectural concerns

The separate directory `pathos-pipeline-operator` preserves clear separation: pipeline operator tooling in its own bounded app, product UI stays clean.

---

## Files Created

### Configuration
- `package.json` — Next.js 15 + Tailwind CSS 3 + Lucide React; port 3777
- `next.config.mjs` — serverRuntimeConfig for PIPELINE_ROOT
- `tsconfig.json` — TypeScript 5, bundler module resolution, @/* alias
- `tailwind.config.ts` — Dark operator theme color palette
- `postcss.config.mjs` — Tailwind + Autoprefixer
- `.env.local` — PIPELINE_ROOT=C:\dev\PathOS\dev-pipeline

### Library
- `src/lib/types.ts` — All shared TypeScript types (RunIndexEntry, RunState, RunContext, PipelineEvent, ServiceState, SchedulerLock, RunDetail, OverviewData, PhaseStep)
- `src/lib/pipeline-reader.ts` — Server-side read-only filesystem reader. Reads authoritative pipeline JSON files. No writes. Handles missing files gracefully (returns null).
- `src/lib/utils.ts` — cn(), labels, color helpers, buildPipelineSteps(), formatRelativeTime(), formatDateTime()

### API Routes (server-side, Node.js runtime)
- `src/app/api/runs/route.ts` — GET /api/runs → readOverviewData()
- `src/app/api/runs/[id]/route.ts` — GET /api/runs/:id → readRunDetail()
- `src/app/api/runs/[id]/events/route.ts` — GET /api/runs/:id/events → readRunEvents()
- `src/app/api/scheduler/route.ts` — GET /api/scheduler → readSchedulerLock() + readServiceState()
- `src/app/api/service/route.ts` — GET /api/service → readServiceState()

### Components
- `src/components/layout/Sidebar.tsx` — Navigation sidebar (Overview, Active Runs, Human Gates, Scheduler; others disabled as placeholders)
- `src/components/ui/Badge.tsx` — Colored badge component
- `src/components/ui/StatusDot.tsx` — Animated status indicator dot
- `src/components/overview/RunsTable.tsx` — Runs list table with status/phase/engine columns
- `src/components/overview/StatsBar.tsx` — Stats row (total, active, pending gates, current run)
- `src/components/overview/SchedulerCard.tsx` — Scheduler + service health card with stale lock warning
- `src/components/run-detail/PipelineProgress.tsx` — Pipeline phase step visualization
- `src/components/run-detail/StateMachinePanel.tsx` — Current state, supervisor health, transitions, retry/iteration counts
- `src/components/run-detail/WorkerPanel.tsx` — Execution engine details (Claude/Codex/ChatGPT/Cursor)
- `src/components/run-detail/HumanGatesPanel.tsx` — Human gates display with script command hints (read-only; no auto-execution)
- `src/components/run-detail/ArtifactsPanel.tsx` — Artifact file list + design reference highlight
- `src/components/run-detail/EventTimeline.tsx` — NDJSON events.log display, collapsible

### Pages (Next.js App Router, server components)
- `src/app/layout.tsx` — Root layout (dark background)
- `src/app/globals.css` — Tailwind base + operator dark theme
- `src/app/page.tsx` — Root redirect to /overview
- `src/app/overview/page.tsx` — Pipeline Command Center (stats, all runs, scheduler/service sidebar)
- `src/app/runs/page.tsx` — Active runs list
- `src/app/runs/[id]/page.tsx` — Run detail page (pipeline progress, state machine, worker, gates, artifacts, events, metadata)
- `src/app/scheduler/page.tsx` — Scheduler + service health detail
- `src/app/gates/page.tsx` — Human gates pending action (cross-run view)

### Documentation
- `README.md` — Setup, data sources, safe actions reference, tech stack, limitations
- `merge-notes.md` — This file

---

## Integration Boundaries

### How GUI reads authoritative state

```
Pipeline scripts (authoritative)
  └─ writes to: dev-pipeline/runs/<id>/state.json
                dev-pipeline/runs/<id>/run-context.json
                dev-pipeline/runs/<id>/events.log
                dev-pipeline/runs/index.json
                dev-pipeline/logs/pipeline-service.state.json

GUI (read-only observer)
  └─ reads from: same files via pipeline-reader.ts
  └─ renders: state as-of last pipeline write
  └─ never writes to pipeline filesystem
```

### Adapter layer

`src/lib/pipeline-reader.ts` is the only file that touches the pipeline filesystem.
- Uses Node.js `fs/promises` in Next.js API routes (server-side only)
- All reads wrapped in try/catch — missing files return null
- Zero writes, zero state mutations

### Actions read-only vs command-backed

| Feature | Type |
|---------|------|
| View run state | Read-only |
| View events | Read-only |
| View artifacts list | Read-only |
| View design reference | Read-only |
| View scheduler/service status | Read-only |
| Human gates display | Read-only (shows script command to execute) |
| Refresh button | Browser navigation (GET re-render) |
| All pipeline transitions | Not in GUI — use terminal `pp` commands |

**No command execution is implemented in Phase 1.** The GUI shows which `pp` command to run for each gate, but does not execute them.

---

## No Second State Machine Confirmation

**Confirmed: No second state machine was introduced.**

- `buildPipelineSteps()` in `utils.ts` is a **pure derivation function** — it reads phase/status values and maps them to display states. It does not store state, does not trigger transitions, does not know about previous states.
- All state displayed is read from pipeline JSON files at request time.
- The GUI has no internal state transitions, no background automation, no run advancement logic.

---

## Commands Run

```bash
# Directory creation
mkdir -p pathos-pipeline-operator/src/...

# Dependency installation
cd C:\dev\PathOS\pathos-pipeline-operator
npm install

# Dev server
npm run dev  # starts on http://localhost:3777
```

---

## Git Status

This project lives in `C:\dev\PathOS\pathos-pipeline-operator` which is NOT a git repository.
The parent `C:\dev\PathOS` is also not a git repository (confirmed: `Is a git repository: false`).
No git operations were performed.

---

## Known Limitations / Next Steps

### Phase 1 Limitations
1. **Read-only** — no command execution from GUI
2. **No auto-refresh** — user must click Refresh or reload
3. **Placeholder pages** — Worker Health, Logs & Events, Notifications, Settings, Diagnostics not yet implemented
4. **No authentication** — local operator use only, no auth layer
5. **events.log format** — NDJSON parsing is best-effort; format may vary by pipeline version
6. **Worker heartbeat** — heartbeat file path is read from state.json but heartbeat data not yet parsed

### Suggested Phase 2 Work
- Auto-refresh via polling (configurable interval)
- Worker Health page with heartbeat display
- Logs & Events page (service log viewer)
- Notifications log display
- Diagnostics page (pp doctor output reader)
- Optional: safe command execution (pp resume output display, pp doctor output display)
- Optional: artifact file viewer for .md files

---

## Validation Checklist

- [x] GUI launches locally on port 3777
- [x] Overview page renders with real run data from index.json
- [x] Run detail page renders with real state/context data
- [x] Empty/no-run states: handled (shows "No runs found" message)
- [x] Degraded/blocked states: red banner shown on run detail page
- [x] Unknown/unavailable states: rendered as "unknown" or "—", no crashes
- [x] Runtime validation presence/absence: correctly shown in pipeline progress + worker panel
- [x] Design-reference presence/absence: shown in artifacts panel, green highlight when present
- [x] Scheduler lock: shown in scheduler card with stale lock warning
- [x] Service state missing: graceful "unavailable" display
- [x] No hidden state machine: confirmed (buildPipelineSteps is pure derivation)
- [x] No command-backed actions that bypass pipeline logic: confirmed (Phase 1 is read-only)
- [x] No pipeline logic migrated to GUI: confirmed
