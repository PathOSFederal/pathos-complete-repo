'use client';

import { ResumeBuilderScreen } from '@pathos/ui';
import { SharedDashboardRouteShell } from '../_components/SharedDashboardRouteShell';

export default function ResumeBuilderPage() {
  return (
    <SharedDashboardRouteShell>
      <ResumeBuilderScreen />
    </SharedDashboardRouteShell>
  );
}
