import { NextResponse } from 'next/server';
import { readSchedulerLock, readServiceState } from '@/lib/pipeline-reader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const [schedulerLock, serviceState] = await Promise.all([
      readSchedulerLock(),
      readServiceState(),
    ]);

    return NextResponse.json({
      locked: schedulerLock !== null,
      schedulerLock,
      serviceState,
    });
  } catch (err) {
    console.error('[/api/scheduler] Error reading scheduler state:', err);
    return NextResponse.json(
      { error: 'Failed to read scheduler state', detail: String(err) },
      { status: 500 }
    );
  }
}
