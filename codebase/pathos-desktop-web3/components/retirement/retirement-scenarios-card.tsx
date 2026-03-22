'use client';

import { useState, useMemo } from 'react';
import { Sliders, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

type RiskLevel = 'conservative' | 'moderate' | 'aggressive';
type ReadinessStatus = 'on-track' | 'needs-attention' | 'aggressive-assumptions';

export function RetirementScenariosCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('retirement.scenarios');
  const title = 'Retirement Scenario Builder';

  const [retirementAge, setRetirementAge] = useState('62');
  const [contributionRate, setContributionRate] = useState('10');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('moderate');

  const scenario = useMemo(() => {
    /**
     * BASE DATA (moved inside useMemo):
     * Previously defined outside useMemo, causing ESLint warning about
     * object reference instability. Now defined here so it doesn't
     * need to be in the dependency array.
     * In production, this would come from an API.
     */
    const baseData = {
      currentAge: 42,
      currentSalary: 130350,
      currentTspBalance: 125000,
      high3Salary: 126050,
      agencyMatch: 5,
    };

    const targetAge = Number.parseInt(retirementAge);
    const contribution = Number.parseInt(contributionRate);
    const yearsToRetirement = targetAge - baseData.currentAge;
    const yearsOfService = 20 + (targetAge - 62); // Assuming 20 years at age 62

    // Return rates based on risk level
    const returnRates: Record<RiskLevel, number> = {
      conservative: 0.05,
      moderate: 0.07,
      aggressive: 0.09,
    };
    const annualReturn = returnRates[riskLevel];

    // TSP projection
    const annualContribution =
      baseData.currentSalary * ((contribution + baseData.agencyMatch) / 100);
    const monthlyContribution = annualContribution / 12;
    const monthlyRate = annualReturn / 12;
    const months = yearsToRetirement * 12;

    const futureBalance = baseData.currentTspBalance * Math.pow(1 + monthlyRate, months);
    const futureContributions =
      monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const projectedTspBalance = Math.round(futureBalance + futureContributions);

    // FERS pension calculation
    const multiplier = targetAge >= 62 && yearsOfService >= 20 ? 1.1 : 1.0;
    const annualPension = Math.round(
      baseData.high3Salary * (multiplier / 100) * Math.max(yearsOfService, 0),
    );

    // Total retirement income (simplified: pension + 4% TSP withdrawal)
    const tspWithdrawal = Math.round(projectedTspBalance * 0.04);
    const totalRetirementIncome = annualPension + tspWithdrawal;

    // Readiness assessment
    const incomeReplacement = (totalRetirementIncome / baseData.currentSalary) * 100;
    let readiness: ReadinessStatus;
    if (incomeReplacement >= 70) {
      readiness = 'on-track';
    } else if (incomeReplacement >= 50 || riskLevel === 'aggressive') {
      readiness = riskLevel === 'aggressive' ? 'aggressive-assumptions' : 'needs-attention';
    } else {
      readiness = 'needs-attention';
    }

    return {
      yearsToRetirement,
      yearsOfService: Math.max(yearsOfService, 0),
      projectedTspBalance,
      annualPension,
      tspWithdrawal,
      totalRetirementIncome,
      incomeReplacement: Math.round(incomeReplacement),
      readiness,
    };
  }, [retirementAge, contributionRate, riskLevel]);

  const getReadinessInfo = (status: ReadinessStatus) => {
    switch (status) {
      case 'on-track':
        return {
          label: 'On Track',
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10 border-green-500/30',
        };
      case 'needs-attention':
        return {
          label: 'Needs Attention',
          icon: AlertTriangle,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10 border-amber-500/30',
        };
      case 'aggressive-assumptions':
        return {
          label: 'Aggressive Assumptions',
          icon: AlertCircle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10 border-orange-500/30',
        };
    }
  };

  const readinessInfo = getReadinessInfo(scenario.readiness);
  const ReadinessIcon = readinessInfo.icon;

  return (
    <Card className="border-border bg-card">
      <TooltipProvider>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <Sliders className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explore different retirement scenarios
                </p>
              </div>
            </div>
            <DashboardCardVisibilityToggle cardKey="retirement.scenarios" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {visible ? (
            <>
              {/* Scenario Inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Retirement Age</label>
                  <Select value={retirementAge} onValueChange={setRetirementAge}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="57">57 (MRA)</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                      <SelectItem value="62">62</SelectItem>
                      <SelectItem value="65">65</SelectItem>
                      <SelectItem value="67">67</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">TSP Rate</label>
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
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-medium text-foreground">Risk Level</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Conservative: 5% return, Moderate: 7% return, Aggressive: 9% return. These are
                          assumed average annual returns.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Scenario Summary */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Scenario Summary</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Projected TSP Balance</p>
                    <SensitiveValue
                      value={`$${scenario.projectedTspBalance.toLocaleString()}`}
                      className="text-lg font-bold text-foreground"
                      hide={isSensitiveHidden}
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">FERS Pension</p>
                    <SensitiveValue
                      value={`$${scenario.annualPension.toLocaleString()}`}
                      className="text-lg font-bold text-foreground"
                      hide={isSensitiveHidden}
                    />
                    <p className="text-xs text-muted-foreground">/year</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Total Retirement Income</p>
                      <p className="text-xs text-muted-foreground">FERS + 4% TSP withdrawal</p>
                    </div>
                    <SensitiveValue
                      value={`$${scenario.totalRetirementIncome.toLocaleString()}`}
                      className="text-xl font-bold text-accent"
                      hide={isSensitiveHidden}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Income replacement: {scenario.incomeReplacement}% of current salary
                  </p>
                </div>

                {/* Readiness Badge */}
                <div
                  className={`p-3 rounded-lg border ${readinessInfo.bgColor} flex items-center gap-3`}
                >
                  <ReadinessIcon className={`w-5 h-5 ${readinessInfo.color}`} />
                  <div>
                    <Badge variant="outline" className={`${readinessInfo.color} border-current`}>
                      {readinessInfo.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scenario.readiness === 'on-track'
                        ? 'This scenario meets the 70% income replacement target.'
                        : scenario.readiness === 'aggressive-assumptions'
                          ? 'This scenario relies on above-average market returns.'
                          : 'Consider increasing contributions or delaying retirement.'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                * These projections are for illustration only and do not account for inflation, taxes,
                or Social Security.
              </p>
            </>
          ) : (
            <CardHiddenPlaceholder title={title} cardKey="retirement.scenarios" />
          )}
        </CardContent>
      </TooltipProvider>
    </Card>
  );
}
