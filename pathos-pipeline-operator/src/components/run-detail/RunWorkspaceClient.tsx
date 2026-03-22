'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { RunDetail, RunDerivedData } from '@/lib/types';
import type { FocusState } from '@/lib/focus-state';
import { RunWorkspaceProvider, useRunWorkspace } from '@/components/run-detail/RunWorkspaceContext';
import { RunTruthBar } from '@/components/run-detail/RunTruthBar';
import { WorkspaceContextRail } from '@/components/run-detail/WorkspaceContextRail';
import { HumanGatesPanel } from '@/components/run-detail/HumanGatesPanel';
import { ArtifactsPanel } from '@/components/run-detail/ArtifactsPanel';
import { TaskSpecEditor } from '@/components/run-detail/TaskSpecEditor';
import { RuntimeValidationPanel } from '@/components/run-detail/RuntimeValidationPanel';
import { FinalReviewPanel } from '@/components/run-detail/FinalReviewPanel';
import { PrPrepPanel } from '@/components/run-detail/PrPrepPanel';
import { RunControlDock } from '@/components/run-detail/RunControlDock';
import { formatRelativeTime } from '@/lib/utils';
import type { ArtifactPreview } from '@/lib/types';
import { focusPanel } from '@/components/run-detail/action-feedback';

function getPreview(name: string, artifactPreviewFiles: ArtifactPreview[]) {
  return artifactPreviewFiles.find((file) => file.name === name) ?? null;
}

function StepArtifactPreview({
  title,
  artifact,
  emptyMessage,
}: {
  title: string;
  artifact: ArtifactPreview | null;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border border-[#1e2430] bg-[#0b1116] p-4">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      {artifact ? (
        <>
          <div className="mt-1 text-xs text-slate-500">{artifact.path}</div>
          {artifact.previewable ? (
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-[#1e2430] bg-[#111821] p-3 text-xs text-slate-300">
              {artifact.content}
            </pre>
          ) : (
            <div className="mt-3 text-xs text-slate-500">{artifact.previewError ?? 'Preview unavailable.'}</div>
          )}
        </>
      ) : (
        <div className="mt-2 text-sm text-slate-400">{emptyMessage}</div>
      )}
    </div>
  );
}

const FILE_REASON: Record<string, string> = {
  'task.md': 'This is the authoritative task input the system uses to decide whether Build can unlock.',
  'claude-handoff.md': 'This is the exact handoff packet for the current Claude implementation step.',
  'runtime-validation.md': 'This is the runtime confirmation artifact for the active gate.',
  'codexReview.md': 'This is the review artifact Codex must produce before final review.',
  'codex-handoff.md': 'This is the exact handoff packet for the current Codex hardening step.',
  'current.md': 'This is the implementation evidence the current gate is evaluating.',
};

function expectedArtifactPath(name: string, paths: RunDetail['paths']): string {
  switch (name) {
    case 'task.md':
      return paths.taskSpec;
    case 'claude-handoff.md':
      return paths.claudeHandoff;
    case 'runtime-validation.md':
      return paths.runtimeValidation;
    case 'codexReview.md':
      return paths.codexReview;
    case 'codex-handoff.md':
      return paths.codexHandoff;
    case 'current.md':
      return paths.currentArtifact;
    default:
      return '';
  }
}

