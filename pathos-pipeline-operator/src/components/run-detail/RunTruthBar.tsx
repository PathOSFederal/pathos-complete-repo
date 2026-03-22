'use client';

import { Loader2, CheckCircle2, Clock, AlertCircle, User, Server } from 'lucide-react';
import type { ExactExecutionPosition, RunDerivedData } from '@/lib/types';
import type { FocusState } from '@/lib/focus-state';
import { cn } from '@/lib/utils';
import { buildWorkspacePhases } from '@/lib/run-workspace';
import { PipelineProgress } from '@/components/run-detail/PipelineProgress';

interface RunTruthBarProps {
  runId: string;
  title: string;
  branch: string | null;
  phase: string;
  executionPosition: ExactExecutionPosition;
  focus: FocusState;
  status: string;
  taskSpecReady: boolean;
  builderPromptExists: boolean;
  derived: RunDerivedData;
}

function StateBadge({ focus }: { focus: FocusState }) {
  const isRecoverable = focus.badgeLabel === 'RECOVERABLE';
  const isHuman = focus.badgeLabel === 'WAITING ON YOU' || focus.badgeLabel === 'HUMAN ACTION' || focus.category === 'human_gate';
  const isRunning = focus.category === 'worker_running' && focus.badgeLabel.includes('RUNNING');
  const isComplete = focus.badgeLabel === 'COMPLETE' || focus.badgeLabel === 'COMMITTED' || focus.badgeLabel === 'NO COMMIT';
  const isBlocked = focus.category === 'blocked';

  if (isBlocked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 border border-red-500/40 px-2.5 py-1 text-[11px] font-bold tracking-widest text-red-300 uppercase">
        <AlertCircle className="h-3 w-3" />
        {focus.badgeLabel}
      </span>
    );
  }
  if (isRecoverable) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold tracking-widest text-amber-300 uppercase">
        <AlertCircle className="h-3 w-3" />
        {focus.badgeLabel}
      </span>
    );
  }
  if (isRunning) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/15 border border-blue-500/40 px-2.5 py-1 text-[11px] font-bold tracking-widest text-blue-300 uppercase">
        <Loader2 className="h-3 w-3 animate-spin" />
        {focus.badgeLabel}
      </span>
    );
  }
  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-600/20 border border-slate-600/40 px-2.5 py-1 text-[11px] font-bold tracking-widest text-slate-300 uppercase">
        <CheckCircle2 className="h-3 w-3" />
        {focus.badgeLabel}
      </span>
    );
  }
  if (isHuman) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold tracking-widest text-amber-300 uppercase">
        <Clock className="h-3 w-3" />
        {focus.badgeLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-600/20 border border-slate-600/40 px-2.5 py-1 text-[11px] font-bold tracking-widest text-slate-300 uppercase">
      {focus.badgeLabel}
    </span>
  );
}

function NextOwnerChip({ owner }: { owner: ExactExecutionPosition['currentOwner'] }) {
  const isYou = owner === 'human' || owner === 'ChatGPT';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium',
        isYou
          ? 'border-amber-700/50 bg-amber-900/20 text-amber-300'
          : 'border-slate-700/50 bg-slate-900/20 text-slate-400',
      )}
    >
      {isYou ? <User className="h-3 w-3" /> : <Server className="h-3 w-3" />}
      {isYou ? 'You' : 'System'}
    </span>
  );
}

export function RunTruthBar({
  runId,
  title,
  branch,
  phase,
  executionPosition,
  focus,
  status,
  taskSpecReady,
  builderPromptExists,
  derived,
}: RunTruthBarProps) {
  const phases = buildWorkspacePhases(status, derived, {
    taskSpecReady,
    builderPromptExists,
  });
  return (
    <div className="flex-shrink-0 border-b border-[#1e2430] bg-[#090b0e] px-5 py-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 min-w-0">
        <div className="min-w-0 flex-shrink-0">
          <h1 className="text-sm font-semibold text-slate-100 truncate">{title}</h1>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-mono">{runId}</span>
            {branch && (
              <>
                <span>·</span>
                <span className="truncate max-w-[180px]">{branch}</span>
              </>
            )}
            <span>·</span>
            <span>{phase}</span>
          </div>
        </div>

        <StateBadge focus={focus} />
        <div className="flex-1 min-w-[200px] text-xs text-slate-500">
          Step {focus.stepNumber} of {focus.totalSteps} — {focus.stepLabel}
        </div>
        <NextOwnerChip owner={executionPosition.currentOwner} />
      </div>
      <div className="mt-3">
        <PipelineProgress steps={phases} />
      </div>
    </div>
  );
}
