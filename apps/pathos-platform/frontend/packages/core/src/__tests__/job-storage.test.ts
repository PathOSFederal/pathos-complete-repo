/**
 * Tests for job-storage.ts
 *
 * Uses an in-memory localStorage mock (jsdom via vitest).
 * Each test clears storage in beforeEach to guarantee isolation.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  loadJobSearchStore,
  saveJobSearchStore,
  loadMockResultsIfEmpty,
  ensureValidSelection,
  selectJob,
  getSelectedJob,
  saveJob,
  removeJob,
  isJobSaved,
  clearJobSearchData,
  JOB_SEARCH_STORE_KEY,
} from '../job-storage';
import { JOB_SEARCH_SCHEMA_VERSION } from '../job-types';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let createdWindowForTest = false;

beforeEach(function () {
  if (typeof window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      writable: true,
      configurable: true,
    });
    createdWindowForTest = true;
  }
  localStorage.clear();
});

afterAll(function () {
  if (createdWindowForTest) {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('job-storage', function () {
  it('returns a default empty store on first load', function () {
    const store = loadJobSearchStore();
    expect(store.schemaVersion).toBe(JOB_SEARCH_SCHEMA_VERSION);
    expect(store.savedJobs).toEqual([]);
    expect(store.selectedJobId).toBeNull();
    expect(store.lastSearchQuery).toBe('');
  });

  it('persists a saved job and reloads it', function () {
    let store = loadJobSearchStore();
    store = saveJob(store, {
      title: 'IT Specialist',
      agency: 'DHS',
      location: 'DC',
      grade: 'GS-13',
    });
    saveJobSearchStore(store);

    const reloaded = loadJobSearchStore();
    expect(reloaded.savedJobs).toHaveLength(1);
    expect(reloaded.savedJobs[0].title).toBe('IT Specialist');
    expect(reloaded.savedJobs[0].agency).toBe('DHS');
    expect(reloaded.savedJobs[0].id).toBeTruthy();
    expect(reloaded.savedJobs[0].savedAt).toBeTruthy();
  });

  it('selected job auto-defaults to first when missing', function () {
    let store = loadJobSearchStore();
    store = saveJob(store, { title: 'Job A', agency: 'A', location: 'DC' });
    store = saveJob(store, { title: 'Job B', agency: 'B', location: 'DC' });
    // selectedJobId is null
    store = ensureValidSelection(store);
    expect(store.selectedJobId).toBe(store.savedJobs[0].id);
  });

  it('selected job resets to first when the selected job is removed', function () {
    let store = loadJobSearchStore();
    store = saveJob(store, { title: 'Job A', agency: 'A', location: 'DC' });
    store = saveJob(store, { title: 'Job B', agency: 'B', location: 'DC' });
    // Select the second job
    const secondId = store.savedJobs[1].id;
    store = selectJob(store, secondId);
    expect(store.selectedJobId).toBe(secondId);

    // Remove the second job
    store = removeJob(store, secondId);
    expect(store.savedJobs).toHaveLength(1);
    // Should auto-select first
    expect(store.selectedJobId).toBe(store.savedJobs[0].id);
  });

  it('selected job resets to null when all jobs are removed', function () {
    let store = loadJobSearchStore();
    store = saveJob(store, { title: 'Job A', agency: 'A', location: 'DC' });
    const id = store.savedJobs[0].id;
    store = selectJob(store, id);
    store = removeJob(store, id);
    expect(store.savedJobs).toHaveLength(0);
    expect(store.selectedJobId).toBeNull();
  });

  it('getSelectedJob returns the correct job', function () {
    let store = loadJobSearchStore();
    store = saveJob(store, { title: 'Job A', agency: 'A', location: 'DC' });
    store = selectJob(store, store.savedJobs[0].id);
    const job = getSelectedJob(store);
    expect(job).toBeDefined();
    expect(job!.title).toBe('Job A');
  });

  it('isJobSaved returns correct values', function () {
    let store = loadJobSearchStore();
    store = saveJob(store, { title: 'Job A', agency: 'A', location: 'DC' });
    expect(isJobSaved(store, store.savedJobs[0].id)).toBe(true);
    expect(isJobSaved(store, 'nonexistent-id')).toBe(false);
  });

  it('loadMockResultsIfEmpty fills mock data when store is empty', function () {
    let store = loadJobSearchStore();
    expect(store.savedJobs).toHaveLength(0);
    store = loadMockResultsIfEmpty(store);
    expect(store.savedJobs.length).toBeGreaterThan(0);
    expect(store.selectedJobId).toBe(store.savedJobs[0].id);
  });

  it('loadMockResultsIfEmpty does not overwrite existing data', function () {
    let store = loadJobSearchStore();
    store = saveJob(store, { title: 'My Job', agency: 'Mine', location: 'DC' });
    const before = store.savedJobs.length;
    store = loadMockResultsIfEmpty(store);
    expect(store.savedJobs.length).toBe(before);
  });

  it('clearJobSearchData wipes storage and returns defaults', function () {
    let store = loadJobSearchStore();
    store = saveJob(store, { title: 'Job A', agency: 'A', location: 'DC' });
    saveJobSearchStore(store);
    expect(localStorage.getItem(JOB_SEARCH_STORE_KEY)).not.toBeNull();

    const cleared = clearJobSearchData();
    expect(cleared.savedJobs).toEqual([]);
    expect(cleared.selectedJobId).toBeNull();

    const reloaded = loadJobSearchStore();
    expect(reloaded.savedJobs).toEqual([]);
  });

  it('resets to defaults on schema version mismatch', function () {
    localStorage.setItem(
      JOB_SEARCH_STORE_KEY,
      JSON.stringify({ schemaVersion: 999, savedJobs: [{ id: 'old' }] })
    );
    const store = loadJobSearchStore();
    expect(store.schemaVersion).toBe(JOB_SEARCH_SCHEMA_VERSION);
    expect(store.savedJobs).toEqual([]);
  });
});
