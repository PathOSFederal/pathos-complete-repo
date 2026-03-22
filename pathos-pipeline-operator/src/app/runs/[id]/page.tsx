import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { readRunDetail, readRunEvents, readCurrentRunId, readOverviewData } from '@/lib/pipeline-reader';
import { deriveFocusState } from '@/lib/focus-state';
import { Sidebar } from '@/components/layout/Sidebar';
import { RunWorkspaceClient } from '@/components/run-detail/RunWorkspaceClient';
import type { RunDetail } from '@/lib/types';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;

  let detail: RunDetail = {
    index: null,
    state: null,
    context: null,
    artifactFiles: [],
    artifactPreviewFiles: [],
    hasDesignReference: false,
    designNotesContent: null,
    taskSpecContent: null,
    runtimeValidationContent: null,
    eventsPreview: [],
    paths: {
      runDir: '',
      taskSpec: '',
      runtimeValidation: '',
      claudeHandoff: '',
      claudeCompletion: '',
      codexHandoff: '',
      codexCompletion: '',
      codexReview: '',
      visualReview: '',
      workerHeartbeat: '',
      finalReviewPrompt: '',
      finalReviewGeneratedPrompt: '',
      finalJudgment: '',
      prTitle: '',
      prDescription: '',
      builderPrompt: '',
      currentArtifact: '',
    },
    artifactStatus: {
      taskSpecExists: false,
      runtimeValidationExists: false,
      claudeHandoffExists: false,
      claudeCompletionExists: false,
      codexHandoffExists: false,
      codexCompletionExists: false,
      codexReviewExists: false,
      visualReviewExists: false,
      workerHeartbeatExists: false,
      builderPromptExists: false,
      currentArtifactExists: false,
      finalReviewGeneratedPromptExists: false,
      finalJudgmentExists: false,
      prTitleExists: false,
      prDescriptionExists: false,
    },
    claudeCompletionStatus: null,
    codexCompletionStatus: null,
    derived: {
      lifecycle: [],
      guidance: {
        stage: '',
        owner: 'system',
        mode: 'waiting',
        summary: '',
        justHappened: '',
        nextStep: '',
        canOperatorActNow: false,
        blockedReason: null,
        recommendedAction: null,
        previousWorker: null,
        currentWorker: null,
        nextWorkerOrHuman: null,
      },
      executionPosition: {
        headline: '',
        liveStatusSentence: '',
        currentPhase: '',
        currentSubStep: '',
        currentOwner: 'system',
        runnerState: 'waiting',
        lastCompletedStep: '',
        currentBlocker: null,
        currentWaitReason: null,
        nextAutomaticAction: null,
        nextHumanAction: null,
        currentArtifact: null,
        lastHeartbeatAt: null,
        lastCommand: null,
        lastResult: null,
        autoAdvancePossible: false,
        autoAdvanceEnabled: false,
      },
      executionTrace: [],
      claudeReadiness: {
        worker: 'claude',
        expected: false,
        handoffExists: false,
        evidenceExists: false,
        evidenceReady: false,
        evidenceReason: '',
        completionExists: false,
        completionStatus: null,
        completionReady: false,
        completionReason: '',
        readyForFinish: false,
        blocker: null,
      },
      codexReadiness: {
        worker: 'codex',
        expected: false,
        handoffExists: false,
        evidenceExists: false,
        evidenceReady: false,
        evidenceReason: '',
        completionExists: false,
        completionStatus: null,
        completionReady: false,
        completionReason: '',
        readyForFinish: false,
        blocker: null,
      },
      heartbeat: {
        exists: false,
        status: 'missing',
        lastProgressAt: null,
        minutesSinceProgress: null,
        freshness: 'missing',
        recommendedAction: null,
      },
      runtimeValidation: {
        exists: false,
        hasPlaceholders: false,
        placeholderFields: [],
        missingContextFields: [],
        missingSections: [],
        canMarkPass: false,
        blockerSummary: null,
      },
      runtimeValidationAutomation: {
        exists: false,
        status: null,
        supported: null,
        message: null,
        targetIds: [],
        resultPath: null,
        runtimeValidationPath: null,
        command: null,
      },
      taskSpecAnalysis: {
        exists: false,
        isReady: false,
        hasMeaningfulContent: false,
        confirmedForRun: false,
        templateSignals: [],
        blockerReason: 'Build is unavailable until the task spec is entered and saved.',
        summary: null,
        updatedAt: null,
      },
      commitScope: {
        available: false,
        repoKey: null,
        repoPath: null,
        branch: null,
        changedFiles: [],
        likelyRelevantCount: 0,
        suspiciousCount: 0,
        warning: null,
        exactCommitCommand: '',
        scopeMode: 'full_repo_only',
      },
      workerLaunch: {
        claude: {
          worker: 'claude',
          label: 'Claude',
          active: false,
          handoffPath: '',
          handoffExists: false,
          handoffContent: null,
          evidencePath: '',
          evidenceExists: false,
          evidenceReady: false,
          evidenceReason: '',
          completionPath: '',
          completionExists: false,
          completionReady: false,
          completionReason: '',
          adapterConfigured: false,
          adapterSource: null,
          adapterMode: 'unknown',
          lastLaunchAttemptAt: null,
          lastLaunchResult: null,
          lastLaunchCommand: null,
          waitingState: 'idle',
          finishBlocker: null,
        },
        codex: {
          worker: 'codex',
          label: 'Codex',
          active: false,
          handoffPath: '',
          handoffExists: false,
          handoffContent: null,
          evidencePath: '',
          evidenceExists: false,
          evidenceReady: false,
          evidenceReason: '',
          completionPath: '',
          completionExists: false,
          completionReady: false,
          completionReason: '',
          adapterConfigured: false,
          adapterSource: null,
          adapterMode: 'unknown',
          lastLaunchAttemptAt: null,
          lastLaunchResult: null,
          lastLaunchCommand: null,
          waitingState: 'idle',
          finishBlocker: null,
        },
      },
      finalReview: {
        ready: false,
        promptExists: false,
        commitDecision: null,
        expectedCommitAction: '',
        expectedPrTitle: null,
        expectedPrSummary: null,
        awaitingJudgment: false,
        decisionRecord: null,
        packet: [],
        commitAllowed: false,
        noCommitAllowed: false,
        repairAllowed: false,
        commitBlocker: null,
        noCommitBlocker: null,
        nextApprovalNeeded: '',
        pushGuidance: '',
      },
      prPrep: {
        available: false,
        blocker: null,
        branch: null,
        generatedTitle: '',
        generatedDescription: '',
        savedTitle: null,
        savedDescription: null,
        titlePath: '',
        descriptionPath: '',
      },
    },
  };
  let events: Awaited<ReturnType<typeof readRunEvents>> = [];
  let currentRunId: string | null = null;
  let pendingGateCount: number | undefined;
  let loadError: string | null = null;

  try {
    [detail, events, currentRunId, pendingGateCount] = await Promise.all([
      readRunDetail(id),
      readRunEvents(id),
      readCurrentRunId(),
      readOverviewData().then((data) => data.pendingGateCount),
    ]);
  } catch (err) {
    loadError = String(err);
    events = [] as import('@/lib/types').PipelineEvent[];
  }

  if (!loadError && !detail.index && !detail.state && !detail.context) {
    notFound();
  }

  const {
    index,
    state,
    context,
    artifactFiles,
    artifactPreviewFiles,
    hasDesignReference,
    designNotesContent,
    taskSpecContent,
    runtimeValidationContent,
    paths,
    artifactStatus,
    derived,
  } = detail;
  const isCurrent = id === currentRunId;

  // Derived display values
  const phase = state?.phase ?? context?.phase ?? index?.phase ?? '?';
  const status = state?.status ?? context?.status ?? index?.status ?? 'unknown';
  const supervisorState = state?.supervisor_state ?? context?.supervisor_state ?? 'unknown';
  const repo = context?.repo ?? index?.repo ?? '—';
  const flowType = state?.flow_type ?? context?.flow_type ?? index?.flow_type ?? '—';
  const branch = context?.branch ?? index?.branch ?? null;
  const hasGateStatus = ['awaiting_visual_approval', 'ready_for_final_judgment', 'final_review', 'merge_ready'].includes(status);
  const requiresRuntimeValidation = !!(state?.requires_runtime_validation || context?.requires_runtime_validation);

  // Derive a human-readable task title from task spec or fallback to run ID
  const taskTitle =
    taskSpecContent
      ?.split(/\r?\n/)
      .find((line) => line.startsWith('# '))
      ?.replace(/^#\s*/, '') ??
    context?.task_id ??
    id;

  const finalReviewPromptContent =
    derived.finalReview.packet.find(
      (p) => p.label === 'Generated Final Review Prompt',
    )?.content ?? null;

  const focus = deriveFocusState(
    status,
    derived,
    derived.taskSpecAnalysis.isReady,
    artifactStatus.builderPromptExists,
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#090b0e]">
      <Sidebar pendingGates={pendingGateCount} />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-shrink-0 flex items-center justify-between border-b border-[#1e2430] bg-[#090b0e]/95 backdrop-blur px-5 py-2 z-10">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/overview" className="hover:text-slate-300 transition-colors">Overview</Link>
            <span>/</span>
            <Link href="/runs" className="hover:text-slate-300 transition-colors">Active Runs</Link>
            <span>/</span>
            <span className="font-mono text-slate-400">{id}</span>
            {isCurrent && (
              <span className="ml-1 bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-medium">current</span>
            )}
          </nav>
          <a
            href={`/runs/${id}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#161b22] border border-[#1e2430] px-2.5 py-1.5 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </a>
        </div>

        <RunWorkspaceClient
          runId={id}
          taskTitle={taskTitle}
          branch={branch}
          phase={phase}
          status={status}
          focus={focus}
          derived={derived}
          paths={paths}
          artifactStatus={artifactStatus}
          taskSpecContent={taskSpecContent}
          runtimeValidationContent={runtimeValidationContent}
          finalReviewPromptContent={finalReviewPromptContent}
          loadError={loadError}
          supervisorState={supervisorState}
          requiresRuntimeValidation={requiresRuntimeValidation}
          hasGateStatus={hasGateStatus}
          state={state}
          context={context}
          index={index}
          events={events}
          artifactFiles={artifactFiles}
          artifactPreviewFiles={artifactPreviewFiles}
          hasDesignReference={hasDesignReference}
          designNotesContent={designNotesContent}
          repo={repo}
          flowType={flowType}
        />
      </main>
    </div>
  );
}
