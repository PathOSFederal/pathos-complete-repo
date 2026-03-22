/**
 * ============================================================================
 * FILTER-JOBS TRIPWIRE TESTS
 * ============================================================================
 *
 * FILE PURPOSE:
 * These are "tripwire" tests designed to catch recurring bug patterns in the
 * job filtering logic. They focus on edge cases and error-prone behaviors
 * that have caused issues in the past.
 *
 * TEST PHILOSOPHY:
 * Each test here should:
 * 1. Target a specific failure mode that has occurred or is likely to occur
 * 2. Fail meaningfully if the bug is reintroduced
 * 3. Be fast and isolated (no network, no DOM)
 *
 * CATEGORIES:
 * 1. Missing fields handling - jobs may lack optional fields
 * 2. Empty filter arrays - should match all, not none
 * 3. Grade parsing edge cases - various format strings
 * 4. Location matching - fuzzy matching with state codes
 *
 * @version Day 14 - Process Hardening
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  filterJobs,
  matchesText,
  matchesAny,
  parseGradeLevel,
  matchesLocation,
  matchesGradeBand,
} from './filter-jobs';
import type { JobSearchFilters } from '@/store/jobSearchStore';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * Minimal valid job for testing.
 * Uses the JobResult type from mock/job-search.ts
 */
const createTestJob = function (overrides: Partial<{
  id: number;
  role: string;
  series: string;
  grade: string;
  location: string;
  agency: string;
  type: string;
  estTotalComp: number;
  retirementImpact: string;
  matchPercent: number;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    role: overrides.role ?? 'Test Analyst',
    series: overrides.series ?? '0343',
    grade: overrides.grade ?? 'GS-14',
    location: overrides.location ?? 'Washington, DC',
    agency: overrides.agency ?? 'Department of Defense',
    type: overrides.type ?? 'Federal',
    estTotalComp: overrides.estTotalComp ?? 120000,
    retirementImpact: overrides.retirementImpact ?? 'No change',
    matchPercent: overrides.matchPercent ?? 85,
  };
};

/**
 * Default empty filters (no filtering applied).
 */
const emptyFilters: JobSearchFilters = {
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

// ============================================================================
// TEST SUITE: Missing Fields Behavior
// ============================================================================

describe('filterJobs - missing fields handling', function () {
  /**
   * TRIPWIRE: Jobs with missing optional fields should still be processed.
   * Bug pattern: Accessing undefined properties without guards causes crashes.
   */
  it('should handle jobs with missing optional fields without throwing', function () {
    const jobWithMinimalFields = {
      id: 1,
      role: 'Analyst',
      series: '',
      grade: '',
      location: '',
      agency: '',
      type: 'Federal',
      estTotalComp: 0,
      retirementImpact: '',
      matchPercent: 0,
    };

    expect(function () {
      filterJobs([jobWithMinimalFields], emptyFilters);
    }).not.toThrow();
  });

  /**
   * TRIPWIRE: When a filter is set but the job lacks that field,
   * the behavior should be consistent (exclude, not crash).
   */
  it('should exclude jobs when filter is set but job lacks the field', function () {
    const jobWithoutLocation = createTestJob({ location: '' });
    const filtersWithLocation = Object.assign({}, emptyFilters, { location: 'dc' });

    const result = filterJobs([jobWithoutLocation], filtersWithLocation);

    // Should exclude the job, not crash
    expect(result.jobs).toHaveLength(0);
  });

  /**
   * TRIPWIRE: filterJobs should always return a valid result structure.
   */
  it('should return valid result structure even with empty input', function () {
    const result = filterJobs([], emptyFilters);

    expect(result).toHaveProperty('jobs');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.jobs)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(typeof result.total).toBe('number');
  });
});

// ============================================================================
// TEST SUITE: Empty Filter Arrays
// ============================================================================

describe('filterJobs - empty filter arrays', function () {
  /**
   * TRIPWIRE: Empty array filters should match ALL jobs, not NO jobs.
   * Bug pattern: Checking `array.includes(value)` when array is empty returns false.
   */
  it('should match all jobs when filter arrays are empty', function () {
    const jobs = [
      createTestJob({ id: 1, role: 'Analyst' }),
      createTestJob({ id: 2, role: 'Manager' }),
      createTestJob({ id: 3, role: 'Specialist' }),
    ];

    const filtersWithEmptyArrays = Object.assign({}, emptyFilters, {
      seriesCodes: [],
      appointmentTypes: [],
      workSchedules: [],
    });

    const result = filterJobs(jobs, filtersWithEmptyArrays);

    // Empty arrays = no filter = all jobs match
    expect(result.jobs).toHaveLength(3);
    expect(result.total).toBe(3);
  });
});

// ============================================================================
// TEST SUITE: Grade Parsing Edge Cases
// ============================================================================

describe('parseGradeLevel', function () {
  /**
   * TRIPWIRE: Various grade string formats should parse correctly.
   * Bug pattern: Regex doesn't handle all format variations.
   */
  it('should parse standard GS-XX format', function () {
    expect(parseGradeLevel('GS-14')).toBe(14);
    expect(parseGradeLevel('GS-07')).toBe(7);
    expect(parseGradeLevel('GS-15')).toBe(15);
  });

  it('should parse lowercase gs format', function () {
    expect(parseGradeLevel('gs-13')).toBe(13);
    expect(parseGradeLevel('gs14')).toBe(14);
  });

  it('should parse WG (Wage Grade) format', function () {
    expect(parseGradeLevel('WG-10')).toBe(10);
    expect(parseGradeLevel('wg-08')).toBe(8);
  });

  /**
   * TRIPWIRE: Non-numeric grade strings should return null, not NaN.
   * Bug pattern: parseInt on non-numeric string returns NaN.
   */
  it('should return null for unparseable grades', function () {
    expect(parseGradeLevel('')).toBeNull();
    expect(parseGradeLevel('SES')).toBeNull();
    expect(parseGradeLevel('Executive')).toBeNull();
  });

  it('should not return NaN', function () {
    const result = parseGradeLevel('invalid');
    expect(result).not.toBeNaN();
    expect(result).toBeNull();
  });
});

