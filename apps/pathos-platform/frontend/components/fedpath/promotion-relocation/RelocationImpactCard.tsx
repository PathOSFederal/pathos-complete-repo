// components/fedpath/promotion-relocation/RelocationImpactCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function RelocationImpactCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('fedpath.relocationImpact');
  const title = 'Relocation Impact Analysis';

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="fedpath.relocationImpact" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            {/* Denver */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">Denver, CO - Same Grade</p>
                  <p className="text-xs text-muted-foreground mt-1">GS-15 Step 5 position available</p>
                </div>
                <Badge variant="secondary">
                  <SensitiveValue value="-$8,400" hide={isSensitiveHidden} />
                </Badge>
              </div>
              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Base Salary</p>
                  <p className="font-bold">
                    <SensitiveValue value="$142,500" hide={isSensitiveHidden} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Locality</p>
                  <p className="font-bold">
                    <SensitiveValue value="$22,800" hide={isSensitiveHidden} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cost of Living</p>
                  <p className="font-bold text-green-500">-8%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Net Change</p>
                  <p className="font-bold">
                    <SensitiveValue value="-$8,400/yr" hide={isSensitiveHidden} />
                  </p>
                </div>
              </div>
            </div>

            {/* Austin */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">Austin, TX - Promotion Track</p>
                  <p className="text-xs text-muted-foreground mt-1">GS-15 Step 7 position available</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <SensitiveValue value="+$12,100" hide={isSensitiveHidden} />
                </Badge>
              </div>
              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Base Salary</p>
                  <p className="font-bold">
                    <SensitiveValue value="$142,500" hide={isSensitiveHidden} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Locality</p>
                  <p className="font-bold">
                    <SensitiveValue value="$19,800" hide={isSensitiveHidden} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cost of Living</p>
                  <p className="font-bold text-green-500">-12%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Net Change</p>
                  <p className="font-bold text-green-500">
                    <SensitiveValue value="+$12,100/yr" hide={isSensitiveHidden} />
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="fedpath.relocationImpact" />
        )}
      </CardContent>
    </Card>
  );
}
