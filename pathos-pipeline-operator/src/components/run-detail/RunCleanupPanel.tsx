'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, GitBranch, Loader2 } from 'lucide-react';

interface RunCleanupPanelProps {
  runId: string;
  repo: string;
  branch: string | null;
}

export function RunCleanupPanel({ runId, repo, branch }: RunCleanupPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<'archive' | 'branch' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function archiveRun() {
    const confirmed = window.confirm(
      `Archive run '${runId}'?\n\nThis removes it from the active path but keeps it reversible in archived-runs.`,
    );
    if (!confirmed) return;
    setBusy('archive');
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${runId}/archive`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Archive run failed.');
      setMessage(`Run '${runId}' archived successfully.`);
      router.refresh();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Archive run failed.');
    } finally {
      setBusy(null);
    }
  }

  async function deleteBranch(force = false) {
    if (!branch) return;
    const confirmed = window.confirm(
      `${force ? 'Force delete' : 'Delete'} local branch '${branch}' for run '${runId}'?`,
    );
    if (!confirmed) return;
    setBusy('branch');
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/branches/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, branch, force }),
      });
      const data = await response.json();
      if (response.status === 409 && data?.requiresForce) {
        setBusy(null);
        const retry = window.confirm(`${data.error}\n\nDelete anyway with force?`);
        if (retry) return deleteBranch(true);
        return;
      }
      if (!response.ok) throw new Error(data?.error ?? 'Delete branch failed.');
      setMessage(`Deleted local branch '${branch}'.`);
      router.refresh();
    } catch (branchError) {
      setError(branchError instanceof Error ? branchError.message : 'Delete branch failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#1f2937] bg-[#0b1016] p-4">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500">Cleanup</div>
        <div className="mt-1 text-sm font-medium text-slate-200">Archive stale runs and delete stale branches</div>
        <div className="mt-1 text-xs text-slate-500">
          Run delete is not exposed because the pipeline only supports reversible archiving today.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={archiveRun}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-200 disabled:opacity-50"
        >
          {busy === 'archive' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
          Archive Run
        </button>

        <button
          type="button"
          onClick={() => deleteBranch(false)}
          disabled={busy !== null || !branch}
          className="inline-flex items-center gap-1.5 rounded border border-red-700/40 bg-red-900/20 px-3 py-2 text-xs font-medium text-red-200 disabled:opacity-50"
        >
          {busy === 'branch' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}
          Delete Local Branch
        </button>
      </div>

      {branch && <div className="text-xs text-slate-500">Branch target: {branch}</div>}
      {message && <div className="text-xs text-emerald-300">{message}</div>}
      {error && <div className="text-xs text-red-300">{error}</div>}
    </div>
  );
}