function CurrentStepFileGuidance({
  artifact,
}: {
  artifact: Pick<ArtifactPreview, 'name' | 'path' | 'content'> | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!artifact) return null;

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4">
      <div className="text-[11px] uppercase tracking-widest text-cyan-400">Use This File Now</div>
      <div className="mt-2 text-sm font-semibold text-slate-100">{artifact.name}</div>
      <div className="mt-1 text-xs text-slate-300">{FILE_REASON[artifact.name] ?? 'This artifact is the most relevant file for the current step.'}</div>
      <div className="mt-2 text-[11px] text-slate-500 break-all">{artifact.path}</div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => focusPanel('current-step-workspace')}
          className="rounded-md border border-[#2c3b4f] bg-[#111c2a] px-3 py-2 text-slate-200 hover:bg-[#162335]"
        >
          Open
        </button>
        {artifact.content && (
          <button
            type="button"
            onClick={() => copyText(artifact.content ?? '', 'contents')}
            className="rounded-md border border-[#2c3b4f] bg-[#111c2a] px-3 py-2 text-slate-200 hover:bg-[#162335]"
          >
            Copy contents
          </button>
        )}
        <button
          type="button"
          onClick={() => copyText(artifact.path, 'path')}
          className="rounded-md border border-[#2c3b4f] bg-[#111c2a] px-3 py-2 text-slate-200 hover:bg-[#162335]"
        >
          Copy path
        </button>
        <button
          type="button"
          onClick={() => copyText(artifact.path, 'reveal')}
          className="rounded-md border border-[#2c3b4f] bg-[#111c2a] px-3 py-2 text-slate-200 hover:bg-[#162335]"
        >
          Reveal in folder
        </button>
      </div>
      {copied && <div className="mt-2 text-[11px] text-emerald-400">{copied === 'reveal' ? 'Path copied. Paste it into Explorer to reveal the file.' : `Copied ${copied}.`}</div>}
    </div>
  );
}


