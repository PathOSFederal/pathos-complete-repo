/**
 * ============================================================================
 * PICK BEST TOUR TARGET (Day 36 - Tour targeting fix)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Selects the best element from multiple matches when a data-tour selector
 * returns multiple candidates. Implements viewport preference and size heuristics
 * to avoid selecting off-screen or near-fullscreen containers.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Utility Layer: Pure function for element selection logic
 * - Integration: Used by GuidedTourOverlay to resolve target elements
 *
 * KEY CONCEPTS:
 * - Multiple matches: When data-tour attribute appears on multiple elements
 * - Viewport preference: Prefer elements visible in viewport
 * - Size heuristic: Avoid near-fullscreen containers, prefer smaller targets
 * - Visibility filter: Only consider elements that are actually visible
 *
 * HOW IT WORKS:
 * 1. Filter candidates to only visible elements
 * 2. Prefer candidates in viewport (with padding, e.g., 12px)
 * 3. If multiple remain, apply size heuristic:
 *    - area = rect.width * rect.height
 *    - viewportArea = window.innerWidth * window.innerHeight
 *    - Prefer elements with area < 0.85 * viewportArea (avoid near-fullscreen)
 *    - From those, pick the smallest area (more specific target)
 * 4. Fallback: first visible candidate
 */

/**
 * Checks if an element is within the viewport bounds (with small padding).
 * Returns true if element is visible, false if off-screen.
 * 
 * @param element - Element to check
 * @param padding - Padding in pixels (default: 12)
 * @param viewportRect - Optional viewport dimensions (defaults to window.innerWidth/innerHeight)
 */
function isElementInViewport(
  element: Element,
  padding: number = 12,
  viewportRect?: { width: number; height: number }
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const rect = element.getBoundingClientRect();
  const viewportWidth = viewportRect !== undefined ? viewportRect.width : window.innerWidth;
  const viewportHeight = viewportRect !== undefined ? viewportRect.height : window.innerHeight;

  return (
    rect.top >= -padding &&
    rect.left >= -padding &&
    rect.bottom <= viewportHeight + padding &&
    rect.right <= viewportWidth + padding
  );
}

/**
 * Checks if an element is actually visible (not hidden by CSS).
 * Returns true if element is visible, false if hidden.
 */
function isElementVisible(element: Element): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const style = window.getComputedStyle(element);
  // Check if element is hidden by CSS
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  
  // Check if element has valid dimensions
  const rect = element.getBoundingClientRect();
  // Use <= 0 to catch negative values and be more defensive
  if (rect.width <= 0 || rect.height <= 0 || !isFinite(rect.width) || !isFinite(rect.height)) {
    return false;
  }
  
  return true;
}

/**
 * Picks the best element from a NodeList of candidates.
 * 
 * Selection logic:
 * 1. Filter to candidates that are visible
 * 2. Prefer candidates in the viewport (with padding, e.g., 12px)
 * 3. If multiple remain, apply a size heuristic:
 *    - area = rect.width * rect.height
 *    - viewportArea = window.innerWidth * window.innerHeight
 *    - Prefer elements with area < 0.85 * viewportArea (avoid near-fullscreen containers)
 *    - From those, pick the smallest area (more specific target)
 * 4. Fallback: first visible candidate
 * 
 * @param candidates - NodeList of candidate elements
 * @param viewportRect - Optional viewport dimensions (defaults to window.innerWidth/innerHeight)
 * @returns The best candidate element, or null if no valid candidates
 */
export function pickBestTourTarget(
  candidates: NodeListOf<Element>,
  viewportRect?: { width: number; height: number }
): Element | null {
  if (candidates.length === 0) {
    return null;
  }

  if (typeof window === 'undefined') {
    // SSR: return first candidate
    return candidates[0];
  }

  const viewportWidth = viewportRect !== undefined ? viewportRect.width : window.innerWidth;
  const viewportHeight = viewportRect !== undefined ? viewportRect.height : window.innerHeight;
  const viewportArea = viewportWidth * viewportHeight;
  const padding = 12;
  const maxArea = 0.85 * viewportArea;

  // Convert NodeList to array for reliable iteration
  const candidatesArray: Element[] = [];
  for (let i = 0; i < candidates.length; i++) {
    candidatesArray.push(candidates[i]);
  }

  // Step 1: Filter to visible candidates (not hidden, has valid dimensions)
  const visibleCandidates: Element[] = [];
  for (let i = 0; i < candidatesArray.length; i++) {
    const candidate = candidatesArray[i];
    if (isElementVisible(candidate)) {
      const rect = candidate.getBoundingClientRect();
      // Double-check dimensions
      if (rect.width > 0 && rect.height > 0 && isFinite(rect.width) && isFinite(rect.height)) {
        visibleCandidates.push(candidate);
      }
    }
  }

  if (visibleCandidates.length === 0) {
    return null;
  }

  if (visibleCandidates.length === 1) {
    return visibleCandidates[0];
  }

  // Step 2: Build candidate info with area and viewport status
  type CandidateInfo = { element: Element; area: number; inViewport: boolean };
  const candidateInfo: CandidateInfo[] = [];
  
  for (let i = 0; i < visibleCandidates.length; i++) {
    const candidate = visibleCandidates[i];
    const rect = candidate.getBoundingClientRect();
    const area = rect.width * rect.height;
    const inViewport = isElementInViewport(candidate, padding, viewportRect);
    candidateInfo.push({ element: candidate, area: area, inViewport: inViewport });
  }

  // Step 3: Separate by viewport status
  const inViewportCandidates = candidateInfo.filter(c => c.inViewport);

  // Step 4: Prefer in-viewport candidates if available
  const candidatesToConsider: CandidateInfo[] = inViewportCandidates.length > 0 
    ? inViewportCandidates 
    : candidateInfo;

  // Step 5: Filter to preferred candidates (area < maxArea to avoid near-fullscreen)
  const preferredCandidates = candidatesToConsider.filter(c => c.area < maxArea);

  if (preferredCandidates.length > 0) {
    // Sort by area ascending (smallest first) and return the first one
    preferredCandidates.sort((a, b) => a.area - b.area);
    return preferredCandidates[0].element;
  }
  
  // Step 6: Fallback: if no preferred candidates (all are near-fullscreen)
  // Sort: first by inViewport (true first), then by area (smaller first)
  if (candidatesToConsider.length > 0) {
    candidatesToConsider.sort((a, b) => {
      // Prefer in-viewport over off-screen
      if (a.inViewport && !b.inViewport) return -1;
      if (!a.inViewport && b.inViewport) return 1;
      // Both have same viewport status, prefer smaller area
      return a.area - b.area;
    });
    return candidatesToConsider[0].element;
  }
  
  // Final fallback (should not reach here)
  return visibleCandidates[0];
}
