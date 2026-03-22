/**
 * ============================================================================
 * CAREER SCREEN TESTS — Lock key behavior (title/sections, disabled Tailoring CTA)
 * ============================================================================
 *
 * Minimal high-signal tests per testing-standards: (1) Renders title and key
 * sections. (2) Tailoring CTA is disabled when no job selected (demoState
 * other than tailorReadyWithJob).
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  NavigationProvider,
  type NavigationAdapter,
  type NavLinkProps,
} from '@pathos/adapters';
import { useCareerResumeScreenStore } from '../stores/careerResumeScreenStore';
import { CareerScreen } from './CareerScreen';

function noop(_text: string) {
  /* mock */
}

const testAdapter: NavigationAdapter = {
  pathname: '/dashboard/career',
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

function renderCareer(element: React.ReactNode) {
  return renderToString(
    <NavigationProvider adapter={testAdapter} linkComponent={TestLink}>
      {element}
    </NavigationProvider>
  );
}

describe('CareerScreen', function () {
  beforeEach(function () {
    useCareerResumeScreenStore.getState().resetSeeded();
  });

  it('renders Resume Readiness title and key sections', function () {
    const output = renderCareer(<CareerScreen />);
    expect(output).toContain('Resume Readiness');
    expect(output).toContain('Keep your story complete, tailored, and ready to submit.');
    expect(output).toMatch(/TODAY.*BEST MOVE/);
    expect(output).toContain('RESUME READINESS');
    expect(output).toContain('YOUR RESUMES');
    expect(output).toContain('REFERRAL READINESS CHECK');
    expect(output).toContain('TAILORING WORKSPACE');
    expect(output).toContain('CAREER NARRATIVE');
    expect(output).toContain('PROOF LIBRARY');
    expect(output).toContain('Reusable evidence you can drop into bullets and tailoring');
    expect(output).toContain('STAR stories');
    expect(output).toContain('Bullet bank');
    expect(output).toContain('Metrics');
  });

  it('renders Proof Library with three panels (STAR stories, Bullet bank, Metrics)', function () {
    const output = renderCareer(<CareerScreen />);
    expect(output).toContain('PROOF LIBRARY');
    expect(output).toContain('STAR stories');
    expect(output).toContain('Bullet bank');
    expect(output).toContain('Metrics');
    expect(output).toContain('Add STAR story');
    expect(output).toContain('Add bullet');
    expect(output).toContain('Add metric');
    expect(output).toContain('Import from notes (optional)');
  });

  it('renders Referral Readiness Check card (not Linter Findings)', function () {
    const output = renderCareer(<CareerScreen demoState="incompleteResume" />);
    expect(output).toContain('REFERRAL READINESS CHECK');
    expect(output).toContain('Quick issues that could lower your referral odds');
    expect(output).not.toContain('LINTER FINDINGS');
  });

  it('renders YOUR RESUMES section and Tailoring Workspace with target job picker', function () {
    const output = renderCareer(<CareerScreen demoState="incompleteResume" />);
    expect(output).toContain('YOUR RESUMES');
    expect(output).toContain('Target job');
    expect(output).toContain('Select a saved job');
    expect(output).toContain('Start Tailoring');
  });

  it('disables Start Tailoring when no target job selected', function () {
    const output = renderCareer(<CareerScreen demoState="incompleteResume" />);
    expect(output).toContain('Start Tailoring');
    expect(output).toContain('disabled');
  });

  it('renders Tailoring Workspace with Target job picker and Start Tailoring', function () {
    const output = renderCareer(<CareerScreen demoState="tailorReadyWithJob" />);
    expect(output).toContain('Target job');
    expect(output).toContain('Start Tailoring');
    expect(output).toContain('Select a saved job');
  });

  it('renders YOUR RESUMES empty state when no resumes (SSR does not seed store)', function () {
    const output = renderCareer(<CareerScreen demoState="incompleteResume" />);
    expect(output).toContain('YOUR RESUMES');
    expect(output).toContain('No resume yet');
  });
});
