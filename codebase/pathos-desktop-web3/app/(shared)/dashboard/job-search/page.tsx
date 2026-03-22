'use client';

import { JobSearchScreen } from '@pathos/ui';
import { SharedDashboardRouteShell } from '../_components/SharedDashboardRouteShell';

export default function JobSearchPage() {
  return (
    <SharedDashboardRouteShell>
      <JobSearchScreen />
    </SharedDashboardRouteShell>
  );
}
