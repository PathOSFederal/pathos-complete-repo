'use client';

import { SavedJobsScreen } from '@pathos/ui';
import { SharedDashboardRouteShell } from '../_components/SharedDashboardRouteShell';

export default function SavedJobsPage() {
  return (
    <SharedDashboardRouteShell>
      <SavedJobsScreen />
    </SharedDashboardRouteShell>
  );
}
