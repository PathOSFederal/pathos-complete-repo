import { FileText, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { RunDetail, CommitScopeData } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ArtifactEntry {
  label: string;
  exists: boolean;
  status: 'loaded' | 'generated' | 'pending' | 'ready';
}

interface WorkspaceArtifactsSidebarProps {
  artifactStatus: RunDetail['artifactStatus'];
  commitScope: CommitScopeData;
}

function ArtifactRow({ label, exists, status }: ArtifactEntry) {
  const colorMap: Record<string, string> = {
    loaded: 'text-slate-400',
    generated: 'text-cyan-400',
    pending: 'text-slate-600',
    ready: 'text-emerald-400',
  };

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1a2230] last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className={cn('h-3 w-3 flex-shrink-0', exists ? 'text-slate-400' : 'text-slate-700')} />
        <span className={cn('text-xs truncate', exists ? 'text-slate-300' : 'text-slate-600')}>{label}</span>
      </div>
      <span className={cn('text-[10px] font-medium ml-2 flex-shrink-0', colorMap[status] ?? 'text-slate-600')}>
        {status}
      </span>
    </div>
  );
}

function commitStatusColor(scope: CommitScopeData): string {
  if (!scope.available) return 'text-slate-500';
  if (scope.suspiciousCount > 0) return 'text-red-400';
  return 'text-emerald-400';
}

function commitStatusLabel(scope: CommitScopeData): string {
  if (!scope.available) return 'Not available';
  if (scope.suspiciousCount > 0) return 'Not safe to commit';
  return 'Ready to commit';
}

export function WorkspaceArtifactsSidebar({
  artifactStatus,
  commitScope,
}: WorkspaceArtifactsSidebarProps) {
  const artifacts: ArtifactEntry[] = [
    {
      label: 'task.md',
      exists: artifactStatus.taskSpecExists,
      status: artifactStatus.taskSpecExists ? 'loaded' : 'pending',
    },
    {
      label: 'current.md',
      exists: artifactStatus.currentArtifactExists,
      status: artifactStatus.currentArtifactExists ? 'generated' : 'pending',
    },
    {
      label: 'codexReview.md',
      exists: artifactStatus.codexReviewExists,
      status: artifactStatus.codexReviewExists ? 'ready' : 'pending',
    },
    {
      label: 'runtime-validation.md',
      exists: artifactStatus.runtimeValidationExists,
      status: artifactStatus.runtimeValidationExists ? 'generated' : 'pending',
    },
    {
      label: 'final-review.md',
      exists: artifactStatus.finalReviewGeneratedPromptExists,
      status: artifactStatus.finalReviewGeneratedPromptExists ? 'ready' : 'pending',
    },
    {
      label: 'claude-handoff.md',
      exists: artifactStatus.claudeHandoffExists,
      status: artifactStatus.claudeHandoffExists ? 'generated' : 'pending',
    },
    {
      label: 'codex-handoff.md',
      exists: artifactStatus.codexHandoffExists,
      status: artifactStatus.codexHandoffExists ? 'generated' : 'pending',
    },
    {
      label: 'final-judgment.md',
      exists: artifactStatus.finalJudgmentExists,
      status: artifactStatus.finalJudgmentExists ? 'ready' : 'pending',
    },
    {
      label: 'pr-title.txt',
      exists: artifactStatus.prTitleExists,
      status: artifactStatus.prTitleExists ? 'ready' : 'pending',
    },
    {
      label: 'pr-description.md',
      exists: artifactStatus.prDescriptionExists,
      status: artifactStatus.prDescriptionExists ? 'ready' : 'pending',
    },
  ];

  const relevantFiles = commitScope.changedFiles.filter((f) => f.category === 'likely_relevant');
  const suspiciousFiles = commitScope.changedFiles.filter((f) => f.category === 'suspicious');

  return (
    <div className="flex flex-col gap-4">
      {/* Artifacts panel */}
      <div className="rounded-xl border border-[#1f2937] bg-[#0b1016] p-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-3">Artifacts</div>
        <div>
          {artifacts.map((a) => (
            <ArtifactRow key={a.label} {...a} />
          ))}
        </div>
      </div>

      {/* Commit scope panel */}
      <div className="rounded-xl border border-[#1f2937] bg-[#0b1016] p-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-3">Commit Scope</div>

        {commitScope.available ? (
          <>
            {relevantFiles.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-slate-500 mb-1.5">
                  Relevant files ({commitScope.likelyRelevantCount})
                </div>
                {relevantFiles.slice(0, 5).map((f) => (
                  <div key={f.path} className="flex items-center gap-1.5 py-0.5">
                    <FileText className="h-3 w-3 text-slate-500 flex-shrink-0" />
                    <span className="text-[11px] text-cyan-400 truncate font-mono">{f.path}</span>
                  </div>
                ))}
                {commitScope.likelyRelevantCount > 5 && (
                  <div className="text-[10px] text-slate-600 mt-1">+{commitScope.likelyRelevantCount - 5} more</div>
                )}
              </div>
            )}

            {suspiciousFiles.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <div className="text-[10px] text-amber-500">
                    Suspicious files ({commitScope.suspiciousCount})
                  </div>
                </div>
                {suspiciousFiles.slice(0, 3).map((f) => (
                  <div key={f.path} className="flex items-center gap-1.5 py-0.5">
                    <FileText className="h-3 w-3 text-amber-600 flex-shrink-0" />
                    <span className="text-[11px] text-amber-400/70 truncate font-mono">{f.path}</span>
                  </div>
                ))}
              </div>
            )}

            {commitScope.warning && (
              <div className="text-[11px] text-amber-400 mb-2">{commitScope.warning}</div>
            )}

            <div className="pt-2 border-t border-[#1a2230]">
              <div className="text-[10px] text-slate-500 mb-1">Commit status</div>
              <div className={cn('text-xs font-medium', commitStatusColor(commitScope))}>
                {commitStatusLabel(commitScope)}
              </div>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-600">Commit scope not yet available.</div>
        )}
      </div>
    </div>
  );
}
