import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { getRunTaskSpecPath, isValidRunId } from '@/lib/pipeline-reader';

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
    const taskPath = getRunTaskSpecPath(runId);
    const content = await fs.readFile(taskPath, 'utf-8');
    const stats = await fs.stat(taskPath);

    return NextResponse.json({
      runId,
      path: taskPath,
      content,
      exists: true,
      updatedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to read task spec.',
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
      return NextResponse.json({ error: 'Task spec content must be a string.' }, { status: 400 });
    }

    const taskPath = getRunTaskSpecPath(runId);
    await fs.writeFile(taskPath, body.content, 'utf-8');
    const stats = await fs.stat(taskPath);

    return NextResponse.json({
      runId,
      path: taskPath,
      content: body.content,
      exists: true,
      updatedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to save task spec.',
      },
      { status: 400 }
    );
  }
}
