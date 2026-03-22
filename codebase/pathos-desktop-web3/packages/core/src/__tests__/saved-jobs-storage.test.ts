import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSavedJobsStore,
  saveSavedJobsStore,
  addSavedJob,
  addSavedJobDirect,
  removeSavedJob,
  toggleSavedJob,
  isJobInSaved,
  selectSavedJob,
  getSelectedSavedJob,
  clearSavedJobs,
  exportSavedJobsJSON,
  SAVED_JOBS_STORE_KEY,
} from '@pathos/core';
import type { Job, SavedJobsStore } from '@pathos/core';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const fakeStorage: Record<string, string> = {};

beforeEach(function () {
  Object.keys(fakeStorage).forEach(function (k) { delete fakeStorage[k]; });
  Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: function (k: string) { return fakeStorage[k] ?? null; },
      setItem: function (k: string, v: string) { fakeStorage[k] = v; },
      removeItem: function (k: string) { delete fakeStorage[k]; },
    },
    writable: true,
    configurable: true,
  });
});

const mockJob: Job = {
  id: 'test-1',
  title: 'IT Specialist',
  agency: 'DHS',
  location: 'Washington, DC',
  grade: 'GS-13',
  salaryRange: '$100k',
  url: 'https://www.usajobs.gov/job/1',
  summary: 'Test job',
  savedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saved-jobs-storage', function () {
  it('loads empty store by default', function () {
    const store = loadSavedJobsStore();
    expect(store.jobs).toEqual([]);
    expect(store.selectedJobId).toBeNull();
  });

  it('adds a job directly and persists', function () {
    let store = loadSavedJobsStore();
    store = addSavedJobDirect(store, mockJob);
    saveSavedJobsStore(store);
    const reloaded = loadSavedJobsStore();
    expect(reloaded.jobs.length).toBe(1);
    expect(reloaded.jobs[0].title).toBe('IT Specialist');
  });

  it('does not duplicate a job with the same id', function () {
    let store = loadSavedJobsStore();
    store = addSavedJobDirect(store, mockJob);
    store = addSavedJobDirect(store, mockJob);
    expect(store.jobs.length).toBe(1);
  });

  it('removes a job and updates selection', function () {
    let store = loadSavedJobsStore();
    store = addSavedJobDirect(store, mockJob);
    store = selectSavedJob(store, mockJob.id);
    store = removeSavedJob(store, mockJob.id);
    expect(store.jobs.length).toBe(0);
    expect(store.selectedJobId).toBeNull();
  });

  it('toggleSavedJob adds then removes', function () {
    let store = loadSavedJobsStore();
    store = toggleSavedJob(store, mockJob);
    expect(isJobInSaved(store, mockJob.id)).toBe(true);
    store = toggleSavedJob(store, mockJob);
    expect(isJobInSaved(store, mockJob.id)).toBe(false);
  });

  it('getSelectedSavedJob returns correct job', function () {
    let store = loadSavedJobsStore();
    store = addSavedJobDirect(store, mockJob);
    store = selectSavedJob(store, mockJob.id);
    const selected = getSelectedSavedJob(store);
    expect(selected).toBeDefined();
    expect(selected!.id).toBe(mockJob.id);
  });

  it('clearSavedJobs wipes storage', function () {
    let store = loadSavedJobsStore();
    store = addSavedJobDirect(store, mockJob);
    saveSavedJobsStore(store);
    const empty = clearSavedJobs();
    expect(empty.jobs).toEqual([]);
  });

  it('exportSavedJobsJSON returns valid JSON', function () {
    let store = loadSavedJobsStore();
    store = addSavedJobDirect(store, mockJob);
    const json = exportSavedJobsJSON(store);
    const parsed = JSON.parse(json);
    expect(parsed.jobs.length).toBe(1);
  });

  it('resets on schema version mismatch', function () {
    fakeStorage[SAVED_JOBS_STORE_KEY] = JSON.stringify({ schemaVersion: 999, jobs: [mockJob], selectedJobId: null });
    const store = loadSavedJobsStore();
    expect(store.jobs).toEqual([]);
  });
});
