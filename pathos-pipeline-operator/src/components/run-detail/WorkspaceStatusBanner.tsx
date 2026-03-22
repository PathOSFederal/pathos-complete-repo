import type { ExactExecutionPosition } from '@/lib/types';
import { deriveWorkspaceHealth } from '@/components/run-detail/WorkspaceHeader';
import { cn } from '@/lib/utils';

interface WorkspaceStatusBannerProps {
  executionPosition: ExactExecutionPosition;
}

export function WorkspaceStatusBanner({ executionPosition }: WorkspaceStatusBannerProps) {
  const health = deriveWorkspaceHealth(executionPosition.runnerState, executionPosition.currentOwner);

  const wrapClass = {
    green: 'border-b border-emerald-800/40 bg-emerald-900/10',
    yellow: 'border-b border-amber-800/40 bg-amber-900/10',
    red: 'border-b border-red-800/40 bg-red-900/10',
  }[health];

  const textClass = {
    green: 'text-emerald-300',
    yellow: 'text-amber-300',
    red: 'text-red-300',
  }[health];

  const dotClass = {
    green: 'bg-emerald-400',
    yellow: 'bg-amber-400',
    red: 'bg-red-400',
  }[health];

  return (
    <div className={cn('flex-shrink-0 px-5 py-2', wrapClass)}>
      <div className={cn('flex items-start gap-2 text-sm', textClass)}>
        <span className={cn('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', dotClass)} />
        <div>
          <span>{executionPosition.liveStatusSentence}</span>
          {executionPosition.currentBlocker && health === 'red' && (
            <div className="mt-0.5 text-xs opacity-75">
              Blocker: {executionPosition.currentBlocker}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
