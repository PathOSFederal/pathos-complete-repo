/**
 * ============================================================================
 * RESUME BUILDER FOCUS HANDLER
 * ============================================================================
 *
 * FILE PURPOSE:
 * This client-side component handles deep-link focus behavior for the Resume
 * Builder page. When a user clicks "Fix now" from the Career page, this
 * component reads the `resumeFocus` query param and:
 *   1. Navigates to the correct resume builder step
 *   2. Scrolls to the target section
 *   3. Adds a temporary highlight effect
 *   4. Removes the query param to prevent re-scroll on refresh
 *
 * WHY THIS EXISTS:
 * App Router pages in Next.js are server components by default, so any
 * focus/scroll behavior that depends on the DOM must live in a client
 * component. This handler is rendered as a child of the Resume Builder page.
 *
 * HOW IT WORKS (step by step):
 * 1. On mount, read `resumeFocus` from URL search params
 * 2. Map the focus key to a step index and DOM selector
 * 3. If the current step doesn't match, trigger step navigation first
 * 4. Wait for the target element to exist in the DOM (retry loop)
 * 5. Scroll the element into view (using container or window fallback)
 * 6. Add a highlight class to the element for 1.5 seconds
 * 7. Replace the URL to remove the query param (prevents re-scroll)
 *
 * FOCUS KEY MAPPING:
 * The `resumeFocus` param maps to specific sections within steps:
 *   - 'profile' -> Step 0, no sub-section
 *   - 'target-roles' -> Step 1, no sub-section
 *   - 'work-experience' / 'experience' -> Step 2, no sub-section
 *   - 'education' -> Step 3, no sub-section
 *   - 'skills' -> Step 4, skills sub-section
 *   - 'certifications' -> Step 4, certifications sub-section
 *   - 'languages' -> Step 4, languages sub-section
 *   - 'ksas' -> Step 4, ksas sub-section
 *
 * SCROLL STRATEGY:
 * 1. First, check for a scroll container with `data-resume-scroll-container`
 * 2. If found, scroll within that container
 * 3. If not found, use `element.scrollIntoView()` as fallback
 *
 * @version Day 14 - ResumeFocus Deep-Link Scroll + Highlight Bugfix
 */

'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * FocusMapping defines the relationship between a focus key and its
 * corresponding step index and DOM selector.
 */
interface FocusMapping {
  /** The resume builder step index (0-based) */
  stepIndex: number;
  /** The DOM selector to find the target element (null = step container) */
  selector: string | null;
}

/**
 * FOCUS_KEY_MAP
 * 
 * This mapping defines how each `resumeFocus` value maps to:
 *   - stepIndex: Which wizard step to navigate to (0-5)
 *   - selector: Which sub-section to scroll to within that step
 *
 * WHY SEPARATE FROM STEPS:
 * The Resume Builder has 6 main steps, but some steps have multiple
 * sub-sections (like Skills which has Technical Skills, Certifications,
 * Languages, and KSAs). This map allows deep-linking to specific sections.
 *
 * EXAMPLE:
 *   resumeFocus=certifications
 *   -> stepIndex: 4 (Skills step)
 *   -> selector: '[data-resume-section="certifications"]'
 */
export const FOCUS_KEY_MAP: Record<string, FocusMapping> = {
  // Step 0: Profile
  'profile': { stepIndex: 0, selector: null },
  'contact': { stepIndex: 0, selector: null },
  
  // Step 1: Target Roles
  'target-roles': { stepIndex: 1, selector: null },
  'roles': { stepIndex: 1, selector: null },
  
  // Step 2: Work Experience
  'work-experience': { stepIndex: 2, selector: null },
  'experience': { stepIndex: 2, selector: null },
  'federal-experience': { stepIndex: 2, selector: null },
  
  // Step 3: Education
  'education': { stepIndex: 3, selector: null },
  
  // Step 4: Skills (with sub-sections)
  'skills': { stepIndex: 4, selector: '[data-resume-section="skills"]' },
  'technical-skills': { stepIndex: 4, selector: '[data-resume-section="skills"]' },
  'certifications': { stepIndex: 4, selector: '[data-resume-section="certifications"]' },
  'languages': { stepIndex: 4, selector: '[data-resume-section="languages"]' },
  'ksas': { stepIndex: 4, selector: '[data-resume-section="ksas"]' },
  'awards': { stepIndex: 4, selector: '[data-resume-section="certifications"]' },
  
  // Step 5: Review & Export
  'review': { stepIndex: 5, selector: null },
};

