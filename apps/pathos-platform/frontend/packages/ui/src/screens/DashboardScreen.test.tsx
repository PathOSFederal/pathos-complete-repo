/**
 * Dashboard screen tests: Readiness tile and Do now / Next best action.
 * Day 60: Readiness tile uses shared summary; hero CTA goes to Career Readiness.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  NavigationProvider,
  type NavigationAdapter,
  type NavLinkProps,
} from '@pathos/adapters';
import { DashboardScreen } from './DashboardScreen';
import { getCareerReadinessSummary } from './careerReadiness/careerReadinessMockData';

function noop(_text: string) {
  /* mock */
}

const testAdapter: NavigationAdapter = {
  pathname: '/dashboard',
  push: noop,
  replace: noop,
  back: function () {
    /* mock */
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

function renderDashboard() {
  return renderToString(
    <NavigationProvider adapter={testAdapter} linkComponent={TestLink}>
      <DashboardScreen />
    </NavigationProvider>
  );
}

describe('DashboardScreen', function () {
  it('renders all four briefing tile titles: Saved Jobs, Tracked Apps, Readiness, Next Milestone', function () {
    const output = renderDashboard();
    expect(output).toContain('Saved Jobs');
    expect(output).toContain('Tracked Apps');
    expect(output).toContain('Readiness');
    expect(output).toContain('Next Milestone');
  });

  it('renders Readiness score with primary value and denominator (74 and /100)', function () {
    const summary = getCareerReadinessSummary();
    const output = renderDashboard();
    expect(output).toContain(String(summary.score));
    expect(output).toContain('/' + String(summary.scoreMax));
  });

  it('renders "Open Career Readiness", "Open Saved Jobs", and at least one more "Open …" CTA', function () {
    const output = renderDashboard();
    expect(output).toContain('Open Career Readiness');
    expect(output).toContain('Open Saved Jobs');
    const hasOpenApplications = output.includes('Open Applications');
    const hasOpenStatus = output.includes('Open Status');
    expect(hasOpenApplications || hasOpenStatus).toBe(true);
  });

  it('renders exactly one Readiness details trigger (aria-label "Readiness details")', function () {
    const output = renderDashboard();
    const matches = output.match(/aria-label="Readiness details"/g);
    expect(matches).not.toBeNull();
    expect(matches).toHaveLength(1);
  });

  it('does not render the inline "Top gaps" list inside the Readiness tile body', function () {
    const output = renderDashboard();
    expect(output).not.toMatch(/Top gaps:\s*Resume Evidence/);
  });

  it('renders next best action text from readiness summary (Today\'s Focus hero)', function () {
    const summary = getCareerReadinessSummary();
    const output = renderDashboard();
    expect(summary.nextBestActionText.length).toBeGreaterThan(0);
    expect(output).toContain(summary.nextBestActionText);
  });
});
