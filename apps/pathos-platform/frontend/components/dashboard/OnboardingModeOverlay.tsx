/**
 * ============================================================================
 * ONBOARDING MODE OVERLAY (Day 36 - Advisor-led Conversational Onboarding Mode)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides a visual overlay that dims dashboard cards during onboarding mode,
 * keeping the dashboard layout stable while emphasizing the PathAdvisor conversation.
 * Uses a 4-panel scrim cutout technique to leave PathAdvisor panel fully visible
 * while dimming the rest of the dashboard.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - UI Layer: Visual overlay component for onboarding mode
 * - Used in: app/dashboard/page.tsx when onboarding mode is active
 * - Purpose: Dim background cards, keep layout stable, highlight PathAdvisor panel
 *
 * KEY CONCEPTS:
 * - 4-panel scrim cutout: Renders scrim blocks around target element (PathAdvisor)
 * - Layout stability: Dashboard layout remains unchanged, only visual styling changes
 * - PathAdvisor prominence: PathAdvisor panel remains fully visible and bright
 *
 * HOW IT WORKS:
 * 1. When onboarding mode is active, measures the PathAdvisor panel rect
 * 2. Renders 4 absolutely positioned scrim blocks around the panel (top, left, right, bottom)
 * 3. The cutout area (PathAdvisor panel) remains fully visible and bright
 * 4. Rest of dashboard is dimmed by the scrim blocks
 * 5. Listens to scroll/resize events to recompute scrim positions
 *
 * DESIGN PRINCIPLES:
 * - True cutout (target area fully visible, not dimmed)
 * - Clear visual hierarchy (PathAdvisor prominent)
 * - Layout stability (no layout shifts)
 * - Responsive to scroll/resize
 */

'use client';

import { ReactNode, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * ============================================================================
 * PROPS INTERFACE
 * ============================================================================
 */

interface OnboardingModeOverlayProps {
  /**
   * Child content (typically the dashboard content area)
   */
  children: ReactNode;
  /**
   * Whether onboarding mode is currently active
   */
  isOnboardingMode: boolean;
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function OnboardingModeOverlay(props: OnboardingModeOverlayProps) {
  const children = props.children;
  const isOnboardingMode = props.isOnboardingMode;

  // Track PathAdvisor panel position for scrim cutout
  const [focusRect, setFocusRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // SSR guard: Portal requires client-side DOM
  useEffect(function () {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR guard requires effect
    setMounted(true);
  }, []);

  // Measure PathAdvisor panel rect when onboarding mode is active
  useLayoutEffect(
    function updateFocusRect() {
      if (!isOnboardingMode || !mounted) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement requires effect
        setFocusRect(null);
        return;
      }

      function measureFocusTarget() {
        // Find PathAdvisor panel using data-tour attribute
        const focusElement = document.querySelector('[data-tour="pathadvisor-panel"]');
        if (focusElement) {
          const rect = focusElement.getBoundingClientRect();
          // Only set rect if element has valid dimensions
          if (rect.width > 0 && rect.height > 0) {
            setFocusRect(rect);
          } else {
            setFocusRect(null);
          }
        } else {
          setFocusRect(null);
        }
      }

      // Initial measurement
      measureFocusTarget();

      // Recompute on scroll/resize
      function handleUpdate() {
        measureFocusTarget();
      }

      // Listen to scroll events (use capture to catch all scroll containers)
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

      // Also listen to animation frame for initial render completion
      requestAnimationFrame(function () {
        requestAnimationFrame(measureFocusTarget);
      });

      return function cleanup() {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    },
    [isOnboardingMode, mounted]
  );

  // Render children normally (no wrapper opacity)
  const content = <>{children}</>;

  // When not in onboarding mode, return content as-is
  if (!isOnboardingMode || !mounted) {
    return content;
  }

  // When in onboarding mode, render scrim overlay as sibling
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Render scrim overlay using portal to document.body
  const scrimOverlay = (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {focusRect && focusRect.width > 0 && focusRect.height > 0 ? (
        /* 4-panel scrim cutout around PathAdvisor panel */
        (function () {
          const pad = 10;
          const scrimTop = Math.max(0, focusRect.top - pad);
          const scrimLeft = Math.max(0, focusRect.left - pad);
          const scrimRight = Math.min(viewportWidth, focusRect.right + pad);
          const scrimBottom = Math.min(viewportHeight, focusRect.bottom + pad);

          return (
            <>
              {/* Top scrim */}
              {/* Day 36: Lightened dimming from /45 to /35 to improve visibility while keeping military dark mode */}
              {scrimTop > 0 ? (
                <div
                  className="absolute bg-background/35 backdrop-blur-sm pointer-events-none"
                  style={{
                    top: 0,
                    left: 0,
                    width: viewportWidth,
                    height: scrimTop,
                  }}
                />
              ) : null}
              {/* Left scrim */}
              {scrimLeft > 0 ? (
                <div
                  className="absolute bg-background/35 backdrop-blur-sm pointer-events-none"
                  style={{
                    top: scrimTop,
                    left: 0,
                    width: scrimLeft,
                    height: scrimBottom - scrimTop,
                  }}
                />
              ) : null}
              {/* Right scrim */}
              {scrimRight < viewportWidth ? (
                <div
                  className="absolute bg-background/35 backdrop-blur-sm pointer-events-none"
                  style={{
                    top: scrimTop,
                    left: scrimRight,
                    width: viewportWidth - scrimRight,
                    height: scrimBottom - scrimTop,
                  }}
                />
              ) : null}
              {/* Bottom scrim */}
              {scrimBottom < viewportHeight ? (
                <div
                  className="absolute bg-background/35 backdrop-blur-sm pointer-events-none"
                  style={{
                    top: scrimBottom,
                    left: 0,
                    width: viewportWidth,
                    height: viewportHeight - scrimBottom,
                  }}
                />
              ) : null}
            </>
          );
        })()
      ) : (
        /* Fallback: full-screen scrim if PathAdvisor panel not found */
        /* Day 36: Lightened dimming from /45 to /35 to improve visibility while keeping military dark mode */
        <div className="absolute inset-0 bg-background/35 backdrop-blur-sm pointer-events-none" />
      )}
    </div>
  );

  return (
    <>
      {content}
      {createPortal(scrimOverlay, document.body)}
    </>
  );
}