/**
 * Resolves a focus key to its step index and selector.
 * 
 * WHY THIS FUNCTION:
 * Provides a clean API for the focus handler and makes testing easier.
 * Unknown keys return null, which signals the handler to skip focusing.
 *
 * @param focusKey - The value from the `resumeFocus` query param
 * @returns FocusMapping or null if the key is unknown
 *
 * EXAMPLE:
 *   resolveFocusKey('certifications')
 *   -> { stepIndex: 4, selector: '[data-resume-section="certifications"]' }
 *
 *   resolveFocusKey('unknown-key')
 *   -> null
 */
export function resolveFocusKey(focusKey: string): FocusMapping | null {
  // Normalize the key: lowercase and trim whitespace
  const normalizedKey = focusKey.toLowerCase().trim();
  
  // Look up in the map
  const mapping = FOCUS_KEY_MAP[normalizedKey];
  
  // Return the mapping or null if not found
  if (mapping !== undefined) {
    return mapping;
  }
  return null;
}

/**
 * Props for the ResumeBuilderFocusHandler component.
 */
interface ResumeBuilderFocusHandlerProps {
  /** Current step index from the parent (for conditional navigation) */
  currentStep: number;
  /** Callback to change the step (passed from parent) */
  onStepChange: (stepIndex: number) => void;
}

/**
 * ResumeBuilderFocusHandler Component
 *
 * RENDERING:
 * This component renders nothing (returns null). It only exists to
 * run the focus effect on mount.
 *
 * LIFECYCLE:
 * 1. Mount: Read query params, resolve mapping, trigger focus
 * 2. Focus complete: Remove query param, component stays mounted
 * 3. Unmount: Cleanup any pending timeouts
 *
 * SSR SAFETY:
 * All DOM access is inside useEffect, which only runs on the client.
 * The component itself can be rendered on the server without issues.
 */
