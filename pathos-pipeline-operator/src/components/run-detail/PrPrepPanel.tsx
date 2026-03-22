'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PrPrepData } from '@/lib/types';
import { PanelActionFeedback, createActionFeedback, focusPanel, type ActionFeedbackState } from '@/components/run-detail/action-feedback';

interface PrPrepPanelProps {
  runId: string;
  prPrep: PrPrepData;
}

export function PrPrepPanel({ runId, prPrep }: PrPrepPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState(prPrep.savedTitle ?? prPrep.generatedTitle);
  const [description, setDescription] = useState(prPrep.savedDescription ?? prPrep.generatedDescription);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  useEffect(() => {
    setTitle(prPrep.savedTitle ?? prPrep.generatedTitle);
    setDescription(prPrep.savedDescription ?? prPrep.generatedDescription);
  }, [prPrep.generatedDescription, prPrep.generatedTitle, prPrep.savedDescription, prPrep.savedTitle]);

  async function savePrPrep() {
    setIsSaving(true);
    setStatus(null);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch(`/api/runs/${runId}/pr-prep`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Unable to save PR prep artifacts.');
        setFeedback(createActionFeedback('save-pr-prep', false, data?.error ?? 'Unable to save PR prep artifacts.'));
        return;
      }
      setStatus(`Saved PR prep artifacts at ${data.updatedAt}.`);
      router.refresh();
      setFeedback(createActionFeedback('save-pr-prep', true, 'PR prep artifacts were saved for this run.'));
      focusPanel('pr-prep-panel');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save PR prep artifacts.');
    } finally {
      setIsSaving(false);
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setStatus('Copied to clipboard.');
    setError(null);
    setFeedback(createActionFeedback('copy', true, 'Copied the current PR field to the clipboard.'));
  }

  return (
    <div id="pr-prep-panel" className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">PR Prep</h3>
          <p className="mt-1 text-xs text-slate-500">
            Proposed title and description derived from the real run packet. This does not create a PR.
          </p>
        </div>
        <button
          type="button"
          onClick={savePrPrep}
          disabled={isSaving || !prPrep.available}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:bg-blue-900"
        >
          {isSaving ? 'Saving…' : 'Persist PR Prep'}
        </button>
      </div>

      {!prPrep.available && (
        <div className="mt-4 rounded border border-[#1e2430] bg-[#161b22] p-3 text-xs text-slate-400">
          {prPrep.blocker}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2 text-xs text-slate-400">
        <div className="rounded border border-[#1e2430] bg-[#161b22] p-3">Branch: {prPrep.branch ?? '—'}</div>
        <div className="rounded border border-[#1e2430] bg-[#161b22] p-3">
          Artifacts: {prPrep.titlePath} · {prPrep.descriptionPath}
        </div>
      </div>

      {status && <div className="mt-4 rounded border border-green-800/40 bg-green-900/20 p-3 text-xs text-green-300">{status}</div>}
      {error && <div className="mt-4 rounded border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-300">{error}</div>}
      <div className="mt-4">
        <PanelActionFeedback
          feedback={feedback}
          activeLabel={isSaving ? 'Persisting PR prep artifacts…' : null}
        />
      </div>

      <div className="mt-4">
        <div className="mb-1 text-xs text-slate-400">PR Title</div>
        <textarea
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={!prPrep.available}
          className="min-h-[72px] w-full rounded border border-[#1e2430] bg-[#161b22] p-3 text-sm text-slate-100 outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => copyText(title)}
          disabled={!prPrep.available}
          className="mt-2 rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600"
        >
          Copy Title
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-xs text-slate-400">PR Description</div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!prPrep.available}
          className="min-h-[240px] w-full rounded border border-[#1e2430] bg-[#161b22] p-3 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => copyText(description)}
          disabled={!prPrep.available}
          className="mt-2 rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600"
        >
          Copy Description
        </button>
      </div>
    </div>
  );
}
