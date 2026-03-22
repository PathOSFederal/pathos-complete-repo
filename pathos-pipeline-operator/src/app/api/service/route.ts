import { NextResponse } from 'next/server';
import { readServiceState } from '@/lib/pipeline-reader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const serviceState = await readServiceState();
    return NextResponse.json({ serviceState });
  } catch (err) {
    console.error('[/api/service] Error reading service state:', err);
    return NextResponse.json(
      { error: 'Failed to read service state', detail: String(err) },
      { status: 500 }
    );
  }
}
