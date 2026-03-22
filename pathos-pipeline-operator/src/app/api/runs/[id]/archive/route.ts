import { NextResponse } from 'next/server';
import { executePipelineAction } from '@/lib/pipeline-bridge';
import { isValidRunId } from '@/lib/pipeline-reader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isValidRunId(id)) {
      return NextResponse.json({ error: 'Invalid run id.' }, { status: 400 });
    }

    const result = await executePipelineAction('archive-run', { runId: id });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Archive run failed.',
      },
      { status: 400 },
    );
  }
}
