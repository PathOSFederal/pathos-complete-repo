/**
 * ============================================================================
 * GUIDED APPLY STORAGE -- CRUD helpers for local session persistence
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * All data is stored in localStorage via packages/core storage utilities.
 * No network calls, no server state.
 */

import { storageGetJSON, storageSetJSON } from './storage';
import type {
  GuidedApplyStore,
  GuidedApplySession,
  ChecklistStepId,
  NoteCardId,
} from './guided-apply-types';
import {
  createDefaultChecklist,
  createDefaultNotes,
  GUIDED_APPLY_SCHEMA_VERSION,
} from './guided-apply-types';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

export const GUIDED_APPLY_STORAGE_KEY = 'pathos:guided-apply-store';

// ---------------------------------------------------------------------------
// Store read/write
// ---------------------------------------------------------------------------

function defaultStore(): GuidedApplyStore {
  return { schemaVersion: GUIDED_APPLY_SCHEMA_VERSION, sessions: [], lastOpenedSessionId: null };
}

export function loadGuidedApplyStore(): GuidedApplyStore {
  const raw = storageGetJSON<Record<string, unknown>>(GUIDED_APPLY_STORAGE_KEY, {});
  // If schemaVersion is missing or doesn't match, return defaults (safe reset).
  if (!raw || raw.schemaVersion !== GUIDED_APPLY_SCHEMA_VERSION) {
    return defaultStore();
  }
  return raw as unknown as GuidedApplyStore;
}

export function saveGuidedApplyStore(store: GuidedApplyStore): boolean {
  // Always stamp the current schemaVersion on write.
  const stamped: GuidedApplyStore = { ...store, schemaVersion: GUIDED_APPLY_SCHEMA_VERSION };
  return storageSetJSON(GUIDED_APPLY_STORAGE_KEY, stamped);
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function nowISO(): string {
  return new Date().toISOString();
}

export function createSession(title: string, jobLink: string): GuidedApplySession {
  const now = nowISO();
  return {
    id: generateId(),
    title: title,
    jobLink: jobLink,
    createdAt: now,
    updatedAt: now,
    checklist: createDefaultChecklist(),
    notes: createDefaultNotes(),
  };
}

export function addSession(store: GuidedApplyStore, session: GuidedApplySession): GuidedApplyStore {
  return {
    ...store,
    sessions: [session].concat(store.sessions),
    lastOpenedSessionId: session.id,
  };
}

export function getSessionById(store: GuidedApplyStore, id: string): GuidedApplySession | undefined {
  return store.sessions.find(function (s) { return s.id === id; });
}

export function updateSession(
  store: GuidedApplyStore,
  sessionId: string,
  updater: (session: GuidedApplySession) => GuidedApplySession
): GuidedApplyStore {
  return {
    ...store,
    sessions: store.sessions.map(function (s) {
      if (s.id !== sessionId) return s;
      const updated = updater(s);
      return { ...updated, updatedAt: nowISO() };
    }),
  };
}

export function toggleChecklistStep(
  session: GuidedApplySession,
  stepId: ChecklistStepId
): GuidedApplySession {
  return {
    ...session,
    checklist: session.checklist.map(function (step) {
      if (step.id !== stepId) return step;
      return { ...step, completed: !step.completed };
    }),
  };
}

export function updateNoteContent(
  session: GuidedApplySession,
  noteId: NoteCardId,
  content: string
): GuidedApplySession {
  const note = session.notes[noteId];
  if (!note) return session;
  return {
    ...session,
    notes: {
      ...session.notes,
      [noteId]: { ...note, content: content },
    },
  };
}

export function toggleNoteVisibility(
  session: GuidedApplySession,
  noteId: NoteCardId
): GuidedApplySession {
  const note = session.notes[noteId];
  if (!note) return session;
  return {
    ...session,
    notes: {
      ...session.notes,
      [noteId]: { ...note, isVisible: !note.isVisible },
    },
  };
}

// ---------------------------------------------------------------------------
// Export + bulk delete helpers (for Settings -> Data Controls)
// ---------------------------------------------------------------------------

export function exportGuidedApplyJSON(store: GuidedApplyStore): string {
  return JSON.stringify(store, null, 2);
}

export function clearGuidedApplyData(): GuidedApplyStore {
  const empty = defaultStore();
  storageSetJSON(GUIDED_APPLY_STORAGE_KEY, empty);
  return empty;
}

// ---------------------------------------------------------------------------
// Single-session CRUD (continued)
// ---------------------------------------------------------------------------

export function deleteSession(store: GuidedApplyStore, sessionId: string): GuidedApplyStore {
  const remaining = store.sessions.filter(function (s) { return s.id !== sessionId; });
  return {
    ...store,
    sessions: remaining,
    lastOpenedSessionId:
      store.lastOpenedSessionId === sessionId
        ? (remaining.length > 0 ? remaining[0].id : null)
        : store.lastOpenedSessionId,
  };
}
