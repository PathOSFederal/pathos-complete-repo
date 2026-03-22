import type { RunDerivedData } from './types';

export type WorkspacePhaseStatus =
  | 'complete'
  | 'current'
  | 'waiting'
  | 'blocked'
  | 'failed'
  | 'returned';

export interface WorkspacePhase {
  id: string;
  label: string;
  status: WorkspacePhaseStatus;
  detail: string;
  focusId: string;
}

export interface WorkspaceFlags {
  taskSpecReady: boolean;
  builderPromptReady: boolean;
  buildReady: boolean;
  postBuildClaudeReady: boolean;
  visualRequired: boolean;
  runtimeRequired: boolean;
  implementationStageRelevant: boolean;
  implementationAttempted: boolean;
  shouldSuppressPostBuildScaffoldEvidence: boolean;
  shouldEvaluateImplementationEvidence: boolean;
  scaffoldArtifactsPresent: boolean;
  repoEvidenceReady: boolean;
  implementationHandoffReady: boolean;
  implementationEvidenceReady: boolean;
  implementationEvidencePartial: boolean;
  waitingForImplementationEvidence: boolean;
  evidenceCheckReady: boolean;
  visualReviewReady: boolean;
  runtimeReviewReady: boolean;
  codexHandoffReady: boolean;
  codexEvidenceReady: boolean;
  finalReviewReady: boolean;
  commitPrepReady: boolean;
  invalidRun: boolean;
  invalidReason: string | null;
  ambiguousContinuation: boolean;
  ambiguousReason: string | null;
}

const VISUAL_OR_LATER = new Set([
  'awaiting_visual_approval',
  'awaiting_runtime_validation',
  'runtime_validation_in_progress',
  'runtime_validation_failed',
  'ready_for_codex',
  'hardening',
  'approved_for_hardening',
  'ready_for_final_judgment',
  'final_review',
  'merge_ready',
  'committed',
  'no_commit',
]);

const FINAL_OR_LATER = new Set([
  'ready_for_final_judgment',
  'final_review',
  'merge_ready',
  'committed',
  'no_commit',
]);

