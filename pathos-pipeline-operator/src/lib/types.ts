// ─── Run Registry (runs/index.json) ───────────────────────────────────────────

export interface RunIndexEntry {
  run_id: string;
  repo: string;
  branch: string | null;
  flow_type: string;
  task_type: string;
  execution_engine: string;
  phase: string;
  status: string;
  created_at: string;
  updated_at: string;
  archived?: boolean;
}

export interface RunIndex {
  runs: RunIndexEntry[];
}

// ─── Per-run State Files ───────────────────────────────────────────────────────

export interface RunState {
  task_id?: string;
  supervisor_state: string;
  phase: string;
  status: string;
  task_type: string;
  flow_type: string;
  execution_engine: string;
  requires_visual_approval?: boolean;
  requires_runtime_validation?: boolean;
  runtime_validation_completed?: boolean;
  runtime_validation_mode?: string;
  ui_changed?: boolean;
  has_design_reference?: boolean;
  claude_adapter_mode?: string;
  claude_execution_last_result?: string;
  claude_execution_last_command?: string;
  claude_execution_last_attempt_at?: string;
  codex_adapter_mode?: string;
  codex_execution_last_result?: string;
  codex_execution_last_command?: string;
  codex_execution_last_attempt_at?: string;
  retry_count?: number;
  iteration?: number;
  last_successful_progress_at?: string;
  last_notification_at?: string;
  notification_state?: string;
  worker_heartbeat_path?: string;
  last_error_type?: string;
  last_error_message?: string;
}

export interface RunContext {
  task_id: string;
  repo: string;
  branch: string | null;
  flow_type: string;
  phase: string;
  status: string;
  execution_engine: string;
  requires_visual_approval?: boolean;
  requires_runtime_validation?: boolean;
  runtime_validation_mode?: string;
  ui_changed?: boolean;
  pending_action?: string;
  commit_decision?: string;
  started_at: string;
  updated_at: string;
  supervisor_state?: string;
  claude_adapter_mode?: string;
  claude_execution_last_result?: string;
  claude_execution_last_command?: string;
  claude_execution_last_attempt_at?: string;
  codex_adapter_mode?: string;
  codex_execution_last_result?: string;
  codex_execution_last_command?: string;
  codex_execution_last_attempt_at?: string;
  last_error_type?: string;
  last_error_message?: string;
}

// ─── Events (events.log NDJSON) ───────────────────────────────────────────────

export interface PipelineEvent {
  timestamp?: string;
  event?: string;
  type?: string;
  phase?: string;
  status?: string;
  actor?: string;
  message?: string;
  run_id?: string;
  [key: string]: unknown;
}

// ─── Service / Scheduler ──────────────────────────────────────────────────────

export interface ServiceState {
  status?: string;
  run_id?: string;
  pid?: number;
  started_at?: string;
  last_update_at?: string;
  last_exit_code?: number;
  scope?: string;
  dry_run?: boolean;
  interval_seconds?: number;
  max_cycles?: number;
  max_minutes?: number;
  all_runs?: boolean;
  consume_completions?: boolean;
  config_source?: string;
}

