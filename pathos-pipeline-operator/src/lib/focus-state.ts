import type { RunDerivedData } from './types';
import { buildWorkspacePhases, deriveWorkspaceFlags } from './run-workspace';

export type FocusCategory =
  | 'intake'
  | 'build'
  | 'worker_launch'
  | 'worker_running'
  | 'repair'
  | 'human_gate'
  | 'validation'
  | 'final_review'
  | 'post_commit'
  | 'blocked'
  | 'complete';

export interface FocusAction {
  key: string;
  label: string;
  action?: string;
  focusId?: string;
  copyContentKey?: 'claude_handoff' | 'codex_handoff' | 'final_review_prompt';
  variant: 'green' | 'amber' | 'red' | 'secondary' | 'muted';
  disabled?: boolean;
  disabledReason?: string;
}

export interface RecoveryInfo {
  summary: string | null;
  reason: string | null;
  exactFix: string | null;
  nextStep: string | null;
}

export interface FocusState {
  stateKey: string;
  category: FocusCategory;
  badgeLabel: string;
  situation: string;
  focusTitle: string;
  focusDetail: string;
  primaryAction: FocusAction | null;
  secondaryActions: FocusAction[];
  relevantArtifactKeys: string[];
  recovery: RecoveryInfo | null;
  postActionMessages: Record<string, string>;
  recoveryDetails?: {
    handoffExists: boolean;
    currentExists: boolean;
    completionExists: boolean;
  };
  stepNumber: number;
  totalSteps: number;
  stepLabel: string;
  purpose: string;
  neededNow: string[];
  whatToDoNow: string;
  whereToGo: string;
  completionCondition: string;
}

function getStepMeta(
  stateKey: string,
  status: string,
  derived: RunDerivedData,
  taskSpecReady: boolean,
  builderPromptExists: boolean,
) {
  const phases = buildWorkspacePhases(status, derived, {
    taskSpecReady,
    builderPromptExists,
  });
  const currentIndex =
    phases.findIndex((phase) => phase.status === 'current' || phase.status === 'blocked' || phase.status === 'failed' || phase.status === 'returned');
  const stepIndex = currentIndex >= 0 ? currentIndex : Math.max(0, phases.findIndex((phase) => phase.status === 'waiting') - 1);
  const safeIndex = stepIndex >= 0 ? stepIndex : 0;
  return {
    stepNumber: safeIndex + 1,
    totalSteps: phases.length,
    stepLabel: phases[safeIndex]?.label ?? stateKey,
  };
}

function withStepMeta(
  state: Omit<FocusState, 'stepNumber' | 'totalSteps' | 'stepLabel'>,
  stateKey: string,
  status: string,
  derived: RunDerivedData,
  taskSpecReady: boolean,
  builderPromptExists: boolean,
): FocusState {
  return {
    ...state,
    ...getStepMeta(stateKey, status, derived, taskSpecReady, builderPromptExists),
  };
}

