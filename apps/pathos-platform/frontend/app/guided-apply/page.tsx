'use client';

/**
 * Guided Apply — current frontend page.
 * Renders GuidedApplyScreen inside the shared shell so tab resolves to the
 * intended page (not the legacy desktop/usajobs-guided workspace).
 */

import { GuidedApplyScreen } from '@pathos/ui';
import { SharedDashboardRouteShell } from '../(shared)/dashboard/_components/SharedDashboardRouteShell';

export default function GuidedApplyPage() {
  return (
    <SharedDashboardRouteShell>
      <GuidedApplyScreen />
    </SharedDashboardRouteShell>
  );
}
