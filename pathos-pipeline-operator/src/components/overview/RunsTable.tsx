'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, ExternalLink, GitBranch, Loader2 } from 'lucide-react';
import type { RunIndexEntry } from '@/lib/types';
import {
  statusLabel,
  phaseLabel,
  formatRelativeTime,
  statusBadgeClass,
  phaseBadgeClass,
  cn,
} from '@/lib/utils';
import { StatusDot } from '@/components/ui/StatusDot';

interface RunsTableProps {
  runs: RunIndexEntry[];
  currentRunId: string | null;
  showAll?: boolean;
}

function RunRowActions({ run, isCurrent }: { run: RunIndexEntry; isCurrent: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'archive' | 'branch' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function archiveRun() {
    const confirmed = window.confirm(
      `Archive run '${run.run_id}'?\n\nThis removes it from the active run path but keeps it reversible in archived-runs.`,
    );
    if (!confirmed) return;
    setBusy('archive');
    setError(null);
    try {
      const response = await fetch(`/api/runs/${run.run_id}/archive`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Archive run failed.');
      router.refresh();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Archive run failed.');
    } finally {
      setBusy(null);
    }
  }

  async function deleteBranch(force = false) {
    if (!run.branch) return;
    const confirmed = window.confirm(
      `${force ? 'Force delete' : 'Delete'} local branch '${run.branch}' for run '${run.run_id}'?`,
    );
    if (!confirmed) return;
    setBusy('branch');
    setError(null);
    try {
      const response = await fetch('/api/branches/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: run.repo, branch: run.branch, force }),
      });
      const data = await response.json();
      if (response.status === 409 && data?.requiresForce) {
        setBusy(null);
        const retry = window.confirm(
          `${data.error}\n\nDelete it anyway with force? This is destructive if the branch is not merged.`,
        );
        if (retry) return deleteBranch(true);
        return;
      }
      if (!response.ok) throw new Error(data?.error ?? 'Delete branch failed.');
      router.refresh();
    } catch (branchError) {
      setError(branchError instanceof Error ? branchError.message : 'Delete branch failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/runs/${run.run_id}`}
        className="text-slate-500 hover:text-slate-300 transition-colors"
        title="View run detail"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
      {!run.archived && (
        <button
          type="button"
          onClick={archiveRun}
          disabled={busy !== null}
          className="text-slate-500 hover:text-amber-300 transition-colors disabled:opacity-50"
          title="Archive run"
        >
          {busy === 'archive' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
        </button>
      )}
      {run.branch && !isCurrent && (
        <button
          type="button"
          onClick={() => deleteBranch(false)}
          disabled={busy !== null}
          className="text-slate-500 hover:text-red-300 transition-colors disabled:opacity-50"
          title={`Delete local branch ${run.branch}`}
        >
          {busy === 'branch' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
        </button>
      )}
      {error && <span className="max-w-[180px] truncate text-[10px] text-red-400">{error}</span>}
    </div>
  );
}

function runStatusDotState(run: RunIndexEntry): string {
  const { status } = run;
  if (['committed', 'merge_ready'].includes(status)) return 'healthy';
  if (['ready_for_claude', 'ready_for_cursor', 'hardening', 'final_review'].includes(status))
    return 'active';
  if (['awaiting_visual_approval', 'ready_for_final_judgment', 'spec_locked'].includes(status))
    return 'awaiting';
  if (['blocked', 'visual_rejected', 'no_commit'].includes(status)) return 'blocked';
  return 'pending';
}

export function RunsTable({ runs, currentRunId, showAll = false }: RunsTableProps) {
  const displayed = showAll ? runs : runs.filter((r) => !r.archived).slice(0, 20);

  if (displayed.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        <div>No runs yet.</div>
        <div className="mt-1 text-xs text-slate-600">
          Create a run from Overview or use{' '}
          <code className="mono text-slate-400">pp start -TaskId &lt;id&gt; -Repo frontend</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1e2430]">
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
              Run
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
              Repo / Flow
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
              Phase
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
              Engine
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
              Updated
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e2430]">
          {displayed.map((run) => {
            const isCurrent = run.run_id === currentRunId;
            const dotState = runStatusDotState(run);

            return (
              <tr
                key={run.run_id}
                className={cn(
                  'hover:bg-[#111520] transition-colors',
                  isCurrent && 'bg-blue-950/10'
                )}
              >
                {/* Run ID */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusDot state={dotState} pulse={dotState === 'active'} />
                    <div>
                      <Link
                        href={`/runs/${run.run_id}`}
                        className="mono text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {run.run_id}
                      </Link>
                      {isCurrent && (
                        <span className="ml-2 text-xs text-blue-500 font-medium">current</span>
                      )}
                      {run.branch && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">
                          {run.branch}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Repo / Flow */}
                <td className="px-4 py-3">
                  <div className="text-slate-300">{run.repo}</div>
                  <div className="text-xs text-slate-500">{run.flow_type}</div>
                </td>

                {/* Phase */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
                      phaseBadgeClass(run.phase)
                    )}
                  >
                    {run.phase} · {phaseLabel(run.phase)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
                      statusBadgeClass(run.status)
                    )}
                  >
                    {statusLabel(run.status)}
                  </span>
                </td>

                {/* Engine */}
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {run.execution_engine || '—'}
                </td>

                {/* Updated */}
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {formatRelativeTime(run.updated_at)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <RunRowActions run={run} isCurrent={isCurrent} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
