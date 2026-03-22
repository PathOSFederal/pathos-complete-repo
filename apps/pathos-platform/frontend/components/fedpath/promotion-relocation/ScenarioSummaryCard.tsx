// components/fedpath/promotion-relocation/ScenarioSummaryCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function ScenarioSummaryCard({ message }: { message: string }) {
  const { visible } = useDashboardCardVisibility('fedpath.scenarioSummary');
  const title = 'Scenario Summary';

  return (
    <Card className="border-accent/50 bg-accent/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="fedpath.scenarioSummary" />
        </div>
      </CardHeader>
      <CardContent>
        {visible ? (
          <p className="text-sm text-foreground">{message}</p>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="fedpath.scenarioSummary" />
        )}
      </CardContent>
    </Card>
  );
}
