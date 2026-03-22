/**
 * ============================================================================
 * ROUTE TRANSITION COMPONENT (Day 35 - Subtle Route Transitions)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Wraps main content to provide subtle route transitions when navigating
 * between major tabs/pages. Only animates the main content region, leaving
 * sidebar and header static.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Layout Layer: Wraps main content slot in AppShell or page layouts
 * - Used by: AppShell or individual page layouts that want route transitions
 *
 * KEY FEATURES:
 * - Subtle fade + translate animation (opacity + translateY 8-12px)
 * - Respects prefers-reduced-motion (disables animation if user prefers)
 * - Only animates main content, not sidebar/header
 * - Uses pathname as key to trigger transitions on route changes
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. Uses usePathname() to detect route changes
 * 2. When pathname changes, applies exit animation to old content
 * 3. New content enters with fade-in + slide-up animation
 * 4. If prefers-reduced-motion is set, uses instant transition instead
 *
 * WHY THIS DESIGN:
 * - Provides visual continuity between pages without being distracting
 * - Respects accessibility preferences (reduced motion)
 * - Lightweight (CSS transitions, no heavy animation library)
 * - Only affects main content, keeping navigation stable
 *
 * @version Day 35 - Route Transitions
 * ============================================================================
 */

'use client';

import type React from 'react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface RouteTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Hook to detect if user prefers reduced motion.
 * Returns true if prefers-reduced-motion media query matches.
 */
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(function checkReducedMotion() {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return;
    }

    // Check media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Defer initial state update to avoid setState in effect
    requestAnimationFrame(function () {
      setPrefersReducedMotion(mediaQuery.matches);
    });

    // Listen for changes (user can change preference)
    function handleChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return function cleanup() {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    // Fallback for older browsers
    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return function cleanup() {
        mediaQuery.removeListener(handleChange);
      };
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * RouteTransition component that wraps main content with subtle transitions.
 */
export function RouteTransition(props: RouteTransitionProps) {
  const children = props.children;
  const className = props.className;

  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  // Track previous pathname to detect route changes
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(
    function handleRouteChange() {
      // If pathname changed, trigger transition
      if (pathname !== prevPathname) {
        // Defer state update to avoid setState in effect
        requestAnimationFrame(function () {
          setIsTransitioning(true);
        });

        // Reset transition state after animation completes
        // For reduced motion, use shorter delay (50ms for instant feel)
        // For normal motion, use 200ms to match CSS transition duration
        const delay = prefersReducedMotion ? 50 : 200;

        const timeoutId = setTimeout(function () {
          setIsTransitioning(false);
          setPrevPathname(pathname);
        }, delay);

        return function cleanup() {
          clearTimeout(timeoutId);
        };
      }
    },
    [pathname, prevPathname, prefersReducedMotion]
  );

  // If reduced motion is preferred, use instant transition
  if (prefersReducedMotion) {
    return <div className={cn('route-transition-instant', className)}>{children}</div>;
  }

  // Normal transition: fade + slide
  return (
    <div
      key={pathname}
      className={cn(
        'route-transition',
        isTransitioning ? 'route-transition-exit' : 'route-transition-enter',
        className
      )}
    >
      {children}
    </div>
  );
}







