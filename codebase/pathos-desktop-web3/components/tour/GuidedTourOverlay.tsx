/**
 * ============================================================================
 * GUIDED TOUR OVERLAY (Day 36 - Advisor-led Guided Tour Mode)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Renders a spotlight overlay that highlights key dashboard areas and shows
 * educational tooltips. Uses stable data-tour attributes for targeting instead
 * of brittle CSS selectors.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - UI Layer: Overlay component for guided tour mode
 * - Integration: Used in dashboard/page.tsx when tour is active
 * - State: Reads from guidedTourStore for tour state and steps
 *
 * KEY CONCEPTS:
 * - Spotlight pattern: Dims background, highlights target element
 * - data-tour selector: Uses querySelector(`[data-tour="${targetTourId}"]`) for stable targeting
 * - Tooltip positioning: Places tooltip near highlighted element based on placement prop
 * - Responsive: Recomputes position on resize/scroll
 *
 * HOW IT WORKS:
 * 1. When isTourActive, renders full-screen overlay with dimmed background
 * 2. Finds target element using data-tour attribute selector
 * 3. Computes bounding rect of target element
 * 4. Renders highlight ring around target (spotlight effect)
 * 5. Renders tooltip with title, body, and navigation controls (Back, Next, Skip)
 * 6. Handles missing elements gracefully (centers tooltip, allows navigation)
 * 7. Listens for resize/scroll events to recompute position
 *
 * DESIGN PRINCIPLES:
 * - Stable selectors (data-tour attributes, not CSS classes)
 * - Graceful degradation (works even if target element is missing)
 * - Consistent styling with theme and accent colors
 * - Accessible (keyboard navigation support)
 */

'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGuidedTourStore, selectIsTourActive, selectCurrentStep } from '@/store/guidedTourStore';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickBestTourTarget } from '@/lib/guided-tour/pickBestTourTarget';

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Checks if an element is within the viewport bounds (with small padding).
 * Returns true if element is visible, false if off-screen.
 */
function isElementInViewport(element: Element, padding: number = 12): boolean {
  const rect = element.getBoundingClientRect();
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

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
 * Also checks if element has meaningful content (not just an empty container).
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
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }
  
  // Check if element has meaningful content
  // For containers, check if they have visible children or scrollable content
  const htmlElement = element as HTMLElement;
  
  // Check minimum size threshold - elements smaller than this are likely not fully rendered
  // Day 36 Fix: Lowered from 50px to 30px to allow sidebar nav items (~36-44px height) to pass
  // Sidebar nav items are valid targets even if they're smaller than 50px
  const minSize = 30; // Minimum 30px in both dimensions (allows nav items)
  if (rect.width < minSize || rect.height < minSize) {
    return false;
  }
  
  // Day 36 Fix: For link elements (like sidebar nav items), they're valid even without children
  // Links are valid targets if they have text content, regardless of children
  const tagName = htmlElement.tagName.toLowerCase();
  const isLink = tagName === 'a' || tagName === 'button';
  
  if (htmlElement.children.length === 0) {
    // Empty container - check if it has text content
    const textContent = htmlElement.textContent;
    if (!textContent || textContent.trim().length === 0) {
      // For links/buttons, allow them if they have valid dimensions (they might have icon-only content)
      if (isLink && rect.width >= minSize && rect.height >= minSize) {
        return true;
      }
      // Check scrollHeight as a fallback (might have content that's not yet measured)
      if (htmlElement.scrollHeight === 0 && htmlElement.scrollWidth === 0) {
        return false;
      }
    }
  } else {
    // Has children - check if at least one child is visible and has meaningful size
    let hasVisibleChild = false;
    for (let i = 0; i < htmlElement.children.length; i++) {
      const child = htmlElement.children[i];
      const childStyle = window.getComputedStyle(child);
      const childRect = child.getBoundingClientRect();
      if (
        childStyle.display !== 'none' &&
        childStyle.visibility !== 'hidden' &&
        childStyle.opacity !== '0' &&
        childRect.width >= 8 &&
        childRect.height >= 8
      ) {
        hasVisibleChild = true;
        break;
      }
    }
    // Day 36 Fix: For links/buttons, allow them even without visible children if they have valid dimensions
    if (!hasVisibleChild && !(isLink && rect.width >= minSize && rect.height >= minSize)) {
      return false;
    }
  }
  
  return true;
}

