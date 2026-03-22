import Link from 'next/link';
import { readOverviewData, readRunDetail } from '@/lib/pipeline-reader';
import { Sidebar } from '@/components/layout/Sidebar';
import { HumanGatesPanel } from '@/components/run-detail/HumanGatesPanel';
import { RefreshCw, GitBranch } from 'lucide-react';
import { statusLabel, statusBadgeClass, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GATE_STATUSES = new Set([
  'awaiting_visual_approval',
  'ready_for_final_judgment',
  'final_review',
  'merge_ready',
]);

export default async function GatesPage() {
  let data: Awaited<ReturnType<typeof readOverviewData>> | null = null;
  let loadError: string | null = null;
  try {
    data = await readOverviewData();
  } catch (err) {
    loadError = String(err);
  }

  const safeData = data ?? { runs: [], pendingGateCount: undefined };
  const gateRuns = safeData.runs.filter((r) => !r.archived && GATE_STATUSES.has(r.status));

  // Load state + context for each gate run
  const gateDetails = await Promise.all(gateRuns.map(async (run) => ({ run, detail: await readRunDetail(run.run_id) })));

  return (
    <div className="flex h-screen overflow-hidden bg-[#090b0e]">
      <Sidebar pendingGates={safeData.pendingGateCount} />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#090b0e]/95 backdrop-blur border-b border-[#1e2430] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Human Gates</h1>
            <p className="text-xs text-slate-500 mt-0.5">{gateRuns.length} runs awaiting action</p>
          </div>
          <a href="/gates" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#161b22] border border-[#1e2430] px-3 py-1.5 rounded-md transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </a>
        </div>

        <div className="p-6 space-y-6">
          {loadError && (
            <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-4 text-sm text-red-300">
              Unable to read real gate data: <span className="mono text-xs">{loadError}</span>
            </div>
          )}
          {gateDetails.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <GitBranch className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <div className="text-sm">No runs currently awaiting human gates.</div>
              <div className="text-xs mt-1 text-slate-600">
                Gates appear when runs reach visual approval, runtime check, or final judgment.
              </div>
            </div>
          )}

          {gateDetails.map(({ run, detail }) => (
            <div key={run.run_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/runs/${run.run_id}`} className="mono text-blue-400 hover:text-blue-300 font-medium">
                    {run.run_id}
                  </Link>
                  <span className={cn('text-xs px-2 py-0.5 rounded border', statusBadgeClass(run.status))}>
                    {statusLabel(run.status)}
                  </span>
                </div>
                <Link href={`/runs/${run.run_id}`} className="text-xs text-slate-500 hover:text-slate-300">
                  View detail →
                </Link>
              </div>
              <HumanGatesPanel runId={run.run_id} derived={detail.derived} returnToRunHref={`/runs/${run.run_id}`} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
