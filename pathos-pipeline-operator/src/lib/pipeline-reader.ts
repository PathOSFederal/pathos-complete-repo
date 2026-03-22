/**
 * pipeline-reader.ts
 *
 * Server-side only. Reads authoritative pipeline state from the filesystem.
 * The pipeline scripts remain the source of truth — this module is read-only.
 * No state is written or modified here.
 */

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type {
  ArtifactPreview,
  CommitScopeData,
  CommitScopeFile,
  CompletionReadiness,
  ExactExecutionPosition,
  ExecutionTraceEntry,
  FinalReviewData,
  FinalJudgmentRecord,
  OverviewData,
  PhaseStep,
  PipelineEvent,
  PrPrepData,
  ReviewPacketPreview,
  RunContext,
  RunDerivedData,
  RunDetail,
  RunGuidance,
  RunIndex,
  RunIndexEntry,
  RunState,
  RuntimeValidationAnalysis,
  RuntimeValidationAutomation,
  SchedulerLock,
  ServiceState,
  WorkerHeartbeatSummary,
  WorkerLaunchStatus,
} from './types';
import { analyzeTaskSpecForRun } from './task-spec';

const execFileAsync = promisify(execFile);

export function getPipelineRoot(): string {
  return process.env.PIPELINE_ROOT ?? 'C:\\dev\\PathOS\\dev-pipeline';
}

export function getRunsRoot(): string {
  return path.join(getPipelineRoot(), 'runs');
}

export function getRunDir(runId: string): string {
  return path.join(getRunsRoot(), runId);
}

export function isValidRunId(runId: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(runId);
}

export function getRunArtifactsDir(runId: string): string {
  return path.join(getRunDir(runId), 'artifacts');
}

export function getRunPromptsDir(runId: string): string {
  return path.join(getRunDir(runId), 'prompts');
}

export function getRunTaskSpecPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'task.md');
}

export function getRunClaudeHandoffPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'claude-handoff.md');
}

export function getRunClaudeCompletionPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'claude-completion.json');
}

export function getRunBuilderPromptPath(runId: string): string {
  return path.join(getRunPromptsDir(runId), 'builder-prompt.md');
}

export function getRunCurrentArtifactPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'current.md');
}

export function getRunRuntimeValidationPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'runtime-validation.md');
}

export function getRunRuntimeValidationPlaywrightPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'runtime-validation.playwright.json');
}

export function getRunCodexHandoffPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'codex-handoff.md');
}

export function getRunCodexCompletionPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'codex-completion.json');
}

export function getRunCodexReviewPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'codexReview.md');
}

export function getRunVisualReviewPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'visual-review.md');
}

export function getRunWorkerHeartbeatPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'worker-heartbeat.json');
}

export function getRunFinalReviewPromptPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'finalReviewPrompt.md');
}

export function getRunFinalReviewGeneratedPromptPath(runId: string): string {
  return path.join(getRunPromptsDir(runId), 'final-review-prompt.md');
}

export function getRunFinalJudgmentPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'final-judgment.json');
}

export function getRunPrTitlePath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'pr-title.txt');
}

export function getRunPrDescriptionPath(runId: string): string {
  return path.join(getRunArtifactsDir(runId), 'pr-description.md');
}

type AdapterConfigSummary = {
  enabled: boolean;
  commandTemplate: string;
  workingDir: string;
  invokeMode: string;
  source: string | null;
};

