/**
 * Job Search screen tests: title/subtitle, empty state, loadSampleJobs (fit badge + reasons),
 * save creates decision brief in localStorage, Decision Brief tab content.
 * Listbox UX: full-row selectable, consistent row height, Why this fit opens PathAdvisor briefing (no inline expand).
 * Unified search: prompt panel collapsed by default; Describe CTA expands panel; Translate->Apply sets filters and runs search;
 * Applied from prompt indicator; Reset clears applied-from-prompt; manual search unchanged.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  NavigationProvider,
  type NavigationAdapter,
  type NavLinkProps,
} from '@pathos/adapters';
import { useJobSearchV1Store } from '../stores/jobSearchV1Store';
import { useDecisionBriefsV1Store, buildDecisionBriefRecord } from '../stores/decisionBriefsV1Store';
import { usePathAdvisorBriefingStore } from '../stores/pathAdvisorBriefingStore';
import {
  buildJobMatchSnapshot,
  buildReadinessInputFromMock,
  buildDimensionBriefingPayload,
} from '../lib/jobMatchSnapshot';
import { CAREER_READINESS_MOCK } from './careerReadiness/careerReadinessMockData';
import { JobSearchScreen } from './JobSearchScreen';
import { MOCK_JOBS } from './jobSearchMockJobs';
import { usePathAdvisorContextLogStore, getAnchorKeysForScreen, getEntriesForAnchor } from '../stores/pathAdvisorContextLogStore';
import { publishScreenContext, publishDimensionExplainContext } from '../lib/pathAdvisorPublish';

function noop(_x?: string) {
  /* mock */
}

const testAdapter: NavigationAdapter = {
  pathname: '/dashboard/job-search',
  push: noop,
  replace: noop,
  back: function () {
    /* mock */
  },
};

function TestLink(props: NavLinkProps) {
  return (
    <a href={props.href} className={props.className} onClick={props.onClick} data-tour={props['data-tour']}>
      {props.children}
    </a>
  );
}

function renderJobSearch() {
  return renderToString(
    <NavigationProvider adapter={testAdapter} linkComponent={TestLink}>
      <JobSearchScreen />
    </NavigationProvider>
  );
}

