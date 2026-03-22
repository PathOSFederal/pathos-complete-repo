/**
 * ============================================================================
 * GUIDED APPLY SCREEN -- Trust-first USAJOBS application flow (v1)
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * DESIGN PRINCIPLE:
 * PathOS does NOT embed, scrape, or auto-fill USAJOBS. The Guided Apply
 * flow helps users prepare their application materials and then opens
 * USAJOBS in their default browser for the actual submission.
 *
 * TRUST-FIRST:
 * "Apply on USAJOBS in your browser. PathOS does not access your account."
 *
 * PERSISTENCE: All session data stored locally via @pathos/core storage.
 */

'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Shield,
  CheckCircle2,
  Circle,
  Plus,
  ChevronLeft,
  Eye,
  EyeOff,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { useNav } from '@pathos/adapters';
import {
  loadGuidedApplyStore,
  saveGuidedApplyStore,
  createSession,
  addSession,
  updateSession,
  getSessionById,
  toggleChecklistStep,
  updateNoteContent,
  toggleNoteVisibility,
  deleteSession,
  GUIDED_APPLY_SCHEMA_VERSION,
} from '@pathos/core';
import type {
  GuidedApplyStore,
  GuidedApplySession,
  ChecklistStepId,
  NoteCardId,
  NoteCard,
} from '@pathos/core';

// ---------------------------------------------------------------------------
// Public props
// ---------------------------------------------------------------------------

export interface GuidedApplyScreenProps {
  /** Optionally pre-fill a job title for new sessions */
  jobTitle?: string;
  /** USAJOBS control number for deep-linking */
  controlNumber?: string;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function GuidedApplyScreen(props: GuidedApplyScreenProps) {
  const nav = useNav();
  const [store, setStore] = useState<GuidedApplyStore>({ schemaVersion: GUIDED_APPLY_SCHEMA_VERSION, sessions: [], lastOpenedSessionId: null });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'session'>('list');
  const [mounted, setMounted] = useState(false);

  // --- New session form state
  const [newTitle, setNewTitle] = useState(props.jobTitle ?? '');
  const [newLink, setNewLink] = useState(
    props.controlNumber ? 'https://www.usajobs.gov/job/' + props.controlNumber : ''
  );
  const [showNewForm, setShowNewForm] = useState(false);

  // Load store from localStorage on mount
  useEffect(function () {
    const loaded = loadGuidedApplyStore();
    queueMicrotask(function () {
      setStore(loaded);
      if (loaded.lastOpenedSessionId && getSessionById(loaded, loaded.lastOpenedSessionId)) {
        setActiveSessionId(loaded.lastOpenedSessionId);
        setView('session');
      }
      setMounted(true);
    });
  }, []);

  // Persist on every store change (skip initial)
  const persist = useCallback(function (next: GuidedApplyStore) {
    setStore(next);
    saveGuidedApplyStore(next);
  }, []);

  // --- Handlers
  function handleCreateSession() {
    const title = newTitle.trim();
    if (!title) return;
    const session = createSession(title, newLink.trim());
    const next = addSession(store, session);
    persist(next);
    setActiveSessionId(session.id);
    setView('session');
    setNewTitle('');
    setNewLink('');
    setShowNewForm(false);
  }

  function handleOpenSession(id: string) {
    setActiveSessionId(id);
    persist({ ...store, lastOpenedSessionId: id });
    setView('session');
  }

  function handleDeleteSession(id: string) {
    const next = deleteSession(store, id);
    persist(next);
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setView('list');
    }
  }

  function handleToggleStep(stepId: ChecklistStepId) {
    if (!activeSessionId) return;
    const next = updateSession(store, activeSessionId, function (s) {
      return toggleChecklistStep(s, stepId);
    });
    persist(next);
  }

  function handleNoteChange(noteId: NoteCardId, content: string) {
    if (!activeSessionId) return;
    const next = updateSession(store, activeSessionId, function (s) {
      return updateNoteContent(s, noteId, content);
    });
    persist(next);
  }

  function handleToggleNoteVisibility(noteId: NoteCardId) {
    if (!activeSessionId) return;
    const next = updateSession(store, activeSessionId, function (s) {
      return toggleNoteVisibility(s, noteId);
    });
    persist(next);
  }

