/**
 * ============================================================================
 * APPLICATION CONFIDENCE CENTER SCREEN — Track applications, status intel, next moves
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * Pass 1 scaffold: layout only. Left list of tracked applications, main area
 * with three placeholder cards (Status Intel, Next Best Moves, Timeline Forecast).
 * Empty state when no tracked applications; "Add tracked application" CTA opens
 * dialog scaffold. Status Intel card has "Explain" button that opens Explainer
 * Video modal scaffold. PathAdvisor rail receives stub anchor context when an
 * application is selected.
 */

'use client';

import type React from 'react';
import { useState, useCallback } from 'react';
import { Plus, HelpCircle, X } from 'lucide-react';
import { ModuleCard } from '../components/ModuleCard';
import { Tooltip } from '../components/Tooltip';
import { Z_DIALOG } from '../styles/zIndex';

// ---------------------------------------------------------------------------
// Stub type for PathAdvisor rail context (selected tracked application)
// ---------------------------------------------------------------------------

export interface ApplicationConfidenceAnchorContext {
  applicationId: string;
  title: string;
  agency: string;
  announcementNumber: string;
  currentStatus: string;
}

export interface ApplicationConfidenceCenterScreenProps {
  /** Called when the selected tracked application changes so the shell can pass context to PathAdvisor rail. */
  onAnchorContextChange?: (context: ApplicationConfidenceAnchorContext | null) => void;
}

// ---------------------------------------------------------------------------
// Minimal modal scaffold (no Radix; theme tokens only for zero theme drift)
// ---------------------------------------------------------------------------

function SimpleModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  if (!props.open) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: Z_DIALOG }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="simple-modal-title"
      aria-describedby="simple-modal-desc"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'var(--p-overlay-bg, rgba(0,0,0,0.5))' }}
        onClick={function () { props.onOpenChange(false); }}
      />
      <div
        className="relative max-h-[90vh] overflow-y-auto rounded-[var(--p-radius-lg)] border p-4 w-full max-w-lg"
        style={{
          background: 'var(--p-surface)',
          borderColor: 'var(--p-border)',
          boxShadow: 'var(--p-shadow-lg)',
        }}
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 id="simple-modal-title" className="font-semibold" style={{ color: 'var(--p-text)', fontSize: 'var(--p-font-size-section)' }}>
            {props.title}
          </h2>
          <button
            type="button"
            onClick={function () { props.onOpenChange(false); }}
            className="p-1 rounded-[var(--p-radius)] hover:opacity-80"
            style={{ color: 'var(--p-text-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p id="simple-modal-desc" className="mb-4" style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}>
          {props.description}
        </p>
        {props.children}
      </div>
    </div>
  );
}

