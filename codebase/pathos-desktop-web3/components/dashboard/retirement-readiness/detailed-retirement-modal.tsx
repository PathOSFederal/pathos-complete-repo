'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CardVisibilityToggle } from '@/components/compensation/card-visibility-toggle';
import { SensitiveValue } from '@/components/sensitive-value';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, ExternalLink, Clock, Info, X } from 'lucide-react';
import Link from 'next/link';
import { useUserPreferences } from '@/contexts/user-preferences-context';

/**
 * BASE RETIREMENT DATA (module-level constant):
 * Defined outside the component for stable reference. This avoids
 * the ESLint react-hooks/exhaustive-deps warning about object
 * instability in useMemo dependencies.
 * In production, this would come from an API.
 */
const BASE_RETIREMENT_DATA = {
  currentAge: 45,
  yearsOfService: 18,
  mraAge: 57,
  mraYear: 2037,
  currentTspBalance: 487000,
  currentSalary: 122450,
  high3Estimate: 118000,
  agencyContributionPercent: 5,
};

interface DetailedRetirementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetailedRetirementModal({ open, onOpenChange }: DetailedRetirementModalProps) {
  const [scenario, setScenario] = useState('mra30');
  const [isHidden, setIsHidden] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const { hasSeenRetirementDisclaimer, setHasSeenRetirementDisclaimer } = useUserPreferences();
  const [hideRetirementBanner, setHideRetirementBanner] = useState(false);
  const showBanner = !hasSeenRetirementDisclaimer && !hideRetirementBanner;

  const [assumptions, setAssumptions] = useState({
    plannedRetirementScenario: 'mra30' as 'mra30' | 'age62' | 'age65',
    tspInvestmentReturn: 5.5,
    tspContributionPercent: 5,
    includeSocialSecurity: true,
  });

  const localOverride = isHidden ? 'hide' : 'default';

