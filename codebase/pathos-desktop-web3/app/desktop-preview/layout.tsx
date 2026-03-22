/**
 * ============================================================================
 * DESKTOP PREVIEW LAYOUT
 * ============================================================================
 *
 * This layout wraps the /desktop-preview/* routes with the
 * PreviewNavigationProvider (in-memory router) so that shared UI
 * components from @pathos/ui can navigate without Next.js router hooks.
 *
 * PURPOSE:
 * Allows visual verification of the shared desktop AppShell + screens
 * inside the v0 sandbox browser, without running Electron.
 */

import type React from 'react';

export const metadata = {
  title: 'PathOS Desktop Preview',
  description: 'Preview of the shared desktop app shell and screens',
};

export default function DesktopPreviewLayout(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {props.children}
    </div>
  );
}
