import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { PhaseStep, RunContext, RunState } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Phase / Status Labels ────────────────────────────────────────────────────

export const PHASE_LABELS: Record<string, string> = {
  B: 'Spec / Planning',
  C: 'Implementation',
  D: 'Hardening',
  E: 'Final Judgment',
};

export const STATUS_LABELS: Record<string, string> = {
  spec_locked: 'Spec Locked',
  ready_for_claude: 'Ready for Claude',
  ready_for_cursor: 'Ready for Cursor',
  awaiting_visual_approval: 'Awaiting Visual Approval',
  visual_approved: 'Visual Approved',
  visual_rejected: 'Visual Rejected',
  ready_for_codex: 'Ready for Codex',
  hardening: 'Hardening',
  ready_for_final_judgment: 'Ready for Final Judgment',
  final_review: 'Final Review',
  merge_ready: 'Merge Ready',
  committed: 'Committed',
  no_commit: 'No Commit',
  pending_action: 'Pending Action',
  claude_implementation_in_progress: 'Implementation In Progress',
};

export const SUPERVISOR_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  blocked: 'Blocked',
  stale: 'Stale Lock',
};

export const REPO_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  desktop_legacy: 'Desktop (Legacy)',
  fullstack: 'Fullstack',
  tooling: 'Tooling',
};

export const ENGINE_LABELS: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
  chatgpt: 'ChatGPT',
  cursor: 'Cursor',
  none: '—',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? `Phase ${phase}`;
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

export function supervisorColor(supervisorState: string): string {
  const map: Record<string, string> = {
    healthy: 'text-green-400',
    degraded: 'text-yellow-400',
    blocked: 'text-red-400',
    stale: 'text-orange-400',
  };
  return map[supervisorState] ?? 'text-gray-400';
}

export function statusColor(status: string): string {
  if (['committed', 'merge_ready'].includes(status)) return 'text-green-400';
  if (['ready_for_claude', 'ready_for_cursor', 'hardening', 'final_review'].includes(status))
    return 'text-blue-400';
  if (['awaiting_visual_approval', 'ready_for_final_judgment', 'spec_locked'].includes(status))
    return 'text-amber-400';
  if (['blocked', 'visual_rejected', 'no_commit'].includes(status)) return 'text-red-400';
  return 'text-slate-400';
}

export function statusBadgeClass(status: string): string {
  if (['committed', 'merge_ready'].includes(status))
    return 'bg-green-900/40 text-green-400 border-green-800/50';
  if (['ready_for_claude', 'ready_for_cursor', 'hardening', 'final_review'].includes(status))
    return 'bg-blue-900/40 text-blue-400 border-blue-800/50';
  if (['awaiting_visual_approval', 'ready_for_final_judgment', 'spec_locked'].includes(status))
    return 'bg-amber-900/40 text-amber-400 border-amber-800/50';
  if (['blocked', 'visual_rejected', 'no_commit'].includes(status))
    return 'bg-red-900/40 text-red-400 border-red-800/50';
  return 'bg-slate-900/40 text-slate-400 border-slate-700/50';
}

export function phaseBadgeClass(phase: string): string {
  const map: Record<string, string> = {
    B: 'bg-slate-900/40 text-slate-300 border-slate-700/50',
    C: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
    D: 'bg-purple-900/40 text-purple-400 border-purple-800/50',
    E: 'bg-amber-900/40 text-amber-400 border-amber-800/50',
  };
  return map[phase] ?? 'bg-gray-900/40 text-gray-400 border-gray-700/50';
}

// ─── Pipeline Progress Steps ──────────────────────────────────────────────────

/**
 * Derives the ordered pipeline step states for a run.
 * Steps that don't apply to the flow_type are marked 'skipped'.
 */
export function buildPipelineSteps(
  state: RunState | null,
  context: RunContext | null
): PhaseStep[] {
  const flowType = state?.flow_type ?? context?.flow_type ?? 'frontend';
  const phase = state?.phase ?? context?.phase ?? '';
  const status = state?.status ?? context?.status ?? '';
  const requiresVisual = state?.requires_visual_approval ?? context?.requires_visual_approval ?? false;
  const requiresRuntime = state?.requires_runtime_validation ?? context?.requires_runtime_validation ?? false;

  const phaseNum = phase ? phase.charCodeAt(0) - 'A'.charCodeAt(0) : 0;

  const steps: PhaseStep[] = [
    {
      id: 'spec',
      label: 'Spec Lock',
      sublabel: 'Planning',
      state: phase === 'B' && status === 'spec_locked' ? 'active' : phase > 'B' ? 'completed' : 'pending',
    },
    {
      id: 'implementation',
      label: 'Code Gen',
      sublabel: 'Implementation',
      state:
        phase === 'C' && !['awaiting_visual_approval', 'visual_approved'].includes(status)
          ? 'active'
          : phase > 'C'
          ? 'completed'
          : phase < 'C'
          ? 'pending'
          : 'completed',
    },
    {
      id: 'visual_qa',
      label: 'Visual QA',
      sublabel: 'Validation',
      state: !requiresVisual
        ? 'skipped'
        : status === 'awaiting_visual_approval'
        ? 'awaiting_human'
        : ['visual_approved', 'ready_for_codex', 'hardening', 'ready_for_final_judgment', 'final_review', 'merge_ready', 'committed'].includes(status) || phase > 'C'
        ? 'completed'
        : 'pending',
    },
    {
      id: 'runtime_check',
      label: 'Runtime Check',
      sublabel: 'Validation',
      state: !requiresRuntime
        ? 'skipped'
        : phase === 'D'
        ? 'active'
        : phase > 'D'
        ? 'completed'
        : 'pending',
    },
    {
      id: 'hardening',
      label: 'Codex Hardening',
      sublabel: 'Hardening',
      state:
        phase === 'D'
          ? status === 'hardening'
            ? 'active'
            : 'completed'
          : phase > 'D'
          ? 'completed'
          : 'pending',
    },
    {
      id: 'final_review',
      label: 'Final Review',
      sublabel: 'Judgment',
      state:
        phase === 'E' && ['ready_for_final_judgment', 'final_review'].includes(status)
          ? 'active'
          : ['merge_ready', 'committed'].includes(status)
          ? 'completed'
          : phase < 'E'
          ? 'pending'
          : 'active',
    },
    {
      id: 'commit',
      label: 'Commit',
      sublabel: 'Delivery',
      state:
        status === 'committed'
          ? 'completed'
          : status === 'merge_ready'
          ? 'awaiting_human'
          : 'pending',
    },
  ];

  return steps;
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}
