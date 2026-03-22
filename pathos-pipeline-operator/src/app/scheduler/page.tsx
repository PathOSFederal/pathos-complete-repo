import { readOverviewData, readSchedulerLock, readServiceState } from '@/lib/pipeline-reader';
import { Sidebar } from '@/components/layout/Sidebar';
import { SchedulerCard } from '@/components/overview/SchedulerCard';
import { RefreshCw, Terminal } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SchedulerPage() {
  let serviceState = null;
  let schedulerLock = null;
  let pendingGateCount: number | undefined;
  let loadError: string | null = null;

  try {
    [serviceState, schedulerLock, pendingGateCount] = await Promise.all([
      readServiceState(),
      readSchedulerLock(),
      readOverviewData().then((data) => data.pendingGateCount),
    ]);
  } catch (err) {
    loadError = String(err);
  }

  const now = new Date().toISOString();

  return (
    <div className="flex h-screen overflow-hidden bg-[#090b0e]">
      <Sidebar pendingGates={pendingGateCount} />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#090b0e]/95 backdrop-blur border-b border-[#1e2430] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Scheduler</h1>
            <p className="text-xs text-slate-500 mt-0.5">Pipeline service host &amp; scheduler health</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">Updated: {formatDateTime(now)}</span>
            <a href="/scheduler" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#161b22] border border-[#1e2430] px-3 py-1.5 rounded-md transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </a>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loadError && (
            <div className="p-4 bg-red-900/20 border border-red-800/40 rounded-lg text-sm text-red-400">
              <div className="font-medium mb-1">Failed to read scheduler state</div>
              <div className="mono text-xs">{loadError}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SchedulerCard
              serviceState={serviceState}
              schedulerLocked={schedulerLock !== null}
              schedulerLock={schedulerLock}
            />

            {/* Service state raw detail */}
            {serviceState ? (
              <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-4">Service State Detail</h3>
                <div className="space-y-2 text-xs">
                  {Object.entries(serviceState).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-start gap-4">
                      <span className="text-slate-500 shrink-0">{k}</span>
                      <span className="mono text-slate-300 text-right break-all">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Service State Detail</h3>
                <p className="text-xs text-slate-500">
                  No real service state is available right now. This panel stays empty rather than inventing scheduler values.
                </p>
              </div>
            )}
          </div>

          {/* Commands reference */}
          <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Scheduler Commands</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { cmd: 'pp scheduler-run', desc: 'One bounded scheduler cycle' },
                { cmd: 'pp scheduler-loop', desc: 'Recurring scheduler cycles' },
                { cmd: 'pp scheduler-status', desc: 'Inspect lock health' },
                { cmd: 'pp scheduler-unlock -IfStale', desc: 'Recover from stale lock' },
                { cmd: 'pp service-start', desc: 'Start service wrapper' },
                { cmd: 'pp service-status', desc: 'Service status inspection' },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-start gap-3 p-3 bg-[#161b22] rounded-lg border border-[#1e2430]">
                  <code className="mono text-xs text-amber-300/80 shrink-0">{cmd}</code>
                  <span className="text-xs text-slate-500">{desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-600">
              Execute these commands from the terminal in your pipeline scripts directory.
              This GUI reflects read-only state from <code className="mono">dev-pipeline/logs/pipeline-service.state.json</code>.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
