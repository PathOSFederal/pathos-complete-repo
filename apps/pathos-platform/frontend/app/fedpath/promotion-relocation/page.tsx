'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CurrentPositionCard } from '@/components/fedpath/promotion-relocation/CurrentPositionCard';
import { PromotionOpportunitiesCard } from '@/components/fedpath/promotion-relocation/PromotionOpportunitiesCard';
import { RelocationImpactCard } from '@/components/fedpath/promotion-relocation/RelocationImpactCard';
import { usePrivacy } from '@/contexts/privacy-context';

export default function PromotionRelocationPage() {
  const { globalHide } = usePrivacy();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Promotion & Relocation Scenarios</h1>
        <p className="text-muted-foreground">
          Compare current role vs target positions and locations
        </p>
        <Badge variant="outline" className="mt-2">
          <span className="text-xs">Privacy: {globalHide ? 'Active' : 'Off'}</span>
        </Badge>
      </div>

      <CurrentPositionCard />

      <PromotionOpportunitiesCard />

      <RelocationImpactCard />

      <Card className="border-accent/50 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-lg">PathAdvisor Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            The SES-3 promotion at your current location offers the strongest career growth with
            minimal lifestyle disruption. Focus on building your executive presence and leadership
            portfolio for the next 12 months.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