// ============================================================================
// TEST SUITE: Location Matching
// ============================================================================

describe('matchesLocation', function () {
  /**
   * TRIPWIRE: State code shortcuts should match full location strings.
   */
  it('should match DC state code to Washington, DC', function () {
    expect(matchesLocation('Washington, DC', 'dc')).toBe(true);
  });

  it('should match remote filter to Remote locations', function () {
    expect(matchesLocation('Remote', 'remote')).toBe(true);
    expect(matchesLocation('Anywhere (Remote)', 'remote')).toBe(true);
  });

  /**
   * TRIPWIRE: Null filter should match all locations.
   */
  it('should match all when filter is null', function () {
    expect(matchesLocation('Washington, DC', null)).toBe(true);
    expect(matchesLocation('Remote', null)).toBe(true);
    expect(matchesLocation('San Antonio, TX', null)).toBe(true);
  });

  /**
   * TRIPWIRE: Empty location string should not match when filter is set.
   */
  it('should not match empty location when filter is set', function () {
    expect(matchesLocation('', 'dc')).toBe(false);
  });
});

// ============================================================================
// TEST SUITE: Grade Band Matching
// ============================================================================

describe('matchesGradeBand', function () {
  /**
   * TRIPWIRE: Grade band filter should use numeric comparison.
   */
  it('should match same grade level regardless of format', function () {
    expect(matchesGradeBand('GS-14', 'gs14')).toBe(true);
    expect(matchesGradeBand('GS-14', 'GS-14')).toBe(true);
    expect(matchesGradeBand('gs-14', 'GS14')).toBe(true);
  });

  it('should not match different grade levels', function () {
    expect(matchesGradeBand('GS-14', 'gs13')).toBe(false);
    expect(matchesGradeBand('GS-12', 'gs15')).toBe(false);
  });

  /**
   * TRIPWIRE: Null filter should match all grades.
   */
  it('should match all when filter is null', function () {
    expect(matchesGradeBand('GS-14', null)).toBe(true);
    expect(matchesGradeBand('GS-07', null)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: Text Matching
// ============================================================================

describe('matchesText', function () {
  /**
   * TRIPWIRE: Case-insensitive matching should work.
   */
  it('should match case-insensitively', function () {
    expect(matchesText('Program Analyst', 'analyst')).toBe(true);
    expect(matchesText('Program Analyst', 'ANALYST')).toBe(true);
    expect(matchesText('Program Analyst', 'Analyst')).toBe(true);
  });

  /**
   * TRIPWIRE: Empty query should match everything.
   */
  it('should match all when query is empty', function () {
    expect(matchesText('Anything', '')).toBe(true);
    expect(matchesText('', '')).toBe(true);
  });

  /**
   * TRIPWIRE: Empty field should not match non-empty query.
   */
  it('should not match when field is empty but query is not', function () {
    expect(matchesText('', 'analyst')).toBe(false);
  });
});

// ============================================================================
// TEST SUITE: matchesAny Helper
// ============================================================================

describe('matchesAny', function () {
  /**
   * TRIPWIRE: Empty allowed array should match all.
   */
  it('should match all when allowedValues is empty', function () {
    expect(matchesAny('permanent', [])).toBe(true);
    expect(matchesAny('anything', [])).toBe(true);
  });

  /**
   * TRIPWIRE: Undefined field value should not match when filter is set.
   */
  it('should not match when field is undefined and filter is set', function () {
    expect(matchesAny(undefined, ['permanent'])).toBe(false);
  });

  it('should match when field value is in allowed array', function () {
    expect(matchesAny('permanent', ['permanent', 'term'])).toBe(true);
    expect(matchesAny('term', ['permanent', 'term'])).toBe(true);
  });

  it('should not match when field value is not in allowed array', function () {
    expect(matchesAny('temporary', ['permanent', 'term'])).toBe(false);
  });
});

// ============================================================================
// TEST SUITE: Full Filter Integration
// ============================================================================

describe('filterJobs - integration', function () {
  /**
   * TRIPWIRE: Multiple filters should work together (AND logic).
   */
  it('should apply multiple filters with AND logic', function () {
    const jobs = [
      createTestJob({ id: 1, grade: 'GS-14', location: 'Washington, DC' }),
      createTestJob({ id: 2, grade: 'GS-13', location: 'Washington, DC' }),
      createTestJob({ id: 3, grade: 'GS-14', location: 'Remote' }),
    ];

    const filters = Object.assign({}, emptyFilters, {
      gradeBand: 'gs14',
      location: 'dc',
    });

    const result = filterJobs(jobs, filters);

    // Only job 1 matches both GS-14 AND DC
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].id).toBe(1);
  });

  /**
   * TRIPWIRE: Query should search across multiple fields.
   */
  it('should match query against role, agency, location, series', function () {
    const jobs = [
      createTestJob({ id: 1, role: 'Program Analyst', agency: 'DOD' }),
      createTestJob({ id: 2, role: 'Budget Specialist', agency: 'VA' }),
      createTestJob({ id: 3, role: 'HR Manager', agency: 'OPM' }),
    ];

    const filters = Object.assign({}, emptyFilters, { query: 'VA' });
    const result = filterJobs(jobs, filters);

    // Should match job 2 (agency is VA)
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].id).toBe(2);
  });
});