export function deriveWorkspaceFlags(
  status: string,
  derived: RunDerivedData,
  args: { taskSpecReady: boolean; builderPromptExists: boolean },
): WorkspaceFlags {
  const { taskSpecReady, builderPromptExists } = args;
  const claudeLaunch = derived.workerLaunch.claude;
  const codexLaunch = derived.workerLaunch.codex;
  const visualRequired = derived.lifecycle.some((step) => step.id === 'visual' && step.state !== 'skipped');
  const runtimeRequired = derived.lifecycle.some((step) => step.id === 'runtime' && step.state !== 'skipped');
  const implementationAttemptedStatuses = new Set([
    'implementation_in_progress',
    'implementation_ready',
    'needs_repair_pass',
    'needs_visual_revision',
    'awaiting_visual_approval',
    'awaiting_runtime_validation',
    'runtime_validation_in_progress',
    'runtime_validation_failed',
    'ready_for_codex',
    'hardening',
    'approved_for_hardening',
    'ready_for_final_judgment',
    'final_review',
    'merge_ready',
    'committed',
    'no_commit',
  ]);
  const repoEvidenceReady = derived.commitScope.available && derived.commitScope.changedFiles.length > 0;
  const builderPromptReady = builderPromptExists;
  const buildReady =
    taskSpecReady &&
    builderPromptReady &&
    claudeLaunch.handoffExists;
  const implementationStageRelevant =
    buildReady ||
    [
      'ready_for_claude',
      'implementation_in_progress',
      'implementation_ready',
      'needs_repair_pass',
      'needs_visual_revision',
      'awaiting_visual_approval',
      'awaiting_runtime_validation',
      'runtime_validation_in_progress',
      'runtime_validation_failed',
      'ready_for_codex',
      'hardening',
      'approved_for_hardening',
      'ready_for_final_judgment',
      'final_review',
      'merge_ready',
      'committed',
      'no_commit',
    ].includes(status);
  const implementationAttempted =
    implementationAttemptedStatuses.has(status) ||
    ((claudeLaunch.adapterMode === 'invoke_failed' ||
      claudeLaunch.adapterMode === 'invoked' ||
      claudeLaunch.adapterMode === 'invoked_retry_wrapper' ||
      ['waiting_on_worker', 'blocked', 'evidence_present', 'ready_to_finish'].includes(claudeLaunch.waitingState)) &&
      derived.claudeReadiness.expected);
  const postBuildClaudeReady = buildReady && !implementationAttempted;
  const shouldSuppressPostBuildScaffoldEvidence =
    buildReady &&
    !implementationAttempted &&
    (claudeLaunch.evidenceExists || derived.claudeReadiness.completionExists);
  const scaffoldArtifactsPresent =
    shouldSuppressPostBuildScaffoldEvidence ||
    ((claudeLaunch.evidenceExists || derived.claudeReadiness.completionExists) && !implementationStageRelevant);
  const shouldEvaluateImplementationEvidence =
    implementationStageRelevant &&
    implementationAttempted;
  const implementationHandoffReady = claudeLaunch.handoffExists;
  const codexHandoffReady = codexLaunch.handoffExists;
  const implementationEvidenceReady =
    shouldEvaluateImplementationEvidence &&
    derived.claudeReadiness.evidenceReady &&
    derived.claudeReadiness.completionReady &&
    repoEvidenceReady;
  const implementationEvidencePartial =
    shouldEvaluateImplementationEvidence &&
    derived.claudeReadiness.evidenceReady &&
    (!derived.claudeReadiness.completionReady || !repoEvidenceReady);
  const waitingForImplementationEvidence =
    implementationAttempted &&
    implementationHandoffReady &&
    !derived.claudeReadiness.evidenceReady &&
    !implementationEvidencePartial &&
    !implementationEvidenceReady;
  const evidenceCheckReady = implementationEvidenceReady;
  const visualReviewReady = status === 'awaiting_visual_approval' && implementationEvidenceReady;
  const runtimeReviewReady =
    ['awaiting_runtime_validation', 'runtime_validation_in_progress'].includes(status) &&
    implementationEvidenceReady;
  const codexEvidenceReady =
    derived.codexReadiness.expected &&
    derived.codexReadiness.evidenceReady &&
    derived.codexReadiness.completionReady;
  const finalReviewReady = FINAL_OR_LATER.has(status) && codexEvidenceReady;
  const commitPrepReady = ['committed', 'merge_ready'].includes(status) && codexEvidenceReady;
  const invalidReason =
    !shouldEvaluateImplementationEvidence
      ? null
      : derived.executionPosition.currentBlocker?.toLowerCase().includes('invalid')
      ? derived.executionPosition.currentBlocker
      : status === 'awaiting_visual_approval' && !implementationEvidenceReady
      ? 'Visual review is blocked because real implementation evidence is missing or incomplete.'
      : VISUAL_OR_LATER.has(status) && !implementationEvidenceReady
      ? 'A later phase is open without valid implementation evidence.'
      : FINAL_OR_LATER.has(status) && !codexEvidenceReady
      ? 'Final review opened without valid Codex hardening evidence.'
      : derived.claudeReadiness.evidenceReady && !repoEvidenceReady
      ? 'Implementation artifacts exist, but no repo-level change evidence was detected.'
      : derived.commitScope.available &&
        VISUAL_OR_LATER.has(status) &&
        derived.commitScope.changedFiles.length === 0
      ? 'No changed files were detected for this run, so the review target is not trustworthy.'
      : null;
  const invalidRun =
    Boolean(invalidReason) ||
    derived.executionPosition.runnerState === 'blocked' &&
      derived.executionPosition.currentBlocker?.toLowerCase().includes('invalid') === true;
  const ambiguousReason =
    !invalidRun &&
    !postBuildClaudeReady &&
    derived.executionPosition.runnerState === 'ready_to_advance' &&
    !derived.executionPosition.nextAutomaticAction &&
    !derived.executionPosition.nextHumanAction
      ? 'Automation completed a step, but there is no single validated next action.'
      : !invalidRun &&
        status === 'ready_for_claude' &&
        !derived.workerLaunch.claude.handoffExists
      ? 'The run claims Claude is next, but the Claude handoff is missing.'
      : !invalidRun &&
        status === 'ready_for_final_judgment' &&
        !derived.finalReview.ready
      ? 'Final review is referenced, but the review packet is not ready.'
      : null;

  return {
    taskSpecReady,
    builderPromptReady,
    buildReady,
    postBuildClaudeReady,
    visualRequired,
    runtimeRequired,
    implementationStageRelevant,
    implementationAttempted,
    shouldSuppressPostBuildScaffoldEvidence,
    shouldEvaluateImplementationEvidence,
    scaffoldArtifactsPresent,
    repoEvidenceReady,
    implementationHandoffReady,
    implementationEvidenceReady,
    implementationEvidencePartial,
    waitingForImplementationEvidence,
    evidenceCheckReady,
    visualReviewReady,
    runtimeReviewReady,
    codexHandoffReady,
    codexEvidenceReady,
    finalReviewReady,
    commitPrepReady,
    invalidRun,
    invalidReason,
    ambiguousContinuation: Boolean(ambiguousReason),
    ambiguousReason,
  };
}