/**
 * ============================================================================
 * TOUR STEP TARGET CONFIGURATION
 * ============================================================================
 * Maps tour step IDs to their primary selector and optional fallback selectors.
 * Fallback selectors are used when the primary target is not found (e.g., if
 * the user is on a different page, fall back to sidebar nav item).
 */
const TOUR_TARGET_CONFIG: Record<
  string,
  {
    primary: string;
    fallbacks?: string[];
  }
> = {
  'pathadvisor-panel': {
    primary: '[data-tour="pathadvisor-panel"]',
  },
  'mission-card': {
    primary: '[data-tour="mission-card"]',
  },
  'nav-career-resume': {
    primary: '[data-tour="nav-career-resume"]',
  },
  'nav-job-search': {
    primary: '[data-tour="nav-job-search"]',
    fallbacks: ['[data-tour="nav-career-resume"]'], // Fallback to Career & Resume nav if Job Search not found
  },
  'nav-resume-builder': {
    primary: '[data-tour="nav-resume-builder"]',
    fallbacks: ['[data-tour="nav-career-resume"]'], // Fallback to Career & Resume nav if Resume Builder not found
  },
  'nav-benefits': {
    primary: '[data-tour="nav-benefits"]',
    // Day 36 Fix: No fallback needed - sidebar nav item should always be available
  },
  'nav-alerts': {
    primary: '[data-tour="nav-alerts"]',
    // Day 36 Fix: No fallback needed - sidebar nav item should always be available
  },
  'nav-import': {
    primary: '[data-tour="nav-import"]',
    // Day 36 Fix: No fallback needed - sidebar nav item should always be available
  },
};

/**
 * Resolves target element by trying primary selector first, then fallback selectors.
 * Uses querySelectorAll to find all matches, then picks the best candidate using
 * viewport preference and size heuristics.
 * Retries up to maxRetries times using requestAnimationFrame if no elements are found.
 * Returns a Promise that resolves to the element or null if still missing after retries.
 * Also checks for element visibility and valid dimensions.
 * 
 * Day 36: Enhanced with fallback selector support to avoid "not currently visible" messages.
 */
function resolveTargetElement(targetTourId: string, maxRetries: number = 50): Promise<Element | null> {
  const config = TOUR_TARGET_CONFIG[targetTourId];
  if (!config) {
    // Fallback to legacy behavior if no config exists
    const selector = '[data-tour="' + targetTourId + '"]';
    return resolveTargetWithSelector(selector, maxRetries);
  }

  // Try primary selector first
  return resolveTargetWithSelector(config.primary, maxRetries).then(function (element) {
    if (element) {
      return element;
    }

    // If primary not found and fallbacks exist, try fallbacks
    const fallbacks = config.fallbacks;
    if (fallbacks !== undefined && fallbacks.length > 0) {
      // Try each fallback in order
      const fallbacksArray = fallbacks; // TypeScript now knows this is defined
      let fallbackIndex = 0;
      return new Promise<Element | null>(function (resolve) {
        function tryNextFallback() {
          if (fallbackIndex >= fallbacksArray.length) {
            resolve(null);
            return;
          }

          const fallbackSelector = fallbacksArray[fallbackIndex];
          resolveTargetWithSelector(fallbackSelector, 15).then(function (fallbackElement) {
            if (fallbackElement) {
              resolve(fallbackElement);
            } else {
              fallbackIndex = fallbackIndex + 1;
              requestAnimationFrame(tryNextFallback);
            }
          });
        }
        tryNextFallback();
      });
    }

    return null;
  });
}

/**
 * Helper function that resolves a target element using a single selector.
 * Used by resolveTargetElement to try primary and fallback selectors.
 */
