'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function LeaveBalancesCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('other.leaveBalances');
  const title = 'Leave Balances';

  const leaves = [
    { type: 'Annual', hours: 156, percent: 65 },
    { type: 'Sick', hours: 89, percent: 74 },
    { type: 'Comp', hours: 24, percent: 80 },
    { type: 'Other', hours: 12, percent: 40 },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="other.leaveBalances" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible ? (
          leaves.map((leave) => (
            <div key={leave.type}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-foreground">{leave.type}</p>
                <p className="text-xs text-muted-foreground">
                  <SensitiveValue value={`${leave.hours}h`} masked="•••h" hide={isSensitiveHidden} />
                </p>
              </div>
              <div className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${leave.percent}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="other.leaveBalances" />
        )}
      </CardContent>
    </Card>
  );
}
