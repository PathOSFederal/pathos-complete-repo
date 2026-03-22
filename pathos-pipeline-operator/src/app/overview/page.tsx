import { RefreshCw, Terminal } from 'lucide-react';
import { readOverviewData } from '@/lib/pipeline-reader';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatsBar } from '@/components/overview/StatsBar';
import { RunsTable } from '@/components/overview/RunsTable';
import { SchedulerCard } from '@/components/overview/SchedulerCard';
import { CreateRunPanel } from '@/components/actions/CreateRunPanel';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OverviewPage() {
  let data: Awaited<ReturnType<typeof readOverviewData>> | null = null;
  let loadError: string | null = null;

  try {
    data = await readOverviewData();
  } catch (err) {
    loadError = String(err);
  }

  const safeData = data ?? {
    currentRunId: null,
    runs: [],
    serviceState: null,
    schedulerLocked: false,
    schedulerLock: null,
    activeCount: null,
    pendingGateCount: null,
  };

  const nonArchivedRuns = safeData.runs.filter((r) => !r.archived);
  const now = new Date().toISOString();

  return (
    <div className="flex h-screen overflow-hidden bg-[#090b0e]">
      <Sidebar
        pendingGates={safeData.pendingGateCount ?? undefined}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#090b0e]/95 backdrop-blur border-b border-[#1e2430] px-6 py-3 flex items-center justify-between">
          <div>
            <nav className="text-xs text-slate-500 mb-0.5">
              <span>Overview</span>
            </nav>
            <h1 className="text-base font-semibold text-slate-100">Pipeline Command Center</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">
              Last updated: {formatDateTime(now)}
            </span>
            <a
              href="/overview"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#161b22] border border-[#1e2430] px-3 py-1.5 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </a>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Error banner */}
          {loadError && (
            <div className="p-4 bg-red-900/20 border border-red-800/40 rounded-lg text-sm text-red-400">
              <div className="font-medium mb-1">Failed to read pipeline state</div>
              <div className="mono text-xs text-red-300/70">{loadError}</div>
              <div className="mt-2 text-xs text-red-300/50">
                Check that PIPELINE_ROOT is set correctly in .env.local and the pipeline directory exists.
              </div>
            </div>
          )}

          {/* Stats */}
          <StatsBar
            totalRuns={data ? nonArchivedRuns.length : null}
            activeCount={safeData.activeCount}
            pendingGateCount={safeData.pendingGateCount}
            currentRunId={data ? safeData.currentRunId : undefined}
          />

          {data && nonArchivedRuns.length === 0 && (
            <div className="rounded-lg border border-[#1e2430] bg-[#0f1117] p-5">
              <h2 className="text-sm font-semibold text-slate-200">Clean Slate</h2>
              <p className="mt-1 text-sm text-slate-500">
                No active runs are currently visible to the console. Create a run to begin.
              </p>
            </div>
          )}

          {/* Main content grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Runs table */}
            <div className="xl:col-span-3">
              <div className="space-y-6">
                <CreateRunPanel />

                <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg">
                  <div className="px-5 py-4 border-b border-[#1e2430] flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-200">Runs</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                      {nonArchivedRuns.length} visible runs
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {safeData.currentRunId && (
                        <a
                          href={`/runs/${safeData.currentRunId}`}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View current →
                        </a>
                      )}
                    </div>
                  </div>
                  <RunsTable
                    runs={safeData.runs}
                    currentRunId={safeData.currentRunId}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar cards */}
            <div className="xl:col-span-1 space-y-4">
              <SchedulerCard
                serviceState={safeData.serviceState}
                schedulerLocked={safeData.schedulerLocked}
                schedulerLock={safeData.schedulerLock}
              />

              {/* Quick commands reference */}
              <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-medium text-slate-200">Quick Reference</h3>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { cmd: 'pp status', desc: 'Dashboard + events' },
                    { cmd: 'pp current', desc: 'Show active run' },
                    { cmd: 'pp resume', desc: 'What to do next' },
                    { cmd: 'pp doctor', desc: 'Health check' },
                    { cmd: 'pp scheduler-status', desc: 'Scheduler health' },
                  ].map(({ cmd, desc }) => (
                    <div key={cmd} className="flex items-start justify-between gap-2">
                      <code className="mono text-amber-300/80">{cmd}</code>
                      <span className="text-slate-600 text-right">{desc}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#1e2430] text-xs text-slate-600">
                  Run commands from your terminal in the pipeline scripts directory.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
