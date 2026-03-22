/**
 * ============================================================================
 * MOCK MAPPER v1 - UNIT TESTS
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the mock data mapper. These tests verify that raw mock job
 * data (in the format from lib/mock/job-search.ts) is correctly mapped to
 * canonical JobCardModel and JobDetailModel formats.
 *
 * TEST STRATEGY:
 * 1. Fully populated payload → Should map cleanly with zero warnings
 * 2. Missing fields → Should add warnings and still produce usable output
 * 3. Garbage input → Should produce safe minimal output with warnings (no throws)
 *
 * HOW TO RUN:
 * This file is designed for Vitest or Jest. To set up:
 *
 * Vitest:
 * 1. npm install -D vitest @vitest/ui
 * 2. Add to package.json scripts: "test": "vitest"
 * 3. Run: pnpm test
 *
 * Jest:
 * 1. npm install -D jest @types/jest ts-jest
 * 2. Create jest.config.js
 * 3. Run: pnpm jest
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  mapMockJobToCard,
  mapMockJobToDetail,
  mapMockJobsToCards,
} from './v1Mapper';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * A fully populated mock job that matches our mock data format.
 * This represents the "happy path" where all fields are present.
 */
const fullyPopulatedMockJob = {
  id: 1,
  role: 'Program Analyst',
  series: '0343',
  grade: 'GS-14',
  location: 'Washington, DC',
  agency: 'Department of Defense',
  type: 'Federal',
  estTotalComp: 142500,
  retirementImpact: '+2 years',
  matchPercent: 94,
};

/**
 * A mock job with minimal fields (some required fields missing).
 */
const minimalMockJob = {
  id: 2,
  role: 'Budget Analyst',
  series: '0560',
  grade: 'GS-13',
  location: 'Remote',
  agency: 'VA',
  type: 'Federal',
  estTotalComp: 118000,
  retirementImpact: 'No change',
  matchPercent: 85,
};

/**
 * A remote job to test remote location handling.
 */
const remoteMockJob = {
  id: 3,
  role: 'IT Specialist',
  series: '2210',
  grade: 'GS-14',
  location: 'Remote',
  agency: 'DHS',
  type: 'Federal',
  estTotalComp: 150000,
  retirementImpact: '+1 year',
  matchPercent: 90,
};

// ============================================================================
// TEST SUITE: mapMockJobToCard
// ============================================================================

