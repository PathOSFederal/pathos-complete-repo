'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  File,
  Copy,
  CheckCircle2,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import type { RunDetail, CommitScopeData, ArtifactPreview } from '@/lib/types';
import { focusPanel } from '@/components/run-detail/action-feedback';
import { cn } from '@/lib/utils';

interface WorkspaceContextRailProps {
  artifactStatus: RunDetail['artifactStatus'];
  commitScope: CommitScopeData;
  artifactPreviewFiles: ArtifactPreview[];
  /** Artifact label names that are relevant to the current focus state */
  relevantArtifactKeys?: string[];
}

// ─── Rail section (collapsible) ───────────────────────────────────────────────

function RailSection({
  title,
  count,
  countColor,
  defaultOpen,
  children,
}: {
  title: string;
  count?: number;
  countColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="border-b border-[#18212c] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-[#0f1520] transition-colors"
      >
        <div className="flex items-center gap-1.5 text-slate-300">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span className="font-medium">{title}</span>
        </div>
        {count !== undefined && (
          <span className={cn('font-medium', countColor ?? 'text-slate-500')}>{count}</span>
        )}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

// Map artifact name to collapsible panel id for "Open"
const ARTIFACT_TO_PANEL: Record<string, string> = {
  'task.md': 'current-step-workspace',
  'current.md': 'current-step-workspace',
  'claude-handoff.md': 'current-step-workspace',
  'codex-handoff.md': 'current-step-workspace',
  'runtime-validation.md': 'current-step-workspace',
  'final-review.md': 'current-step-workspace',
  'final-judgment.json': 'current-step-workspace',
  'pr-title.txt': 'current-step-workspace',
  'pr-description.md': 'current-step-workspace',
};

const ARTIFACT_REASON: Record<string, string> = {
  'task.md': 'Authoritative task input for the whole run.',
  'current.md': 'Primary implementation evidence used before review can open.',
  'claude-handoff.md': 'Prompt packet used to start or repair the implementation worker.',
  'claude-completion.json': 'Completion signal proving the worker finished cleanly.',
  'codex-handoff.md': 'Prompt packet used to start Codex hardening.',
  'codexReview.md': 'Codex hardening evidence used before final review.',
  'runtime-validation.md': 'Runtime evidence required before later phases can continue.',
  'final-judgment.json': 'Recorded closing decision for this run.',
};

// ─── Relevant Now item (Open, Copy contents, Copy path, Reveal in folder) ───────

function RelevantArtifactItem({ file }: { file: ArtifactPreview }) {
  const [copied, setCopied] = useState<'contents' | 'path' | 'reveal' | null>(null);

  async function copyContents() {
    if (!file.content) return;
    await navigator.clipboard.writeText(file.content);
    setCopied('contents');
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function copyPath() {
    await navigator.clipboard.writeText(file.path);
    setCopied('path');
    window.setTimeout(() => setCopied(null), 1600);
  }

  function openPanel() {
    const panelId = ARTIFACT_TO_PANEL[file.name] ?? 'current-step-workspace';
    focusPanel(panelId);
  }

  async function revealInFolder() {
    await navigator.clipboard.writeText(file.path);
    setCopied('reveal');
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="px-4 py-2 group">
      <div className="flex items-center gap-1.5 mb-1">
        <FileText className="h-3 w-3 text-cyan-600 flex-shrink-0" />
        <span className="text-cyan-400 font-mono text-[10px] truncate">{file.name}</span>
        {copied && (
          <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-0.5 flex-shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            {copied === 'reveal' ? 'Path copied' : copied === 'path' ? 'path' : 'copied'}
          </span>
        )}
      </div>
      <div className="pl-4 text-[10px] text-slate-500">{ARTIFACT_REASON[file.name] ?? 'Relevant artifact for the current step.'}</div>
      <div className="flex items-center gap-2 pl-4 flex-wrap">
        <button
          type="button"
          onClick={openPanel}
          className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-200 transition-colors"
          title="Open in panel"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          Open
        </button>
        {file.content && (
          <button
            type="button"
            onClick={copyContents}
            className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-200 transition-colors"
          >
            <Copy className="h-2.5 w-2.5" />
            Copy contents
          </button>
        )}
        <button
          type="button"
          onClick={copyPath}
          className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-200 transition-colors"
        >
          <Copy className="h-2.5 w-2.5" />
          Copy path
        </button>
        <button
          type="button"
          onClick={revealInFolder}
          className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-200 transition-colors"
          title="Copy path (paste in Explorer to reveal)"
        >
          <FolderOpen className="h-2.5 w-2.5" />
          Reveal in folder
        </button>
      </div>
      {copied === 'reveal' && (
        <div className="pl-4 mt-0.5 text-[10px] text-slate-500">Paste in Explorer to reveal.</div>
      )}
    </div>
  );
}

// ─── Quick link ───────────────────────────────────────────────────────────────

function QuickLink({
  label,
  icon,
  detailId,
}: {
  label: string;
  icon: React.ReactNode;
  detailId: string;
}) {
  return (
    <button
      type="button"
      onClick={() => focusPanel(detailId)}
      className="flex items-center gap-2 w-full px-6 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#0f1520] transition-colors"
    >
      <span className="text-slate-600">{icon}</span>
      {label}
    </button>
  );
}

// ─── Main rail ────────────────────────────────────────────────────────────────

export function WorkspaceContextRail({
  artifactStatus,
  commitScope,
  artifactPreviewFiles,
  relevantArtifactKeys,
}: WorkspaceContextRailProps) {
  // Resolve "Relevant Now" files: match label keys to previewable artifact files
  const relevantNow = (relevantArtifactKeys ?? [])
    .map((key) => artifactPreviewFiles.find((f) => f.name === key))
    .filter((f): f is ArtifactPreview => !!f && f.exists);

  // All artifacts that exist and have preview (operable: Open, Copy, Reveal)
  const allArtifactFiles = artifactPreviewFiles.filter((f) => f.exists);
  const artifactCount = allArtifactFiles.length;

  const relevantFiles = commitScope.changedFiles.filter((f) => f.category === 'likely_relevant');
  const suspiciousFiles = commitScope.changedFiles.filter((f) => f.category === 'suspicious');
  const hasSuspicious = suspiciousFiles.length > 0;

  return (
    <div className="h-full bg-[#080d13] overflow-y-auto">
      {/* Rail header */}
      <div className="px-4 py-3 border-b border-[#18212c]">
        <span className="text-xs font-semibold text-slate-300">Context</span>
      </div>

      {/* ── Relevant Now (dynamic, keyed to current focus state) ── */}
      {relevantNow.length > 0 && (
        <RailSection
          title="Relevant Now"
          count={relevantNow.length}
          countColor="text-cyan-500"
          defaultOpen
        >
          <div className="px-4 pb-2 text-[11px] text-cyan-300">
            New or required artifacts are surfaced here first so you do not have to hunt for them.
          </div>
          {relevantNow.map((file) => (
            <RelevantArtifactItem key={file.name} file={file} />
          ))}
        </RailSection>
      )}

      {/* ── All Artifacts (operable: Open, Copy contents, Copy path, Reveal) ── */}
      <RailSection title="All Artifacts" count={artifactCount} defaultOpen={false}>
        {allArtifactFiles.map((file) => (
          <RelevantArtifactItem key={file.name} file={file} />
        ))}
        {artifactCount === 0 && (
          <div className="px-6 py-1 text-xs text-slate-600">No artifacts yet.</div>
        )}
      </RailSection>

      {/* ── Relevant Files (git scope) ── */}
      {commitScope.available && relevantFiles.length > 0 && (
        <RailSection
          title="Relevant Files"
          count={commitScope.likelyRelevantCount}
          defaultOpen={false}
        >
          {relevantFiles.slice(0, 8).map((f) => (
            <div key={f.path} className="flex items-center gap-2 px-6 py-1 text-xs">
              <File className="h-3 w-3 text-slate-600 flex-shrink-0" />
              <span className="text-cyan-400/80 truncate font-mono text-[10px]">{f.path}</span>
            </div>
          ))}
          {commitScope.likelyRelevantCount > 8 && (
            <div className="px-6 py-1 text-[10px] text-slate-600">
              +{commitScope.likelyRelevantCount - 8} more
            </div>
          )}
        </RailSection>
      )}

      {/* ── Suspicious Files — open by default when present ── */}
      {hasSuspicious && (
        <RailSection
          title="Suspicious Files"
          count={commitScope.suspiciousCount}
          countColor="text-red-400"
          defaultOpen
        >
          {suspiciousFiles.map((f) => (
            <div key={f.path} className="flex items-center gap-1.5 px-6 py-1 text-xs">
              <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
              <span className="text-red-400/80 truncate font-mono text-[10px]">{f.path}</span>
            </div>
          ))}
          {commitScope.warning && (
            <div className="px-6 pt-1 pb-0 text-[10px] text-amber-500">{commitScope.warning}</div>
          )}
        </RailSection>
      )}

      {/* ── Quick Access ── */}
      <RailSection title="Quick Access" defaultOpen>
        <QuickLink
          label="Task Spec"
          icon={<FileText className="h-3 w-3" />}
          detailId="current-step-workspace"
        />
        <QuickLink
          label="Runtime Validation"
          icon={<FileText className="h-3 w-3" />}
          detailId="current-step-workspace"
        />
        <QuickLink
          label="Final Review"
          icon={<FileText className="h-3 w-3" />}
          detailId="current-step-workspace"
        />
        <QuickLink
          label="PR Prep"
          icon={<FileText className="h-3 w-3" />}
          detailId="current-step-workspace"
        />
      </RailSection>

      {/* ── Commit status summary ── */}
      {commitScope.available && (
        <div className="px-4 py-3 border-t border-[#18212c] mt-auto">
          <div className="text-[10px] text-slate-600 mb-1">Commit status</div>
          <div
            className={cn(
              'text-xs font-medium',
              hasSuspicious ? 'text-red-400' : 'text-emerald-400',
            )}
          >
            {hasSuspicious ? 'Not safe to commit' : 'Ready to commit'}
          </div>
        </div>
      )}
    </div>
  );
}
