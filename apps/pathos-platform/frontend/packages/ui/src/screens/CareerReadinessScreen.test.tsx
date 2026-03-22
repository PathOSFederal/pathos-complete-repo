/**
 * Career Readiness screen tests: smoke render of title, score, and key sections.
 * Per testing-standards: optional for pure UI; minimal smoke test for regression.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  NavigationProvider,
  type NavigationAdapter,
  type NavLinkProps,
} from '@pathos/adapters';
import { usePathAdvisorScreenOverridesStore } from '../stores/pathAdvisorScreenOverridesStore';
import { CareerReadinessScreen } from './CareerReadinessScreen';

function noop(_text: string) {
  /* mock */
}

const testAdapter: NavigationAdapter = {
  pathname: '/dashboard/career-readiness',
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

function renderScreen(element: React.ReactNode) {
  return renderToString(
    <NavigationProvider adapter={testAdapter} linkComponent={TestLink}>
      {element}
    </NavigationProvider>
  );
}

describe('CareerReadinessScreen', function () {
  beforeEach(function () {
    usePathAdvisorScreenOverridesStore.getState().setOverrides(null);
  });

  it('renders title, subtitle, primary score, and key text', function () {
    const output = renderScreen(<CareerReadinessScreen />);
    expect(output).toContain('Career Readiness');
    expect(output).toContain('Your competitiveness baseline for federal roles.');
    expect(output).toContain('74');
    expect(output).toContain('100');
    expect(output).toContain('Competitive with improvements');
    expect(output).toContain('Baseline competitiveness across common federal roles.');
  });

  it('renders Readiness Trajectory and Readiness Radar cards', function () {
    const output = renderScreen(<CareerReadinessScreen />);
    expect(output).toContain('Readiness Trajectory');
    expect(output).toContain('Readiness Radar');
    expect(output).toContain('Top gaps holding you back');
  });

  it('renders READINESS RADAR section and all 5 radar indicator labels', function () {
    const output = renderScreen(<CareerReadinessScreen />);
    expect(output).toContain('Readiness Radar');
    expect(output).toContain('Target Alignment');
    expect(output).toContain('Specialized Experience');
    expect(output).toContain('Resume Evidence');
    expect(output).toContain('Keywords Coverage');
    expect(output.indexOf('Leadership') !== -1 && output.indexOf('Scope') !== -1).toBe(true);
    expect(output).toContain('Leadership &amp; Scope');
  });

  it('renders trajectory legend (Actual, Possible) and trust microcopy', function () {
    const output = renderScreen(<CareerReadinessScreen />);
    expect(output).toContain('Actual');
    expect(output).toContain('Possible');
    expect(output).toContain('Actual shows your progress over time. Possible shows where you could be if you complete selected actions. Local-only.');
  });

  it('renders Action Plan and Evidence & Inputs section', function () {
    const output = renderScreen(<CareerReadinessScreen />);
    expect(output).toContain('Action Plan');
    expect(output).toContain('Projected readiness');
    expect(output.indexOf('Evidence') !== -1 && output.indexOf('Inputs') !== -1).toBe(true);
    expect(output).toContain('See what inputs were used for scoring.');
  });
});
