import { describe, it, expect } from 'vitest';
import type { DashboardData } from '../DashboardScreen';
import { buildDashboardViewModel } from './buildDashboardViewModel';
import { mockDashboardData } from './mockDashboardData';
import { CAREER_READINESS } from '../../routes/routes';

function cloneMockData(): DashboardData {
  return JSON.parse(JSON.stringify(mockDashboardData)) as DashboardData;
}

describe('buildDashboardViewModel', function () {
  it('caps focus items at 3 when source has more than 3 candidates', function () {
    const data = cloneMockData();
    data.focusSmall.push({ title: 'Extra 1', description: 'd1', ctaLabel: 'Go 1' });
    data.focusSmall.push({ title: 'Extra 2', description: 'd2', ctaLabel: 'Go 2' });
    data.focusSmall.push({ title: 'Extra 3', description: 'd3', ctaLabel: 'Go 3' });

    const output = buildDashboardViewModel(data);

    expect(output.focus.length).toBe(3);
  });

  it('assigns non-empty actionRoute for each focus item', function () {
    const data = cloneMockData();
    const output = buildDashboardViewModel(data);

    expect(output.focus.length).toBeGreaterThan(0);
    for (let i = 0; i < output.focus.length; i++) {
      expect(output.focus[i].actionRoute).toBeTruthy();
      expect(output.focus[i].actionRoute.length).toBeGreaterThan(0);
    }
  });

  it('uses CAREER_READINESS route for focus-hero (Do now → Career Readiness)', function () {
    const data = cloneMockData();
    const output = buildDashboardViewModel(data);
    const hero = output.focus.find(function (f) { return f.id === 'focus-hero'; });
    expect(hero).toBeDefined();
    expect(hero != null ? hero.actionRoute : '').toBe(CAREER_READINESS);
  });

  it('caps tracks to top 3 and includes route per track', function () {
    const data = cloneMockData();
    const output = buildDashboardViewModel(data);

    expect(output.tracks.length).toBe(3);
    for (let i = 0; i < output.tracks.length; i++) {
      expect(output.tracks[i].route).toBeTruthy();
      expect(output.tracks[i].route.length).toBeGreaterThan(0);
    }
  });

  it('handles empty-style input safely with no throws and empty focus/signals', function () {
    const emptyData: DashboardData = {
      briefing: [],
      focusHero: null,
      focusSmall: [],
      savedJobs: [],
      applications: [],
      resume: {
        progressPercent: 0,
        checklist: [],
        openCtaLabel: '',
      },
      updatesSinceVisit: [],
      readinessDeltas: [],
      timelineEstimates: [],
      timelineDisclaimer: '',
      timelineMethodology: '',
      lastUpdated: '',
    };

    const output = buildDashboardViewModel(emptyData);

    expect(output.focus).toEqual([]);
    expect(output.signals).toEqual([]);
    expect(Array.isArray(output.tracks)).toBe(true);
  });
});
