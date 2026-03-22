import { readOverviewData } from '@/lib/pipeline-reader';
import { Sidebar } from '@/components/layout/Sidebar';
import { RunsTable } from '@/components/overview/RunsTable';
import { RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ActiveRunsPage() {
  let data: Awaited<ReturnType<typeof readOverviewData>> | null = null;
  let loadError: string | null = null;
  try {
    data = await readOverviewData();
  } catch (err) {
    loadError = String(err);
  }

  const safeData = data ?? { currentRunId: null, runs: [], pendingGateCount: undefined };
  const activeStatuses = new Set([
    'ready_for_claude', 'ready_for_cursor', 'awaiting_visual_approval',
    'hardening', 'ready_for_final_judgment', 'final_review', 'ready_for_codex', 'spec_locked',
  ]);
  const activeRuns = safeData.runs.filter((r) => !r.archived && activeStatuses.has(r.status));
  const archivedCount = safeData.runs.filter((r) => r.archived).length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#090b0e]">
      <Sidebar pendingGates={safeData.pendingGateCount} />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#090b0e]/95 backdrop-blur border-b border-[#1e2430] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Active Runs</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeRuns.length} currently active
              {archivedCount > 0 ? ` · ${archivedCount} archived runs hidden` : ''}
            </p>
          </div>
          <a href="/runs" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#161b22] border border-[#1e2430] px-3 py-1.5 rounded-md transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </a>
        </div>
        <div className="p-6">
          {loadError && (
            <div className="mb-4 rounded-lg border border-red-800/40 bg-red-900/20 p-4 text-sm text-red-300">
              Unable to read real run data: <span className="mono text-xs">{loadError}</span>
            </div>
          )}
          <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg">
            <RunsTable runs={activeRuns} currentRunId={safeData.currentRunId} showAll />
          </div>
        </div>
      </main>
    </div>
  );
}