function renderStepContent(args: {
  focus: FocusState;
  runId: string;
  paths: RunDetail['paths'];
  artifactStatus: RunDetail['artifactStatus'];
  taskSpecContent: string | null;
  runtimeValidationContent: string | null;
  finalReviewPromptContent: string | null;
  context: RunDetail['context'];
  index: RunDetail['index'];
  derived: RunDerivedData;
  artifactPreviewFiles: RunDetail['artifactPreviewFiles'];
  artifactFiles: RunDetail['artifactFiles'];
  hasDesignReference: boolean;
  designNotesContent: string | null;
  repo: string;
  branch: string | null;
  flowType: string;
  taskTitle: string;
  requiresRuntimeValidation: boolean;
  onTaskSpecDraftChange?: (content: string) => void;
}) {
  const {
    focus,
    runId,
    paths,
    artifactStatus,
    taskSpecContent,
    runtimeValidationContent,
    derived,
    artifactPreviewFiles,
    artifactFiles,
    hasDesignReference,
    designNotesContent,
    repo,
    branch,
    flowType,
    taskTitle,
    onTaskSpecDraftChange,
  } = args;

  if (focus.stateKey === 'intake') {
    return (
      <TaskSpecEditor
        runId={runId}
        initialContent={taskSpecContent}
        taskPath={paths.taskSpec}
        exists={artifactStatus.taskSpecExists}
        updatedAt={args.context?.updated_at ?? args.index?.updated_at ?? null}
        onDraftChange={onTaskSpecDraftChange}
        allowCreate
      />
    );
  }

  if (focus.stateKey === 'build') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#1e2430] bg-[#0b1116] p-4">
          <div className="text-xs uppercase tracking-widest text-slate-500">Build Inputs</div>
          <div className="mt-2 text-sm text-slate-200">Task spec readiness: {derived.taskSpecAnalysis.isReady ? 'Ready' : 'Blocked'}</div>
          <div className="mt-1 text-sm text-slate-200">Builder prompt: {artifactStatus.builderPromptExists ? 'Present' : 'Missing'}</div>
          <div className="mt-1 text-sm text-slate-200">Claude handoff: {derived.workerLaunch.claude.handoffExists ? 'Present' : 'Pending build'}</div>
          {!derived.taskSpecAnalysis.isReady && (
            <div className="mt-3 rounded border border-amber-800/40 bg-amber-900/20 p-3 text-xs text-amber-300">
              {derived.taskSpecAnalysis.blockerReason}
            </div>
          )}
        </div>
        <StepArtifactPreview
          title="Task Spec"
          artifact={getPreview('task.md', artifactPreviewFiles)}
          emptyMessage="Task spec preview is unavailable."
        />
      </div>
    );
  }

  if (['claude_launch', 'implementation_wait', 'evidence_wait', 'repair'].includes(focus.stateKey)) {
    return (
      <div className="grid gap-3 xl:grid-cols-[1.3fr,1fr]">
        <StepArtifactPreview
          title="Claude Handoff"
          artifact={getPreview('claude-handoff.md', artifactPreviewFiles)}
          emptyMessage="Claude handoff has not been generated yet."
        />
        <StepArtifactPreview
          title="Implementation Evidence"
          artifact={getPreview('current.md', artifactPreviewFiles)}
          emptyMessage="No reviewable implementation evidence is available yet."
        />
      </div>
    );
  }

  if (focus.stateKey === 'visual_review') {
    return <HumanGatesPanel runId={runId} derived={derived} />;
  }

  if (focus.stateKey === 'runtime_validation') {
    return (
      <RuntimeValidationPanel
        runId={runId}
        artifactPath={paths.runtimeValidation}
        initialContent={runtimeValidationContent}
        exists={true}
        runtimeAnalysis={derived.runtimeValidation}
        runtimeAutomation={derived.runtimeValidationAutomation}
        runtimeMode={args.context?.runtime_validation_mode ?? null}
        runStatus={args.context?.status ?? args.index?.status ?? null}
        branch={branch ?? null}
        repo={repo}
        flowType={flowType}
        taskTitle={taskTitle}
        taskSpecContent={taskSpecContent}
        commitScope={derived.commitScope}
      />
    );
  }

  if (['codex_launch', 'codex_running'].includes(focus.stateKey)) {
    return (
      <div className="grid gap-3 xl:grid-cols-[1.3fr,1fr]">
        <StepArtifactPreview
          title="Codex Handoff"
          artifact={getPreview('codex-handoff.md', artifactPreviewFiles)}
          emptyMessage="Codex handoff has not been generated yet."
        />
        <StepArtifactPreview
          title="Codex Review"
          artifact={getPreview('codexReview.md', artifactPreviewFiles)}
          emptyMessage="Codex hardening evidence is not available yet."
        />
      </div>
    );
  }

  if (focus.stateKey === 'final_review') {
    return (
      <FinalReviewPanel
        runId={runId}
        finalReview={derived.finalReview}
        commitScope={derived.commitScope}
        prPrep={derived.prPrep}
      />
    );
  }

  if (focus.stateKey === 'commit_prep' || focus.stateKey === 'committed') {
    return <PrPrepPanel runId={runId} prPrep={derived.prPrep} />;
  }

  return (
    <ArtifactsPanel
      runId={runId}
      artifactFiles={artifactFiles}
      artifactPreviewFiles={artifactPreviewFiles}
      hasDesignReference={hasDesignReference}
      designNotesContent={designNotesContent}
    />
  );
}

export interface RunWorkspaceClientProps {
  runId: string;
  taskTitle: string;
  branch: string | null;
  phase: string;
  status: string;
  focus: FocusState;
  derived: RunDerivedData;
  paths: RunDetail['paths'];
  artifactStatus: RunDetail['artifactStatus'];
  taskSpecContent: string | null;
  runtimeValidationContent: string | null;
  finalReviewPromptContent: string | null;
  loadError: string | null;
  supervisorState: string;
  requiresRuntimeValidation: boolean;
  hasGateStatus: boolean;
  state: RunDetail['state'];
  context: RunDetail['context'];
  index: RunDetail['index'];
  events: RunDetail['eventsPreview'];
  artifactFiles: RunDetail['artifactFiles'];
  artifactPreviewFiles: RunDetail['artifactPreviewFiles'];
  hasDesignReference: boolean;
  designNotesContent: string | null;
  repo: string;
  flowType: string;
}