  // Calculate projections based on assumptions
  const projections = useMemo(() => {
    const {
      currentAge,
      yearsOfService,
      mraAge,
      currentTspBalance,
      currentSalary,
      high3Estimate,
      agencyContributionPercent,
    } = BASE_RETIREMENT_DATA;

    let retirementAge: number;
    let accrualRate: number;

    switch (assumptions.plannedRetirementScenario) {
      case 'age62':
        retirementAge = 62;
        accrualRate = yearsOfService >= 20 ? 0.011 : 0.01;
        break;
      case 'age65':
        retirementAge = 65;
        accrualRate = yearsOfService >= 20 ? 0.011 : 0.01;
        break;
      default: // mra30
        retirementAge = mraAge;
        accrualRate = 0.01;
    }

    const yearsUntilRetirement = retirementAge - currentAge;
    const yearsOfServiceAtRetirement = yearsOfService + yearsUntilRetirement;

    // FERS pension calculation
    const fersAnnual = Math.round(high3Estimate * accrualRate * yearsOfServiceAtRetirement);
    const fersAt62 = Math.round(high3Estimate * 0.011 * (yearsOfService + (62 - currentAge)));

    // TSP projection with compound growth
    const annualContribution =
      currentSalary * (assumptions.tspContributionPercent / 100 + agencyContributionPercent / 100);
    const returnRate = assumptions.tspInvestmentReturn / 100;

    let projectedTsp = currentTspBalance;
    for (let i = 0; i < yearsUntilRetirement; i++) {
      projectedTsp = projectedTsp * (1 + returnRate) + annualContribution;
    }
    projectedTsp = Math.round(projectedTsp);

    // Estimated monthly income from TSP (4% rule)
    const monthlyTspIncome = Math.round((projectedTsp * 0.04) / 12);

    // Social Security estimate (simplified)
    const socialSecurityMonthly = assumptions.includeSocialSecurity ? 2400 : 0;

    // Total monthly retirement income
    const totalMonthlyIncome =
      Math.round(fersAnnual / 12) + monthlyTspIncome + socialSecurityMonthly;

    // Retirement readiness (percentage of current income replaced)
    const currentMonthlyIncome = currentSalary / 12;
    const readinessPercent = Math.min(
      100,
      Math.round((totalMonthlyIncome / currentMonthlyIncome) * 100),
    );

    // Months/years until retirement
    const yearsDisplay = Math.floor(yearsUntilRetirement);
    const monthsDisplay = Math.round((yearsUntilRetirement - yearsDisplay) * 12);

    return {
      retirementAge,
      retirementYear: new Date().getFullYear() + yearsUntilRetirement,
      yearsUntilRetirement,
      yearsDisplay,
      monthsDisplay,
      yearsOfServiceAtRetirement,
      accrualRate,
      fersAnnual,
      fersAt62,
      high3Estimate,
      projectedTsp,
      monthlyTspIncome,
      socialSecurityMonthly,
      totalMonthlyIncome,
      readinessPercent,
      currentTspBalance,
      tspContributionPercent: assumptions.tspContributionPercent,
      agencyContributionPercent,
    };
  }, [assumptions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const updateAssumption = <K extends keyof typeof assumptions>(
    key: K,
    value: (typeof assumptions)[K],
  ) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  };

  // Calculate income source percentages for visualization
  const fersPercent = Math.round(
    (projections.fersAnnual / 12 / projections.totalMonthlyIncome) * 100,
  );
  const tspPercent = Math.round(
    (projections.monthlyTspIncome / projections.totalMonthlyIncome) * 100,
  );
  const ssPercent = 100 - fersPercent - tspPercent;

  // Status based on readiness
  const getStatusBadge = () => {
    if (projections.readinessPercent >= 80) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          On track for MRA+30
        </Badge>
      );
    } else if (projections.readinessPercent >= 60) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          Needs attention
        </Badge>
      );
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Behind schedule</Badge>;
  };

  // Timeline milestones
  const milestones = [
    {
      label: 'Today',
      age: BASE_RETIREMENT_DATA.currentAge,
      year: new Date().getFullYear(),
      active: true,
    },
    {
      label: 'MRA+30',
      age: BASE_RETIREMENT_DATA.mraAge,
      year: BASE_RETIREMENT_DATA.mraYear,
      active: false,
    },
    {
      label: 'Age 62',
      age: 62,
      year: new Date().getFullYear() + (62 - BASE_RETIREMENT_DATA.currentAge),
      active: false,
    },
    {
      label: 'Age 67',
      age: 67,
      year: new Date().getFullYear() + (67 - BASE_RETIREMENT_DATA.currentAge),
      active: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-5xl lg:max-w-6xl p-6 lg:p-8 max-h-[85vh] overflow-y-auto"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="space-y-1">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">Retirement details</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                PathOS estimate for MRA+30
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mra30">MRA+30</SelectItem>
                  <SelectItem value="retire62">Retire at 62</SelectItem>
                  <SelectItem value="retire65">Retire at 65</SelectItem>
                </SelectContent>
              </Select>
              <CardVisibilityToggle isHidden={isHidden} onToggle={() => setIsHidden(!isHidden)} />
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {showBanner && (
          <Card className="mt-3 mb-4 border-border bg-card/80">
            <CardContent className="py-3 text-xs text-muted-foreground space-y-2">
              <p className="leading-snug">
                <span className="font-semibold">Retirement estimates, not advice.</span> PathOS
                estimates your FERS pension, TSP, and readiness score using public rules and the
                information you enter. These projections are not guaranteed and are not financial,
                legal, tax, or investment advice.
              </p>
              <p className="leading-snug">
                Always confirm your benefits and options with OPM, your agency HR office, and a
                qualified financial professional.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hasSeenRetirementDisclaimer}
                    onCheckedChange={(value) => setHasSeenRetirementDisclaimer(Boolean(value))}
                  />
                  <span>Don&apos;t show this again for Retirement</span>
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHasSeenRetirementDisclaimer(true);
                    setHideRetirementBanner(true);
                  }}
                >
                  Got it
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Strip */}
        <div className="bg-muted/50 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {getStatusBadge()}
            <div>
              <span className="text-3xl font-bold text-accent">
                {projections.readinessPercent}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">Retirement readiness</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimates for educational purposes only. Not financial, legal, tax, or investment
                advice.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              MRA+30 at age {BASE_RETIREMENT_DATA.mraAge} ({BASE_RETIREMENT_DATA.mraYear}) •{' '}
              {projections.yearsDisplay} years, {projections.monthsDisplay} months to go
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Left Column - FERS Pension */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">FERS pension overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Projected FERS basic at MRA+30</span>
                  <span className="text-sm font-semibold">
                    <SensitiveValue
                      value={`~${formatCurrency(projections.fersAnnual)}/yr`}
                      localOverride={localOverride}
                    />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Projected FERS basic at age 62</span>
                  <span className="text-sm font-semibold">
                    <SensitiveValue
                      value={`~${formatCurrency(projections.fersAt62)}/yr`}
                      localOverride={localOverride}
                    />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Years of service at retirement</span>
                  <span className="text-sm font-semibold">
                    {projections.yearsOfServiceAtRetirement} years
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">High-3 estimate</span>
                  <span className="text-sm font-semibold">
                    <SensitiveValue
                      value={formatCurrency(projections.high3Estimate)}
                      localOverride={localOverride}
                    />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Accrual rate</span>
                  <span className="text-sm font-semibold">
                    {(projections.accrualRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  These are PathOS estimates based on FERS rules. Your official benefit statement
                  comes from OPM.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - TSP and Savings */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">TSP and savings projection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Current TSP balance</span>
                    <span className="text-sm font-semibold">
                      <SensitiveValue
                        value={formatCurrency(projections.currentTspBalance)}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Projected TSP at retirement</span>
                    <span className="text-sm font-semibold text-accent">
                      <SensitiveValue
                        value={formatCurrency(projections.projectedTsp)}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Assumed contributions</span>
                    <span className="text-sm font-semibold">
                      You: {projections.tspContributionPercent}% • Agency:{' '}
                      {projections.agencyContributionPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Assumed investment return</span>
                    <span className="text-sm font-semibold">
                      {assumptions.tspInvestmentReturn}% / year
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Est. monthly income from TSP</span>
                    <span className="text-sm font-semibold">
                      <SensitiveValue
                        value={`~${formatCurrency(projections.monthlyTspIncome)}/mo`}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                </div>

                {/* Income Source Breakdown */}
                <div className="pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Projected retirement income sources
                  </p>
                  <div className="h-3 rounded-full overflow-hidden flex">
                    <div
                      className="bg-accent h-full"
                      style={{ width: `${fersPercent}%` }}
                      title={`FERS: ${fersPercent}%`}
                    />
                    <div
                      className="bg-accent/60 h-full"
                      style={{ width: `${tspPercent}%` }}
                      title={`TSP: ${tspPercent}%`}
                    />
                    {assumptions.includeSocialSecurity && (
                      <div
                        className="bg-accent/30 h-full"
                        style={{ width: `${ssPercent}%` }}
                        title={`Social Security: ${ssPercent}%`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>FERS ({fersPercent}%)</span>
                    <span>TSP ({tspPercent}%)</span>
                    {assumptions.includeSocialSecurity && (
                      <span>Social Security ({ssPercent}%)</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PathAdvisor Insight */}
            <div className="bg-accent/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-foreground">
                    At your current TSP contribution of {assumptions.tspContributionPercent}%, you
                    are on track for about {projections.readinessPercent}% of your current income in
                    retirement. Increasing to {Math.min(15, assumptions.tspContributionPercent + 3)}
                    % could raise this to approximately{' '}
                    {Math.min(100, projections.readinessPercent + 8)}%.
                  </p>
                  <Link
                    href="/dashboard/retirement"
                    className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                  >
                    Open in PathAdvisor
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Retirement Timeline */}
        <Card className="mt-6 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Retirement timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Timeline Visual */}
            <div className="relative">
              <div className="flex items-center justify-between">
                {milestones.map((milestone) => (
                  <div key={milestone.label} className="flex flex-col items-center z-10">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        milestone.active
                          ? 'bg-accent border-accent'
                          : 'bg-muted border-muted-foreground/30'
                      }`}
                    />
                    <span className="text-sm font-medium mt-2">{milestone.label}</span>
                    <span className="text-xs text-muted-foreground">
                      Age {milestone.age} ({milestone.year})
                    </span>
                  </div>
                ))}
              </div>
              {/* Connecting line */}
              <div className="absolute top-2 left-0 right-0 h-0.5 bg-muted-foreground/20 -z-0" />
            </div>

            {/* Milestone Explanations */}
            <div className="grid gap-2 text-sm pt-4">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <p>
                  <span className="font-medium">MRA+30:</span> Eligible for immediate unreduced FERS
                  pension with 30 years of service.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                <p>
                  <span className="font-medium">Age 62:</span> Higher FERS accrual rate (1.1% if 20+
                  years) and potential COLA effects.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                <p>
                  <span className="font-medium">Later retirement:</span> More years for TSP growth
                  and additional pension accrual.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adjust Assumptions Card */}
        {showAssumptions && (
          <Card className="mt-6 border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adjust assumptions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fine tune retirement age, TSP growth, and contribution assumptions. Changes update
                the projections above.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Planned retirement scenario</Label>
                  <Select
                    value={assumptions.plannedRetirementScenario}
                    onValueChange={(value) =>
                      updateAssumption(
                        'plannedRetirementScenario',
                        value as 'mra30' | 'age62' | 'age65',
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mra30">
                        MRA+30 (Age {BASE_RETIREMENT_DATA.mraAge})
                      </SelectItem>
                      <SelectItem value="age62">Retire at 62</SelectItem>
                      <SelectItem value="age65">Retire at 65</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    TSP investment return: {assumptions.tspInvestmentReturn}%/yr
                  </Label>
                  <Slider
                    value={[assumptions.tspInvestmentReturn]}
                    onValueChange={([value]) => updateAssumption('tspInvestmentReturn', value)}
                    min={2}
                    max={10}
                    step={0.5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Conservative (2%)</span>
                    <span>Aggressive (10%)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Your TSP contribution: {assumptions.tspContributionPercent}%
                  </Label>
                  <Slider
                    value={[assumptions.tspContributionPercent]}
                    onValueChange={([value]) => updateAssumption('tspContributionPercent', value)}
                    min={0}
                    max={15}
                    step={1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>15% (IRS limit varies)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between space-x-2 pt-6">
                  <Label className="text-sm font-medium">Include Social Security estimate</Label>
                  <Switch
                    checked={assumptions.includeSocialSecurity}
                    onCheckedChange={(checked) =>
                      updateAssumption('includeSocialSecurity', checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowAssumptions(!showAssumptions)}>
            {showAssumptions ? 'Hide assumptions' : 'Adjust assumptions'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
