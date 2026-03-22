'use client';

import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function UpcomingDeadlinesCard() {
  const { visible } = useDashboardCardVisibility('other.upcomingDeadlines');
  const title = 'Upcoming Deadlines';

  const deadlines = [
    { event: 'FEHB Open Season Ends', date: 'Dec 10, 2024', severity: 'critical' },
    { event: 'Tax Return Due', date: 'Apr 15, 2025', severity: 'normal' },
    { event: 'Pay Anomaly Follow-up', date: 'Dec 5, 2024', severity: 'normal' },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="other.upcomingDeadlines" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible ? (
          deadlines.map((deadline, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-secondary/10">
              <AlertCircle
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${deadline.severity === 'critical' ? 'text-destructive' : 'text-accent'}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{deadline.event}</p>
                <p className="text-xs text-muted-foreground">{deadline.date}</p>
              </div>
            </div>
          ))
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="other.upcomingDeadlines" />
        )}
      </CardContent>
    </Card>
  );
}
