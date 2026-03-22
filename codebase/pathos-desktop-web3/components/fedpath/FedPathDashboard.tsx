'use client';

import { FedPathHeroCard } from '@/components/fedpath-hero-card';
import { NetPayCard } from '@/components/net-pay-card';
import { RetirementReadinessCard } from '@/components/retirement-readiness-card';
import { TaxWithholdingCard } from '@/components/tax-withholding-card';
import { FehbOverviewCard } from '@/components/fehb-overview-card';
import { LeaveBalancesCard } from '@/components/leave-balances-card';
import { DiscrepancyWatchCard } from '@/components/discrepancy-watch-card';
import { RecentPayStubsCard } from '@/components/recent-pay-stubs-card';
import { FedPathRecommendationsCard } from '@/components/fedpath-recommendations-card';
import { DocumentsCard } from '@/components/documents-card';
import { UpcomingDeadlinesCard } from '@/components/upcoming-deadlines-card';

export default function FedPathDashboard() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <FedPathHeroCard />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NetPayCard />
        <RetirementReadinessCard />
        <TaxWithholdingCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FehbOverviewCard />
        <LeaveBalancesCard />
        <DiscrepancyWatchCard />
        <RecentPayStubsCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FedPathRecommendationsCard />
        <DocumentsCard />
        <UpcomingDeadlinesCard />
      </div>
    </div>
  );
}
