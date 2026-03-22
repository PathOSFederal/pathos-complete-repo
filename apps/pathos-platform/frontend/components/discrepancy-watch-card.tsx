'use client';

import { Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function DiscrepancyWatchCard() {
  const { visible } = useDashboardCardVisibility('other.discrepancyWatch');
  const title = 'Discrepancy Watch';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="other.discrepancyWatch" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              No issues detected
            </Badge>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 h-fit text-xs mt-0.5">
                  Info
                </Badge>
                <div>
                  <p className="text-foreground">Pay date correction pending</p>
                  <p className="text-xs text-muted-foreground">Resolves by Friday</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 h-fit text-xs mt-0.5">
                  Info
                </Badge>
                <div>
                  <p className="text-foreground">FEHB plan update notification</p>
                  <p className="text-xs text-muted-foreground">No action required</p>
                </div>
              </div>
            </div>

            <a
              href="/fedpath/pay-benefits"
              className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-sm font-medium transition-colors"
            >
              Open discrepancy report
              <Link className="w-3 h-3" />
            </a>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="other.discrepancyWatch" />
        )}
      </CardContent>
    </Card>
  );
}
