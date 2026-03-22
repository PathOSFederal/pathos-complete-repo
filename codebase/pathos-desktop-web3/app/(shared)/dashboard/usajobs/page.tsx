'use client';

import { SharedDashboardRouteShell } from '../_components/SharedDashboardRouteShell';
import { SharedPlaceholderScreen } from '../_components/SharedPlaceholderScreen';

export default function UsajobsPage() {
  return (
    <SharedDashboardRouteShell>
      <SharedPlaceholderScreen
        title="USAJOBS"
        description="Review USAJOBS workflow modules in the shared dashboard."
      />
    </SharedDashboardRouteShell>
  );
}
