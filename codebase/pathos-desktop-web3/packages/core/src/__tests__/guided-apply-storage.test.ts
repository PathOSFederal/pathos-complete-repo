/**
 * ============================================================================
 * GUIDED APPLY STORAGE -- Unit tests
 * ============================================================================
 *
 * Tests cover:
 * - Create session -> persist -> reload -> data survives
 * - Toggle visibility -> persists
 * - Export produces valid JSON with correct structure
 * - Delete wipes storage and returns empty store
 * - Schema version mismatch resets to defaults
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadGuidedApplyStore,
  saveGuidedApplyStore,
  createSession,
  addSession,
  getSessionById,
  updateSession,
  toggleChecklistStep,
  updateNoteContent,
  toggleNoteVisibility,
  deleteSession,
  exportGuidedApplyJSON,
  clearGuidedApplyData,
  GUIDED_APPLY_STORAGE_KEY,
} from '../guided-apply-storage';
import { GUIDED_APPLY_SCHEMA_VERSION } from '../guided-apply-types';
import type { GuidedApplyStore } from '../guided-apply-types';

// ---------------------------------------------------------------------------
// Mock localStorage for Node environment
// ---------------------------------------------------------------------------

const storage: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: function (key: string) {
    return storage[key] ?? null;
  },
  setItem: function (key: string, value: string) {
    storage[key] = value;
  },
  removeItem: function (key: string) {
    delete storage[key];
  },
  clear: function () {
    Object.keys(storage).forEach(function (key) {
      delete storage[key];
    });
  },
  get length() {
    return Object.keys(storage).length;
  },
  key: function (index: number) {
    return Object.keys(storage)[index] ?? null;
  },
};

// Attach to globalThis so isBrowser() + localStorage calls work
Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  writable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

beforeEach(function () {
  localStorageMock.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Guided Apply Storage', function () {
  describe('create session -> persist -> reload', function () {
    it('should create a session, save it, and reload from storage', function () {
      const session = createSession('IT Specialist GS-13', 'https://www.usajobs.gov/job/123456');
      expect(session.title).toBe('IT Specialist GS-13');
      expect(session.jobLink).toBe('https://www.usajobs.gov/job/123456');
      expect(session.checklist.length).toBe(5);
      expect(session.id).toBeTruthy();

      // Add to store and persist
      let store = loadGuidedApplyStore();
      store = addSession(store, session);
      saveGuidedApplyStore(store);

      // Reload from storage (simulating a page refresh)
      const reloaded = loadGuidedApplyStore();
      expect(reloaded.sessions.length).toBe(1);
      expect(reloaded.sessions[0].title).toBe('IT Specialist GS-13');
      expect(reloaded.sessions[0].id).toBe(session.id);
      expect(reloaded.lastOpenedSessionId).toBe(session.id);
    });

    it('should persist multiple sessions in order', function () {
      const s1 = createSession('Position A', '');
      const s2 = createSession('Position B', '');
      let store = loadGuidedApplyStore();
      store = addSession(store, s1);
      store = addSession(store, s2);
      saveGuidedApplyStore(store);

      const reloaded = loadGuidedApplyStore();
      expect(reloaded.sessions.length).toBe(2);
      // Most recent first (addSession prepends)
      expect(reloaded.sessions[0].title).toBe('Position B');
      expect(reloaded.sessions[1].title).toBe('Position A');
    });
  });

  describe('checklist toggle -> persists', function () {
    it('should toggle a checklist step and persist it', function () {
      const session = createSession('Test Job', '');
      let store = addSession(loadGuidedApplyStore(), session);

      // Toggle first step
      store = updateSession(store, session.id, function (s) {
        return toggleChecklistStep(s, 'confirm-announcement');
      });
      saveGuidedApplyStore(store);

      // Reload
      const reloaded = loadGuidedApplyStore();
      const found = getSessionById(reloaded, session.id);
      expect(found).toBeDefined();
      const step = found!.checklist.find(function (c) { return c.id === 'confirm-announcement'; });
      expect(step!.completed).toBe(true);

      // Toggle back
      const store2 = updateSession(reloaded, session.id, function (s) {
        return toggleChecklistStep(s, 'confirm-announcement');
      });
      saveGuidedApplyStore(store2);

      const reloaded2 = loadGuidedApplyStore();
      const step2 = getSessionById(reloaded2, session.id)!.checklist.find(
        function (c) { return c.id === 'confirm-announcement'; }
      );
      expect(step2!.completed).toBe(false);
    });
  });

  describe('note visibility toggle -> persists', function () {
    it('should toggle visibility and persist it', function () {
      const session = createSession('Test Job', '');
      let store = addSession(loadGuidedApplyStore(), session);

      // Verify default is visible
      expect(session.notes['announcement-notes'].isVisible).toBe(true);

      // Toggle to hidden
      store = updateSession(store, session.id, function (s) {
        return toggleNoteVisibility(s, 'announcement-notes');
      });
      saveGuidedApplyStore(store);

      // Reload
      const reloaded = loadGuidedApplyStore();
      const found = getSessionById(reloaded, session.id)!;
      expect(found.notes['announcement-notes'].isVisible).toBe(false);
    });
  });

  describe('note content update -> persists', function () {
    it('should update note content and persist it', function () {
      const session = createSession('Test Job', '');
      let store = addSession(loadGuidedApplyStore(), session);

      store = updateSession(store, session.id, function (s) {
        return updateNoteContent(s, 'questionnaire-drafts', 'My draft answer for KSA #1');
      });
      saveGuidedApplyStore(store);

      const reloaded = loadGuidedApplyStore();
      const found = getSessionById(reloaded, session.id)!;
      expect(found.notes['questionnaire-drafts'].content).toBe('My draft answer for KSA #1');
    });
  });

  describe('export produces valid JSON', function () {
    it('should export a valid JSON string with correct structure', function () {
      const s1 = createSession('Export Test', 'https://www.usajobs.gov/job/999');
      let store = addSession(loadGuidedApplyStore(), s1);

      // Add some note content
      store = updateSession(store, s1.id, function (s) {
        return updateNoteContent(s, 'announcement-notes', 'Key requirement: TS clearance');
      });
      saveGuidedApplyStore(store);

      const json = exportGuidedApplyJSON(store);
      expect(function () { JSON.parse(json); }).not.toThrow();

      const parsed = JSON.parse(json) as GuidedApplyStore;
      expect(parsed.schemaVersion).toBe(GUIDED_APPLY_SCHEMA_VERSION);
      expect(parsed.sessions).toBeInstanceOf(Array);
      expect(parsed.sessions.length).toBe(1);
      expect(parsed.sessions[0].title).toBe('Export Test');
      expect(parsed.sessions[0].notes['announcement-notes'].content).toBe('Key requirement: TS clearance');
    });
  });

  describe('delete wipes storage and UI resets', function () {
    it('should delete a single session', function () {
      const s1 = createSession('Job A', '');
      const s2 = createSession('Job B', '');
      let store = addSession(loadGuidedApplyStore(), s1);
      store = addSession(store, s2);
      saveGuidedApplyStore(store);

      // Delete s1
      store = deleteSession(store, s1.id);
      saveGuidedApplyStore(store);

      const reloaded = loadGuidedApplyStore();
      expect(reloaded.sessions.length).toBe(1);
      expect(reloaded.sessions[0].id).toBe(s2.id);
    });

    it('clearGuidedApplyData should wipe all sessions and reset storage', function () {
      const s1 = createSession('Job A', '');
      const store = addSession(loadGuidedApplyStore(), s1);
      saveGuidedApplyStore(store);

      // Verify data exists
      expect(loadGuidedApplyStore().sessions.length).toBe(1);

      // Clear
      const empty = clearGuidedApplyData();
      expect(empty.sessions.length).toBe(0);
      expect(empty.lastOpenedSessionId).toBeNull();
      expect(empty.schemaVersion).toBe(GUIDED_APPLY_SCHEMA_VERSION);

      // Verify storage was actually cleared
      const reloaded = loadGuidedApplyStore();
      expect(reloaded.sessions.length).toBe(0);
    });
  });

  describe('schema version mismatch', function () {
    it('should return defaults when stored schema version does not match', function () {
      // Write data with an old schema version
      const oldData = {
        schemaVersion: 1,
        sessions: [{ id: 'old', title: 'Old Session' }],
        lastOpenedSessionId: 'old',
      };
      localStorage.setItem(GUIDED_APPLY_STORAGE_KEY, JSON.stringify(oldData));

      // Load should reset to defaults
      const loaded = loadGuidedApplyStore();
      expect(loaded.sessions.length).toBe(0);
      expect(loaded.schemaVersion).toBe(GUIDED_APPLY_SCHEMA_VERSION);
    });

    it('should return defaults when no schema version exists in storage', function () {
      const noVersion = {
        sessions: [{ id: 'legacy', title: 'Legacy' }],
        lastOpenedSessionId: 'legacy',
      };
      localStorage.setItem(GUIDED_APPLY_STORAGE_KEY, JSON.stringify(noVersion));

      const loaded = loadGuidedApplyStore();
      expect(loaded.sessions.length).toBe(0);
      expect(loaded.schemaVersion).toBe(GUIDED_APPLY_SCHEMA_VERSION);
    });

    it('should return defaults when storage is corrupted', function () {
      localStorage.setItem(GUIDED_APPLY_STORAGE_KEY, 'not valid json{{{');

      const loaded = loadGuidedApplyStore();
      expect(loaded.sessions.length).toBe(0);
      expect(loaded.schemaVersion).toBe(GUIDED_APPLY_SCHEMA_VERSION);
    });
  });
});
