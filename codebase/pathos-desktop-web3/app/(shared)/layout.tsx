import type React from 'react';

/**
 * Shared route group layout.
 *
 * Intentionally minimal: shared routes render their own SharedAppShell from
 * @pathos/ui and must not be wrapped by the legacy Next AppShell.
 */
export default function SharedGroupLayout(props: { children: React.ReactNode }) {
  return <>{props.children}</>;
}
