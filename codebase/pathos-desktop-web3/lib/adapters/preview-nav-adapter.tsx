/**
 * ============================================================================
 * PREVIEW NAVIGATION ADAPTER (In-Memory Router)
 * ============================================================================
 *
 * This adapter implements @pathos/adapters NavigationAdapter using React
 * state instead of a real router. It powers the /desktop-preview/* routes,
 * letting the shared AppShell + screens render in the v0 sandbox without
 * needing Next.js router hooks inside shared UI.
 *
 * How it works:
 * 1. The desktop-preview layout wraps children with <PreviewNavigationProvider>
 * 2. Shared components call useNav().push('/dashboard') etc.
 * 3. This adapter updates an in-memory pathname in React state
 * 4. The preview layout reads that state to decide which screen to show
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { NavigationAdapter, NavLinkProps } from '@pathos/adapters';
import { NavigationProvider } from '@pathos/adapters';

// ---------------------------------------------------------------------------
// In-memory navigation state
// ---------------------------------------------------------------------------

interface PreviewNavState {
  pathname: string;
  setPathname: (path: string) => void;
  history: string[];
}

const PreviewNavContext = createContext<PreviewNavState | null>(null);

/**
 * Hook to read the current in-memory pathname from the preview router.
 */
export function usePreviewPathname(): string {
  const ctx = useContext(PreviewNavContext);
  if (!ctx) {
    throw new Error('usePreviewPathname() must be used within <PreviewNavigationProvider>');
  }
  return ctx.pathname;
}

// ---------------------------------------------------------------------------
// NavLink for preview mode (plain <a> tag with click interception)
// ---------------------------------------------------------------------------

function PreviewNavLink(props: NavLinkProps) {
  const ctx = useContext(PreviewNavContext);

  const handleClick = function (e: React.MouseEvent) {
    e.preventDefault();
    if (props.onClick) {
      props.onClick(e);
    }
    if (ctx) {
      ctx.setPathname(props.href);
    }
  };

  return (
    <a
      href={props.href}
      className={props.className}
      onClick={handleClick}
      data-tour={props['data-tour']}
    >
      {props.children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PreviewNavigationProviderProps {
  initialPath?: string;
  children: ReactNode;
}

export function PreviewNavigationProvider(props: PreviewNavigationProviderProps) {
  const [pathname, setPathname] = useState(props.initialPath ?? '/dashboard');
  const [history, setHistory] = useState<string[]>([props.initialPath ?? '/dashboard']);

  const pushPath = useCallback(function (path: string) {
    setPathname(path);
    setHistory(function (prev) { return prev.concat([path]); });
  }, []);

  const adapter: NavigationAdapter = useMemo(function () {
    return {
      push: pushPath,
      replace: function (path: string) {
        setPathname(path);
      },
      back: function () {
        setHistory(function (prev) {
          if (prev.length <= 1) return prev;
          const newHistory = prev.slice(0, prev.length - 1);
          setPathname(newHistory[newHistory.length - 1]);
          return newHistory;
        });
      },
      pathname: pathname,
    };
  }, [pathname, pushPath]);

  const navState: PreviewNavState = {
    pathname: pathname,
    setPathname: pushPath,
    history: history,
  };

  return (
    <PreviewNavContext.Provider value={navState}>
      <NavigationProvider adapter={adapter} linkComponent={PreviewNavLink}>
        {props.children}
      </NavigationProvider>
    </PreviewNavContext.Provider>
  );
}
