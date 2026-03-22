'use client';

import { SharedDashboardRouteShell } from '../_components/SharedDashboardRouteShell';
import { SharedPlaceholderScreen } from '../_components/SharedPlaceholderScreen';

export default function RetirementPage() {
  return (
    <SharedDashboardRouteShell>
      <SharedPlaceholderScreen
        title="Retirement"
        description="Review retirement planning modules in the shared dashboard."
      />
    </SharedDashboardRouteShell>
  );
}
