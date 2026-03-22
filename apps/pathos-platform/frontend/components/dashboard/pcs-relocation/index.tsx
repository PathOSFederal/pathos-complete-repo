'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, MapPin } from 'lucide-react';
import { useProfileStore } from '@/store/profileStore';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import { EmployeeView } from './employee-view';
import { JobSeekerView } from './jobseeker-view';

export function PcsRelocationCard() {
  const user = useProfileStore((state) => state.user);
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('dashboard.pcsRelocation');

  const title = user.currentEmployee ? 'PCS/Relocation' : 'Location & COL Insights';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {user.currentEmployee ? (
              <>
                <Plane className="w-4 h-4" />
                {title}
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                {title}
              </>
            )}
          </CardTitle>
          <DashboardCardVisibilityToggle cardKey="dashboard.pcsRelocation" />
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
          <CardHiddenPlaceholder title={title} cardKey="dashboard.pcsRelocation" />
        )}
      </CardContent>
    </Card>
  );
}
