// components/fedpath/promotion-relocation/CurrentPositionCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function CurrentPositionCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('fedpath.currentPosition');
  const title = 'Current Position';

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="fedpath.currentPosition" />
        </div>
      </CardHeader>
      <CardContent>
        {visible ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-sm text-muted-foreground mb-2">Grade</p>
              <p className="text-2xl font-bold">
                <SensitiveValue value="GS-15 Step 5" masked="GS-•• Step •" hide={isSensitiveHidden} />
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-sm text-muted-foreground mb-2">Location</p>
              <p className="text-2xl font-bold">
                <SensitiveValue value="Washington, DC" masked="••••••••••" hide={isSensitiveHidden} />
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-sm text-muted-foreground mb-2">Base Salary</p>
              <p className="text-2xl font-bold">
                <SensitiveValue value="$142,500" hide={isSensitiveHidden} />
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-sm text-muted-foreground mb-2">Locality Pay</p>
              <p className="text-2xl font-bold">
                <SensitiveValue value="$31,200" hide={isSensitiveHidden} />
              </p>
            </div>
          </div>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="fedpath.currentPosition" />
        )}
      </CardContent>
    </Card>
  );
}
