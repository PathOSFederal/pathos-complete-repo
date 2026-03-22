/**
 * ============================================================================
 * LOCATION GUIDE DATA — Unit tests for filterLocationGuide (pure function)
 * ============================================================================
 *
 * High-signal: search "DMV" returns Washington, DC (DMV) or Washington, DC entry;
 * search by alias and label.
 */

import { describe, it, expect } from 'vitest';
import { filterLocationGuide, LOCATION_GUIDE_DATA } from './locationGuideData';

describe('filterLocationGuide', function () {
  describe('search by alias', function () {
    it('returns Washington DC entry when searching "DMV"', function () {
      const result = filterLocationGuide(LOCATION_GUIDE_DATA, 'DMV');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].label.indexOf('Washington') !== -1 && result[i].label.indexOf('DC') !== -1) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
    it('returns Washington DC entry when searching "NCR"', function () {
      const result = filterLocationGuide(LOCATION_GUIDE_DATA, 'NCR');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].label.indexOf('Washington') !== -1) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
    it('search is case-insensitive for alias', function () {
      const result = filterLocationGuide(LOCATION_GUIDE_DATA, 'dmv');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].label.indexOf('Washington') !== -1) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('search by label', function () {
    it('returns Remote when searching "Remote"', function () {
      const result = filterLocationGuide(LOCATION_GUIDE_DATA, 'Remote');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].label === 'Remote') {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('empty query', function () {
    it('returns all entries when query is empty', function () {
      const result = filterLocationGuide(LOCATION_GUIDE_DATA, '');
      expect(result.length).toBe(LOCATION_GUIDE_DATA.length);
    });
  });
});
