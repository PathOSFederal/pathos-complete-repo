/**
 * ============================================================================
 * USE ANCHOR ROUTE RESET HOOK (Day 43 - Critical Bug Fix)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Custom hook that resets PathAdvisor anchor state when navigating between
 * routes. This prevents stale anchor/card UI from persisting when the user
 * moves between different pages in the app.
 *
 * ============================================================================
 * THE PROBLEM
 * ============================================================================
 *
 * Before this fix, PathAdvisor retained stale card/anchor UI when navigating:
 * - User clicks "Ask PathAdvisor" on Job Details page
 * - Anchor is set to 'job' source with job-specific context
 * - User navigates to Resume Builder
 * - Sidebar still shows cards from the Job Details anchor
 * - User is confused because context no longer matches the current page
 *
 * ============================================================================
 * THE SOLUTION
 * ============================================================================
 *
 * On route change:
 * 1. PRESERVE conversation thread history (stored in advisor-context)
 * 2. CLEAR active anchor and card context in PathAdvisor store
 * 3. Allow destination page to set its own page-level anchor if desired
 *
 * This ensures:
 * - Sidebar never shows cards from a previous page's anchor
 * - User sees clean slate when entering a new page
 * - Conversation history remains available for reference
 *
 * ============================================================================
 * IMPLEMENTATION NOTES
 * ============================================================================
 *
 * - Uses Next.js usePathname() to detect route changes
 * - Calls clearActiveAnchor() from PathAdvisor store on pathname change
 * - Optionally clears proposals for the old anchor (configurable)
 * - Does NOT clear conversation messages (those are in AdvisorContext)
 *
 * @version Day 43 - PathAdvisor Anchor & Focus Architecture
 */

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';

/**
 * Options for anchor route reset behavior.
 */
export interface UseAnchorRouteResetOptions {
  /**
   * Whether to clear proposals for the old anchor when navigating.
   * Default: true (recommended to prevent stale proposals)
   */
  clearProposals?: boolean;
  /**
   * Whether to clear the shouldOpenDockedPanel flag on navigation.
   * Default: true (prevents docked panel from persisting)
   */
  clearDockedPanelFlag?: boolean;
}

/**
 * Hook that resets PathAdvisor anchor state when navigating between routes.
 *
 * PURPOSE:
 * Prevents stale anchor/card UI from persisting when the user navigates
 * to a different page. Clears active anchor but preserves conversation history.
 *
 * USAGE:
 * ```tsx
 * // In your root layout or app shell
 * function AppShell({ children }) {
 *   useAnchorRouteReset();
 *   return <>{children}</>;
 * }
 * ```
 *
 * BEHAVIOR:
 * - On initial mount: No action (wait for first navigation)
 * - On pathname change: Clear active anchor (and optionally proposals)
 * - Conversation history in AdvisorContext is NOT cleared
 *
 * @param options - Configuration options for reset behavior
 */
export function useAnchorRouteReset(options?: UseAnchorRouteResetOptions): void {
  const pathname = usePathname();

  // Get store actions
  const clearActiveAnchor = usePathAdvisorStore(function (state) {
    return state.clearActiveAnchor;
  });
  const clearShouldOpenDockedPanel = usePathAdvisorStore(function (state) {
    return state.clearShouldOpenDockedPanel;
  });
  const activeAnchor = usePathAdvisorStore(function (state) {
    return state.activeAnchor;
  });
  const clearProposalsForAnchor = usePathAdvisorStore(function (state) {
    return state.clearProposalsForAnchor;
  });

  // Default options
  const clearProposals = options?.clearProposals !== false; // Default: true
  const clearDockedPanelFlag = options?.clearDockedPanelFlag !== false; // Default: true

  // Track previous pathname to detect changes
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(
    function handleRouteChange() {
      // Skip first render (initial mount)
      if (previousPathnameRef.current === null) {
        previousPathnameRef.current = pathname;
        return;
      }

      // Check if pathname actually changed
      if (previousPathnameRef.current === pathname) {
        return;
      }

      // ================================================================
      // ROUTE CHANGE DETECTED: Clear anchor state
      // ================================================================
      //
      // WHY WE CLEAR ON NAVIGATION (Day 43):
      // 1. Prevents stale anchor/card UI from persisting
      // 2. Ensures sidebar shows context relevant to current page
      // 3. Allows destination page to set its own anchor if needed
      //
      // WHAT WE PRESERVE:
      // - Conversation thread history (in AdvisorContext, not here)
      // - User's ability to review past conversations
      //
      // WHAT WE CLEAR:
      // - Active anchor (no longer relevant to new page)
      // - Proposals for old anchor (optionally, configurable)
      // - Docked panel flag (optionally, configurable)
      // ================================================================

      const previousAnchorId = activeAnchor?.id;

      // Clear active anchor
      clearActiveAnchor();

      // Clear proposals for the old anchor if enabled and anchor existed
      if (clearProposals && previousAnchorId) {
        clearProposalsForAnchor(previousAnchorId);
      }

      // Clear docked panel flag if enabled
      if (clearDockedPanelFlag) {
        clearShouldOpenDockedPanel();
      }

      // Update previous pathname
      previousPathnameRef.current = pathname;
    },
    [
      pathname,
      activeAnchor?.id,
      clearActiveAnchor,
      clearProposalsForAnchor,
      clearShouldOpenDockedPanel,
      clearProposals,
      clearDockedPanelFlag,
    ]
  );
}

/**
 * Re-export for convenience.
 */
export default useAnchorRouteReset;
