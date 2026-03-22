/**
 * PathAdvisor Context Log store tests: appendEntry, dedupeKey, clearAnchor, clearScreen.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePathAdvisorContextLogStore,
  buildAnchorKey,
  getAnchorKeysForScreen,
  getEntriesForAnchor,
} from './pathAdvisorContextLogStore';

function makeEntry(
  screen: string,
  anchor: { type: 'job' | 'resume' | 'card' | 'screen' | 'other'; id: string; label: string },
  title: string
) {
  return {
    id: 'e-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    createdAtISO: new Date().toISOString(),
    screen,
    anchor,
    title,
    sections: [],
  };
}

describe('pathAdvisorContextLogStore', function () {
  beforeEach(function () {
    usePathAdvisorContextLogStore.getState().clearAll();
  });

  describe('appendEntry', function () {
    it('adds entry to correct anchorKey and sets active when makeActive is true', function () {
      const anchor = { type: 'job' as const, id: 'job-1', label: 'Software Engineer' };
      const entry = makeEntry('job-search', anchor, 'Job match: Software Engineer');
      usePathAdvisorContextLogStore.getState().appendEntry(entry, { makeActive: true });
      const key = buildAnchorKey('job-search', anchor);
      const entries = getEntriesForAnchor(usePathAdvisorContextLogStore.getState().entriesByAnchor, key);
      expect(entries.length).toBe(1);
      expect(entries[0].title).toBe('Job match: Software Engineer');
      expect(usePathAdvisorContextLogStore.getState().activeAnchorKey).toBe(key);
    });

    it('dedupeKey prevents duplicate append when latest entry has same dedupeKey', function () {
      const anchor = { type: 'job' as const, id: 'job-1', label: 'Engineer' };
      const key = buildAnchorKey('job-search', anchor);
      const entry1 = makeEntry('job-search', anchor, 'First');
      const entry2 = makeEntry('job-search', anchor, 'Second');
      usePathAdvisorContextLogStore.getState().appendEntry(entry1, { dedupeKey: 'select:job-1:50', makeActive: true });
      usePathAdvisorContextLogStore.getState().appendEntry(entry2, { dedupeKey: 'select:job-1:50', makeActive: true });
      const entries = getEntriesForAnchor(usePathAdvisorContextLogStore.getState().entriesByAnchor, key);
      expect(entries.length).toBe(1);
      expect(entries[0].title).toBe('First');
      expect(usePathAdvisorContextLogStore.getState().activeAnchorKey).toBe(key);
    });

    it('appends when dedupeKey differs from latest entry', function () {
      const anchor = { type: 'job' as const, id: 'job-1', label: 'Engineer' };
      const key = buildAnchorKey('job-search', anchor);
      usePathAdvisorContextLogStore.getState().appendEntry(makeEntry('job-search', anchor, 'First'), {
        dedupeKey: 'select:job-1:50',
        makeActive: true,
      });
      usePathAdvisorContextLogStore.getState().appendEntry(makeEntry('job-search', anchor, 'Second'), {
        dedupeKey: 'select:job-1:60',
        makeActive: true,
      });
      const entries = getEntriesForAnchor(usePathAdvisorContextLogStore.getState().entriesByAnchor, key);
      expect(entries.length).toBe(2);
      expect(entries[1].title).toBe('Second');
    });
  });

  describe('clearAnchor', function () {
    it('clears only that anchor', function () {
      const anchor1 = { type: 'job' as const, id: 'job-1', label: 'Job 1' };
      const anchor2 = { type: 'job' as const, id: 'job-2', label: 'Job 2' };
      const key1 = buildAnchorKey('job-search', anchor1);
      const key2 = buildAnchorKey('job-search', anchor2);
      usePathAdvisorContextLogStore.getState().appendEntry(makeEntry('job-search', anchor1, 'A'), { makeActive: true });
      usePathAdvisorContextLogStore.getState().appendEntry(makeEntry('job-search', anchor2, 'B'), { makeActive: false });
      usePathAdvisorContextLogStore.getState().clearAnchor(key1);
      expect(getEntriesForAnchor(usePathAdvisorContextLogStore.getState().entriesByAnchor, key1).length).toBe(0);
      expect(getEntriesForAnchor(usePathAdvisorContextLogStore.getState().entriesByAnchor, key2).length).toBe(1);
    });
  });

  describe('clearScreen', function () {
    it('clears only entries for that screen', function () {
      const anchorJob = { type: 'job' as const, id: 'job-1', label: 'Job 1' };
      const anchorFocus = { type: 'card' as const, id: 'dashboard:focus', label: 'Focus' };
      usePathAdvisorContextLogStore.getState().appendEntry(makeEntry('job-search', anchorJob, 'Job entry'), {
        makeActive: true,
      });
      usePathAdvisorContextLogStore.getState().appendEntry(makeEntry('dashboard', anchorFocus, 'Focus entry'), {
        makeActive: false,
      });
      usePathAdvisorContextLogStore.getState().clearScreen('job-search');
      const keysJob = getAnchorKeysForScreen(usePathAdvisorContextLogStore.getState().entriesByAnchor, 'job-search');
      const keysDash = getAnchorKeysForScreen(usePathAdvisorContextLogStore.getState().entriesByAnchor, 'dashboard');
      expect(keysJob.length).toBe(0);
      expect(keysDash.length).toBe(1);
    });
  });
});
