'use client';

import { Link } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function TaxWithholdingCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('compensation.taxWithholding');
  const title = 'Tax & Withholding';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="compensation.taxWithholding" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Outcome</p>
              <SensitiveValue
                value="$1,240 Refund"
                masked="$•,••• Refund"
                hide={isSensitiveHidden}
                className="text-2xl font-bold text-green-400 mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Withholding Progress</p>
                <p className="text-xs font-medium text-foreground">65%</p>
              </div>
              <div className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-accent rounded-full" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Draft return 65% complete from pay stubs</p>

            <a
              href="/fedpath/tax-compliance"
              className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-sm font-medium transition-colors"
            >
              Open tax & withholding
              <Link className="w-3 h-3" />
            </a>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="compensation.taxWithholding" />
        )}
      </CardContent>
    </Card>
  );
}
