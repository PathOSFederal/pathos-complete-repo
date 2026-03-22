/**
 * ============================================================================
 * USAJOBS MAPPER v1 - UNIT TESTS
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the USAJOBS-like data mapper. These tests verify that raw
 * USAJOBS API payloads are correctly mapped to canonical JobCardModel and
 * JobDetailModel formats.
 *
 * TEST STRATEGY:
 * 1. Fully populated payload → Should map cleanly with zero warnings
 * 2. Missing fields → Should add warnings and still produce usable output
 * 3. Garbage input → Should produce safe minimal output with warnings (no throws)
 *
 * NOTE:
 * These tests use mock USAJOBS-like payloads since we don't have real
 * USAJOBS integration in Tier 1. The structure matches the USAJOBS API
 * documentation for compatibility when Phase 2 integration is added.
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  mapUSAJobsToCard,
  mapUSAJobsToDetail,
  mapUSAJobsToCards,
} from './v1Mapper';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * A fully populated USAJOBS-like payload.
 * This structure mimics the real USAJOBS API response format.
 */
const fullyPopulatedUSAJobsPayload = {
  MatchedObjectId: '123456789',
  PositionTitle: 'Program Analyst',
  PositionLocationDisplay: 'Washington, DC',
  PositionLocation: [
    {
      LocationName: 'Washington, District of Columbia',
      CityName: 'Washington',
      CountryCode: 'United States',
      CountrySubDivisionCode: 'District of Columbia',
    },
  ],
  OrganizationName: 'Department of Defense',
  DepartmentName: 'Office of the Secretary',
  JobCategory: [
    {
      Name: 'Management and Program Analysis',
      Code: '0343',
    },
  ],
  JobGrade: [
    {
      Code: 'GS-14',
    },
  ],
  PositionRemuneration: [
    {
      MinimumRange: '122198',
      MaximumRange: '158860',
      RateIntervalCode: 'PA',
    },
  ],
  PositionSchedule: [
    {
      Name: 'Full Time',
      Code: 'F',
    },
  ],
  PositionOfferingType: [
    {
      Name: 'Permanent',
      Code: 'P',
    },
  ],
  PositionID: 'DOD-12345-2024',
  PositionURI: 'https://www.usajobs.gov/job/123456789',
  ApplyURI: ['https://www.usajobs.gov/apply/123456789'],
  PublicationStartDate: '2024-11-15',
  ApplicationCloseDate: '2024-12-15',
  TeleworkEligible: true,
  UserArea: {
    Details: {
      JobSummary: 'This position serves as a Program Analyst...',
      MajorDuties: [
        'Analyze organizational processes',
        'Prepare briefings and reports',
      ],
      Education: "Master's degree or equivalent",
      Qualifications: '1 year specialized experience at GS-13',
      SecurityClearance: 'Secret',
      TravelRequired: 'Occasional travel - 25%',
      HiringPath: ['fed-competitive', 'veterans'],
      PromotionPotential: 'GS-15',
      AgencyContactEmail: 'hr@dod.gov',
    },
  },
};

/**
 * A minimal USAJOBS payload with only basic fields.
 */
const minimalUSAJobsPayload = {
  MatchedObjectId: '987654321',
  PositionTitle: 'IT Specialist',
  PositionLocationDisplay: 'Remote',
  OrganizationName: 'Department of Homeland Security',
};

/**
 * A USAJOBS payload with negotiable salary.
 */
const negotiableSalaryPayload = {
  MatchedObjectId: '111222333',
  PositionTitle: 'Senior Executive',
  PositionLocationDisplay: 'Multiple Locations',
  OrganizationName: 'Executive Office',
  JobGrade: [{ Code: 'SES' }],
  PositionRemuneration: [
    {
      MinimumRange: 'Negotiable',
      MaximumRange: 'Negotiable',
    },
  ],
};

// ============================================================================
// TEST SUITE: mapUSAJobsToCard
// ============================================================================

