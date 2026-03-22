import { cn } from '@/lib/utils';

interface StatusDotProps {
  state: 'healthy' | 'active' | 'awaiting' | 'blocked' | 'pending' | 'unknown' | string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const stateClasses: Record<string, string> = {
  healthy: 'bg-green-400',
  active: 'bg-blue-400',
  awaiting: 'bg-amber-400',
  blocked: 'bg-red-400',
  pending: 'bg-slate-500',
  unknown: 'bg-slate-600',
  degraded: 'bg-yellow-400',
  stale: 'bg-orange-400',
  stopped_clean: 'bg-slate-500',
  running: 'bg-blue-400',
};

export function StatusDot({ state, pulse = false, size = 'sm' }: StatusDotProps) {
  const colorClass = stateClasses[state] ?? 'bg-slate-500';
  const sizeClass = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <span className="relative inline-flex">
      {pulse && (
        <span
          className={cn(
            'absolute inline-flex rounded-full opacity-75 animate-ping',
            colorClass,
            sizeClass
          )}
        />
      )}
      <span className={cn('relative inline-flex rounded-full', colorClass, sizeClass)} />
    </span>
  );
}
