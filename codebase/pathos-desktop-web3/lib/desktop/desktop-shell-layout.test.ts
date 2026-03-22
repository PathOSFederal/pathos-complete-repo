/**
 * ============================================================================
 * DESKTOP SHELL LAYOUT MATH TESTS (Day 45)
 * ============================================================================
 *
 * PURPOSE:
 * Guard the geometry math that places the Electron BrowserView so future
 * refactors do not break the reserved USAJOBS region.
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { buildDesktopShellLayout } from './desktop-shell-layout';

describe('buildDesktopShellLayout', function () {
  it('should compute the left pane bounds from fixed offsets', function () {
    const result = buildDesktopShellLayout({
      windowWidth: 1400,
      windowHeight: 900,
      rightPanelWidth: 420,
      topBarHeight: 64,
    });

    expect(result.browserViewBounds.x).toBe(0);
    expect(result.browserViewBounds.y).toBe(64);
    expect(result.browserViewBounds.width).toBe(980);
    expect(result.browserViewBounds.height).toBe(836);
  });

  it('should clamp panel sizes when the window is too small', function () {
    const result = buildDesktopShellLayout({
      windowWidth: 300,
      windowHeight: 200,
      rightPanelWidth: 420,
      topBarHeight: 64,
    });

    expect(result.rightPanelWidth).toBe(300);
    expect(result.leftPaneWidth).toBe(0);
    expect(result.browserViewBounds.height).toBe(136);
  });
});