export interface SchedulerLock {
  locked_at?: string;
  acquired_at?: string;
  run_id?: string;
  pid?: number;
  locked_by?: string;
  lock_type?: string;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface RunDetail {
  index: RunIndexEntry | null;
  state: RunState | null;
  context: RunContext | null;
  artifactFiles: string[];
  artifactPreviewFiles: ArtifactPreview[];
  hasDesignReference: boolean;
  designNotesContent: string | null;
  taskSpecContent: string | null;
  runtimeValidationContent: string | null;
  eventsPreview: PipelineEvent[];
  paths: {
    runDir: string;
    taskSpec: string;
    runtimeValidation: string;
    claudeHandoff: string;
    claudeCompletion: string;
    codexHandoff: string;
    codexCompletion: string;
    codexReview: string;
    visualReview: string;
    workerHeartbeat: string;
    finalReviewPrompt: string;
    finalReviewGeneratedPrompt: string;
    finalJudgment: string;
    prTitle: string;
    prDescription: string;
    builderPrompt: string;
    currentArtifact: string;
  };
  artifactStatus: {
    taskSpecExists: boolean;
    runtimeValidationExists: boolean;
    claudeHandoffExists: boolean;
    claudeCompletionExists: boolean;
    codexHandoffExists: boolean;
    codexCompletionExists: boolean;
    codexReviewExists: boolean;
    visualReviewExists: boolean;
    workerHeartbeatExists: boolean;
    builderPromptExists: boolean;
    currentArtifactExists: boolean;
    finalReviewGeneratedPromptExists: boolean;
    finalJudgmentExists: boolean;
    prTitleExists: boolean;
    prDescriptionExists: boolean;
  };
  claudeCompletionStatus: string | null;
  codexCompletionStatus: string | null;
  derived: RunDerivedData;
}

export interface OverviewData {
  currentRunId: string | null;
  runs: RunIndexEntry[];
  serviceState: ServiceState | null;
  schedulerLocked: boolean;
  schedulerLock: SchedulerLock | null;
  activeCount: number;
  pendingGateCount: number;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export type PhaseStep = {
  id: string;
  label: string;
  sublabel: string;
  state: 'completed' | 'active' | 'awaiting_human' | 'awaiting_worker' | 'blocked' | 'pending' | 'skipped';
  detail?: string;
};

export type SupervisorHealth = 'healthy' | 'degraded' | 'blocked' | 'stale' | 'unknown';

export interface PipelineCommandResult {
  ok: boolean;
  action: string;
  command: string;
  commands: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  timestamp: string;
  runId?: string | null;
}

export interface TaskSpecPayload {
  runId: string;
  path: string;
  content: string;
  exists: boolean;
  updatedAt?: string | null;
}

export interface ArtifactPreview {
  name: string;
  path: string;
  exists: boolean;
  previewable: boolean;
  editable: boolean;
  contentType: 'markdown' | 'text' | 'json' | 'directory' | 'unknown';
  content: string | null;
  previewError?: string | null;
}

export interface CompletionReadiness {
  worker: 'claude' | 'codex';
  expected: boolean;
  handoffExists: boolean;
  evidenceExists: boolean;
  evidenceReady: boolean;
  evidenceReason: string;
  completionExists: boolean;
  completionStatus: string | null;
  completionReady: boolean;
  completionReason: string;
  readyForFinish: boolean;
  blocker: string | null;
}

export interface WorkerHeartbeatSummary {
  exists: boolean;
  status: string;
  lastProgressAt: string | null;
  minutesSinceProgress: number | null;
  freshness: 'fresh' | 'stale' | 'missing' | 'unknown';
  recommendedAction: string | null;
}

export interface RunGuidance {
  stage: string;
  owner: 'system' | 'Claude' | 'Codex' | 'human' | 'ChatGPT';
  mode: 'active' | 'waiting' | 'blocked' | 'degraded' | 'complete';
  summary: string;
  justHappened: string;
  nextStep: string;
  canOperatorActNow: boolean;
  blockedReason: string | null;
  recommendedAction: string | null;
  previousWorker: string | null;
  currentWorker: string | null;
  nextWorkerOrHuman: string | null;
}

export interface ExecutionArtifactRef {
  label: string;
  path: string | null;
  detail: string | null;
}

export interface ExactExecutionPosition {
  headline: string;
  liveStatusSentence: string;
  currentPhase: string;
  currentSubStep: string;
  currentOwner: 'system' | 'Claude' | 'Codex' | 'human' | 'ChatGPT';
  runnerState: 'running' | 'waiting' | 'blocked' | 'stale' | 'ready_to_advance' | 'complete';
  lastCompletedStep: string;
  currentBlocker: string | null;
  currentWaitReason: string | null;
  nextAutomaticAction: string | null;
  nextHumanAction: string | null;
  currentArtifact: ExecutionArtifactRef | null;
  lastHeartbeatAt: string | null;
  lastCommand: string | null;
  lastResult: string | null;
  autoAdvancePossible: boolean;
  autoAdvanceEnabled: boolean;
}

export interface ExecutionTraceEntry {
  timestamp: string | null;
  actor: string;
  action: string;
  result: string;
  state: string;
  detail: string | null;
}

export interface RuntimeValidationAnalysis {
  exists: boolean;
  hasPlaceholders: boolean;
  placeholderFields: string[];
  missingContextFields: string[];
  missingSections: string[];
  canMarkPass: boolean;
  blockerSummary: string | null;
}

export interface RuntimeValidationAutomation {
  exists: boolean;
  status: string | null;
  supported: boolean | null;
  message: string | null;
  targetIds: string[];
  resultPath: string | null;
  runtimeValidationPath: string | null;
  command: string | null;
}

export interface TaskSpecAnalysis {
  exists: boolean;
  isReady: boolean;
  hasMeaningfulContent: boolean;
  confirmedForRun: boolean;
  templateSignals: string[];
  blockerReason: string | null;
  summary: string | null;
  updatedAt: string | null;
}

export interface CommitScopeFile {
  path: string;
  status: string;
  category: 'likely_relevant' | 'suspicious';
  reason: string;
}

export interface CommitScopeData {
  available: boolean;
  repoKey: string | null;
  repoPath: string | null;
  branch: string | null;
  changedFiles: CommitScopeFile[];
  likelyRelevantCount: number;
  suspiciousCount: number;
  warning: string | null;
  exactCommitCommand: string;
  scopeMode: 'full_repo_only';
}

export interface WorkerLaunchStatus {
  worker: 'claude' | 'codex';
  label: string;
  active: boolean;
  handoffPath: string;
  handoffExists: boolean;
  handoffContent: string | null;
  evidencePath: string;
  evidenceExists: boolean;
  evidenceReady: boolean;
  evidenceReason: string;
  completionPath: string;
  completionExists: boolean;
  completionReady: boolean;
  completionReason: string;
  adapterConfigured: boolean;
  adapterSource: string | null;
  adapterMode: string;
  lastLaunchAttemptAt: string | null;
  lastLaunchResult: string | null;
  lastLaunchCommand: string | null;
  waitingState: 'idle' | 'prepared' | 'waiting_on_worker' | 'blocked' | 'evidence_present' | 'ready_to_finish';
  finishBlocker: string | null;
}

export interface FinalJudgmentRecord {
  decision: 'approve_for_commit' | 'no_commit' | 'repair_required';
  notes: string;
  recordedAt: string;
  recordedBy: string;
}

export interface ReviewPacketPreview {
  label: string;
  path: string;
  exists: boolean;
  content: string | null;
}

export interface FinalReviewData {
  ready: boolean;
  promptExists: boolean;
  commitDecision: string | null;
  expectedCommitAction: string;
  expectedPrTitle: string | null;
  expectedPrSummary: string | null;
  awaitingJudgment: boolean;
  decisionRecord: FinalJudgmentRecord | null;
  packet: ReviewPacketPreview[];
  commitAllowed: boolean;
  noCommitAllowed: boolean;
  repairAllowed: boolean;
  commitBlocker: string | null;
  noCommitBlocker: string | null;
  nextApprovalNeeded: string;
  pushGuidance: string;
}

export interface PrPrepData {
  available: boolean;
  blocker: string | null;
  branch: string | null;
  generatedTitle: string;
  generatedDescription: string;
  savedTitle: string | null;
  savedDescription: string | null;
  titlePath: string;
  descriptionPath: string;
}

export interface RunDerivedData {
  lifecycle: PhaseStep[];
  guidance: RunGuidance;
  executionPosition: ExactExecutionPosition;
  executionTrace: ExecutionTraceEntry[];
  claudeReadiness: CompletionReadiness;
  codexReadiness: CompletionReadiness;
  heartbeat: WorkerHeartbeatSummary;
  runtimeValidation: RuntimeValidationAnalysis;
  runtimeValidationAutomation: RuntimeValidationAutomation;
  taskSpecAnalysis: TaskSpecAnalysis;
  commitScope: CommitScopeData;
  workerLaunch: {
    claude: WorkerLaunchStatus;
    codex: WorkerLaunchStatus;
  };
  finalReview: FinalReviewData;
  prPrep: PrPrepData;
}
