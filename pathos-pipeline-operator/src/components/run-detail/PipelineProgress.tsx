import { CheckCircle2, Circle, Clock3, AlertCircle, RotateCcw } from 'lucide-react';
import type { WorkspacePhase } from '@/lib/run-workspace';
import { cn } from '@/lib/utils';
import { focusPanel } from '@/components/run-detail/action-feedback';

interface PipelineProgressProps {
  steps: WorkspacePhase[];
}

function StepIcon({ state }: { state: WorkspacePhase['status'] }) {
  switch (state) {
    case 'complete':
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    case 'current':
      return (
        <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        </div>
      );
    case 'waiting':
      return <Clock3 className="w-5 h-5 text-slate-400" />;
    case 'blocked':
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    case 'failed':
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    case 'returned':
      return <RotateCcw className="w-5 h-5 text-amber-400" />;
    default:
      return <Circle className="w-5 h-5 text-slate-700" />;
  }
}

function stepLabelColor(state: WorkspacePhase['status']): string {
  switch (state) {
    case 'complete': return 'text-slate-200';
    case 'current': return 'text-blue-300';
    case 'waiting': return 'text-slate-500';
    case 'blocked': return 'text-red-300';
    case 'failed': return 'text-red-300';
    case 'returned': return 'text-amber-300';
    default: return 'text-slate-600';
  }
}

function stateLabel(state: WorkspacePhase['status']): string {
  switch (state) {
    case 'complete': return 'Complete';
    case 'current': return 'Current';
    case 'waiting': return 'Waiting';
    case 'blocked': return 'Blocked';
    case 'failed': return 'Failed';
    case 'returned': return 'Returned';
    default: return 'Waiting';
  }
}

export function PipelineProgress({ steps }: PipelineProgressProps) {
  return (
    <div className="rounded-xl border border-[#1e2430] bg-[#0c1118] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">Progress Rail</h3>
        <span className="text-[11px] text-slate-500">Click a phase to jump there</span>
      </div>
      <div className="flex items-start gap-0 overflow-x-auto">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isActive = ['current', 'blocked', 'failed', 'returned'].includes(step.status);

          return (
            <div key={step.id} className="flex items-start flex-1 min-w-0">
              <button
                type="button"
                onClick={() => focusPanel(step.focusId)}
                className="flex min-w-[110px] flex-col items-center rounded-lg px-2 py-1 text-center hover:bg-[#121b27]"
              >
                <StepIcon state={step.status} />
                <div className={cn('mt-2 text-center', stepLabelColor(step.status))}>
                  <div
                    className={cn(
                      'text-xs font-medium leading-tight',
                      isActive && 'font-semibold'
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-600">{stateLabel(step.status)}</div>
                  <div className="mt-1 max-w-28 text-[11px] text-slate-500">{step.detail}</div>
                </div>
              </button>

              {!isLast && (
                <div className="flex-1 flex items-center mt-2.5 px-1">
                  <div
                    className={cn(
                      'h-px w-full',
                      step.status === 'complete'
                        ? 'bg-green-800'
                        : step.status === 'blocked' || step.status === 'failed'
                        ? 'bg-red-800'
                        : step.status === 'returned'
                        ? 'bg-amber-800'
                        : 'bg-[#1e2430]'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#1e2430] pt-3">
        {[
          { state: 'complete', label: 'Complete', color: 'bg-green-400' },
          { state: 'current', label: 'Current', color: 'bg-blue-400' },
          { state: 'waiting', label: 'Waiting', color: 'bg-slate-500' },
          { state: 'blocked', label: 'Blocked', color: 'bg-red-400' },
          { state: 'failed', label: 'Failed', color: 'bg-red-500' },
          { state: 'returned', label: 'Returned for Repair', color: 'bg-amber-400' },
        ].map((item) => (
          <div key={item.state} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
