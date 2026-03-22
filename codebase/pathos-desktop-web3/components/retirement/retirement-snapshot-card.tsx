'use client';

import { Target, Info, Calendar, Briefcase, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function RetirementSnapshotCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('retirement.snapshot');
  const title = 'Retirement Snapshot';

  // Mock data
  const mockData = {
    targetRetirementAge: 62,
    currentAge: 42,
    yearsOfService: 20,
    projectedFersPensionAnnual: 52140,
    projectedFersPensionMonthly: 4345,
    projectedTspBalance: 650000,
    currentSalary: 130350,
    incomeReplacementRate: 72,
  };

  const yearsToRetirement = mockData.targetRetirementAge - mockData.currentAge;

  return (
    <Card className="border-border bg-card">
      <TooltipProvider>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your projected retirement at a glance
                </p>
              </div>
            </div>
            <DashboardCardVisibilityToggle cardKey="retirement.snapshot" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {visible ? (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Target Retirement Age</p>
                  </div>
                  <p className="text-xl font-bold text-foreground">{mockData.targetRetirementAge}</p>
                  <p className="text-xs text-muted-foreground mt-1">{yearsToRetirement} years away</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Years of Service</p>
                  </div>
                  <p className="text-xl font-bold text-foreground">{mockData.yearsOfService}</p>
                  <p className="text-xs text-muted-foreground mt-1">creditable years</p>
                </div>
              </div>

              {/* Projected Values */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Projected Retirement Income</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Based on your current trajectory, these are estimated values at retirement.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-accent" />
                      <p className="text-xs text-muted-foreground">FERS Pension (Annual)</p>
                    </div>
                    <SensitiveValue
                      value={`$${mockData.projectedFersPensionAnnual.toLocaleString()}`}
                      className="text-xl font-bold text-accent"
                      hide={isSensitiveHidden}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      <SensitiveValue
                        value={`$${mockData.projectedFersPensionMonthly.toLocaleString()}`}
                        hide={isSensitiveHidden}
                        className="inline"
                      />
                      /month
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-accent" />
                      <p className="text-xs text-muted-foreground">Projected TSP Balance</p>
                    </div>
                    <SensitiveValue
                      value={`$${mockData.projectedTspBalance.toLocaleString()}`}
                      className="text-xl font-bold text-accent"
                      hide={isSensitiveHidden}
                    />
                    <p className="text-xs text-muted-foreground mt-1">at retirement</p>
                  </div>
                </div>

                {/* Income Replacement Rate */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">Income Replacement Rate</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            The percentage of your current salary that your retirement income (FERS
                            pension + TSP withdrawals) is expected to replace. Financial advisors often
                            recommend 70-80%.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-lg font-bold text-accent">
                      {mockData.incomeReplacementRate}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-accent h-full rounded-full transition-all"
                      style={{ width: `${Math.min(mockData.incomeReplacementRate, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: 70-80% of{' '}
                    <SensitiveValue
                      value={`$${mockData.currentSalary.toLocaleString()}`}
                      hide={isSensitiveHidden}
                      className="inline"
                    />{' '}
                    current salary
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                * These are estimates only and should not be considered financial advice. Actual
                retirement income may vary based on future decisions and market conditions.
              </p>
            </>
          ) : (
            <CardHiddenPlaceholder title={title} cardKey="retirement.snapshot" />
          )}
        </CardContent>
      </TooltipProvider>
    </Card>
  );
}
