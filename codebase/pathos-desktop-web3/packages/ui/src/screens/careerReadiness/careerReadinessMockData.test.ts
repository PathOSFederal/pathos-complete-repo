/**
 * Career Readiness mock data tests: getCareerReadinessSummary and shared summary shape.
 * Ensures Dashboard and Career Readiness screen use the same score, label, next best action.
 */

import { describe, it, expect } from 'vitest';
import { getCareerReadinessSummary } from './careerReadinessMockData';

describe('getCareerReadinessSummary', function () {
  it('returns score and scoreMax matching CAREER_READINESS_MOCK', function () {
    const summary = getCareerReadinessSummary();
    expect(summary.score).toBe(74);
    expect(summary.scoreMax).toBe(100);
  });

  it('returns label (badgeLabel) from mock', function () {
    const summary = getCareerReadinessSummary();
    expect(summary.label).toBe('Competitive with improvements');
  });

  it('returns nextBestActionText from first action plan item', function () {
    const summary = getCareerReadinessSummary();
    expect(summary.nextBestActionText).toBe('Add 3 quantified accomplishments (+4)');
  });

  it('returns topGaps array with at least one gap', function () {
    const summary = getCareerReadinessSummary();
    expect(Array.isArray(summary.topGaps)).toBe(true);
    expect(summary.topGaps.length).toBeGreaterThan(0);
    expect(summary.topGaps[0].name).toBeTruthy();
  });
});
