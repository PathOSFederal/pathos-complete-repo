'use client';

import { AlertTriangle } from 'lucide-react';
import type { FocusState, RecoveryInfo } from '@/lib/focus-state';
import { cn } from '@/lib/utils';

interface CurrentFocusCardProps {
  focus: FocusState;
}

// ─── Colour helpers ────────────────────────────────────────────────────────────

function cardBorderClass(category: FocusState['category']): string {
  switch (category) {
    case 'intake':
      return 'border-slate-700/60';
    case 'build':
      return 'border-emerald-800/50';
    case 'worker_launch':
      return 'border-blue-800/50';
    case 'worker_running':
      return 'border-blue-900/40';
    case 'repair':
      return 'border-amber-800/50';
    case 'human_gate':
      return 'border-amber-700/50';
    case 'validation':
      return 'border-cyan-800/50';
    case 'final_review':
      return 'border-purple-800/50';
    case 'post_commit':
      return 'border-emerald-800/40';
    case 'blocked':
      return 'border-red-800/60';
    default:
      return 'border-[#1e2836]';
  }
}

function cardBgClass(category: FocusState['category']): string {
  switch (category) {
    case 'intake':
      return 'bg-[#090d13]';
    case 'build':
      return 'bg-[#071210]';
    case 'worker_launch':
      return 'bg-[#070b14]';
    case 'worker_running':
      return 'bg-[#07090d]';
    case 'repair':
      return 'bg-[#100c06]';
    case 'human_gate':
      return 'bg-[#110d05]';
    case 'validation':
      return 'bg-[#060c0f]';
    case 'final_review':
      return 'bg-[#0a0710]';
    case 'post_commit':
      return 'bg-[#060f08]';
    case 'blocked':
      return 'bg-[#0f0508]';
    default:
      return 'bg-[#0b1016]';
  }
}

function badgeClass(category: FocusState['category']): string {
  switch (category) {
    case 'intake':
      return 'bg-slate-800/60 text-slate-300';
    case 'build':
      return 'bg-emerald-900/50 text-emerald-400';
    case 'worker_launch':
      return 'bg-blue-900/50 text-blue-400';
    case 'worker_running':
      return 'bg-blue-900/30 text-blue-300';
    case 'repair':
      return 'bg-amber-900/50 text-amber-400';
    case 'human_gate':
      return 'bg-amber-900/50 text-amber-300';
    case 'validation':
      return 'bg-cyan-900/50 text-cyan-400';
    case 'final_review':
      return 'bg-purple-900/50 text-purple-400';
    case 'post_commit':
      return 'bg-emerald-900/30 text-emerald-300';
    case 'blocked':
      return 'bg-red-900/50 text-red-400';
    default:
      return 'bg-slate-800/60 text-slate-400';
  }
}

function titleClass(category: FocusState['category']): string {
  switch (category) {
    case 'blocked':
      return 'text-red-200';
    case 'repair':
    case 'human_gate':
      return 'text-amber-100';
    case 'build':
    case 'worker_launch':
    case 'post_commit':
      return 'text-emerald-50';
    case 'worker_running':
      return 'text-blue-50';
    case 'final_review':
      return 'text-purple-50';
    default:
      return 'text-slate-100';
  }
}

// ─── Recovery section ─────────────────────────────────────────────────────────

function RecoverySection({ recovery }: { recovery: RecoveryInfo }) {
  const rows = [
    { label: 'What Went Wrong', value: recovery.summary },
    { label: 'Root Cause', value: recovery.reason },
    { label: 'Exact Fix', value: recovery.exactFix },
    { label: 'Next Step', value: recovery.nextStep },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <div className="mx-4 mb-4 rounded-lg border border-red-800/40 bg-red-950/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-red-300">Recovery Required</span>
      </div>
      <div className="space-y-3 text-xs">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <div className="text-[10px] uppercase tracking-widest text-red-700 mb-0.5">
              {label}
            </div>
            <div className="text-red-200/90 leading-relaxed">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function CurrentFocusCard({ focus }: CurrentFocusCardProps) {
  const isBlocked = focus.category === 'blocked';

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        cardBorderClass(focus.category),
        cardBgClass(focus.category),
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04]">
        <span
          className={cn(
            'inline-block flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase',
            badgeClass(focus.category),
          )}
        >
          Step Support
        </span>
        <span className="text-xs text-slate-500 text-right min-w-0">
          Step {focus.stepNumber} of {focus.totalSteps} — {focus.stepLabel}
        </span>
      </div>

      <div className="px-4 pt-4 pb-4">
        <h2
          className={cn(
            'text-base font-semibold leading-snug mb-1.5',
            titleClass(focus.category),
          )}
        >
          {focus.focusTitle}
        </h2>
        <p
          className={cn(
            'text-sm leading-relaxed',
            isBlocked ? 'text-red-300/80' : 'text-slate-400',
          )}
        >
          {focus.purpose}
        </p>
      </div>

      <div className="grid gap-3 border-t border-white/[0.04] px-4 py-4 md:grid-cols-2">
        {[
          ['Needed now', focus.neededNow.join(', ')],
          ['Where to go', focus.whereToGo],
          ['What to do now', focus.whatToDoNow],
          ['Completion condition', focus.completionCondition],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/[0.05] bg-black/10 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
            <div className="mt-1 text-sm text-slate-200">{value}</div>
          </div>
        ))}
      </div>

      {focus.recoveryDetails && (
        <div className="mx-4 mb-4 rounded-lg border border-amber-800/40 bg-amber-950/20 p-4">
          <div className="text-[10px] uppercase tracking-widest text-amber-600 mb-2">
            Evidence check
          </div>
          <ul className="space-y-1.5 text-xs text-amber-200/90">
            <li>Handoff exists: {focus.recoveryDetails.handoffExists ? 'Yes' : 'No'}</li>
            <li>current.md exists: {focus.recoveryDetails.currentExists ? 'Yes' : 'No'}</li>
            <li>Completion signal exists: {focus.recoveryDetails.completionExists ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      )}

      {isBlocked && focus.recovery && <RecoverySection recovery={focus.recovery} />}
    </div>
  );
}
