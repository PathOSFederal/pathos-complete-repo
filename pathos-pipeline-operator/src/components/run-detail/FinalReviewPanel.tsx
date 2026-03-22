'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionResultPanel } from '@/components/actions/ActionResultPanel';
import type { CommitScopeData, FinalReviewData, PipelineCommandResult, PrPrepData } from '@/lib/types';
import { PanelActionFeedback, createActionFeedback, focusPanel, type ActionFeedbackState } from '@/components/run-detail/action-feedback';

interface FinalReviewPanelProps {
  runId: string;
  finalReview: FinalReviewData;
  commitScope: CommitScopeData;
  prPrep: PrPrepData;
}

type Decision = 'approve_for_commit' | 'no_commit' | 'repair_required';

export function FinalReviewPanel({ runId, finalReview, commitScope, prPrep }: FinalReviewPanelProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>(finalReview.decisionRecord?.decision ?? 'approve_for_commit');
  const [notes, setNotes] = useState(finalReview.decisionRecord?.notes ?? '');
  const [commitMessage, setCommitMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineCommandResult | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  useEffect(() => {
    setDecision(finalReview.decisionRecord?.decision ?? 'approve_for_commit');
    setNotes(finalReview.decisionRecord?.notes ?? '');
  }, [finalReview.decisionRecord]);

  async function saveDecision() {
    setActiveAction('save-decision');
    setError(null);
    setStatus(null);
    setFeedback(null);
    try {
      const response = await fetch(`/api/runs/${runId}/final-judgment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Unable to save final judgment.');
        setFeedback(createActionFeedback('save-decision', false, data?.error ?? 'Unable to save final judgment.'));
        return;
      }
      setStatus(`Saved final judgment at ${data.updatedAt}.`);
      router.refresh();
      setFeedback(createActionFeedback('save-decision', true, 'Final judgment was saved for this run.'));
      focusPanel('final-review-panel');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save final judgment.');
    } finally {
      setActiveAction(null);
    }
  }

  async function runCommand(action: 'final-review' | 'commit' | 'no-commit' | 'revise') {
    setActiveAction(action);
    setError(null);
    setStatus(null);
    setResult(null);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> =
        action === 'commit'
          ? { runId, message: commitMessage }
          : action === 'revise'
          ? { runId, notes }
          : { runId };
      const response = await fetch('/api/pipeline/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? data?.stderr ?? `${action} failed.`);
        if (data?.command) setResult(data as PipelineCommandResult);
        setFeedback(createActionFeedback(action, false, data?.error ?? data?.stderr ?? `${action} failed.`));
        return;
      }
      setResult(data as PipelineCommandResult);
      router.refresh();
      if (action === 'final-review') focusPanel('final-review-panel');
      setFeedback(
        createActionFeedback(
          action,
          true,
          action === 'commit'
            ? 'Commit completed for this run.'
            : action === 'no-commit'
            ? 'No-commit closeout was recorded for this run.'
            : action === 'revise'
            ? 'Repair routing was recorded from final review.'
            : 'The review packet was refreshed.'
        )
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `${action} failed.`);
      setFeedback(createActionFeedback(action, false, actionError instanceof Error ? actionError.message : `${action} failed.`));
    } finally {
      setActiveAction(null);
    }
  }

  const likelyRelevant = commitScope.changedFiles.filter((file) => file.category === 'likely_relevant');
  const suspicious = commitScope.changedFiles.filter((file) => file.category === 'suspicious');

  return (
    <div id="final-review-panel" className="space-y-4">
      <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Final Review Closing Sequence</h3>
            <p className="mt-1 text-xs text-slate-500">
              Review packet ready → ChatGPT judgment → bounded commit/no-commit → PR handoff.
            </p>
          </div>
          <button
            type="button"
            onClick={() => runCommand('final-review')}
            disabled={activeAction !== null || !finalReview.ready}
            className="rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:bg-slate-800"
          >
            {activeAction === 'final-review' ? 'Refreshing…' : 'Refresh review packet'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-4">
          <div className="rounded border border-[#1e2430] bg-[#161b22] p-3 text-xs">
            <div className="text-slate-500">Judgment state</div>
            <div className="mt-1 text-slate-200">
              {finalReview.awaitingJudgment ? 'Waiting on ChatGPT judgment' : `Recorded: ${finalReview.decisionRecord?.decision ?? 'none'}`}
            </div>
          </div>
          <div className="rounded border border-[#1e2430] bg-[#161b22] p-3 text-xs">
            <div className="text-slate-500">Next approval needed</div>
            <div className="mt-1 text-slate-200">{finalReview.nextApprovalNeeded}</div>
          </div>
          <div className="rounded border border-[#1e2430] bg-[#161b22] p-3 text-xs">
            <div className="text-slate-500">Commit readiness</div>
            <div className="mt-1 text-slate-200">{finalReview.commitBlocker ?? 'Approved for bounded commit.'}</div>
          </div>
          <div className="rounded border border-[#1e2430] bg-[#161b22] p-3 text-xs">
            <div className="text-slate-500">Push / PR readiness</div>
            <div className="mt-1 text-slate-200">{finalReview.pushGuidance}</div>
          </div>
        </div>

        <div className="mt-4">
          <PanelActionFeedback
            feedback={feedback}
            activeLabel={
              activeAction === 'save-decision'
                ? 'Saving final judgment…'
                : activeAction === 'final-review'
                ? 'Refreshing final review packet…'
                : activeAction === 'commit'
                ? 'Recording bounded commit…'
                : activeAction === 'no-commit'
                ? 'Recording no-commit closeout…'
                : activeAction === 'revise'
                ? 'Routing this run to repair…'
                : null
            }
          />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {finalReview.packet.map((packet) => (
            <details key={packet.label} className="rounded border border-[#1e2430] bg-[#161b22] p-3">
              <summary className="cursor-pointer text-xs text-slate-300">{packet.label}</summary>
              <div className="mt-2 break-all text-[11px] text-slate-500">{packet.path}</div>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
                {packet.content ?? '[missing]'}
              </pre>
            </details>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded border border-[#1e2430] bg-[#161b22] p-4">
            <div className="text-sm font-medium text-slate-200">Record ChatGPT Judgment</div>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              {[
                ['approve_for_commit', 'Approve for commit'],
                ['no_commit', 'No-commit'],
                ['repair_required', 'Repair required'],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="final-judgment"
                    value={value}
                    checked={decision === value}
                    onChange={() => setDecision(value as Decision)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-3 min-h-[120px] w-full rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs text-slate-100 outline-none focus:border-blue-500"
              placeholder="Record the external ChatGPT judgment notes here."
            />
            <button
              type="button"
              onClick={saveDecision}
              disabled={activeAction !== null || notes.trim().length === 0}
              className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:bg-blue-900"
            >
              {activeAction === 'save-decision' ? 'Saving…' : 'Save final judgment'}
            </button>
          </div>

          <div className="rounded border border-[#1e2430] bg-[#161b22] p-4">
            <div className="text-sm font-medium text-slate-200">Pre-Commit Scope Review</div>
            <div className={`mt-3 rounded border p-3 text-xs ${commitScope.warning ? 'border-amber-800/40 bg-amber-900/20 text-amber-300' : 'border-[#1e2430] bg-[#0f1117] text-slate-300'}`}>
              {commitScope.warning ?? 'No suspicious files detected for the current run packet.'}
            </div>
            <div className="mt-3 rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs text-slate-400">
              Exact command:
              <pre className="mt-2 whitespace-pre-wrap text-slate-200">{commitScope.exactCommitCommand}</pre>
              <div className="mt-2">Scope mode: full repo only. Arbitrary staging remains unavailable.</div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs">
                <div className="text-slate-500">Likely relevant files</div>
                <div className="mt-2 space-y-2 text-slate-300">
                  {likelyRelevant.length > 0 ? likelyRelevant.map((file) => (
                    <div key={file.path}>
                      <div>{file.status} {file.path}</div>
                      <div className="text-slate-500">{file.reason}</div>
                    </div>
                  )) : <div>None matched the current run packet.</div>}
                </div>
              </div>
              <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs">
                <div className="text-slate-500">Suspicious / unrelated files</div>
                <div className="mt-2 space-y-2 text-slate-300">
                  {suspicious.length > 0 ? suspicious.map((file) => (
                    <div key={file.path}>
                      <div>{file.status} {file.path}</div>
                      <div className="text-slate-500">{file.reason}</div>
                    </div>
                  )) : <div>None detected.</div>}
                </div>
              </div>
            </div>
            <textarea
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              className="mt-3 min-h-[88px] w-full rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs text-slate-100 outline-none focus:border-blue-500"
              placeholder="Commit message required for bounded GUI commit."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runCommand('commit')}
                disabled={activeAction !== null || !finalReview.commitAllowed || commitMessage.trim().length === 0}
                className="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-500 disabled:bg-green-900"
              >
                {activeAction === 'commit' ? 'Committing…' : 'Commit from GUI'}
              </button>
              <button
                type="button"
                onClick={() => runCommand('no-commit')}
                disabled={activeAction !== null || !finalReview.noCommitAllowed}
                className="rounded-md bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-500 disabled:bg-amber-900"
              >
                {activeAction === 'no-commit' ? 'Recording…' : 'No-commit from GUI'}
              </button>
              <button
                type="button"
                onClick={() => runCommand('revise')}
                disabled={activeAction !== null || !finalReview.repairAllowed || notes.trim().length === 0}
                className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:bg-red-900"
              >
                {activeAction === 'revise' ? 'Routing…' : 'Route to repair'}
              </button>
            </div>
            <div className="mt-3 rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs text-slate-400">
              Branch: {prPrep.branch ?? '—'} · PR title: {(prPrep.savedTitle ?? prPrep.generatedTitle) || '—'}
            </div>
          </div>
        </div>

        {status && <div className="mt-4 rounded border border-green-800/40 bg-green-900/20 p-3 text-xs text-green-300">{status}</div>}
        {error && <div className="mt-4 rounded border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-300">{error}</div>}
      </div>

      <ActionResultPanel result={result} error={null} title="Final Review Action Result" />
    </div>
  );
}