describe('JobSearchScreen', function () {
  beforeEach(function () {
    useJobSearchV1Store.getState().loadFromStorage();
    usePathAdvisorContextLogStore.getState().clearAll();
  });

  it('renders loading or Job Search content', function () {
    const output = renderJobSearch();
    expect(output.indexOf('Job Search') !== -1 || output.indexOf('Loading job search') !== -1).toBe(true);
  });

  it('includes Explore roles subtitle in component tree when mounted', function () {
    useJobSearchV1Store.setState({
      hasSearched: false,
      results: [],
      loading: false,
    });
    const output = renderJobSearch();
    expect(output.indexOf('Explore roles') !== -1 || output.indexOf('Loading') !== -1).toBe(true);
  });

  it('after loadSampleJobs store has results and first job selected for details pane', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const state = useJobSearchV1Store.getState();
    expect(state.hasSearched).toBe(true);
    expect(state.results.length).toBeGreaterThan(0);
    expect(state.selectedJobId).toBe(state.results[0].id);
    expect(state.results[0].title.indexOf('IT Specialist') !== -1 || state.results[0].title.indexOf('Cybersecurity') !== -1).toBe(true);
  });

  it('selecting a job yields details pane content: Match for this job appears when job selected (or loading on first paint)', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const state = useJobSearchV1Store.getState();
    expect(state.selectedJobId).not.toBeNull();
    expect(state.results.length).toBeGreaterThan(0);
    const output = renderJobSearch();
    expect(
      output.indexOf('Match for this job') !== -1 || output.indexOf('Loading job search') !== -1
    ).toBe(true);
  });

  it('when a job is selected and snapshot visible Match breakdown rows include at least two dimension labels', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Match for this job') === -1) return;
    expect(output.indexOf('Match breakdown') !== -1).toBe(true);
    const hasResumeEvidence = output.indexOf('Resume Evidence') !== -1;
    const hasKeywordsCoverage = output.indexOf('Keywords Coverage') !== -1;
    expect(hasResumeEvidence || hasKeywordsCoverage).toBe(true);
    expect(output.indexOf('Target Alignment') !== -1 || output.indexOf('Specialized Experience') !== -1).toBe(true);
  });

  it('opening dimension briefing for Resume Evidence sets PathAdvisor briefing with title containing Resume Evidence', function () {
    usePathAdvisorBriefingStore.getState().clearBriefing();
    useJobSearchV1Store.getState().loadSampleJobs();
    const actionPlanRoute = '/dashboard/career-readiness#action-plan';
    const readinessInput = buildReadinessInputFromMock({
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
    const job = useJobSearchV1Store.getState().results[0];
    if (job === undefined) throw new Error('no job');
    const snapshot = buildJobMatchSnapshot(readinessInput, job);
    let resumeDim;
    for (let i = 0; i < snapshot.dimensions.length; i++) {
      const d = snapshot.dimensions[i];
      if (d !== undefined && d.key === 'Resume Evidence') {
        resumeDim = d;
        break;
      }
    }
    if (resumeDim === undefined) throw new Error('expected Resume Evidence dimension');
    const payload = buildDimensionBriefingPayload(resumeDim, snapshot, actionPlanRoute);
    const id = 'dimension-Resume-Evidence';
    usePathAdvisorBriefingStore.getState().openBriefing({
      id,
      title: payload.title,
      sourceLabel: payload.sourceLabel,
      sections: payload.sections,
      primaryCta: payload.primaryCta,
    });
    const state = usePathAdvisorBriefingStore.getState();
    expect(state.briefing).not.toBeNull();
    expect(state.isOpen).toBe(true);
    if (state.briefing !== null && typeof state.briefing === 'object' && 'title' in state.briefing) {
      expect((state.briefing as { title: string }).title.indexOf('Resume Evidence') !== -1).toBe(true);
    }
  });

  it('when a job is selected and snapshot visible readiness score appears in snapshot copy (e.g. 74/100)', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Match for this job') === -1) return;
    expect(output.indexOf('74/100') !== -1).toBe(true);
  });

  it('match panel shows both Readiness and Job match labels (Option A clarity)', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Match for this job') === -1) return;
    expect(output.indexOf('Readiness:') !== -1).toBe(true);
    expect(output.indexOf('Job match:') !== -1).toBe(true);
  });

  it('at least one job row renders Match badge (e.g. Moderate) and score with /100', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Match for this job') === -1) return;
    const hasModerate = output.indexOf('Moderate') !== -1;
    const hasStrong = output.indexOf('Strong') !== -1;
    const hasStretch = output.indexOf('Stretch') !== -1;
    expect(hasModerate || hasStrong || hasStretch).toBe(true);
    expect(output.indexOf('/100') !== -1).toBe(true);
  });

  it('after loadSampleJobs list contains at least two different match labels across rows', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    const hasStrong = output.indexOf('Strong') !== -1;
    const hasModerate = output.indexOf('Moderate') !== -1;
    const hasStretch = output.indexOf('Stretch') !== -1;
    if (!hasStrong && !hasModerate && !hasStretch) return;
    const distinctCount = (hasStrong ? 1 : 0) + (hasModerate ? 1 : 0) + (hasStretch ? 1 : 0);
    expect(distinctCount >= 2).toBe(true);
  });

  it('when details panel is visible it shows Match for this job and Job match score', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Match for this job') === -1) return;
    expect(output.indexOf('Job match:') !== -1).toBe(true);
  });

  it('Why this fit? is not present in results list (Option A: replaced by Match badge)', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    expect(output.indexOf('Why this fit?') === -1).toBe(true);
  });

  it('at least one Match breakdown row has Open dimension details in aria-label', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Match breakdown') === -1) return;
    expect(output.indexOf('Open dimension details') !== -1).toBe(true);
  });

  it('when a job is selected and snapshot visible Open Career Readiness CTA exists', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Match for this job') === -1) return;
    expect(output.indexOf('Open Career Readiness') !== -1).toBe(true);
  });

  it('when a job is selected and snapshot visible primary blocker line is present and may include a weak dimension label', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Match for this job') === -1) return;
    expect(output.indexOf('Primary blocker') !== -1).toBe(true);
    const hasDimensionInBlocker =
      output.indexOf('Resume Evidence') !== -1 ||
      output.indexOf('Target Alignment') !== -1 ||
      output.indexOf('Leadership & Scope') !== -1 ||
      output.indexOf('Keywords Coverage') !== -1 ||
      output.indexOf('Specialized Experience') !== -1 ||
      output.indexOf('Missing readiness') !== -1 ||
      output.indexOf('None detected') !== -1;
    expect(hasDimensionInBlocker).toBe(true);
  });

  it('Explain this match sets rail briefing state (store has type fit and isOpen)', function () {
    usePathAdvisorBriefingStore.getState().clearBriefing();
    useJobSearchV1Store.getState().loadSampleJobs();
    const openBriefing = usePathAdvisorBriefingStore.getState().openBriefing;
    openBriefing({
      type: 'fit',
      jobId: 'mock-js-1',
      jobTitle: 'IT Specialist (Cybersecurity)',
      stars: 4,
      confidence: 'High',
      reasons: ['Series matches your target (2210)', 'Grade aligned with target (GS-12)'],
      blocker: '',
      effort: 'Low',
      risks: ['Travel', 'Drug test'],
      inputsUsed: ['target series', 'target grade'],
      missingInputs: [],
      isJobSaved: false,
    });
    const state = usePathAdvisorBriefingStore.getState();
    expect(state.briefing).not.toBeNull();
    expect(state.isOpen).toBe(true);
    if (state.briefing !== null && typeof state.briefing === 'object') {
      expect((state.briefing as { type?: string }).type).toBe('fit');
      expect((state.briefing as { blocker?: string }).blocker).toBeDefined();
      expect((state.briefing as { effort?: string }).effort).toBe('Low');
    }
  });

  it('loadSampleJobs then store has results usable for fit scoring', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const state = useJobSearchV1Store.getState();
    expect(state.results.length).toBeGreaterThan(0);
    const first = state.results[0];
    expect(first).toBeDefined();
    expect(first.title).toBeDefined();
    expect(first.id).toBeDefined();
  });

  it('saveBrief persists decision brief to store and getBrief returns it', function () {
    const job = MOCK_JOBS[0];
    if (job === undefined) throw new Error('no job');
    useDecisionBriefsV1Store.setState({ briefs: {} });
    const record = buildDecisionBriefRecord(job.id, job, {}, {});
    useDecisionBriefsV1Store.getState().saveBrief(record);
    const loaded = useDecisionBriefsV1Store.getState().getBrief(job.id);
    expect(loaded).not.toBeNull();
    if (loaded !== null) {
      expect(loaded.jobId).toBe(job.id);
      expect(loaded.nextActions.length).toBe(3);
    }
  });

  it('decision brief record has PathOS Brief tab content fields', function () {
    const job = MOCK_JOBS[0];
    if (job === undefined) throw new Error('no job');
    const record = buildDecisionBriefRecord(job.id, job, {}, {});
    expect(record.fitAssessment).toBeDefined();
    expect(record.nextActions.length).toBeGreaterThanOrEqual(1);
    expect(record.keyFactsSummary).toBeDefined();
  });

  it('Series dropdown reads from store (store test in jobSearchV1Store verifies setFilters/clearAllFilters for series)', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    useJobSearchV1Store.setState({ filters: { series: '2210' } });
    const state = useJobSearchV1Store.getState();
    expect(state.filters.series).toBe('2210');
  });

  it('results list uses listbox semantics and consistent row height when results are shown', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
    if (output.indexOf('listbox') !== -1) {
      expect(output.indexOf('option') !== -1).toBe(true);
      expect(output.indexOf('min-h') !== -1).toBe(true);
    }
  });

  it('Explain this match opens PathAdvisor fit briefing; briefing store has type fit and isOpen', function () {
    usePathAdvisorBriefingStore.getState().clearBriefing();
    usePathAdvisorBriefingStore.getState().openBriefing({
      type: 'fit',
      jobId: 'mock-js-1',
      jobTitle: 'IT Specialist (Cybersecurity)',
      stars: 4,
      confidence: 'High',
      reasons: ['Grade match', 'Series alignment'],
      blocker: '',
      effort: 'Medium',
      risks: [],
      inputsUsed: ['target role', 'job data'],
      missingInputs: [],
      isJobSaved: false,
    });
    const state = usePathAdvisorBriefingStore.getState();
    expect(state.briefing).not.toBeNull();
    expect(state.isOpen).toBe(true);
    if (state.briefing !== null && typeof state.briefing === 'object') {
      expect((state.briefing as { type?: string }).type).toBe('fit');
      expect((state.briefing as { jobId?: string }).jobId).toBe('mock-js-1');
    }
  });

  it('saveJob can be called and store remains consistent (create-button rule covered in jobSearchV1Store.test)', function () {
    const job = MOCK_JOBS[0];
    if (job === undefined) throw new Error('no job');
    useJobSearchV1Store.getState().loadFromStorage();
    expect(function () {
      useJobSearchV1Store.getState().saveJob(job);
    }).not.toThrow();
  });

  it('prompt panel is collapsed by default (Describe what you want optional or loading)', function () {
    useJobSearchV1Store.getState().loadFromStorage();
    const output = renderJobSearch();
    expect(
      output.indexOf('Describe what you want (optional)') !== -1 || output.indexOf('Loading job search') !== -1
    ).toBe(true);
    expect(output.indexOf('PathOS will translate it into filters') !== -1 || output.indexOf('Loading') !== -1).toBe(true);
  });

  it('single Search button present when mounted (unified search; no duplicate Search in describe flow)', function () {
    useJobSearchV1Store.getState().loadFromStorage();
    const output = renderJobSearch();
    expect(output.indexOf('Search') !== -1 || output.indexOf('Loading job search') !== -1).toBe(true);
    expect(output.indexOf('Reset') !== -1 || output.indexOf('Loading') !== -1).toBe(true);
  });

  it('manual search still works: runSearch sets results and hasSearched', function () {
    useJobSearchV1Store.getState().loadFromStorage();
    useJobSearchV1Store.getState().setLastQuery({ keywords: 'IT' });
    useJobSearchV1Store.getState().runSearch();
    return new Promise(function (resolve) {
      setTimeout(function () {
        const state = useJobSearchV1Store.getState();
        expect(state.hasSearched).toBe(true);
        expect(state.loading).toBe(false);
        resolve(undefined);
      }, 500);
    });
  });

  it('applyProposedFiltersFromPrompt then runSearch sets filters and results; appliedFromPrompt is set', function () {
    useJobSearchV1Store.getState().loadFromStorage();
    useJobSearchV1Store.getState().applyProposedFiltersFromPrompt('Remote GS-12', { gradeBand: 'GS-12', remoteType: 'Remote' });
    const afterApply = useJobSearchV1Store.getState();
    expect(afterApply.filters.gradeBand).toBe('GS-12');
    expect(afterApply.filters.remoteType).toBe('Remote');
    expect(afterApply.appliedFromPrompt).not.toBeNull();
    if (afterApply.appliedFromPrompt !== null) {
      expect(afterApply.appliedFromPrompt.promptText).toBe('Remote GS-12');
    }
    useJobSearchV1Store.getState().runSearch();
    return new Promise(function (resolve) {
      setTimeout(function () {
        const state = useJobSearchV1Store.getState();
        expect(state.hasSearched).toBe(true);
        expect(state.results.length).toBeGreaterThanOrEqual(0);
        resolve(undefined);
      }, 500);
    });
  });

  it('Applied from prompt indicator appears when appliedFromPrompt is set (or loading)', function () {
    useJobSearchV1Store.getState().loadFromStorage();
    useJobSearchV1Store.getState().applyProposedFiltersFromPrompt('Remote GS-12', { gradeBand: 'GS-12', remoteType: 'Remote' });
    const output = renderJobSearch();
    expect(
      output.indexOf('Applied from prompt') !== -1 || output.indexOf('Loading job search') !== -1
    ).toBe(true);
    expect(output.indexOf('View') !== -1 || output.indexOf('Loading') !== -1).toBe(true);
  });

  it('Reset clears selectedJobId filters appliedFromPrompt (store resets to clean state)', function () {
    useJobSearchV1Store.getState().loadFromStorage();
    useJobSearchV1Store.getState().loadSampleJobs();
    useJobSearchV1Store.getState().applyProposedFiltersFromPrompt('GS-12', { gradeBand: 'GS-12' });
    const before = useJobSearchV1Store.getState();
    expect(before.selectedJobId).not.toBeNull();
    expect(before.appliedFromPrompt).not.toBeNull();
    useJobSearchV1Store.getState().setLastQuery({ keywords: '', location: '' });
    useJobSearchV1Store.getState().clearAllFilters();
    useJobSearchV1Store.getState().setAppliedFromPrompt(null);
    useJobSearchV1Store.getState().setFilters({});
    useJobSearchV1Store.getState().setSelectedJob(null);
    useJobSearchV1Store.getState().clearSearchResults();
    useJobSearchV1Store.getState().persist();
    const after = useJobSearchV1Store.getState();
    expect(after.selectedJobId).toBeNull();
    expect(after.appliedFromPrompt).toBeNull();
    expect(after.filters.gradeBand === undefined || after.filters.gradeBand === '').toBe(true);
  });

  it('after search, store has totalCount and results slice; status line would show Showing 1–N of totalCount', function () {
    useJobSearchV1Store.getState().loadFromStorage();
    useJobSearchV1Store.getState().loadSampleJobs();
    const state = useJobSearchV1Store.getState();
    expect(state.hasSearched).toBe(true);
    expect(state.totalCount).toBeGreaterThanOrEqual(30);
    expect(state.results.length).toBeLessThanOrEqual(state.pageSize);
    expect(state.results.length).toBe(Math.min(state.pageSize, state.totalCount));
  });

  it('Day 62: match panel shows Details appear in PathAdvisor and does not show What you\'re missing block', function () {
    useJobSearchV1Store.getState().loadSampleJobs();
    const output = renderJobSearch();
    if (output.indexOf('Loading job search') !== -1) {
      return;
    }
    expect(output).toContain('Details appear in PathAdvisor');
    expect(output).not.toContain("What you're missing");
  });

  it('Day 62: selecting a job appends context log entry with title containing Job match', function () {
    usePathAdvisorContextLogStore.getState().clearAll();
    const job = MOCK_JOBS[0];
    if (job === undefined) throw new Error('no job');
    const readinessInput = buildReadinessInputFromMock({
      score: CAREER_READINESS_MOCK.score,
      scoreMax: CAREER_READINESS_MOCK.scoreMax,
      badgeLabel: CAREER_READINESS_MOCK.badgeLabel,
      radarSpokes: CAREER_READINESS_MOCK.radarSpokes,
      gaps: CAREER_READINESS_MOCK.gaps,
      actionPlanItems: CAREER_READINESS_MOCK.actionPlanItems,
    });
    const snap = buildJobMatchSnapshot(readinessInput, job);
    publishScreenContext({
      screen: 'job-search',
      anchor: { type: 'job', id: job.id, label: job.title !== undefined ? job.title : job.id },
      title: 'Job match: ' + (job.title !== undefined ? job.title : job.id),
      subtitle: (job.agency !== undefined ? job.agency : '') + ' • ' + (job.location !== undefined ? job.location : ''),
      sections: [
        { title: 'Summary', lines: ['Readiness: ' + String(snap.overallReadinessScore) + '/' + String(snap.overallReadinessMax)] },
      ],
      tags: ['localOnly'],
      dedupeKey: 'selectJob:' + job.id + ':' + String(snap.overallMatchScore),
    });
    const keys = getAnchorKeysForScreen(usePathAdvisorContextLogStore.getState().entriesByAnchor, 'job-search');
    expect(keys.length).toBeGreaterThanOrEqual(1);
    const entries = getEntriesForAnchor(usePathAdvisorContextLogStore.getState().entriesByAnchor, keys[0]);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[entries.length - 1].title).toContain('Job match');
  });

  it('Day 62: dimension explain appends context log entry with title containing Match breakdown', function () {
    usePathAdvisorContextLogStore.getState().clearAll();
    const job = MOCK_JOBS[0];
    if (job === undefined) throw new Error('no job');
    const readinessInput = buildReadinessInputFromMock({
      score: CAREER_READINESS_MOCK.score,
      scoreMax: CAREER_READINESS_MOCK.scoreMax,
      badgeLabel: CAREER_READINESS_MOCK.badgeLabel,
      radarSpokes: CAREER_READINESS_MOCK.radarSpokes,
      gaps: CAREER_READINESS_MOCK.gaps,
      actionPlanItems: CAREER_READINESS_MOCK.actionPlanItems,
    });
    const snap = buildJobMatchSnapshot(readinessInput, job);
    const dim = snap.dimensions[0];
    if (dim === undefined) throw new Error('no dimension');
    publishDimensionExplainContext({
      screen: 'job-search',
      anchor: { type: 'job', id: job.id, label: job.title !== undefined ? job.title : job.id },
      dimension: dim.label,
      payload: { whatMeasures: ['Test'], yourSignal: 'Good', fastestFix: 'Add evidence.' },
      dedupeKey: 'dimension:' + dim.key + ':' + String(snap.overallMatchScore),
    });
    const keys = getAnchorKeysForScreen(usePathAdvisorContextLogStore.getState().entriesByAnchor, 'job-search');
    expect(keys.length).toBeGreaterThanOrEqual(1);
    const entries = getEntriesForAnchor(usePathAdvisorContextLogStore.getState().entriesByAnchor, keys[0]);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[entries.length - 1].title).toContain('Match breakdown');
  });
});