function resolveTargetWithSelector(selector: string, maxRetries: number = 30): Promise<Element | null> {
  // First try: immediate query
  const allMatches = document.querySelectorAll(selector);
  if (allMatches.length > 0) {
    const bestElement = pickBestTourTarget(allMatches);
    if (bestElement && isElementVisible(bestElement)) {
      // Dev-only diagnostics: warn if multiple matches
      if (process.env.NODE_ENV !== 'production' && allMatches.length > 1) {
        console.warn(
          '[GuidedTourOverlay] Multiple matches for selector "' +
            selector +
            '". Using best candidate.'
        );
      }
      return Promise.resolve(bestElement);
    }
  }

  // Retry logic: element might not be rendered yet
  let retryCount = 0;
  return new Promise<Element | null>(function (resolve) {
    function tryResolve() {
      const allMatches = document.querySelectorAll(selector);
      if (allMatches.length > 0) {
        const bestElement = pickBestTourTarget(allMatches);
        if (bestElement && isElementVisible(bestElement)) {
          // Dev-only diagnostics: warn if multiple matches
          if (process.env.NODE_ENV !== 'production' && allMatches.length > 1) {
            console.warn(
              '[GuidedTourOverlay] Multiple matches for selector "' +
                selector +
                '". Using best candidate.'
            );
          }
          resolve(bestElement);
          return;
        }
      }
      
      if (retryCount < maxRetries) {
        retryCount = retryCount + 1;
        requestAnimationFrame(tryResolve);
      } else {
        resolve(null);
      }
    }
    requestAnimationFrame(tryResolve);
  });
}

/**
 * Gets the bounding rectangle of an element, accounting for scroll position.
 */
function getElementRect(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  return rect;
}

/**
 * Finds the nearest scrollable container for an element.
 * Checks parent elements up to document.body to find the first scrollable container.
 * Returns the element itself if it's scrollable, or the nearest scrollable ancestor.
 * Day 36: Enhanced to properly identify scroll containers for better scrollIntoView behavior.
 */
function findScrollContainer(element: Element): Element | null {
  if (typeof window === 'undefined') {
    return null;
  }

  let current: Element | null = element;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    
    // Check if element is scrollable (has overflow and scrollable content)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') ||
      (overflowX === 'auto' || overflowX === 'scroll')
    ) {
      // Verify it actually has scrollable content
      const hasScrollableContent = current.scrollHeight > current.clientHeight || current.scrollWidth > current.clientWidth;
      if (hasScrollableContent) {
        return current;
      }
    }
    
    current = current.parentElement;
  }
  
  // Fallback to window/document scrolling
  return document.documentElement;
}

/**
 * Scrolls an element into view, using the nearest scroll container.
 * Day 36: Enhanced to find and use the correct scroll container instead of assuming window scroll.
 */
function scrollTargetIntoView(element: Element): void {
  if (typeof window === 'undefined') {
    return;
  }

  const scrollContainer = findScrollContainer(element);
  
  // If we found a scroll container, try to scroll within it
  if (scrollContainer && scrollContainer !== document.documentElement) {
    // For non-document scroll containers, we need to calculate relative position
    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Calculate position relative to container
    const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
    const relativeLeft = elementRect.left - containerRect.left + scrollContainer.scrollLeft;
    
    // Scroll to center the element in the container
    const containerHeight = scrollContainer.clientHeight;
    const containerWidth = scrollContainer.clientWidth;
    const elementHeight = elementRect.height;
    const elementWidth = elementRect.width;
    
    scrollContainer.scrollTo({
      top: relativeTop - (containerHeight / 2) + (elementHeight / 2),
      left: relativeLeft - (containerWidth / 2) + (elementWidth / 2),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  } else {
    // Use standard scrollIntoView for document-level scrolling
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'center',
    });
  }
}

/**
 * Calculates tooltip position based on target element rect and placement preference.
 * Returns coordinates and final placement (may flip if overflow would occur).
 * Clamps tooltip within viewport with padding.
 */
