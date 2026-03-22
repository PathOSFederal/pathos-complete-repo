/**
 * usePathAdvisorInsights Hook
 *
 * A convenient hook for components to access and fetch PathAdvisor insights.
 * Handles loading state, error handling, and automatic profile mapping.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useProfileStore } from '@/store/profileStore';
import type { PathScenario, PathAdvisorResponse } from '@/types/pathadvisor';

export interface UsePathAdvisorInsightsOptions {
  /** Whether to fetch insights automatically on mount */
  autoFetch?: boolean;
  /** Scenario to include with the request */
  scenario?: PathScenario;
  /** Dependencies that trigger a refetch when changed */
  deps?: unknown[];
}

export interface UsePathAdvisorInsightsReturn {
  /** The current PathAdvisor insights data */
  insights: PathAdvisorResponse | null;
  /** Whether insights are currently loading */
  isLoading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Timestamp of last successful fetch */
  lastFetched: string | null;
  /** Function to manually fetch/refresh insights */
  fetchInsights: (scenario?: PathScenario) => Promise<void>;
  /** Function to clear the current insights */
  clearInsights: () => void;
}

/**
 * Hook to access and manage PathAdvisor insights.
 *
 * @param options - Configuration options
 * @returns PathAdvisor insights state and actions
 *
 * @example
 * // Basic usage - manual fetch
 * const { insights, isLoading, fetchInsights } = usePathAdvisorInsights();
 *
 * @example
 * // Auto-fetch on mount
 * const { insights, isLoading } = usePathAdvisorInsights({ autoFetch: true });
 *
 * @example
 * // With a specific scenario
 * const { insights } = usePathAdvisorInsights({
 *   autoFetch: true,
 *   scenario: {
 *     targetGradeBand: 'GS-14',
 *     targetLocation: 'Denver, CO',
 *   },
 * });
 */
export function usePathAdvisorInsights(
  options: UsePathAdvisorInsightsOptions = {}
): UsePathAdvisorInsightsReturn {
  const { autoFetch = false, scenario, deps = [] } = options;

  // Get profile from profile store
  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  // Get PathAdvisor state and actions from dashboard store
  const insights = useDashboardStore(function (state) {
    return state.pathAdvisorInsights;
  });
  const isLoading = useDashboardStore(function (state) {
    return state.pathAdvisorLoading;
  });
  const error = useDashboardStore(function (state) {
    return state.pathAdvisorError;
  });
  const lastFetched = useDashboardStore(function (state) {
    return state.pathAdvisorLastFetched;
  });
  const fetchPathAdvisorInsights = useDashboardStore(function (state) {
    return state.fetchPathAdvisorInsights;
  });
  const clearPathAdvisorInsights = useDashboardStore(function (state) {
    return state.clearPathAdvisorInsights;
  });

  // Track if we've already auto-fetched
  const hasAutoFetchedRef = useRef(false);

  // Fetch insights function that uses the current profile
  const fetchInsights = useCallback(
    function (overrideScenario?: PathScenario): Promise<void> {
      const scenarioToUse = overrideScenario || scenario;
      return fetchPathAdvisorInsights(profile, scenarioToUse);
    },
    [profile, scenario, fetchPathAdvisorInsights]
  );

  // Clear insights function
  const clearInsights = useCallback(function () {
    clearPathAdvisorInsights();
  }, [clearPathAdvisorInsights]);

  // Auto-fetch effect
  useEffect(
    function () {
      if (autoFetch && !hasAutoFetchedRef.current) {
        hasAutoFetchedRef.current = true;
        fetchInsights();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [autoFetch, ...deps]
  );

  return {
    insights,
    isLoading,
    error,
    lastFetched,
    fetchInsights,
    clearInsights,
  };
}

/**
 * Hook to access just the PathAdvisor insights data without actions.
 * Useful for components that only need to display insights.
 */
export function usePathAdvisorInsightsData(): PathAdvisorResponse | null {
  return useDashboardStore(function (state) {
    return state.pathAdvisorInsights;
  });
}

/**
 * Hook to check if PathAdvisor insights are loading.
 */
export function usePathAdvisorLoading(): boolean {
  return useDashboardStore(function (state) {
    return state.pathAdvisorLoading;
  });
}














