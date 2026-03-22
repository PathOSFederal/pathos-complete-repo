'use client';

import { SharedDashboardRouteShell } from '../_components/SharedDashboardRouteShell';
import { SharedPlaceholderScreen } from '../_components/SharedPlaceholderScreen';

export default function CompensationPage() {
  return (
    <SharedDashboardRouteShell>
      <SharedPlaceholderScreen
        title="Compensation"
        description="Review compensation planning modules in the shared dashboard."
      />
    </SharedDashboardRouteShell>
  );
}
