'use client';

import { useMemo, useState } from 'react';
import { FileText, Image, BookOpen, FolderOpen } from 'lucide-react';
import type { ArtifactPreview } from '@/lib/types';

interface ArtifactsPanelProps {
  runId: string;
  artifactFiles: string[];
  artifactPreviewFiles: ArtifactPreview[];
  hasDesignReference: boolean;
  designNotesContent: string | null;
}

function ArtifactIcon({ filename }: { filename: string }) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return <FileText className="w-3.5 h-3.5 text-blue-400" />;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.svg') || lower.endsWith('.webp'))
    return <Image className="w-3.5 h-3.5 text-purple-400" />;
  if (lower.endsWith('.json')) return <FileText className="w-3.5 h-3.5 text-amber-400" />;
  if (lower === 'design-reference') return <BookOpen className="w-3.5 h-3.5 text-green-400" />;
  return <FileText className="w-3.5 h-3.5 text-slate-400" />;
}

const KNOWN_ARTIFACT_LABELS: Record<string, string> = {
  'task.md': 'Task Spec',
  'runtime-validation.md': 'Runtime Validation',
  'current.md': 'Implementation Notes',
  'codexReview.md': 'Codex Review',
  'worker-heartbeat.json': 'Worker Heartbeat',
  'finalReviewPrompt.md': 'Final Review Handoff',
  'final-judgment.json': 'Final Judgment Record',
  'pr-title.txt': 'PR Title',
  'pr-description.md': 'PR Description',
  'design-reference': 'Design Reference',
};

export function ArtifactsPanel({ runId, artifactFiles, artifactPreviewFiles, hasDesignReference, designNotesContent }: ArtifactsPanelProps) {
  const total = artifactFiles.length;
  const previewMap = useMemo(
    () => Object.fromEntries(artifactPreviewFiles.map((artifact) => [artifact.name, artifact])),
    [artifactPreviewFiles]
  );
  const [selected, setSelected] = useState<string | null>(artifactPreviewFiles[0]?.name ?? null);
  const active = selected ? previewMap[selected] : null;

  return (
    <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Artifacts</h3>
        <span className="text-xs text-slate-500">{total} file{total !== 1 ? 's' : ''}</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-6 text-slate-600 text-sm">
          No artifacts found.
          <div className="mt-1 text-xs text-slate-700">Artifacts are generated during pipeline execution.</div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {artifactFiles.map((file) => {
              const label = KNOWN_ARTIFACT_LABELS[file] ?? file;
              const preview = previewMap[file];
              return (
                <button
                  key={file}
                  type="button"
                  onClick={() => preview && setSelected(file)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg bg-[#161b22] border border-[#1e2430] hover:bg-[#1a2030] transition-colors text-left"
                >
                  <ArtifactIcon filename={file} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-300 truncate mono">{file}</div>
                    {label !== file && <div className="text-xs text-slate-600">{label}</div>}
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {preview ? (preview.previewable ? 'preview' : 'info') : 'file'}
                  </span>
                </button>
              );
            })}
          </div>

          {active && (
            <div className="mt-4 rounded border border-[#1e2430] bg-[#161b22] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">{active.path}</div>
                <div className="text-xs text-slate-400">
                  {active.editable ? 'editable in dedicated panel' : active.previewable ? 'preview-only' : 'no inline preview'}
                </div>
              </div>
              {active.previewable ? (
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{active.content}</pre>
              ) : (
                <div className="mt-3 text-xs text-slate-500">{active.previewError ?? 'Preview unavailable.'}</div>
              )}
            </div>
          )}

          {hasDesignReference && (
            <div className="mt-4 p-3 bg-green-900/15 border border-green-800/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-green-400 font-medium mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                Design Reference Present
              </div>
              <div className="text-xs text-green-300/60">
                Path: <code className="mono">runs/{runId}/artifacts/design-reference/</code>
              </div>
              {designNotesContent && (
                <details className="mt-2">
                  <summary className="text-xs text-green-400/80 cursor-pointer hover:text-green-300">
                    View design-notes.md
                  </summary>
                  <pre className="mt-2 text-xs text-slate-400 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {designNotesContent}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="mt-3 text-xs text-slate-600">
            <FolderOpen className="w-3 h-3 inline mr-1" />
            Located in <code className="mono">dev-pipeline/runs/{runId}/artifacts/</code>
          </div>
        </>
      )}
    </div>
  );
}
