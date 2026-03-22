/**
 * ============================================================================
 * SAVED JOBS STORAGE -- CRUD for locally saved jobs
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

import { storageGetJSON, storageSetJSON } from './storage';
import type { Job } from './job-types';
import type { SavedJobsStore } from './saved-jobs-types';
import { SAVED_JOBS_SCHEMA_VERSION } from './saved-jobs-types';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

export const SAVED_JOBS_STORE_KEY = 'pathos:saved-jobs-store';

// ---------------------------------------------------------------------------
// Store read/write
// ---------------------------------------------------------------------------

function defaultStore(): SavedJobsStore {
  return {
    schemaVersion: SAVED_JOBS_SCHEMA_VERSION,
    jobs: [],
    selectedJobId: null,
  };
}

export function loadSavedJobsStore(): SavedJobsStore {
  const raw = storageGetJSON<Record<string, unknown>>(SAVED_JOBS_STORE_KEY, {});
  if (!raw || raw.schemaVersion !== SAVED_JOBS_SCHEMA_VERSION) {
    return defaultStore();
  }
  return raw as unknown as SavedJobsStore;
}

export function saveSavedJobsStore(store: SavedJobsStore): boolean {
  const stamped: SavedJobsStore = { ...store, schemaVersion: SAVED_JOBS_SCHEMA_VERSION };
  return storageSetJSON(SAVED_JOBS_STORE_KEY, stamped);
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function addSavedJob(store: SavedJobsStore, job: Omit<Job, 'id' | 'savedAt'>): SavedJobsStore {
  const exists = store.jobs.some(function (j) {
    return j.title === job.title && j.agency === job.agency;
  });
  if (exists) return store;

  const newJob: Job = {
    ...job,
    id: generateId(),
    savedAt: new Date().toISOString(),
  };
  return {
    ...store,
    jobs: [newJob].concat(store.jobs),
    selectedJobId: newJob.id,
  };
}

export function addSavedJobDirect(store: SavedJobsStore, job: Job): SavedJobsStore {
  const exists = store.jobs.some(function (j) { return j.id === job.id; });
  if (exists) return store;
  return {
    ...store,
    jobs: [job].concat(store.jobs),
    selectedJobId: job.id,
  };
}

export function removeSavedJob(store: SavedJobsStore, jobId: string): SavedJobsStore {
  const remaining = store.jobs.filter(function (j) { return j.id !== jobId; });
  return {
    ...store,
    jobs: remaining,
    selectedJobId:
      store.selectedJobId === jobId
        ? (remaining.length > 0 ? remaining[0].id : null)
        : store.selectedJobId,
  };
}

export function toggleSavedJob(store: SavedJobsStore, job: Job): SavedJobsStore {
  const exists = store.jobs.some(function (j) { return j.id === job.id; });
  if (exists) {
    return removeSavedJob(store, job.id);
  }
  return addSavedJobDirect(store, job);
}

export function isJobInSaved(store: SavedJobsStore, jobId: string): boolean {
  return store.jobs.some(function (j) { return j.id === jobId; });
}

export function selectSavedJob(store: SavedJobsStore, jobId: string): SavedJobsStore {
  return { ...store, selectedJobId: jobId };
}

export function getSelectedSavedJob(store: SavedJobsStore): Job | undefined {
  if (!store.selectedJobId) return undefined;
  return store.jobs.find(function (j) { return j.id === store.selectedJobId; });
}

export function listSavedJobs(store: SavedJobsStore): Job[] {
  return store.jobs;
}

export function clearSavedJobs(): SavedJobsStore {
  const empty = defaultStore();
  storageSetJSON(SAVED_JOBS_STORE_KEY, empty);
  return empty;
}

export function exportSavedJobsJSON(store: SavedJobsStore): string {
  return JSON.stringify(store, null, 2);
}
