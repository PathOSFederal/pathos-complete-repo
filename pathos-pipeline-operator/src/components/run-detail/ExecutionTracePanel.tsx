import type { ExecutionTraceEntry } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface ExecutionTracePanelProps {
  trace: ExecutionTraceEntry[];
}

export function ExecutionTracePanel({ trace }: ExecutionTracePanelProps) {
  return (
    <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Runner Trace</h3>
          <p className="mt-1 text-xs text-slate-500">
            Bounded execution trail sourced from run events and authoritative state.
          </p>
        </div>
        <span className="text-xs text-slate-500">{trace.length} entries</span>
      </div>

      <div className="max-h-[420px] overflow-auto rounded border border-[#1e2430] bg-[#0b0e13]">
        {trace.map((entry, index) => (
          <div
            key={`${entry.timestamp ?? 'none'}-${entry.action}-${index}`}
            className="grid grid-cols-[132px_92px_1fr_110px] gap-3 border-b border-[#1e2430] px-3 py-2 text-xs last:border-b-0"
          >
            <div className="text-slate-500">{entry.timestamp ? formatDateTime(entry.timestamp) : 'now'}</div>
            <div className="text-slate-300">{entry.actor}</div>
            <div>
              <div className="text-slate-100">{entry.action}</div>
              {entry.detail && <div className="mt-1 text-slate-500">{entry.detail}</div>}
            </div>
            <div className="text-right">
              <div className="text-slate-300">{entry.result}</div>
              <div className="mt-1 text-slate-500">{entry.state}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
