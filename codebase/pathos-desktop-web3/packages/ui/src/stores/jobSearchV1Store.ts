/**
 * ============================================================================
 * JOB SEARCH V1 STORE ΓÇö State and persistence for Job Search screen
 * ============================================================================
 *
 * PURPOSE: Holds lastQuery, filters, results (mock list with stable IDs),
 * selectedJobId, and "applied from prompt" audit. Persists to pathos_job_search_v1.
 * Saving a job adds to @pathos/core saved-jobs store so it appears in Saved Jobs.
 *
 * BOUNDARY: No next/* or electron/*. Uses @pathos/core for storage and Job type.
 */

import { create } from 'zustand';
import {
  storageGetJSON,
  storageSetJSON,
  loadSavedJobsStore,
  saveSavedJobsStore,
  addSavedJobDirect,
  removeSavedJob,
  isJobInSaved,
} from '@pathos/core';
import { MOCK_JOBS, mockSearchJobs } from '../screens/jobSearchMockJobs';
import type { Job } from '@pathos/core';

/** localStorage key for V1 job search state (pathos_job_search_v1). Not exported from core. */
const JOB_SEARCH_V1_STORAGE_KEY = 'pathos_job_search_v1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobSearchLastQuery {
  keywords: string;
  location?: string;
}

export interface JobSearchFilters {
  gradeBand?: string;
  series?: string;
  agency?: string;
  remoteType?: string;
  appointmentType?: string;
  location?: string;
}

/** Snapshot of prompt used to apply filters (for "Applied from prompt" + View). */
export interface AppliedFromPrompt {
  promptText: string;
  timestamp: string;
}

/** Default number of jobs per page for Load more (mock-first, future-proof). */
const DEFAULT_PAGE_SIZE = 20;

