/**
 * Fit scoring tests: buildFitAssessment returns stars in 1–5, reasons length 2–3,
 * primaryBlocker computed for target role vs job (series mismatch, grade gap, no target).
 */

import { describe, it, expect } from 'vitest';
import {
  buildFitAssessment,
  fitScoreToStars,
  primaryBlocker,
  effortEstimate,
} from './fitScoring';
import type { TargetRoleInput } from './fitScoring';
import type { JobWithOverview } from '../screens/jobSearchMockJobs';

/** Minimal job with series in summary and grade for blocker tests. */
const job2210: JobWithOverview = {
  id: 'test-1',
  title: 'IT Specialist',
  agency: 'DHS',
  location: 'Washington, DC',
  grade: 'GS-12',
  savedAt: '2026-01-01T00:00:00.000Z',
  url: '',
  summary: 'Series 2210. Cybersecurity.',
  overview: {},
};

const job0343: JobWithOverview = {
  id: 'test-2',
  title: 'Management Analyst',
  agency: 'VA',
  location: 'Remote',
  grade: 'GS-14',
  savedAt: '2026-01-01T00:00:00.000Z',
  url: '',
  summary: 'Series 0343. Program management.',
  overview: {},
};

describe('fitScoring snapshot builder', function () {
  describe('buildFitAssessment', function () {
    it('returns stars in 1–5 range', function () {
      const fit = buildFitAssessment({
        job: job2210,
        targetRole: { series: '2210', gsTarget: 'GS-12', location: 'Washington, DC', remotePreference: '' },
        profile: { skillsKeywords: ['cybersecurity'] },
      });
      const stars = fitScoreToStars(fit.score);
      expect(stars).toBeGreaterThanOrEqual(1);
      expect(stars).toBeLessThanOrEqual(5);
    });

    it('returns reasons array length 2–3 when inputs present', function () {
      const fit = buildFitAssessment({
        job: job2210,
        targetRole: { series: '2210', gsTarget: 'GS-12', location: 'Washington, DC', remotePreference: '' },
        profile: { skillsKeywords: ['cybersecurity'] },
      });
      expect(fit.reasons.length).toBeGreaterThanOrEqual(2);
      expect(fit.reasons.length).toBeLessThanOrEqual(3);
    });

    it('returns single reason when target role not set', function () {
      const fit = buildFitAssessment({
        job: job2210,
        targetRole: {},
        profile: {},
      });
      expect(fit.reasons.length).toBeGreaterThanOrEqual(1);
      expect(fit.reasons[0].indexOf('Set target role') !== -1 || fit.reasons[0].indexOf('target') !== -1).toBe(true);
    });
  });

  describe('primaryBlocker', function () {
    it('returns Set a Target Role when target has no series and no grade', function () {
      const fit = buildFitAssessment({ job: job2210, targetRole: {}, profile: {} });
      const blocker = primaryBlocker(job2210, {}, fit);
      expect(blocker).toBe('Set a Target Role to get alignment signals.');
    });

    it('returns series mismatch when target series differs from job series', function () {
      const fit = buildFitAssessment({
        job: job0343,
        targetRole: { series: '2210', gsTarget: 'GS-14' },
        profile: {},
      });
      const blocker = primaryBlocker(job0343, { series: '2210', gsTarget: 'GS-14' }, fit);
      expect(blocker.indexOf('2210') !== -1).toBe(true);
      expect(blocker.indexOf('0343') !== -1).toBe(true);
      expect(blocker.indexOf('mismatch') !== -1 || blocker.indexOf('Target series') !== -1).toBe(true);
    });

    it('returns grade gap when target grade differs from job grade', function () {
      const fit = buildFitAssessment({
        job: job2210,
        targetRole: { series: '2210', gsTarget: 'GS-14' },
        profile: {},
      });
      const blocker = primaryBlocker(job2210, { series: '2210', gsTarget: 'GS-14' }, fit);
      expect(blocker.indexOf('Grade gap') !== -1 || blocker.indexOf('GS-12') !== -1 || blocker.indexOf('GS-14') !== -1).toBe(true);
    });

    it('returns empty string when series and grade match', function () {
      const fit = buildFitAssessment({
        job: job2210,
        targetRole: { series: '2210', gsTarget: 'GS-12' },
        profile: {},
      });
      const blocker = primaryBlocker(job2210, { series: '2210', gsTarget: 'GS-12' }, fit);
      expect(blocker).toBe('');
    });
  });

  describe('fitScoreToStars', function () {
    it('maps 0–19 to 1 star', function () {
      expect(fitScoreToStars(0)).toBe(1);
      expect(fitScoreToStars(19)).toBe(1);
    });
    it('maps 80–100 to 5 stars', function () {
      expect(fitScoreToStars(80)).toBe(5);
      expect(fitScoreToStars(100)).toBe(5);
    });
    it('maps 40–59 to 3 stars', function () {
      expect(fitScoreToStars(40)).toBe(3);
      expect(fitScoreToStars(59)).toBe(3);
    });
  });

  describe('effortEstimate', function () {
    it('returns Low or Medium or High', function () {
      const fit = buildFitAssessment({
        job: job2210,
        targetRole: { series: '2210', gsTarget: 'GS-12' },
        profile: {},
      });
      const effort = effortEstimate(fit, { specialized: 2, skills: 3, documents: 2 });
      expect(effort === 'Low' || effort === 'Medium' || effort === 'High').toBe(true);
    });
  });
});
