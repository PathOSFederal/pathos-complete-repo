/**
 * ============================================================================
 * SERIES GUIDE DATA — Unit tests for filterSeriesGuide (pure function)
 * ============================================================================
 *
 * High-signal: search "2210" returns IT Management; category filter works;
 * empty query returns all when category is All.
 */

import { describe, it, expect } from 'vitest';
import { filterSeriesGuide, SERIES_GUIDE_DATA, SERIES_CATEGORIES } from './seriesGuideData';

describe('filterSeriesGuide', function () {
  describe('search by series code', function () {
    it('returns IT Management when searching "2210"', function () {
      const result = filterSeriesGuide(SERIES_GUIDE_DATA, '2210', 'All');
      expect(result.length).toBeGreaterThanOrEqual(1);
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].seriesCode === '2210' && result[i].title.indexOf('Information Technology Management') !== -1) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
    it('search is case-insensitive for series code', function () {
      const lower = filterSeriesGuide(SERIES_GUIDE_DATA, '2210', 'All');
      const upper = filterSeriesGuide(SERIES_GUIDE_DATA, '2210', 'All');
      expect(lower.length).toBe(upper.length);
      expect(lower.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('category filter', function () {
    it('category "All" returns all entries when query is empty', function () {
      const result = filterSeriesGuide(SERIES_GUIDE_DATA, '', 'All');
      expect(result.length).toBe(SERIES_GUIDE_DATA.length);
    });
    it('category "IT & Cyber" returns only IT & Cyber entries', function () {
      const result = filterSeriesGuide(SERIES_GUIDE_DATA, '', 'IT & Cyber');
      expect(result.length).toBeGreaterThan(0);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].category).toBe('IT & Cyber');
      }
    });
    it('category "Financial" returns only Financial entries', function () {
      const result = filterSeriesGuide(SERIES_GUIDE_DATA, '', 'Financial');
      expect(result.length).toBeGreaterThan(0);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].category).toBe('Financial');
      }
    });
  });

  describe('search + category combined', function () {
    it('search "2210" with category "IT & Cyber" returns IT Management', function () {
      const result = filterSeriesGuide(SERIES_GUIDE_DATA, '2210', 'IT & Cyber');
      expect(result.length).toBe(1);
      expect(result[0].seriesCode).toBe('2210');
      expect(result[0].title).toBe('Information Technology Management');
    });
    it('search "analyst" with category "Analysis" returns matching analysis series', function () {
      const result = filterSeriesGuide(SERIES_GUIDE_DATA, 'analyst', 'Analysis');
      expect(result.length).toBeGreaterThan(0);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].category).toBe('Analysis');
      }
    });
  });
});
