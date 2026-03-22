/**
 * ============================================================================
 * CAREER RESUME SCREEN STORE TESTS — Duplicate active, set active, target job
 * ============================================================================
 *
 * Locks key behavior: seedFromDemoState, addResume (duplicate) switches active,
 * setTargetJobForTailoring (create tailored flow).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCareerResumeScreenStore,
  formatUpdatedAgo,
} from './careerResumeScreenStore';

describe('careerResumeScreenStore', function () {
  beforeEach(function () {
    useCareerResumeScreenStore.getState().resetSeeded();
    useCareerResumeScreenStore.getState().setResumes([]);
    useCareerResumeScreenStore.getState().setActiveResumeId(null);
    useCareerResumeScreenStore.getState().setTargetJobForTailoring(null);
  });

  describe('seedFromDemoState', function () {
    it('seeds one master resume when incompleteResume', function () {
      useCareerResumeScreenStore.getState().seedFromDemoState('incompleteResume');
      const state = useCareerResumeScreenStore.getState();
      expect(state.resumes.length).toBe(1);
      expect(state.resumes[0].type).toBe('master');
      expect(state.resumes[0].name).toBe('Master Resume v1');
      expect(state.activeResumeId).toBe(state.resumes[0].id);
    });

    it('seeds master and tailored when tailorReadyWithJob', function () {
      useCareerResumeScreenStore.getState().seedFromDemoState('tailorReadyWithJob');
      const state = useCareerResumeScreenStore.getState();
      expect(state.resumes.length).toBe(2);
      const master = state.resumes.find(function (r) { return r.type === 'master'; });
      const tailored = state.resumes.find(function (r) { return r.type === 'tailored'; });
      expect(master).toBeDefined();
      expect(tailored).toBeDefined();
      if (tailored !== undefined) {
        expect(state.activeResumeId).toBe(tailored.id);
      }
    });
  });

  describe('addResume (duplicate active resume)', function () {
    it('adds new entry and sets it as active', function () {
      useCareerResumeScreenStore.getState().seedFromDemoState('incompleteResume');
      const state0 = useCareerResumeScreenStore.getState();
      const firstId = state0.activeResumeId;
      const firstName = state0.resumes[0].name;
      useCareerResumeScreenStore.getState().addResume({
        id: 'res-copy-1',
        name: firstName + ' (Copy)',
        type: 'master',
        status: 'inProgress',
        updatedAt: new Date().toISOString(),
      });
      const state1 = useCareerResumeScreenStore.getState();
      expect(state1.resumes.length).toBe(2);
      expect(state1.activeResumeId).toBe('res-copy-1');
      expect(state1.resumes[1].name).toContain('(Copy)');
    });
  });

  describe('setTargetJobForTailoring', function () {
    it('sets target job id for Tailoring Workspace', function () {
      useCareerResumeScreenStore.getState().setTargetJobForTailoring('job-123');
      const state = useCareerResumeScreenStore.getState();
      expect(state.targetJobIdForTailoring).toBe('job-123');
    });
  });

  describe('archiveResume and showArchived', function () {
    it('sets archived true so item is hidden unless showArchived', function () {
      useCareerResumeScreenStore.getState().seedFromDemoState('incompleteResume');
      const state0 = useCareerResumeScreenStore.getState();
      const id = state0.resumes[0].id;
      useCareerResumeScreenStore.getState().archiveResume(id);
      const state1 = useCareerResumeScreenStore.getState();
      const archivedEntry = state1.resumes.find(function (r) { return r.id === id; });
      expect(archivedEntry !== undefined && archivedEntry.archived === true).toBe(true);
      const visible = state1.resumes.filter(function (r) { return r.archived !== true; });
      expect(visible.length).toBe(0);
      expect(state1.toastMessage).toBe('Archived.');
      expect(state1.toastUndoResumeId).toBe(id);
    });

    it('showArchived reveals archived items in list', function () {
      useCareerResumeScreenStore.getState().seedFromDemoState('incompleteResume');
      const id = useCareerResumeScreenStore.getState().resumes[0].id;
      useCareerResumeScreenStore.getState().archiveResume(id);
      const state = useCareerResumeScreenStore.getState();
      expect(state.showArchived).toBe(false);
      const visibleBefore = state.resumes.filter(function (r) { return r.archived !== true; });
      expect(visibleBefore.length).toBe(0);
      useCareerResumeScreenStore.getState().setShowArchived(true);
      const all = useCareerResumeScreenStore.getState().resumes;
      expect(all.length).toBe(1);
      expect(all[0].archived).toBe(true);
    });
  });

  describe('unarchiveResume', function () {
    it('clears archived and clears toast', function () {
      useCareerResumeScreenStore.getState().seedFromDemoState('incompleteResume');
      const id = useCareerResumeScreenStore.getState().resumes[0].id;
      useCareerResumeScreenStore.getState().archiveResume(id);
      useCareerResumeScreenStore.getState().unarchiveResume(id);
      const state = useCareerResumeScreenStore.getState();
      const entry = state.resumes.find(function (r) { return r.id === id; });
      expect(entry !== undefined && entry.archived !== true).toBe(true);
      expect(state.toastMessage).toBe(null);
      expect(state.toastUndoResumeId).toBe(null);
    });
  });

  describe('deleteResume', function () {
    it('removes resume from list and clears active if was active', function () {
      useCareerResumeScreenStore.getState().seedFromDemoState('incompleteResume');
      const id = useCareerResumeScreenStore.getState().resumes[0].id;
      useCareerResumeScreenStore.getState().deleteResume(id);
      const state = useCareerResumeScreenStore.getState();
      expect(state.resumes.length).toBe(0);
      expect(state.activeResumeId).toBe(null);
    });
  });
});

describe('formatUpdatedAgo', function () {
  it('returns "Updated just now" for very recent timestamp', function () {
    const now = new Date();
    const iso = now.toISOString();
    expect(formatUpdatedAgo(iso)).toMatch(/just now|min ago/);
  });

  it('returns string containing "Updated"', function () {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 5);
    expect(formatUpdatedAgo(d.toISOString())).toContain('Updated');
  });
});
