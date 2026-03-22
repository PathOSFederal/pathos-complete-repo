'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { PipelineCommandResult } from '@/lib/types';
import { ActionResultPanel } from './ActionResultPanel';

const REPO_OPTIONS = [
  { value: 'frontend', label: 'frontend' },
  { value: 'backend', label: 'backend' },
  { value: 'desktop_legacy', label: 'desktop_legacy' },
];

const FLOW_OPTIONS = [
  { value: 'frontend', label: 'frontend' },
  { value: 'backend', label: 'backend' },
  { value: 'fullstack', label: 'fullstack' },
  { value: 'tooling', label: 'tooling' },
];

const RUN_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function CreateRunPanel() {
  const router = useRouter();
  const [taskId, setTaskId] = useState('');
  const [repo, setRepo] = useState('frontend');
  const [flow, setFlow] = useState('frontend');
  const [createBranch, setCreateBranch] = useState(true);
  const [branchName, setBranchName] = useState('');
  const [result, setResult] = useState<PipelineCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedTaskId = useMemo(() => taskId.trim(), [taskId]);
  const resolvedBranchName = branchName.trim() || `feature/${normalizedTaskId || 'new-run'}`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!RUN_ID_PATTERN.test(normalizedTaskId)) {
      setError('Task ID must use only letters, numbers, dot, underscore, and hyphen.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/pipeline/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          payload: {
            taskId: normalizedTaskId,
            repo,
            flow,
            createBranch,
            branchName: createBranch || branchName.trim() ? resolvedBranchName : '',
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? data?.stderr ?? 'Run creation failed.');
        if (data?.command) setResult(data as PipelineCommandResult);
        return;
      }

      setResult(data as PipelineCommandResult);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Run creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-200">Create Run</h2>
          <p className="mt-1 text-xs text-slate-500">
            Thin bridge to `pp.ps1 start`. The script creates the run folder and scaffolds artifacts.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Task ID / Run ID</span>
              <input
                value={taskId}
                onChange={(event) => setTaskId(event.target.value)}
                className="w-full rounded-md border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                placeholder="benefits-workspace-tab"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Repo</span>
              <select
                value={repo}
                onChange={(event) => setRepo(event.target.value)}
                className="w-full rounded-md border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              >
                {REPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Flow</span>
              <select
                value={flow}
                onChange={(event) => setFlow(event.target.value)}
                className="w-full rounded-md border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              >
                {FLOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[auto,1fr] md:items-end">
            <label className="flex items-center gap-2 rounded-md border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={createBranch}
                onChange={(event) => setCreateBranch(event.target.checked)}
              />
              Create Branch
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Branch Name</span>
              <input
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
                className="w-full rounded-md border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                placeholder={resolvedBranchName}
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
            >
              {isSubmitting ? 'Creating…' : 'Create Run'}
            </button>
            {result?.runId && result.ok && (
              <Link
                href={`/runs/${result.runId}`}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Open run →
              </Link>
            )}
          </div>
        </form>
      </div>

      <ActionResultPanel result={result} error={error} title="Create Run Result" />
    </div>
  );
}
