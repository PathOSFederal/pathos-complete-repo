import { GitBranch } from 'lucide-react';
import type { ExactExecutionPosition } from '@/lib/types';
import { cn } from '@/lib/utils';

type HealthClass = 'green' | 'yellow' | 'red';

export function deriveWorkspaceHealth(
  runnerState: ExactExecutionPosition['runnerState'],
  currentOwner: ExactExecutionPosition['currentOwner'],
): HealthClass {
  if (runnerState === 'blocked' || runnerState === 'stale') return 'red';
  if (runnerState === 'running' || runnerState === 'ready_to_advance') return 'green';
  return 'yellow';
}

interface WorkspaceHeaderProps {
  runId: string;
  title: string;
  branch: string | null;
  executionPosition: ExactExecutionPosition;
}

export function WorkspaceHeader({ runId, title, branch, executionPosition }: WorkspaceHeaderProps) {
  const health = deriveWorkspaceHealth(executionPosition.runnerState, executionPosition.currentOwner);

  return (
    <div className="flex-shrink-0 border-b border-[#1e2430] bg-[#090b0e] px-5 pt-3 pb-2">
      <div className="flex items-center justify-between gap-4 min-w-0">
        {/* Title + branch */}
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-base font-semibold text-slate-100 truncate">{title}</h1>
          {branch && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0 flex-shrink-0">
              <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{branch}</span>
            </div>
          )}
        </div>

        {/* State indicator */}
        <div className="flex items-center gap-3 text-xs flex-shrink-0">
          <span className="text-slate-600">State:</span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5',
              health === 'green' ? 'text-emerald-400 font-medium' : 'text-slate-600',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                health === 'green' ? 'bg-emerald-400' : 'bg-slate-700',
              )}
            />
            Green (Healthy)
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5',
              health === 'yellow' ? 'text-amber-400 font-medium' : 'text-slate-600',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                health === 'yellow' ? 'bg-amber-400' : 'bg-slate-700',
              )}
            />
            Yellow (Waiting)
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5',
              health === 'red' ? 'text-red-400 font-medium' : 'text-slate-600',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                health === 'red' ? 'bg-red-400' : 'bg-slate-700',
              )}
            />
            Red (Blocked)
          </span>
        </div>
      </div>

      {/* Phase breadcrumb */}
      <div className="mt-1 text-xs">
        <span className="text-slate-300 font-medium">{executionPosition.currentPhase}</span>
        {executionPosition.currentSubStep && (
          <>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="text-slate-500">{executionPosition.currentSubStep}</span>
          </>
        )}
      </div>
    </div>
  );
}
