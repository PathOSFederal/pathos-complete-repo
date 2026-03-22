'use client';

import type React from 'react';
import { useEffect } from 'react';
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useProfileStore } from '@/store/profileStore';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { useDashboardStore } from '@/store/dashboardStore';

interface StoreInitializerProps {
  children: React.ReactNode;
}

/**
 * StoreInitializer component
 *
 * WHY THIS EXISTS:
 * Ensures all Zustand stores are loaded from localStorage before rendering the app.
 * This prevents hydration mismatches and flash of default content.
 *
 * HOW IT WORKS:
 * 1. On mount, triggers loadFromStorage on each store
 * 2. Each store sets its own isLoaded flag when done
 * 3. We derive isInitialized from those flags (no useState needed)
 * 4. Children only render once all stores are loaded
 */
export function StoreInitializer(props: StoreInitializerProps) {
  const children = props.children;

  // Get store methods
  const loadJobSearch = useJobSearchStore(function (state) {
    return state.loadFromStorage;
  });
  const jobSearchIsLoaded = useJobSearchStore(function (state) {
    return state.isLoaded;
  });

  const loadProfile = useProfileStore(function (state) {
    return state.loadFromStorage;
  });
  const profileIsLoaded = useProfileStore(function (state) {
    return state.isLoaded;
  });

  const loadPreferences = useUserPreferencesStore(function (state) {
    return state.loadFromStorage;
  });
  const preferencesIsLoaded = useUserPreferencesStore(function (state) {
    return state.isLoaded;
  });

  const loadDashboardMockData = useDashboardStore(function (state) {
    return state.loadMockData;
  });

  const user = useProfileStore(function (state) {
    return state.user;
  });

  /**
   * Derived boolean: true when all three stores have finished loading.
   * This replaces useState + useEffect pattern that caused lint errors.
   * The value is computed directly from store selectors each render.
   */
  const isInitialized = jobSearchIsLoaded && profileIsLoaded && preferencesIsLoaded;

  // Initialize stores on mount
  useEffect(function initializeStoresOnMount() {
    loadJobSearch();
    loadProfile();
    loadPreferences();
  }, [loadJobSearch, loadProfile, loadPreferences]);

  // Load dashboard mock data once profile is loaded
  useEffect(
    function loadDashboardDataAfterProfile() {
      if (profileIsLoaded) {
        loadDashboardMockData(user.currentEmployee);
      }
    },
    [profileIsLoaded, user.currentEmployee, loadDashboardMockData],
  );

  // Don't render children until stores are initialized
  if (!isInitialized) {
    return null;
  }

  return children;
}

