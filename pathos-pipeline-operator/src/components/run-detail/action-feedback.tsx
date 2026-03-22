'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type FeedbackTone = 'success' | 'error' | 'info';

export interface ActionFeedbackState {
  tone: FeedbackTone;
  title: string;
  detail: string;
  nextStep?: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  'save-task-spec': 'Save Task Spec',
  build: 'Build',
  'continue-run': 'Continue automation',
  'claude-prepare': 'Claude handoff preparation',
  'claude-start': 'Claude flow',
  'reconcile-claude-completion': 'Claude completion reconciliation',
  'claude-finish': 'Claude finish',
  approve: 'Visual approval',
  'reject-reopen': 'Reject and reopen implementation',
  'repair-pass': 'Repair pass request',
  'mark-invalid': 'Mark run invalid',
  revise: 'Repair pass request',
  'runtime-start': 'Runtime validation',
  'runtime-done': 'Runtime pass',
  'runtime-fail': 'Runtime failure recording',
  'codex-prepare': 'Codex handoff preparation',
  'codex-start': 'Codex flow',
  'reconcile-codex-completion': 'Codex completion reconciliation',
  'codex-finish': 'Codex finish',
  'final-review': 'Review packet refresh',
  'save-decision': 'Final judgment save',
  commit: 'Commit',
  'no-commit': 'No-commit closeout',
  'save-pr-prep': 'PR prep persistence',
  'save-runtime-validation': 'Runtime validation save',
  copy: 'Clipboard copy',
};

const SUCCESS_NEXT_STEPS: Record<string, string> = {
  'save-task-spec': 'Next: Build run inputs.',
  build: 'Next: start or monitor implementation from the generated handoff.',
  'continue-run': 'Next: follow the updated Current Focus instructions in the workspace.',
  'claude-prepare': 'Next: continue in Claude using the generated handoff.',
  'claude-start': 'Next: continue in Claude, then return here to reconcile or finish.',
  'reconcile-claude-completion': 'Next: finish Claude if the evidence is now accepted.',
  'claude-finish': 'Next: review the human gate now in focus.',
  approve: 'Next: runtime validation is now in focus below.',
  'reject-reopen': 'Next: return to implementation and repair the rejected change.',
  'repair-pass': 'Next: reopen the worker handoff and request a bounded repair pass.',
  'mark-invalid': 'Next: use recovery options. This run remains blocked and cannot advance.',
  revise: 'Next: return to the worker handoff and repair the implementation.',
  'runtime-start': 'Next: review the generated validation below, then confirm pass or fail.',
  'runtime-done': 'Next: Codex continuation is now in focus below.',
  'runtime-fail': 'Next: inspect the runtime evidence and decide whether to retry or repair.',
  'codex-prepare': 'Next: continue in Codex using the generated hardening packet.',
  'codex-start': 'Next: continue in Codex, then return here to reconcile or finish.',
  'reconcile-codex-completion': 'Next: finish Codex if the hardening evidence is now accepted.',
  'codex-finish': 'Next: final review is now in focus below.',
  'final-review': 'Next: review the refreshed packet and record the final judgment.',
  'save-decision': 'Next: use the bounded commit, no-commit, or repair action below.',
  commit: 'Next: use the saved PR prep packet for branch push and PR creation.',
  'no-commit': 'Next: the run can be closed without a commit.',
  'save-pr-prep': 'Next: reuse the saved title and description in your PR workflow.',
  'save-runtime-validation': 'Next: confirm pass or fail when the evidence is complete.',
  copy: 'Next: paste it into the external tool that needs it.',
};

export function createActionFeedback(
  action: string,
  ok: boolean,
  detail: string,
  overrideNextStep?: string | null
): ActionFeedbackState {
  const label = ACTION_LABELS[action] ?? action;
  return {
    tone: ok ? 'success' : 'error',
    title: ok ? `${label} succeeded.` : `${label} failed.`,
    detail,
    nextStep: overrideNextStep ?? (ok ? SUCCESS_NEXT_STEPS[action] ?? null : 'Next: review the detailed result panel and retry or switch to the fallback path.'),
  };
}

export function focusPanel(panelId: string) {
  window.setTimeout(() => {
    document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

export function PanelActionFeedback({
  feedback,
  activeLabel,
}: {
  feedback: ActionFeedbackState | null;
  activeLabel?: string | null;
}) {
  return (
    <>
      {activeLabel && (
        <div className="rounded border border-blue-800/40 bg-blue-900/20 p-3 text-xs text-blue-200">
          <div className="flex items-center gap-2 font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {activeLabel}
          </div>
          <div className="mt-1 text-blue-100/80">Working on the authoritative script action now.</div>
        </div>
      )}
      {feedback && (
        <div
          className={`rounded border p-3 text-xs ${
            feedback.tone === 'success'
              ? 'border-green-800/40 bg-green-900/20 text-green-200'
              : feedback.tone === 'error'
              ? 'border-red-800/40 bg-red-900/20 text-red-200'
              : 'border-blue-800/40 bg-blue-900/20 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.tone === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {feedback.title}
          </div>
          <div className="mt-1">{feedback.detail}</div>
          {feedback.nextStep && <div className="mt-2 text-current/80">{feedback.nextStep}</div>}
        </div>
      )}
    </>
  );
}
