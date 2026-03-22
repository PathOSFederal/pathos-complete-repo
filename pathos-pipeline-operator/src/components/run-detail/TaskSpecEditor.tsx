'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { analyzeTaskSpecContent } from '@/lib/task-spec';

interface TaskSpecEditorProps {
  runId: string;
  initialContent: string | null;
  taskPath: string;
  exists: boolean;
  updatedAt?: string | null;
  onSaved?: () => void;
  /** When provided, sync draft content to parent (e.g. for dock Save Task Spec). */
  onDraftChange?: (content: string) => void;
  /** When true, allow editing and saving even when file does not exist yet (intake). */
  allowCreate?: boolean;
}

export function TaskSpecEditor({
  runId,
  initialContent,
  taskPath,
  exists,
  updatedAt,
  onSaved,
  onDraftChange,
  allowCreate,
}: TaskSpecEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent ?? '');
  const [savedContent, setSavedContent] = useState(initialContent ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const next = initialContent ?? '';
    setContent(next);
    setSavedContent(next);
    onDraftChange?.(next);
  }, [initialContent, runId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [runId]);

  const isDirty = content !== savedContent;
  const canEdit = exists || allowCreate === true;
  const canSave = canEdit && (isDirty || (allowCreate && content.trim().length > 0));
  const draftAnalysis = analyzeTaskSpecContent(content);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/runs/${runId}/task`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Unable to save task spec.');
        return;
      }

      setSavedContent(content);
      setStatus(`Saved ${data.updatedAt ?? 'successfully'}.`);
      router.refresh();
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save task spec.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Task Spec</h3>
          <p className="mt-1 text-xs text-slate-500">
            Editing the real run-local `task.md`. No pipeline state is mutated here.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
        >
          {isSaving ? 'Saving…' : 'Save Task Spec'}
        </button>
      </div>

      <div className="mb-3 grid gap-3 md:grid-cols-2 text-xs">
        <div className="rounded border border-[#1e2430] bg-[#161b22] p-3">
          <div className="text-slate-500">Path</div>
          <div className="mt-1 break-all text-slate-300">{taskPath}</div>
        </div>
        <div className="rounded border border-[#1e2430] bg-[#161b22] p-3">
          <div className="text-slate-500">Status</div>
          <div className="mt-1 text-slate-300">
            {exists ? `Present${updatedAt ? ` · updated ${updatedAt}` : ''}` : 'Missing'}
          </div>
        </div>
      </div>

      {!draftAnalysis.isReady && (
        <div className="mb-3 rounded border border-amber-800/40 bg-amber-900/20 p-3 text-xs text-amber-300">
          {draftAnalysis.blockerReason}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
      {status && (
        <div className="mb-3 rounded border border-green-800/40 bg-green-900/20 p-3 text-xs text-green-300">
          {status}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          const next = e.target.value;
          setContent(next);
          onDraftChange?.(next);
        }}
        disabled={!canEdit}
        className="min-h-[360px] w-full rounded-md border border-[#1e2430] bg-[#161b22] p-4 font-mono text-sm text-slate-100 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  );
}
