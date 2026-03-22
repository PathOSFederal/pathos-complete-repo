'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function FedPathRecommendationsCard() {
  const { visible } = useDashboardCardVisibility('other.recommendations');
  const title = 'FedPath Recommendations';

  const recommendations = [
    {
      action: 'Increase TSP contribution by 2%',
      impact: 'Gains $240/mo in retirement',
      button: 'Simulate',
    },
    {
      action: 'Switch to Aetna Open Access',
      impact: 'Save $120/month on premiums',
      button: 'Simulate',
    },
    { action: 'Adjust federal tax withholding', impact: 'Optimize refund', button: 'Simulate' },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="other.recommendations" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible ? (
          recommendations.map((rec, i) => (
            <div key={i} className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
              <p className="text-sm font-medium text-foreground">{rec.action}</p>
              <p className="text-xs text-muted-foreground mt-1">{rec.impact}</p>
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs">
                {rec.button}
              </Button>
            </div>
          ))
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="other.recommendations" />
        )}
      </CardContent>
    </Card>
  );
}
