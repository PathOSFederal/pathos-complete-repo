'use client';

import { Loader2, CheckCircle2, Circle, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import type { ExactExecutionPosition, PhaseStep } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WorkspaceTopBandProps {
  executionPosition: ExactExecutionPosition;
  steps: PhaseStep[];
  runId: string;
}

function deriveProgressPct(steps: PhaseStep[]): number {
  if (!steps.length) return 0;
  const completed = steps.filter((s) => s.state === 'completed' || s.state === 'skipped').length;
  return Math.round((completed / steps.length) * 100);
}

function StateBadge({ state }: { state: ExactExecutionPosition['runnerState'] }) {
  if (state === 'running' || state === 'ready_to_advance') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-xs font-bold tracking-widest text-emerald-300 uppercase">
        <Loader2 className="h-3 w-3 animate-spin" />
        {state === 'running' ? 'RUNNING' : 'RUNNING'}
      </span>
    );
  }
  if (state === 'blocked') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 border border-red-500/40 px-3 py-1 text-xs font-bold tracking-widest text-red-300 uppercase">
        <AlertCircle className="h-3 w-3" />
        BLOCKED
      </span>
    );
  }
  if (state === 'stale') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 px-3 py-1 text-xs font-bold tracking-widest text-amber-300 uppercase">
        <AlertCircle className="h-3 w-3" />
        STALE
      </span>
    );
  }
  if (state === 'complete') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-600/20 border border-slate-600/40 px-3 py-1 text-xs font-bold tracking-widest text-slate-300 uppercase">
        <CheckCircle2 className="h-3 w-3" />
        COMPLETE
      </span>
    );
  }
  // waiting / human action needed
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 px-3 py-1 text-xs font-bold tracking-widest text-amber-300 uppercase">
      <Clock className="h-3 w-3" />
      HUMAN ACTION
    </span>
  );
}

function humanStateLabel(state: ExactExecutionPosition['runnerState']): string {
  switch (state) {
    case 'running': return 'Running';
    case 'ready_to_advance': return 'Running';
    case 'blocked': return 'Blocked';
    case 'stale': return 'Stale';
    case 'complete': return 'Complete';
    default: return 'Waiting';
  }
}

function ownerBadgeClass(owner: ExactExecutionPosition['currentOwner']): string {
  switch (owner) {
    case 'Claude': return 'border-blue-700/50 bg-blue-900/20 text-blue-300';
    case 'Codex': return 'border-purple-700/50 bg-purple-900/20 text-purple-300';
    case 'human': return 'border-amber-700/50 bg-amber-900/20 text-amber-300';
    case 'ChatGPT': return 'border-green-700/50 bg-green-900/20 text-green-300';
    default: return 'border-slate-700/50 bg-slate-900/20 text-slate-300';
  }
}

function StepIcon({ state }: { state: PhaseStep['state'] }) {
  if (state === 'completed' || state === 'skipped') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />;
  }
  if (state === 'active' || state === 'awaiting_worker') {
    return (
      <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
        <span className="absolute h-4 w-4 animate-ping rounded-full bg-cyan-400/40" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-cyan-400" />
      </span>
    );
  }
  if (state === 'awaiting_human') {
    return <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />;
  }
  if (state === 'blocked') {
    return <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />;
  }
  return <Circle className="h-4 w-4 text-slate-600 flex-shrink-0" />;
}

function stepLabelColor(state: PhaseStep['state']): string {
  if (state === 'completed' || state === 'skipped') return 'text-slate-400';
  if (state === 'active' || state === 'awaiting_worker') return 'text-cyan-200 font-semibold';
  if (state === 'awaiting_human') return 'text-amber-300 font-semibold';
  if (state === 'blocked') return 'text-red-300 font-semibold';
  return 'text-slate-600';
}

function connectorColor(state: PhaseStep['state']): string {
  if (state === 'completed' || state === 'skipped') return 'bg-emerald-700/50';
  return 'bg-slate-700/40';
}

function liveStatusColor(state: ExactExecutionPosition['runnerState']): string {
  if (state === 'running' || state === 'ready_to_advance') return 'text-emerald-300';
  if (state === 'blocked') return 'text-red-300';
  if (state === 'stale') return 'text-amber-300';
  return 'text-amber-200';
}

export function WorkspaceTopBand({ executionPosition, steps, runId }: WorkspaceTopBandProps) {
  const pct = deriveProgressPct(steps);
  const nextAction = executionPosition.nextAutomaticAction ?? executionPosition.nextHumanAction;
  const isHumanNeeded =
    executionPosition.runnerState === 'waiting' &&
    (executionPosition.currentOwner === 'human' || executionPosition.currentOwner === 'ChatGPT');

  return (
    <section className="sticky top-[89px] z-[9] rounded-xl border border-[#253041] bg-[#0d1219]/96 backdrop-blur overflow-hidden">
      {/* Progress rail */}
      <div className="flex items-center gap-0 px-5 pt-4 pb-3 overflow-x-auto scrollbar-none">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <StepIcon state={step.state} />
              <span className={cn('text-[11px] whitespace-nowrap', stepLabelColor(step.state))}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('mx-2 h-px w-6 flex-shrink-0', connectorColor(step.state))} />
            )}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[#1e2838]" />

      {/* Main status row */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        {/* Phase / sub-step */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Current Phase</div>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Sub-step</div>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100">{executionPosition.currentPhase}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-sm text-slate-300">{executionPosition.currentSubStep}</span>
          </div>
        </div>

        {/* Owner badge + State badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('rounded-md border px-3 py-1 text-xs font-medium', ownerBadgeClass(executionPosition.currentOwner))}>
            {executionPosition.currentOwner}
          </span>
          <StateBadge state={isHumanNeeded ? 'waiting' : executionPosition.runnerState} />
        </div>

        {/* Next action */}
        {nextAction && (
          <div className="flex items-center gap-1.5 flex-shrink-0 rounded-md border border-[#243142] bg-[#111823] px-3 py-1 text-xs text-slate-300">
            <span className="text-slate-500">Next:</span>
            <span className="text-slate-200">{nextAction}</span>
          </div>
        )}

        {/* Run ID */}
        <div className="flex-shrink-0 font-mono text-[11px] text-slate-500">{runId}</div>

        {/* Percentage */}
        <div className={cn('flex-shrink-0 text-2xl font-bold tabular-nums', pct >= 90 ? 'text-emerald-300' : pct >= 50 ? 'text-cyan-300' : 'text-slate-400')}>
          {pct}%
        </div>
      </div>

      {/* Live status */}
      <div className={cn('px-5 pb-3 text-xs', liveStatusColor(isHumanNeeded ? 'waiting' : executionPosition.runnerState))}>
        {executionPosition.currentBlocker ? (
          <span className="text-red-300">{executionPosition.liveStatusSentence}</span>
        ) : (
          executionPosition.liveStatusSentence
        )}
      </div>
    </section>
  );
}
