import { NextResponse } from 'next/server';
import { readOverviewData } from '@/lib/pipeline-reader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await readOverviewData();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/runs] Error reading overview data:', err);
    return NextResponse.json(
      { error: 'Failed to read pipeline state', detail: String(err) },
      { status: 500 }
    );
  }
}
