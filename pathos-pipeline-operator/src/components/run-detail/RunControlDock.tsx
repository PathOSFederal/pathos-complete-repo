'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Play,
  Zap,
  Code2,
  User,
  Server,
  Wrench,
  XCircle,
  GitCommit,
  Save,
  ChevronRight,
  FileText,
} from 'lucide-react';
import type { PipelineCommandResult, RunDerivedData } from '@/lib/types';
import type { FocusState, FocusAction } from '@/lib/focus-state';
import {
  PanelActionFeedback,
  createActionFeedback,
  focusPanel,
  type ActionFeedbackState,
} from '@/components/run-detail/action-feedback';
import { useRunWorkspace } from '@/components/run-detail/RunWorkspaceContext';
import { cn } from '@/lib/utils';

interface RunControlDockProps {
  runId: string;
  status: string;
  derived: RunDerivedData;
  focus: FocusState | null;
  finalReviewPromptContent?: string | null;
  mode?: 'fixed' | 'embedded';
  stepContent?: ReactNode;
}

// ─── State badge ──────────────────────────────────────────────────────────────

type DockState =
  | 'ready'
  | 'running'
  | 'human_action'
  | 'blocked'
  | 'stale'
  | 'complete'
  | 'waiting';

function deriveDockState(
  runnerState: string,
  currentOwner: string,
  status: string,
): DockState {
  if (runnerState === 'blocked') return 'blocked';
  if (runnerState === 'stale') return 'stale';
  if (runnerState === 'complete') return 'complete';
  if (runnerState === 'ready_to_advance') return 'ready';
  if (runnerState === 'running') return 'running';
  if (
    currentOwner === 'human' ||
    currentOwner === 'ChatGPT' ||
    status === 'awaiting_visual_approval' ||
    status === 'ready_for_final_judgment' ||
    status === 'final_review'
  )
    return 'human_action';
  return 'waiting';
}

function StateBadge({ dockState }: { dockState: DockState }) {
  const cfg: Record<DockState, { cls: string; label: string; icon: React.ReactNode }> = {
    ready: {
      cls: 'bg-emerald-600 text-white border-emerald-500',
      label: 'READY',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    running: {
      cls: 'bg-blue-600 text-white border-blue-500',
      label: 'RUNNING',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    human_action: {
      cls: 'bg-amber-600 text-white border-amber-500',
      label: 'HUMAN ACTION',
      icon: <User className="h-3 w-3" />,
    },
    blocked: {
      cls: 'bg-red-700 text-white border-red-600',
      label: 'BLOCKED',
      icon: <AlertCircle className="h-3 w-3" />,
    },
    stale: {
      cls: 'bg-amber-700 text-white border-amber-600',
      label: 'STALE',
      icon: <Clock className="h-3 w-3" />,
    },
    complete: {
      cls: 'bg-slate-600 text-white border-slate-500',
      label: 'COMPLETE',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    waiting: {
      cls: 'bg-slate-700 text-white border-slate-600',
      label: 'WAITING',
      icon: <Clock className="h-3 w-3" />,
    },
  };

  const { cls, label, icon } = cfg[dockState];
  return (
    <div
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-bold tracking-wider border',
        cls,
      )}
    >
      {icon}
      {label}
    </div>
  );
}

// ─── Owner chip ───────────────────────────────────────────────────────────────

function OwnerChip({ owner }: { owner: string }) {
  const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
    Claude: {
      cls: 'border-blue-700/50 bg-blue-900/20 text-blue-300',
      icon: <Zap className="h-3 w-3" />,
    },
    Codex: {
      cls: 'border-purple-700/50 bg-purple-900/20 text-purple-300',
      icon: <Code2 className="h-3 w-3" />,
    },
    human: {
      cls: 'border-amber-700/50 bg-amber-900/20 text-amber-300',
      icon: <User className="h-3 w-3" />,
    },
    ChatGPT: {
      cls: 'border-amber-700/50 bg-amber-900/20 text-amber-300',
      icon: <User className="h-3 w-3" />,
    },
    system: {
      cls: 'border-slate-700/50 bg-slate-900/20 text-slate-300',
      icon: <Server className="h-3 w-3" />,
    },
  };
  const { cls, icon } = cfg[owner] ?? cfg['system'];
  return (
    <div
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs',
        cls,
      )}
    >
      {icon}
      {owner === 'ChatGPT' ? 'Human' : owner}
    </div>
  );
}

