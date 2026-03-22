import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { PipelineCommandResult } from './types';
import { getPipelineRoot, isValidRunId } from './pipeline-reader';

type RepoKey = 'frontend' | 'backend' | 'desktop_legacy';
type FlowKey = 'frontend' | 'backend' | 'fullstack' | 'tooling';
type AllowedAction =
  | 'start'
  | 'build'
  | 'continue-run'
  | 'claude-prepare'
  | 'claude-start'
  | 'claude-check'
  | 'claude-finish'
  | 'reconcile-claude-completion'
  | 'approve'
  | 'reject-reopen'
  | 'repair-pass'
  | 'mark-invalid'
  | 'revise'
  | 'runtime-start'
  | 'runtime-done'
  | 'runtime-fail'
  | 'codex-prepare'
  | 'codex-start'
  | 'codex-check'
  | 'codex-finish'
  | 'reconcile-codex-completion'
  | 'worker-retry'
  | 'resume'
  | 'final-review'
  | 'commit'
  | 'no-commit'
  | 'archive-run'
  | 'status'
  | 'current';

const ALLOWED_ACTIONS = new Set<AllowedAction>([
  'start',
  'build',
  'continue-run',
  'claude-prepare',
  'claude-start',
  'claude-finish',
  'status',
  'current',
  'claude-check',
  'reconcile-claude-completion',
  'approve',
  'reject-reopen',
  'repair-pass',
  'mark-invalid',
  'revise',
  'runtime-start',
  'runtime-done',
  'runtime-fail',
  'codex-prepare',
  'codex-start',
  'codex-check',
  'codex-finish',
  'reconcile-codex-completion',
  'worker-retry',
  'resume',
  'final-review',
  'commit',
  'no-commit',
  'archive-run',
]);

