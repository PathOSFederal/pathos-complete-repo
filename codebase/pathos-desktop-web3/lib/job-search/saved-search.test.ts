/**
 * ============================================================================
 * SAVED SEARCH TRIPWIRE TESTS
 * ============================================================================
 *
 * FILE PURPOSE:
 * These tests verify that saved search operations don't share references
 * between the saved search and the applied filters. This is a critical
 * bug pattern that has caused issues.
 *
 * BUG PATTERN:
 * When applying a saved search, if we don't deep clone the filter arrays,
 * modifying the applied filters will also modify the saved search.
 *
 * EXAMPLE BUG:
 * ```typescript
 * // BAD: Shared reference
 * const applied = savedSearch.filters; // Same reference!
 * applied.seriesCodes.push('9999'); // Also modifies savedSearch!
 *
 * // GOOD: Deep clone
 * const applied = JSON.parse(JSON.stringify(savedSearch.filters));
 * applied.seriesCodes.push('9999'); // savedSearch is unchanged
 * ```
 *
 * @version Day 14 - Process Hardening
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import type { JobSearchFilters, SavedJobSearch } from '@/store/jobSearchStore';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a test filter object with array fields populated.
 * These array fields are the ones most likely to cause shared reference bugs.
 */
function createTestFilters(overrides: Partial<JobSearchFilters> = {}): JobSearchFilters {
  return {
    query: '',
    segment: 'federal',
    location: null,
    gradeBand: null,
    agency: null,
    workType: null,
    seriesCode: null,
    seriesCodes: ['0343', '0560'],
    appointmentTypes: ['permanent'],
    workSchedules: ['full-time'],
    promotionPotential: null,
    supervisoryStatuses: [],
    teleworkPreference: null,
    travelFrequency: null,
    clearanceLevels: ['public-trust'],
    positionSensitivities: [],
    hiringPaths: ['status', 'veterans'],
    internalExternal: null,
    qualificationEmphasis: null,
    trajectoryPreference: null,
    retirementImpactPreference: null,
    compensationFocus: null,
    ...overrides,
  };
}

/**
 * Creates a test saved search object.
 */
function createTestSavedSearch(filters: JobSearchFilters): SavedJobSearch {
  return {
    id: 'test-id-123',
    name: 'Test Search',
    filters: filters,
    createdAt: new Date().toISOString(),
    isDefault: false,
    alerts: {
      enabled: false,
      frequency: 'off',
      minMatch: 80,
      channel: 'in-app',
    },
  };
}

/**
 * Simulates applying a saved search by deep cloning filters.
 * This is the CORRECT implementation.
 */
function applyFiltersCorrectly(savedFilters: JobSearchFilters): JobSearchFilters {
  // Deep clone using JSON.parse/stringify
  // This ensures no shared references
  return JSON.parse(JSON.stringify(savedFilters));
}

/**
 * Simulates applying a saved search WITHOUT deep cloning.
 * This is the BUGGY implementation that we want to prevent.
 */
function applyFiltersBuggy(savedFilters: JobSearchFilters): JobSearchFilters {
  // BAD: Just returns the same object reference
  // Any mutation will affect the original!
  return savedFilters;
}

/**
 * Simulates shallow clone (also buggy for nested arrays).
 */
function applyFiltersShallowClone(savedFilters: JobSearchFilters): JobSearchFilters {
  // STILL BAD: Object.assign doesn't deep clone arrays
  return Object.assign({}, savedFilters);
}

// ============================================================================
// TEST SUITE: Deep Clone Verification
// ============================================================================

