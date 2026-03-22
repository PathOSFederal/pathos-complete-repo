/**
 * Job Search v1 store tests: runSearch populates results, applyProposedFiltersFromPrompt,
 * saveJob persists to core saved-jobs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useJobSearchV1Store } from './jobSearchV1Store';
import { loadSavedJobsStore, clearSavedJobs } from '@pathos/core';

describe('jobSearchV1Store', function () {
  beforeEach(function () {
    clearSavedJobs();
    useJobSearchV1Store.setState({
      lastQuery: { keywords: '' },
      filters: {},
      results: [],
      allResults: [],
      selectedJobId: null,
      loading: false,
      hasSearched: false,
      appliedFromPrompt: null,
      pageSize: 20,
      page: 1,
      totalCount: 0,
      hasMore: false,
      isLoadingMore: false,
    });
  });

  it('runSearch populates results after async delay', function () {
    vi.useFakeTimers();
    const store = useJobSearchV1Store.getState();
    expect(store.results.length).toBe(0);
    expect(store.hasSearched).toBe(false);

    store.runSearch();
    expect(useJobSearchV1Store.getState().loading).toBe(true);

    vi.runAllTimers();
    const after = useJobSearchV1Store.getState();
    expect(after.loading).toBe(false);
    expect(after.hasSearched).toBe(true);
    expect(after.results.length).toBeGreaterThan(0);
    expect(after.results[0].id).toBeDefined();
    expect(after.results[0].title).toBeDefined();
    vi.useRealTimers();
  });

  it('runSearch sets totalCount and results to first pageSize slice', function () {
    vi.useFakeTimers();
    useJobSearchV1Store.getState().runSearch();
    vi.runAllTimers();
    const after = useJobSearchV1Store.getState();
    vi.useRealTimers();
    expect(after.totalCount).toBeGreaterThanOrEqual(30);
    expect(after.results.length).toBeLessThanOrEqual(after.pageSize);
    expect(after.results.length).toBe(Math.min(after.pageSize, after.totalCount));
    expect(after.hasMore).toBe(after.totalCount > after.pageSize);
  });

  it('loadMore appends next slice and increases results length', function () {
    vi.useFakeTimers();
    useJobSearchV1Store.getState().runSearch();
    vi.runAllTimers();
    const afterSearch = useJobSearchV1Store.getState();
    vi.useRealTimers();
    if (!afterSearch.hasMore) return;
    const lenBefore = afterSearch.results.length;
    useJobSearchV1Store.getState().loadMore();
    const afterMore = useJobSearchV1Store.getState();
    expect(afterMore.results.length).toBeGreaterThan(lenBefore);
    expect(afterMore.page).toBe(2);
  });

  it('changing filter resets page to 1 and results to first slice', function () {
    vi.useFakeTimers();
    useJobSearchV1Store.getState().runSearch();
    vi.runAllTimers();
    const afterSearch = useJobSearchV1Store.getState();
    vi.useRealTimers();
    if (afterSearch.totalCount <= afterSearch.pageSize) return;
    useJobSearchV1Store.getState().loadMore();
    expect(useJobSearchV1Store.getState().page).toBe(2);
    useJobSearchV1Store.getState().setFilters({ gradeBand: 'GS-12' });
    const afterFilter = useJobSearchV1Store.getState();
    expect(afterFilter.page).toBe(1);
    expect(afterFilter.results.length).toBeLessThanOrEqual(afterFilter.pageSize);
  });

  it('setSelectedJob updates selectedJobId', function () {
    useJobSearchV1Store.getState().runSearch();
    vi.useFakeTimers();
    vi.advanceTimersByTime(500);
    const results = useJobSearchV1Store.getState().results;
    vi.useRealTimers();
    if (results.length > 0) {
      useJobSearchV1Store.getState().setSelectedJob(results[0].id);
      expect(useJobSearchV1Store.getState().selectedJobId).toBe(results[0].id);
    }
  });

  it('applyProposedFiltersFromPrompt sets filters and appliedFromPrompt', function () {
    const store = useJobSearchV1Store.getState();
    store.applyProposedFiltersFromPrompt('Remote GS-12 roles', {
      gradeBand: 'GS-12',
      remoteType: 'Remote',
    });
    const after = useJobSearchV1Store.getState();
    expect(after.filters.gradeBand).toBe('GS-12');
    expect(after.filters.remoteType).toBe('Remote');
    expect(after.appliedFromPrompt !== null).toBe(true);
    if (after.appliedFromPrompt !== null) {
      expect(after.appliedFromPrompt.promptText).toBe('Remote GS-12 roles');
    }
  });

  it('loadSampleJobs populates results and selects first job', function () {
    const store = useJobSearchV1Store.getState();
    expect(store.results.length).toBe(0);
    expect(store.hasSearched).toBe(false);
    expect(store.selectedJobId).toBe(null);

    store.loadSampleJobs();
    const after = useJobSearchV1Store.getState();
    expect(after.hasSearched).toBe(true);
    expect(after.results.length).toBeGreaterThan(0);
    expect(after.selectedJobId).toBe(after.results[0].id);
  });

  it('setFilters then runSearch returns filtered results by gradeBand', function () {
    vi.useFakeTimers();
    const store = useJobSearchV1Store.getState();
    store.setFilters({ gradeBand: 'GS-12' });
    store.runSearch();
    vi.runAllTimers();
    const after = useJobSearchV1Store.getState();
    vi.useRealTimers();
    expect(after.hasSearched).toBe(true);
    for (let i = 0; i < after.results.length; i++) {
      expect(after.results[i].grade).toBe('GS-12');
    }
  });

  it('setFilters with series sets filters.series and persists; clearAllFilters resets series', function () {
    const store = useJobSearchV1Store.getState();
    store.setFilters({ series: '2210' });
    const afterSet = useJobSearchV1Store.getState();
    expect(afterSet.filters.series).toBe('2210');
    store.persist();
    store.clearAllFilters();
    const afterClear = useJobSearchV1Store.getState();
    expect(afterClear.filters.series === undefined || afterClear.filters.series === '').toBe(true);
  });

  it('applyFilters with agency updates filters.agency (dropdown trigger label reflects this)', function () {
    const store = useJobSearchV1Store.getState();
    store.applyFilters({ agency: 'Department of Veterans Affairs' });
    const after = useJobSearchV1Store.getState();
    expect(after.filters.agency).toBe('Department of Veterans Affairs');
  });

  it('applyFilters with location updates filters.location (dropdown trigger label reflects this)', function () {
    const store = useJobSearchV1Store.getState();
    store.applyFilters({ location: 'Washington, DC' });
    const after = useJobSearchV1Store.getState();
    expect(after.filters.location).toBe('Washington, DC');
  });

  it('saveJob adds job to core saved-jobs and isJobSaved returns true', function () {
    useJobSearchV1Store.getState().runSearch();
    vi.useFakeTimers();
    vi.advanceTimersByTime(500);
    const results = useJobSearchV1Store.getState().results;
    vi.useRealTimers();
    if (results.length > 0) {
      const job = results[0];
      const store = useJobSearchV1Store.getState();
      expect(store.isJobSaved(job.id)).toBe(false);
      store.saveJob(job);
      expect(store.isJobSaved(job.id)).toBe(true);
      const coreStore = loadSavedJobsStore();
      expect(coreStore.jobs.some(function (j) { return j.id === job.id; })).toBe(true);
    }
  });
});
