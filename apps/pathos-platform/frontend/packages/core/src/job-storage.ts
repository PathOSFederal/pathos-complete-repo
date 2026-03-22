/**
 * ============================================================================
 * JOB SEARCH STORAGE -- CRUD helpers for local job persistence
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * All data is stored in localStorage via packages/core storage utilities.
 * No network calls, no server state.
 */

import { storageGetJSON, storageSetJSON } from './storage';
import type { Job, JobSearchStore } from './job-types';
import { JOB_SEARCH_SCHEMA_VERSION, createMockJobs } from './job-types';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

export const JOB_SEARCH_STORE_KEY = 'pathos:job-search-store';

// ---------------------------------------------------------------------------
// Store read/write
// ---------------------------------------------------------------------------

function defaultStore(): JobSearchStore {
  return {
    schemaVersion: JOB_SEARCH_SCHEMA_VERSION,
    savedJobs: [],
    selectedJobId: null,
    lastSearchQuery: '',
  };
}

export function loadJobSearchStore(): JobSearchStore {
  const raw = storageGetJSON<Record<string, unknown>>(JOB_SEARCH_STORE_KEY, {});
  if (!raw || raw.schemaVersion !== JOB_SEARCH_SCHEMA_VERSION) {
    return defaultStore();
  }
  return raw as unknown as JobSearchStore;
}

export function saveJobSearchStore(store: JobSearchStore): boolean {
  const stamped: JobSearchStore = { ...store, schemaVersion: JOB_SEARCH_SCHEMA_VERSION };
  return storageSetJSON(JOB_SEARCH_STORE_KEY, stamped);
}

// ---------------------------------------------------------------------------
// Mock data loader (for development)
// ---------------------------------------------------------------------------

export function loadMockResultsIfEmpty(store: JobSearchStore): JobSearchStore {
  if (store.savedJobs.length > 0) return store;
  const mocks = createMockJobs();
  return {
    ...store,
    savedJobs: mocks,
    selectedJobId: mocks.length > 0 ? mocks[0].id : null,
  };
}

// ---------------------------------------------------------------------------
// Selection helpers
// ---------------------------------------------------------------------------

/** Ensure selectedJobId points to a valid job; fall back to first if missing. */
export function ensureValidSelection(store: JobSearchStore): JobSearchStore {
  if (store.savedJobs.length === 0) {
    return { ...store, selectedJobId: null };
  }
  const found = store.savedJobs.some(function (j) { return j.id === store.selectedJobId; });
  if (found) return store;
  return { ...store, selectedJobId: store.savedJobs[0].id };
}

export function selectJob(store: JobSearchStore, jobId: string): JobSearchStore {
  return { ...store, selectedJobId: jobId };
}

export function getSelectedJob(store: JobSearchStore): Job | undefined {
  if (!store.selectedJobId) return undefined;
  return store.savedJobs.find(function (j) { return j.id === store.selectedJobId; });
}

// ---------------------------------------------------------------------------
// Job CRUD
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function saveJob(store: JobSearchStore, job: Omit<Job, 'id' | 'savedAt'>): JobSearchStore {
  const newJob: Job = {
    ...job,
    id: generateId(),
    savedAt: new Date().toISOString(),
  };
  return {
    ...store,
    savedJobs: [newJob].concat(store.savedJobs),
  };
}

export function removeJob(store: JobSearchStore, jobId: string): JobSearchStore {
  const remaining = store.savedJobs.filter(function (j) { return j.id !== jobId; });
  return ensureValidSelection({ ...store, savedJobs: remaining });
}

export function isJobSaved(store: JobSearchStore, jobId: string): boolean {
  return store.savedJobs.some(function (j) { return j.id === jobId; });
}

// ---------------------------------------------------------------------------
// Search query
// ---------------------------------------------------------------------------

export function updateSearchQuery(store: JobSearchStore, query: string): JobSearchStore {
  return { ...store, lastSearchQuery: query };
}

// ---------------------------------------------------------------------------
// Export + clear (for Settings -> Data Controls)
// ---------------------------------------------------------------------------

export function exportJobSearchJSON(store: JobSearchStore): string {
  return JSON.stringify(store, null, 2);
}

export function clearJobSearchData(): JobSearchStore {
  const empty = defaultStore();
  storageSetJSON(JOB_SEARCH_STORE_KEY, empty);
  return empty;
}
