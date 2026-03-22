import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { getRunFinalJudgmentPath, isValidRunId } from '@/lib/pipeline-reader';
import type { FinalJudgmentRecord } from '@/lib/types';

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
    const artifactPath = getRunFinalJudgmentPath(runId);
    const content = await fs.readFile(artifactPath, 'utf-8');
    const stats = await fs.stat(artifactPath);

    return NextResponse.json({
      runId,
      path: artifactPath,
      record: JSON.parse(content) as FinalJudgmentRecord,
      exists: true,
      updatedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to read final judgment artifact.',
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
    const body = (await request.json()) as Partial<FinalJudgmentRecord>;
    const decision = body.decision;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (!['approve_for_commit', 'no_commit', 'repair_required'].includes(String(decision))) {
      return NextResponse.json({ error: 'Invalid final judgment decision.' }, { status: 400 });
    }
    if (notes.length === 0 || notes.length > 4000) {
      return NextResponse.json({ error: 'Final judgment notes are required and must be under 4000 characters.' }, { status: 400 });
    }

    const artifactPath = getRunFinalJudgmentPath(runId);
    const record: FinalJudgmentRecord = {
      decision: decision as FinalJudgmentRecord['decision'],
      notes,
      recordedAt: new Date().toISOString(),
      recordedBy: 'operator-console',
    };
    await fs.writeFile(artifactPath, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
    const stats = await fs.stat(artifactPath);

    return NextResponse.json({
      runId,
      path: artifactPath,
      record,
      exists: true,
      updatedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to save final judgment artifact.',
      },
      { status: 400 }
    );
  }
}
