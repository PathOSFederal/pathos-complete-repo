'use client';

import { useState } from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function TspProjectionCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('retirement.tspProjection');
  const title = 'TSP Contribution & Growth';

  const [contributionRate, setContributionRate] = useState('10');

  // Mock data based on contribution rate
  const annualSalary = 130350;
  const agencyMatch = 5; // Always 5% max
  const rate = Number.parseInt(contributionRate);

  // Simple projection calculation (mock)
  const annualContribution = annualSalary * ((rate + agencyMatch) / 100);
  const currentBalance = 125000;

  // Projected balances at different time horizons (simplified compound growth at 7% avg return)
  const projectBalance = (years: number) => {
    const monthlyContribution = annualContribution / 12;
    const monthlyRate = 0.07 / 12;
    const months = years * 12;

    // Future value of current balance + future value of annuity
    const futureBalance = currentBalance * Math.pow(1 + monthlyRate, months);
    const futureContributions =
      monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

    return Math.round(futureBalance + futureContributions);
  };

  const projections = [
    { years: 10, balance: projectBalance(10) },
    { years: 20, balance: projectBalance(20) },
    { years: 30, balance: projectBalance(30) },
  ];

  const maxBalance = projections[projections.length - 1].balance;

  return (
    <Card className="border-border bg-card">
      <TooltipProvider>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  See how your TSP could grow over time
                </p>
              </div>
            </div>
            <DashboardCardVisibilityToggle cardKey="retirement.tspProjection" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {visible ? (
            <>
              {/* Contribution Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-foreground">Contribution Rate</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          The percentage of your salary you contribute to TSP each pay period. The IRS
                          limit for 2024 is $23,000 (or $30,500 if 50+).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={contributionRate} onValueChange={setContributionRate}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-foreground">Agency Match</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          The federal government automatically contributes 1% of your salary and matches
                          up to 4% of your contributions, for a maximum 5% match.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="h-10 px-3 flex items-center rounded-md border border-border bg-muted/30">
                    <span className="text-sm text-foreground">{agencyMatch}% (automatic)</span>
                  </div>
                </div>
              </div>

              {/* Annual Contribution Summary */}
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Annual Contribution</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {rate}% yours + {agencyMatch}% agency = {rate + agencyMatch}%
                    </p>
                  </div>
                  <SensitiveValue
                    value={`$${annualContribution.toLocaleString()}`}
                    className="text-xl font-bold text-accent"
                    hide={isSensitiveHidden}
                  />
                </div>
              </div>

              {/* Projection Timeline */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Projected TSP Balance</p>
                <div className="space-y-3">
                  {projections.map((projection) => (
                    <div key={projection.years} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{projection.years} years</span>
                        <SensitiveValue
                          value={`$${projection.balance.toLocaleString()}`}
                          className="font-semibold text-foreground"
                          hide={isSensitiveHidden}
                        />
                      </div>
                      <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-accent h-full rounded-full transition-all duration-500"
                          style={{ width: `${(projection.balance / maxBalance) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                * Projections assume 7% average annual return. Actual returns will vary. This is not
                investment advice.
              </p>
            </>
          ) : (
            <CardHiddenPlaceholder title={title} cardKey="retirement.tspProjection" />
          )}
        </CardContent>
      </TooltipProvider>
    </Card>
  );
}
