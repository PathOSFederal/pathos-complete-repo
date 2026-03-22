import { Activity, GitMerge, Clock, AlertCircle } from 'lucide-react';

interface StatsBarProps {
  totalRuns: number | null;
  activeCount: number | null;
  pendingGateCount: number | null;
  currentRunId: string | null | undefined;
}

export function StatsBar({ totalRuns, activeCount, pendingGateCount, currentRunId }: StatsBarProps) {
  const stats = [
    {
      label: 'Total Runs',
      value: totalRuns ?? 'Unavailable',
      icon: GitMerge,
      color: 'text-slate-400',
    },
    {
      label: 'Active',
      value: activeCount ?? 'Unavailable',
      icon: Activity,
      color: typeof activeCount === 'number' && activeCount > 0 ? 'text-blue-400' : 'text-slate-500',
    },
    {
      label: 'Pending Gates',
      value: pendingGateCount ?? 'Unavailable',
      icon: AlertCircle,
      color:
        typeof pendingGateCount === 'number' && pendingGateCount > 0
          ? 'text-amber-400'
          : 'text-slate-500',
    },
    {
      label: 'Current Run',
      value: currentRunId === undefined ? 'Unavailable' : currentRunId ?? '—',
      icon: Clock,
      color: 'text-slate-400',
      mono: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <div
              className={`text-lg font-semibold ${stat.color} ${
                stat.mono ? 'mono text-sm truncate' : ''
              }`}
            >
              {stat.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