export function deriveFocusState(
  status: string,
  derived: RunDerivedData,
  taskSpecReady: boolean,
  builderPromptExists: boolean,
): FocusState {
  const flags = deriveWorkspaceFlags(status, derived, {
    taskSpecReady,
    builderPromptExists,
  });
  const { executionPosition, workerLaunch, finalReview, runtimeValidation } = derived;
  const claude = workerLaunch.claude;
  const codex = workerLaunch.codex;

  if (flags.invalidRun) {
    return withStepMeta(
      {
        stateKey: 'invalid',
        category: 'blocked',
        badgeLabel: 'INVALID RUN',
        situation: 'This run is invalid for review and cannot advance.',
        focusTitle: 'Stop And Recover This Run',
        focusDetail:
          flags.invalidReason ??
          'The pipeline detected that the run reached a later phase without trustworthy implementation evidence.',
        primaryAction: {
          key: 'open-recovery-options',
          label: 'Open Recovery Options',
          focusId: 'current-step-workspace',
          variant: 'red',
        },
        secondaryActions: [
          {
            key: 'open-current-evidence',
            label: 'Open Current Evidence',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
          {
            key: 'open-human-gate',
            label: 'Jump to Visual Review',
            focusId: 'current-step-workspace',
            variant: 'muted',
          },
        ],
        relevantArtifactKeys: ['current.md', 'claude-handoff.md', 'task.md'],
        recovery: {
          summary: flags.invalidReason,
          reason: executionPosition.currentWaitReason,
          exactFix: 'Inspect the evidence and route the run back to implementation or mark it invalid.',
          nextStep: 'Do not advance until the evidence and review target are trustworthy.',
        },
        postActionMessages: {
          'open-recovery-options': 'Recovery options opened. Choose the repair, reject, or invalid path.',
          'open-current-evidence': 'Current evidence opened. Confirm whether the run is reviewable.',
          'open-human-gate': 'Human gate opened so you can review or invalidate the run.',
        },
        recoveryDetails: {
          handoffExists: claude.handoffExists,
          currentExists: claude.evidenceExists,
          completionExists: claude.completionExists,
        },
        purpose: 'Stop invalid runs from advancing into later review steps.',
        neededNow: ['current.md', 'claude-handoff.md'],
        whatToDoNow: 'Open recovery options and choose Reject, Repair, or Mark Run Invalid.',
        whereToGo: 'Worker Controls or Human Gates.',
        completionCondition: 'A valid recovery path is recorded and the run no longer presents invalid evidence.',
      },
      'invalid',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (flags.ambiguousContinuation) {
    return withStepMeta(
      {
        stateKey: 'ambiguous',
        category: 'blocked',
        badgeLabel: 'AMBIGUOUS',
        situation: 'The last action completed, but the next valid step could not be determined safely.',
        focusTitle: 'Resolve The Ambiguous Continuation',
        focusDetail: flags.ambiguousReason ?? 'The run needs an explicit human choice before it can continue.',
        primaryAction: {
          key: 'open-recovery-options',
          label: 'Open Recovery Options',
          focusId: 'current-step-workspace',
          variant: 'amber',
        },
        secondaryActions: [
          {
            key: 'open-history',
            label: 'Open Full History',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
        ],
        relevantArtifactKeys: ['current.md', 'codexReview.md', 'runtime-validation.md'],
        recovery: {
          summary: flags.ambiguousReason,
          reason: executionPosition.currentWaitReason,
          exactFix: 'Select the correct recovery or next-step action explicitly.',
          nextStep: 'The run will not auto-advance while the next unique step is unclear.',
        },
        postActionMessages: {
          'open-recovery-options': 'Recovery options opened. Pick the explicit next path for this run.',
          'open-history': 'Full history opened. Review what completed before choosing the next step.',
        },
        purpose: 'Force an explicit next step when automation cannot safely infer one.',
        neededNow: ['Run history', 'Current evidence'],
        whatToDoNow: 'Review the recovery options and choose the correct next action.',
        whereToGo: 'Worker Controls.',
        completionCondition: 'One unique next action is selected and the run state becomes unambiguous.',
      },
      'ambiguous',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (!taskSpecReady) {
    return withStepMeta(
      {
        stateKey: 'intake',
        category: 'intake',
        badgeLabel: 'WAITING ON YOU',
        situation: 'Paste the task spec to begin this run.',
        focusTitle: 'Save Task Spec',
        focusDetail: derived.taskSpecAnalysis.blockerReason ?? 'The task spec is the authoritative prerequisite. Build remains unavailable until it is saved.',
        primaryAction: {
          key: 'save-task-spec',
          label: 'Save Task Spec',
          variant: 'green',
        },
        secondaryActions: [
          {
            key: 'jump-task-spec',
            label: 'Jump to Task Spec',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
        ],
        relevantArtifactKeys: ['task.md'],
        recovery: null,
        postActionMessages: {
          'save-task-spec': 'Task spec saved successfully. Next step: Build Run Inputs.',
          'jump-task-spec': 'Task Spec editor is now in view.',
        },
        purpose: 'Save the authoritative task input for this run.',
        neededNow: ['Task spec content'],
        whatToDoNow: 'Paste or edit the task spec, then click Save Task Spec.',
        whereToGo: 'Task Spec card, then the bottom command dock.',
        completionCondition: 'Saved run-local `task.md` contains real task details and is ready for build.',
      },
      'intake',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (status === 'spec_locked' && !flags.postBuildClaudeReady) {
    return withStepMeta(
      {
        stateKey: 'build',
        category: 'build',
        badgeLabel: 'READY',
        situation: 'Task spec saved. Build run inputs to continue.',
        focusTitle: 'Build Run Inputs',
        focusDetail: 'Build creates the builder prompt and worker handoff. The run should not move forward without them.',
        primaryAction: {
          key: 'build',
          label: 'Build Run Inputs',
          action: 'build',
          variant: 'green',
        },
        secondaryActions: [
          {
            key: 'jump-task-spec',
            label: 'Jump to Task Spec',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
        ],
        relevantArtifactKeys: ['task.md'],
        recovery: null,
        postActionMessages: {
          build: claude.adapterConfigured
            ? 'Build complete. Claude implementation will start automatically if the worker is healthy.'
            : 'Build complete. Start Claude implementation from the generated handoff.',
          'jump-task-spec': 'Task Spec editor is now in view.',
        },
        purpose: 'Generate the builder and worker artifacts for implementation.',
        neededNow: ['Saved `task.md`'],
        whatToDoNow: 'Click Build Run Inputs.',
        whereToGo: 'Bottom command dock.',
        completionCondition: 'Builder prompt exists and Claude handoff exists.',
      },
      'build',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (status === 'ready_for_claude' || flags.postBuildClaudeReady) {
    return withStepMeta(
      {
        stateKey: 'claude_launch',
        category: 'worker_launch',
        badgeLabel: 'READY',
        situation: claude.adapterConfigured
          ? 'Build complete. Claude automation is available for implementation.'
          : 'Build complete. Start Claude implementation.',
        focusTitle: claude.adapterConfigured ? 'Start Claude Implementation' : 'Open Claude Handoff',
        focusDetail: claude.adapterConfigured
          ? 'The worker handoff is ready and the system can launch Claude automatically.'
          : 'Automation is unavailable here, so the operator must start Claude from the handoff.',
        primaryAction: claude.adapterConfigured
          ? {
              key: 'continue',
              label: 'Start Claude',
              action: 'continue-run',
              variant: 'green',
            }
          : {
              key: 'open-claude-handoff',
              label: 'Open Claude Handoff',
              focusId: 'current-step-workspace',
              variant: 'green',
              disabled: !claude.handoffExists,
              disabledReason: 'Claude handoff is missing.',
            },
        secondaryActions: [
          {
            key: 'copy-claude-handoff',
            label: 'Copy Claude Handoff',
            copyContentKey: 'claude_handoff',
            variant: 'secondary',
          },
        ],
        relevantArtifactKeys: ['claude-handoff.md'],
        recovery: null,
        postActionMessages: {
          continue: 'Claude implementation started automatically. Wait for implementation evidence or a blocker.',
          'copy-claude-handoff': 'Claude handoff copied. Paste it into Claude and return when implementation evidence is produced.',
          'open-claude-handoff': 'Claude handoff opened. Start the implementation worker from there.',
        },
        purpose: 'Use the generated Claude handoff to start implementation.',
        neededNow: ['claude-handoff.md'],
        whatToDoNow: claude.adapterConfigured ? 'Click Start Claude to begin automated implementation.' : 'Open the handoff and run Claude manually.',
        whereToGo: claude.adapterConfigured ? 'Current Step Workspace.' : 'Worker Controls or your Claude session.',
        completionCondition:
          '`current.md` exists, completion signal is valid, and repo change evidence exists.',
      },
      'claude_launch',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (status === 'implementation_in_progress') {
    return withStepMeta(
      {
        stateKey: 'implementation_wait',
        category: 'worker_running',
        badgeLabel: 'SYSTEM RUNNING',
        situation: 'Waiting for implementation evidence from the worker.',
        focusTitle: 'Monitor Implementation Evidence',
        focusDetail: 'The system is watching for `current.md` and a valid completion signal before review can begin.',
        primaryAction: null,
        secondaryActions: [
          {
            key: 'open-current-evidence',
            label: 'Jump to Relevant Artifact',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
          {
            key: 'open-claude-handoff',
            label: 'Open Claude Handoff',
            focusId: 'current-step-workspace',
            variant: 'muted',
          },
        ],
        relevantArtifactKeys: ['current.md', 'claude-completion.json', 'claude-handoff.md'],
        recovery: null,
        postActionMessages: {
          'open-current-evidence': 'Artifacts and history opened so you can inspect the latest evidence.',
          'open-claude-handoff': 'Worker Controls opened so you can review the active handoff.',
        },
        purpose: 'Wait for the implementation worker to produce reviewable evidence.',
        neededNow: ['current.md', 'claude-completion.json'],
        whatToDoNow: 'Wait for Claude to finish, or intervene only if the worker stalls.',
        whereToGo: 'Relevant Artifacts rail or Worker Controls if you need to intervene.',
        completionCondition:
          '`current.md` exists, completion signal is valid, and repo change evidence exists.',
      },
      'implementation_wait',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (flags.waitingForImplementationEvidence) {
    return withStepMeta(
      {
        stateKey: 'evidence_wait',
        category: 'worker_running',
        badgeLabel: 'WAITING',
        situation: 'Waiting for implementation evidence from the worker.',
        focusTitle: 'Watch For `current.md` And Completion',
        focusDetail: 'The handoff exists, but no trustworthy implementation evidence is available yet.',
        primaryAction: null,
        secondaryActions: [
          {
            key: 'open-claude-handoff',
            label: 'Open Claude Handoff',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
          {
            key: 'open-current-evidence',
            label: 'Open Current Evidence',
            focusId: 'current-step-workspace',
            variant: 'muted',
          },
        ],
        relevantArtifactKeys: ['claude-handoff.md', 'current.md', 'claude-completion.json'],
        recovery: null,
        postActionMessages: {
          'open-claude-handoff': 'Worker Controls opened. Review the Claude handoff or relaunch if needed.',
          'open-current-evidence': 'Artifacts opened. `current.md` will appear here when it is generated.',
        },
        purpose: 'Wait for real implementation evidence after build artifacts are ready.',
        neededNow: ['claude-handoff.md'],
        whatToDoNow: 'Wait, or inspect the Claude handoff if the worker looks stalled.',
        whereToGo: 'Relevant Artifacts rail or Worker Controls.',
        completionCondition:
          '`current.md` exists, completion signal is valid, and repo change evidence exists.',
      },
      'evidence_wait',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (flags.implementationEvidencePartial || ['needs_repair_pass', 'needs_visual_revision'].includes(status)) {
    return withStepMeta(
      {
        stateKey: 'repair',
        category: 'repair',
        badgeLabel: 'RECOVERABLE',
        situation: 'Claude evidence was found, but completion is incomplete.',
        focusTitle: 'Repair Claude Completion',
        focusDetail: 'The evidence is not strong enough to review safely. Repair or reopen implementation before advancing.',
        primaryAction: {
          key: 'open-recovery-options',
          label: 'Open Recovery Options',
          focusId: 'current-step-workspace',
          variant: 'amber',
        },
        secondaryActions: [
          {
            key: 'open-current-evidence',
            label: 'Open Current Evidence',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
          {
            key: 'open-claude-handoff',
            label: 'Open Claude Handoff',
            focusId: 'current-step-workspace',
            variant: 'muted',
          },
        ],
        relevantArtifactKeys: ['current.md', 'claude-completion.json', 'claude-handoff.md'],
        recovery: null,
        postActionMessages: {
          'open-recovery-options': 'Recovery options opened. Choose Repair, Reject, or Mark Invalid.',
          'open-current-evidence': 'Current evidence opened so you can verify what Claude produced.',
          'open-claude-handoff': 'Claude handoff opened so you can prepare a repair pass.',
        },
        recoveryDetails: {
          handoffExists: claude.handoffExists,
          currentExists: claude.evidenceExists,
          completionExists: claude.completionExists,
        },
        purpose: 'Repair incomplete or inconsistent implementation evidence.',
        neededNow: ['current.md', 'claude-completion.json', 'claude-handoff.md'],
        whatToDoNow: 'Open Recovery Options and choose the repair path.',
        whereToGo: 'Worker Controls.',
        completionCondition:
          '`current.md` is real, completion signal is valid, and repo change evidence exists.',
      },
      'repair',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (status === 'awaiting_visual_approval') {
    return withStepMeta(
      {
        stateKey: 'visual_review',
        category: 'human_gate',
        badgeLabel: 'HUMAN ACTION',
        situation: 'The implementation is ready for visual review.',
        focusTitle: 'Review Visual Change',
        focusDetail: 'Use the human gate actions to approve, reject and reopen implementation, request repair, or mark the run invalid.',
        primaryAction: {
          key: 'jump-visual-review',
          label: 'Jump to Visual Review',
          focusId: 'current-step-workspace',
          variant: 'amber',
        },
        secondaryActions: [
          {
            key: 'open-current-evidence',
            label: 'Open Current Evidence',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
        ],
        relevantArtifactKeys: ['current.md', 'visual-review.md'],
        recovery: null,
        postActionMessages: {
          'jump-visual-review': 'Human Gates opened. Record the visual decision from there.',
          'open-current-evidence': 'Current evidence opened so you can review the implementation before deciding.',
        },
        purpose: 'Verify the actual UI/result before later gates can continue.',
        neededNow: ['Review target', 'Implementation evidence summary'],
        whatToDoNow: 'Open Visual Review and record Approve, Reject, Repair, or Invalid.',
        whereToGo: 'Human Gates panel.',
        completionCondition: 'A visual-review decision is recorded.',
      },
      'visual_review',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (['awaiting_runtime_validation', 'runtime_validation_in_progress', 'runtime_validation_failed'].includes(status)) {
    const canPass = runtimeValidation.canMarkPass;
    return withStepMeta(
      {
        stateKey: 'runtime_validation',
        category: 'validation',
        badgeLabel: canPass ? 'READY' : status === 'runtime_validation_failed' ? 'FAILED' : 'HUMAN ACTION',
        situation: canPass
          ? 'Runtime validation evidence is ready for review.'
          : status === 'runtime_validation_failed'
          ? 'Runtime validation failed and the run returned for repair.'
          : 'Runtime validation is required before the run can continue.',
        focusTitle: canPass ? 'Review Runtime Result' : 'Confirm Runtime Validation',
        focusDetail: canPass
          ? 'Review the completed validation result and record pass or fail.'
          : 'Review the pre-filled runtime context, add the observed result, and record pass or fail.',
        primaryAction: {
          key: 'jump-runtime-validation',
          label: canPass ? 'Review Runtime Result' : 'Open Runtime Validation',
          focusId: 'current-step-workspace',
          variant: canPass ? 'green' : 'amber',
        },
        secondaryActions: [],
        relevantArtifactKeys: ['runtime-validation.md'],
        recovery: null,
        postActionMessages: {
          'jump-runtime-validation': 'Runtime Validation opened. Complete or review the result there.',
        },
        purpose: 'Validate runtime behavior before later review can continue.',
        neededNow: canPass ? ['Runtime validation result'] : ['Observed runtime result'],
        whatToDoNow: canPass ? 'Open Runtime Validation and review the result.' : 'Open Runtime Validation, confirm the pre-filled context, then record pass or fail.',
        whereToGo: 'Current Step Workspace.',
        completionCondition: 'Runtime validation passes validly or a fail/repair decision is recorded.',
      },
      'runtime_validation',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (['ready_for_codex', 'hardening', 'approved_for_hardening'].includes(status)) {
    const codexRunning = status !== 'ready_for_codex';
    return withStepMeta(
      {
        stateKey: codexRunning ? 'codex_running' : 'codex_launch',
        category: codexRunning ? 'worker_running' : 'worker_launch',
        badgeLabel: codexRunning ? 'SYSTEM RUNNING' : 'READY',
        situation: codexRunning
          ? codex.adapterConfigured
            ? 'Codex hardening is in progress.'
            : 'Codex hardening is waiting for manual completion.'
          : codex.adapterConfigured
          ? 'Codex hardening is ready to start automatically.'
          : 'Codex hardening requires manual start from the handoff.',
        focusTitle: codexRunning ? 'Monitor Codex Hardening' : codex.adapterConfigured ? 'Start Codex Hardening' : 'Open Codex Handoff',
        focusDetail: codexRunning
          ? 'Codex review evidence is the next required artifact before final review.'
          : codex.adapterConfigured
          ? 'The system can launch Codex automatically from the generated handoff.'
          : 'Automation is unavailable here, so the operator must start Codex from the handoff.',
        primaryAction: codexRunning
          ? null
          : codex.adapterConfigured
          ? {
              key: 'continue',
              label: 'Start Codex',
              action: 'continue-run',
              variant: 'green',
            }
          : {
              key: 'open-codex-handoff',
              label: 'Open Codex Handoff',
              focusId: 'current-step-workspace',
              variant: 'green',
              disabled: !codex.handoffExists,
              disabledReason: 'Codex handoff is missing.',
            },
        secondaryActions: [
          {
            key: 'copy-codex-handoff',
            label: 'Copy Codex Handoff',
            copyContentKey: 'codex_handoff',
            variant: 'secondary',
          },
        ],
        relevantArtifactKeys: codexRunning ? ['codexReview.md', 'codex-completion.json'] : ['codex-handoff.md'],
        recovery: null,
        postActionMessages: {
          continue: 'Codex hardening started automatically. Wait for Codex review evidence or a blocker.',
          'copy-codex-handoff': 'Codex handoff copied. Paste it into Codex to begin hardening.',
          'open-codex-handoff': 'Codex handoff opened. Start Codex from there.',
        },
        purpose: codexRunning ? 'Wait for Codex hardening evidence.' : 'Use the generated Codex handoff to start hardening.',
        neededNow: codexRunning ? ['codexReview.md'] : ['codex-handoff.md'],
        whatToDoNow: codexRunning ? 'Monitor the run unless Codex stalls.' : codex.adapterConfigured ? 'Click Start Codex to begin automated hardening.' : 'Open the handoff and run Codex manually.',
        whereToGo: codexRunning ? 'Relevant Artifacts rail.' : codex.adapterConfigured ? 'Current Step Workspace.' : 'Worker Controls or your Codex session.',
        completionCondition: 'Codex review evidence exists and its completion signal is valid.',
      },
      codexRunning ? 'codex_running' : 'codex_launch',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (['ready_for_final_judgment', 'final_review', 'merge_ready'].includes(status)) {
    const commitReady = finalReview.commitAllowed || status === 'merge_ready';
    return withStepMeta(
      {
        stateKey: commitReady ? 'commit_prep' : 'final_review',
        category: commitReady ? 'post_commit' : 'final_review',
        badgeLabel: commitReady ? 'READY' : 'HUMAN ACTION',
        situation: commitReady
          ? 'The run passed review and is ready for commit preparation.'
          : 'The run is ready for final review.',
        focusTitle: commitReady ? 'Prepare Commit' : 'Open Final Review',
        focusDetail: commitReady
          ? 'Review the commit scope and prepare the bounded commit packet.'
          : 'Review the final packet and record the final judgment before commit preparation.',
        primaryAction: {
          key: commitReady ? 'jump-pr-prep' : 'jump-final-review',
          label: commitReady ? 'Prepare Commit' : 'Open Final Review',
          focusId: 'current-step-workspace',
          variant: 'green',
        },
        secondaryActions: [],
        relevantArtifactKeys: commitReady
          ? ['pr-title.txt', 'pr-description.md', 'final-judgment.json']
          : ['finalReviewPrompt.md', 'final-judgment.json', 'codexReview.md'],
        recovery: null,
        postActionMessages: {
          'jump-pr-prep': 'PR Preparation opened. Review the commit packet there.',
          'jump-final-review': 'Final Review opened. Record the final judgment there.',
        },
        purpose: commitReady ? 'Prepare the bounded commit/PR packet.' : 'Perform the final judgment for this run.',
        neededNow: commitReady ? ['PR title', 'PR description', 'Final judgment'] : ['Final review prompt'],
        whatToDoNow: commitReady ? 'Open Commit Prep and review the commit packet.' : 'Open Final Review and record the decision.',
        whereToGo: commitReady ? 'PR Preparation panel.' : 'Final Review panel.',
        completionCondition: commitReady ? 'Commit packet is prepared and approved.' : 'Final judgment is recorded.',
      },
      commitReady ? 'commit_prep' : 'final_review',
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  if (['committed', 'no_commit'].includes(status)) {
    return withStepMeta(
      {
        stateKey: status,
        category: 'complete',
        badgeLabel: status === 'committed' ? 'COMMITTED' : 'NO COMMIT',
        situation:
          status === 'committed'
            ? 'The run passed review and is ready for commit preparation.'
            : 'The run closed without a commit.',
        focusTitle: status === 'committed' ? 'Review PR Packet' : 'Run Complete',
        focusDetail:
          status === 'committed'
            ? 'Use the saved PR title and description to finish the pull request workflow.'
            : 'Review the final judgment and archive or restart as needed.',
        primaryAction: status === 'committed'
          ? {
              key: 'jump-pr-prep',
              label: 'Open PR Packet',
              focusId: 'current-step-workspace',
              variant: 'green',
            }
          : null,
        secondaryActions: [
          {
            key: 'open-history',
            label: 'Open Full History',
            focusId: 'current-step-workspace',
            variant: 'secondary',
          },
        ],
        relevantArtifactKeys: ['pr-title.txt', 'pr-description.md', 'final-judgment.json'],
        recovery: null,
        postActionMessages: {
          'jump-pr-prep': 'PR packet opened.',
          'open-history': 'Full history opened.',
        },
        purpose: status === 'committed' ? 'Finish the PR handoff after commit.' : 'Close out a no-commit run.',
        neededNow: status === 'committed' ? ['PR packet'] : ['Final judgment'],
        whatToDoNow: status === 'committed' ? 'Open the PR packet and use it in your git workflow.' : 'Archive the run or start a new one.',
        whereToGo: status === 'committed' ? 'PR Preparation panel.' : 'Runs list.',
        completionCondition: status === 'committed' ? 'PR handoff is complete.' : 'Run is closed.',
      },
      status,
      status,
      derived,
      taskSpecReady,
      builderPromptExists,
    );
  }

  return withStepMeta(
    {
      stateKey: status || 'unknown',
      category: 'worker_running',
      badgeLabel: 'WAITING',
      situation: executionPosition.liveStatusSentence,
      focusTitle: 'Resolve The Next Required Step',
      focusDetail: executionPosition.currentWaitReason ?? 'The run is between phases and needs an explicit next step.',
      primaryAction: {
        key: 'open-history',
        label: 'Open Full History',
        focusId: 'current-step-workspace',
        variant: 'secondary',
      },
      secondaryActions: [],
      relevantArtifactKeys: ['task.md', 'current.md'],
      recovery: null,
      postActionMessages: {
        'open-history': 'Full history opened so you can inspect the current run state.',
      },
      purpose: 'Clarify the next validated step for this run.',
      neededNow: ['Run history'],
      whatToDoNow: 'Review the current state before advancing.',
      whereToGo: 'Full History.',
      completionCondition: 'The next validated step is clear.',
    },
    status || 'unknown',
    status,
    derived,
    taskSpecReady,
    builderPromptExists,
  );
}
