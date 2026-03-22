/**
 * ============================================================================
 * DESKTOP USAJOBS ROUTE RENDER TEST (Day 45)
 * ============================================================================
 *
 * PURPOSE:
 * Basic render test to ensure the desktop route can render without throwing.
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import GuidedUsaJobsDesktopPage from './page';

describe('/desktop/usajobs-guided', function () {
  it('should render the desktop workspace header', function () {
    const output = renderToString(<GuidedUsaJobsDesktopPage />);
    expect(output).toContain('Guided USAJOBS Workspace');
  });
});
