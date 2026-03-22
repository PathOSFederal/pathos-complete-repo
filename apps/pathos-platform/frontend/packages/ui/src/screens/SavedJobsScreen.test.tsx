/**
 * ============================================================================
 * SAVED JOBS SCREEN TESTS — hardening coverage for the decision workspace
 * ============================================================================
 *
 * PURPOSE: Validate the Saved Jobs hardening pass at the regression seams that
 * matter most for this screen:
 *   - Build Resume action stays present in the fixed action row
 *   - Match Overview and Job Overview modes both keep the stable workspace frame
 *   - Readiness and match score color bands render from shared tier rules
 *   - Job Overview mode exposes proper tab / panel semantics
 *   - Deterministic mock data continues to exercise low / medium / high bands
 *
 * APPROACH: Uses fast SSR rendering for structural verification plus direct
 * helper assertions for deterministic score behavior. This keeps tests local,
 * stable, and focused on actual regression risk without introducing flaky DOM
 * event simulation in the current Vitest node environment.
 */

import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  NavigationProvider,
  type NavigationAdapter,
  type NavLinkProps,
} from '@pathos/adapters';
import { usePathAdvisorScreenOverridesStore } from '../stores/pathAdvisorScreenOverridesStore';
import { scoreTierColor } from '../styles/scoreTiers';
import {
  SavedJobDetails,
  SavedJobsScreen,
  deriveReadinessScore,
} from './SavedJobsScreen';
import {
  createSavedJobsMockData,
  seedSavedJobsIfEmpty,
} from '../../../core/src/saved-jobs-mock-data';

function noop(text?: string) {
  void text;
}

const testAdapter: NavigationAdapter = {
  pathname: '/dashboard/saved-jobs',
  push: noop,
  replace: noop,
  back: function () {
    /* test navigation noop */
  },
};

function TestLink(props: NavLinkProps) {
  return (
    <a
      href={props.href}
      className={props.className}
      onClick={props.onClick}
      data-tour={props['data-tour']}
    >
      {props.children}
    </a>
  );
}

function renderInNavigation(element: React.ReactNode) {
  return renderToString(
    <NavigationProvider adapter={testAdapter} linkComponent={TestLink}>
      {element}
    </NavigationProvider>
  );
}

function getMockJob(id: string) {
  const jobs = createSavedJobsMockData();
  for (let i = 0; i < jobs.length; i++) {
    if (jobs[i].id === id) {
      return jobs[i];
    }
  }
  throw new Error('Missing mock job: ' + id);
}

function renderDetails(
  jobId: string,
  initialViewMode?: 'decision' | 'announcement',
  initialAnnouncementSection?:
    | 'overview'
    | 'qualifications'
    | 'requirements'
    | 'documents'
    | 'how-to-apply'
    | 'evaluation'
    | 'benefits'
    | 'additional'
) {
  return renderInNavigation(
    <SavedJobDetails
      job={getMockJob(jobId)}
      onRemove={function () {
        /* noop */
      }}
      onStartGuidedApply={function () {
        /* noop */
      }}
      onBuildResume={function () {
        /* noop */
      }}
      onAskPathAdvisor={function () {
        /* noop */
      }}
      initialViewMode={initialViewMode}
      initialAnnouncementSection={initialAnnouncementSection}
    />
  );
}