const ALLOWED_REPOS = new Set<RepoKey>(['frontend', 'backend', 'desktop_legacy']);
const ALLOWED_FLOWS = new Set<FlowKey>(['frontend', 'backend', 'fullstack', 'tooling']);
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function quotePowerShell(value: string): string {
  return `"${value.replace(/"/g, '`"')}"`;
}

function getWrapperPath(): string {
  return path.join(getPipelineRoot(), 'pp.ps1');
}

function getPowerShellExecutable(): string {
  const candidates = [
    process.env.PATHOS_OPERATOR_PWSH,
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    'pwsh.exe',
    'powershell.exe',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate.includes('\\')) {
      if (fs.existsSync(candidate)) return candidate;
      continue;
    }
    return candidate;
  }

  return 'powershell.exe';
}

function buildDisplayCommand(args: string[]): string {
  return ['.\\pp.ps1', ...args.map((arg) => (arg.includes(' ') ? quotePowerShell(arg) : arg))].join(' ');
}

function runPowerShellFile(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const ppPath = getWrapperPath();
  const shellPath = getPowerShellExecutable();
  const psArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ppPath, ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(shellPath, psArgs, {
      cwd: getPipelineRoot(),
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

function validateRepo(repo: unknown): RepoKey {
  assert(typeof repo === 'string' && ALLOWED_REPOS.has(repo as RepoKey), 'Invalid repo.');
  return repo as RepoKey;
}

function validateFlow(flow: unknown): FlowKey {
  assert(typeof flow === 'string' && ALLOWED_FLOWS.has(flow as FlowKey), 'Invalid flow type.');
  return flow as FlowKey;
}

function validateRunId(runId: unknown): string {
  assert(typeof runId === 'string' && isValidRunId(runId), 'Invalid run id.');
  return runId;
}

function validateBranchName(branchName: unknown): string {
  assert(typeof branchName === 'string' && branchName.trim().length > 0, 'Branch name is required.');
  assert(BRANCH_PATTERN.test(branchName), 'Invalid branch name.');
  return branchName;
}

function validateNotes(notes: unknown): string {
  assert(typeof notes === 'string' && notes.trim().length > 0, 'Notes are required.');
  assert(notes.length <= 2000, 'Notes are too long.');
  return notes.trim();
}

function validateCommitMessage(message: unknown): string {
  assert(typeof message === 'string' && message.trim().length > 0, 'Commit message is required.');
  assert(message.length <= 200, 'Commit message is too long.');
  return message.trim();
}

async function executeCommands(action: string, commands: string[], runId?: string | null): Promise<PipelineCommandResult> {
  const timestamp = new Date().toISOString();
  const stdoutParts: string[] = [];
  const stderrParts: string[] = [];
  let exitCode = 0;

  for (const commandArgs of commands.map((command) => command.split('\u0000'))) {
    const result = await runPowerShellFile(commandArgs);
    stdoutParts.push(result.stdout);
    stderrParts.push(result.stderr);
    exitCode = result.exitCode;
    if (result.exitCode !== 0) break;
  }

  const displayCommands = commands.map((command) => buildDisplayCommand(command.split('\u0000')));

  return {
    ok: exitCode === 0,
    action,
    command: displayCommands.join('\n'),
    commands: displayCommands,
    exitCode,
    stdout: stdoutParts.filter(Boolean).join('\n\n'),
    stderr: stderrParts.filter(Boolean).join('\n\n'),
    timestamp,
    runId: runId ?? null,
  };
}

export async function executePipelineAction(
  action: string,
  payload: Record<string, unknown>
): Promise<PipelineCommandResult> {
  assert(ALLOWED_ACTIONS.has(action as AllowedAction), 'Disallowed action.');

  switch (action as AllowedAction) {
    case 'start': {
      const runId = validateRunId(payload.taskId);
      const repo = validateRepo(payload.repo);
      const flow = validateFlow(payload.flow);
      const createBranch = payload.createBranch === true;

      const args = ['start', '-TaskId', runId, '-Repo', repo, '-Flow', flow];
      if (createBranch) {
        args.push('-CreateBranch');
        if (payload.branchName) {
          args.push('-BranchName', validateBranchName(payload.branchName));
        }
      } else if (payload.branchName) {
        args.push('-BranchName', validateBranchName(payload.branchName));
      }

      return executeCommands('start', [args.join('\u0000')], runId);
    }
    case 'build':
    case 'continue-run':
    case 'claude-prepare':
    case 'claude-start':
    case 'claude-check':
    case 'claude-finish':
    case 'reconcile-claude-completion':
    case 'approve':
    case 'reject-reopen':
    case 'repair-pass':
    case 'mark-invalid':
    case 'runtime-start':
    case 'runtime-done':
    case 'runtime-fail':
    case 'codex-prepare':
    case 'codex-start':
    case 'codex-check':
    case 'codex-finish':
    case 'reconcile-codex-completion':
    case 'worker-retry':
    case 'resume':
    case 'final-review':
    case 'no-commit': {
      const runId = validateRunId(payload.runId);
      const resolvedAction =
        action === 'continue-run'
          ? 'scheduler-run'
          : 
        action === 'claude-prepare'
          ? 'claude-start'
          : action === 'codex-prepare'
          ? 'codex-start'
          : action;
      const commands = [
        ...(action === 'continue-run' ? [] : [['use', '-RunId', runId].join('\u0000')]),
        [
          resolvedAction,
          ...(action === 'claude-prepare' || action === 'codex-prepare' ? ['-PrepareOnly'] : []),
          ...(action === 'continue-run' ? ['-RunId', runId, '-ConsumeCompletions'] : []),
        ].join('\u0000'),
      ];
      return executeCommands(action, commands, runId);
    }
    case 'archive-run': {
      const runId = validateRunId(payload.runId);
      const commands = [['archive-runs', '-RunId', runId].join('\u0000')];
      return executeCommands('archive-run', commands, runId);
    }
    case 'commit': {
      const runId = validateRunId(payload.runId);
      const message = validateCommitMessage(payload.message);
      const commands = [
        ['use', '-RunId', runId].join('\u0000'),
        ['commit', '-Message', message].join('\u0000'),
      ];
      return executeCommands('commit', commands, runId);
    }
    case 'reject-reopen':
    case 'repair-pass':
    case 'revise': {
      const runId = validateRunId(payload.runId);
      const baseNotes = validateNotes(payload.notes);
      const notes =
        action === 'reject-reopen'
          ? `[REJECT AND REOPEN IMPLEMENTATION] ${baseNotes}`
          : action === 'repair-pass'
          ? `[REQUEST REPAIR PASS] ${baseNotes}`
          : baseNotes;
      const commands = [
        ['use', '-RunId', runId].join('\u0000'),
        ['revise', '-Type', 'implementation', '-Notes', notes].join('\u0000'),
      ];
      return executeCommands(action, commands, runId);
    }
    case 'mark-invalid': {
      const runId = validateRunId(payload.runId);
      const notes = validateNotes(payload.notes);
      const commands = [
        ['use', '-RunId', runId].join('\u0000'),
        ['worker-fail', '-ErrorType', 'invalid_run', '-ErrorMessage', notes].join('\u0000'),
      ];
      return executeCommands('mark-invalid', commands, runId);
    }
    case 'status':
    case 'current': {
      return executeCommands(action, [[action].join('\u0000')], null);
    }
    default:
      throw new Error('Unsupported action.');
  }
}
