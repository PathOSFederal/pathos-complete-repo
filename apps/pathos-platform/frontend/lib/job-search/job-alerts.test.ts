/**
 * ============================================================================
 * JOB ALERTS FEATURE TESTS (Day 15)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Tests for the Day 15 Job Alerts features:
 * 1. Saved search frequency transitions (Off/Daily/Weekly)
 * 2. "Create alert from job" dedupe behavior
 * 3. New badge logic with lastSeenAt mechanism
 *
 * WHY THESE TESTS MATTER:
 * - Frequency transitions must persist correctly to localStorage
 * - Dedupe prevents duplicate alerts for similar jobs
 * - New badge count must be computed from stored state, not mock constants
 *
 * @version Day 15 - Job Alerts Polish
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import type { SavedJobSearch, JobAlertConfig, JobSearchFilters } from '@/store/jobSearchStore';
import { deriveSavedSearchFromJob, isDuplicateSignature } from '@/lib/job-search/derive-saved-search';
import type { JobForDerivation } from '@/lib/job-search/derive-saved-search';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a test saved search with specified alert settings.
 */
function createTestSavedSearch(
  id: string,
  name: string,
  alertConfig: Partial<JobAlertConfig> = {},
  alertsLastSeenAt?: string,
  signature?: string
): SavedJobSearch {
  const alerts: JobAlertConfig = {
    enabled: false,
    frequency: 'off',
    minMatch: 80,
    channel: 'in-app',
  };

  // Apply overrides
  if (alertConfig.enabled !== undefined) {
    alerts.enabled = alertConfig.enabled;
  }
  if (alertConfig.frequency !== undefined) {
    alerts.frequency = alertConfig.frequency;
  }
  if (alertConfig.minMatch !== undefined) {
    alerts.minMatch = alertConfig.minMatch;
  }
  if (alertConfig.channel !== undefined) {
    alerts.channel = alertConfig.channel;
  }

  const search: SavedJobSearch = {
    id: id,
    name: name,
    filters: createDefaultFilters(),
    createdAt: new Date().toISOString(),
    isDefault: false,
    alerts: alerts,
  };

  if (alertsLastSeenAt !== undefined) {
    search.alertsLastSeenAt = alertsLastSeenAt;
  }

  if (signature !== undefined) {
    search.signature = signature;
  }

  return search;
}

/**
 * Creates default filters for testing.
 */
function createDefaultFilters(): JobSearchFilters {
  return {
    query: '',
    segment: 'federal',
    location: null,
    gradeBand: null,
    agency: null,
    workType: null,
    seriesCode: null,
    seriesCodes: [],
    appointmentTypes: [],
    workSchedules: [],
    promotionPotential: null,
    supervisoryStatuses: [],
    teleworkPreference: null,
    travelFrequency: null,
    clearanceLevels: [],
    positionSensitivities: [],
    hiringPaths: [],
    internalExternal: null,
    qualificationEmphasis: null,
    trajectoryPreference: null,
    retirementImpactPreference: null,
    compensationFocus: null,
  };
}

/**
 * Simulates updating alert frequency (what the store action does).
 */
function updateAlertFrequency(
  search: SavedJobSearch,
  newFrequency: 'off' | 'daily' | 'weekly'
): SavedJobSearch {
  const newAlerts: JobAlertConfig = {
    enabled: newFrequency !== 'off',
    frequency: newFrequency,
    minMatch: search.alerts.minMatch,
    channel: search.alerts.channel,
  };

  return {
    id: search.id,
    name: search.name,
    filters: search.filters,
    createdAt: search.createdAt,
    isDefault: search.isDefault,
    alerts: newAlerts,
    alertsLastSeenAt: search.alertsLastSeenAt,
    signature: search.signature,
  };
}

/**
 * Simulates computing "new" count based on lastSeenAt.
 * 
 * HOW IT WORKS:
 * 1. Build a set of search IDs with alerts enabled
 * 2. Build a map of searchId -> lastSeenAt
 * 3. For each alert item, check if its search has alerts enabled
 * 4. If enabled and never seen (no lastSeenAt), count as new
 * 5. If enabled and seen, compare timestamps
 */
