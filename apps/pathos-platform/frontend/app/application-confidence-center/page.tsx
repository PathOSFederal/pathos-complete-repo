'use client';

/**
 * Application Confidence Center — current frontend page.
 * Renders ApplicationConfidenceCenterScreen inside the shared shell so the tab
 * resolves to the intended page (not 404 / broken experience).
 */

import { ApplicationConfidenceCenterScreen } from '@pathos/ui';
import { SharedDashboardRouteShell } from '../(shared)/dashboard/_components/SharedDashboardRouteShell';

export default function ApplicationConfidenceCenterPage() {
  return (
    <SharedDashboardRouteShell>
      <ApplicationConfidenceCenterScreen />
    </SharedDashboardRouteShell>
  );
}
