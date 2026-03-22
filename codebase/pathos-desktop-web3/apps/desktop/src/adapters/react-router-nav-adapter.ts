/**
 * React Router navigation adapter for the desktop app.
 *
 * Implements the NavigationAdapter interface from @pathos/adapters
 * using react-router-dom hooks. This lets shared UI components
 * navigate without knowing they are in React Router.
 *
 * BOUNDARY: This file MAY import react-router-dom (it lives in apps/desktop,
 * not in packages/*). It MUST NOT import next/*.
 */

import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavigationAdapter } from '@pathos/adapters';

/**
 * Hook that creates a NavigationAdapter backed by React Router.
 */
export function useReactRouterNavAdapter(): NavigationAdapter {
  const navigate = useNavigate();
  const location = useLocation();

  return useMemo(
    function () {
      return {
        push: function (path: string) {
          navigate(path);
        },
        replace: function (path: string) {
          navigate(path, { replace: true });
        },
        back: function () {
          navigate(-1);
        },
        pathname: location.pathname,
      };
    },
    [navigate, location.pathname],
  );
}