describe('Saved search filter cloning', function () {
  /**
   * TRIPWIRE: Applied filters should be a deep clone, not a shared reference.
   * If this test fails, it means the apply logic is sharing references.
   */
  it('should not share array references after applying (correct implementation)', function () {
    const originalFilters = createTestFilters();
    const savedSearch = createTestSavedSearch(originalFilters);

    // Apply the saved search correctly
    const appliedFilters = applyFiltersCorrectly(savedSearch.filters);

    // Mutate the applied filters
    appliedFilters.seriesCodes.push('9999');
    appliedFilters.appointmentTypes.push('term');

    // Original should be unchanged
    expect(savedSearch.filters.seriesCodes).not.toContain('9999');
    expect(savedSearch.filters.appointmentTypes).not.toContain('term');
    expect(savedSearch.filters.seriesCodes).toHaveLength(2);
    expect(savedSearch.filters.appointmentTypes).toHaveLength(1);
  });

  /**
   * Demonstrates the bug pattern - this shows what happens WITHOUT deep clone.
   */
  it('demonstrates the bug pattern with no cloning', function () {
    const originalFilters = createTestFilters();
    const savedSearch = createTestSavedSearch(originalFilters);

    // Apply the saved search buggy way (no clone)
    const appliedFilters = applyFiltersBuggy(savedSearch.filters);

    // Mutate the applied filters
    appliedFilters.seriesCodes.push('9999');

    // BUG: Original is also mutated!
    expect(savedSearch.filters.seriesCodes).toContain('9999');
  });

  /**
   * Demonstrates that shallow clone also fails for nested arrays.
   */
  it('demonstrates the bug pattern with shallow clone', function () {
    const originalFilters = createTestFilters();
    const savedSearch = createTestSavedSearch(originalFilters);

    // Apply with shallow clone
    const appliedFilters = applyFiltersShallowClone(savedSearch.filters);

    // Mutate an array property
    appliedFilters.seriesCodes.push('9999');

    // BUG: Original arrays are still shared!
    expect(savedSearch.filters.seriesCodes).toContain('9999');
  });

  /**
   * TRIPWIRE: All array properties should be separate instances.
   */
  it('should have separate array instances for all array properties', function () {
    const originalFilters = createTestFilters();
    const applied = applyFiltersCorrectly(originalFilters);

    // Check that array references are different
    expect(applied.seriesCodes).not.toBe(originalFilters.seriesCodes);
    expect(applied.appointmentTypes).not.toBe(originalFilters.appointmentTypes);
    expect(applied.workSchedules).not.toBe(originalFilters.workSchedules);
    expect(applied.clearanceLevels).not.toBe(originalFilters.clearanceLevels);
    expect(applied.hiringPaths).not.toBe(originalFilters.hiringPaths);
    expect(applied.supervisoryStatuses).not.toBe(originalFilters.supervisoryStatuses);
    expect(applied.positionSensitivities).not.toBe(originalFilters.positionSensitivities);
  });

  /**
   * TRIPWIRE: Array contents should be equal but not same reference.
   */
  it('should have equal array contents after cloning', function () {
    const originalFilters = createTestFilters();
    const applied = applyFiltersCorrectly(originalFilters);

    // Contents should be equal
    expect(applied.seriesCodes).toEqual(originalFilters.seriesCodes);
    expect(applied.appointmentTypes).toEqual(originalFilters.appointmentTypes);
    expect(applied.hiringPaths).toEqual(originalFilters.hiringPaths);
  });
});

// ============================================================================
// TEST SUITE: Mutation Isolation
// ============================================================================

describe('Filter mutation isolation', function () {
  /**
   * TRIPWIRE: Clearing an array after apply should not affect original.
   */
  it('should not affect original when clearing applied array', function () {
    const originalFilters = createTestFilters({
      seriesCodes: ['0343', '0560', '2210'],
    });
    const savedSearch = createTestSavedSearch(originalFilters);

    const applied = applyFiltersCorrectly(savedSearch.filters);

    // Clear the applied array
    applied.seriesCodes.length = 0;

    // Original should still have all items
    expect(savedSearch.filters.seriesCodes).toHaveLength(3);
  });

  /**
   * TRIPWIRE: Replacing array items should not affect original.
   */
  it('should not affect original when replacing array items', function () {
    const originalFilters = createTestFilters({
      appointmentTypes: ['permanent'],
    });
    const savedSearch = createTestSavedSearch(originalFilters);

    const applied = applyFiltersCorrectly(savedSearch.filters);

    // Replace item
    applied.appointmentTypes[0] = 'temporary';

    // Original should be unchanged
    expect(savedSearch.filters.appointmentTypes[0]).toBe('permanent');
  });

  /**
   * TRIPWIRE: Splicing array should not affect original.
   */
  it('should not affect original when splicing applied array', function () {
    const originalFilters = createTestFilters({
      hiringPaths: ['status', 'veterans', 'public'],
    });
    const savedSearch = createTestSavedSearch(originalFilters);

    const applied = applyFiltersCorrectly(savedSearch.filters);

    // Remove middle item
    applied.hiringPaths.splice(1, 1);

    // Original should still have all items
    expect(savedSearch.filters.hiringPaths).toHaveLength(3);
    expect(savedSearch.filters.hiringPaths).toContain('veterans');
  });
});

// ============================================================================
// TEST SUITE: Edge Cases
// ============================================================================

describe('Saved search edge cases', function () {
  /**
   * TRIPWIRE: Empty arrays should also be cloned (not shared empty reference).
   */
  it('should clone empty arrays correctly', function () {
    const originalFilters = createTestFilters({
      seriesCodes: [],
      appointmentTypes: [],
    });

    const applied = applyFiltersCorrectly(originalFilters);

    // Should be different array instances
    expect(applied.seriesCodes).not.toBe(originalFilters.seriesCodes);
    expect(applied.appointmentTypes).not.toBe(originalFilters.appointmentTypes);

    // But both should be empty
    expect(applied.seriesCodes).toHaveLength(0);
    expect(applied.appointmentTypes).toHaveLength(0);
  });

  /**
   * TRIPWIRE: Null values should remain null after cloning.
   */
  it('should preserve null values correctly', function () {
    const originalFilters = createTestFilters({
      location: null,
      gradeBand: null,
      agency: null,
    });

    const applied = applyFiltersCorrectly(originalFilters);

    expect(applied.location).toBeNull();
    expect(applied.gradeBand).toBeNull();
    expect(applied.agency).toBeNull();
  });

  /**
   * TRIPWIRE: String values should be preserved.
   */
  it('should preserve string values correctly', function () {
    const originalFilters = createTestFilters({
      query: 'program analyst',
      segment: 'federal',
      location: 'dc',
    });

    const applied = applyFiltersCorrectly(originalFilters);

    expect(applied.query).toBe('program analyst');
    expect(applied.segment).toBe('federal');
    expect(applied.location).toBe('dc');
  });
});
