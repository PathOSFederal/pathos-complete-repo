'use client';

import { SharedDashboardRouteShell } from '../../_components/SharedDashboardRouteShell';
import { SharedPlaceholderScreen } from '../../_components/SharedPlaceholderScreen';

export default function ResumeReviewPage() {
  return (
    <SharedDashboardRouteShell>
      <SharedPlaceholderScreen
        title="Resume Review"
        description="Resume review workspace is being migrated into shared UI."
      />
    </SharedDashboardRouteShell>
  );
}
