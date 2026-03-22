'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function RecentPayStubsCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('compensation.payStubs');
  const title = 'Recent Pay Stubs';

  const stubs = [
    { period: 'Nov 15 - 29', net: '$5,847', type: 'Regular', status: 'Received' },
    { period: 'Nov 1 - 14', net: '$5,923', type: 'Regular', status: 'Received' },
    { period: 'Oct 18 - Nov 1', net: '$5,741', type: 'Regular', status: 'Received' },
    { period: 'Oct 1 - 17', net: '$2,924', type: 'Pay Period', status: 'Received' },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="compensation.payStubs" />
        </div>
      </CardHeader>
      <CardContent>
        {visible ? (
          <div className="space-y-2">
            {stubs.map((stub, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-secondary/10 text-sm"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{stub.period}</p>
                  <p className="text-xs text-muted-foreground">{stub.type}</p>
                </div>
                <p className="font-medium text-accent">
                  <SensitiveValue value={stub.net} hide={isSensitiveHidden} />
                </p>
                <Badge variant="outline" className="ml-2">
                  {stub.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="compensation.payStubs" />
        )}
      </CardContent>
    </Card>
  );
}
