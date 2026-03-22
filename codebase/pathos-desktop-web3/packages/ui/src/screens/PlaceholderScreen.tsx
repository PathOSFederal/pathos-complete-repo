/**
 * ============================================================================
 * SHARED PLACEHOLDER SCREEN — "Coming soon" stub for unresolved routes
 * ============================================================================
 *
 * PURPOSE: Single shared screen for routes that do not yet have real content
 * in Desktop or Next. Ensures every Sidebar href resolves (no 404).
 *
 * BOUNDARY: No next/* or electron/* imports. Uses useNav from @pathos/adapters.
 * Styles use existing theme tokens (var(--p-*)) only; no theme drift.
 */

'use client';

import { useNav } from '@pathos/adapters';
import { DASHBOARD } from '../routes/routes';

export interface PlaceholderScreenProps {
  /** Optional short message; default "Coming soon". */
  message?: string;
}

/**
 * Renders a minimal "Coming soon" message and a "Back to Dashboard" button.
 * Used by Desktop (and optionally Next) for stub routes so Sidebar nav never 404s.
 */
export function PlaceholderScreen(props: PlaceholderScreenProps) {
  const nav = useNav();
  const message = props.message !== undefined && props.message !== null ? props.message : 'Coming soon';

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--p-text)' }}>
          {message}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--p-text-muted)' }}>
          This section is not yet available. Use the button below to return to the dashboard.
        </p>
      </div>

      <button
        type="button"
        onClick={function () {
          nav.push(DASHBOARD);
        }}
        className="px-4 py-2 text-sm font-medium transition-colors"
        style={{
          border: '1px solid var(--p-border)',
          borderRadius: 'var(--p-radius)',
          color: 'var(--p-text-muted)',
          background: 'transparent',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