type RepoMap = Record<string, string>;

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function listDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFileUpdatedAt(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

function latestTimestamp(...values: Array<string | null | undefined>): string | null {
  const timestamps = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function isArtifactFresh(updatedAt: string | null, baselineAt: string | null): boolean {
  if (!updatedAt) return false;
  if (!baselineAt) return true;
  return new Date(updatedAt).getTime() >= new Date(baselineAt).getTime();
}

function statusIn(status: string, values: string[]): boolean {
  return values.includes(status);
}

function normalizeString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function pathLooksFileReference(value: string): boolean {
  return /[\\/]/.test(value) && /\.[A-Za-z0-9]+$/.test(value);
}

function extractReferencedPaths(...contents: Array<string | null>): string[] {
  const refs = new Set<string>();
  for (const content of contents) {
    if (!content) continue;
    for (const line of content.split(/\r?\n/)) {
      const matches = line.match(/[A-Za-z0-9_.@-]+(?:[\\/][A-Za-z0-9_.@-]+)+\.[A-Za-z0-9]+/g) ?? [];
      for (const match of matches) {
        const normalized = normalizeRepoPath(match);
        if (pathLooksFileReference(normalized)) refs.add(normalized);
      }
    }
  }
  return [...refs];
}

function matchesReferencedPath(changedPath: string, referencedPath: string): boolean {
  return changedPath === referencedPath || changedPath.endsWith(`/${referencedPath}`) || referencedPath.endsWith(`/${changedPath}`);
}

async function readRepoMap(): Promise<RepoMap> {
  const doc = await readJsonFile<{ repos?: Record<string, string> }>(path.join(getPipelineRoot(), 'repos.json'));
  return doc?.repos ?? {};
}

async function runGit(repoPath: string, args: string[]): Promise<string | null> {
  try {
    const result = await execFileAsync('git', args, {
      cwd: repoPath,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return normalizeString(result.stdout) ?? '';
  } catch {
    return null;
  }
}

function textHasMeaningfulContent(content: string | null, kind: 'current' | 'codex' | 'generic'): boolean {
  if (!content || !content.trim()) return false;
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  const ignored =
    kind === 'current'
      ? [/^#\s*Current/i, /^(TODO|TBD|WIP|placeholder)$/i, /^<!--.*-->$/]
      : kind === 'codex'
      ? [/^#\s*Codex/i, /^(TODO|TBD|WIP|placeholder)$/i, /^<!--.*-->$/]
      : [/^(TODO|TBD|WIP|placeholder)$/i, /^<!--.*-->$/];
  const meaningfulLines = lines.filter((line) => ignored.every((pattern) => !pattern.test(line)));
  if (meaningfulLines.length === 0) return false;
  if (kind === 'generic') return true;

  const hasTaskSpecificSignal =
    kind === 'current'
      ? meaningfulLines.some((line) =>
          /(changed|updated|implemented|fixed|files?|diff|validation|acceptance|tested|root cause|summary|why)/i.test(line)
        )
      : meaningfulLines.some((line) =>
          /(files?\s+reviewed|reviewed|findings?|no findings|risk|validation|verified|diff|coverage|tests?|inspected|reasoning)/i.test(line)
        );

  const hasConcreteStructure =
    meaningfulLines.filter((line) => line.startsWith('- ') || line.startsWith('* ') || /`[^`]+`/.test(line)).length > 0;

  return meaningfulLines.length >= 2 && hasTaskSpecificSignal && hasConcreteStructure;
}

function summarizeEvent(event: PipelineEvent | undefined): string {
  if (!event) return 'No recorded run events yet.';
  return event.message ?? event.event ?? event.type ?? 'No recent event message.';
}

function collectBullets(content: string | null, limit = 4): string[] {
  if (!content) return [];
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ') || line.startsWith('* '))
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

function firstHeading(content: string | null): string | null {
  return (
    content
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith('# '))
      ?.replace(/^#\s*/, '')
      .trim() ?? null
  );
}

function summarizeParagraph(content: string | null): string | null {
  if (!content) return null;
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith('#') &&
        !line.startsWith('-') &&
        !line.startsWith('*') &&
        !line.startsWith('```')
    );
  return lines[0] ?? null;
}

function analyzeRuntimeValidation(content: string | null): RuntimeValidationAnalysis {
  if (content?.includes('## What Was Validated')) {
    const extractField = (label: string) =>
      content.match(new RegExp(`- ${label}:\\s*(.*)`))?.[1]?.trim() ?? '';
    const missingSections = ['## What Was Validated', '## Expected Result', '## Observed Result', '## Decision'].filter(
      (section) => !content.includes(section)
    );
    const placeholderFields = [
      ['feature', extractField('Feature')],
      ['outcome', extractField('Intended User Outcome')],
      ['environment', extractField('Environment')],
      ['branch', extractField('Branch')],
      ['repo', extractField('Repo')],
      ['buildVersion', extractField('Build / Version Context')],
      ['date', extractField('Date')],
      ['expectedResult', content.match(/## Expected Result\s+([\s\S]*?)\s+## Suggested Regression Surface/)?.[1]?.trim() ?? ''],
      ['observedResult', content.match(/## Observed Result\s+([\s\S]*?)\s+## Decision/)?.[1]?.trim() ?? ''],
      ['decision', extractField('Status')],
      ['summary', extractField('Summary')],
    ]
      .filter(([, value]) => value.length === 0 || /\[[^\]]+\]/.test(value))
      .map(([field]) => field);
    const hasPlaceholders = placeholderFields.length > 0 || missingSections.length > 0;

    return {
      exists: true,
      hasPlaceholders,
      placeholderFields,
      missingContextFields: [],
      missingSections,
      canMarkPass: !hasPlaceholders,
      blockerSummary: hasPlaceholders
        ? [
            placeholderFields.length > 0 ? `missing fields: ${placeholderFields.join(', ')}` : null,
            missingSections.length > 0 ? `missing sections: ${missingSections.join(', ')}` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : null,
    };
  }

  const missingSections = [
    '## Intended User Outcome',
    '## Primary Flow Proof',
    '## Misuse / Failure / Interruption Proof',
    '## Regression Spot-Check',
    '## Final Runtime Validation Decision',
  ].filter((section) => !content?.includes(section));
  const placeholderCatalog: Array<[string, string]> = [
    ['feature', '[feature/day/scope]'],
    ['outcome', '[What the user should be able to accomplish]'],
    ['environment', '[browser/device/local runtime]'],
    ['branch', '[not set]'],
    ['buildVersion', '[commit/build/version checked]'],
    ['reviewer', '[name]'],
    ['primaryStep1', '[step one]'],
    ['primaryStep2', '[step two]'],
    ['primaryStep3', '[step three]'],
    ['primaryExpected', '[expected result]'],
    ['primaryObserved', '[observed result]'],
    ['scenario', '[misuse/failure scenario]'],
    ['scenarioSteps', '[how the scenario was exercised]'],
    ['scenarioExpected', '[expected safe handling]'],
    ['scenarioObserved', '[observed result]'],
    ['storageKeys', '[keys or none]'],
    ['refreshBehavior', '[refresh behavior]'],
    ['persistenceObserved', '[observed result]'],
    ['loadingChecked', '[yes/no + notes]'],
    ['successChecked', '[yes/no + notes]'],
    ['errorChecked', '[yes/no + notes]'],
    ['emptyChecked', '[yes/no + notes]'],
    ['trustChecked', '[yes/no + notes]'],
    ['trustObserved', '[observed result]'],
    ['regressionWhy', '[adjacent surface/regression area]'],
    ['regressionResult', '[what happened]'],
    ['risks', '[risk or explicit non-goal]'],
    ['finalNotes', '[summary / follow-ups / known risks]'],
  ];
  const placeholderFields = placeholderCatalog
    .filter(([, token]) => (content ?? '').includes(token))
    .map(([field]) => field);
  const missingContextFields: string[] = ([
    ['Environment', /^\s*-\s*Environment:\s*$/m],
    ['Branch', /^\s*-\s*Branch:\s*$/m],
    ['Build/version', /^\s*-\s*Build\/version:\s*$/m],
    ['Reviewer', /^\s*-\s*Reviewer:\s*$/m],
    ['Date', /^\s*-\s*Date:\s*$/m],
  ] as Array<[string, RegExp]>)
    .filter(([, pattern]) => pattern.test(content ?? ''))
    .map(([label]) => label);

  const hasPlaceholders = placeholderFields.length > 0 || missingContextFields.length > 0 || missingSections.length > 0;
  const blockerParts = [
    placeholderFields.length > 0 ? `placeholder fields: ${placeholderFields.join(', ')}` : null,
    missingContextFields.length > 0 ? `missing context: ${missingContextFields.join(', ')}` : null,
    missingSections.length > 0 ? `missing sections: ${missingSections.join(', ')}` : null,
  ].filter(Boolean);

  return {
    exists: content !== null,
    hasPlaceholders,
    placeholderFields,
    missingContextFields,
    missingSections,
    canMarkPass: content !== null && !hasPlaceholders,
    blockerSummary: blockerParts.length > 0 ? blockerParts.join(' · ') : null,
  };
}

function inferRuntimeValidationAutomation(args: {
  result: Record<string, unknown> | null;
  resultPath: string;
  runtimeValidationPath: string;
  state: RunState | null;
  context: RunContext | null;
}): RuntimeValidationAutomation {
  const { result, resultPath, runtimeValidationPath, state, context } = args;
  if (!result) {
    return {
      exists: false,
      status: null,
      supported: null,
      message:
        (state?.requires_runtime_validation || context?.requires_runtime_validation) &&
        (context?.repo ?? '') === 'frontend'
          ? 'Automated Playwright route/shell validation has not run yet. Start runtime validation to trigger it for supported frontend route fixes.'
          : null,
      targetIds: [],
      resultPath: null,
      runtimeValidationPath: null,
      command: null,
    };
  }

  const targetIds = Array.isArray(result.targetIds)
    ? result.targetIds.filter((entry): entry is string => typeof entry === 'string')
    : [];

  return {
    exists: true,
    status: typeof result.status === 'string' ? result.status : null,
    supported: typeof result.supported === 'boolean' ? result.supported : null,
    message: typeof result.message === 'string' ? result.message : null,
    targetIds,
    resultPath,
    runtimeValidationPath:
      typeof result.runtimeValidationPath === 'string' ? result.runtimeValidationPath : runtimeValidationPath,
    command: typeof result.command === 'string' ? result.command : null,
  };
}

function deriveExecutionTrace(events: PipelineEvent[], guidance: RunGuidance): ExecutionTraceEntry[] {
  const recent = [...events].slice(0, 18).reverse();
  const trace = recent.map((event): ExecutionTraceEntry => {
    const actorSource =
      typeof event.actor === 'string'
        ? event.actor
        : typeof event.execution_engine === 'string'
        ? String(event.execution_engine)
        : 'system';
    const actor =
      actorSource.toLowerCase().includes('claude')
        ? 'Claude'
        : actorSource.toLowerCase().includes('codex')
        ? 'Codex'
        : actorSource.toLowerCase().includes('chatgpt')
        ? 'ChatGPT'
        : actorSource.toLowerCase().includes('human')
        ? 'human'
        : 'system';
    const action = normalizeString((event.command as string | undefined) ?? event.event ?? event.type) ?? 'state-update';
    const result =
      typeof event.level === 'string'
        ? event.level
        : /fail|error|blocked/i.test(String(event.message ?? ''))
        ? 'warn'
        : 'info';
    const state = [event.phase ? `Phase ${event.phase}` : null, typeof event.status === 'string' ? event.status : null]
      .filter(Boolean)
      .join(' / ') || guidance.stage;

    return {
      timestamp: typeof event.timestamp === 'string' ? event.timestamp : null,
      actor: actor as ExecutionTraceEntry['actor'],
      action,
      result,
      state,
      detail: normalizeString(event.message as string | undefined),
    };
  });

  if (trace.length === 0) {
    return [
      {
        timestamp: null,
        actor: 'system',
        action: 'state-load',
        result: guidance.mode,
        state: guidance.stage,
        detail: guidance.summary,
      },
    ];
  }

  return trace;
}

function findLastCompletedStep(lifecycle: PhaseStep[]): string {
  const completed = [...lifecycle].reverse().find((step) => step.state === 'completed');
  return completed ? `${completed.label} · ${completed.sublabel}` : 'None yet';
}

function lastWorkerCommand(state: RunState | null, context: RunContext | null): string | null {
  return (
    normalizeString(state?.codex_execution_last_command) ??
    normalizeString(context?.codex_execution_last_command) ??
    normalizeString(state?.claude_execution_last_command) ??
    normalizeString(context?.claude_execution_last_command) ??
    null
  );
}

function lastWorkerResult(state: RunState | null, context: RunContext | null): string | null {
  return (
    normalizeString(state?.codex_execution_last_result) ??
    normalizeString(context?.codex_execution_last_result) ??
    normalizeString(state?.claude_execution_last_result) ??
    normalizeString(context?.claude_execution_last_result) ??
    normalizeString(state?.last_error_message) ??
    normalizeString(context?.last_error_message) ??
    null
  );
}

async function deriveCommitScope(args: {
  runId: string;
  repoKey: string | null;
  branch: string | null;
  taskSpecContent: string | null;
  currentArtifactContent: string | null;
  codexReviewContent: string | null;
  runtimeValidationContent: string | null;
  designNotesContent: string | null;
}): Promise<CommitScopeData> {
  const exactCommitCommand = `.\\pp.ps1 use -RunId ${args.runId}\n.\\pp.ps1 commit -Message "<message>"`;
  if (!args.repoKey) {
    return {
      available: false,
      repoKey: null,
      repoPath: null,
      branch: args.branch,
      changedFiles: [],
      likelyRelevantCount: 0,
      suspiciousCount: 0,
      warning: 'No run repo is set, so commit scope cannot be inspected.',
      exactCommitCommand,
      scopeMode: 'full_repo_only',
    };
  }

  const repoMap = await readRepoMap();
  const repoPath = repoMap[args.repoKey];
  if (!repoPath) {
    return {
      available: false,
      repoKey: args.repoKey,
      repoPath: null,
      branch: args.branch,
      changedFiles: [],
      likelyRelevantCount: 0,
      suspiciousCount: 0,
      warning: `Repo path is not configured for '${args.repoKey}'.`,
      exactCommitCommand,
      scopeMode: 'full_repo_only',
    };
  }

  const gitStatus = await runGit(repoPath, ['status', '--porcelain=v1']);
  if (gitStatus === null) {
    return {
      available: false,
      repoKey: args.repoKey,
      repoPath,
      branch: args.branch,
      changedFiles: [],
      likelyRelevantCount: 0,
      suspiciousCount: 0,
      warning: 'Git status could not be read for the target repo.',
      exactCommitCommand,
      scopeMode: 'full_repo_only',
    };
  }

  const referencedPaths = extractReferencedPaths(
    args.taskSpecContent,
    args.currentArtifactContent,
    args.codexReviewContent,
    args.runtimeValidationContent,
    args.designNotesContent
  );

  const changedFiles: CommitScopeFile[] = gitStatus
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2).trim() || '??';
      const rawPath = line.slice(3).trim();
      const finalPath = normalizeRepoPath(rawPath.includes(' -> ') ? rawPath.split(' -> ').pop() ?? rawPath : rawPath);
      const matchedRef = referencedPaths.find((ref) => matchesReferencedPath(finalPath, ref));
      return matchedRef
        ? {
            path: finalPath,
            status,
            category: 'likely_relevant',
            reason: `Matched run artifact reference '${matchedRef}'.`,
          }
        : {
            path: finalPath,
            status,
            category: 'suspicious',
            reason: 'Not referenced in the current run packet; review before commit.',
          };
    });

  const likelyRelevantCount = changedFiles.filter((file) => file.category === 'likely_relevant').length;
  const suspiciousCount = changedFiles.filter((file) => file.category === 'suspicious').length;

  return {
    available: true,
    repoKey: args.repoKey,
    repoPath,
    branch: args.branch,
    changedFiles,
    likelyRelevantCount,
    suspiciousCount,
    warning:
      suspiciousCount > 0
        ? `${suspiciousCount} changed file${suspiciousCount === 1 ? '' : 's'} look unrelated to this run.`
        : changedFiles.length > 0
        ? null
        : 'No repo changes are currently detected.',
    exactCommitCommand,
    scopeMode: 'full_repo_only',
  };
}

function inferHeartbeat(state: RunState | null, heartbeatContent: string | null): WorkerHeartbeatSummary {
  if (!heartbeatContent) {
    return {
      exists: false,
      status: 'missing',
      lastProgressAt: null,
      minutesSinceProgress: null,
      freshness: 'missing',
      recommendedAction: 'Run `pp worker-status` or `pp worker-start` if a worker should be active.',
    };
  }

  try {
    const parsed = JSON.parse(heartbeatContent) as Record<string, unknown>;
    const lastProgress = typeof parsed.last_progress_at === 'string' ? parsed.last_progress_at : null;
    const workerStatus = typeof parsed.status === 'string' ? parsed.status : 'unknown';
    const progressMs = lastProgress ? new Date(lastProgress).getTime() : Number.NaN;
    const minutesSinceProgress = Number.isFinite(progressMs)
      ? Math.max(0, Math.round(((Date.now() - progressMs) / 60000) * 10) / 10)
      : null;
    const supervisor = state?.supervisor_state ?? 'unknown';
    const freshness =
      minutesSinceProgress === null
        ? 'unknown'
        : supervisor === 'healthy'
        ? minutesSinceProgress > 45
          ? 'stale'
          : 'fresh'
        : minutesSinceProgress > 20
        ? 'stale'
        : 'fresh';

    return {
      exists: true,
      status: workerStatus,
      lastProgressAt: lastProgress,
      minutesSinceProgress,
      freshness,
      recommendedAction:
        freshness === 'stale'
          ? 'Heartbeat is stale. Update via `pp worker-heartbeat ...` or recover with `pp worker-retry`.'
          : null,
    };
  } catch {
    return {
      exists: true,
      status: 'invalid',
      lastProgressAt: null,
      minutesSinceProgress: null,
      freshness: 'unknown',
      recommendedAction: 'Heartbeat file is invalid JSON. Run `pp doctor`.',
    };
  }
}

function inferCompletionReadiness(args: {
  worker: 'claude' | 'codex';
  expected: boolean;
  handoffExists: boolean;
  evidenceContent: string | null;
  completionContent: string | null;
  runId: string;
}): CompletionReadiness {
  const { worker, expected, handoffExists, evidenceContent, completionContent, runId } = args;
  const evidenceReady = textHasMeaningfulContent(evidenceContent, worker === 'claude' ? 'current' : 'codex');
  const evidenceReason = evidenceReady
    ? worker === 'claude'
      ? 'Implementation evidence present in current.md.'
      : 'Hardening evidence present in codexReview.md.'
    : worker === 'claude'
    ? 'Implementation evidence is missing or placeholder-only.'
    : 'Codex review is missing or placeholder-only.';

  let completionExists = false;
  let completionStatus: string | null = null;
  let completionReady = false;
  let completionReason = 'Completion signal is missing.';

  if (completionContent) {
    completionExists = true;
    try {
      const parsed = JSON.parse(completionContent) as Record<string, unknown>;
      completionStatus = typeof parsed.status === 'string' ? parsed.status : 'present';
      const runMatches = !parsed.run_id || parsed.run_id === runId;
      const updatedFlag =
        worker === 'claude' ? parsed.current_md_updated === true : parsed.codex_review_updated === true;
      const completedAt = typeof parsed.completed_at === 'string' && parsed.completed_at.trim().length > 0;
      const meaningful =
        updatedFlag ||
        completedAt ||
        ['completed', 'ready', 'success', 'blocked', 'failed'].includes(
          String(parsed.status ?? '').toLowerCase()
        ) ||
        (Array.isArray(parsed.validations_attempted) && parsed.validations_attempted.length > 0);
      completionReady = meaningful && runMatches && updatedFlag;
      completionReason = !runMatches
        ? 'Completion signal run_id does not match this run.'
        : completionReady
        ? 'Completion signal is ready for authoritative finish.'
        : meaningful
        ? worker === 'claude'
          ? 'Completion signal exists but current_md_updated is still false or incomplete.'
          : 'Completion signal exists but codex_review_updated is still false or incomplete.'
        : 'Completion signal is still scaffold-level.';
    } catch {
      completionReason = 'Completion signal JSON is invalid.';
    }
  }

  return {
    worker,
    expected,
    handoffExists,
    evidenceExists: Boolean(evidenceContent),
    evidenceReady,
    evidenceReason,
    completionExists,
    completionStatus,
    completionReady,
    completionReason,
    readyForFinish: expected && evidenceReady && completionReady,
    blocker: expected && !(evidenceReady && completionReady) ? `${evidenceReason} ${completionReason}`.trim() : null,
  };
}

function deriveLifecycle(state: RunState | null, context: RunContext | null, guidance: RunGuidance): PhaseStep[] {
  const phase = state?.phase ?? context?.phase ?? 'B';
  const status = state?.status ?? context?.status ?? 'unknown';
  const requiresVisual = state?.requires_visual_approval ?? context?.requires_visual_approval ?? false;
  const requiresRuntime = state?.requires_runtime_validation ?? context?.requires_runtime_validation ?? false;

  const mk = (
    id: string,
    label: string,
    sublabel: string,
    current: PhaseStep['state'],
    detail?: string
  ): PhaseStep => ({ id, label, sublabel, state: current, detail });

  return [
    mk('spec', 'Spec Lock', 'Planning', phase > 'B' ? 'completed' : 'active'),
    mk(
      'claude',
      'Claude',
      'Implementation',
      status === 'ready_for_claude' ||
        status === 'implementation_in_progress' ||
        status === 'implementation_ready' ||
        status === 'needs_repair_pass' ||
        status === 'needs_visual_revision'
        ? guidance.mode === 'blocked'
          ? 'blocked'
          : guidance.owner === 'Claude'
          ? 'awaiting_worker'
          : 'active'
        : phase > 'C' ||
          [
            'awaiting_visual_approval',
            'runtime_validation_in_progress',
            'ready_for_codex',
            'hardening',
            'ready_for_final_judgment',
            'final_review',
            'merge_ready',
            'committed',
          ].includes(status)
        ? 'completed'
        : 'pending'
    ),
    mk(
      'visual',
      'Visual Gate',
      'Human',
      !requiresVisual
        ? 'skipped'
        : status === 'awaiting_visual_approval'
        ? 'awaiting_human'
        : [
            'runtime_validation_in_progress',
            'ready_for_codex',
            'hardening',
            'ready_for_final_judgment',
            'final_review',
            'merge_ready',
            'committed',
          ].includes(status)
        ? 'completed'
        : 'pending'
    ),
    mk(
      'runtime',
      'Runtime',
      'Validation',
      !requiresRuntime
        ? 'skipped'
        : status === 'awaiting_runtime_validation' || status === 'runtime_validation_in_progress'
        ? 'awaiting_human'
        : ['ready_for_codex', 'hardening', 'ready_for_final_judgment', 'final_review', 'merge_ready', 'committed'].includes(status)
        ? 'completed'
        : status === 'runtime_validation_failed'
        ? 'blocked'
        : 'pending'
    ),
    mk(
      'codex',
      'Codex',
      'Hardening',
      ['ready_for_codex', 'hardening', 'approved_for_hardening'].includes(status)
        ? guidance.mode === 'blocked'
          ? 'blocked'
          : guidance.owner === 'Codex'
          ? 'awaiting_worker'
          : 'active'
        : ['ready_for_final_judgment', 'final_review', 'merge_ready', 'committed'].includes(status)
        ? 'completed'
        : 'pending'
    ),
    mk(
      'final',
      'Final Review',
      'ChatGPT',
      ['ready_for_final_judgment', 'final_review'].includes(status)
        ? 'awaiting_human'
        : ['merge_ready', 'committed', 'no_commit'].includes(status)
        ? 'completed'
        : phase === 'E'
        ? 'active'
        : 'pending'
    ),
    mk(
      'commit',
      'Commit',
      'Decision',
      status === 'merge_ready' ? 'awaiting_human' : ['committed', 'no_commit'].includes(status) ? 'completed' : 'pending'
    ),
  ];
}

function deriveGuidance(args: {
  state: RunState | null;
  context: RunContext | null;
  events: PipelineEvent[];
  claude: CompletionReadiness;
  codex: CompletionReadiness;
  heartbeat: WorkerHeartbeatSummary;
}): RunGuidance {
  const { state, context, events, claude, codex, heartbeat } = args;
  const status = state?.status ?? context?.status ?? 'unknown';
  const phase = state?.phase ?? context?.phase ?? '?';
  const supervisor = state?.supervisor_state ?? context?.supervisor_state ?? 'unknown';
  const lastMessage = summarizeEvent(events[events.length - 1]);

  const base: RunGuidance = {
    stage: `Phase ${phase} · ${status}`,
    owner: 'system',
    mode: 'waiting',
    summary: 'Run state loaded.',
    justHappened: lastMessage,
    nextStep: 'Refresh or inspect the latest event log.',
    canOperatorActNow: false,
    blockedReason: null,
    recommendedAction: null,
    previousWorker: null,
    currentWorker: null,
    nextWorkerOrHuman: null,
  };

  const postBuildClaudeReady =
    (status === 'spec_locked' || phase === 'B' || status === 'ready_for_claude') &&
    claude.handoffExists &&
    !claude.evidenceExists &&
    !claude.completionExists;

  if (postBuildClaudeReady || status === 'ready_for_claude') {
    return {
      ...base,
      owner: 'human',
      mode: 'waiting',
      summary: 'Build complete. Claude handoff generated. Waiting for implementation to start.',
      nextStep: 'Open the Claude handoff and run Claude implementation. Do not evaluate evidence yet.',
      canOperatorActNow: true,
      blockedReason: null,
      recommendedAction: 'Open the Claude handoff and start Claude.',
      currentWorker: null,
      nextWorkerOrHuman: 'human',
    };
  }

  if (status === 'spec_locked' || phase === 'B') {
    return {
      ...base,
      owner: 'human',
      mode: 'waiting',
      summary: 'Spec is locked. Build is the next authoritative step.',
      nextStep: 'Run Build to generate the implementation handoff and enter Phase C.',
      canOperatorActNow: true,
      nextWorkerOrHuman: 'human',
    };
  }

  if (
    status === 'implementation_in_progress' ||
    status === 'implementation_ready' ||
    status === 'needs_repair_pass' ||
    status === 'needs_visual_revision'
  ) {
    base.owner = 'Claude';
    base.currentWorker = 'Claude';
    base.nextWorkerOrHuman = claude.readyForFinish ? 'system finish' : 'Claude';
    if (claude.handoffExists && !claude.readyForFinish) {
      base.summary = claude.completionExists
        ? 'Claude evidence is partial. Waiting on valid completion evidence.'
        : 'Claude handoff prepared. Waiting on Claude completion evidence.';
      base.mode = heartbeat.freshness === 'stale' ? 'degraded' : 'waiting';
      base.nextStep = heartbeat.freshness === 'stale'
        ? 'Refresh the worker heartbeat or recover the worker, then reconcile or finish.'
        : claude.evidenceReady && !claude.completionReady
        ? 'Continue automation can reconcile the Claude completion signal and finish automatically.'
        : 'Continue automation will start Claude when the adapter is configured, or surface a manual fallback if it is not.';
      base.recommendedAction =
        heartbeat.recommendedAction ??
        (claude.evidenceReady && !claude.completionReady
          ? 'Reconcile Claude completion signal.'
          : 'Run `pp claude-check` for authoritative readiness.');
      base.blockedReason = claude.blocker;
      return base;
    }
  }

  if (status === 'awaiting_visual_approval') {
    return {
      ...base,
      owner: 'human',
      mode: 'waiting',
      summary: 'Visual approval required. Review UI and approve or request repair.',
      nextStep: 'Use the Human Gates panel to approve visual review or request a repair pass.',
      canOperatorActNow: true,
      previousWorker: 'Claude',
      nextWorkerOrHuman: 'human',
    };
  }

  if (status === 'awaiting_runtime_validation' || status === 'runtime_validation_in_progress' || status === 'runtime_validation_failed') {
    return {
      ...base,
      owner: 'human',
      mode: status === 'runtime_validation_failed' ? 'blocked' : 'waiting',
      summary:
        status === 'runtime_validation_in_progress'
          ? 'Runtime validation in progress. Complete the runtime validation form to continue.'
          : status === 'runtime_validation_failed'
          ? 'Runtime validation failed. A repair pass is required before continuing.'
          : 'Runtime validation is required before Codex can begin.',
      nextStep:
        status === 'runtime_validation_in_progress'
          ? 'Complete the structured runtime validation form, then mark pass or fail.'
          : status === 'runtime_validation_failed'
          ? 'Review the runtime findings, request repair, and rebuild before retrying.'
          : 'Start runtime validation from the Human Gates panel.',
      canOperatorActNow: true,
      blockedReason: status === 'runtime_validation_failed' ? 'Runtime validation failed and blocked promotion to Codex.' : null,
      previousWorker: 'Claude',
      nextWorkerOrHuman: 'human',
    };
  }

  if (['ready_for_codex', 'hardening', 'approved_for_hardening'].includes(status)) {
    return {
      ...base,
      owner: 'Codex',
      mode: supervisor === 'worker_blocked' ? 'blocked' : heartbeat.freshness === 'stale' ? 'degraded' : 'waiting',
      summary:
        codex.evidenceReady && !codex.completionReady
          ? 'Codex review present, but completion signal is incomplete.'
          : codex.handoffExists
          ? 'Codex handoff prepared. Waiting on Codex completion evidence.'
          : 'Codex is the next worker in this run.',
      nextStep:
        codex.evidenceReady && !codex.completionReady
          ? 'Continue automation can reconcile the Codex completion signal and finish automatically.'
          : codex.handoffExists
          ? 'Continue automation will start Codex when the adapter is configured, or surface a manual fallback if it is not.'
          : 'Continue automation can start Codex now.',
      canOperatorActNow: codex.evidenceReady && !codex.completionReady,
      blockedReason: supervisor === 'worker_blocked' ? 'Worker is blocked; resolve supervisor issues before finishing.' : codex.blocker,
      recommendedAction:
        heartbeat.recommendedAction ??
        (codex.evidenceReady && !codex.completionReady
          ? 'Reconcile Codex completion signal.'
          : 'Run `pp codex-check` for authoritative readiness.'),
      previousWorker: 'Claude',
      currentWorker: 'Codex',
      nextWorkerOrHuman: codex.readyForFinish ? 'system finish' : 'Codex',
    };
  }

  if (status === 'ready_for_final_judgment' || status === 'final_review') {
    return {
      ...base,
      owner: 'ChatGPT',
      mode: 'waiting',
      summary: 'Ready for ChatGPT final judgment.',
      nextStep: 'Use the Final Review panel to inspect the packet, take judgment externally, then record the decision.',
      canOperatorActNow: true,
      previousWorker: 'Codex',
      nextWorkerOrHuman: 'ChatGPT',
    };
  }

  if (status === 'merge_ready' || status === 'committed' || status === 'no_commit') {
    return {
      ...base,
      owner: 'human',
      mode: status === 'merge_ready' ? 'waiting' : 'complete',
      summary: status === 'merge_ready' ? 'Final judgment complete. Commit or no-commit is the remaining decision.' : 'Run is complete.',
      nextStep: status === 'merge_ready' ? 'Use the Final Review panel to commit or close with no-commit.' : 'Archive or start the next run.',
      canOperatorActNow: status === 'merge_ready',
      previousWorker: 'ChatGPT',
      nextWorkerOrHuman: status === 'merge_ready' ? 'human' : null,
    };
  }

  if (supervisor === 'worker_blocked') {
    base.mode = 'blocked';
    base.blockedReason = 'Supervisor reports worker_blocked.';
    base.recommendedAction = 'Use `pp worker-status`, then `pp worker-retry` if recovery is appropriate.';
  } else if (supervisor === 'worker_degraded' || heartbeat.freshness === 'stale') {
    base.mode = 'degraded';
    base.recommendedAction = heartbeat.recommendedAction;
  }

  return base;
}

function deriveExecutionPosition(args: {
  state: RunState | null;
  context: RunContext | null;
  guidance: RunGuidance;
  lifecycle: PhaseStep[];
  heartbeat: WorkerHeartbeatSummary;
  claude: CompletionReadiness;
  codex: CompletionReadiness;
  workerLaunch: {
    claude: WorkerLaunchStatus;
    codex: WorkerLaunchStatus;
  };
  runtimeValidation: RuntimeValidationAnalysis;
  runtimeValidationAutomation: RuntimeValidationAutomation;
  taskSpecAnalysis: RunDerivedData['taskSpecAnalysis'];
  finalReview: FinalReviewData;
  commitScope: CommitScopeData;
  paths: RunDetail['paths'];
}): ExactExecutionPosition {
  const {
    state,
    context,
    guidance,
    lifecycle,
    heartbeat,
    claude,
    codex,
    workerLaunch,
    runtimeValidation,
    runtimeValidationAutomation,
    taskSpecAnalysis,
    finalReview,
    commitScope,
    paths,
  } = args;
  const phase = state?.phase ?? context?.phase ?? '?';
  const status = state?.status ?? context?.status ?? 'unknown';
  const owner = guidance.owner;
  const lastCompletedStep = findLastCompletedStep(lifecycle);
  const lastCommand = lastWorkerCommand(state, context);
  const lastResult = lastWorkerResult(state, context) ?? guidance.justHappened;
  const claudeLaunch = workerLaunch.claude;
  const codexLaunch = workerLaunch.codex;
  const postBuildClaudeReady =
    taskSpecAnalysis.isReady &&
    claudeLaunch.handoffExists &&
    !claude.evidenceExists &&
    !claude.completionExists;

  let runnerState: ExactExecutionPosition['runnerState'] = 'waiting';
  let currentSubStep = guidance.stage;
  let currentWaitReason = guidance.blockedReason;
  let currentBlocker: string | null = guidance.blockedReason;
  let nextAutomaticAction: string | null = null;
  let nextHumanAction: string | null = null;
  let currentArtifact: ExactExecutionPosition['currentArtifact'] = null;
  let autoAdvancePossible = false;
  let liveStatusSentence = 'Idle: no active machine-owned process.';

  if (status === 'committed' || status === 'no_commit') {
    runnerState = 'complete';
    currentSubStep = status === 'committed' ? 'Commit recorded' : 'Run closed without commit';
    nextHumanAction = status === 'committed' ? 'Push the branch and open the PR using the prepared packet.' : 'Start the next run or reopen with a repair pass.';
    liveStatusSentence = status === 'committed' ? 'Complete: commit recorded for this run.' : 'Complete: this run was closed with no commit.';
  } else if (heartbeat.freshness === 'stale' && owner !== 'human' && owner !== 'ChatGPT') {
    runnerState = 'stale';
    currentWaitReason = heartbeat.recommendedAction ?? 'Worker heartbeat is stale.';
    currentBlocker = currentWaitReason;
    liveStatusSentence = `Stale: ${currentWaitReason}`;
  } else if (status === 'runtime_validation_failed' || guidance.mode === 'blocked') {
    runnerState = 'blocked';
    currentBlocker = currentWaitReason;
    liveStatusSentence = currentBlocker ? `Blocked: ${currentBlocker}` : 'Blocked: automation cannot continue.';
  }

  if ((status === 'spec_locked' || phase === 'B') && !postBuildClaudeReady) {
    currentSubStep = 'Waiting for build';
    nextHumanAction = taskSpecAnalysis.isReady ? 'Start the run build.' : 'Finish the task spec and save it before building.';
    currentArtifact = { label: 'Task spec', path: paths.taskSpec, detail: taskSpecAnalysis.blockerReason ?? 'Authoritative input for build.' };
    liveStatusSentence = taskSpecAnalysis.isReady ? 'Waiting for the operator to build the run.' : taskSpecAnalysis.blockerReason ?? 'Waiting for the task spec to be completed.';
  } else if (status === 'ready_for_claude' || postBuildClaudeReady) {
    currentSubStep = 'Waiting for Claude implementation to start';
    currentWaitReason = 'Build finished and the Claude handoff is ready, but no real implementation attempt has been detected yet.';
    currentBlocker = null;
    currentArtifact = {
      label: 'Claude handoff',
      path: paths.claudeHandoff,
      detail: 'Open the handoff and run Claude implementation from it.',
    };
    runnerState = 'waiting';
    nextAutomaticAction = claudeLaunch.adapterConfigured
      ? 'Continue automation can start Claude when you are ready.'
      : null;
    nextHumanAction = claudeLaunch.adapterConfigured
      ? 'Start Claude implementation from the generated handoff.'
      : 'Open the Claude handoff and run Claude manually.';
    liveStatusSentence = 'Build complete. Claude handoff generated. Waiting for implementation worker to start.';
  } else if (['implementation_in_progress', 'implementation_ready', 'needs_repair_pass', 'needs_visual_revision'].includes(status)) {
    currentSubStep = claude.evidenceReady && !claude.completionReady ? 'Claude evidence ready; completion signal incomplete' : 'Claude implementation in progress';
    currentWaitReason = claude.readyForFinish ? null : claude.blocker;
    currentBlocker = currentWaitReason;
    currentArtifact = {
      label: claude.evidenceReady ? 'Implementation evidence' : 'Claude handoff',
      path: claude.evidenceReady ? paths.currentArtifact : paths.claudeHandoff,
      detail: claude.evidenceReady ? claude.evidenceReason : 'Worker is expected to update evidence and completion signal.',
    };
    if (claude.readyForFinish) {
      runnerState = 'ready_to_advance';
      nextAutomaticAction = 'Continue automation will consume Claude evidence and route to the next stage.';
      nextHumanAction = null;
      autoAdvancePossible = true;
      liveStatusSentence = 'Ready to advance: Claude evidence is valid and can be consumed automatically.';
    } else if (claude.evidenceReady && !claude.completionReady) {
      runnerState = 'ready_to_advance';
      nextAutomaticAction = 'Continue automation will reconcile Claude completion and keep advancing.';
      nextHumanAction = null;
      autoAdvancePossible = true;
      liveStatusSentence = 'Ready to advance: Claude evidence is present, and the completion signal can be repaired automatically.';
    } else if (claudeLaunch.adapterMode === 'blocked_missing_config') {
      runnerState = 'blocked';
      currentWaitReason = 'Claude did not auto-run because the adapter is not configured.';
      currentBlocker = 'Claude adapter missing. Manual fallback is required.';
      nextHumanAction = 'Open the Claude handoff and run Claude manually, then return here.';
      liveStatusSentence = 'Blocked: Claude adapter is missing, so the system is waiting for manual Claude execution.';
    } else if (claudeLaunch.adapterMode === 'invoke_failed') {
      runnerState = 'blocked';
      currentWaitReason = claudeLaunch.lastLaunchResult ?? 'Claude adapter launch failed.';
      currentBlocker = currentWaitReason;
      nextHumanAction = 'Review the adapter failure, fix it, then continue automation or retry the worker.';
      liveStatusSentence = `Blocked: ${currentWaitReason}`;
    } else if (claudeLaunch.adapterMode === 'invoked' || claudeLaunch.adapterMode === 'invoked_retry_wrapper') {
      runnerState = 'running';
      nextHumanAction = null;
      liveStatusSentence = heartbeat.freshness === 'stale'
        ? 'Waiting for Claude progress, but the worker heartbeat is stale.'
        : 'Waiting for Claude process to finish.';
    } else if (claudeLaunch.handoffExists) {
      runnerState = 'waiting';
      nextAutomaticAction = 'Continue automation can retry Claude launch if the worker is retryable.';
      nextHumanAction = claudeLaunch.adapterConfigured ? null : 'Open the Claude handoff and run Claude manually.';
      liveStatusSentence = claudeLaunch.adapterConfigured
        ? 'Waiting for Claude automation to continue.'
        : 'Waiting for manual Claude execution because automation is unavailable.';
    } else {
      runnerState = 'ready_to_advance';
      nextAutomaticAction = 'Continue automation will prepare the Claude handoff and launch Claude when possible.';
      nextHumanAction = null;
      autoAdvancePossible = true;
      liveStatusSentence = 'Ready to advance: Claude is the next machine-owned step.';
    }
  } else if (status === 'awaiting_visual_approval') {
    currentSubStep = 'Awaiting visual approval';
    currentWaitReason = 'Human visual gate is required before runtime/Codex.';
    currentBlocker = currentWaitReason;
    nextHumanAction = 'Approve visual review or request repair.';
    currentArtifact = { label: 'Visual review artifact', path: paths.visualReview, detail: 'Operator gate evidence.' };
    liveStatusSentence = 'Waiting for human visual approval.';
  } else if (['awaiting_runtime_validation', 'runtime_validation_in_progress', 'runtime_validation_failed'].includes(status)) {
    currentSubStep = runtimeValidation.hasPlaceholders
      ? 'Runtime validation saved but still incomplete'
      : status === 'runtime_validation_in_progress'
      ? 'Runtime validation ready for decision'
      : 'Runtime validation blocked';
    currentWaitReason = runtimeValidation.blockerSummary ?? guidance.blockedReason ?? 'Runtime validation requires operator completion.';
    currentBlocker = status === 'runtime_validation_failed' ? currentWaitReason : runtimeValidation.canMarkPass ? null : currentWaitReason;
    nextHumanAction =
      status === 'runtime_validation_failed'
        ? 'Request repair and rerun the validation flow.'
        : runtimeValidation.canMarkPass
        ? 'Mark runtime pass or fail in this panel.'
        : 'Complete the highlighted runtime validation fields.';
    currentArtifact = { label: 'Runtime validation', path: paths.runtimeValidation, detail: currentWaitReason };
    runnerState = status === 'runtime_validation_failed' ? 'blocked' : runtimeValidation.canMarkPass ? 'ready_to_advance' : 'waiting';
    if (status === 'awaiting_runtime_validation') {
      nextAutomaticAction = 'Continue automation will start runtime validation when it is machine-owned.';
      autoAdvancePossible = true;
      liveStatusSentence = 'Ready to advance: runtime validation has not started yet.';
    } else if (
      status === 'runtime_validation_in_progress' &&
      runtimeValidationAutomation.status === 'passed' &&
      runtimeValidation.canMarkPass
    ) {
      nextAutomaticAction = 'Continue automation will accept the automated runtime result and route to Codex.';
      nextHumanAction = null;
      autoAdvancePossible = true;
      liveStatusSentence = 'Ready to advance: automated runtime validation passed and can be consumed safely.';
    } else if (status === 'runtime_validation_failed') {
      liveStatusSentence = `Blocked: ${currentWaitReason}`;
    } else if (runtimeValidationAutomation.status === 'failed') {
      liveStatusSentence = `Blocked: ${runtimeValidationAutomation.message ?? 'Automated runtime validation failed.'}`;
      currentBlocker = runtimeValidationAutomation.message ?? currentBlocker;
    } else {
      liveStatusSentence = runtimeValidationAutomation.status === 'passed'
        ? 'Waiting for runtime validation confirmation.'
        : 'Waiting for runtime validation to complete.';
    }
  } else if (['ready_for_codex', 'hardening', 'approved_for_hardening'].includes(status)) {
    currentSubStep = codex.evidenceReady && !codex.completionReady ? 'Codex evidence ready; completion signal incomplete' : 'Codex hardening in progress';
    currentWaitReason = codex.readyForFinish ? null : codex.blocker;
    currentBlocker = currentWaitReason;
    currentArtifact = {
      label: codex.evidenceReady ? 'Codex review' : 'Codex handoff',
      path: codex.evidenceReady ? paths.codexReview : paths.codexHandoff,
      detail: codex.evidenceReady ? codex.evidenceReason : 'Codex is expected to emit review evidence.',
    };
    if (codex.readyForFinish) {
      runnerState = 'ready_to_advance';
      nextAutomaticAction = 'Continue automation will consume Codex evidence and prepare final review.';
      nextHumanAction = null;
      autoAdvancePossible = true;
      liveStatusSentence = 'Ready to advance: Codex evidence is valid and can be consumed automatically.';
    } else if (codex.evidenceReady && !codex.completionReady) {
      runnerState = 'ready_to_advance';
      nextAutomaticAction = 'Continue automation will reconcile the Codex completion signal and keep advancing.';
      nextHumanAction = null;
      autoAdvancePossible = true;
      liveStatusSentence = 'Ready to advance: Codex evidence is present, and the completion signal can be repaired automatically.';
    } else if (codexLaunch.adapterMode === 'blocked_missing_config') {
      runnerState = 'blocked';
      currentWaitReason = 'Codex did not auto-run because the adapter is not configured.';
      currentBlocker = 'Codex adapter missing. Manual fallback is required.';
      nextHumanAction = 'Open the Codex handoff and run Codex manually, then return here.';
      liveStatusSentence = 'Blocked: Codex adapter is missing, so the system is waiting for manual Codex execution.';
    } else if (codexLaunch.adapterMode === 'invoke_failed') {
      runnerState = 'blocked';
      currentWaitReason = codexLaunch.lastLaunchResult ?? 'Codex adapter launch failed.';
      currentBlocker = currentWaitReason;
      nextHumanAction = 'Review the adapter failure, fix it, then continue automation or retry the worker.';
      liveStatusSentence = `Blocked: ${currentWaitReason}`;
    } else if (codexLaunch.adapterMode === 'invoked' || codexLaunch.adapterMode === 'invoked_retry_wrapper') {
      runnerState = 'running';
      nextHumanAction = null;
      liveStatusSentence = heartbeat.freshness === 'stale'
        ? 'Waiting for Codex progress, but the worker heartbeat is stale.'
        : 'Waiting for Codex process to finish.';
    } else if (codexLaunch.handoffExists) {
      runnerState = 'waiting';
      nextAutomaticAction = 'Continue automation can retry Codex launch if the worker is retryable.';
      nextHumanAction = codexLaunch.adapterConfigured ? null : 'Open the Codex handoff and run Codex manually.';
      liveStatusSentence = codexLaunch.adapterConfigured
        ? 'Waiting for Codex automation to continue.'
        : 'Waiting for manual Codex execution because automation is unavailable.';
    } else {
      runnerState = 'ready_to_advance';
      nextAutomaticAction = 'Continue automation will prepare the Codex handoff and launch Codex when possible.';
      nextHumanAction = null;
      autoAdvancePossible = true;
      liveStatusSentence = 'Ready to advance: Codex is the next machine-owned step.';
    }
  } else if (status === 'ready_for_final_judgment' || status === 'final_review') {
    currentSubStep = finalReview.awaitingJudgment ? 'Review packet ready; awaiting ChatGPT judgment' : 'Judgment recorded';
    currentWaitReason = finalReview.awaitingJudgment ? 'ChatGPT final judgment is still outstanding.' : null;
    currentBlocker = currentWaitReason;
    nextHumanAction = finalReview.awaitingJudgment ? 'Review the packet with ChatGPT, then record the judgment.' : finalReview.nextApprovalNeeded;
    currentArtifact = { label: 'Final review packet', path: paths.finalReviewGeneratedPrompt, detail: 'Closing packet for ChatGPT judgment.' };
    liveStatusSentence = finalReview.awaitingJudgment
      ? 'Waiting for ChatGPT final judgment.'
      : 'Waiting for the operator to complete commit or no-commit closeout.';
  } else if (status === 'merge_ready') {
    currentSubStep = commitScope.warning ? 'Commit pending human approval with scope warning' : 'Commit pending human approval';
    currentWaitReason = commitScope.warning;
    currentBlocker = commitScope.warning;
    nextHumanAction = finalReview.nextApprovalNeeded;
    currentArtifact = { label: 'Commit scope review', path: commitScope.repoPath, detail: commitScope.warning ?? 'Ready for bounded commit/no-commit.' };
    runnerState = 'ready_to_advance';
    liveStatusSentence = commitScope.warning
      ? `Blocked: ${commitScope.warning}`
      : 'Waiting for explicit human commit or no-commit approval.';
  }

  if (!nextAutomaticAction && autoAdvancePossible) {
    nextAutomaticAction = 'Continue automation is available now.';
  }

  if (!liveStatusSentence || liveStatusSentence === 'Idle: no active machine-owned process.') {
    if (runnerState === 'blocked') {
      liveStatusSentence = currentBlocker ? `Blocked: ${currentBlocker}` : 'Blocked: automation cannot continue.';
    } else if (runnerState === 'stale') {
      liveStatusSentence = currentWaitReason ? `Stale: ${currentWaitReason}` : 'Stale: worker heartbeat needs attention.';
    } else if (runnerState === 'running') {
      liveStatusSentence = 'Running: machine-owned work is active.';
    } else if (runnerState === 'ready_to_advance') {
      liveStatusSentence = 'Ready to advance: bounded automation can continue now.';
    } else if (runnerState === 'complete') {
      liveStatusSentence = 'Complete: no further machine-owned work is pending.';
    } else {
      liveStatusSentence = currentWaitReason ? `Waiting: ${currentWaitReason}` : 'Waiting for the next required action.';
    }
  }

  return {
    headline: `Phase ${phase} / ${currentSubStep}`,
    liveStatusSentence,
    currentPhase: `Phase ${phase}`,
    currentSubStep,
    currentOwner: owner,
    runnerState,
    lastCompletedStep,
    currentBlocker,
    currentWaitReason,
    nextAutomaticAction,
    nextHumanAction,
    currentArtifact,
    lastHeartbeatAt: heartbeat.lastProgressAt,
    lastCommand,
    lastResult,
    autoAdvancePossible: autoAdvancePossible || runnerState === 'ready_to_advance',
    autoAdvanceEnabled: autoAdvancePossible || runnerState === 'ready_to_advance',
  };
}

async function buildArtifactPreview(runId: string, name: string): Promise<ArtifactPreview> {
  const artifactPath = path.join(getRunArtifactsDir(runId), name);
  const exists = await fileExists(artifactPath);
  if (!exists) {
    return {
      name,
      path: artifactPath,
      exists: false,
      previewable: false,
      editable: name === 'task.md' || name === 'runtime-validation.md',
      contentType: 'unknown',
      content: null,
      previewError: 'Artifact does not exist.',
    };
  }

  const stat = await fs.stat(artifactPath);
  if (stat.isDirectory()) {
    return {
      name,
      path: artifactPath,
      exists: true,
      previewable: false,
      editable: false,
      contentType: 'directory',
      content: null,
      previewError: 'Directory previews are not shown inline.',
    };
  }

  const ext = path.extname(name).toLowerCase();
  const contentType = ext === '.md' ? 'markdown' : ext === '.json' ? 'json' : ext === '.txt' ? 'text' : 'unknown';
  if (contentType === 'unknown') {
    return {
      name,
      path: artifactPath,
      exists: true,
      previewable: false,
      editable: false,
      contentType,
      content: null,
      previewError: 'This file type is not previewed safely in the GUI.',
    };
  }

  return {
    name,
    path: artifactPath,
    exists: true,
    previewable: true,
    editable: name === 'task.md' || name === 'runtime-validation.md',
    contentType,
    content: await readTextFile(artifactPath),
    previewError: null,
  };
}

async function readAdapterConfig(worker: 'claude' | 'codex'): Promise<AdapterConfigSummary> {
  const configCandidates = [
    path.join(getPipelineRoot(), 'scripts', 'config', 'pipeline-config.json'),
    path.join(getPipelineRoot(), 'pipeline-config.json'),
  ];
  const envPrefix = worker === 'claude' ? 'PATHOS_CLAUDE_ADAPTER' : 'PATHOS_CODEX_ADAPTER';
  const key = worker === 'claude' ? 'claude_adapter' : 'codex_adapter';

  const config: AdapterConfigSummary = {
    enabled: false,
    commandTemplate: '',
    workingDir: '',
    invokeMode: 'spawn',
    source: null,
  };

  for (const candidate of configCandidates) {
    const doc = await readJsonFile<Record<string, unknown>>(candidate);
    if (!doc) continue;
    const direct = doc[key] as Record<string, unknown> | undefined;
    const nested = (doc.pipeline as Record<string, unknown> | undefined)?.[key] as Record<string, unknown> | undefined;
    const adapter = direct ?? nested;
    if (!adapter) continue;
    config.enabled = adapter.enabled === true;
    config.commandTemplate = typeof adapter.command_template === 'string' ? adapter.command_template : '';
    config.workingDir = typeof adapter.working_dir === 'string' ? adapter.working_dir : '';
    config.invokeMode =
      adapter.invoke_mode === 'sync' || adapter.invoke_mode === 'spawn' ? String(adapter.invoke_mode) : 'spawn';
    config.source = candidate;
    break;
  }

  if (typeof process.env[`${envPrefix}_ENABLED`] === 'string') {
    config.enabled = process.env[`${envPrefix}_ENABLED`] === 'true';
    config.source = 'environment';
  }
  if (typeof process.env[`${envPrefix}_COMMAND`] === 'string') {
    config.commandTemplate = process.env[`${envPrefix}_COMMAND`] ?? '';
    config.source = 'environment';
  }
  if (typeof process.env[`${envPrefix}_WORKDIR`] === 'string') {
    config.workingDir = process.env[`${envPrefix}_WORKDIR`] ?? '';
    config.source = 'environment';
  }
  if (typeof process.env[`${envPrefix}_INVOKE_MODE`] === 'string') {
    const value = process.env[`${envPrefix}_INVOKE_MODE`];
    if (value === 'sync' || value === 'spawn') {
      config.invokeMode = value;
      config.source = 'environment';
    }
  }

  return config;
}

function inferWorkerWaitingState(args: {
  adapterMode: string | null;
  readiness: CompletionReadiness;
  supervisor: string | null;
  evidenceExists: boolean;
}): WorkerLaunchStatus['waitingState'] {
  const { adapterMode, readiness, supervisor, evidenceExists } = args;
  if (readiness.readyForFinish) return 'ready_to_finish';
  if (evidenceExists && !readiness.completionReady) return 'evidence_present';
  if (supervisor === 'worker_blocked' || adapterMode === 'invoke_failed' || adapterMode === 'blocked_missing_config') return 'blocked';
  if (adapterMode === 'prepared_only') return 'prepared';
  if (adapterMode === 'invoked' || adapterMode === 'invoked_retry_wrapper') return 'waiting_on_worker';
  return 'idle';
}

function buildWorkerLaunchStatus(args: {
  worker: 'claude' | 'codex';
  active: boolean;
  state: RunState | null;
  context: RunContext | null;
  config: AdapterConfigSummary;
  readiness: CompletionReadiness;
  handoffPath: string;
  handoffExists: boolean;
  handoffContent: string | null;
  evidencePath: string;
  evidenceExists: boolean;
  completionPath: string;
}): WorkerLaunchStatus {
  const {
    worker,
    active,
    state,
    context,
    config,
    readiness,
    handoffPath,
    handoffExists,
    handoffContent,
    evidencePath,
    evidenceExists,
    completionPath,
  } = args;
  const prefix = worker === 'claude' ? 'claude' : 'codex';
  const adapterMode =
    normalizeString(state?.[`${prefix}_adapter_mode` as keyof RunState] as string | undefined) ??
    normalizeString(context?.[`${prefix}_adapter_mode` as keyof RunContext] as string | undefined) ??
    'unknown';
  const lastLaunchResult =
    normalizeString(state?.[`${prefix}_execution_last_result` as keyof RunState] as string | undefined) ??
    normalizeString(context?.[`${prefix}_execution_last_result` as keyof RunContext] as string | undefined);
  const lastLaunchCommand =
    normalizeString(state?.[`${prefix}_execution_last_command` as keyof RunState] as string | undefined) ??
    normalizeString(context?.[`${prefix}_execution_last_command` as keyof RunContext] as string | undefined);
  const lastLaunchAttemptAt =
    normalizeString(state?.[`${prefix}_execution_last_attempt_at` as keyof RunState] as string | undefined) ??
    normalizeString(context?.[`${prefix}_execution_last_attempt_at` as keyof RunContext] as string | undefined);

  return {
    worker,
    label: worker === 'claude' ? 'Claude' : 'Codex',
    active,
    handoffPath,
    handoffExists: active ? handoffExists : false,
    handoffContent,
    evidencePath,
    evidenceExists,
    evidenceReady: active ? readiness.evidenceReady : false,
    evidenceReason: active
      ? readiness.evidenceReason
      : `${worker === 'claude' ? 'Build' : 'Earlier pipeline phases'} must complete before ${worker === 'claude' ? 'Claude' : 'Codex'} evidence is evaluated.`,
    completionPath,
    completionExists: readiness.completionExists,
    completionReady: active ? readiness.completionReady : false,
    completionReason: active ? readiness.completionReason : 'Completion signal is not relevant yet for this phase.',
    adapterConfigured: config.enabled && config.commandTemplate.trim().length > 0,
    adapterSource: config.source,
    adapterMode,
    lastLaunchAttemptAt,
    lastLaunchResult,
    lastLaunchCommand,
    waitingState: active
      ? inferWorkerWaitingState({
          adapterMode,
          readiness,
          supervisor: state?.supervisor_state ?? context?.supervisor_state ?? null,
          evidenceExists,
        })
      : 'idle',
    finishBlocker: active ? (readiness.readyForFinish ? null : readiness.blocker) : `${worker === 'claude' ? 'Build' : 'Claude + gates'} must complete before ${worker === 'claude' ? 'Claude' : 'Codex'} is actionable.`,
  };
}

function buildReviewPacketPreview(label: string, pathValue: string, content: string | null): ReviewPacketPreview {
  return {
    label,
    path: pathValue,
    exists: content !== null,
    content,
  };
}

function buildPrTitle(args: {
  branch: string | null;
  taskTitle: string | null;
  taskId: string | null;
}): string {
  const taskTitle = normalizeString(args.taskTitle);
  if (taskTitle) return taskTitle;
  if (args.branch) return args.branch.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return args.taskId ?? 'PathOS pipeline update';
}

function buildPrDescription(args: {
  branch: string | null;
  taskTitle: string | null;
  currentSummary: string | null;
  currentBullets: string[];
  codexBullets: string[];
}): string {
  const summary = normalizeString(args.currentSummary) ?? 'Implementation and operator-flow updates for the active run.';
  const lines = ['## Summary', `- ${summary}`];

  if (args.currentBullets.length > 0) {
    lines.push('', '## Implementation Notes', ...args.currentBullets.map((item) => `- ${item}`));
  }
  if (args.codexBullets.length > 0) {
    lines.push('', '## Codex Review Highlights', ...args.codexBullets.map((item) => `- ${item}`));
  }
  lines.push('', '## Run Context');
  if (args.taskTitle) lines.push(`- Task: ${args.taskTitle}`);
  if (args.branch) lines.push(`- Branch: ${args.branch}`);
  return `${lines.join('\n')}\n`;
}

export async function readRunIndex(): Promise<RunIndexEntry[]> {
  const indexPath = path.join(getRunsRoot(), 'index.json');
  const data = await readJsonFile<RunIndex>(indexPath);
  if (!data?.runs) return [];
  return [...data.runs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function readCurrentRunId(): Promise<string | null> {
  const filePath = path.join(getRunsRoot(), 'current-run.txt');
  const text = await readTextFile(filePath);
  return text?.trim() ?? null;
}

export async function readRunState(runId: string): Promise<RunState | null> {
  return readJsonFile<RunState>(path.join(getRunDir(runId), 'state.json'));
}

export async function readRunContext(runId: string): Promise<RunContext | null> {
  return readJsonFile<RunContext>(path.join(getRunDir(runId), 'run-context.json'));
}

export async function readRunEvents(runId: string): Promise<PipelineEvent[]> {
  const eventsPath = path.join(getRunDir(runId), 'events.log');
  const raw = await readTextFile(eventsPath);
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as PipelineEvent;
      } catch {
        return { message: line };
      }
    })
    .reverse();
}

export async function readServiceState(): Promise<ServiceState | null> {
  return readJsonFile<ServiceState>(path.join(getPipelineRoot(), 'logs', 'pipeline-service.state.json'));
}

export async function readSchedulerLock(): Promise<SchedulerLock | null> {
  const runsRoot = getRunsRoot();
  const entries = await listDir(runsRoot);
  const lockFile = entries.find((entry) => entry.startsWith('scheduler-loop.lock') && entry.endsWith('.json') && !entry.includes('removed'));
  if (!lockFile) return null;
  return readJsonFile<SchedulerLock>(path.join(runsRoot, lockFile));
}

export async function readRunArtifacts(runId: string): Promise<string[]> {
  return listDir(path.join(getRunDir(runId), 'artifacts'));
}

export async function readDesignNotes(runId: string): Promise<string | null> {
  return readTextFile(path.join(getRunDir(runId), 'artifacts', 'design-reference', 'design-notes.md'));
}

export async function readTaskSpec(runId: string): Promise<string | null> {
  return readTextFile(getRunTaskSpecPath(runId));
}

export async function readOverviewData(): Promise<OverviewData> {
  const [runs, currentRunId, serviceState, schedulerLock] = await Promise.all([
    readRunIndex(),
    readCurrentRunId(),
    readServiceState(),
    readSchedulerLock(),
  ]);

  const activeStatuses = new Set([
    'ready_for_claude',
    'ready_for_cursor',
    'awaiting_visual_approval',
    'hardening',
    'ready_for_final_judgment',
    'final_review',
    'ready_for_codex',
    'spec_locked',
  ]);
  const gateStatuses = new Set(['awaiting_visual_approval', 'ready_for_final_judgment', 'final_review']);

  return {
    currentRunId,
    runs,
    serviceState,
    schedulerLocked: schedulerLock !== null,
    schedulerLock,
    activeCount: runs.filter((run) => !run.archived && activeStatuses.has(run.status)).length,
    pendingGateCount: runs.filter((run) => !run.archived && gateStatuses.has(run.status)).length,
  };
}

export async function readRunDetail(runId: string): Promise<RunDetail> {
  const allRuns = await readRunIndex();
  const indexEntry = allRuns.find((run) => run.run_id === runId) ?? null;

  const taskSpecPath = getRunTaskSpecPath(runId);
  const runtimeValidationPath = getRunRuntimeValidationPath(runId);
  const runtimeValidationPlaywrightPath = getRunRuntimeValidationPlaywrightPath(runId);
  const claudeHandoffPath = getRunClaudeHandoffPath(runId);
  const claudeCompletionPath = getRunClaudeCompletionPath(runId);
  const codexHandoffPath = getRunCodexHandoffPath(runId);
  const codexCompletionPath = getRunCodexCompletionPath(runId);
  const codexReviewPath = getRunCodexReviewPath(runId);
  const visualReviewPath = getRunVisualReviewPath(runId);
  const workerHeartbeatPath = getRunWorkerHeartbeatPath(runId);
  const finalReviewPromptPath = getRunFinalReviewPromptPath(runId);
  const finalReviewGeneratedPromptPath = getRunFinalReviewGeneratedPromptPath(runId);
  const finalJudgmentPath = getRunFinalJudgmentPath(runId);
  const prTitlePath = getRunPrTitlePath(runId);
  const prDescriptionPath = getRunPrDescriptionPath(runId);
  const builderPromptPath = getRunBuilderPromptPath(runId);
  const currentArtifactPath = getRunCurrentArtifactPath(runId);

  const [
    state,
    context,
    artifactFiles,
    designNotes,
    taskSpecContent,
    runtimeValidationContent,
    runtimeValidationPlaywrightResult,
    currentArtifactContent,
    claudeHandoffContent,
    codexHandoffContent,
    codexReviewContent,
    claudeCompletionContent,
    codexCompletionContent,
    workerHeartbeatContent,
    finalReviewPromptContent,
    finalReviewGeneratedPromptContent,
    finalJudgmentRecord,
    prTitleContent,
    prDescriptionContent,
    eventsPreview,
    taskSpecUpdatedAt,
    runtimeValidationUpdatedAt,
    currentArtifactUpdatedAt,
    claudeHandoffUpdatedAt,
    codexHandoffUpdatedAt,
    codexReviewUpdatedAt,
    builderPromptUpdatedAt,
    taskSpecExists,
    runtimeValidationExists,
    claudeHandoffExists,
    claudeCompletionExists,
    codexHandoffExists,
    codexCompletionExists,
    codexReviewExists,
    visualReviewExists,
    workerHeartbeatExists,
    finalReviewGeneratedPromptExists,
    finalJudgmentExists,
    prTitleExists,
    prDescriptionExists,
    builderPromptExists,
    currentArtifactExists,
    claudeAdapterConfig,
    codexAdapterConfig,
  ] = await Promise.all([
    readRunState(runId),
    readRunContext(runId),
    readRunArtifacts(runId),
    readDesignNotes(runId),
    readTaskSpec(runId),
    readTextFile(runtimeValidationPath),
    readJsonFile<Record<string, unknown>>(runtimeValidationPlaywrightPath),
    readTextFile(currentArtifactPath),
    readTextFile(claudeHandoffPath),
    readTextFile(codexHandoffPath),
    readTextFile(codexReviewPath),
    readTextFile(claudeCompletionPath),
    readTextFile(codexCompletionPath),
    readTextFile(workerHeartbeatPath),
    readTextFile(finalReviewPromptPath),
    readTextFile(finalReviewGeneratedPromptPath),
    readJsonFile<FinalJudgmentRecord>(finalJudgmentPath),
    readTextFile(prTitlePath),
    readTextFile(prDescriptionPath),
    readRunEvents(runId).then((events) => events.slice(0, 18)),
    readFileUpdatedAt(taskSpecPath),
    readFileUpdatedAt(runtimeValidationPath),
    readFileUpdatedAt(currentArtifactPath),
    readFileUpdatedAt(claudeHandoffPath),
    readFileUpdatedAt(codexHandoffPath),
    readFileUpdatedAt(codexReviewPath),
    readFileUpdatedAt(builderPromptPath),
    fileExists(taskSpecPath),
    fileExists(runtimeValidationPath),
    fileExists(claudeHandoffPath),
    fileExists(claudeCompletionPath),
    fileExists(codexHandoffPath),
    fileExists(codexCompletionPath),
    fileExists(codexReviewPath),
    fileExists(visualReviewPath),
    fileExists(workerHeartbeatPath),
    fileExists(finalReviewGeneratedPromptPath),
    fileExists(finalJudgmentPath),
    fileExists(prTitlePath),
    fileExists(prDescriptionPath),
    fileExists(builderPromptPath),
    fileExists(currentArtifactPath),
    readAdapterConfig('claude'),
    readAdapterConfig('codex'),
  ]);

  const heartbeat = inferHeartbeat(state, workerHeartbeatContent);
  const status = state?.status ?? context?.status ?? '';
  const phase = state?.phase ?? context?.phase ?? '';
  const claudeActive =
    phase === 'C' &&
    ['ready_for_claude', 'implementation_ready', 'implementation_in_progress', 'needs_visual_revision', 'needs_repair_pass'].includes(status);
  const codexActive = ['ready_for_codex', 'hardening', 'approved_for_hardening'].includes(status);
  const taskSpecAnalysis = analyzeTaskSpecForRun(taskSpecContent, {
    updatedAt: taskSpecUpdatedAt,
    runStartedAt: context?.started_at ?? indexEntry?.created_at ?? null,
  });
  const runStartedAt = context?.started_at ?? indexEntry?.created_at ?? null;
  const artifactFreshnessBaseline = latestTimestamp(runStartedAt, taskSpecAnalysis.updatedAt);
  const taskSpecContentForWorkspace = taskSpecAnalysis.confirmedForRun ? taskSpecContent : null;
  const currentArtifactFresh = isArtifactFresh(currentArtifactUpdatedAt, artifactFreshnessBaseline);
  const claudeHandoffFresh = isArtifactFresh(claudeHandoffUpdatedAt, artifactFreshnessBaseline);
  const codexHandoffFresh = isArtifactFresh(codexHandoffUpdatedAt, artifactFreshnessBaseline);
  const codexReviewFresh = isArtifactFresh(codexReviewUpdatedAt, artifactFreshnessBaseline);
  const builderPromptFresh = isArtifactFresh(builderPromptUpdatedAt, artifactFreshnessBaseline);
  const runtimeValidationFresh = isArtifactFresh(runtimeValidationUpdatedAt, artifactFreshnessBaseline);
  const postBuildClaudePhaseReached =
    statusIn(status, [
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
    ]) ||
    (taskSpecAnalysis.isReady && builderPromptExists && builderPromptFresh && claudeHandoffExists && claudeHandoffFresh);
  const implementationEvidencePhaseReached = statusIn(status, [
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
  const visualReviewPhaseReached = statusIn(status, [
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
  const runtimePhaseReached = statusIn(status, [
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
  const codexPhaseReached = statusIn(status, [
    'ready_for_codex',
    'hardening',
    'approved_for_hardening',
    'ready_for_final_judgment',
    'final_review',
    'merge_ready',
    'committed',
    'no_commit',
  ]);
  const finalReviewPhaseReached = statusIn(status, [
    'ready_for_final_judgment',
    'final_review',
    'merge_ready',
    'committed',
    'no_commit',
  ]);
  const commitPrepPhaseReached = statusIn(status, ['merge_ready', 'committed', 'no_commit']);
  const currentArtifactVisible = currentArtifactFresh && implementationEvidencePhaseReached;
  const claudeHandoffVisible = claudeHandoffFresh && postBuildClaudePhaseReached;
  const claudeCompletionVisible = claudeCompletionExists && implementationEvidencePhaseReached;
  const visualReviewVisible = visualReviewExists && visualReviewPhaseReached;
  const runtimeValidationVisible = runtimeValidationExists && runtimeValidationFresh && runtimePhaseReached;
  const codexHandoffVisible = codexHandoffExists && codexHandoffFresh && codexPhaseReached;
  const codexCompletionVisible = codexCompletionExists && codexPhaseReached;
  const codexReviewVisible = codexReviewExists && codexReviewFresh && codexPhaseReached;
  const finalReviewPromptVisible = finalReviewGeneratedPromptExists && finalReviewPhaseReached;
  const finalJudgmentVisible = finalJudgmentExists && finalReviewPhaseReached;
  const prTitleVisible = prTitleExists && commitPrepPhaseReached;
  const prDescriptionVisible = prDescriptionExists && commitPrepPhaseReached;
  const currentArtifactContentForWorkspace = currentArtifactVisible ? currentArtifactContent : null;
  const claudeHandoffContentForWorkspace = claudeHandoffVisible ? claudeHandoffContent : null;
  const codexHandoffContentForWorkspace = codexHandoffVisible ? codexHandoffContent : null;
  const codexReviewContentForWorkspace = codexReviewVisible ? codexReviewContent : null;
  const runtimeValidationContentForWorkspace = runtimeValidationVisible ? runtimeValidationContent : null;

  const claudeReadiness = inferCompletionReadiness({
    worker: 'claude',
    expected:
      (state?.phase ?? context?.phase) === 'C' &&
      ['implementation_ready', 'implementation_in_progress', 'needs_visual_revision', 'needs_repair_pass'].includes(status),
    handoffExists: claudeHandoffVisible,
    evidenceContent: currentArtifactContentForWorkspace,
    completionContent: claudeCompletionVisible ? claudeCompletionContent : null,
    runId,
  });

  const codexReadiness = inferCompletionReadiness({
    worker: 'codex',
    expected: ['ready_for_codex', 'hardening', 'approved_for_hardening'].includes(status),
    handoffExists: codexHandoffVisible,
    evidenceContent: codexReviewContentForWorkspace,
    completionContent: codexCompletionVisible ? codexCompletionContent : null,
    runId,
  });

  const guidance = deriveGuidance({
    state,
    context,
    events: eventsPreview,
    claude: claudeReadiness,
    codex: codexReadiness,
    heartbeat,
  });
  const lifecycle = deriveLifecycle(state, context, guidance);
  const runtimeValidation = analyzeRuntimeValidation(runtimeValidationContentForWorkspace);
  const runtimeValidationAutomation = inferRuntimeValidationAutomation({
    result: runtimeValidationPlaywrightResult,
    resultPath: runtimeValidationPlaywrightPath,
    runtimeValidationPath,
    state,
    context,
  });

  const artifactPreviewNames = [
    'task.md',
    'current.md',
    'claude-handoff.md',
    'claude-completion.json',
    'visual-review.md',
    'runtime-validation.md',
    'runtime-validation.playwright.json',
    'codex-handoff.md',
    'codexReview.md',
    'codex-completion.json',
    'worker-heartbeat.json',
    'finalReviewPrompt.md',
    'final-judgment.json',
    'pr-title.txt',
    'pr-description.md',
  ].filter((name) => artifactFiles.includes(name));
  const phaseInactiveArtifactNames = new Set<string>(
    [
      !claudeHandoffVisible ? 'claude-handoff.md' : null,
      !claudeCompletionVisible ? 'claude-completion.json' : null,
      !currentArtifactVisible ? 'current.md' : null,
      !visualReviewVisible ? 'visual-review.md' : null,
      !runtimeValidationVisible ? 'runtime-validation.md' : null,
      !codexHandoffVisible ? 'codex-handoff.md' : null,
      !codexCompletionVisible ? 'codex-completion.json' : null,
      !codexReviewVisible ? 'codexReview.md' : null,
      !finalReviewPromptVisible ? 'finalReviewPrompt.md' : null,
      !finalJudgmentVisible ? 'final-judgment.json' : null,
      !prTitleVisible ? 'pr-title.txt' : null,
      !prDescriptionVisible ? 'pr-description.md' : null,
    ].filter((name): name is string => Boolean(name))
  );
  const staleArtifactNames = new Set<string>(
    [
      !taskSpecAnalysis.confirmedForRun ? 'task.md' : null,
      !currentArtifactVisible ? 'current.md' : null,
      !claudeHandoffVisible ? 'claude-handoff.md' : null,
      !codexHandoffVisible ? 'codex-handoff.md' : null,
      !codexReviewVisible ? 'codexReview.md' : null,
      !runtimeValidationVisible ? 'runtime-validation.md' : null,
    ].filter((name): name is string => Boolean(name))
  );
  const artifactPreviewFiles = (
    await Promise.all(artifactPreviewNames.map((name) => buildArtifactPreview(runId, name)))
  ).map((artifact) =>
    staleArtifactNames.has(artifact.name) || phaseInactiveArtifactNames.has(artifact.name)
      ? {
          ...artifact,
          exists: false,
          previewable: false,
          content: null,
          previewError:
            artifact.name === 'task.md'
              ? 'This task artifact predates the current run and is not treated as confirmed.'
              : phaseInactiveArtifactNames.has(artifact.name)
              ? 'This artifact belongs to a later phase and is hidden until that phase is active.'
              : 'This artifact predates the current run context and is suppressed from the default workspace.',
        }
      : artifact
  );

  const hasDesignReference = state?.has_design_reference ?? artifactFiles.includes('design-reference') ?? false;

  const claudeCompletionStatus =
    (claudeCompletionVisible ? (await readJsonFile<{ status?: string }>(claudeCompletionPath))?.status : null) ?? null;
  const codexCompletionStatus =
    (codexCompletionVisible ? (await readJsonFile<{ status?: string }>(codexCompletionPath))?.status : null) ?? null;

  const taskTitle = firstHeading(taskSpecContentForWorkspace);
  const currentSummary = summarizeParagraph(currentArtifactContentForWorkspace);
  const currentBullets = collectBullets(currentArtifactContentForWorkspace);
  const codexBullets = collectBullets(codexReviewContentForWorkspace);

  const workerLaunch = {
    claude: buildWorkerLaunchStatus({
      worker: 'claude',
      active: claudeActive,
      state,
      context,
      config: claudeAdapterConfig,
      readiness: claudeReadiness,
      handoffPath: claudeHandoffPath,
      handoffExists: claudeHandoffVisible,
      handoffContent: claudeHandoffContentForWorkspace,
      evidencePath: currentArtifactPath,
      evidenceExists: currentArtifactVisible,
      completionPath: claudeCompletionPath,
    }),
    codex: buildWorkerLaunchStatus({
      worker: 'codex',
      active: codexActive,
      state,
      context,
      config: codexAdapterConfig,
      readiness: codexReadiness,
      handoffPath: codexHandoffPath,
      handoffExists: codexHandoffVisible,
      handoffContent: codexHandoffContentForWorkspace,
      evidencePath: codexReviewPath,
      evidenceExists: codexReviewVisible,
      completionPath: codexCompletionPath,
    }),
  };

  const finalReviewReady =
    ['ready_for_final_judgment', 'final_review', 'merge_ready', 'committed', 'no_commit'].includes(status) &&
    codexReadiness.evidenceReady &&
    codexReadiness.completionReady;
  const decisionRecord = finalJudgmentRecord ?? null;
  const commitAllowed = finalReviewReady && decisionRecord?.decision === 'approve_for_commit';
  const noCommitAllowed = finalReviewReady && decisionRecord?.decision === 'no_commit';
  const repairAllowed = finalReviewReady && decisionRecord?.decision === 'repair_required';

  const finalReview: FinalReviewData = {
    ready: finalReviewReady,
    promptExists: finalReviewPromptContent !== null || finalReviewGeneratedPromptContent !== null,
    commitDecision: context?.commit_decision ?? null,
    expectedCommitAction: 'Run `pp commit -Message "<msg>"` or `pp no-commit` after final judgment.',
    expectedPrTitle: taskTitle,
    expectedPrSummary: currentBullets[0] ?? currentSummary,
    awaitingJudgment: finalReviewReady && !decisionRecord,
    decisionRecord,
    packet: [
      buildReviewPacketPreview('Implementation Evidence', currentArtifactPath, currentArtifactContentForWorkspace),
      buildReviewPacketPreview('Codex Review', codexReviewPath, codexReviewContentForWorkspace),
      buildReviewPacketPreview('Final Review Handoff', finalReviewPromptPath, finalReviewPromptContent),
      buildReviewPacketPreview('Generated Final Review Prompt', finalReviewGeneratedPromptPath, finalReviewGeneratedPromptContent),
    ],
    commitAllowed,
    noCommitAllowed,
    repairAllowed,
    commitBlocker: commitAllowed ? null : decisionRecord ? 'Record an "approve for commit" final judgment before committing.' : 'Awaiting recorded final judgment.',
    noCommitBlocker: noCommitAllowed ? null : decisionRecord ? 'Record a "no-commit" final judgment before closing with no-commit.' : 'Awaiting recorded final judgment.',
    nextApprovalNeeded: decisionRecord
      ? decisionRecord.decision === 'approve_for_commit'
        ? 'Review the commit scope, then approve bounded commit.'
        : decisionRecord.decision === 'no_commit'
        ? 'Record no-commit from the GUI to close the run.'
        : 'Route the run back to repair using the recorded judgment notes.'
      : 'Obtain ChatGPT judgment, then record it here.',
    pushGuidance:
      status === 'committed'
        ? `Commit complete. Next step: push branch${context?.branch ? ` '${context.branch}'` : ''} and open a PR with the saved PR packet.`
        : 'Push/PR creation stays outside this slice. Use the saved branch/title/description after commit.',
  };

  const prPrepAvailable =
    finalReviewReady && claudeReadiness.evidenceReady && codexReadiness.evidenceReady;
  const prPrep: PrPrepData = {
    available: prPrepAvailable,
    blocker: prPrepAvailable ? null : 'PR prep is unavailable until the run reaches real implementation and Codex evidence at final review.',
    branch: context?.branch ?? indexEntry?.branch ?? null,
    generatedTitle: prPrepAvailable
      ? buildPrTitle({
          branch: context?.branch ?? indexEntry?.branch ?? null,
          taskTitle,
          taskId: context?.task_id ?? state?.task_id ?? indexEntry?.run_id ?? null,
        })
      : '',
    generatedDescription: prPrepAvailable
      ? buildPrDescription({
          branch: context?.branch ?? indexEntry?.branch ?? null,
          taskTitle,
          currentSummary,
          currentBullets,
          codexBullets,
        })
      : '',
    savedTitle: prPrepAvailable ? prTitleContent : null,
    savedDescription: prPrepAvailable ? prDescriptionContent : null,
    titlePath: prTitlePath,
    descriptionPath: prDescriptionPath,
  };

  const commitScope = await deriveCommitScope({
    runId,
    repoKey: context?.repo ?? indexEntry?.repo ?? null,
    branch: context?.branch ?? indexEntry?.branch ?? null,
    taskSpecContent: taskSpecContentForWorkspace,
    currentArtifactContent: currentArtifactContentForWorkspace,
    codexReviewContent: codexReviewContentForWorkspace,
    runtimeValidationContent: runtimeValidationContentForWorkspace,
    designNotesContent: designNotes,
  });

  const executionPosition = deriveExecutionPosition({
    state,
    context,
    guidance,
    lifecycle,
    heartbeat,
    claude: claudeReadiness,
    codex: codexReadiness,
    workerLaunch,
    runtimeValidation,
    runtimeValidationAutomation,
    taskSpecAnalysis,
    finalReview,
    commitScope,
    paths: {
      runDir: getRunDir(runId),
      taskSpec: taskSpecPath,
      runtimeValidation: runtimeValidationPath,
      claudeHandoff: claudeHandoffPath,
      claudeCompletion: claudeCompletionPath,
      codexHandoff: codexHandoffPath,
      codexCompletion: codexCompletionPath,
      codexReview: codexReviewPath,
      visualReview: visualReviewPath,
      workerHeartbeat: workerHeartbeatPath,
      finalReviewPrompt: finalReviewPromptPath,
      finalReviewGeneratedPrompt: finalReviewGeneratedPromptPath,
      finalJudgment: finalJudgmentPath,
      prTitle: prTitlePath,
      prDescription: prDescriptionPath,
      builderPrompt: builderPromptPath,
      currentArtifact: currentArtifactPath,
    },
  });
  const executionTrace = deriveExecutionTrace(eventsPreview, guidance);

  const derived: RunDerivedData = {
    lifecycle,
    guidance,
    executionPosition,
    executionTrace,
    claudeReadiness,
    codexReadiness,
    heartbeat,
    runtimeValidation,
    runtimeValidationAutomation,
    taskSpecAnalysis,
    commitScope,
    workerLaunch,
    finalReview,
    prPrep,
  };

  return {
    index: indexEntry,
    state,
    context,
    artifactFiles,
    artifactPreviewFiles,
    hasDesignReference,
    designNotesContent: designNotes,
    taskSpecContent: taskSpecContentForWorkspace,
    runtimeValidationContent: runtimeValidationContentForWorkspace,
    eventsPreview,
    paths: {
      runDir: getRunDir(runId),
      taskSpec: taskSpecPath,
      runtimeValidation: runtimeValidationPath,
      claudeHandoff: claudeHandoffPath,
      claudeCompletion: claudeCompletionPath,
      codexHandoff: codexHandoffPath,
      codexCompletion: codexCompletionPath,
      codexReview: codexReviewPath,
      visualReview: visualReviewPath,
      workerHeartbeat: workerHeartbeatPath,
      finalReviewPrompt: finalReviewPromptPath,
      finalReviewGeneratedPrompt: finalReviewGeneratedPromptPath,
      finalJudgment: finalJudgmentPath,
      prTitle: prTitlePath,
      prDescription: prDescriptionPath,
      builderPrompt: builderPromptPath,
      currentArtifact: currentArtifactPath,
    },
    artifactStatus: {
      taskSpecExists: taskSpecAnalysis.confirmedForRun && taskSpecExists,
      runtimeValidationExists: runtimeValidationVisible,
      claudeHandoffExists: claudeHandoffVisible,
      claudeCompletionExists: claudeCompletionVisible,
      codexHandoffExists: codexHandoffVisible,
      codexCompletionExists: codexCompletionVisible,
      codexReviewExists: codexReviewVisible,
      visualReviewExists: visualReviewVisible,
      workerHeartbeatExists,
      builderPromptExists: builderPromptExists && builderPromptFresh,
      currentArtifactExists: currentArtifactVisible,
      finalReviewGeneratedPromptExists: finalReviewPromptVisible,
      finalJudgmentExists: finalJudgmentVisible,
      prTitleExists: prTitleVisible,
      prDescriptionExists: prDescriptionVisible,
    },
    claudeCompletionStatus,
    codexCompletionStatus,
    derived,
  };
}