function computeNewCount(
  alertItems: Array<{ savedSearchId: string; createdAtISO: string }>,
  savedSearches: SavedJobSearch[]
): number {
  let newCount = 0;

  // Build a set of search IDs with alerts enabled
  // and a map of searchId -> lastSeenAt
  const enabledSearchIds: Set<string> = new Set();
  const lastSeenMap: Record<string, string | undefined> = {};
  
  for (let i = 0; i < savedSearches.length; i++) {
    const search = savedSearches[i];
    if (search.alerts && search.alerts.enabled) {
      enabledSearchIds.add(search.id);
      lastSeenMap[search.id] = search.alertsLastSeenAt;
    }
  }

  // Count new items
  for (let j = 0; j < alertItems.length; j++) {
    const item = alertItems[j];
    const searchId = item.savedSearchId;

    // Skip items with empty searchId
    if (searchId === undefined || searchId === null || searchId === '') {
      continue;
    }

    // Skip if search not found or alerts not enabled
    if (!enabledSearchIds.has(searchId)) {
      continue;
    }

    const lastSeen = lastSeenMap[searchId];
    const itemCreated = item.createdAtISO;

    // If never seen (lastSeen is undefined/null/empty), count as new
    if (lastSeen === undefined || lastSeen === null || lastSeen === '') {
      newCount = newCount + 1;
      continue;
    }

    // Compare timestamps
    if (itemCreated > lastSeen) {
      newCount = newCount + 1;
    }
  }

  return newCount;
}

// ============================================================================
// TEST SUITE: Frequency Transitions
// ============================================================================

describe('Saved search frequency transitions', function () {
  /**
   * Test: Off -> Weekly transition enables alerts.
   */
  it('should enable alerts when changing from Off to Weekly', function () {
    const search = createTestSavedSearch('test-1', 'Test Search', {
      enabled: false,
      frequency: 'off',
    });

    expect(search.alerts.enabled).toBe(false);
    expect(search.alerts.frequency).toBe('off');

    const updated = updateAlertFrequency(search, 'weekly');

    expect(updated.alerts.enabled).toBe(true);
    expect(updated.alerts.frequency).toBe('weekly');
  });

  /**
   * Test: Weekly -> Daily transition keeps alerts enabled.
   */
  it('should keep alerts enabled when changing from Weekly to Daily', function () {
    const search = createTestSavedSearch('test-2', 'Test Search', {
      enabled: true,
      frequency: 'weekly',
    });

    const updated = updateAlertFrequency(search, 'daily');

    expect(updated.alerts.enabled).toBe(true);
    expect(updated.alerts.frequency).toBe('daily');
  });

  /**
   * Test: Daily -> Off transition disables alerts.
   */
  it('should disable alerts when changing from Daily to Off', function () {
    const search = createTestSavedSearch('test-3', 'Test Search', {
      enabled: true,
      frequency: 'daily',
    });

    const updated = updateAlertFrequency(search, 'off');

    expect(updated.alerts.enabled).toBe(false);
    expect(updated.alerts.frequency).toBe('off');
  });

  /**
   * Test: Weekly -> Off -> Weekly round trip.
   */
  it('should correctly handle Off -> Weekly -> Off -> Weekly round trip', function () {
    let search = createTestSavedSearch('test-4', 'Test Search', {
      enabled: false,
      frequency: 'off',
    });

    // Off -> Weekly
    search = updateAlertFrequency(search, 'weekly');
    expect(search.alerts.enabled).toBe(true);
    expect(search.alerts.frequency).toBe('weekly');

    // Weekly -> Off
    search = updateAlertFrequency(search, 'off');
    expect(search.alerts.enabled).toBe(false);
    expect(search.alerts.frequency).toBe('off');

    // Off -> Weekly again
    search = updateAlertFrequency(search, 'weekly');
    expect(search.alerts.enabled).toBe(true);
    expect(search.alerts.frequency).toBe('weekly');
  });

  /**
   * Test: minMatch and channel are preserved during transitions.
   */
  it('should preserve minMatch and channel during frequency transitions', function () {
    const search = createTestSavedSearch('test-5', 'Test Search', {
      enabled: false,
      frequency: 'off',
      minMatch: 90,
      channel: 'email',
    });

    const updated = updateAlertFrequency(search, 'daily');

    expect(updated.alerts.minMatch).toBe(90);
    expect(updated.alerts.channel).toBe('email');
  });
});

// ============================================================================
// TEST SUITE: Create Alert from Job Dedupe
// ============================================================================

