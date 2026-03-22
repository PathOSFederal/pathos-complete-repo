import type { RunState, RunContext } from '@/lib/types';
import { statusLabel, supervisorColor, formatRelativeTime, cn } from '@/lib/utils';
import { StatusDot } from '@/components/ui/StatusDot';

interface StateMachinePanelProps {
  state: RunState | null;
  context: RunContext | null;
}

function supervisorDotState(supervisorState: string): string {
  if (supervisorState === 'healthy') return 'healthy';
  if (supervisorState === 'degraded') return 'awaiting';
  if (supervisorState === 'blocked') return 'blocked';
  if (supervisorState === 'stale') return 'awaiting';
  return 'unknown';
}

export function StateMachinePanel({ state, context }: StateMachinePanelProps) {
  const supervisorState = state?.supervisor_state ?? context?.supervisor_state ?? 'unknown';
  const currentStatus = state?.status ?? context?.status ?? 'unknown';
  const pendingAction = context?.pending_action;
  const retryCount = state?.retry_count ?? 0;
  const iteration = state?.iteration ?? 0;
  const lastProgress = state?.last_successful_progress_at;
  const updatedAt = context?.updated_at;

  return (
    <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">State Machine</h3>
        <span className="text-xs font-mono text-slate-500 bg-[#161b22] px-2 py-0.5 rounded border border-[#1e2430]">
          FSM
        </span>
      </div>

      {/* Current State */}
      <div className="bg-[#161b22] border border-[#1e2430] rounded-lg p-4 mb-4">
        <div className="text-xs text-slate-500 mb-1.5">Current State</div>
        <div className="flex items-center gap-2">
          <StatusDot state={supervisorDotState(supervisorState)} size="md" />
          <div>
            <div className="text-base font-semibold text-slate-100">
              {statusLabel(currentStatus)}
            </div>
            <div className={cn('text-xs mt-0.5 capitalize', supervisorColor(supervisorState))}>
              Supervisor: {supervisorState}
            </div>
          </div>
        </div>

        {pendingAction && pendingAction !== 'none' && (
          <div className="mt-3 pt-3 border-t border-[#1e2430]">
            <div className="text-xs text-slate-500 mb-1">Pending Action</div>
            <div className="mono text-xs text-amber-300">{pendingAction}</div>
          </div>
        )}
      </div>

      <div className="mb-4 rounded border border-[#1e2430] bg-[#161b22] p-3 text-xs text-slate-500">
        This panel reflects the current script-owned state only.
        Use <code className="mono text-slate-400">pp resume</code> for authoritative next-step guidance.
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-[#161b22] rounded p-2.5">
          <div className="text-slate-500 mb-1">Retry Count</div>
          <div className={cn('font-medium', retryCount > 0 ? 'text-amber-400' : 'text-slate-300')}>
            {retryCount}
          </div>
        </div>
        <div className="bg-[#161b22] rounded p-2.5">
          <div className="text-slate-500 mb-1">Iteration</div>
          <div className="font-medium text-slate-300">{iteration}</div>
        </div>
        {lastProgress && (
          <div className="bg-[#161b22] rounded p-2.5 col-span-2">
            <div className="text-slate-500 mb-1">Last Progress</div>
            <div className="text-slate-400">{lastProgress}</div>
          </div>
        )}
        {updatedAt && (
          <div className="bg-[#161b22] rounded p-2.5 col-span-2">
            <div className="text-slate-500 mb-1">Context Updated</div>
            <div className="text-slate-400">{formatRelativeTime(updatedAt)}</div>
          </div>
        )}
      </div>

      {/* Degraded/Blocked warning */}
      {(supervisorState === 'blocked' || supervisorState === 'degraded') && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800/40 rounded-lg">
          <div className="text-xs font-medium text-red-400 mb-1">
            {supervisorState === 'blocked' ? 'Run Blocked' : 'Degraded State'}
          </div>
          <div className="text-xs text-red-300/70">
            Run <code className="mono">pp resume</code> or{' '}
            <code className="mono">pp doctor</code> for guidance.
          </div>
        </div>
      )}
    </div>
  );
}