// ─── Button helpers ───────────────────────────────────────────────────────────

/** Resolve a copyContentKey to the actual clipboard string. */
function resolveCopyContent(
  key: FocusAction['copyContentKey'],
  derived: RunDerivedData,
  finalReviewPromptContent?: string | null,
): string | null {
  switch (key) {
    case 'claude_handoff':
      return derived.workerLaunch.claude.handoffContent;
    case 'codex_handoff':
      return derived.workerLaunch.codex.handoffContent;
    case 'final_review_prompt':
      return finalReviewPromptContent ?? null;
    default:
      return null;
  }
}

function iconForKey(key: string): React.ReactNode {
  switch (key) {
    case 'save-task-spec':
      return <Save className="h-3.5 w-3.5" />;
    case 'build':
    case 'continue':
      return <Play className="h-3.5 w-3.5" />;
    case 'copy-claude-handoff':
      return <Zap className="h-3.5 w-3.5" />;
    case 'copy-codex-handoff':
      return <Code2 className="h-3.5 w-3.5" />;
    case 'approve':
    case 'runtime-done':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case 'commit':
      return <GitCommit className="h-3.5 w-3.5" />;
    case 'no-commit':
      return <XCircle className="h-3.5 w-3.5" />;
    case 'open-worker-controls':
    case 'route-repair':
      return <Wrench className="h-3.5 w-3.5" />;
    case 'save-judgment':
      return <Save className="h-3.5 w-3.5" />;
    case 'open-task-spec':
    case 'edit-spec':
      return <FileText className="h-3.5 w-3.5" />;
    case 'copy-final-review':
      return <Copy className="h-3.5 w-3.5" />;
    default:
      return <ChevronRight className="h-3.5 w-3.5" />;
  }
}

function focusVariantToClass(
  variant: FocusAction['variant'],
  disabled: boolean,
): string {
  if (disabled)
    return 'inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-medium text-slate-600 border border-slate-700/40 bg-slate-900/20 cursor-not-allowed opacity-50';
  switch (variant) {
    case 'green':
      return 'inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold text-white border border-emerald-600 bg-emerald-700 hover:bg-emerald-600 transition-colors';
    case 'amber':
      return 'inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold text-white border border-amber-600 bg-amber-700 hover:bg-amber-600 transition-colors';
    case 'red':
      return 'inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold text-white border border-red-700 bg-red-800 hover:bg-red-700 transition-colors';
    case 'secondary':
      return 'inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-medium text-slate-200 border border-[#2c3b4f] bg-[#111c2a] hover:bg-[#162335] transition-colors';
    case 'muted':
    default:
      return 'inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-medium text-slate-400 border border-slate-700/40 bg-slate-900/20 hover:text-slate-200 hover:border-slate-600 transition-colors';
  }
}

// ─── Dock component ───────────────────────────────────────────────────────────

