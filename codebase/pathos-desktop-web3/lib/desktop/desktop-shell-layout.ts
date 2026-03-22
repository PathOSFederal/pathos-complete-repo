/**
 * ============================================================================
 * DESKTOP SHELL LAYOUT MATH (Day 45)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Pure, unit-tested layout math for the Electron BrowserView placement.
 *
 * WHY THIS FILE EXISTS:
 * Electron needs numeric bounds for BrowserView placement, but we do NOT want
 * to embed layout math directly inside Electron's side-effectful window code.
 * This helper keeps the math isolated, easy to test, and safe to reason about.
 *
 * TRUST BOUNDARY NOTES:
 * - This file does NOT touch USAJOBS content or DOM.
 * - It only calculates numbers for window geometry.
 *
 * ARCHITECTURAL FIT:
 * - Used by `electron/main.ts` to place the BrowserView.
 * - Used by a unit test to lock the geometry rules.
 * ============================================================================
 */

export interface DesktopShellLayoutInput {
  /**
   * Current outer window width (pixels).
   */
  windowWidth: number;
  /**
   * Current outer window height (pixels).
   */
  windowHeight: number;
  /**
   * Fixed width of the right PathAdvisor panel (pixels).
   */
  rightPanelWidth: number;
  /**
   * Fixed height of the top bar (pixels).
   */
  topBarHeight: number;
}

export interface DesktopShellBounds {
  /**
   * Left offset of the BrowserView.
   */
  x: number;
  /**
   * Top offset of the BrowserView.
   */
  y: number;
  /**
   * Width of the BrowserView.
   */
  width: number;
  /**
   * Height of the BrowserView.
   */
  height: number;
}

export interface DesktopShellLayoutResult {
  /**
   * Sanitized window width (never negative).
   */
  windowWidth: number;
  /**
   * Sanitized window height (never negative).
   */
  windowHeight: number;
  /**
   * Sanitized right panel width (clamped to window width).
   */
  rightPanelWidth: number;
  /**
   * Sanitized top bar height (clamped to window height).
   */
  topBarHeight: number;
  /**
   * Remaining width for the left (USAJOBS) region.
   */
  leftPaneWidth: number;
  /**
   * Remaining height for the BrowserView region.
   */
  contentHeight: number;
  /**
   * BrowserView bounds in Electron coordinate space.
   */
  browserViewBounds: DesktopShellBounds;
}

/**
 * Build consistent BrowserView bounds for the Guided USAJOBS desktop shell.
 *
 * This is intentionally defensive: it clamps negative values and prevents
 * the right panel/top bar from exceeding the window bounds.
 */
export function buildDesktopShellLayout(input: DesktopShellLayoutInput): DesktopShellLayoutResult {
  const safeWindowWidth = input.windowWidth < 0 ? 0 : input.windowWidth;
  const safeWindowHeight = input.windowHeight < 0 ? 0 : input.windowHeight;
  const safeRightPanelWidth = input.rightPanelWidth < 0 ? 0 : input.rightPanelWidth;
  const safeTopBarHeight = input.topBarHeight < 0 ? 0 : input.topBarHeight;

  const clampedRightPanelWidth =
    safeRightPanelWidth > safeWindowWidth ? safeWindowWidth : safeRightPanelWidth;
  const clampedTopBarHeight =
    safeTopBarHeight > safeWindowHeight ? safeWindowHeight : safeTopBarHeight;

  const leftPaneWidth = safeWindowWidth - clampedRightPanelWidth;
  const contentHeight = safeWindowHeight - clampedTopBarHeight;

  const browserViewBounds: DesktopShellBounds = {
    x: 0,
    y: clampedTopBarHeight,
    width: leftPaneWidth,
    height: contentHeight,
  };

  return {
    windowWidth: safeWindowWidth,
    windowHeight: safeWindowHeight,
    rightPanelWidth: clampedRightPanelWidth,
    topBarHeight: clampedTopBarHeight,
    leftPaneWidth: leftPaneWidth,
    contentHeight: contentHeight,
    browserViewBounds: browserViewBounds,
  };
}