describe('mapUSAJobsToCard', function () {
  // --------------------------------------------------------------------------
  // TEST: Fully populated payload maps cleanly
  // --------------------------------------------------------------------------
  describe('with fully populated payload', function () {
    it('should map all fields correctly', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      // Verify required fields
      expect(result.id).toBe('123456789');
      expect(result.title).toBe('Program Analyst');
      expect(result.source).toBe('usajobs');

      // Verify optional fields
      expect(result.organizationName).toBe('Department of Defense');
      expect(result.departmentName).toBe('Office of the Secretary');
      expect(result.seriesCode).toBe('0343');
      expect(result.gradeLevel).toBe('GS-14');
      expect(result.locationDisplay).toBe('Washington, DC');
    });

    it('should have zero warnings for valid data', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      // Clean mapping should have zero warnings
      expect(result.diagnostics.warnings).toHaveLength(0);
    });

    it('should include correct diagnostics metadata', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      expect(result.diagnostics.source).toBe('usajobs');
      expect(result.diagnostics.mapperVersion).toBe('usajobs-v1');
      expect(result.diagnostics.raw).toBe(fullyPopulatedUSAJobsPayload);
      expect(result.diagnostics.fetchedAtISO).toBeDefined();
    });

    it('should parse salary range correctly', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      expect(result.payRange).toBeDefined();
      expect(result.payRange?.min).toBe(122198);
      expect(result.payRange?.max).toBe(158860);
      expect(result.payRange?.currency).toBe('USD');
      expect(result.payRange?.displayText).toContain('$122,198');
      expect(result.payRange?.displayText).toContain('$158,860');
    });

    it('should parse structured location', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      expect(result.location).toBeDefined();
      expect(result.location?.city).toBe('Washington');
      expect(result.location?.state).toBe('DC');
      expect(result.location?.isRemote).toBe(false);
    });

    it('should detect telework eligibility', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      expect(result.teleworkEligibility).toBe('Telework Eligible');
    });

    it('should compute appropriate tags', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      // Should have grade tag
      expect(result.tags).toContain('GS-14');

      // Should have telework tag (TeleworkEligible: true)
      expect(result.tags).toContain('Remote');
    });

    it('should extract dates', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      expect(result.openDate).toBe('2024-11-15');
      expect(result.closeDate).toBe('2024-12-15');
    });

    it('should extract URLs', function () {
      const result = mapUSAJobsToCard(fullyPopulatedUSAJobsPayload);

      expect(result.postingUrl).toBe('https://www.usajobs.gov/job/123456789');
      expect(result.applyUrl).toBe('https://www.usajobs.gov/apply/123456789');
    });
  });

  // --------------------------------------------------------------------------
  // TEST: Minimal payload handling
  // --------------------------------------------------------------------------
  describe('with minimal payload', function () {
    it('should map available fields', function () {
      const result = mapUSAJobsToCard(minimalUSAJobsPayload);

      expect(result.id).toBe('987654321');
      expect(result.title).toBe('IT Specialist');
      expect(result.organizationName).toBe('Department of Homeland Security');
    });

    it('should detect remote location', function () {
      const result = mapUSAJobsToCard(minimalUSAJobsPayload);

      expect(result.location?.isRemote).toBe(true);
      expect(result.tags).toContain('Remote');
    });

    it('should have warnings for missing salary', function () {
      const result = mapUSAJobsToCard(minimalUSAJobsPayload);

      const hasSalaryWarning = result.diagnostics.warnings.some(function (w) {
        return w.toLowerCase().indexOf('salary') >= 0 ||
               w.toLowerCase().indexOf('remuneration') >= 0;
      });

      expect(hasSalaryWarning).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: Negotiable salary handling
  // --------------------------------------------------------------------------
  describe('with negotiable salary', function () {
    it('should handle non-numeric salary values', function () {
      const result = mapUSAJobsToCard(negotiableSalaryPayload);

      // Should not throw
      expect(result.id).toBe('111222333');

      // Pay range should have warning
      expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: Garbage input handling
  // --------------------------------------------------------------------------
  describe('with garbage input', function () {
    it('should handle null input without throwing', function () {
      expect(function () {
        mapUSAJobsToCard(null);
      }).not.toThrow();
    });

    it('should handle undefined input without throwing', function () {
      expect(function () {
        mapUSAJobsToCard(undefined);
      }).not.toThrow();
    });

    it('should handle empty object without throwing', function () {
      expect(function () {
        mapUSAJobsToCard({});
      }).not.toThrow();
    });

    it('should handle string input without throwing', function () {
      expect(function () {
        mapUSAJobsToCard('garbage');
      }).not.toThrow();
    });

    it('should produce safe minimal output for garbage', function () {
      const result = mapUSAJobsToCard({});

      // Should have required fields with fallbacks
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Untitled Position');
      expect(result.source).toBe('usajobs');
      expect(Array.isArray(result.tags)).toBe(true);

      // Should have warnings
      expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
    });

    it('should preserve raw data in diagnostics', function () {
      const garbage = { foo: 'bar', baz: 123 };
      const result = mapUSAJobsToCard(garbage);

      expect(result.diagnostics.raw).toEqual(garbage);
    });
  });
});

// ============================================================================
// TEST SUITE: mapUSAJobsToDetail
// ============================================================================

describe('mapUSAJobsToDetail', function () {
  it('should include all card fields plus detail fields', function () {
    const result = mapUSAJobsToDetail(fullyPopulatedUSAJobsPayload);

    // Card fields should be present
    expect(result.id).toBe('123456789');
    expect(result.title).toBe('Program Analyst');

    // Detail-specific fields from UserArea
    expect(result.summary).toBe('This position serves as a Program Analyst...');
    expect(result.duties).toBeDefined();
    expect(result.duties).toContain('Analyze organizational processes');
    expect(result.qualificationsMinimum).toBe('1 year specialized experience at GS-13');
    expect(result.clearanceLevel).toBe('Secret');
    expect(result.travelRequirement).toBe('Occasional travel - 25%');
    expect(result.hiringPaths).toContain('fed-competitive');
    expect(result.promotionPotential).toBe('GS-15');
  });

  it('should extract contact information', function () {
    const result = mapUSAJobsToDetail(fullyPopulatedUSAJobsPayload);

    expect(result.contactEmail).toBe('hr@dod.gov');
  });

  it('should extract announcement number', function () {
    const result = mapUSAJobsToDetail(fullyPopulatedUSAJobsPayload);

    expect(result.announcementNumber).toBe('DOD-12345-2024');
  });

  it('should handle garbage input without throwing', function () {
    expect(function () {
      mapUSAJobsToDetail(null);
    }).not.toThrow();

    expect(function () {
      mapUSAJobsToDetail({});
    }).not.toThrow();
  });
});

// ============================================================================
// TEST SUITE: mapUSAJobsToCards (batch mapping)
// ============================================================================

describe('mapUSAJobsToCards', function () {
  it('should map multiple payloads correctly', function () {
    const payloads = [
      fullyPopulatedUSAJobsPayload,
      minimalUSAJobsPayload,
    ];

    const results = mapUSAJobsToCards(payloads);

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('123456789');
    expect(results[1].id).toBe('987654321');
  });

  it('should handle mixed valid and invalid payloads', function () {
    const payloads = [
      fullyPopulatedUSAJobsPayload,
      {}, // Invalid
      minimalUSAJobsPayload,
    ];

    const results = mapUSAJobsToCards(payloads);

    // All should be processed
    expect(results).toHaveLength(3);

    // First should be clean
    expect(results[0].diagnostics.warnings).toHaveLength(0);

    // Second should have warnings
    expect(results[1].diagnostics.warnings.length).toBeGreaterThan(0);
  });

  it('should handle empty array', function () {
    const results = mapUSAJobsToCards([]);
    expect(results).toHaveLength(0);
  });
});
