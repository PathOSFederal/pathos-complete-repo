/**
 * ============================================================================
 * GUIDED HANDOFF UTILITIES (Day 35)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides utilities for cross-page handoff mechanism that PathAdvisor
 * (and other buttons) can use to guide the user to an exact section.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Utility Layer: Pure functions for URL parsing and DOM manipulation
 * - Used by: PathAdvisor CTAs, navigation buttons, page components
 *
 * KEY CONCEPTS:
 * - Handoff ID: Unique identifier for a target section (e.g., "save-search")
 * - Query parameter: ?handoff=<handoffId> in URL
 * - Target elements: Opt-in via data-handoff-target attribute
 * - Pulse highlight: Subtle glow ring/background pulse for ~1500ms
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. PathAdvisor CTA navigates with ?handoff=<id> query param
 * 2. Page loads, parseHandoffFromUrl() extracts the handoff ID
 * 3. scrollAndPulse() finds element with matching data-handoff-target
 * 4. Scrolls element into view (smooth if allowed)
 * 5. Applies pulse highlight for ~1500ms
 * 6. Clears handoff param from URL so it doesn't repeat
 *
 * WHY THIS DESIGN:
 * - Provides visual guidance when PathAdvisor sends user to specific section
 * - Calm and helpful: subtle pulse, no flashy animation
 * - Respects prefers-reduced-motion: static highlight if motion disabled
 * - Self-cleaning: removes query param after use
 *
 * @version Day 35 - Guided Handoff
 * ============================================================================
 */

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Options for scrollAndPulse function.
 */
export interface ScrollAndPulseOptions {
  /**
   * Duration of the pulse highlight in milliseconds.
   * Default: 1500ms
   */
  duration?: number;

  /**
   * Whether to use smooth scrolling.
   * Default: true (respects prefers-reduced-motion)
   */
  smooth?: boolean;
}

/**
 * ============================================================================
 * URL PARSING FUNCTIONS
 * ============================================================================
 */

/**
 * Parses the handoff ID from the current URL's query string.
 *
 * HOW IT WORKS:
 * 1. Gets current URL search params
 * 2. Looks for "handoff" parameter
 * 3. Returns the value if found, null otherwise
 *
 * EXAMPLE:
 * - URL: /job-search?handoff=save-search
 * - Returns: "save-search"
 *
 * - URL: /dashboard
 * - Returns: null
 *
 * @returns The handoff ID from URL, or null if not present
 */
export function parseHandoffFromUrl(): string | null {
  // SSR guard: return null during server-side rendering
  if (typeof window === 'undefined') {
    return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const handoffId = urlParams.get('handoff');

  return handoffId;
}

/**
 * Removes the handoff query parameter from the URL.
 *
 * HOW IT WORKS:
 * 1. Gets current URL and search params
 * 2. Removes "handoff" parameter
 * 3. Updates URL without page reload (using router.replace)
 *
 * WHY THIS EXISTS:
 * After the pulse runs once, we clear the handoff param so it doesn't
 * repeat on refresh or if user navigates back.
 *
 * @param router - Next.js AppRouterInstance for navigation
 */
export function clearHandoffFromUrl(router: AppRouterInstance): void {
  // SSR guard: do nothing during server-side rendering
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('handoff');

  // Use replace to avoid adding to history
  router.replace(url.pathname + url.search, { scroll: false });
}

/**
 * ============================================================================
 * SCROLL AND PULSE FUNCTIONS
 * ============================================================================
 */

/**
 * Checks if user prefers reduced motion.
 *
 * HOW IT WORKS:
 * 1. Checks window.matchMedia for prefers-reduced-motion
 * 2. Returns true if user prefers reduced motion
 *
 * @returns True if user prefers reduced motion, false otherwise
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Scrolls an element into view and applies a pulse highlight.
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. Finds element with data-handoff-target matching the handoffId
 * 2. Scrolls element into view (smooth if allowed and smooth=true)
 * 3. Applies pulse highlight class
 * 4. Removes highlight after duration
 * 5. If prefers-reduced-motion: uses static highlight, no animation
 *
 * WHY THIS DESIGN:
 * - Provides visual feedback that the target section was found
 * - Respects accessibility preferences (reduced motion)
 * - Self-cleaning: removes highlight class after duration
 *
 * @param handoffId - The handoff ID to find (matches data-handoff-target)
 * @param options - Options for scroll behavior and highlight duration
 * @returns True if element was found and highlighted, false otherwise
 */
export function scrollAndPulse(
  handoffId: string,
  options: ScrollAndPulseOptions = {}
): boolean {
  // SSR guard: do nothing during server-side rendering
  if (typeof window === 'undefined') {
    return false;
  }

  const duration = options.duration !== undefined ? options.duration : 1500;
  const smooth = options.smooth !== undefined ? options.smooth : true;

  // Find element with matching data-handoff-target attribute
  const selector = '[data-handoff-target="' + handoffId + '"]';
  const element = document.querySelector(selector);

  if (!element) {
    // Element not found - this is okay, just return false
    return false;
  }

  // Scroll into view
  // Use smooth scrolling only if user doesn't prefer reduced motion
  const shouldSmooth = smooth && !prefersReducedMotion();
  element.scrollIntoView({
    behavior: shouldSmooth ? 'smooth' : 'auto',
    block: 'center',
    inline: 'nearest',
  });

  // Apply pulse highlight
  // For reduced motion, use static highlight class
  // For normal motion, use animated pulse class
  const highlightClass = prefersReducedMotion()
    ? 'handoff-highlight-static'
    : 'handoff-highlight-pulse';

  element.classList.add(highlightClass);

  // Remove highlight after duration
  setTimeout(function () {
    element.classList.remove(highlightClass);
  }, duration);

  return true;
}

/**
 * ============================================================================
 * CONVENIENCE FUNCTION: Handle handoff on page load
 * ============================================================================
 */

/**
 * Handles handoff on page load: parses URL, scrolls and pulses, then clears URL.
 *
 * HOW IT WORKS:
 * 1. Parses handoff ID from URL
 * 2. If found, scrolls and pulses the target element
 * 3. Clears handoff param from URL after a short delay
 *
 * WHEN TO USE:
 * Call this in a useEffect on page load to handle handoff from navigation.
 *
 * EXAMPLE:
 * ```tsx
 * useEffect(function () {
 *   handleHandoffOnLoad(router);
 * }, [router]);
 * ```
 *
 * @param router - Next.js AppRouterInstance for clearing URL param
 * @param options - Options for scrollAndPulse behavior
 */
export function handleHandoffOnLoad(
  router: AppRouterInstance,
  options: ScrollAndPulseOptions = {}
): void {
  const handoffId = parseHandoffFromUrl();

  if (!handoffId) {
    // No handoff in URL, nothing to do
    return;
  }

  // Small delay to ensure DOM is ready
  setTimeout(function () {
    const found = scrollAndPulse(handoffId, options);

    // Clear URL param after a short delay (allows pulse to be visible)
    // Use longer delay if element was found (to see the pulse)
    const clearDelay = found ? 2000 : 100;
    setTimeout(function () {
      clearHandoffFromUrl(router);
    }, clearDelay);
  }, 100);
}