export function ResumeBuilderFocusHandler(props: ResumeBuilderFocusHandlerProps) {
  const currentStep = props.currentStep;
  const onStepChange = props.onStepChange;
  
  // Next.js hooks for URL reading and manipulation
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Track if we've already processed the focus to avoid double-processing
  const hasProcessedRef = useRef(false);
  
  /**
   * Main effect: Handle focus behavior on mount or when resumeFocus changes.
   *
   * WHY useEffect:
   * - DOM access must happen client-side only
   * - We need to wait for the component to mount before reading params
   * - The effect runs after the first render, ensuring DOM is ready
   */
  useEffect(function handleFocusEffect() {
    // ========================================================================
    // STEP 1: Read the resumeFocus query parameter
    // ========================================================================
    const resumeFocus = searchParams.get('resumeFocus');
    
    // If no focus param, nothing to do
    if (!resumeFocus) {
      return;
    }
    
    // If we've already processed this focus, skip
    // This prevents re-running if the effect fires multiple times
    if (hasProcessedRef.current) {
      return;
    }
    
    // ========================================================================
    // STEP 2: Resolve the focus key to step and selector
    // ========================================================================
    const mapping = resolveFocusKey(resumeFocus);
    
    // If the key is unknown, log and bail
    // We don't throw an error - graceful degradation is preferred
    if (!mapping) {
      console.warn('[ResumeBuilderFocusHandler] Unknown focus key:', resumeFocus);
      return;
    }
    
    // Mark as processed to prevent re-running
    hasProcessedRef.current = true;
    
    // ========================================================================
    // STEP 3: Extract mapping values to local constants
    // ========================================================================
    // TypeScript doesn't track narrowing into nested closures, so we
    // extract the values to local constants that are guaranteed non-null
    const targetStepIndex = mapping.stepIndex;
    const targetSelector = mapping.selector;
    
    // ========================================================================
    // STEP 4: Navigate to the correct step if needed
    // ========================================================================
    // If the target step is different from the current step, navigate first
    // The step change will trigger a re-render, and we'll continue from there
    if (currentStep !== targetStepIndex) {
      onStepChange(targetStepIndex);
      // Don't return here - we want to continue with scroll/highlight
      // The step change is synchronous via useState, so the DOM will update
    }
    
    // ========================================================================
    // STEP 4: Wait for the target element to exist (with retry loop)
    // ========================================================================
    // We use a retry loop because:
    // - React may not have rendered the new step content yet
    // - CSS transitions or animations may delay element visibility
    // - Collapsible sections may need to expand
    
    // Configuration for the retry loop
    const MAX_RETRIES = 10;         // Maximum attempts to find the element
    const RETRY_INTERVAL_MS = 100;  // Milliseconds between retries
    const HIGHLIGHT_DURATION_MS = 1500; // How long the highlight stays
    
    let retryCount = 0;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    
    /**
     * attemptFocus: Try to find and focus the target element.
     *
     * WHY RETRY LOOP:
     * After a step change, React needs time to render the new content.
     * We use requestAnimationFrame + setTimeout to give the DOM time to update.
     */
    function attemptFocus() {
      // Determine the target selector
      // If targetSelector has a specific selector, use it
      // Otherwise, use a generic step container selector
      let targetElement: Element | null = null;
      
      if (targetSelector) {
        // Find the specific section within the step
        targetElement = document.querySelector(targetSelector);
      } else {
        // No specific selector - find the step container
        // The step content is rendered in the main content area
        // We scroll to the top of the step content
        targetElement = document.querySelector('[data-resume-step-content]');
      }
      
      // If element not found and we have retries left, schedule another attempt
      if (!targetElement && retryCount < MAX_RETRIES) {
        retryCount++;
        retryTimeoutId = setTimeout(attemptFocus, RETRY_INTERVAL_MS);
        return;
      }
      
      // If still not found after all retries, log and bail
      if (!targetElement) {
        console.warn(
          '[ResumeBuilderFocusHandler] Could not find target element after',
          MAX_RETRIES,
          'retries. Selector:',
          targetSelector
        );
        // Still remove the query param to prevent infinite attempts on refresh
        removeQueryParam();
        return;
      }
      
      // ======================================================================
      // STEP 5: Scroll to the target element
      // ======================================================================
      scrollToElement(targetElement);
      
      // ======================================================================
      // STEP 6: Add highlight effect
      // ======================================================================
      addHighlight(targetElement, HIGHLIGHT_DURATION_MS);
      
      // ======================================================================
      // STEP 7: Remove the query param to prevent re-scroll on refresh
      // ======================================================================
      removeQueryParam();
    }
    
    /**
     * scrollToElement: Scroll the target element into view.
     *
     * STRATEGY:
     * 1. Look for a custom scroll container (data-resume-scroll-container)
     * 2. If found, calculate offset and scroll the container
     * 3. If not found, use native scrollIntoView()
     *
     * WHY CUSTOM CONTAINER:
     * Dashboard layouts often have a fixed header and scrollable main area.
     * We need to scroll the correct container, not window.
     */
    function scrollToElement(element: Element) {
      // Check for a custom scroll container
      const scrollContainer = document.querySelector('[data-resume-scroll-container="true"]');
      
      if (scrollContainer) {
        // Calculate the element's position relative to the container
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Calculate the scroll offset
        // We want some padding at the top (16px) so the element isn't flush
        const scrollTop = scrollContainer.scrollTop;
        const offsetTop = elementRect.top - containerRect.top + scrollTop - 16;
        
        // Smooth scroll the container
        scrollContainer.scrollTo({
          top: offsetTop,
          behavior: 'smooth',
        });
      } else {
        // Fallback: use native scrollIntoView
        // This works when the page scrolls with window
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
    
    /**
     * addHighlight: Add a temporary highlight class to the element.
     *
     * HOW IT WORKS:
     * 1. Add the 'resume-focus-highlight' class
     * 2. After duration, remove the class
     *
     * CSS REQUIREMENT:
     * The global CSS must define the .resume-focus-highlight class
     * with appropriate styling (e.g., ring, background pulse).
     */
    function addHighlight(element: Element, durationMs: number) {
      // Add the highlight class
      element.classList.add('resume-focus-highlight');
      
      // Schedule removal of the highlight
      setTimeout(function removeHighlightClass() {
        element.classList.remove('resume-focus-highlight');
      }, durationMs);
    }
    
    /**
     * removeQueryParam: Remove resumeFocus from the URL.
     *
     * WHY:
     * After focusing, we don't want the param to persist.
     * If the user refreshes, they shouldn't re-scroll.
     *
     * HOW:
     * Use router.replace() to update the URL without navigation.
     */
    function removeQueryParam() {
      // Get the current URL
      const currentPath = window.location.pathname;
      
      // Build new search params without resumeFocus
      const newParams = new URLSearchParams();
      searchParams.forEach(function copyParam(value, key) {
        if (key !== 'resumeFocus') {
          newParams.set(key, value);
        }
      });
      
      // Build the new URL
      const newSearch = newParams.toString();
      const newUrl = newSearch ? currentPath + '?' + newSearch : currentPath;
      
      // Replace the URL without triggering navigation
      router.replace(newUrl, { scroll: false });
    }
    
    // Start the focus process
    // Use requestAnimationFrame to ensure we're in a fresh paint cycle
    // This helps when the step just changed and React is updating the DOM
    requestAnimationFrame(function afterPaint() {
      // Add a small delay to let React complete its update
      setTimeout(attemptFocus, 50);
    });
    
    // Cleanup function: cancel any pending retries
    return function cleanup() {
      if (retryTimeoutId !== null) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [searchParams, router, currentStep, onStepChange]);
  
  // This component renders nothing - it's purely for side effects
  return null;
}

export default ResumeBuilderFocusHandler;
