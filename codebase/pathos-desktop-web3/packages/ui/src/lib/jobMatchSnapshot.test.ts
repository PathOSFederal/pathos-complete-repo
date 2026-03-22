/**
 * Job Match Snapshot v1 tests: buildJobDemandProfile, buildJobMatchSnapshot,
 * deterministic rules (evidenceHeavy, keywordHeavy, leadershipHeavy), primary blocker.
 */

import { describe, it, expect } from 'vitest';
import {
  buildJobDemandProfile,
  buildJobMatchSnapshot,
  buildReadinessInputFromMock,
  buildDimensionBriefingPayload,
  isMockJob,
  getDemoTargetMatchScore,
  type ReadinessInput,
  type JobInputForSnapshot,
  type JobMatchDimension,
  DIMENSION_KEYS,
} from './jobMatchSnapshot';

describe('isMockJob', function () {
  it('returns true for id starting with mock-js-', function () {
    expect(isMockJob({ id: 'mock-js-1' })).toBe(true);
    expect(isMockJob({ id: 'mock-js-36' })).toBe(true);
  });
  it('returns false for non-mock ids', function () {
    expect(isMockJob({ id: 'usa-123' })).toBe(false);
    expect(isMockJob({ id: 'job-1' })).toBe(false);
  });
});

describe('getDemoTargetMatchScore', function () {
  it('returns deterministic score from cycle by job index', function () {
    expect(getDemoTargetMatchScore('mock-js-1')).toBe(86);
    expect(getDemoTargetMatchScore('mock-js-2')).toBe(78);
    expect(getDemoTargetMatchScore('mock-js-5')).toBe(54);
    expect(getDemoTargetMatchScore('mock-js-6')).toBe(46);
    expect(getDemoTargetMatchScore('mock-js-7')).toBe(86);
  });
});

describe('buildReadinessInputFromMock', function () {
  it('maps radar spoke names to dimension scores including Specialized Exp', function () {
    const mock = {
      score: 74,
      scoreMax: 100,
      badgeLabel: 'Competitive',
      radarSpokes: [
        { name: 'Target Alignment', value: 68 },
        { name: 'Specialized Exp', value: 72 },
        { name: 'Resume Evidence', value: 58 },
        { name: 'Keywords Coverage', value: 75 },
        { name: 'Leadership & Scope', value: 65 },
      ],
      gaps: [{ name: 'Resume Evidence', impact: 6 }],
      actionPlanItems: [{ label: 'Add quantified accomplishments', impact: 4 }],
    };
    const input = buildReadinessInputFromMock(mock);
    expect(input.overallScore).toBe(74);
    expect(input.overallMax).toBe(100);
    expect(input.dimensionScores['Specialized Experience']).toBe(72);
    expect(input.dimensionScores['Resume Evidence']).toBe(58);
    expect(input.topGaps.length).toBe(1);
    expect(input.topGaps[0].name).toBe('Resume Evidence');
    expect(input.topGaps[0].impact).toBe(6);
  });
});

describe('buildJobDemandProfile', function () {
  it('returns equal baseline weights when job has no strong signals', function () {
    const job: JobInputForSnapshot = {
      id: 'mock-js-2',
      title: 'Management Analyst',
      summary: 'Short.',
    };
    const profile = buildJobDemandProfile(job);
    expect(profile.weights.targetAlignment).toBeGreaterThan(0);
    expect(profile.weights.specializedExperience).toBeGreaterThan(0);
    expect(profile.weights.resumeEvidence).toBeGreaterThan(0);
    expect(profile.weights.keywordsCoverage).toBeGreaterThan(0);
    expect(profile.weights.leadershipScope).toBeGreaterThan(0);
    const sum =
      profile.weights.targetAlignment +
      profile.weights.specializedExperience +
      profile.weights.resumeEvidence +
      profile.weights.keywordsCoverage +
      profile.weights.leadershipScope;
    expect(sum).toBeCloseTo(1, 5);
  });

  it('sets leadershipHeavy when job text contains leadership cue word', function () {
    const job: JobInputForSnapshot = {
      id: 'test-1',
      title: 'Program Manager',
      summary: 'Lead stakeholder engagement and manage program strategy.',
    };
    const profile = buildJobDemandProfile(job);
    expect(profile.flags.leadershipHeavy).toBe(true);
  });
});

