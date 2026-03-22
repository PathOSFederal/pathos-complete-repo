'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ActionResultPanel } from '@/components/actions/ActionResultPanel';
import type { PipelineCommandResult, RunDerivedData } from '@/lib/types';
import { PanelActionFeedback, createActionFeedback, focusPanel, type ActionFeedbackState } from '@/components/run-detail/action-feedback';

interface HumanGatesPanelProps {
  runId: string;
  derived: RunDerivedData;
  returnToRunHref?: string | null;
}

export function HumanGatesPanel({ runId, derived, returnToRunHref = null }: HumanGatesPanelProps) {
  const router = useRouter();
  const runtimeRequired = derived.lifecycle.some((step) => step.id === 'runtime' && step.state !== 'skipped');
  const [result, setResult] = useState<PipelineCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [repairNotes, setRepairNotes] = useState('Repair visual issues and rerun the implementation pass.');
  const [invalidNotes, setInvalidNotes] = useState('No real implementation is present for review.');
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  async function runAction(action: string, payload: Record<string, unknown> = {}) {
    setActiveAction(action);
    setError(null);
    setResult(null);
    setFeedback(null);
    try {
      const response = await fetch('/api/pipeline/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: { runId, ...payload } }),
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
      if (action === 'approve') {
        focusPanel('current-step-workspace');
      } else {
        focusPanel('current-step-workspace');
      }
      setFeedback(
        createActionFeedback(
          action,
          true,
          action === 'approve'
            ? runtimeRequired
              ? 'Visual approval was recorded. Runtime validation is the next gate.'
              : 'Visual approval was recorded. Runtime validation is not required for this task. Advancing to Codex Hardening.'
            : action === 'reject-reopen'
            ? 'Visual review was rejected and implementation was reopened.'
            : action === 'repair-pass'
            ? 'Repair pass requested. The run did not advance.'
            : 'Run marked invalid and blocked from further advancement.'
        )
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `${action} failed.`);
      setFeedback(createActionFeedback(action, false, actionError instanceof Error ? actionError.message : `${action} failed.`));
    } finally {
      setActiveAction(null);
    }
  }

  const showVisual = derived.lifecycle.some((step) => step.id === 'visual' && step.state !== 'skipped');
  return (
    <div id="human-gates-panel" className="space-y-4">
      <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Human Gates</h3>
          <p className="mt-1 text-xs text-slate-500">
            Only true human gates stay here. Runtime validation controls now live inside the runtime panel itself.
          </p>
          <button
            type="button"
            onClick={() => {
              if (returnToRunHref) {
                router.push(returnToRunHref);
                return;
              }
              focusPanel('current-step-workspace');
            }}
            className="mt-3 rounded-md border border-[#2c3b4f] bg-[#111c2a] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-[#162335]"
          >
            Return to Active Run
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {showVisual && (
            <div className="rounded border border-[#1e2430] bg-[#161b22] p-4">
              <div className="text-sm font-medium text-slate-200">Visual Review</div>
              <p className="mt-1 text-xs text-slate-400">
                Choose an explicit visual gate outcome. Repair and invalid paths do not advance this run.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runAction('approve')}
                  disabled={activeAction !== null}
                  className="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-500 disabled:bg-green-900"
                >
                  {activeAction === 'approve' ? 'Approving…' : 'Approve Visual Review'}
                </button>
                <button
                  type="button"
                  onClick={() => runAction('reject-reopen', { notes: repairNotes })}
                  disabled={activeAction !== null || repairNotes.trim().length === 0}
                  className="rounded-md bg-red-700 px-3 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:bg-red-900"
                >
                  {activeAction === 'reject-reopen' ? 'Reopening…' : 'Reject And Reopen'}
                </button>
                <button
                  type="button"
                  onClick={() => runAction('repair-pass', { notes: repairNotes })}
                  disabled={activeAction !== null || repairNotes.trim().length === 0}
                  className="rounded-md bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-500 disabled:bg-amber-900"
                >
                  {activeAction === 'repair-pass' ? 'Requesting…' : 'Request Repair Pass'}
                </button>
              </div>
              <PanelActionFeedback
                feedback={feedback}
                activeLabel={
                  activeAction === 'approve'
                    ? 'Recording visual approval…'
                    : activeAction === 'reject-reopen'
                    ? 'Reopening implementation from visual review…'
                    : activeAction === 'repair-pass'
                    ? 'Requesting a repair pass without advancing…'
                    : activeAction === 'mark-invalid'
                    ? 'Marking this run invalid…'
                    : null
                }
              />
              <textarea
                value={repairNotes}
                onChange={(event) => setRepairNotes(event.target.value)}
                className="mt-3 min-h-[90px] w-full rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs text-slate-100 outline-none focus:border-blue-500"
                placeholder="Explain what failed in visual review or what must be repaired."
              />
              <div className="mt-3 rounded border border-red-800/40 bg-red-950/20 p-3">
                <div className="text-xs font-medium text-red-200">Invalid run path</div>
                <p className="mt-1 text-xs text-red-200/80">
                  Use this when the page is wrong, 404s, no code exists, or the evidence is fake/scaffold-only.
                </p>
                <textarea
                  value={invalidNotes}
                  onChange={(event) => setInvalidNotes(event.target.value)}
                  className="mt-2 min-h-[72px] w-full rounded border border-red-900/50 bg-[#0f1117] p-3 text-xs text-slate-100 outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={() => runAction('mark-invalid', { notes: invalidNotes })}
                  disabled={activeAction !== null || invalidNotes.trim().length === 0}
                  className="mt-2 rounded-md bg-red-800 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:bg-red-950"
                >
                  {activeAction === 'mark-invalid' ? 'Blocking…' : 'Mark Run Invalid'}
                </button>
              </div>
              {activeAction && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Staying on this run while the gate action completes.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ActionResultPanel result={result} error={error} title="Human Gate Result" />
    </div>
  );
}
