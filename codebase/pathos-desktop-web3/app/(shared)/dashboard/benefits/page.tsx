'use client';

import { SharedDashboardRouteShell } from '../_components/SharedDashboardRouteShell';
import { SharedPlaceholderScreen } from '../_components/SharedPlaceholderScreen';

export default function BenefitsPage() {
  return (
    <SharedDashboardRouteShell>
      <SharedPlaceholderScreen
        title="Benefits"
        description="Review benefits planning modules in the shared dashboard."
      />
    </SharedDashboardRouteShell>
  );
}