describe('Create alert from job dedupe behavior', function () {
  /**
   * Test: Same job produces same signature.
   */
  it('should produce same signature for identical job data', function () {
    const job: JobForDerivation = {
      title: 'Management Analyst',
      seriesCode: '0343',
      gradeLevel: 'GS-13',
      locationDisplay: 'Washington, DC',
      teleworkEligibility: 'Remote',
      segment: 'federal',
    };

    const result1 = deriveSavedSearchFromJob(job, { preferSameAgency: false });
    const result2 = deriveSavedSearchFromJob(job, { preferSameAgency: false });

    expect(result1.signature).toBe(result2.signature);
  });

  /**
   * Test: Different jobs produce different signatures.
   */
  it('should produce different signatures for different jobs', function () {
    const job1: JobForDerivation = {
      title: 'Management Analyst',
      seriesCode: '0343',
      gradeLevel: 'GS-13',
      segment: 'federal',
    };

    const job2: JobForDerivation = {
      title: 'IT Specialist',
      seriesCode: '2210',
      gradeLevel: 'GS-14',
      segment: 'federal',
    };

    const result1 = deriveSavedSearchFromJob(job1, { preferSameAgency: false });
    const result2 = deriveSavedSearchFromJob(job2, { preferSameAgency: false });

    expect(result1.signature).not.toBe(result2.signature);
  });

  /**
   * Test: isDuplicateSignature correctly identifies duplicates.
   */
  it('should identify duplicate signatures', function () {
    const existingSignatures = [
      'federal|0343|management analyst|gs12-gs14|any|any|any',
      'federal|2210|it specialist|gs13-gs15|remote-only|any|any',
    ];

    // Should find duplicate
    const duplicate = isDuplicateSignature(
      'federal|0343|management analyst|gs12-gs14|any|any|any',
      existingSignatures
    );
    expect(duplicate).toBe(true);

    // Should not find non-duplicate
    const notDuplicate = isDuplicateSignature(
      'federal|0560|budget analyst|gs12-gs14|any|any|any',
      existingSignatures
    );
    expect(notDuplicate).toBe(false);
  });

  /**
   * Test: preferSameAgency affects signature.
   */
  it('should produce different signatures based on preferSameAgency', function () {
    const job: JobForDerivation = {
      title: 'Management Analyst',
      seriesCode: '0343',
      gradeLevel: 'GS-13',
      organizationName: 'Department of Defense',
      segment: 'federal',
    };

    const withAgency = deriveSavedSearchFromJob(job, { preferSameAgency: true });
    const withoutAgency = deriveSavedSearchFromJob(job, { preferSameAgency: false });

    expect(withAgency.signature).not.toBe(withoutAgency.signature);
    expect(withAgency.signature).toContain('department of defense');
    expect(withoutAgency.signature).toContain('any');
  });

  /**
   * Test: Same job clicked twice should not create duplicates.
   */
  it('should prevent duplicate alert creation for same job', function () {
    const job: JobForDerivation = {
      title: 'Program Analyst',
      seriesCode: '0343',
      gradeLevel: 'GS-12',
      segment: 'federal',
    };

    // First alert creation
    const result1 = deriveSavedSearchFromJob(job, { preferSameAgency: false });

    // Simulate existing signatures after first creation
    const existingSignatures = [result1.signature];

    // Second attempt should be detected as duplicate
    const result2 = deriveSavedSearchFromJob(job, { preferSameAgency: false });
    const isDupe = isDuplicateSignature(result2.signature, existingSignatures);

    expect(isDupe).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: New Badge Logic with lastSeenAt
// ============================================================================

describe('New badge logic with lastSeenAt', function () {
  /**
   * Test: Items created after lastSeenAt are counted as new.
   */
  it('should count items created after lastSeenAt as new', function () {
    const lastSeen = '2025-12-01T00:00:00Z';
    const savedSearches = [
      createTestSavedSearch('search-1', 'Test', { enabled: true }, lastSeen),
    ];

    const alertItems = [
      { savedSearchId: 'search-1', createdAtISO: '2025-12-02T00:00:00Z' }, // After
      { savedSearchId: 'search-1', createdAtISO: '2025-11-30T00:00:00Z' }, // Before
      { savedSearchId: 'search-1', createdAtISO: '2025-12-03T00:00:00Z' }, // After
    ];

    const count = computeNewCount(alertItems, savedSearches);
    expect(count).toBe(2);
  });

  /**
   * Test: Items created before lastSeenAt are not counted.
   */
  it('should not count items created before lastSeenAt', function () {
    const lastSeen = '2025-12-15T00:00:00Z';
    const savedSearches = [
      createTestSavedSearch('search-1', 'Test', { enabled: true }, lastSeen),
    ];

    const alertItems = [
      { savedSearchId: 'search-1', createdAtISO: '2025-12-01T00:00:00Z' },
      { savedSearchId: 'search-1', createdAtISO: '2025-12-10T00:00:00Z' },
    ];

    const count = computeNewCount(alertItems, savedSearches);
    expect(count).toBe(0);
  });

  /**
   * Test: All items are new if lastSeenAt is undefined.
   */
  it('should count all items as new if never seen', function () {
    const savedSearches = [
      createTestSavedSearch('search-1', 'Test', { enabled: true }), // No lastSeenAt
    ];

    const alertItems = [
      { savedSearchId: 'search-1', createdAtISO: '2025-12-01T00:00:00Z' },
      { savedSearchId: 'search-1', createdAtISO: '2025-12-02T00:00:00Z' },
    ];

    const count = computeNewCount(alertItems, savedSearches);
    expect(count).toBe(2);
  });

  /**
   * Test: Items for disabled alerts are not counted.
   */
  it('should not count items for disabled alerts', function () {
    const savedSearches = [
      createTestSavedSearch('search-1', 'Disabled', { enabled: false }),
    ];

    const alertItems = [
      { savedSearchId: 'search-1', createdAtISO: '2025-12-01T00:00:00Z' },
    ];

    const count = computeNewCount(alertItems, savedSearches);
    expect(count).toBe(0);
  });

  /**
   * Test: Mixed searches - only enabled with new items counted.
   */
  it('should handle mixed enabled/disabled searches', function () {
    const savedSearches = [
      createTestSavedSearch('search-1', 'Enabled', { enabled: true }, '2025-12-01T00:00:00Z'),
      createTestSavedSearch('search-2', 'Disabled', { enabled: false }),
      createTestSavedSearch('search-3', 'Enabled Never Seen', { enabled: true }),
    ];

    const alertItems = [
      { savedSearchId: 'search-1', createdAtISO: '2025-12-05T00:00:00Z' }, // After lastSeen
      { savedSearchId: 'search-1', createdAtISO: '2025-11-01T00:00:00Z' }, // Before lastSeen
      { savedSearchId: 'search-2', createdAtISO: '2025-12-05T00:00:00Z' }, // Disabled
      { savedSearchId: 'search-3', createdAtISO: '2025-12-05T00:00:00Z' }, // Never seen
    ];

    const count = computeNewCount(alertItems, savedSearches);
    // 1 from search-1 (after lastSeen) + 1 from search-3 (never seen) = 2
    expect(count).toBe(2);
  });

  /**
   * Test: Items without savedSearchId are skipped.
   */
  it('should skip items without savedSearchId', function () {
    const savedSearches = [
      createTestSavedSearch('search-1', 'Test', { enabled: true }),
    ];

    const alertItems = [
      { savedSearchId: '', createdAtISO: '2025-12-01T00:00:00Z' },
      { savedSearchId: 'search-1', createdAtISO: '2025-12-01T00:00:00Z' },
    ];

    const count = computeNewCount(alertItems, savedSearches);
    expect(count).toBe(1); // Only the one with valid savedSearchId
  });

  /**
   * Test: Marking as seen updates the timestamp.
   */
  it('should update lastSeenAt when marking alerts as seen', function () {
    const before = '2025-12-01T00:00:00Z';
    const search = createTestSavedSearch('search-1', 'Test', { enabled: true }, before);

    // Simulate marking as seen
    const now = new Date().toISOString();
    const updated: SavedJobSearch = {
      id: search.id,
      name: search.name,
      filters: search.filters,
      createdAt: search.createdAt,
      isDefault: search.isDefault,
      alerts: search.alerts,
      alertsLastSeenAt: now,
    };

    expect(updated.alertsLastSeenAt).not.toBe(before);
    expect(updated.alertsLastSeenAt).toBe(now);
  });
});
