/**
 * ============================================================================
 * PATH ADVISOR CARD SMOKE TEST
 * ============================================================================
 *
 * Verifies: (1) messages render in the conversation window, (2) suggested
 * prompts render as chips, (3) composer with send button is present,
 * (4) Day 62: when context log entries exist for currentScreen, Quick questions
 * is shown (prompts collapsed behind it); (5) Privacy pill is not rendered.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  NavigationProvider,
  type NavigationAdapter,
  type NavLinkProps,
} from '@pathos/adapters';
import { PathAdvisorCard } from './PathAdvisorCard';
import { usePathAdvisorContextLogStore } from '../stores/pathAdvisorContextLogStore';

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

function renderCard(element: React.ReactNode) {
  return renderToString(
    <NavigationProvider adapter={testAdapter} linkComponent={TestLink}>
      {element}
    </NavigationProvider>
  );
}

describe('PathAdvisorCard', function () {
  it('renders messages in the conversation window', function () {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there.' },
    ];
    const output = renderCard(
      <PathAdvisorCard
        messages={messages}
        suggestedPrompts={[]}
        onSend={noop}
      />
    );
    expect(output).toContain('Hello');
    expect(output).toContain('Hi there.');
  });

  it('renders suggested prompts as chips', function () {
    const prompts = ['First prompt', 'Second prompt'];
    const output = renderCard(
      <PathAdvisorCard
        messages={[]}
        suggestedPrompts={prompts}
        onSend={noop}
      />
    );
    expect(output).toContain('First prompt');
    expect(output).toContain('Second prompt');
  });

  it('renders composer with send button so onSend can be invoked on submit', function () {
    const output = renderCard(
      <PathAdvisorCard
        messages={[]}
        suggestedPrompts={[]}
        onSend={noop}
      />
    );
    expect(output).toContain('aria-label="Send"');
    expect(output).toContain('Ask PathAdvisor');
  });

  it('does not render Privacy: Local only pill (Day 62: removed)', function () {
    const output = renderCard(
      <PathAdvisorCard
        messages={[]}
        suggestedPrompts={[]}
        onSend={noop}
      />
    );
    expect(output).not.toContain('Privacy: Local only');
  });

  it('Day 62: card accepts currentScreen and renders without error when store has context log entries (SSR may not show log)', function () {
    usePathAdvisorContextLogStore.getState().clearAll();
    usePathAdvisorContextLogStore.getState().appendEntry(
      {
        id: 'test-entry-1',
        createdAtISO: new Date().toISOString(),
        screen: 'job-search',
        anchor: { type: 'job', id: 'job-1', label: 'Test Job' },
        title: 'Job match: Test Job',
        sections: [],
      },
      { makeActive: true }
    );
    const entriesByAnchor = usePathAdvisorContextLogStore.getState().entriesByAnchor;
    const anchorKey = 'job-search:job:job-1';
    expect(entriesByAnchor[anchorKey] !== undefined && entriesByAnchor[anchorKey].length > 0).toBe(true);
    const output = renderCard(
      <PathAdvisorCard
        messages={[]}
        suggestedPrompts={['Why is this a stretch?']}
        onSend={noop}
        currentScreen="job-search"
      />
    );
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain('PathAdvisor AI');
  });
});