function RunWorkspaceInner(props: RunWorkspaceClientProps) {
  const workspace = useRunWorkspace();
  const {
    runId,
    taskTitle,
    branch,
    phase,
    status,
    focus,
    derived,
    paths,
    artifactStatus,
    taskSpecContent,
    runtimeValidationContent,
    finalReviewPromptContent,
    loadError,
    supervisorState,
    requiresRuntimeValidation,
    hasGateStatus,
    state,
    context,
    index,
    events,
    artifactFiles,
    artifactPreviewFiles,
    hasDesignReference,
    designNotesContent,
    repo,
    flowType,
  } = props;

  const primaryRelevantKey = focus.relevantArtifactKeys[0] ?? null;
  const primaryRelevantArtifact = primaryRelevantKey
    ? getPreview(primaryRelevantKey, artifactPreviewFiles) ?? {
        name: primaryRelevantKey,
        path: expectedArtifactPath(primaryRelevantKey, paths),
        content: null,
      }
    : null;
  const stepContent = renderStepContent({
    focus,
    runId,
    paths,
    artifactStatus,
    taskSpecContent,
    runtimeValidationContent,
    finalReviewPromptContent,
    context,
    index,
    derived,
    artifactPreviewFiles,
    artifactFiles,
    hasDesignReference,
    designNotesContent,
    repo,
    branch,
    flowType,
    taskTitle,
    requiresRuntimeValidation,
    onTaskSpecDraftChange: workspace?.setTaskSpecDraft,
  });
  const stepWorkspaceContent = (
    <div className="space-y-4">
      <CurrentStepFileGuidance artifact={primaryRelevantArtifact} />
      {stepContent}
    </div>
  );

  return (
    <>
      {/* Top truth bar */}
      <RunTruthBar
        runId={runId}
        title={taskTitle}
        branch={branch}
        phase={phase}
        executionPosition={derived.executionPosition}
        focus={focus}
        status={status}
        taskSpecReady={derived.taskSpecAnalysis.isReady}
        builderPromptExists={artifactStatus.builderPromptExists}
        derived={derived}
      />

      {loadError && (
        <div className="flex-shrink-0 px-5 py-2.5 border-b border-red-800/40 bg-red-900/10 text-sm text-red-300">
          Failed to load run data — {loadError}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main center workspace */}
        <div className="flex-1 overflow-y-auto min-w-0 p-4 space-y-3">
          {(supervisorState === 'blocked' || supervisorState === 'degraded') && (
            <div
              className={cn(
                'rounded-lg border px-4 py-2.5 text-xs',
                supervisorState === 'blocked'
                  ? 'border-red-800/40 bg-red-900/10 text-red-400'
                  : 'border-amber-800/40 bg-amber-900/10 text-amber-400',
              )}
            >
              <span className="font-medium capitalize">Supervisor {supervisorState}.</span>{' '}
              Run <code className="font-mono">pp resume</code> or{' '}
              <code className="font-mono">pp doctor -RunId {runId}</code> to diagnose.
            </div>
          )}

          <RunControlDock
            runId={runId}
            status={status}
            derived={derived}
            focus={focus}
            finalReviewPromptContent={finalReviewPromptContent}
            mode="embedded"
            stepContent={stepWorkspaceContent}
          />

        </div>

        {/* Right rail — relevant artifacts */}
        <div className="w-64 flex-shrink-0 border-l border-[#1e2430] overflow-hidden">
          <WorkspaceContextRail
            artifactStatus={artifactStatus}
            commitScope={derived.commitScope}
            artifactPreviewFiles={artifactPreviewFiles}
            relevantArtifactKeys={focus.relevantArtifactKeys}
          />
        </div>
      </div>

    </>
  );
}

export function RunWorkspaceClient(props: RunWorkspaceClientProps) {
  return (
    <RunWorkspaceProvider initialTaskSpecDraft={props.taskSpecContent ?? ''}>
      <RunWorkspaceInner {...props} />
    </RunWorkspaceProvider>
  );
}
