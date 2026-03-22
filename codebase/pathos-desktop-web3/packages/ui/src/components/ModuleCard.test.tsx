/**
 * ============================================================================
 * MODULE CARD SMOKE TEST
 * ============================================================================
 *
 * Basic render test to ensure ModuleCard renders without throwing and
 * outputs the expected title (and optional subtitle) in the markup.
 * No platform-specific imports; pure React SSR for test environment.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ModuleCard } from './ModuleCard';

describe('ModuleCard', function () {
  it('should render title and children', function () {
    const output = renderToString(
      <ModuleCard title="Test Module">
        <p>Body content</p>
      </ModuleCard>
    );
    expect(output).toContain('Test Module');
    expect(output).toContain('Body content');
  });

  it('should render subtitle when provided', function () {
    const output = renderToString(
      <ModuleCard title="Section" subtitle="Optional description">
        <span>Content</span>
      </ModuleCard>
    );
    expect(output).toContain('Section');
    expect(output).toContain('Optional description');
    expect(output).toContain('Content');
  });

  it('should render with dense variant without throwing', function () {
    const output = renderToString(
      <ModuleCard title="Dense" variant="dense">
        <div>Dense body</div>
      </ModuleCard>
    );
    expect(output).toContain('Dense');
    expect(output).toContain('Dense body');
  });
});
