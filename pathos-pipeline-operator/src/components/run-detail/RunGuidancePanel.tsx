import type {
  CompletionReadiness,
  ExactExecutionPosition,
  RunGuidance,
  WorkerHeartbeatSummary,
} from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';

interface RunGuidancePanelProps {
  guidance: RunGuidance;
  executionPosition: ExactExecutionPosition;
  claude: CompletionReadiness;
  codex: CompletionReadiness;
  heartbeat: WorkerHeartbeatSummary;
}

function toneForState(state: ExactExecutionPosition['runnerState']): string {
  if (state === 'complete') return 'border-green-800/40 bg-green-900/10';
  if (state === 'blocked') return 'border-red-800/40 bg-red-900/10';
  if (state === 'stale') return 'border-amber-800/40 bg-amber-900/10';
  if (state === 'ready_to_advance') return 'border-cyan-800/40 bg-cyan-900/10';
  return 'border-blue-800/40 bg-blue-900/10';
}

function readinessText(label: string, item: CompletionReadiness): string {
  if (!item.expected) return `${label} not active`;
  if (item.readyForFinish) return `${label} ready to finish`;
  if (item.evidenceReady && !item.completionReady) return `${label} evidence detected; completion signal incomplete`;
  return item.blocker ?? `${label} waiting on worker evidence`;
}

export function RunGuidancePanel({
  guidance,
  executionPosition,
  claude,
  codex,
  heartbeat,
}: RunGuidancePanelProps) {
  return (
    <div className={`rounded-lg border p-5 ${toneForState(executionPosition.runnerState)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Exact Execution Position</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">{executionPosition.headline}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {executionPosition.currentWaitReason ?? guidance.summary}
          </p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>{executionPosition.currentPhase}</div>
          <div className="mt-1">Owner: {executionPosition.currentOwner}</div>
          <div className="mt-1 capitalize">Runner: {executionPosition.runnerState.replace(/_/g, ' ')}</div>
          <div className="mt-1">Auto-advance: {executionPosition.autoAdvancePossible ? 'possible' : 'not available'}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs">
          <div className="text-slate-500">Current sub-step</div>
          <div className="mt-1 text-slate-200">{executionPosition.currentSubStep}</div>
          <div className="mt-2 text-slate-500">Last completed</div>
          <div className="mt-1 text-slate-300">{executionPosition.lastCompletedStep}</div>
        </div>
        <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs">
          <div className="text-slate-500">Next automatic action</div>
          <div className="mt-1 text-slate-300">{executionPosition.nextAutomaticAction ?? 'None until the next human/worker action.'}</div>
          <div className="mt-2 text-slate-500">Next human action</div>
          <div className="mt-1 text-slate-200">{executionPosition.nextHumanAction ?? 'No human action is currently required.'}</div>
        </div>
        <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs">
          <div className="text-slate-500">Current artifact / evidence</div>
          <div className="mt-1 text-slate-200">{executionPosition.currentArtifact?.label ?? '—'}</div>
          <div className="mt-1 break-all text-slate-400">{executionPosition.currentArtifact?.path ?? '—'}</div>
          {executionPosition.currentArtifact?.detail && (
            <div className="mt-2 text-slate-500">{executionPosition.currentArtifact.detail}</div>
          )}
        </div>
        <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs">
          <div className="text-slate-500">Latest command / result</div>
          <div className="mt-1 break-all text-slate-300">{executionPosition.lastCommand ?? 'No worker command recorded yet.'}</div>
          <div className="mt-2 text-slate-200">{executionPosition.lastResult ?? 'No result recorded yet.'}</div>
          <div className="mt-2 text-slate-500">
            Heartbeat: {executionPosition.lastHeartbeatAt ? formatRelativeTime(executionPosition.lastHeartbeatAt) : '—'}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs text-slate-300">
          <div className="text-slate-500">Claude</div>
          <div className="mt-1">{readinessText('Claude', claude)}</div>
        </div>
        <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs text-slate-300">
          <div className="text-slate-500">Codex</div>
          <div className="mt-1">{readinessText('Codex', codex)}</div>
        </div>
        <div className="rounded border border-[#1e2430] bg-[#0f1117] p-3 text-xs">
          <div className="text-slate-500">Heartbeat / freshness</div>
          <div className={`mt-1 ${heartbeat.freshness === 'stale' ? 'text-amber-300' : 'text-slate-300'}`}>
            {heartbeat.exists ? `${heartbeat.status} · ${heartbeat.freshness}` : 'missing'}
          </div>
          <div className="mt-2 text-slate-500">{heartbeat.recommendedAction ?? 'No heartbeat recovery action suggested.'}</div>
        </div>
      </div>
    </div>
  );
}
