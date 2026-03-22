'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ActionResultPanel } from '@/components/actions/ActionResultPanel';
import type { PipelineCommandResult, RunDerivedData, WorkerLaunchStatus } from '@/lib/types';
import { PanelActionFeedback, createActionFeedback, focusPanel, type ActionFeedbackState } from '@/components/run-detail/action-feedback';

interface RunActionsPanelProps {
  runId: string;
  derived: RunDerivedData;
}

function buildPrimaryWorkerAction(worker: WorkerLaunchStatus): {
  label: string;
  action: string | null;
  disabled: boolean;
  detail: string;
} {
  const startAction = worker.worker === 'claude' ? 'claude-start' : 'codex-start';
  const reconcileAction = worker.worker === 'claude' ? 'reconcile-claude-completion' : 'reconcile-codex-completion';
  const finishAction = worker.worker === 'claude' ? 'claude-finish' : 'codex-finish';

  if (!worker.active) {
    return {
      label: `${worker.label} not active yet`,
      action: null,
      disabled: true,
      detail: 'This worker is not the current owner yet.',
    };
  }
  if (worker.finishBlocker === null) {
    return {
      label: `Advance after ${worker.label} evidence`,
      action: finishAction,
      disabled: false,
      detail: 'Authoritative finish is ready now.',
    };
  }
  if (worker.evidenceReady && !worker.completionReady) {
    return {
      label: `Advance after ${worker.label} evidence`,
      action: reconcileAction,
      disabled: false,
      detail: 'Evidence exists, but the completion signal still needs bounded repair.',
    };
  }
  if (worker.waitingState === 'blocked') {
    return {
      label: `${worker.label} blocked`,
      action: null,
      disabled: true,
      detail: worker.finishBlocker ?? 'Worker is blocked.',
    };
  }
  return {
    label: worker.lastLaunchAttemptAt ? `Continue ${worker.label} flow` : `Start ${worker.label} work`,
    action: startAction,
    disabled: false,
    detail: worker.adapterConfigured
      ? 'Adapter config exists. Use the bounded worker start/continue flow.'
      : 'Adapter config is missing. Generate the handoff here, then continue the worker manually from the guided packet.',
  };
}

function WorkerCard({
  worker,
  onRunAction,
  activeAction,
}: {
  worker: WorkerLaunchStatus;
  onRunAction: (action: string) => void;
  activeAction: string | null;
}) {
  const primary = buildPrimaryWorkerAction(worker);
  const advancedActions =
    worker.worker === 'claude'
      ? [
          ['claude-prepare', 'Prepare only'],
          ['claude-start', 'Start / continue'],
          ['reconcile-claude-completion', 'Reconcile signal'],
          ['claude-finish', 'Finish'],
        ]
      : [
          ['codex-prepare', 'Prepare only'],
          ['codex-start', 'Start / continue'],
          ['reconcile-codex-completion', 'Reconcile signal'],
          ['codex-finish', 'Finish'],
        ];

  return (
    <div className="rounded border border-[#1e2430] bg-[#161b22] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-200">{worker.label}</div>
          <div className="mt-1 text-xs text-slate-500">
            {worker.active
              ? `State: ${worker.waitingState.replace(/_/g, ' ')} · adapter ${worker.adapterConfigured ? 'configured' : 'missing'}`
              : 'Waiting for the pipeline to route here.'}
          </div>
        </div>
        <span className="rounded border border-[#1e2430] bg-[#0f1117] px-2 py-1 text-[11px] uppercase tracking-wide text-slate-300">
          {worker.waitingState.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mt-3 rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs text-slate-300">
        <div>{primary.detail}</div>
        <div className="mt-2 text-slate-500">Handoff: {worker.handoffPath}</div>
        <div className="text-slate-500">Evidence: {worker.evidencePath}</div>
        <div className="text-slate-500">Completion: {worker.completionPath}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => primary.action && onRunAction(primary.action)}
          disabled={activeAction !== null || primary.disabled || !primary.action}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:bg-blue-900"
        >
          {activeAction === primary.action ? 'Running…' : primary.label}
        </button>
      </div>

      <details className="mt-4 rounded border border-[#1e2430] bg-[#0f1117] p-3">
        <summary className="cursor-pointer text-xs text-slate-300">Advanced worker controls</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {advancedActions.map(([action, label]) => (
            <button
              key={action}
              type="button"
              onClick={() => onRunAction(action)}
              disabled={activeAction !== null || !worker.active}
              className="rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:bg-slate-800"
            >
              {activeAction === action ? 'Running…' : label}
            </button>
          ))}
        </div>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
          {worker.handoffContent ?? '[handoff not generated yet]'}
        </pre>
        {worker.lastLaunchCommand && (
          <div className="mt-3 break-all text-xs text-amber-300">{worker.lastLaunchCommand}</div>
        )}
      </details>
    </div>
  );
}

export function RunActionsPanel({ runId, derived }: RunActionsPanelProps) {
  const router = useRouter();
  const [result, setResult] = useState<PipelineCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  const workers = useMemo(() => [derived.workerLaunch.claude, derived.workerLaunch.codex], [derived.workerLaunch]);

  async function runAction(action: string) {
    setActiveAction(action);
    setError(null);
    setResult(null);
    setFeedback(null);

    try {
      const response = await fetch('/api/pipeline/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: { runId } }),
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
      if (action === 'claude-finish') focusPanel('human-gates-panel');
      if (action === 'codex-finish') focusPanel('final-review-panel');
      setFeedback(
        createActionFeedback(
          action,
          true,
          action === 'claude-start'
            ? 'Claude handoff is ready and the run remains anchored here.'
            : action === 'claude-finish'
            ? 'Claude evidence was accepted and the next human gate is ready.'
            : action === 'codex-finish'
            ? 'Codex evidence was accepted and the final review packet is ready.'
            : action === 'continue-run'
            ? 'The bounded pipeline continuation completed for this run.'
            : 'The bounded automation action completed successfully.'
        )
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `${action} failed.`);
      setFeedback(createActionFeedback(action, false, actionError instanceof Error ? actionError.message : `${action} failed.`));
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div id="run-actions-panel" className="space-y-4">
      <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Automation Continuation</h3>
          <p className="mt-1 text-xs text-slate-500">
            Use bounded script-owned actions only. The primary controls reflect the current exact execution position.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runAction('build')}
            disabled={activeAction !== null}
            className="rounded-md bg-cyan-600 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-500 disabled:bg-cyan-900"
          >
            {activeAction === 'build' ? 'Building…' : 'Build'}
          </button>
          <button
            type="button"
            onClick={() => runAction('continue-run')}
            disabled={activeAction !== null || !derived.executionPosition.autoAdvanceEnabled}
            className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:bg-emerald-900"
          >
            {activeAction === 'continue-run' ? 'Continuing…' : 'Continue automation'}
          </button>
        </div>

        <div className="rounded border border-[#1e2430] bg-[#161b22] p-3 text-xs text-slate-400">
          Next automatic action: {derived.executionPosition.nextAutomaticAction ?? 'No bounded auto-advance is available right now.'}
        </div>

        <div className="mt-4 space-y-3">
          <PanelActionFeedback
            feedback={feedback}
            activeLabel={activeAction ? `Running ${activeAction}…` : null}
          />
          {activeAction && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Waiting for the script-owned action to return before enabling the next step.
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {workers.map((worker) => (
            <WorkerCard key={worker.worker} worker={worker} onRunAction={runAction} activeAction={activeAction} />
          ))}
        </div>
      </div>

      <ActionResultPanel result={result} error={error} title="Automation Action Result" />
    </div>
  );
}
