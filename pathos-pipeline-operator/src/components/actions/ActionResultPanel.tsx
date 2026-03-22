'use client';

import type { PipelineCommandResult } from '@/lib/types';

interface ActionResultPanelProps {
  result: PipelineCommandResult | null;
  error?: string | null;
  title?: string;
}

export function ActionResultPanel({
  result,
  error = null,
  title = 'Action Result',
}: ActionResultPanelProps) {
  if (!result && !error) {
    return (
      <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">{title}</h3>
        <p className="text-xs text-slate-500">
          No action has been executed from this panel yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {result && (
          <span
            className={`text-xs px-2 py-0.5 rounded border ${
              result.ok
                ? 'bg-green-900/30 text-green-400 border-green-800/40'
                : 'bg-red-900/30 text-red-400 border-red-800/40'
            }`}
          >
            {result.ok ? 'success' : 'failure'}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded border border-[#1e2430] bg-[#161b22] p-2">
              <div className="text-slate-500">Action</div>
              <div className="mt-1 text-slate-200">{result.action}</div>
            </div>
            <div className="rounded border border-[#1e2430] bg-[#161b22] p-2">
              <div className="text-slate-500">Timestamp</div>
              <div className="mt-1 text-slate-200">{result.timestamp}</div>
            </div>
            <div className="rounded border border-[#1e2430] bg-[#161b22] p-2">
              <div className="text-slate-500">Exit Code</div>
              <div className="mt-1 text-slate-200">{result.exitCode}</div>
            </div>
            <div className="rounded border border-[#1e2430] bg-[#161b22] p-2">
              <div className="text-slate-500">Run</div>
              <div className="mt-1 text-slate-200">{result.runId ?? '—'}</div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-slate-500">Command</div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-[#1e2430] bg-[#161b22] p-3 text-amber-300">
              {result.command}
            </pre>
          </div>

          <div>
            <div className="mb-1 text-slate-500">stdout</div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-[#1e2430] bg-[#161b22] p-3 text-slate-300">
              {result.stdout || '[no stdout]'}
            </pre>
          </div>

          <div>
            <div className="mb-1 text-slate-500">stderr</div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-[#1e2430] bg-[#161b22] p-3 text-red-300">
              {result.stderr || '[no stderr]'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
