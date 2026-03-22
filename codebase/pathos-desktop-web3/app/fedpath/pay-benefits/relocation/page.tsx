'use client';

import { CurrentPositionCard } from '@/components/fedpath/promotion-relocation/CurrentPositionCard';
import { RelocationImpactCard } from '@/components/fedpath/promotion-relocation/RelocationImpactCard';
import { ScenarioSummaryCard } from '@/components/fedpath/promotion-relocation/ScenarioSummaryCard';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/contexts/privacy-context';

export default function RelocationPage() {
  const { globalHide } = usePrivacy();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Relocation & Locality</h1>
          <p className="text-muted-foreground">
            Compare different duty stations, locality rates, and cost of living changes with or
            without a promotion.
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
      <RelocationImpactCard />

      <ScenarioSummaryCard message="These relocation scenarios focus on your current grade and step. To evaluate relocating with a promotion, open a combined scenario in the Scenarios workspace and choose 'Promotion with relocation' as the scenario type." />
    </div>
  );
}
