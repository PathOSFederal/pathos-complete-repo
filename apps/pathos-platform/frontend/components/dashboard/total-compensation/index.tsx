'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { useProfileStore } from '@/store/profileStore';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import { EmployeeView } from './employee-view';
import { JobSeekerView } from './jobseeker-view';

export function TotalCompensationCard() {
  const user = useProfileStore((state) => state.user);
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('dashboard.totalCompensation');

  const title = user.currentEmployee ? 'Total Compensation' : 'Estimated Starting Salary';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            {title}
          </CardTitle>
          <DashboardCardVisibilityToggle cardKey="dashboard.totalCompensation" />
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
          <CardHiddenPlaceholder title={title} cardKey="dashboard.totalCompensation" />
        )}
      </CardContent>
    </Card>
  );
}
