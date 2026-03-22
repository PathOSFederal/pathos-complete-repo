/**
 * ============================================================================
 * GUIDED USAJOBS WORKSPACE RENDER TEST (Day 44)
 * ============================================================================
 *
 * Basic render test to ensure the workspace component can render without
 * throwing in a test environment.
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GuidedUsaJobsWorkspace } from './GuidedUsaJobsWorkspace';

describe('GuidedUsaJobsWorkspace', function () {
  it('should render the workspace shell', function () {
    const output = renderToString(<GuidedUsaJobsWorkspace />);
    expect(output).toContain('Guided USAJOBS Mode');
  });
});
