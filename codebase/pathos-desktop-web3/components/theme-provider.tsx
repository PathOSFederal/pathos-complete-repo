'use client';

import type * as React from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useProfileStore } from '@/store/profileStore';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue>({ resolvedTheme: 'dark' });

export function useResolvedTheme() {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider component
 *
 * WHY THIS EXISTS:
 * Provides theme context to the app and applies theme classes to <html>.
 *
 * HOW IT WORKS:
 * 1. Reads profile.preferences.theme from the profile store
 * 2. Derives resolvedTheme from preference + system media query
 * 3. Uses effects ONLY for DOM side effects (applying classes, listening to system changes)
 * 4. Avoids setState in effects by deriving theme value with useMemo
 *
 * ARCHITECTURE:
 * - One-way data flow: profile.preferences.theme -> resolved theme -> DOM
 * - No state loops, no next-themes dependency
 * - Stable under React Strict Mode
 */
export function ThemeProvider(props: { children: React.ReactNode }) {
  const children = props.children;

  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  /**
   * Track the system preference for dark mode.
   * This is state because it can change at runtime via media query listener.
   * Initial value is computed once on mount (SSR-safe).
   */
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(function getInitialSystemPref() {
    if (typeof window === 'undefined') return true; // Default to dark for SSR
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  /**
   * Derive resolvedTheme from profile preference + system preference.
   * This replaces the setState-in-effect pattern.
   *
   * The theme is computed as:
   * - 'light' or 'dark' if explicitly set in profile
   * - system preference otherwise
   */
  const resolvedTheme: ResolvedTheme = useMemo(function computeResolvedTheme() {
    let preference: string = 'system';
    if (profile && profile.preferences && profile.preferences.theme) {
      preference = profile.preferences.theme;
    }

    if (preference === 'light') {
      return 'light';
    } else if (preference === 'dark') {
      return 'dark';
    } else {
      // System preference
      return systemPrefersDark ? 'dark' : 'light';
    }
  }, [profile, systemPrefersDark]);

  /**
   * Effect: Apply theme class to <html> element (external system sync).
   * This is the correct use of an effect - synchronizing React state with DOM.
   */
  useEffect(
    function applyThemeToDocument() {
      if (typeof window === 'undefined') return;

      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolvedTheme);
    },
    [resolvedTheme],
  );

  /**
   * Effect: Listen for system preference changes.
   * Only runs when user's preference is 'system'.
   * Updates systemPrefersDark state when OS theme changes.
   */
  useEffect(
    function listenForSystemThemeChanges() {
      if (typeof window === 'undefined') return;

      let preference: string = 'system';
      if (profile && profile.preferences && profile.preferences.theme) {
        preference = profile.preferences.theme;
      }

      // Only listen for system changes if preference is 'system'
      if (preference !== 'system') return;

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = function (e: MediaQueryListEvent) {
        setSystemPrefersDark(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return function cleanupListener() {
        mediaQuery.removeEventListener('change', handleChange);
      };
    },
    [profile],
  );

  const contextValue = useMemo(
    function createContextValue() {
      return { resolvedTheme: resolvedTheme };
    },
    [resolvedTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
