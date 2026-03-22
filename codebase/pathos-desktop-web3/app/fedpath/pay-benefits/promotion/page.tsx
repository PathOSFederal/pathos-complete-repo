'use client';

import { CurrentPositionCard } from '@/components/fedpath/promotion-relocation/CurrentPositionCard';
import { PromotionOpportunitiesCard } from '@/components/fedpath/promotion-relocation/PromotionOpportunitiesCard';
import { ScenarioSummaryCard } from '@/components/fedpath/promotion-relocation/ScenarioSummaryCard';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/contexts/privacy-context';

export default function PromotionPage() {
  const { globalHide } = usePrivacy();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Promotion Scenarios</h1>
          <p className="text-muted-foreground">
            Explore grade, step, and SES opportunities based on your current role.
          </p>
        </div>
        <Badge
          variant="outline"
          className={`flex items-center gap-1.5 ${
            globalHide
              ? 'border-accent/50 text-accent'
              : 'border-muted-foreground/30 text-muted-foreground'
          }`}
        >
          {globalHide ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          Privacy: {globalHide ? 'Active' : 'Off'}
        </Badge>
      </div>

      <CurrentPositionCard />
      <PromotionOpportunitiesCard />

      <ScenarioSummaryCard message="These promotion paths assume you stay in your current duty station. To see how relocating with a promotion would change your net outcome, open a combined scenario in the Scenarios workspace and choose 'Promotion with relocation'." />
    </div>
  );
}