export interface JobSearchV1State {
  lastQuery: JobSearchLastQuery;
  filters: JobSearchFilters;
  /** Currently rendered slice (first page, then appended on loadMore). */
  results: Job[];
  /** Full result set after last search (mock-only; used to slice for loadMore). */
  allResults: Job[];
  selectedJobId: string | null;
  loading: boolean;
  /** True after first run of search (drives empty vs no-results message). */
  hasSearched: boolean;
  /** Set when filters were applied from "Translate to filters" flow. */
  appliedFromPrompt: AppliedFromPrompt | null;
  pageSize: number;
  page: number;
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export interface JobSearchV1Actions {
  setLastQuery: (q: JobSearchLastQuery) => void;
  setFilters: (f: JobSearchFilters) => void;
  applyFilters: (f: JobSearchFilters) => void;
  clearAllFilters: () => void;
  runSearch: () => void;
  setSelectedJob: (id: string | null) => void;
  setAppliedFromPrompt: (p: AppliedFromPrompt | null) => void;
  /** Persist proposed filters from prompt flow into store and save audit. */
  applyProposedFiltersFromPrompt: (promptText: string, proposed: JobSearchFilters) => void;
  /** Load state from localStorage (call on mount). */
  loadFromStorage: () => void;
  /** Save current state to localStorage (called internally on mutations). */
  persist: () => void;
  /** Check if job is in core saved-jobs store. */
  isJobSaved: (jobId: string) => boolean;
  /** Add job to core saved-jobs store (so it appears in Saved Jobs screen). */
  saveJob: (job: Job) => void;
  /** Remove job from core saved-jobs store. */
  removeSavedJob: (jobId: string) => void;
  /** One-click evaluation: set results to MOCK_JOBS, hasSearched true, select first. */
  loadSampleJobs: () => void;
  /** Append next page to results; never clears selectedJobId. */
  loadMore: () => void;
  /** Set page to 1 and results to first slice from allResults (e.g. after filter/sort change). */
  resetPaging: () => void;
  /** Clear results and reset paging (e.g. on Reset); shows empty state again. */
  clearSearchResults: () => void;
}

const defaultFilters: JobSearchFilters = {};
const defaultLastQuery: JobSearchLastQuery = { keywords: '' };

function getDefaultState(): JobSearchV1State {
  return {
    lastQuery: defaultLastQuery,
    filters: defaultFilters,
    results: [],
    allResults: [],
    selectedJobId: null,
    loading: false,
    hasSearched: false,
    appliedFromPrompt: null,
    pageSize: DEFAULT_PAGE_SIZE,
    page: 1,
    totalCount: 0,
    hasMore: false,
    isLoadingMore: false,
  };
}

/** Build a copy of filters with all keys cleared. */
function emptyFilters(): JobSearchFilters {
  return {};
}

/** Deep clone filters for persistence (no shared refs). */
function cloneFilters(f: JobSearchFilters): JobSearchFilters {
  const out: JobSearchFilters = {};
  if (f.gradeBand !== undefined) out.gradeBand = f.gradeBand;
  if (f.series !== undefined) out.series = f.series;
  if (f.agency !== undefined) out.agency = f.agency;
  if (f.remoteType !== undefined) out.remoteType = f.remoteType;
  if (f.appointmentType !== undefined) out.appointmentType = f.appointmentType;
  if (f.location !== undefined) out.location = f.location;
  return out;
}

function cloneLastQuery(q: JobSearchLastQuery): JobSearchLastQuery {
  const out: JobSearchLastQuery = { keywords: q.keywords };
  if (q.location !== undefined) out.location = q.location;
  return out;
}

/** Load persisted state from localStorage; invalid or missing returns default. */
function loadPersistedState(): JobSearchV1State {
  const raw = storageGetJSON<Record<string, unknown>>(JOB_SEARCH_V1_STORAGE_KEY, {});
  if (raw === null || typeof raw !== 'object') {
    return getDefaultState();
  }
  const lastQuery =
    raw.lastQuery !== null && typeof raw.lastQuery === 'object' && typeof (raw.lastQuery as Record<string, unknown>).keywords === 'string'
      ? cloneLastQuery(raw.lastQuery as JobSearchLastQuery)
      : defaultLastQuery;
  const filters =
    raw.filters !== null && typeof raw.filters === 'object'
      ? cloneFilters(raw.filters as JobSearchFilters)
      : defaultFilters;
  const results = Array.isArray(raw.results) ? (raw.results as Job[]) : [];
  const allResults = Array.isArray(raw.allResults) ? (raw.allResults as Job[]) : [];
  const selectedJobId =
    typeof raw.selectedJobId === 'string' || raw.selectedJobId === null
      ? raw.selectedJobId
      : null;
  const hasSearched = raw.hasSearched === true;
  let appliedFromPrompt: AppliedFromPrompt | null = null;
  if (
    raw.appliedFromPrompt !== null &&
    typeof raw.appliedFromPrompt === 'object' &&
    typeof (raw.appliedFromPrompt as Record<string, unknown>).promptText === 'string' &&
    typeof (raw.appliedFromPrompt as Record<string, unknown>).timestamp === 'string'
  ) {
    appliedFromPrompt = raw.appliedFromPrompt as AppliedFromPrompt;
  }
  const pageSize = typeof raw.pageSize === 'number' && raw.pageSize > 0 ? raw.pageSize : DEFAULT_PAGE_SIZE;
  const page = typeof raw.page === 'number' && raw.page >= 1 ? raw.page : 1;
  const totalCount = typeof raw.totalCount === 'number' && raw.totalCount >= 0 ? raw.totalCount : 0;
  const hasMore = raw.hasMore === true;
  return {
    lastQuery,
    filters,
    results,
    allResults,
    selectedJobId,
    loading: false,
    hasSearched,
    appliedFromPrompt,
    pageSize,
    page,
    totalCount,
    hasMore,
    isLoadingMore: false,
  };
}

/** Serialize state for persistence (exclude loading, isLoadingMore). */
function stateToPersist(s: JobSearchV1State): Record<string, unknown> {
  return {
    lastQuery: s.lastQuery,
    filters: s.filters,
    results: s.results,
    allResults: s.allResults,
    selectedJobId: s.selectedJobId,
    hasSearched: s.hasSearched,
    appliedFromPrompt: s.appliedFromPrompt,
    pageSize: s.pageSize,
    page: s.page,
    totalCount: s.totalCount,
    hasMore: s.hasMore,
  };
}

export const useJobSearchV1Store = create<JobSearchV1State & JobSearchV1Actions>(function (set, get) {
  return {
    ...getDefaultState(),

    setLastQuery: function (q) {
      set({ lastQuery: cloneLastQuery(q) });
      get().persist();
    },

    setFilters: function (f) {
      set({ filters: cloneFilters(f) });
      get().persist();
      const s = get();
      if (s.hasSearched && s.allResults.length > 0) {
        get().resetPaging();
      }
    },

    applyFilters: function (f) {
      set({ filters: cloneFilters(f) });
      get().persist();
      const s = get();
      if (s.hasSearched && s.allResults.length > 0) {
        get().resetPaging();
      }
    },

    clearAllFilters: function () {
      set({ filters: emptyFilters() });
      get().persist();
      const s = get();
      if (s.hasSearched && s.allResults.length > 0) {
        get().resetPaging();
      }
    },

    runSearch: function () {
      set({ loading: true });
      const state = get();
      const pageSize = state.pageSize;
      // Deterministic mock search over MOCK_JOBS (keywords, location, filters).
      setTimeout(function () {
        const list = mockSearchJobs(
          {
            keywords: state.lastQuery.keywords,
            location: state.lastQuery.location,
            filters: state.filters,
          },
          MOCK_JOBS
        );
        const totalCount = list.length;
        const firstSlice: Job[] = [];
        for (let i = 0; i < pageSize && i < list.length; i++) {
          firstSlice.push(list[i]);
        }
        const hasMore = totalCount > pageSize;
        const selectedId =
          state.selectedJobId && list.some(function (j) { return j.id === state.selectedJobId; })
            ? state.selectedJobId
            : firstSlice.length > 0
              ? firstSlice[0].id
              : null;
        set({
          allResults: list,
          results: firstSlice,
          totalCount,
          page: 1,
          hasMore,
          selectedJobId: selectedId,
          loading: false,
          hasSearched: true,
        });
        get().persist();
      }, 400);
    },

    loadSampleJobs: function () {
      const list = MOCK_JOBS;
      const state = get();
      const pageSize = state.pageSize;
      const firstSlice: Job[] = [];
      for (let i = 0; i < pageSize && i < list.length; i++) {
        firstSlice.push(list[i]);
      }
      const firstId = firstSlice.length > 0 ? firstSlice[0].id : null;
      set({
        allResults: list,
        results: firstSlice,
        totalCount: list.length,
        page: 1,
        hasMore: list.length > pageSize,
        selectedJobId: firstId,
        loading: false,
        hasSearched: true,
      });
      get().persist();
    },

    loadMore: function () {
      const state = get();
      if (!state.hasMore || state.isLoadingMore) return;
      set({ isLoadingMore: true });
      const nextPage = state.page + 1;
      const start = state.page * state.pageSize;
      const end = start + state.pageSize;
      const nextSlice: Job[] = [];
      for (let i = start; i < end && i < state.allResults.length; i++) {
        const j = state.allResults[i];
        if (j !== undefined) nextSlice.push(j);
      }
      const nextResults: Job[] = [];
      for (let i = 0; i < state.results.length; i++) {
        const j = state.results[i];
        if (j !== undefined) nextResults.push(j);
      }
      for (let i = 0; i < nextSlice.length; i++) {
        nextResults.push(nextSlice[i]);
      }
      const hasMore = end < state.totalCount;
      set({
        results: nextResults,
        page: nextPage,
        hasMore,
        isLoadingMore: false,
      });
      get().persist();
    },

    resetPaging: function () {
      const state = get();
      const firstSlice: Job[] = [];
      for (let i = 0; i < state.pageSize && i < state.allResults.length; i++) {
        firstSlice.push(state.allResults[i]);
      }
      set({
        page: 1,
        results: firstSlice,
        hasMore: state.totalCount > state.pageSize,
      });
      get().persist();
    },

    clearSearchResults: function () {
      set({
        results: [],
        allResults: [],
        page: 1,
        totalCount: 0,
        hasMore: false,
        hasSearched: false,
      });
      get().persist();
    },

    setSelectedJob: function (id) {
      set({ selectedJobId: id });
      get().persist();
    },

    setAppliedFromPrompt: function (p) {
      set({ appliedFromPrompt: p });
      get().persist();
    },

    applyProposedFiltersFromPrompt: function (promptText, proposed) {
      set({
        filters: cloneFilters(proposed),
        appliedFromPrompt: {
          promptText,
          timestamp: new Date().toISOString(),
        },
      });
      get().persist();
    },

    loadFromStorage: function () {
      const loaded = loadPersistedState();
      set(loaded);
    },

    persist: function () {
      const state = get();
      storageSetJSON(JOB_SEARCH_V1_STORAGE_KEY, stateToPersist(state));
    },

    isJobSaved: function (jobId) {
      const store = loadSavedJobsStore();
      return isJobInSaved(store, jobId);
    },

    saveJob: function (job) {
      const store = loadSavedJobsStore();
      const next = addSavedJobDirect(store, job);
      saveSavedJobsStore(next);
    },

    removeSavedJob: function (jobId) {
      const store = loadSavedJobsStore();
      const next = removeSavedJob(store, jobId);
      saveSavedJobsStore(next);
    },
  };
});