describe('buildJobMatchSnapshot', function () {
  const baseReadiness: ReadinessInput = buildReadinessInputFromMock({
    score: 74,
    scoreMax: 100,
    badgeLabel: 'Competitive',
    radarSpokes: [
      { name: 'Target Alignment', value: 68 },
      { name: 'Specialized Exp', value: 72 },
      { name: 'Resume Evidence', value: 58 },
      { name: 'Keywords Coverage', value: 75 },
      { name: 'Leadership & Scope', value: 65 },
    ],
    gaps: [
      { name: 'Resume Evidence', impact: 6 },
      { name: 'Target Alignment', impact: 4 },
    ],
    actionPlanItems: [
      { label: 'Add 3 quantified accomplishments', impact: 4 },
      { label: 'Set a primary target role', impact: 4 },
    ],
  });

  it('returns exactly 5 dimensions in consistent order', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-2', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    expect(snapshot.dimensions.length).toBe(5);
    for (let i = 0; i < DIMENSION_KEYS.length; i++) {
      expect(snapshot.dimensions[i].key).toBe(DIMENSION_KEYS[i]);
      expect(snapshot.dimensions[i].label).toBe(DIMENSION_KEYS[i]);
    }
  });

  it('includes overallReadinessScore and overallReadinessMax', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-2', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    expect(snapshot.overallReadinessScore).toBe(74);
    expect(snapshot.overallReadinessMax).toBe(100);
  });

  it('primaryBlocker includes a dimension label when a dimension is Weak', function () {
    const job: JobInputForSnapshot = { id: 'mock-1', title: 'IT Specialist', summary: 'Long summary. '.repeat(30) };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    const blocker = snapshot.primaryBlocker;
    const hasDimension =
      blocker.indexOf('Resume Evidence') !== -1 ||
      blocker.indexOf('Target Alignment') !== -1 ||
      blocker.indexOf('Leadership & Scope') !== -1 ||
      blocker.indexOf('Keywords Coverage') !== -1 ||
      blocker.indexOf('Specialized Experience') !== -1;
    expect(hasDimension || blocker.indexOf('Missing readiness') !== -1 || blocker.indexOf('None detected') !== -1).toBe(true);
  });

  it('matchLevel is Strong or Moderate or Stretch from overallMatchScore', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-2', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    expect(['Strong', 'Moderate', 'Stretch'].indexOf(snapshot.matchLevel) !== -1).toBe(true);
    expect(snapshot.overallMatchScore).toBeGreaterThanOrEqual(0);
    expect(snapshot.overallMatchScore).toBeLessThanOrEqual(100);
  });

  it('topJobRelevantGap has label and impactPoints', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-2', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    expect(snapshot.topJobRelevantGap.label).toBeDefined();
    expect(snapshot.topJobRelevantGap.label.length).toBeGreaterThan(0);
    expect(typeof snapshot.topJobRelevantGap.impactPoints).toBe('number');
  });

  it('audit has rulesFired array and localOnly true', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-2', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    expect(Array.isArray(snapshot.audit.rulesFired)).toBe(true);
    expect(snapshot.audit.localOnly).toBe(true);
  });

  it('for mock jobs audit includes demoMatchVariety and demoTargetScore', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-1', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    expect(snapshot.audit.rulesFired.indexOf('demoMatchVariety') !== -1).toBe(true);
    expect(snapshot.audit.rulesFired.some(function (r) { return r.indexOf('demoTargetScore:') === 0; })).toBe(true);
  });
});

describe('buildDimensionBriefingPayload', function () {
  const baseReadiness: ReadinessInput = buildReadinessInputFromMock({
    score: 74,
    scoreMax: 100,
    badgeLabel: 'Competitive',
    radarSpokes: [
      { name: 'Target Alignment', value: 68 },
      { name: 'Specialized Exp', value: 72 },
      { name: 'Resume Evidence', value: 58 },
      { name: 'Keywords Coverage', value: 75 },
      { name: 'Leadership & Scope', value: 65 },
    ],
    gaps: [{ name: 'Resume Evidence', impact: 6 }],
    actionPlanItems: [{ label: 'Add quantified accomplishments', impact: 4 }],
  });

  it('returns payload with title containing dimension label and sourceLabel Job Search', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-2', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    const dim = snapshot.dimensions[2];
    if (dim === undefined) throw new Error('expected Resume Evidence dimension');
    expect(dim.label).toBe('Resume Evidence');
    const payload = buildDimensionBriefingPayload(dim, snapshot, '/dashboard/career-readiness#action-plan');
    expect(payload.title.indexOf('Resume Evidence') !== -1).toBe(true);
    expect(payload.title).toBe('Match breakdown: Resume Evidence');
    expect(payload.sourceLabel).toBe('Job Search');
  });

  it('returns exactly 5 sections (what this measures, your signal, evidence found, missing, fastest fix)', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-2', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    const dim = snapshot.dimensions[0];
    if (dim === undefined) throw new Error('expected first dimension');
    const payload = buildDimensionBriefingPayload(dim, snapshot, '/dashboard/career-readiness#action-plan');
    expect(payload.sections.length).toBe(5);
    expect(payload.sections[0].heading).toBe('What this measures');
    expect(payload.sections[1].heading).toBe('Your current signal');
    expect(payload.sections[2].heading).toBe('Evidence found');
    expect(payload.sections[3].heading).toBe('Evidence missing');
    expect(payload.sections[4].heading).toBe('Fastest fix');
  });

  it('includes primaryCta with route for Resume Evidence dimension', function () {
    const job: JobInputForSnapshot = { id: 'mock-js-2', title: 'Analyst', summary: 'Short.' };
    const snapshot = buildJobMatchSnapshot(baseReadiness, job);
    let resumeDim: JobMatchDimension | undefined;
    for (let i = 0; i < snapshot.dimensions.length; i++) {
      const d = snapshot.dimensions[i];
      if (d !== undefined && d.key === 'Resume Evidence') {
        resumeDim = d;
        break;
      }
    }
    if (resumeDim === undefined) throw new Error('expected Resume Evidence dimension');
    const payload = buildDimensionBriefingPayload(resumeDim, snapshot, '/dashboard/career-readiness#action-plan');
    expect(payload.primaryCta).toBeDefined();
    if (payload.primaryCta !== undefined) {
      expect(payload.primaryCta.label.indexOf('Resume Evidence') !== -1).toBe(true);
      expect(payload.primaryCta.route).toBe('/dashboard/career-readiness#action-plan');
    }
  });
});
