import { NextResponse } from 'next/server';
import { readRunDetail } from '@/lib/pipeline-reader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing run id' }, { status: 400 });
  }

  try {
    const detail = await readRunDetail(id);
    if (!detail.index && !detail.state && !detail.context) {
      return NextResponse.json({ error: 'Run not found', runId: id }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error(`[/api/runs/${id}] Error reading run detail:`, err);
    return NextResponse.json(
      { error: 'Failed to read run detail', detail: String(err) },
      { status: 500 }
    );
  }
}
