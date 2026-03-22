'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function FehbOverviewCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('other.fehbOverview');
  const title = 'FEHB Plan Overview';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="other.fehbOverview" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            <div>
              <p className="text-sm font-medium text-foreground">Blue Cross Blue Shield Standard</p>
              <p className="text-lg font-bold text-accent mt-1">
                <SensitiveValue value="$5,400/year" hide={isSensitiveHidden} />
              </p>
            </div>

            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Better plan available
            </Badge>

            <div className="h-12 bg-secondary/10 rounded-lg flex items-center px-3 gap-2">
              <div className="flex-1 h-1.5 bg-amber-500/50 rounded-full" />
              <span className="text-xs font-medium text-foreground">vs</span>
              <div className="flex-1 h-1.5 bg-green-500/50 rounded-full" />
            </div>

            <Button className="w-full bg-transparent" variant="outline" size="sm" asChild>
              <a href="/fedpath/fehb-optimizer">Compare plans in FEHB Optimizer</a>
            </Button>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="other.fehbOverview" />
        )}
      </CardContent>
    </Card>
  );
}