export function buildWorkspacePhases(
  status: string,
  derived: RunDerivedData,
  args: { taskSpecReady: boolean; builderPromptExists: boolean },
): WorkspacePhase[] {
  const flags = deriveWorkspaceFlags(status, derived, args);
  const runtimePassed =
    ['ready_for_codex', 'hardening', 'approved_for_hardening', 'ready_for_final_judgment', 'final_review', 'merge_ready', 'committed', 'no_commit'].includes(status);
  const visualPassed =
    ['awaiting_runtime_validation', 'runtime_validation_in_progress', 'runtime_validation_failed', 'ready_for_codex', 'hardening', 'approved_for_hardening', 'ready_for_final_judgment', 'final_review', 'merge_ready', 'committed', 'no_commit'].includes(status);
  const codexCurrent = ['ready_for_codex', 'hardening', 'approved_for_hardening'].includes(status);
  const codexPassed = ['ready_for_final_judgment', 'final_review', 'merge_ready', 'committed', 'no_commit'].includes(status) && flags.codexEvidenceReady;

  return [
    {
      id: 'task-spec',
      label: 'Task Spec',
      status: !args.taskSpecReady ? 'current' : 'complete',
      detail: !args.taskSpecReady ? 'Paste and save the task spec.' : 'Saved task spec is the authoritative input.',
      focusId: 'current-step-workspace',
    },
    {
      id: 'build',
      label: 'Build',
      status: !args.taskSpecReady
        ? 'waiting'
        : flags.buildReady || VISUAL_OR_LATER.has(status)
        ? 'complete'
        : status === 'spec_locked'
        ? 'current'
        : 'blocked',
      detail: !args.taskSpecReady
        ? 'Save the task spec first.'
        : flags.buildReady || VISUAL_OR_LATER.has(status)
        ? 'Builder prompt and worker handoff are present.'
        : 'Generate builder prompt and worker handoff.',
      focusId: 'current-step-workspace',
    },
    {
      id: 'claude-implementation',
      label: 'Claude Implementation',
      status: flags.invalidRun && !flags.implementationEvidenceReady
        ? 'failed'
        : ['needs_repair_pass', 'needs_visual_revision'].includes(status)
        ? 'returned'
        : flags.implementationEvidenceReady || visualPassed
        ? 'complete'
        : flags.buildReady
        ? 'current'
        : 'waiting',
      detail: flags.waitingForImplementationEvidence
        ? 'Waiting for worker output.'
        : flags.implementationEvidencePartial
        ? 'Evidence exists but completion is incomplete.'
        : flags.shouldSuppressPostBuildScaffoldEvidence
        ? 'Build created setup artifacts, but Claude has not started yet.'
        : flags.scaffoldArtifactsPresent
        ? 'Setup artifacts exist, but implementation has not started yet.'
        : flags.implementationEvidenceReady
        ? 'Implementation evidence is valid.'
        : flags.buildReady
        ? 'Build complete. Start Claude from the generated handoff.'
        : 'Worker has not produced validated evidence yet.',
      focusId: 'current-step-workspace',
    },
    {
      id: 'evidence-check',
      label: 'Evidence Check',
      status: flags.invalidRun
        ? 'failed'
        : flags.evidenceCheckReady
        ? visualPassed || FINAL_OR_LATER.has(status)
          ? 'complete'
          : 'current'
        : 'waiting',
      detail: flags.invalidRun
        ? flags.invalidReason ?? 'Evidence is not trustworthy.'
        : flags.evidenceCheckReady
        ? 'Validated `current.md` and completion signal.'
        : 'This step unlocks only after real implementation evidence is present.',
      focusId: 'current-step-workspace',
    },
    {
      id: 'visual-review',
      label: 'Visual Review',
      status: !flags.visualRequired
        ? 'complete'
        : flags.invalidRun && status === 'awaiting_visual_approval'
        ? 'blocked'
        : visualPassed
        ? 'complete'
        : status === 'awaiting_visual_approval'
        ? 'current'
        : 'waiting',
      detail: !flags.visualRequired
        ? 'Not required for this flow.'
        : status === 'awaiting_visual_approval'
        ? 'Operator visual decision required.'
        : visualPassed
        ? 'Visual gate cleared.'
        : 'Visual review unlocks after evidence passes.',
      focusId: 'current-step-workspace',
    },
    {
      id: 'runtime-validation',
      label: 'Runtime Validation',
      status: !flags.runtimeRequired
        ? 'complete'
        : status === 'runtime_validation_failed'
        ? 'failed'
        : runtimePassed
        ? 'complete'
        : ['awaiting_runtime_validation', 'runtime_validation_in_progress'].includes(status)
        ? 'current'
        : 'waiting',
      detail: !flags.runtimeRequired
        ? 'Runtime validation is not required for this task.'
        : status === 'runtime_validation_failed'
        ? 'Runtime validation failed and returned the run.'
        : ['awaiting_runtime_validation', 'runtime_validation_in_progress'].includes(status)
        ? 'Validation result is still required.'
        : 'Starts after visual review.',
      focusId: 'current-step-workspace',
    },
    {
      id: 'codex-hardening',
      label: 'Codex Hardening',
      status: flags.invalidRun && ['ready_for_final_judgment', 'final_review', 'merge_ready', 'committed', 'no_commit'].includes(status) && !flags.codexEvidenceReady
        ? 'blocked'
        : codexPassed
        ? 'complete'
        : codexCurrent
        ? 'current'
        : 'waiting',
      detail: codexPassed
        ? 'Codex hardening evidence is complete.'
        : codexCurrent
        ? flags.codexHandoffReady
          ? 'Codex handoff is ready and hardening is the current step.'
          : 'Codex is current, but the handoff is missing.'
        : flags.runtimeRequired && !runtimePassed
        ? 'Codex hardening starts after runtime validation.'
        : 'Codex hardening unlocks after runtime validation.',
      focusId: 'current-step-workspace',
    },
    {
      id: 'final-review',
      label: 'Final Review',
      status: ['committed', 'no_commit', 'merge_ready'].includes(status)
        ? 'complete'
        : ['ready_for_final_judgment', 'final_review'].includes(status) && !flags.codexEvidenceReady
        ? 'blocked'
        : ['ready_for_final_judgment', 'final_review'].includes(status)
        ? 'current'
        : 'waiting',
      detail: ['ready_for_final_judgment', 'final_review'].includes(status) && !flags.codexEvidenceReady
        ? 'Blocked until Codex hardening produces valid review evidence.'
        : ['ready_for_final_judgment', 'final_review'].includes(status)
        ? 'Record the final judgment.'
        : ['committed', 'no_commit', 'merge_ready'].includes(status)
        ? 'Final judgment is complete.'
        : 'Opens only after upstream gates pass.',
      focusId: 'current-step-workspace',
    },
    {
      id: 'commit-prep',
      label: 'Commit Prep',
      status: ['committed', 'no_commit'].includes(status)
        ? 'complete'
        : status === 'merge_ready'
        ? 'current'
        : 'waiting',
      detail: status === 'merge_ready'
        ? 'Prepare the bounded commit packet.'
        : ['committed', 'no_commit'].includes(status)
        ? 'Closeout packet is ready.'
        : 'Available after final review passes.',
      focusId: 'current-step-workspace',
    },
  ];
}

