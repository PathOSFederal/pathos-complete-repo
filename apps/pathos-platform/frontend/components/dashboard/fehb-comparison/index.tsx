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

export function FehbComparisonCard() {
  const user = useProfileStore((state) => state.user);
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('dashboard.fehbComparison');

  const title = user.currentEmployee ? 'FEHB Comparison' : 'FEHB Plan Options';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <DashboardCardVisibilityToggle cardKey="dashboard.fehbComparison" />
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
          <CardHiddenPlaceholder title={title} cardKey="dashboard.fehbComparison" />
        )}
      </CardContent>
    </Card>
  );
}
