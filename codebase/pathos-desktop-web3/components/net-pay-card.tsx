'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'lucide-react';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function NetPayCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('compensation.netPay');
  const title = 'Net Monthly Pay';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="compensation.netPay" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            <div>
              <div className="text-3xl font-bold text-accent">
                <SensitiveValue value="$5,847" hide={isSensitiveHidden} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Gross: <SensitiveValue value="$8,123" hide={isSensitiveHidden} /> | Deductions:{' '}
                <SensitiveValue value="$2,276" hide={isSensitiveHidden} />
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Base</p>
                <p className="font-medium text-foreground">
                  <SensitiveValue value="$5,941" hide={isSensitiveHidden} />
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Locality</p>
                <p className="font-medium text-foreground">
                  <SensitiveValue value="$1,847" hide={isSensitiveHidden} />
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Retirement</p>
                <p className="font-medium text-destructive">
                  <SensitiveValue value="-$612" hide={isSensitiveHidden} />
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">FEHB</p>
                <p className="font-medium text-destructive">
                  <SensitiveValue value="-$450" hide={isSensitiveHidden} />
                </p>
              </div>
            </div>

            <div className="h-6 bg-secondary/20 rounded flex items-center px-2">
              <div className="flex gap-0.5 w-full">
                <div className="flex-1 h-1 bg-accent rounded-full" />
                <div className="flex-1 h-1 bg-secondary rounded-full" />
                <div className="flex-1 h-1 bg-accent rounded-full" />
                <div className="flex-1 h-1 bg-secondary rounded-full" />
              </div>
            </div>

            <a
              href="/fedpath/pay-benefits"
              className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-sm font-medium transition-colors"
            >
              View pay & benefits
              <Link className="w-3 h-3" />
            </a>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="compensation.netPay" />
        )}
      </CardContent>
    </Card>
  );
}
