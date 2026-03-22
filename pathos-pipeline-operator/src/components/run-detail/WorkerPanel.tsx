import { Bot, Cpu } from 'lucide-react';
import type { RunContext, RunDerivedData, RunState } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WorkerPanelProps {
  state: RunState | null;
  context: RunContext | null;
  derived: RunDerivedData;
}

const engineColors: Record<string, string> = {
  claude: 'text-amber-400',
  codex: 'text-purple-400',
  chatgpt: 'text-green-400',
  cursor: 'text-blue-400',
  none: 'text-slate-500',
};

const engineBg: Record<string, string> = {
  claude: 'bg-amber-900/30 border-amber-800/40',
  codex: 'bg-purple-900/30 border-purple-800/40',
  chatgpt: 'bg-green-900/30 border-green-800/40',
  cursor: 'bg-blue-900/30 border-blue-800/40',
  none: 'bg-slate-900/30 border-slate-700/40',
};

export function WorkerPanel({ state, context, derived }: WorkerPanelProps) {
  const engine = state?.execution_engine ?? context?.execution_engine ?? 'none';
  const supervisorState = state?.supervisor_state ?? context?.supervisor_state ?? 'unknown';
  const engineColor = engineColors[engine] ?? 'text-slate-400';
  const engineBgClass = engineBg[engine] ?? engineBg.none;
  const activeWorker =
    engine === 'claude'
      ? derived.workerLaunch.claude
      : engine === 'codex'
      ? derived.workerLaunch.codex
      : null;
  const runnerState = derived.executionPosition.runnerState;
  const runnerTone =
    runnerState === 'blocked'
      ? 'text-red-400'
      : runnerState === 'stale'
      ? 'text-amber-300'
      : runnerState === 'running'
      ? 'text-green-400'
      : runnerState === 'ready_to_advance'
      ? 'text-cyan-300'
      : 'text-slate-300';

  return (
    <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Worker / Agent</h3>
        <span className="text-xs capitalize text-slate-400">{supervisorState}</span>
      </div>

      <div className={cn('flex items-center gap-3 p-4 rounded-lg border mb-4', engineBgClass)}>
        <div className="w-10 h-10 rounded-lg bg-[#161b22] flex items-center justify-center border border-[#1e2430]">
          {engine === 'claude' ? (
            <Bot className={cn('w-5 h-5', engineColor)} />
          ) : (
            <Cpu className={cn('w-5 h-5', engineColor)} />
          )}
        </div>
        <div>
          <div className={cn('text-sm font-semibold capitalize', engineColor)}>
            {engine === 'none' ? 'No worker assigned' : engine}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Previous: {derived.guidance.previousWorker ?? '—'} · Next: {derived.guidance.nextWorkerOrHuman ?? '—'}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Runner state</span>
          <span className={runnerTone}>{runnerState.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Heartbeat</span>
          <span className={derived.heartbeat.freshness === 'stale' ? 'text-amber-300' : 'text-slate-300'}>
            {derived.heartbeat.exists ? `${derived.heartbeat.status} · ${derived.heartbeat.freshness}` : 'missing'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Last progress</span>
          <span className="text-slate-300">{derived.heartbeat.lastProgressAt ?? '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Adapter mode</span>
          <span className="text-slate-300">{activeWorker?.active ? activeWorker.adapterMode : 'not active yet'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Last launch</span>
          <span className="text-slate-300">{activeWorker?.active ? activeWorker.lastLaunchAttemptAt ?? '—' : '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Claude finish</span>
          <span className={derived.claudeReadiness.readyForFinish ? 'text-green-400' : 'text-slate-300'}>
            {derived.claudeReadiness.readyForFinish ? 'ready' : 'not ready'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Codex finish</span>
          <span className={derived.codexReadiness.readyForFinish ? 'text-green-400' : 'text-slate-300'}>
            {derived.codexReadiness.readyForFinish ? 'ready' : 'not ready'}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#1e2430] text-xs text-slate-500">
        {activeWorker?.active
          ? derived.executionPosition.currentWaitReason ??
            activeWorker.lastLaunchResult ??
            derived.heartbeat.recommendedAction ??
            'Worker state is sourced from the pipeline filesystem only.'
          : 'This run has not reached an active worker phase yet.'}
      </div>
    </div>
  );
}
