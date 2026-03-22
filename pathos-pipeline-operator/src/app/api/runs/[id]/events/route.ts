import { NextResponse } from 'next/server';
import { readRunEvents } from '@/lib/pipeline-reader';

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
    const events = await readRunEvents(id);
    return NextResponse.json({ runId: id, events });
  } catch (err) {
    console.error(`[/api/runs/${id}/events] Error reading events:`, err);
    return NextResponse.json(
      { error: 'Failed to read events', detail: String(err) },
      { status: 500 }
    );
  }
}
