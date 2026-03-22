/**
 * ============================================================================
 * CAREER RESUME SCREEN STORE — Local UI state for Resume Readiness page
 * ============================================================================
 *
 * PURPOSE: Holds resume list, active resume id, and target job for Tailoring
 * Workspace. UI + local state only; no backend. Used by CareerScreen for
 * dropdown, All Resumes drawer, duplicate/create tailored, and tailoring target.
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResumeType = 'master' | 'tailored';
export type ResumeStatus = 'ready' | 'draft' | 'inProgress';

export interface CareerResumeEntry {
  id: string;
  name: string;
  type: ResumeType;
  status: ResumeStatus;
  /** ISO timestamp of last update (for "Updated X ago"). */
  updatedAt: string;
  /** For tailored: saved job id used as target. */
  targetJobId?: string;
  /** For tailored: job title for display (e.g. "[Job Title] – GS-X"). */
  targetJobTitle?: string;
  /** When true, item is archived; hidden from main list unless showArchived. */
  archived?: boolean;
}

export type CareerDemoState = 'noResume' | 'incompleteResume' | 'readyResume' | 'tailorReadyWithJob';

interface CareerResumeScreenState {
  resumes: CareerResumeEntry[];
  activeResumeId: string | null;
  /** Saved job id selected as target for Tailoring Workspace. */
  targetJobIdForTailoring: string | null;
  /** Short-lived toast message (e.g. "Resume created and set as active"). */
  toastMessage: string | null;
  /** When set, toast shows Undo to unarchive this resume id. */
  toastUndoResumeId: string | null;
  /** When true, All Resumes drawer shows archived items. */
  showArchived: boolean;
  /** Whether store has been seeded from demo state (so we only seed once per session). */
  _seeded: boolean;
}

interface CareerResumeScreenActions {
  setResumes: (resumes: CareerResumeEntry[]) => void;
  setActiveResumeId: (id: string | null) => void;
  addResume: (entry: CareerResumeEntry) => void;
  setTargetJobForTailoring: (jobId: string | null) => void;
  /** Mark resume as archived; hidden unless showArchived. Clears active if it was active. */
  archiveResume: (id: string) => void;
  /** Restore archived resume (sets archived false). */
  unarchiveResume: (id: string) => void;
  /** Remove resume permanently from list; clear active if it was active. */
  deleteResume: (id: string) => void;
  setToast: (message: string | null) => void;
  /** Set toast with optional undo resume id for "Archived. Undo" flow. */
  setToastWithUndo: (message: string | null, undoResumeId: string | null) => void;
  setShowArchived: (show: boolean) => void;
  /** Seed initial resumes from demo state (no-op if already seeded). */
  seedFromDemoState: (demoState: CareerDemoState) => void;
  resetSeeded: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateResumeId(): string {
  return 'res-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Format "Updated X ago" from ISO timestamp. */
export function formatUpdatedAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Updated just now';
  if (diffMins < 60) return 'Updated ' + diffMins + ' min ago';
  if (diffHours < 24) return 'Updated ' + diffHours + ' hr ago';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 7) return 'Updated ' + diffDays + ' days ago';
  return 'Updated ' + d.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCareerResumeScreenStore = create<CareerResumeScreenState & CareerResumeScreenActions>(function (set, get) {
  return {
    resumes: [],
    activeResumeId: null,
    targetJobIdForTailoring: null,
    toastMessage: null,
    toastUndoResumeId: null,
    showArchived: false,
    _seeded: false,

    setResumes: function (resumes) {
      set({ resumes });
    },

    setActiveResumeId: function (id) {
      set({ activeResumeId: id });
    },

    addResume: function (entry) {
      const state = get();
      const next = [];
      for (let i = 0; i < state.resumes.length; i++) {
        next.push(state.resumes[i]);
      }
      next.push(entry);
      set({ resumes: next, activeResumeId: entry.id });
    },

    setTargetJobForTailoring: function (jobId) {
      set({ targetJobIdForTailoring: jobId });
    },

    archiveResume: function (id) {
      const state = get();
      const next = [];
      for (let i = 0; i < state.resumes.length; i++) {
        const r = state.resumes[i];
        if (r.id === id) {
          next.push(Object.assign({}, r, { archived: true }));
        } else {
          next.push(r);
        }
      }
      const newActive =
        state.activeResumeId === id
          ? (function () {
              for (let j = 0; j < next.length; j++) {
                if (next[j].archived !== true) return next[j].id;
              }
              return null;
            })()
          : state.activeResumeId;
      set({
        resumes: next,
        activeResumeId: newActive,
        toastMessage: 'Archived.',
        toastUndoResumeId: id,
      });
    },

    unarchiveResume: function (id) {
      const state = get();
      const next = [];
      for (let i = 0; i < state.resumes.length; i++) {
        const r = state.resumes[i];
        if (r.id === id) {
          next.push(Object.assign({}, r, { archived: false }));
        } else {
          next.push(r);
        }
      }
      set({
        resumes: next,
        toastMessage: null,
        toastUndoResumeId: null,
      });
    },


    deleteResume: function (id) {
      const state = get();
      const next = state.resumes.filter(function (r) { return r.id !== id; });
      const newActive =
        state.activeResumeId === id
          ? (next.length > 0 ? next[0].id : null)
          : state.activeResumeId;
      set({ resumes: next, activeResumeId: newActive });
    },

    setToast: function (message) {
      set({ toastMessage: message, toastUndoResumeId: null });
    },

    setToastWithUndo: function (message, undoResumeId) {
      set({ toastMessage: message, toastUndoResumeId: undoResumeId !== null ? undoResumeId : null });
    },

    setShowArchived: function (show) {
      set({ showArchived: show });
    },

    seedFromDemoState: function (demoState) {
      if (get()._seeded) return;
      if (demoState === 'noResume') {
        set({ _seeded: true });
        return;
      }
      const now = nowISO();
      const master: CareerResumeEntry = {
        id: generateResumeId(),
        name: 'Master Resume v1',
        type: 'master',
        status: demoState === 'readyResume' || demoState === 'tailorReadyWithJob' ? 'ready' : 'inProgress',
        updatedAt: now,
      };
      const resumes: CareerResumeEntry[] = [master];
      let activeId = master.id;
      if (demoState === 'tailorReadyWithJob') {
        const tailored: CareerResumeEntry = {
          id: generateResumeId(),
          name: 'Program Analyst (GS-0343) – HHS',
          type: 'tailored',
          status: 'ready',
          updatedAt: now,
          targetJobId: 'tailor-job-1',
          targetJobTitle: 'Program Analyst (GS-0343) — HHS',
        };
        resumes.push(tailored);
        activeId = tailored.id;
      }
      set({ resumes, activeResumeId: activeId, _seeded: true });
    },

    resetSeeded: function () {
      set({
        _seeded: false,
        resumes: [],
        activeResumeId: null,
        targetJobIdForTailoring: null,
        toastMessage: null,
        toastUndoResumeId: null,
        showArchived: false,
      });
    },
  };
});
