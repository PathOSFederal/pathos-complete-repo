'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProfileStore } from '@/store/profileStore';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import { EmployeeView } from './employee-view';
import { JobSeekerView } from './jobseeker-view';

export function TaxInsightsCard() {
  const user = useProfileStore((state) => state.user);
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('dashboard.taxInsights');

  const title = user.currentEmployee ? 'Tax Insights' : 'Location Tax Comparison';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <DashboardCardVisibilityToggle cardKey="dashboard.taxInsights" />
        </div>
      </CardHeader>
      <CardContent>
        {visible ? (
          user.currentEmployee ? (
            <EmployeeView user={user} isHidden={isSensitiveHidden} />
          ) : (
            <JobSeekerView user={user} isHidden={isSensitiveHidden} />
          )
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="dashboard.taxInsights" />
        )}
      </CardContent>
    </Card>
  );
}
