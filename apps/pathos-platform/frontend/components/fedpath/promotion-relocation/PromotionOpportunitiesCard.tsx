// components/fedpath/promotion-relocation/PromotionOpportunitiesCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function PromotionOpportunitiesCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('fedpath.promotionOpportunities');
  const title = 'Promotion Opportunities';

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="fedpath.promotionOpportunities" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            {/* Scenario 1 */}
            <div className="p-4 rounded-lg border border-border hover:border-accent/50 transition-colors bg-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">Senior Executive Service (SES-3)</p>
                  <p className="text-xs text-muted-foreground mt-1">Advanced Analytics Division</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <SensitiveValue value="+$18,500" hide={isSensitiveHidden} />
                </Badge>
              </div>
              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Salary</p>
                  <p className="font-bold">
                    <SensitiveValue value="$161,000" hide={isSensitiveHidden} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Timeline</p>
                  <p className="font-bold">12 months</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Competitiveness</p>
                  <p className="font-bold text-accent">High</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Net Impact</p>
                  <p className="font-bold text-green-500">
                    <SensitiveValue value="+$14,100/yr" hide={isSensitiveHidden} />
                  </p>
                </div>
              </div>
            </div>

            {/* Scenario 2 */}
            <div className="p-4 rounded-lg border border-border hover:border-accent/50 transition-colors bg-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">GS-15 Step 10 (Same Position)</p>
                  <p className="text-xs text-muted-foreground mt-1">Within Grade Advancement</p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <SensitiveValue value="+$8,200" hide={isSensitiveHidden} />
                </Badge>
              </div>
              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Salary</p>
                  <p className="font-bold">
                    <SensitiveValue value="$150,700" hide={isSensitiveHidden} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Timeline</p>
                  <p className="font-bold">24 months</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Competitiveness</p>
                  <p className="font-bold text-accent">Automatic</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Net Impact</p>
                  <p className="font-bold text-green-500">
                    <SensitiveValue value="+$6,200/yr" hide={isSensitiveHidden} />
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="fedpath.promotionOpportunities" />
        )}
      </CardContent>
    </Card>
  );
}