describe('mapMockJobToCard', function () {
  // --------------------------------------------------------------------------
  // TEST: Fully populated payload maps cleanly
  // --------------------------------------------------------------------------
  describe('with fully populated payload', function () {
    it('should map all fields correctly', function () {
      const result = mapMockJobToCard(fullyPopulatedMockJob);

      // Verify required fields
      expect(result.id).toBe('1');
      expect(result.title).toBe('Program Analyst');
      expect(result.source).toBe('mock');

      // Verify optional fields
      expect(result.seriesCode).toBe('0343');
      expect(result.gradeLevel).toBe('GS-14');
      expect(result.organizationName).toBe('Department of Defense');
      expect(result.locationDisplay).toBe('Washington, DC');
      expect(result.employmentType).toBe('Federal');
      expect(result.estimatedTotalComp).toBe(142500);
      expect(result.matchPercent).toBe(94);
      expect(result.retirementImpact).toBe('+2 years');
    });

    it('should have zero warnings for valid data', function () {
      const result = mapMockJobToCard(fullyPopulatedMockJob);

      // Zero warnings indicates clean mapping
      expect(result.diagnostics.warnings).toHaveLength(0);
    });

    it('should include correct diagnostics metadata', function () {
      const result = mapMockJobToCard(fullyPopulatedMockJob);

      expect(result.diagnostics.source).toBe('mock');
      expect(result.diagnostics.mapperVersion).toBe('mock-v1');
      expect(result.diagnostics.raw).toBe(fullyPopulatedMockJob);
      expect(result.diagnostics.fetchedAtISO).toBeDefined();
    });

    it('should compute appropriate tags', function () {
      const result = mapMockJobToCard(fullyPopulatedMockJob);

      // Should have grade tag
      expect(result.tags).toContain('GS-14');

      // Should have High Match tag (94% >= 90%)
      expect(result.tags).toContain('High Match');

      // Should NOT have Remote tag (location is DC)
      expect(result.tags).not.toContain('Remote');
    });

    it('should parse location correctly', function () {
      const result = mapMockJobToCard(fullyPopulatedMockJob);

      // Structured location should be parsed
      expect(result.location).toBeDefined();
      expect(result.location?.city).toBe('Washington');
      expect(result.location?.state).toBe('DC');
      expect(result.location?.country).toBe('US');
      expect(result.location?.isRemote).toBe(false);
    });

    it('should build pay range from estTotalComp', function () {
      const result = mapMockJobToCard(fullyPopulatedMockJob);

      expect(result.payRange).toBeDefined();
      expect(result.payRange?.min).toBeDefined();
      expect(result.payRange?.max).toBeDefined();
      expect(result.payRange?.currency).toBe('USD');
      expect(result.payRange?.payPlan).toBe('GS');
      expect(result.payRange?.displayText).toContain('$');
    });
  });

  // --------------------------------------------------------------------------
  // TEST: Remote location handling
  // --------------------------------------------------------------------------
  describe('with remote location', function () {
    it('should detect remote correctly', function () {
      const result = mapMockJobToCard(remoteMockJob);

      expect(result.location?.isRemote).toBe(true);
      expect(result.teleworkEligibility).toBe('Remote');
    });

    it('should add Remote tag', function () {
      const result = mapMockJobToCard(remoteMockJob);

      expect(result.tags).toContain('Remote');
    });
  });

  // --------------------------------------------------------------------------
  // TEST: Missing fields handling
  // --------------------------------------------------------------------------
  describe('with missing fields', function () {
    it('should handle missing title gracefully', function () {
      const jobWithoutTitle = { ...fullyPopulatedMockJob };
      delete (jobWithoutTitle as Record<string, unknown>).role;

      const result = mapMockJobToCard(jobWithoutTitle);

      // Should have a fallback title
      expect(result.title).toBeDefined();
      expect(result.title.length).toBeGreaterThan(0);

      // Should have warnings
      expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing location gracefully', function () {
      const jobWithoutLocation = { ...fullyPopulatedMockJob };
      delete (jobWithoutLocation as Record<string, unknown>).location;

      const result = mapMockJobToCard(jobWithoutLocation);

      // Should still produce a result
      expect(result.id).toBeDefined();
      expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing salary gracefully', function () {
      const jobWithoutSalary = { ...fullyPopulatedMockJob };
      delete (jobWithoutSalary as Record<string, unknown>).estTotalComp;

      const result = mapMockJobToCard(jobWithoutSalary);

      // Should have warnings about validation
      expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: Garbage input handling
  // --------------------------------------------------------------------------
  describe('with garbage input', function () {
    it('should handle null input without throwing', function () {
      expect(function () {
        mapMockJobToCard(null);
      }).not.toThrow();
    });

    it('should handle undefined input without throwing', function () {
      expect(function () {
        mapMockJobToCard(undefined);
      }).not.toThrow();
    });

    it('should handle empty object without throwing', function () {
      expect(function () {
        mapMockJobToCard({});
      }).not.toThrow();
    });

    it('should handle string input without throwing', function () {
      expect(function () {
        mapMockJobToCard('garbage');
      }).not.toThrow();
    });

    it('should handle array input without throwing', function () {
      expect(function () {
        mapMockJobToCard([1, 2, 3]);
      }).not.toThrow();
    });

    it('should produce safe minimal output for garbage', function () {
      const result = mapMockJobToCard({});

      // Should have required fields with fallbacks
      expect(result.id).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.source).toBe('mock');
      expect(Array.isArray(result.tags)).toBe(true);

      // Should have many warnings
      expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
    });

    it('should preserve raw data in diagnostics for garbage', function () {
      const garbage = { foo: 'bar', baz: 123 };
      const result = mapMockJobToCard(garbage);

      // Raw should be preserved for debugging
      expect(result.diagnostics.raw).toEqual(garbage);
    });
  });
});

// ============================================================================
// TEST SUITE: mapMockJobToDetail
// ============================================================================

describe('mapMockJobToDetail', function () {
  it('should include all card fields plus detail fields', function () {
    const result = mapMockJobToDetail(fullyPopulatedMockJob);

    // Card fields should be present
    expect(result.id).toBe('1');
    expect(result.title).toBe('Program Analyst');

    // Detail-specific fields should be present
    expect(result.duties).toBeDefined();
    expect(Array.isArray(result.duties)).toBe(true);
    expect(result.duties!.length).toBeGreaterThan(0);

    expect(result.qualificationsMinimum).toBeDefined();
    expect(result.ksas).toBeDefined();
    expect(result.hiringPaths).toBeDefined();
    expect(result.howToApply).toBeDefined();
  });

  it('should add warning about generated detail fields', function () {
    const result = mapMockJobToDetail(fullyPopulatedMockJob);

    // Should note that detail fields are placeholders
    const hasPlaceholderWarning = result.diagnostics.warnings.some(function (w) {
      return w.toLowerCase().indexOf('placeholder') >= 0 ||
             w.toLowerCase().indexOf('generated') >= 0;
    });

    expect(hasPlaceholderWarning).toBe(true);
  });

  it('should generate dates for mock data', function () {
    const result = mapMockJobToDetail(fullyPopulatedMockJob);

    expect(result.openDate).toBeDefined();
    expect(result.closeDate).toBeDefined();

    // Dates should be valid ISO strings
    expect(function () {
      new Date(result.openDate!);
    }).not.toThrow();
    expect(function () {
      new Date(result.closeDate!);
    }).not.toThrow();
  });

  it('should handle garbage input without throwing', function () {
    expect(function () {
      mapMockJobToDetail(null);
    }).not.toThrow();

    expect(function () {
      mapMockJobToDetail({});
    }).not.toThrow();
  });
});

// ============================================================================
// TEST SUITE: mapMockJobsToCards (batch mapping)
// ============================================================================

describe('mapMockJobsToCards', function () {
  it('should map multiple jobs correctly', function () {
    const jobs = [fullyPopulatedMockJob, minimalMockJob, remoteMockJob];
    const results = mapMockJobsToCards(jobs);

    expect(results).toHaveLength(3);
    expect(results[0].id).toBe('1');
    expect(results[1].id).toBe('2');
    expect(results[2].id).toBe('3');
  });

  it('should handle mixed valid and invalid jobs', function () {
    const jobs = [
      fullyPopulatedMockJob,
      {}, // Invalid
      remoteMockJob,
    ];

    const results = mapMockJobsToCards(jobs);

    // All should be processed (no throws)
    expect(results).toHaveLength(3);

    // First and third should be clean
    expect(results[0].diagnostics.warnings).toHaveLength(0);
    expect(results[2].diagnostics.warnings).toHaveLength(0);

    // Second should have warnings
    expect(results[1].diagnostics.warnings.length).toBeGreaterThan(0);
  });

  it('should handle empty array', function () {
    const results = mapMockJobsToCards([]);
    expect(results).toHaveLength(0);
  });
});
