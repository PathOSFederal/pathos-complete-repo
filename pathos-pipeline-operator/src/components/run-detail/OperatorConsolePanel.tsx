'use client';

import { useState } from 'react';
import {
  Zap,
  Circle,
  FileText,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import type { ExactExecutionPosition, ExecutionTraceEntry, WorkerLaunchStatus } from '@/lib/types';
import type { FocusState } from '@/lib/focus-state';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface OperatorConsolePanelProps {
  executionPosition: ExactExecutionPosition;
  trace: ExecutionTraceEntry[];
  claude: WorkerLaunchStatus;
  codex: WorkerLaunchStatus;
  finalReviewPromptPath: string;
  finalReviewPromptContent: string | null;
  runId: string;
  focus: FocusState;
}

function traceBadgeClass(result: string): string {
  const r = result.toLowerCase();
  if (
    r.includes('complete') ||
    r.includes('valid') ||
    r.includes('pass') ||
    r.includes('success') ||
    r.includes('done')
  )
    return 'bg-emerald-900/40 text-emerald-400';
  if (
    r.includes('process') ||
    r.includes('running') ||
    r.includes('began') ||
    r.includes('started') ||
    r.includes('checking') ||
    r.includes('initiated')
  )
    return 'bg-blue-900/40 text-blue-400';
  if (
    r.includes('repair') ||
    r.includes('waiting') ||
    r.includes('ready') ||
    r.includes('pending') ||
    r.includes('repairable')
  )
    return 'bg-amber-900/40 text-amber-400';
  if (r.includes('fail') || r.includes('error') || r.includes('block'))
    return 'bg-red-900/40 text-red-400';
  return 'bg-slate-800/60 text-slate-400';
}

function actorClass(actor: string): string {
  const a = actor.toLowerCase();
  if (a === 'claude') return 'text-blue-300';
  if (a === 'codex') return 'text-purple-300';
  if (a === 'human') return 'text-amber-300';
  return 'text-cyan-300'; // system
}

function buildNarrative(
  executionPosition: ExactExecutionPosition,
  claude: WorkerLaunchStatus,
  codex: WorkerLaunchStatus,
  focus: FocusState,
): Array<{ title: string; detail: string; tone: 'info' | 'success' | 'warn' | 'error' }> {
  const items: Array<{ title: string; detail: string; tone: 'info' | 'success' | 'warn' | 'error' }> = [];

  items.push({
    title: 'Current step',
    detail: `Step ${focus.stepNumber} of ${focus.totalSteps} — ${focus.stepLabel}`,
    tone: executionPosition.runnerState === 'blocked' ? 'error' : executionPosition.runnerState === 'ready_to_advance' ? 'success' : 'info',
  });

  items.push({
    title: 'What is happening now',
    detail: focus.purpose,
    tone: 'info',
  });

  if (focus.stepLabel === 'Implementation' && claude.handoffExists) {
    items.push({
      title: 'Claude handoff',
      detail: claude.evidenceExists
        ? 'A `current.md` artifact exists; the system is still checking whether it is valid.'
        : 'Claude handoff exists and the system is still waiting for implementation evidence.',
      tone: claude.evidenceExists ? 'warn' : 'info',
    });
  }

  if (focus.stepLabel === 'Evidence Check' || focus.stateKey === 'repair') {
    items.push({
      title: 'Implementation evidence',
      detail: focus.completionCondition,
      tone: focus.stateKey === 'repair' ? 'warn' : 'success',
    });
  }

  if (codex.handoffExists || codex.evidenceExists) {
    items.push({
      title: 'Codex status',
      detail: codex.evidenceReady
        ? 'Codex hardening evidence is present.'
        : codex.handoffExists
        ? 'Codex handoff is ready and waiting for review evidence.'
        : 'Codex has not started yet.',
      tone: codex.evidenceReady ? 'success' : 'info',
    });
  }

  if (executionPosition.nextAutomaticAction && focus.stepLabel !== 'Implementation') {
    items.push({
      title: 'What the system tries next',
      detail: executionPosition.nextAutomaticAction,
      tone: 'info',
    });
  }

  if (focus.whatToDoNow) {
    items.push({
      title: 'What the operator must do next',
      detail: focus.whatToDoNow,
      tone: executionPosition.runnerState === 'blocked' ? 'error' : 'warn',
    });
  }

  return items.slice(0, 6);
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueCyan?: boolean;
}

function InfoRow({ icon, label, value, valueCyan }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#111820] last:border-b-0">
      <div className="mt-0.5 flex-shrink-0 text-slate-600">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-0.5">{label}</div>
        <div className={cn('text-sm leading-snug', valueCyan ? 'text-cyan-400' : 'text-slate-200')}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function OperatorConsolePanel({
  executionPosition,
  trace,
  claude,
  codex,
  finalReviewPromptContent,
  runId,
  focus,
}: OperatorConsolePanelProps) {
  const [traceOpen, setTraceOpen] = useState(true);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const isBlocked = executionPosition.runnerState === 'blocked';
  const narrative = buildNarrative(executionPosition, claude, codex, focus);

  async function handleCopy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopyMsg(`${label} copied`);
    window.setTimeout(() => setCopyMsg(null), 1800);
  }

  const copyItems = [
    { label: 'Claude handoff', content: claude.handoffContent },
    { label: 'Codex handoff', content: codex.handoffContent },
    { label: 'Final review prompt', content: finalReviewPromptContent },
  ].filter((x) => x.content);

  return (
    <div className="bg-[#0b1016] rounded-xl border border-[#1e2836] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#18212c]">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-200">Operator Console</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Inline copy buttons */}
          {copyItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleCopy(item.label, item.content!)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
              title={`Copy ${item.label}`}
            >
              <Copy className="h-3 w-3" />
              {item.label}
            </button>
          ))}
          {copyMsg && <span className="text-[11px] text-emerald-400">{copyMsg}</span>}
          <span className="text-xs text-slate-600 font-mono truncate max-w-[160px]">{runId}</span>
        </div>
      </div>

      <div className="border-b border-[#18212c] px-4 py-3">
        <div className="mb-2 text-xs font-semibold text-slate-200">Live Narrative</div>
        <div className="space-y-2">
          {narrative.map((item) => (
            <div
              key={item.title}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                item.tone === 'success'
                  ? 'border-emerald-800/40 bg-emerald-900/10 text-emerald-200'
                  : item.tone === 'warn'
                  ? 'border-amber-800/40 bg-amber-900/10 text-amber-200'
                  : item.tone === 'error'
                  ? 'border-red-800/40 bg-red-900/10 text-red-200'
                  : 'border-[#1e2430] bg-[#101721] text-slate-200',
              )}
            >
              <div className="text-[10px] uppercase tracking-widest text-current/70">{item.title}</div>
              <div className="mt-1">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-1 pb-0">
        <InfoRow
          icon={<Zap className="h-3.5 w-3.5" />}
          label="What's happening now"
          value={executionPosition.liveStatusSentence}
        />

        {executionPosition.lastCompletedStep && (
          <InfoRow
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Last completed"
            value={executionPosition.lastCompletedStep}
          />
        )}

        {executionPosition.currentArtifact && (
          <InfoRow
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Current artifact"
            value={executionPosition.currentArtifact.label}
            valueCyan
          />
        )}

        {executionPosition.currentWaitReason && (
          <InfoRow
            icon={<Circle className="h-3.5 w-3.5" />}
            label="Current wait reason"
            value={executionPosition.currentWaitReason}
          />
        )}

        {executionPosition.nextAutomaticAction && (
          <InfoRow
            icon={<ArrowRight className="h-3.5 w-3.5" />}
            label="Next automatic action"
            value={executionPosition.nextAutomaticAction}
          />
        )}

        {executionPosition.nextHumanAction && (
          <InfoRow
            icon={<Circle className="h-3.5 w-3.5" />}
            label="Next human action"
            value={executionPosition.nextHumanAction}
          />
        )}
      </div>

      {/* Failure detected panel */}
      {isBlocked && (
        <div className="mx-4 mt-3 mb-2 rounded-lg border border-red-800/40 bg-red-900/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-300">Failure Detected</span>
          </div>
          <div className="space-y-3 text-xs">
            {executionPosition.currentBlocker && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-red-600 mb-0.5">Summary</div>
                <div className="text-red-200">{executionPosition.currentBlocker}</div>
              </div>
            )}
            {executionPosition.currentWaitReason && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-red-600 mb-0.5">Reason</div>
                <div className="text-red-200/80">{executionPosition.currentWaitReason}</div>
              </div>
            )}
            {executionPosition.nextHumanAction && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-red-600 mb-0.5">Exact Fix</div>
                <div className="text-red-200/80">{executionPosition.nextHumanAction}</div>
              </div>
            )}
            {executionPosition.nextAutomaticAction && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-red-600 mb-0.5">Next Step</div>
                <div className="text-red-200">{executionPosition.nextAutomaticAction}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-[#18212c] mt-2">
        <button
          type="button"
          onClick={() => setTraceOpen(!traceOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-[#0f1620] transition-colors"
        >
          <div className="flex items-center gap-2 text-slate-300">
            {traceOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            )}
            <span className="font-medium">Raw Technical Trace</span>
          </div>
          <span className="text-slate-500">{trace.length} entries</span>
        </button>

        {traceOpen && (
          <div className="max-h-72 overflow-y-auto border-t border-[#111820]">
            {trace.length === 0 && (
              <div className="px-4 py-5 text-center text-xs text-slate-600">No trace entries yet.</div>
            )}
            {trace.map((entry, i) => (
              <div
                key={`${entry.timestamp ?? 'none'}-${entry.action}-${i}`}
                className="grid grid-cols-[100px_76px_1fr_96px] items-start gap-2 px-4 py-2 border-b border-[#111820] last:border-b-0 text-xs hover:bg-[#0d1320]"
              >
                <div className="text-[10px] text-slate-600 font-mono leading-4 mt-0.5">
                  {entry.timestamp ? formatDateTime(entry.timestamp) : '—'}
                </div>
                <div className={cn('flex items-center gap-1', actorClass(entry.actor))}>
                  <span className="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm border border-current/30 text-[8px] uppercase">
                    {entry.actor.charAt(0)}
                  </span>
                  <span className="truncate">{entry.actor}</span>
                </div>
                <div className="text-slate-300 leading-4">{entry.action}</div>
                <div className="text-right">
                  <span
                    className={cn(
                      'inline-block px-1.5 py-0.5 rounded text-[10px] font-medium',
                      traceBadgeClass(entry.result),
                    )}
                  >
                    {entry.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
