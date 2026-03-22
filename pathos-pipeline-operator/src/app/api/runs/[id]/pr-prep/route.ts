import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { getRunPrDescriptionPath, getRunPrTitlePath, isValidRunId } from '@/lib/pipeline-reader';

export const dynamic = 'force-dynamic';

function resolveRunId(params: { id: string }): string {
  const runId = params.id;
  if (!isValidRunId(runId)) {
    throw new Error('Invalid run id.');
  }
  return runId;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const runId = resolveRunId(await params);
    const body = (await request.json()) as { title?: unknown; description?: unknown };
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (title.length === 0 || title.length > 200) {
      return NextResponse.json({ error: 'PR title is required and must be under 200 characters.' }, { status: 400 });
    }
    if (description.length === 0 || description.length > 12000) {
      return NextResponse.json({ error: 'PR description is required and must be under 12000 characters.' }, { status: 400 });
    }

    const titlePath = getRunPrTitlePath(runId);
    const descriptionPath = getRunPrDescriptionPath(runId);

    await fs.writeFile(titlePath, `${title}\n`, 'utf-8');
    await fs.writeFile(descriptionPath, `${description}\n`, 'utf-8');

    const titleStats = await fs.stat(titlePath);
    const descriptionStats = await fs.stat(descriptionPath);

    return NextResponse.json({
      runId,
      titlePath,
      descriptionPath,
      title,
      description,
      updatedAt: [titleStats.mtime.toISOString(), descriptionStats.mtime.toISOString()].sort().reverse()[0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to save PR prep artifacts.',
      },
      { status: 400 }
    );
  }
}
