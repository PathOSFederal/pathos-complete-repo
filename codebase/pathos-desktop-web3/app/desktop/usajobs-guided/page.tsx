/**
 * ============================================================================
 * DESKTOP USAJOBS GUIDED ROUTE (Day 45)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Route entry for the Electron desktop shell spike.
 *
 * WHY THIS FILE EXISTS:
 * - Electron loads this route as the renderer UI.
 * - The page renders the reserved BrowserView placeholder + PathAdvisor panel.
 * ============================================================================
 */

import { GuidedUsaJobsDesktopWorkspace } from '@/components/desktop/GuidedUsaJobsDesktopWorkspace';

export default function GuidedUsaJobsDesktopPage() {
  return <GuidedUsaJobsDesktopWorkspace />;
}