export function getActionGuard(
  action: string,
  args: { status: string; derived: RunDerivedData; taskSpecReady: boolean; builderPromptExists: boolean },
): { allowed: boolean; reason?: string } {
  const { status, derived } = args;
  const flags = deriveWorkspaceFlags(status, derived, args);

  switch (action) {
    case 'build':
      return args.taskSpecReady
        ? { allowed: true }
        : { allowed: false, reason: derived.taskSpecAnalysis.blockerReason ?? 'Save the task spec before building run inputs.' };
    case 'approve':
      return flags.visualReviewReady
        ? { allowed: true }
        : {
            allowed: false,
            reason:
              flags.invalidReason ??
              'Visual review cannot open until real implementation evidence and a valid completion signal are present.',
          };
    case 'final-review':
      return flags.finalReviewReady
        ? { allowed: true }
        : { allowed: false, reason: 'Final review is blocked until all upstream gates pass validly.' };
    case 'runtime-done':
      return derived.runtimeValidation.canMarkPass
        ? { allowed: true }
        : { allowed: false, reason: 'Runtime validation is still incomplete.' };
    case 'commit':
      return derived.finalReview.commitAllowed
        ? { allowed: true }
        : { allowed: false, reason: derived.finalReview.commitBlocker ?? 'Commit is not approved yet.' };
    case 'no-commit':
      return derived.finalReview.noCommitAllowed
        ? { allowed: true }
        : { allowed: false, reason: derived.finalReview.noCommitBlocker ?? 'No-commit is not available yet.' };
    case 'continue-run':
      return flags.invalidRun
        ? { allowed: false, reason: flags.invalidReason ?? 'This run is invalid and cannot auto-advance.' }
        : flags.ambiguousContinuation
        ? { allowed: false, reason: flags.ambiguousReason ?? 'The next valid step is ambiguous.' }
        : { allowed: true };
    default:
      return { allowed: true };
  }
}
