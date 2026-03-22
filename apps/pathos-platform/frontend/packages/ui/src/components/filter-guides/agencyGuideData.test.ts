/**
 * ============================================================================
 * AGENCY GUIDE DATA — Unit tests for filterAgencyGuide (pure function)
 * ============================================================================
 *
 * High-signal: search "VA" returns Department of Veterans Affairs; search by
 * acronym and name; category filter works.
 */

import { describe, it, expect } from 'vitest';
import { filterAgencyGuide, AGENCY_GUIDE_DATA } from './agencyGuideData';

describe('filterAgencyGuide', function () {
  describe('search by alias', function () {
    it('returns Department of Veterans Affairs when searching "VA"', function () {
      const result = filterAgencyGuide(AGENCY_GUIDE_DATA, 'VA', 'All');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].name.indexOf('Veterans Affairs') !== -1) {
          found = true;
          expect(result[i].name).toBe('Department of Veterans Affairs');
          break;
        }
      }
      expect(found).toBe(true);
    });
    it('returns Department of Homeland Security when searching "DHS"', function () {
      const result = filterAgencyGuide(AGENCY_GUIDE_DATA, 'DHS', 'All');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].name.indexOf('Homeland Security') !== -1) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
    it('search is case-insensitive for alias', function () {
      const result = filterAgencyGuide(AGENCY_GUIDE_DATA, 'va', 'All');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].name === 'Department of Veterans Affairs') {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('search by name', function () {
    it('returns Veterans Affairs when searching "Veterans"', function () {
      const result = filterAgencyGuide(AGENCY_GUIDE_DATA, 'Veterans', 'All');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].name.indexOf('Veterans Affairs') !== -1) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('category filter', function () {
    it('category "All" returns all entries when query is empty', function () {
      const result = filterAgencyGuide(AGENCY_GUIDE_DATA, '', 'All');
      expect(result.length).toBe(AGENCY_GUIDE_DATA.length);
    });
    it('category "Cabinet" returns only Cabinet-tagged entries', function () {
      const result = filterAgencyGuide(AGENCY_GUIDE_DATA, '', 'Cabinet');
      expect(result.length).toBeGreaterThan(0);
      for (let i = 0; i < result.length; i++) {
        const tags = result[i].tags;
        expect(tags !== undefined && tags.indexOf('Cabinet') !== -1).toBe(true);
      }
    });
  });
});