/** Portaled tooltip wrapper (Overlay Rule v1). */
function InlineTooltip(props: {
  id: string;
  name: string;
  description: string;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <p className="font-semibold" style={{ color: 'var(--p-text)' }}>{props.name}</p>
      <p>{props.description}</p>
    </>
  );
  return (
    <Tooltip contentId={props.id} side="top" content={content}>
      {props.children}
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ApplicationConfidenceCenterScreen(props: ApplicationConfidenceCenterScreenProps) {
  const [trackedApps, setTrackedApps] = useState<ApplicationConfidenceAnchorContext[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  // Placeholder form state for Add tracked application dialog (scaffold only)
  const [addTitle, setAddTitle] = useState('');
  const [addAgency, setAddAgency] = useState('');
  const [addAnnouncementNumber, setAddAnnouncementNumber] = useState('');
  const [addCurrentStatus, setAddCurrentStatus] = useState('');

  const onAnchorContextChange = props.onAnchorContextChange;

  const handleSelectApp = useCallback(function (app: ApplicationConfidenceAnchorContext | null) {
    if (app !== null) {
      setSelectedId(app.applicationId);
      if (onAnchorContextChange) onAnchorContextChange(app);
    } else {
      setSelectedId(null);
      if (onAnchorContextChange) onAnchorContextChange(null);
    }
  }, [onAnchorContextChange]);

  const handleAddSubmit = useCallback(function () {
    const id = 'stub-' + Date.now();
    const newApp: ApplicationConfidenceAnchorContext = {
      applicationId: id,
      title: addTitle || 'Untitled',
      agency: addAgency || '',
      announcementNumber: addAnnouncementNumber || '',
      currentStatus: addCurrentStatus || '',
    };
    const next = [];
    for (let i = 0; i < trackedApps.length; i++) next.push(trackedApps[i]);
    next.push(newApp);
    setTrackedApps(next);
    setAddModalOpen(false);
    setAddTitle('');
    setAddAgency('');
    setAddAnnouncementNumber('');
    setAddCurrentStatus('');
    handleSelectApp(newApp);
  }, [trackedApps, addTitle, addAgency, addAnnouncementNumber, addCurrentStatus, handleSelectApp]);

  const hasTrackedApps = trackedApps.length > 0;

  return (
    <div className="p-4 lg:p-5 flex flex-col gap-4 h-full min-h-0">
      {/* Page header */}
      <div>
        <h1
          className="font-semibold"
          style={{ color: 'var(--p-text)', fontSize: 'var(--p-font-size-page-title)' }}
        >
          Application Confidence Center
        </h1>
        <p
          className="mt-0.5"
          style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}
        >
          Track applications and see status intel, next best moves, and timeline.
        </p>
      </div>

      <div className="flex flex-1 min-h-0 gap-4 flex-col lg:flex-row">
        {/* Left: list of tracked applications (or empty state) */}
        <div
          className="flex-shrink-0 lg:w-56 flex flex-col gap-2"
          style={{ borderRight: hasTrackedApps ? '1px solid var(--p-border)' : undefined }}
        >
          {hasTrackedApps ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[var(--p-letter-spacing-section)]" style={{ color: 'var(--p-text-dim)' }}>
                  Tracked applications
                </span>
              </div>
              <ul className="space-y-1 overflow-y-auto">
                {trackedApps.map(function (app) {
                  const isActive = selectedId === app.applicationId;
                  return (
                    <li key={app.applicationId}>
                      <button
                        type="button"
                        onClick={function () { handleSelectApp(app); }}
                        className="w-full text-left px-3 py-2 rounded-[var(--p-radius)] text-sm truncate"
                        style={{
                          background: isActive ? 'var(--p-accent-bg)' : 'transparent',
                          color: isActive ? 'var(--p-accent)' : 'var(--p-text-muted)',
                        }}
                      >
                        {app.title || 'Untitled'}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <InlineTooltip
                id="acc-add-app-tooltip"
                name="Add tracked application"
                description="Open a form to add a new job application to track in the Confidence Center."
              >
                <button
                  type="button"
                  onClick={function () { setAddModalOpen(true); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--p-radius)] text-sm font-medium border"
                  style={{
                    color: 'var(--p-accent)',
                    borderColor: 'var(--p-border)',
                    background: 'var(--p-surface2)',
                  }}
                  aria-describedby="acc-add-app-tooltip"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  Add tracked application
                </button>
              </InlineTooltip>
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center flex-1 py-8 px-4 rounded-[var(--p-radius-lg)] border border-dashed"
              style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface2)' }}
            >
              <p className="text-sm text-center mb-4" style={{ color: 'var(--p-text-muted)' }}>
                No tracked applications yet. Add one to see status intel and next best moves.
              </p>
              <InlineTooltip
                id="acc-empty-add-tooltip"
                name="Add tracked application"
                description="Open a form to add a new job application to track in the Confidence Center."
              >
                <button
                  type="button"
                  onClick={function () { setAddModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-[var(--p-radius)] font-medium"
                  style={{
                    color: 'var(--p-background)',
                    background: 'var(--p-accent)',
                  }}
                  aria-describedby="acc-empty-add-tooltip"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  Add tracked application
                </button>
              </InlineTooltip>
            </div>
          )}
        </div>

        {/* Main: three placeholder cards */}
        <div className="flex-1 min-w-0 space-y-4 overflow-y-auto">
          {/* Status Intel — placeholder + Explain button */}
          <ModuleCard title="Status Intel" variant="dense">
            <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
              Placeholder: status intel for the selected application will appear here.
            </p>
            <div className="mt-3">
              <InlineTooltip
                id="acc-explain-tooltip"
                name="Explain"
                description="Open an explainer video modal with a script preview. Generate is disabled in this scaffold."
              >
                <button
                  type="button"
                  onClick={function () { setExplainerOpen(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--p-radius)] text-sm font-medium border"
                  style={{
                    color: 'var(--p-accent)',
                    borderColor: 'var(--p-border)',
                    background: 'var(--p-surface2)',
                  }}
                  aria-describedby="acc-explain-tooltip"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Explain
                </button>
              </InlineTooltip>
            </div>
          </ModuleCard>

          {/* Next Best Moves — placeholder */}
          <ModuleCard title="Next Best Moves" variant="dense">
            <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
              Placeholder: next best moves will appear here.
            </p>
          </ModuleCard>

          {/* Timeline Forecast — placeholder / coming next */}
          <ModuleCard title="Timeline Forecast" variant="dense">
            <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
              Coming next.
            </p>
          </ModuleCard>
        </div>
      </div>

      {/* Add tracked application dialog scaffold */}
      <SimpleModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        title="Add tracked application"
        description="Add a job application to track in the Confidence Center. (Scaffold: fields are placeholders.)"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--p-text-dim)' }}>
              Title
            </label>
            <input
              type="text"
              value={addTitle}
              onChange={function (e) { setAddTitle(e.target.value); }}
              placeholder="Job title"
              className="w-full px-3 py-2 rounded-[var(--p-radius)] border text-sm"
              style={{ background: 'var(--p-surface2)', borderColor: 'var(--p-border)', color: 'var(--p-text)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--p-text-dim)' }}>
              Agency
            </label>
            <input
              type="text"
              value={addAgency}
              onChange={function (e) { setAddAgency(e.target.value); }}
              placeholder="Agency name"
              className="w-full px-3 py-2 rounded-[var(--p-radius)] border text-sm"
              style={{ background: 'var(--p-surface2)', borderColor: 'var(--p-border)', color: 'var(--p-text)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--p-text-dim)' }}>
              Announcement number
            </label>
            <input
              type="text"
              value={addAnnouncementNumber}
              onChange={function (e) { setAddAnnouncementNumber(e.target.value); }}
              placeholder="e.g. DE-12345678"
              className="w-full px-3 py-2 rounded-[var(--p-radius)] border text-sm"
              style={{ background: 'var(--p-surface2)', borderColor: 'var(--p-border)', color: 'var(--p-text)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--p-text-dim)' }}>
              Current status
            </label>
            <input
              type="text"
              value={addCurrentStatus}
              onChange={function (e) { setAddCurrentStatus(e.target.value); }}
              placeholder="e.g. Applied, Referred"
              className="w-full px-3 py-2 rounded-[var(--p-radius)] border text-sm"
              style={{ background: 'var(--p-surface2)', borderColor: 'var(--p-border)', color: 'var(--p-text)' }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={function () { setAddModalOpen(false); }}
              className="px-3 py-1.5 rounded-[var(--p-radius)] text-sm font-medium"
              style={{ color: 'var(--p-text-muted)', background: 'var(--p-surface2)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSubmit}
              className="px-3 py-1.5 rounded-[var(--p-radius)] text-sm font-medium"
              style={{ color: 'var(--p-background)', background: 'var(--p-accent)' }}
            >
              Add
            </button>
          </div>
        </div>
      </SimpleModal>

      {/* Explainer Video modal scaffold: script preview placeholder, generate disabled */}
      <SimpleModal
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
        title="Explainer Video"
        description="Script preview placeholder. Generate is disabled in this scaffold."
      >
        <div className="space-y-3">
          <div
            className="p-3 rounded-[var(--p-radius)] min-h-[80px]"
            style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
              Script preview placeholder. Content will be generated in a later pass.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-[var(--p-radius)] text-sm font-medium opacity-60 cursor-not-allowed"
              style={{ color: 'var(--p-background)', background: 'var(--p-accent)' }}
            >
              Generate (disabled)
            </button>
          </div>
        </div>
      </SimpleModal>
    </div>
  );
}
