import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { getRunRuntimeValidationPath, isValidRunId } from '@/lib/pipeline-reader';

export const dynamic = 'force-dynamic';

function resolveRunId(params: { id: string }): string {
  const runId = params.id;
  if (!isValidRunId(runId)) {
    throw new Error('Invalid run id.');
  }
  return runId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const runId = resolveRunId(await params);
    const artifactPath = getRunRuntimeValidationPath(runId);
    const content = await fs.readFile(artifactPath, 'utf-8');
    const stats = await fs.stat(artifactPath);

    return NextResponse.json({
      runId,
      path: artifactPath,
      content,
      exists: true,
      updatedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to read runtime validation artifact.',
      },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const runId = resolveRunId(await params);
    const body = (await request.json()) as { content?: unknown };
    if (typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Runtime validation content must be a string.' }, { status: 400 });
    }

    const artifactPath = getRunRuntimeValidationPath(runId);
    await fs.writeFile(artifactPath, body.content, 'utf-8');
    const stats = await fs.stat(artifactPath);

    return NextResponse.json({
      runId,
      path: artifactPath,
      content: body.content,
      exists: true,
      updatedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to save runtime validation artifact.',
      },
      { status: 400 }
    );
  }
}
