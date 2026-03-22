import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import { getPipelineRoot } from '@/lib/pipeline-reader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);
const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'staging', 'production']);

async function readRepoPath(repoKey: string): Promise<string | null> {
  const reposPath = path.join(getPipelineRoot(), 'repos.json');
  try {
    const raw = await fs.readFile(reposPath, 'utf-8');
    const parsed = JSON.parse(raw) as { repos?: Record<string, string> };
    return parsed.repos?.[repoKey] ?? null;
  } catch {
    return null;
  }
}

async function runGit(repoPath: string, args: string[]) {
  return execFileAsync('git', args, {
    cwd: repoPath,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      repo?: string;
      branch?: string;
      force?: boolean;
    };

    const repoKey = typeof body.repo === 'string' ? body.repo.trim() : '';
    const branch = typeof body.branch === 'string' ? body.branch.trim() : '';
    const force = body.force === true;

    if (!repoKey || !branch) {
      return NextResponse.json({ error: 'Repo and branch are required.' }, { status: 400 });
    }
    if (PROTECTED_BRANCHES.has(branch)) {
      return NextResponse.json({ error: `Branch '${branch}' is protected and cannot be deleted.` }, { status: 400 });
    }

    const repoPath = await readRepoPath(repoKey);
    if (!repoPath) {
      return NextResponse.json({ error: `Repo path is not configured for '${repoKey}'.` }, { status: 400 });
    }

    const currentBranch = (await runGit(repoPath, ['branch', '--show-current'])).stdout.trim();
    if (currentBranch === branch) {
      return NextResponse.json({ error: `Cannot delete the currently checked-out branch '${branch}'.` }, { status: 400 });
    }

    const branchCheck = (await runGit(repoPath, ['branch', '--list', branch])).stdout.trim();
    if (!branchCheck) {
      return NextResponse.json({ error: `Local branch '${branch}' was not found.` }, { status: 404 });
    }

    let isMerged = false;
    try {
      await runGit(repoPath, ['merge-base', '--is-ancestor', branch, 'HEAD']);
      isMerged = true;
    } catch {
      isMerged = false;
    }

    if (!isMerged && !force) {
      return NextResponse.json(
        {
          error: `Branch '${branch}' is not merged into the current HEAD.`,
          requiresForce: true,
        },
        { status: 409 },
      );
    }

    const args = ['branch', force ? '-D' : '-d', branch];
    const result = await runGit(repoPath, args);
    return NextResponse.json({
      ok: true,
      repo: repoKey,
      repoPath,
      branch,
      deleted: true,
      force,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Branch delete failed.',
      },
      { status: 400 },
    );
  }
}