function calculateTooltipPosition(
  targetRect: DOMRect,
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center',
  tooltipWidth: number,
  tooltipHeight: number
): { top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' | 'center' } {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const padding = 12;

  let top = 0;
  let left = 0;
  let finalPlacement: 'top' | 'bottom' | 'left' | 'right' | 'center' = placement;

  if (placement === 'top') {
    top = targetRect.top - tooltipHeight - padding;
    left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    // Flip to bottom if would overflow top
    if (top < padding) {
      finalPlacement = 'bottom';
      top = targetRect.bottom + padding;
    }
  } else if (placement === 'bottom') {
    top = targetRect.bottom + padding;
    left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    // Flip to top if would overflow bottom
    if (top + tooltipHeight > viewportHeight - padding) {
      finalPlacement = 'top';
      top = targetRect.top - tooltipHeight - padding;
    }
  } else if (placement === 'left') {
    top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
    left = targetRect.left - tooltipWidth - padding;
    // Flip to right if would overflow left
    if (left < padding) {
      finalPlacement = 'right';
      left = targetRect.right + padding;
    }
  } else if (placement === 'right') {
    top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
    left = targetRect.right + padding;
    // Flip to left if would overflow right
    if (left + tooltipWidth > viewportWidth - padding) {
      finalPlacement = 'left';
      left = targetRect.left - tooltipWidth - padding;
    }
  } else {
    // center: fallback to centered in viewport
    top = viewportHeight / 2 - tooltipHeight / 2;
    left = viewportWidth / 2 - tooltipWidth / 2;
  }

  // Clamp to viewport bounds
  top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));
  left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));

  return { top, left, placement: finalPlacement };
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function GuidedTourOverlay() {
  // ============================================================================
  // SSR GUARD: Portal requires client-side DOM
  // ============================================================================
  // Portal to document.body requires the DOM to be available, so we guard
  // against SSR by only rendering after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(function () {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR guard requires effect
    setMounted(true);
  }, []);

  const isTourActive = useGuidedTourStore(selectIsTourActive);
  const currentStep = useGuidedTourStore(selectCurrentStep);
  const nextStep = useGuidedTourStore(function (state) {
    return state.nextStep;
  });
  const prevStep = useGuidedTourStore(function (state) {
    return state.prevStep;
  });
  const skipTour = useGuidedTourStore(function (state) {
    return state.skipTour;
  });
  const steps = useGuidedTourStore(function (state) {
    return state.steps;
  });
  const stepIndex = useGuidedTourStore(function (state) {
    return state.stepIndex;
  });

  // Track target element position for spotlight and tooltip
  // Use state for position tracking (updated via layout effect to avoid setState-in-effect warning)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetNotFoundMessage, setTargetNotFoundMessage] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Track current step to prevent stale updates
  const currentStepRef = useRef<string | null>(null);
  
  // ============================================================================
  // TOUR LOCK: Save/restore focus and manage app content lock
  // ============================================================================
  // Day 36: When tour is active, save the previously focused element and restore
  // it when tour ends. Also manage scroll lock and app content inert state.
  const savedFocusRef = useRef<HTMLElement | null>(null);
  const appContentRef = useRef<HTMLElement | null>(null);

  // ============================================================================
  // SCROLL LOCK AND APP CONTENT LOCK (Day 36)
  // ============================================================================
  // When tour is active:
  // 1. Lock body scroll (overflow: hidden)
  // 2. Make app content inert (pointer-events: none, aria-hidden, inert)
  // 3. Save current focus to restore later
  // When tour ends: restore everything
  useEffect(
    function manageTourLock() {
      if (!mounted) {
        return;
      }

      if (isTourActive) {
        // Save current focus before locking
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
          savedFocusRef.current = activeElement;
        }

        // Lock body scroll
        const originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('tour-locked');

        // Day 36: Use stable data-app-root selector for app content container
        // This avoids brittle class-based logic and ensures reliable targeting
        // The app root is marked with data-app-root="true" in AppShell component
        const appContent = document.querySelector('[data-app-root="true"]') as HTMLElement | null;

        // If we found app content, make it inert
        if (appContent) {
          appContentRef.current = appContent;
          
          // Try to use inert attribute (preferred, but may need type casting)
          // TypeScript doesn't have inert in HTMLElement type yet, so we use unknown
          try {
            const elementWithInert = appContent as unknown as { inert?: boolean };
            elementWithInert.inert = true;
          } catch {
            // Fallback if inert is not supported
            appContent.setAttribute('aria-hidden', 'true');
          }
          
          // Apply pointer-events: none to prevent clicks
          const originalPointerEvents = appContent.style.pointerEvents;
          appContent.style.pointerEvents = 'none';
          
          // Store original values for restoration
          // Use unknown type to store custom property
          const elementWithStorage = appContent as unknown as { __tourOriginalPointerEvents?: string };
          elementWithStorage.__tourOriginalPointerEvents = originalPointerEvents;
        }

        // Move focus to tour popover (first focusable element)
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(function () {
          if (tooltipRef.current) {
            const firstButton = tooltipRef.current.querySelector('button');
            if (firstButton) {
              firstButton.focus();
            } else {
              // Fallback: focus the tooltip container itself
              tooltipRef.current.focus();
            }
          }
        });

        // Cleanup function: restore everything when tour ends
        return function cleanup() {
          // Restore body scroll
          document.body.style.overflow = originalBodyOverflow;
          document.body.classList.remove('tour-locked');

          // Restore app content
          if (appContentRef.current) {
            const appContent = appContentRef.current;
            
            // Remove inert
            try {
              const elementWithInert = appContent as unknown as { inert?: boolean };
              elementWithInert.inert = false;
            } catch {
              appContent.removeAttribute('aria-hidden');
            }
            
            // Restore pointer-events
            const elementWithStorage = appContent as unknown as { __tourOriginalPointerEvents?: string };
            const originalPointerEvents = elementWithStorage.__tourOriginalPointerEvents;
            if (originalPointerEvents !== undefined) {
              appContent.style.pointerEvents = originalPointerEvents;
            } else {
              appContent.style.pointerEvents = '';
            }
            
            appContentRef.current = null;
          }

          // Restore focus
          if (savedFocusRef.current) {
            try {
              savedFocusRef.current.focus();
            } catch {
              // Focus restoration may fail if element was removed
            }
            savedFocusRef.current = null;
          }
        };
      } else {
        // Tour is not active - ensure everything is unlocked
        document.body.style.overflow = '';
        document.body.classList.remove('tour-locked');
        
        if (appContentRef.current) {
          const appContent = appContentRef.current;
          try {
            const elementWithInert = appContent as unknown as { inert?: boolean };
            elementWithInert.inert = false;
          } catch {
            appContent.removeAttribute('aria-hidden');
          }
          const elementWithStorage = appContent as unknown as { __tourOriginalPointerEvents?: string };
          const originalPointerEvents = elementWithStorage.__tourOriginalPointerEvents;
          if (originalPointerEvents !== undefined) {
            appContent.style.pointerEvents = originalPointerEvents;
          } else {
            appContent.style.pointerEvents = '';
          }
          appContentRef.current = null;
        }
        
        if (savedFocusRef.current) {
          try {
            savedFocusRef.current.focus();
          } catch {
            // Focus restoration may fail
          }
          savedFocusRef.current = null;
        }
      }
    },
    [isTourActive, mounted]
  );

  // ============================================================================
  // FOCUS TRAPPING (Day 36)
  // ============================================================================
  // Trap focus within the tour popover when tour is active.
  // Tab/Shift+Tab should cycle through popover buttons only.
  useEffect(
    function trapFocus() {
      if (!isTourActive || !mounted || !tooltipRef.current) {
        return;
      }

      const tooltip = tooltipRef.current;

      function handleKeyDown(event: KeyboardEvent) {
        // Only handle Tab key
        if (event.key !== 'Tab') {
          return;
        }

        // Get all focusable elements within the tooltip
        const focusableSelectors = [
          'button:not([disabled])',
          'a[href]',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ];
        const focusableElements: HTMLElement[] = [];
        for (let i = 0; i < focusableSelectors.length; i++) {
          const selector = focusableSelectors[i];
          const elements = tooltip.querySelectorAll(selector);
          for (let j = 0; j < elements.length; j++) {
            const element = elements[j];
            if (element instanceof HTMLElement) {
              focusableElements.push(element);
            }
          }
        }

        if (focusableElements.length === 0) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const currentElement = document.activeElement;

        // If Shift+Tab on first element, wrap to last
        if (event.shiftKey && currentElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
          return;
        }

        // If Tab on last element, wrap to first
        if (!event.shiftKey && currentElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
          return;
        }

        // If focus is outside tooltip, move it to first element
        if (!tooltip.contains(currentElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }

      // Add event listener with capture to catch Tab before it bubbles
      document.addEventListener('keydown', handleKeyDown, true);

      return function cleanup() {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    },
    [isTourActive, mounted]
  );

      // Update target position using layout effect (runs synchronously before paint)
      // We need to measure DOM elements which requires effects, and update state based on measurements
      useLayoutEffect(
        function updateTargetPosition() {
          if (!isTourActive || !currentStep) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement requires effect
            setTargetRect(null);
            setTargetNotFoundMessage(null);
            currentStepRef.current = null;
            return;
          }

      // Track current step to prevent stale updates
      const stepId = currentStep.targetTourId;
      currentStepRef.current = stepId;

      // Day 36 Fix: Add small delay to ensure DOM is fully ready, especially for sidebar nav items
      // This helps when tour starts immediately after page load
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          // Resolve target element with retry logic
          // Day 36 Fix: Increased retries to 50 to ensure sidebar nav items are found
          resolveTargetElement(stepId, 50).then(function (targetElement) {
        // Check if this is still the current step (prevent stale updates)
        if (currentStepRef.current !== stepId) {
          return;
        }

        if (!targetElement) {
          // Target element not found - set to null (tooltip will center)
          if (currentStepRef.current === stepId) {
            setTargetRect(null);
            setTargetNotFoundMessage('This item is not currently visible.');
          }
          return;
        }

        const rect = getElementRect(targetElement);

        // Double-check element is still visible and has valid dimensions
        // Day 36 Fix: Lowered minVisibleSize from 50px to 30px to allow sidebar nav items
        const minVisibleSize = 30; // Minimum 30px to be considered visible (allows nav items)
        if (
          !isElementVisible(targetElement) ||
          rect.width < minVisibleSize ||
          rect.height < minVisibleSize
        ) {
          if (currentStepRef.current === stepId) {
            setTargetRect(null);
            setTargetNotFoundMessage('This item is not currently visible.');
          }
          return;
        }

        // Check if element is in viewport, scroll into view if needed
        // Day 36: Use enhanced scrollTargetIntoView that finds the correct scroll container
        if (!isElementInViewport(targetElement, 12)) {
          scrollTargetIntoView(targetElement);

          // Wait for scroll to complete, then recompute rect
          // Use multiple animation frames to ensure scroll completes
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const scrollTimeout = prefersReducedMotion ? 0 : 300; // Wait longer for smooth scroll
          setTimeout(function () {
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                // Check again if still current step
                if (currentStepRef.current !== stepId) {
                  return;
                }
                const newRect = getElementRect(targetElement);
                if (currentStepRef.current === stepId) {
                  setTargetRect(newRect);
                  setTargetNotFoundMessage(null);
                }
              });
            });
          }, scrollTimeout);
        } else {
          // Element is in viewport, use rect directly
          if (currentStepRef.current === stepId) {
            setTargetRect(rect);
            setTargetNotFoundMessage(null);
          }
        }
          });
        });
      });
    },
    [isTourActive, currentStep]
  );

  // Recompute position on scroll/resize
  // Use layout effect for scroll/resize handlers to update position synchronously
  useLayoutEffect(
    function handleResizeAndScroll() {
      if (!isTourActive || !currentStep) {
        return;
      }

      function updatePosition() {
        if (!currentStep) {
          return;
        }
        resolveTargetElement(currentStep.targetTourId, 15).then(function (targetElement) {
          if (targetElement && isElementVisible(targetElement)) {
            const rect = getElementRect(targetElement);
            // Only update if element is valid and meets minimum size (8px allows small elements)
            const minVisibleSize = 8;
            if (rect.width >= minVisibleSize && rect.height >= minVisibleSize) {
              // Check if element is in viewport, scroll into view if needed
              // Day 36: Use enhanced scrollTargetIntoView that finds the correct scroll container
              if (!isElementInViewport(targetElement, 12)) {
                scrollTargetIntoView(targetElement);
              }
              setTargetRect(rect);
              setTargetNotFoundMessage(null);
            } else {
              setTargetRect(null);
              setTargetNotFoundMessage('This item is not currently visible.');
            }
          } else {
            setTargetRect(null);
            setTargetNotFoundMessage('This item is not currently visible.');
          }
        });
      }

      window.addEventListener('scroll', updatePosition, true); // Use capture for all scroll events
      window.addEventListener('resize', updatePosition);

      return function cleanup() {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    },
    [isTourActive, currentStep]
  );

  // ============================================================================
  // EARLY RETURN: SSR guard and inactive tour
  // ============================================================================
  if (!mounted || !isTourActive || !currentStep) {
    return null;
  }

  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < steps.length - 1;

  // Calculate tooltip position
  const tooltipWidth = 320; // Approximate tooltip width
  const tooltipHeight = 200; // Approximate tooltip height
  let tooltipPosition = { top: 0, left: 0, placement: currentStep.placement as 'top' | 'bottom' | 'left' | 'right' | 'center' };
  if (targetRect) {
    const calculated = calculateTooltipPosition(
      targetRect,
      currentStep.placement,
      tooltipWidth,
      tooltipHeight
    );
    tooltipPosition = calculated;
  } else {
    // Center tooltip if target element not found
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    tooltipPosition = {
      top: viewportHeight / 2 - tooltipHeight / 2,
      left: viewportWidth / 2 - tooltipWidth / 2,
      placement: 'center',
    };
  }

  // ============================================================================
  // PORTAL TO DOCUMENT.BODY
  // ============================================================================
  // Portal the overlay to document.body to make it transform-proof.
  // Even if AppShell is correct today, a future transform wrapper can regress
  // the bug. Portaling ensures the overlay is always at the root level and
  // not affected by any CSS transforms or nested scroll containers.
  // Day 36: Add data attribute to identify this as the tour portal (for lock detection)
  const overlayContent = (
    <div className="fixed inset-0 z-[9999] pointer-events-none" data-tour-portal="true">
      {/* ================================================================== */}
      {/* CLICK INTERCEPTOR BACKDROP (Day 36 - Enhanced)                    */}
      {/* Full-screen layer that captures ALL pointer events to prevent      */}
      {/* interaction with underlying app content. This must be above         */}
      {/* scrim blocks visually but still catch all clicks. The tooltip      */}
      {/* (which has pointer-events-auto) will be above this layer.          */}
      {/* ================================================================== */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={function (event) {
          // Prevent clicks from reaching underlying content
          // Only allow clicks on the tooltip itself (which has pointer-events-auto and is above this layer)
          event.stopPropagation();
          event.preventDefault();
        }}
        onMouseDown={function (event) {
          // Also prevent mousedown events
          event.stopPropagation();
          event.preventDefault();
        }}
        onWheel={function (event) {
          // Prevent wheel scrolling on background
          event.stopPropagation();
          event.preventDefault();
        }}
        onTouchMove={function (event) {
          // Prevent touch scrolling on background
          event.stopPropagation();
          event.preventDefault();
        }}
        onTouchStart={function (event) {
          // Prevent touch start events
          event.stopPropagation();
          event.preventDefault();
        }}
        style={{ zIndex: 1 }}
        aria-hidden="true"
      />

      {/* ================================================================== */}
      {/* SCRIM OVERLAY (4-PANEL CUTOUT)                                     */}
      {/* When targetRect exists: render 4 scrim blocks around the target    */}
      {/* to create a true cutout (target area remains fully visible).       */}
      {/* When targetRect does NOT exist: fallback to full-screen scrim.     */}
      {/* Day 36: Scrim blocks are visual only (pointer-events-none) -      */}
      {/* click interception is handled by the backdrop layer above.         */}
      {/* ================================================================== */}
      {targetRect && targetRect.width > 0 && targetRect.height > 0 ? (
        <>
          {/* Calculate scrim bounds with padding for breathing room */}
          {(() => {
            const pad = 10;
            const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
            const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
            const scrimTop = Math.max(0, targetRect.top - pad);
            const scrimLeft = Math.max(0, targetRect.left - pad);
            const scrimRight = Math.min(viewportWidth, targetRect.right + pad);
            const scrimBottom = Math.min(viewportHeight, targetRect.bottom + pad);

            return (
              <>
                {/* Top scrim: from y=0 to y=(rect.top - pad) */}
                {scrimTop > 0 ? (
                  <div
                    className="absolute bg-background/55 backdrop-blur-sm pointer-events-none"
                    style={{
                      top: 0,
                      left: 0,
                      width: viewportWidth,
                      height: scrimTop,
                      zIndex: 2,
                    }}
                  />
                ) : null}
                {/* Left scrim: from y=(rect.top - pad) to y=(rect.bottom + pad), x=0 to x=(rect.left - pad) */}
                {scrimLeft > 0 ? (
                  <div
                    className="absolute bg-background/55 backdrop-blur-sm pointer-events-none"
                    style={{
                      top: scrimTop,
                      left: 0,
                      width: scrimLeft,
                      height: scrimBottom - scrimTop,
                      zIndex: 2,
                    }}
                  />
                ) : null}
                {/* Right scrim: same y range, x=(rect.right + pad) to x=window.innerWidth */}
                {scrimRight < viewportWidth ? (
                  <div
                    className="absolute bg-background/55 backdrop-blur-sm pointer-events-none"
                    style={{
                      top: scrimTop,
                      left: scrimRight,
                      width: viewportWidth - scrimRight,
                      height: scrimBottom - scrimTop,
                      zIndex: 2,
                    }}
                  />
                ) : null}
                {/* Bottom scrim: from y=(rect.bottom + pad) to y=window.innerHeight */}
                {scrimBottom < viewportHeight ? (
                  <div
                    className="absolute bg-background/55 backdrop-blur-sm pointer-events-none"
                    style={{
                      top: scrimBottom,
                      left: 0,
                      width: viewportWidth,
                      height: viewportHeight - scrimBottom,
                      zIndex: 2,
                    }}
                  />
                ) : null}
              </>
            );
          })()}
        </>
      ) : (
        /* Fallback: full-screen scrim when no target */
        <div className="absolute inset-0 bg-background/55 backdrop-blur-sm pointer-events-none" style={{ zIndex: 2 }} />
      )}

      {/* ================================================================== */}
      {/* GRADIENT DEPTH LAYER                                                */}
      {/* Subtle radial gradient to add depth (still dark theme)            */}
      {/* Day 36: Visual layer only (pointer-events-none)                   */}
      {/* ================================================================== */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent_55%)]" style={{ zIndex: 2 }} />

      {/* ================================================================== */}
      {/* SPOTLIGHT BORDER                                                    */}
      {/* Highlight border around target element (sits above scrim blocks)   */}
      {/* Only render if target has valid dimensions (not zero width/height) */}
      {/* Day 36: Visual layer only (pointer-events-none)                   */}
      {/* ================================================================== */}
      {targetRect && targetRect.width > 0 && targetRect.height > 0 ? (
        <div
          className="absolute border-2 border-accent rounded-lg pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.28)',
            zIndex: 3,
          }}
        />
      ) : null}

      {/* ================================================================== */}
      {/* TOOLTIP                                                             */}
      {/* Shows step title, body, and navigation controls                    */}
      {/* Day 36: Must have pointer-events-auto and highest z-index to be    */}
      {/* interactive above the click interceptor backdrop.                 */}
      {/* ================================================================== */}
      <div
        ref={tooltipRef}
        className={cn(
          'absolute bg-card/95 border border-accent/35 rounded-lg shadow-xl backdrop-blur-md p-4 pointer-events-auto',
          'w-80 max-w-[calc(100vw-2rem)] relative overflow-hidden'
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          zIndex: 10,
        }}
      >
        {/* Subtle gradient depth inside tooltip container */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_60%)]" />
        {/* Tooltip content wrapper with relative z-10 to ensure text is above gradient */}
        <div className="relative z-10">
          {/* Close button */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground/95 pr-4">{currentStep.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={skipTour}
            title="Skip tour"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Skip tour</span>
          </Button>
        </div>

        {/* Body text */}
        {targetNotFoundMessage ? (
          <p className="text-sm text-foreground/85 mb-4">{targetNotFoundMessage}</p>
        ) : (
          <p className="text-sm text-foreground/85 mb-4 whitespace-pre-line">{currentStep.body}</p>
        )}

        {/* Navigation controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {canGoBack ? (
              <Button variant="outline" size="sm" onClick={prevStep} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={skipTour}>
              Skip
            </Button>
            <Button variant="default" size="sm" onClick={canGoNext ? nextStep : skipTour} className="gap-2">
              {canGoNext ? 'Next' : 'Finish'}
              {canGoNext ? <ChevronRight className="w-4 h-4" /> : null}
            </Button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-foreground/70 text-center">
            Step {stepIndex + 1} of {steps.length}
          </p>
        </div>
        </div>
      </div>
    </div>
  );

  // Portal to document.body for transform-proof rendering
  return createPortal(overlayContent, document.body);
}
