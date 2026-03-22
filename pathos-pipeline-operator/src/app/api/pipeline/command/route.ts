import { NextResponse } from 'next/server';
import { executePipelineAction } from '@/lib/pipeline-bridge';
import { readRunDetail } from '@/lib/pipeline-reader';
import { getActionGuard } from '@/lib/run-workspace';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      payload?: Record<string, unknown>;
    };

    if (!body?.action) {
      return NextResponse.json({ error: 'Missing action.' }, { status: 400 });
    }

    const runId = typeof body.payload?.runId === 'string' ? body.payload.runId : null;
    if (runId) {
      const detail = await readRunDetail(runId);
      const status = detail.state?.status ?? detail.context?.status ?? detail.index?.status ?? 'unknown';
      const guard = getActionGuard(body.action, {
        status,
        derived: detail.derived,
        taskSpecReady: detail.derived.taskSpecAnalysis.isReady,
        builderPromptExists: detail.artifactStatus.builderPromptExists,
      });
      if (!guard.allowed) {
        return NextResponse.json(
          {
            ok: false,
            error: guard.reason ?? 'This action is blocked by the current run state.',
          },
          { status: 400 },
        );
      }
    }

    const result = await executePipelineAction(body.action, body.payload ?? {});
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Command execution failed.',
      },
      { status: 400 }
    );
  }
}