export function RunControlDock({
  runId,
  status,
  derived,
  focus,
  finalReviewPromptContent,
  mode = 'fixed',
  stepContent = null,
}: RunControlDockProps) {
  const router = useRouter();
  const workspace = useRunWorkspace();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineCommandResult | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const { executionPosition } = derived;
  const dockState = deriveDockState(
    executionPosition.runnerState,
    executionPosition.currentOwner,
    status,
  );
  const nextAction =
    executionPosition.nextAutomaticAction ?? executionPosition.nextHumanAction;

  function setMainFeedback(actionLabel: string, ok: boolean, detail: string, nextStep: string | null) {
    const fb = createActionFeedback(actionLabel, ok, detail, nextStep);
    setFeedback(fb);
    workspace?.setLastActionFeedback(fb);
  }

  async function runAction(action: string, actionKey: string) {
    setActiveAction(actionKey);
    setFeedback(null);
    setError(null);
    setResult(null);
    workspace?.setLastActionFeedback(null);
    try {
      // Save Task Spec is handled by task API, not pipeline command
      if (actionKey === 'save-task-spec') {
        const content = workspace?.taskSpecDraft ?? '';
        const res = await fetch(`/api/runs/${runId}/task`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = data?.error ?? 'Unable to save task spec.';
          setError(msg);
          setMainFeedback('save-task-spec', false, msg, null);
          return;
        }
        const nextStep = focus?.postActionMessages?.['save-task-spec'] ?? 'Next step: Build run inputs.';
        setMainFeedback('save-task-spec', true, 'Task spec saved successfully.', nextStep);
        router.refresh();
        setActiveAction(null);
        return;
      }

      const res = await fetch('/api/pipeline/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: { runId } }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error ?? data?.stderr ?? `${action} failed.`;
        setError(msg);
        if (data?.command) setResult(data as PipelineCommandResult);
        setMainFeedback(action, false, msg, null);
        return;
      }
      setResult(data as PipelineCommandResult);
      const successMsg =
        focus?.postActionMessages?.[actionKey] ??
        focus?.postActionMessages?.[action] ??
        'Action complete.';
      setMainFeedback(action, true, successMsg, successMsg);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : `${action} failed.`;
      setError(msg);
      setMainFeedback(action, false, msg, null);
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCopy(label: string, text: string, actionKey: string) {
    await navigator.clipboard.writeText(text);
    const msg =
      focus?.postActionMessages?.[actionKey] ?? `${label} copied to clipboard.`;
    setCopyMsg(msg);
    window.setTimeout(() => setCopyMsg(null), 2400);
  }

  async function copyNextAction() {
    if (!nextAction) return;
    await navigator.clipboard.writeText(nextAction);
    setCopyMsg('Next action copied');
    window.setTimeout(() => setCopyMsg(null), 1800);
  }

  const isBlocked = executionPosition.runnerState === 'blocked';
  const primaryAction = focus?.primaryAction ?? null;
  const secondaryActions = (focus?.secondaryActions ?? []).slice(0, 2);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!primaryActionRef.current || !primaryAction || activeAction !== null) return;
    primaryActionRef.current.focus({ preventScroll: true });
  }, [activeAction, primaryAction?.key]);

  return (
    <div
      id={mode === 'embedded' ? 'current-step-workspace' : undefined}
      className={cn(
        mode === 'fixed'
          ? 'fixed bottom-4 right-4 z-30 w-[420px] max-w-[calc(100vw-2rem)]'
          : 'w-full'
      )}
    >
      <div className="rounded-2xl border border-[#243142] bg-[#0b1118] shadow-2xl">
        <div className="border-b border-[#1b2635] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500">Current Step</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                Step {focus?.stepNumber ?? '—'} of {focus?.totalSteps ?? '—'} — {focus?.stepLabel ?? 'Run'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StateBadge dockState={dockState} />
              <OwnerChip owner={executionPosition.currentOwner} />
            </div>
          </div>
          <div className="mt-2 text-sm text-slate-300">{focus?.purpose ?? focus?.focusDetail}</div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">What You Need Right Now</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(focus?.neededNow ?? []).map((item) => (
                <span key={item} className="rounded-md border border-[#2b3a4c] bg-[#111a24] px-2.5 py-1 text-xs text-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">What To Do Now</div>
            <div className="mt-1 text-sm text-slate-200">{focus?.whatToDoNow ?? nextAction ?? 'Follow the current workspace guidance.'}</div>
            <div className="mt-1 text-xs text-slate-500">Where to go: {focus?.whereToGo ?? 'Current workspace panel'}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-widest text-amber-400">Next Action</div>
            <div className="mt-2">
              {primaryAction ? (
                (() => {
                  const isRunning = activeAction === primaryAction.key;
                  const isAnyRunning = activeAction !== null;
                  const disabled = (isAnyRunning && !!primaryAction.action) || !!primaryAction.disabled;
                  const copyText = primaryAction.copyContentKey
                    ? resolveCopyContent(primaryAction.copyContentKey, derived, finalReviewPromptContent)
                    : undefined;
                  const shouldEmphasize = !disabled && activeAction === null;

                  return (
                    <button
                      ref={primaryActionRef}
                      type="button"
                      disabled={disabled}
                      title={primaryAction.disabledReason}
                      className={cn(
                        focusVariantToClass(primaryAction.variant, disabled),
                        'w-full justify-center py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/80 focus:ring-offset-2 focus:ring-offset-[#0b1118]',
                        shouldEmphasize &&
                          'ring-2 ring-amber-400/80 ring-offset-2 ring-offset-[#0b1118] shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_0_28px_rgba(251,191,36,0.18)] animate-pulse'
                      )}
                      onClick={() => {
                        if (primaryAction.key === 'save-task-spec') return void runAction('save-task-spec', 'save-task-spec');
                        if (primaryAction.action) return void runAction(primaryAction.action, primaryAction.key);
                        if (primaryAction.focusId) {
                          focusPanel(primaryAction.focusId);
                          const msg = focus?.postActionMessages?.[primaryAction.key];
                          if (msg) {
                            setCopyMsg(msg);
                            window.setTimeout(() => setCopyMsg(null), 2400);
                          }
                          return;
                        }
                        if (primaryAction.copyContentKey && copyText) {
                          return void handleCopy(primaryAction.label, copyText, primaryAction.key);
                        }
                      }}
                    >
                      {shouldEmphasize && <span className="mr-1 rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">Next</span>}
                      {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : iconForKey(primaryAction.key)}
                      {isRunning ? 'Working…' : primaryAction.label}
                    </button>
                  );
                })()
              ) : (
                <div className="rounded-lg border border-[#243142] bg-[#0f1720] px-3 py-3 text-sm text-slate-400">
                  No direct action is required right now.
                </div>
              )}
            </div>
          </div>

          {secondaryActions.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500">Secondary Actions</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {secondaryActions.map((btn) => {
                  const isRunning = activeAction === btn.key;
                  const isAnyRunning = activeAction !== null;
                  const disabled = (isAnyRunning && !!btn.action) || !!btn.disabled;
                  const copyText = btn.copyContentKey
                    ? resolveCopyContent(btn.copyContentKey, derived, finalReviewPromptContent)
                    : undefined;
                  return (
                    <button
                      key={btn.key}
                      type="button"
                      disabled={disabled}
                      title={btn.disabledReason}
                      className={focusVariantToClass(btn.variant, disabled)}
                      onClick={() => {
                        if (btn.key === 'save-task-spec') return void runAction('save-task-spec', 'save-task-spec');
                        if (btn.action) return void runAction(btn.action, btn.key);
                        if (btn.focusId) {
                          focusPanel(btn.focusId);
                          const msg = focus?.postActionMessages?.[btn.key];
                          if (msg) {
                            setCopyMsg(msg);
                            window.setTimeout(() => setCopyMsg(null), 2400);
                          }
                          return;
                        }
                        if (btn.copyContentKey && copyText) {
                          return void handleCopy(btn.label, copyText, btn.key);
                        }
                      }}
                    >
                      {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : iconForKey(btn.key)}
                      {isRunning ? 'Working…' : btn.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Completion Condition</div>
            <div className="mt-1 text-sm text-slate-200">{focus?.completionCondition ?? 'The current step must be validated before the run advances.'}</div>
          </div>

          {stepContent && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500">Current Step Content</div>
              <div className="mt-2 rounded-xl border border-[#1b2635] bg-[#0f1720] p-4">
                {stepContent}
              </div>
            </div>
          )}

          <div className="min-h-[16px] text-xs">
            {nextAction && (
              <button
                type="button"
                onClick={copyNextAction}
                className="mb-2 inline-flex items-center gap-1.5 rounded border border-[#243142] bg-[#0f1720] px-2.5 py-1.5 text-xs text-slate-300 hover:text-slate-100 transition-colors"
              >
                <span className="text-slate-500">Copy next action</span>
                <Copy className="h-3 w-3 text-slate-600" />
              </button>
            )}
            {isBlocked && !error && !feedback && (
              <span className="inline-flex items-center gap-1 text-red-400">
                <XCircle className="h-3 w-3" />
                Resolve the blocker before advancing
              </span>
            )}
            {copyMsg && <span className="text-emerald-400">{copyMsg}</span>}
            {activeAction && (
              <span className="inline-flex items-center gap-1.5 text-cyan-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                Working…
              </span>
            )}
            {error && <span className="text-red-300">{error}</span>}
            {result?.stderr && !error && (
              <span className="text-amber-300">{result.stderr}</span>
            )}
            {feedback && !activeAction && (
              <PanelActionFeedback feedback={feedback} activeLabel={null} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