describe('SavedJobsScreen hardening', function () {
  beforeEach(function () {
    usePathAdvisorScreenOverridesStore.getState().setOverrides(null);
  });

  it('renders the loading state on initial server render', function () {
    const output = renderInNavigation(<SavedJobsScreen />);
    expect(output).toContain('Loading saved jobs');
  });

  it('renders Build Resume in the fixed action row for the decision workspace', function () {
    const output = renderDetails('saved-mock-1', 'decision');
    expect(output).toContain('data-testid="saved-job-action-row"');
    expect(output).toContain('data-testid="build-resume-action"');
    expect(output).toContain('Build Resume');
    expect(output).toContain('Guided Apply');
    expect(output).toContain('Open Official Listing');
  });

  it('keeps the stable workspace frame in Job Overview mode', function () {
    const output = renderDetails('saved-mock-2', 'announcement', 'qualifications');
    expect(output).toContain('data-testid="saved-job-scroll-region"');
    expect(output).toContain('data-testid="saved-job-action-row"');
    expect(output).toContain('data-testid="saved-job-announcement-panel"');
    expect(output).toContain('data-testid="saved-job-announcement-section-panel"');
    expect(output).toContain('Qualifications');
    expect(output).not.toContain('data-testid="saved-job-decision-panel"');
  });

  it('renders accessible tab and panel wiring for Match Overview and Job Overview modes', function () {
    const output = renderDetails('saved-mock-7', 'announcement', 'documents');
    expect(output).toContain('role="tablist"');
    expect(output).toContain('saved-job-mode-tab-announcement');
    expect(output).toContain('saved-job-mode-panel-announcement');
    expect(output).toContain('saved-job-announcement-tab-documents');
    expect(output).toContain('saved-job-announcement-panel-documents');
    expect(output).toContain('aria-controls="saved-job-mode-panel-announcement"');
  });

  it('uses shared score tier colors for low, threshold, and strong saved jobs', function () {
    const weakOutput = renderDetails('saved-mock-3', 'decision');
    const thresholdOutput = renderDetails('saved-mock-6', 'decision');
    const strongOutput = renderDetails('saved-mock-1', 'decision');

    expect(weakOutput).toContain(scoreTierColor(deriveReadinessScore(14)));
    expect(thresholdOutput).toContain(scoreTierColor(deriveReadinessScore(59)));
    expect(strongOutput).toContain(scoreTierColor(deriveReadinessScore(96)));
  });

  it('keeps decision-first fields at the top of the decision view', function () {
    const output = renderDetails('saved-mock-5', 'decision');
    expect(output).toContain('Salary');
    expect(output).toContain('Grade &amp; Promotion');
    expect(output).toContain('Work Mode');
    expect(output).toContain('Deadline');
    expect(output).not.toContain('Schedule');
  });
});

describe('Saved Jobs mock data hardening', function () {
  it('seeds the first mock job when the store is empty', function () {
    const seeded = seedSavedJobsIfEmpty({
      schemaVersion: 2,
      jobs: [],
      selectedJobId: null,
    });
    expect(seeded.jobs.length).toBe(8);
    expect(seeded.selectedJobId).toBe('saved-mock-1');
  });

  it('preserves an existing store without overwriting local data', function () {
    const existing = {
      schemaVersion: 2,
      jobs: [getMockJob('saved-mock-8')],
      selectedJobId: 'saved-mock-8',
    };
    const result = seedSavedJobsIfEmpty(existing);
    expect(result).toBe(existing);
  });

  it('covers low, medium, and high readiness bands with deterministic scores', function () {
    const jobs = createSavedJobsMockData();
    const tierCounts = {
      low: 0,
      medium: 0,
      high: 0,
    };
    let minReadiness = 101;
    let maxReadiness = -1;

    for (let i = 0; i < jobs.length; i++) {
      const readiness = deriveReadinessScore(jobs[i].matchScore);
      if (readiness < minReadiness) minReadiness = readiness;
      if (readiness > maxReadiness) maxReadiness = readiness;

      if (readiness >= 80) {
        tierCounts.high += 1;
      } else if (readiness >= 60) {
        tierCounts.medium += 1;
      } else {
        tierCounts.low += 1;
      }
    }

    expect(minReadiness).toBeLessThanOrEqual(25);
    expect(maxReadiness).toBeGreaterThanOrEqual(90);
    expect(tierCounts.low).toBeGreaterThanOrEqual(2);
    expect(tierCounts.medium).toBeGreaterThanOrEqual(2);
    expect(tierCounts.high).toBeGreaterThanOrEqual(2);
  });

  it('includes exact threshold examples for amber and green boundary review', function () {
    const jobs = createSavedJobsMockData();
    let foundAmberBoundary = false;
    let foundGreenBoundary = false;

    for (let i = 0; i < jobs.length; i++) {
      const readiness = deriveReadinessScore(jobs[i].matchScore);
      if (readiness === 60) foundAmberBoundary = true;
      if (readiness === 80) foundGreenBoundary = true;
    }

    expect(foundAmberBoundary).toBe(true);
    expect(foundGreenBoundary).toBe(true);
  });
});