  // Don't render until mounted (avoid SSR mismatch with localStorage)
  if (!mounted) {
    return (
      <div className="p-4 lg:p-6 max-w-3xl mx-auto">
        <div className="h-48 flex items-center justify-center">
          <span className="text-sm" style={{ color: 'var(--p-text-dim)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  const activeSession = activeSessionId ? getSessionById(store, activeSessionId) : undefined;

  // =========================================================================
  // SESSION VIEW
  // =========================================================================
  if (view === 'session' && activeSession) {
    const completedCount = activeSession.checklist.filter(function (s) { return s.completed; }).length;
    const totalSteps = activeSession.checklist.length;
    const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
    const noteCards: NoteCard[] = [
      activeSession.notes['announcement-notes'],
      activeSession.notes['questionnaire-drafts'],
      activeSession.notes['confirmation-tracking'],
    ];

    const usajobsUrl = activeSession.jobLink || 'https://www.usajobs.gov';

    return (
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={function () { setView('list'); }}
            className="h-8 w-8 flex items-center justify-center flex-shrink-0"
            style={{
              borderRadius: 'var(--p-radius)',
              border: '1px solid var(--p-border)',
              color: 'var(--p-text-muted)',
              background: 'transparent',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="sr-only">Back to sessions</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ color: 'var(--p-text)' }}>
              {activeSession.title}
            </h1>
            <p className="text-xs" style={{ color: 'var(--p-text-dim)' }}>
              Created {new Date(activeSession.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Trust banner */}
        <div
          className="flex items-start gap-3 p-4"
          style={{
            background: 'var(--p-warning-bg)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--p-accent)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--p-accent-text)' }}>
              Apply on USAJOBS in your browser.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--p-text-muted)' }}>
              PathOS does not access your USAJOBS account. Your credentials stay with you.
              We help you prepare -- you submit directly.
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="p-4"
          style={{
            background: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--p-text-muted)' }}>
              Progress: {completedCount} of {totalSteps} steps
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--p-accent)' }}>
              {progressPct}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden"
            style={{ background: 'var(--p-surface2)', borderRadius: 'var(--p-radius)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: progressPct + '%',
                background: progressPct === 100 ? 'var(--p-success)' : 'var(--p-accent)',
                borderRadius: 'var(--p-radius)',
              }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div
          className="p-4 space-y-1"
          style={{
            background: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius-lg)',
            boxShadow: 'var(--p-shadow)',
          }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--p-text)' }}>
            Application Checklist
          </h2>
          {activeSession.checklist.map(function (step) {
            return (
              <button
                key={step.id}
                type="button"
                onClick={function () { handleToggleStep(step.id); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors"
                style={{ borderRadius: 'var(--p-radius)' }}
              >
                {step.completed
                  ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--p-success)' }} />
                  : <Circle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--p-text-dim)' }} />
                }
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: step.completed ? 'var(--p-text-dim)' : 'var(--p-text)',
                      textDecoration: step.completed ? 'line-through' : 'none',
                    }}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--p-text-dim)' }}>
                    {step.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Paste-capture note cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>
            Notes and Paste Capture
          </h2>
          <p className="text-xs" style={{ color: 'var(--p-text-dim)' }}>
            Use these cards to draft answers or paste details. Visibility toggles only
            affect on-screen display. Your data always stays local.
          </p>
          {noteCards.map(function (note) {
            return (
              <NoteCardComponent
                key={note.id}
                note={note}
                onChange={function (content) { handleNoteChange(note.id, content); }}
                onToggleVisibility={function () { handleToggleNoteVisibility(note.id); }}
              />
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={usajobsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--p-accent)',
              color: 'var(--p-bg)',
              borderRadius: 'var(--p-radius)',
              border: 'none',
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Open on USAJOBS
          </a>
          <button
            type="button"
            onClick={function () { nav.back(); }}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              border: '1px solid var(--p-border)',
              borderRadius: 'var(--p-radius)',
              color: 'var(--p-text-muted)',
              background: 'transparent',
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SESSION LIST VIEW (default)
  // =========================================================================
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--p-text)' }}>Guided Apply</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--p-text-muted)' }}>
          Prepare and track your USAJOBS applications. Each session is stored locally on your device.
        </p>
      </div>

      {/* Trust banner */}
      <div
        className="flex items-start gap-3 p-4"
        style={{
          background: 'var(--p-warning-bg)',
          border: '1px solid rgba(217, 119, 6, 0.25)',
          borderRadius: 'var(--p-radius-lg)',
        }}
      >
        <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--p-accent)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--p-accent-text)' }}>
            Apply on USAJOBS in your browser. PathOS does not access your account.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--p-text-muted)' }}>
            No credentials. No scraping. No auto-apply. You are always in control.
          </p>
        </div>
      </div>

      {/* New session form */}
      {showNewForm ? (
        <div
          className="p-4 space-y-3"
          style={{
            background: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius-lg)',
            boxShadow: 'var(--p-shadow)',
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>
            New Application Session
          </h2>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--p-text-muted)' }}>
              Position Title *
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={function (e) { setNewTitle(e.target.value); }}
              placeholder="e.g. IT Specialist (INFOSEC) GS-13"
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--p-surface2)',
                border: '1px solid var(--p-border)',
                borderRadius: 'var(--p-radius)',
                color: 'var(--p-text)',
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--p-text-muted)' }}>
              USAJOBS Link (optional)
            </label>
            <input
              type="text"
              value={newLink}
              onChange={function (e) { setNewLink(e.target.value); }}
              placeholder="https://www.usajobs.gov/job/..."
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--p-surface2)',
                border: '1px solid var(--p-border)',
                borderRadius: 'var(--p-radius)',
                color: 'var(--p-text)',
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={!newTitle.trim()}
              className="px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
              style={{
                background: 'var(--p-accent)',
                color: 'var(--p-bg)',
                borderRadius: 'var(--p-radius)',
                border: 'none',
              }}
            >
              Create Session
            </button>
            <button
              type="button"
              onClick={function () { setShowNewForm(false); }}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                border: '1px solid var(--p-border)',
                borderRadius: 'var(--p-radius)',
                color: 'var(--p-text-muted)',
                background: 'transparent',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={function () { setShowNewForm(true); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
          style={{
            border: '1px dashed var(--p-border-light)',
            borderRadius: 'var(--p-radius-lg)',
            color: 'var(--p-text-muted)',
            background: 'transparent',
          }}
        >
          <Plus className="w-4 h-4" />
          Start New Application Session
        </button>
      )}

      {/* Session list */}
      {store.sessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>
            Your Sessions ({store.sessions.length})
          </h2>
          {store.sessions.map(function (session) {
            const completed = session.checklist.filter(function (s) { return s.completed; }).length;
            return (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                style={{
                  background: 'var(--p-surface)',
                  border: '1px solid var(--p-border)',
                  borderRadius: 'var(--p-radius-lg)',
                }}
                onClick={function () { handleOpenSession(session.id); }}
                role="button"
                tabIndex={0}
                onKeyDown={function (e) { if (e.key === 'Enter') handleOpenSession(session.id); }}
              >
                <ClipboardList className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--p-accent)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--p-text)' }}>
                    {session.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--p-text-dim)' }}>
                    {completed}/{session.checklist.length} steps complete
                    {' -- '}
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={function (e) {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  className="h-7 w-7 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderRadius: 'var(--p-radius)',
                    color: 'var(--p-text-dim)',
                  }}
                  aria-label={'Delete session: ' + session.title}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {store.sessions.length === 0 && !showNewForm && (
        <div
          className="text-center py-12"
          style={{
            background: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--p-text-dim)' }} />
          <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
            No application sessions yet.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--p-text-dim)' }}>
            Start a new session to track your USAJOBS application preparation.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Note Card sub-component
// ---------------------------------------------------------------------------

function NoteCardComponent(props: {
  note: NoteCard;
  onChange: (content: string) => void;
  onToggleVisibility: () => void;
}) {
  const { note, onChange, onToggleVisibility } = props;

  return (
    <div
      className="p-4"
      style={{
        background: 'var(--p-surface)',
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius-lg)',
        boxShadow: 'var(--p-shadow)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>
          {note.label}
        </h3>
        <button
          type="button"
          onClick={onToggleVisibility}
          className="flex items-center gap-1.5 text-xs px-2 py-1 transition-colors"
          style={{
            borderRadius: 'var(--p-radius)',
            color: 'var(--p-text-dim)',
            border: '1px solid var(--p-border)',
            background: 'transparent',
          }}
          title={note.isVisible ? 'Hide content on screen' : 'Show content on screen'}
        >
          {note.isVisible
            ? <Eye className="w-3.5 h-3.5" />
            : <EyeOff className="w-3.5 h-3.5" />
          }
          {note.isVisible ? 'Visible' : 'Hidden'}
        </button>
      </div>
      {note.isVisible ? (
        <textarea
          value={note.content}
          onChange={function (e) { onChange(e.target.value); }}
          placeholder={note.placeholder}
          rows={4}
          className="w-full px-3 py-2 text-sm resize-y focus:outline-none"
          style={{
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius)',
            color: 'var(--p-text)',
          }}
        />
      ) : (
        <div
          className="flex items-center justify-center py-4 text-xs"
          style={{
            background: 'var(--p-surface2)',
            borderRadius: 'var(--p-radius)',
            color: 'var(--p-text-dim)',
          }}
        >
          Content hidden on screen. Toggle visibility to edit. Data remains saved locally.
        </div>
      )}
    </div>
  );
}
