'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useRef } from 'react';

interface UserPreferences {
  hasAcceptedGlobalDisclaimer: boolean;
  hasSeenRetirementDisclaimer: boolean;
  hasSeenFehbDisclaimer: boolean;
}

interface UserPreferencesContextType extends UserPreferences {
  setHasAcceptedGlobalDisclaimer: (value: boolean) => void;
  setHasSeenRetirementDisclaimer: (value: boolean) => void;
  setHasSeenFehbDisclaimer: (value: boolean) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'pathos-user-preferences';

const defaultPreferences: UserPreferences = {
  hasAcceptedGlobalDisclaimer: true,
  hasSeenRetirementDisclaimer: false,
  hasSeenFehbDisclaimer: false,
};

/**
 * UserPreferencesProvider component
 *
 * WHY THIS EXISTS:
 * Manages user preferences that need to persist across sessions (disclaimers seen, etc.).
 *
 * HOW IT WORKS:
 * 1. Uses lazy initializer to read from localStorage on first render (no useEffect setState)
 * 2. Tracks if initialization is complete via ref (not state)
 * 3. Uses effect only for WRITING to localStorage (external system sync)
 *
 * This pattern avoids the "setState in useEffect" lint error by reading initial
 * state synchronously during the first render.
 */
export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  /**
   * Lazy initializer: reads localStorage synchronously on first render.
   * This avoids the need for a useEffect that calls setState.
   * Safe for SSR because we guard with typeof window check.
   */
  const [preferences, setPreferences] = useState<UserPreferences>(function getInitialPreferences() {
    // SSR guard: return defaults during server-side rendering
    if (typeof window === 'undefined') {
      return defaultPreferences;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultPreferences, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }

    // No stored preferences: return defaults with disclaimer not accepted
    return { ...defaultPreferences, hasAcceptedGlobalDisclaimer: false };
  });

  /**
   * Track whether we've completed initial hydration.
   * Use ref instead of state to avoid unnecessary re-renders.
   */
  const isHydratedRef = useRef(false);

  /**
   * Effect: Mark as hydrated on mount, then save to localStorage when preferences change.
   * This is the correct use of effect - syncing React state to an external system.
   */
  useEffect(function syncPreferencesToStorage() {
    // On first run, mark as hydrated but don't save (already loaded from storage)
    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      return;
    }

    // After hydration, save preferences to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }, [preferences]);

  const setHasAcceptedGlobalDisclaimer = (value: boolean) => {
    setPreferences((prev) => ({ ...prev, hasAcceptedGlobalDisclaimer: value }));
  };

  const setHasSeenRetirementDisclaimer = (value: boolean) => {
    setPreferences((prev) => ({ ...prev, hasSeenRetirementDisclaimer: value }));
  };

  const setHasSeenFehbDisclaimer = (value: boolean) => {
    setPreferences((prev) => ({ ...prev, hasSeenFehbDisclaimer: value }));
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        ...preferences,
        setHasAcceptedGlobalDisclaimer,
        setHasSeenRetirementDisclaimer,
        setHasSeenFehbDisclaimer,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
}
