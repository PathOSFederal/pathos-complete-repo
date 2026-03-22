/**
 * ============================================================================
 * NAVIGATION CONTEXT — React context + hook for NavigationAdapter
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * Usage:
 *   // In platform entry point (apps/web or apps/desktop):
 *   <NavigationProvider adapter={myAdapter} linkComponent={MyLink}>
 *     <SharedUI />
 *   </NavigationProvider>
 *
 *   // In shared UI (packages/ui):
 *   const { push, pathname } = useNav();
 *   <NavLink href="/dashboard">Dashboard</NavLink>
 */

'use client';

import {
  createContext,
  useContext,
  type ComponentType,
} from 'react';
import type { NavigationAdapter, NavLinkProps } from './navigation';

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface NavigationContextValue {
  adapter: NavigationAdapter;
  LinkComponent: ComponentType<NavLinkProps>;
}

// The default throws at runtime so a missing provider is caught immediately.
const NavigationContext = createContext<NavigationContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface NavigationProviderProps {
  adapter: NavigationAdapter;
  linkComponent: ComponentType<NavLinkProps>;
  children: React.ReactNode;
}

export function NavigationProvider(props: NavigationProviderProps) {
  const value: NavigationContextValue = {
    adapter: props.adapter,
    LinkComponent: props.linkComponent,
  };

  return (
    <NavigationContext.Provider value={value}>
      {props.children}
    </NavigationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the platform navigation adapter.
 * Throws if used outside a <NavigationProvider>.
 */
export function useNav(): NavigationAdapter {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNav() must be used within a <NavigationProvider>');
  }
  return ctx.adapter;
}

/**
 * Access the platform Link component for use in JSX.
 * Returns a component that renders an <a>-like element using the platform router.
 */
export function useNavLink(): ComponentType<NavLinkProps> {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavLink() must be used within a <NavigationProvider>');
  }
  return ctx.LinkComponent;
}
