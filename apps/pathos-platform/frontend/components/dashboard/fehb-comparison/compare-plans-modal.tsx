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
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, Sparkles, Check, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import { useUserPreferences } from '@/contexts/user-preferences-context';

interface ComparePlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlanData {
  id: string;
  name: string;
  type: string;
  label: 'current' | 'recommended' | 'alternative';
  monthlyPremium: number;
  annualPremium: number;
  deductible: number;
  oopMax: number;
  primaryCareVisit: number;
  specialistVisit: number;
  emergencyRoom: number;
  genericRx: number;
  hsaEligible: boolean;
  network: string;
}

export function ComparePlansModal({ open, onOpenChange }: ComparePlansModalProps) {
  const [coverageType, setCoverageType] = useState<'self' | 'self-plus-one' | 'family'>('self');
  const [isHidden, setIsHidden] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const { hasSeenFehbDisclaimer, setHasSeenFehbDisclaimer } = useUserPreferences();
  const [hideFehbBanner, setHideFehbBanner] = useState(false);
  const showFehbBanner = !hasSeenFehbDisclaimer && !hideFehbBanner;

  const [assumptions, setAssumptions] = useState({
    primaryCareVisitsPerYear: 3,
    specialistVisitsPerYear: 2,
    urgentErVisitsPerYear: 0,
    genericRxCount: 2,
    riskTolerance: 2, // 1 = prefer predictable copays, 3 = okay with higher risk / HDHP
  });

  const localOverride = isHidden ? 'hide' : 'default';

  /**
   * Compute plans with estimated annual costs.
   * 
   * HOW IT WORKS:
   * 1. Defines static plan data inside the useMemo (to avoid dependency array issues)
   * 2. Calculates estimated annual cost for each plan based on user assumptions
   * 3. Returns plans enriched with estimatedAnnualCost field
   * 
   * The calculation considers:
   * - Annual premium as the base cost
   * - For HDHPs: deductible + coinsurance based on expected medical usage
   * - For traditional plans: copays based on expected visits
   *
   * WHY plans is defined inside useMemo:
   * Defining the static plan array outside would cause it to be recreated on each render,
   * making it an unstable dependency. Moving it inside the useMemo keeps it stable.
   */
  const plansWithCosts = useMemo(function computePlansWithCosts() {
    // Static plan data - moved inside useMemo to avoid unstable dependency
    const plans: PlanData[] = [
      {
        id: 'bcbs-standard',
        name: 'BCBS Standard',
        type: 'Nationwide PPO',
        label: 'current',
        monthlyPremium: 412,
        annualPremium: 4944,
        deductible: 350,
        oopMax: 6000,
        primaryCareVisit: 25,
        specialistVisit: 40,
        emergencyRoom: 150,
        genericRx: 10,
        hsaEligible: false,
        network: 'Nationwide',
      },
      {
        id: 'geisinger-hdhp',
        name: 'Geisinger HDHP',
        type: 'HDHP with HSA',
        label: 'recommended',
        monthlyPremium: 342,
        annualPremium: 4104,
        deductible: 1500,
        oopMax: 4000,
        primaryCareVisit: 0, // After deductible
        specialistVisit: 0,
        emergencyRoom: 0,
        genericRx: 0,
        hsaEligible: true,
        network: 'Regional (Mid-Atlantic)',
      },
      {
        id: 'kaiser-basic',
        name: 'Kaiser Basic',
        type: 'HMO',
        label: 'alternative',
        monthlyPremium: 298,
        annualPremium: 3576,
        deductible: 500,
        oopMax: 5000,
        primaryCareVisit: 20,
        specialistVisit: 35,
        emergencyRoom: 125,
        genericRx: 5,
        hsaEligible: false,
        network: 'Regional (Select areas)',
      },
    ];

    /**
     * Calculate estimated annual cost for a single plan based on user assumptions.
     */
    function calculateEstimatedCost(plan: PlanData): number {
      const {
        primaryCareVisitsPerYear,
        specialistVisitsPerYear,
        urgentErVisitsPerYear,
        genericRxCount,
      } = assumptions;

      // Base premium
      let totalCost = plan.annualPremium;

      // For HDHP, user pays deductible first before coverage kicks in
      if (plan.hsaEligible) {
        const expectedMedicalSpend =
          primaryCareVisitsPerYear * 150 + // Avg cost of primary care visit
          specialistVisitsPerYear * 250 + // Avg cost of specialist visit
          urgentErVisitsPerYear * 500 + // Avg ER cost
          genericRxCount * 12 * 15; // Monthly Rx cost

        // Pay up to deductible, then 20% coinsurance up to OOP max
        const deductibleSpend = Math.min(expectedMedicalSpend, plan.deductible);
        const afterDeductible = Math.max(0, expectedMedicalSpend - plan.deductible);
        const coinsurance = Math.min(afterDeductible * 0.2, plan.oopMax - plan.deductible);
        totalCost += deductibleSpend + coinsurance;
      } else {
        // Traditional plan with copays
        totalCost +=
          primaryCareVisitsPerYear * plan.primaryCareVisit +
          specialistVisitsPerYear * plan.specialistVisit +
          urgentErVisitsPerYear * plan.emergencyRoom +
          genericRxCount * 12 * plan.genericRx;
      }

      return Math.round(totalCost);
    }

    return plans.map(function addEstimatedCost(plan) {
      return {
        ...plan,
        estimatedAnnualCost: calculateEstimatedCost(plan),
      };
    });
  }, [assumptions]);

  // Find recommended plan (lowest estimated cost considering risk tolerance)
  const recommendedPlan = useMemo(() => {
    const sorted = [...plansWithCosts].sort((a, b) => {
      // If risk tolerance is low (1), penalize HDHPs
      if (assumptions.riskTolerance === 1 && a.hsaEligible && !b.hsaEligible) {
        return 1;
      }
      if (assumptions.riskTolerance === 1 && !a.hsaEligible && b.hsaEligible) {
        return -1;
      }
      return a.estimatedAnnualCost - b.estimatedAnnualCost;
    });
    return sorted[0];
  }, [plansWithCosts, assumptions.riskTolerance]);

  const currentPlan = plansWithCosts.find((p) => p.label === 'current')!;
  const savings = currentPlan.estimatedAnnualCost - recommendedPlan.estimatedAnnualCost;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getLabelBadge = (label: string, planId: string) => {
    const isRecommended = planId === recommendedPlan.id;
    if (isRecommended) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
          Recommended
        </Badge>
      );
    }
    if (label === 'current') {
      return (
        <Badge variant="outline" className="text-xs">
          Current
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Alternative
      </Badge>
    );
  };

  const isBestValue = (plan: PlanData, metric: keyof PlanData) => {
    const values = plansWithCosts.map((p) => p[metric] as number);
    const minValue = Math.min(...values);
    return plan[metric] === minValue;
  };

  const metrics: {
    key: keyof PlanData | 'estimatedAnnualCost';
    label: string;
    helper?: string;
    format: (v: number, plan: PlanData) => string;
  }[] = [
    {
      key: 'monthlyPremium',
      label: 'Monthly premium',
      helper: 'Your paycheck deduction',
      format: (v) => `${formatCurrency(v)}/mo`,
    },
    {
      key: 'annualPremium',
      label: 'Annual premium',
      helper: 'Total yearly premium',
      format: (v) => `${formatCurrency(v)}/yr`,
    },
    {
      key: 'deductible',
      label: 'Deductible',
      helper: 'Pay before coverage starts',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'oopMax',
      label: 'Out-of-pocket max',
      helper: 'Maximum yearly spending',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'primaryCareVisit',
      label: 'Primary care visit',
      helper: 'Copay per visit',
      format: (v, p) => (p.hsaEligible ? 'After deductible' : formatCurrency(v)),
    },
    {
      key: 'specialistVisit',
      label: 'Specialist visit',
      helper: 'Copay per visit',
      format: (v, p) => (p.hsaEligible ? 'After deductible' : formatCurrency(v)),
    },
    {
      key: 'emergencyRoom',
      label: 'Emergency room',
      helper: 'Copay per visit',
      format: (v, p) => (p.hsaEligible ? 'After deductible' : formatCurrency(v)),
    },
    {
      key: 'genericRx',
      label: 'Rx coverage',
      helper: 'Generic medications',
      format: (v, p) => (p.hsaEligible ? 'After deductible' : `${formatCurrency(v)}/mo`),
    },
    {
      key: 'hsaEligible',
      label: 'HSA / HRA',
      helper: 'Tax-advantaged savings',
      format: (_, p) => (p.hsaEligible ? 'HSA eligible' : 'No HSA'),
    },
    { key: 'network', label: 'Network & region', format: (_, p) => p.network },
    {
      key: 'estimatedAnnualCost',
      label: 'Estimated annual cost',
      helper: 'Based on your usage',
      format: (v) => formatCurrency(v),
    },
  ];

  const riskToleranceLabels = [
    'Prefer predictable copays',
    'Balanced',
    'Okay with higher deductibles',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-5xl lg:max-w-6xl p-6 lg:p-8 max-h-[85vh] overflow-y-auto bg-background"
      >
        <DialogHeader className="space-y-1">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">Compare FEHB Plans</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Based on your profile, location, and coverage type.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={coverageType}
                onValueChange={(v) => setCoverageType(v as typeof coverageType)}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self only</SelectItem>
                  <SelectItem value="self-plus-one">Self + one</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">
                Open Season
              </Badge>
              <CardVisibilityToggle isHidden={isHidden} onToggle={() => setIsHidden(!isHidden)} />
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

        {showFehbBanner && (
          <Card className="mt-3 mb-4 border-border bg-card/80">
            <CardContent className="py-3 text-xs text-muted-foreground space-y-2">
              <p className="leading-snug">
                <span className="font-semibold">Plan comparisons are estimates.</span> PathOS
                compares FEHB plans using public data and your usage assumptions. The results are
                educational estimates only and are not a guarantee of actual costs or coverage.
              </p>
              <p className="leading-snug">
                PathOS is not a licensed insurance broker and this is not insurance, legal, tax, or
                investment advice. Confirm details and final premiums through official FEHB
                resources and your agency HR office.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hasSeenFehbDisclaimer}
                    onCheckedChange={(value) => setHasSeenFehbDisclaimer(Boolean(value))}
                  />
                  <span>Don&apos;t show this again for FEHB</span>
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHasSeenFehbDisclaimer(true);
                    setHideFehbBanner(true);
                  }}
                >
                  Got it
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Strip */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-border bg-card/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <p className="text-sm font-medium">
                {currentPlan.name} •{' '}
                <SensitiveValue
                  value={`${formatCurrency(currentPlan.monthlyPremium)}/mo`}
                  masked="$•••/mo"
                  localOverride={localOverride}
                  className="inline"
                />
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-3">
              <p className="text-xs text-emerald-400 mb-1">Recommended</p>
              <p className="text-sm font-medium">
                {recommendedPlan.name} •{' '}
                <SensitiveValue
                  value={`${formatCurrency(recommendedPlan.monthlyPremium)}/mo`}
                  masked="$•••/mo"
                  localOverride={localOverride}
                  className="inline"
                />
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Estimated savings</p>
              <p className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <SensitiveValue
                  value={`Save ${formatCurrency(Math.max(0, savings))}/yr`}
                  masked="Save $•••/yr"
                  localOverride={localOverride}
                  className="inline"
                />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Grid */}
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[720px] lg:min-w-[900px] rounded-xl border border-border bg-border">
            <div className="bg-background text-sm">
              {/* Header Row */}
              <div className="grid grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] gap-px bg-border">
                <div className="bg-background p-3"></div>
                {plansWithCosts.map((plan) => (
                  <div
                    key={plan.id}
                    className={`bg-background p-3 ${plan.id === recommendedPlan.id ? 'bg-emerald-500/5' : ''}`}
                  >
                    <div className="mb-1">{getLabelBadge(plan.label, plan.id)}</div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.type}</p>
                  </div>
                ))}
              </div>

              {/* Metric Rows */}
              {metrics.map((metric, idx) => (
                <div
                  key={metric.key}
                  className={`grid grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] gap-px bg-border ${idx % 2 === 0 ? '' : ''}`}
                >
                  <div className="bg-background p-3">
                    <p className="text-sm font-medium">{metric.label}</p>
                    {metric.helper && (
                      <p className="text-xs text-muted-foreground">{metric.helper}</p>
                    )}
                  </div>
                  {plansWithCosts.map((plan) => {
                    const value =
                      metric.key === 'estimatedAnnualCost'
                        ? plan.estimatedAnnualCost
                        : plan[metric.key as keyof PlanData];
                    const isBest =
                      metric.key === 'estimatedAnnualCost'
                        ? plan.id === recommendedPlan.id
                        : typeof value === 'number' &&
                            [
                              'monthlyPremium',
                              'annualPremium',
                              'deductible',
                              'oopMax',
                              'primaryCareVisit',
                              'specialistVisit',
                              'emergencyRoom',
                              'genericRx',
                            ].includes(metric.key)
                          ? isBestValue(plan, metric.key as keyof PlanData)
                          : false;

                    const displayValue = metric.format(value as number, plan);
                    const shouldMask = [
                      'monthlyPremium',
                      'annualPremium',
                      'estimatedAnnualCost',
                    ].includes(metric.key);

                    return (
                      <div
                        key={plan.id}
                        className={`bg-background p-3 ${plan.id === recommendedPlan.id ? 'bg-emerald-500/5' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {shouldMask ? (
                            <SensitiveValue
                              value={displayValue}
                              masked="$•••"
                              localOverride={localOverride}
                              className={`text-sm ${isBest ? 'text-emerald-400 font-medium' : ''}`}
                            />
                          ) : (
                            <span
                              className={`text-sm ${isBest ? 'text-emerald-400 font-medium' : ''}`}
                            >
                              {displayValue}
                            </span>
                          )}
                          {isBest && metric.key === 'estimatedAnnualCost' && (
                            <Check className="w-3 h-3 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Costs shown are estimates based on your assumptions and public FEHB data. Not insurance
            or legal advice.
          </p>
        </div>

        {/* PathAdvisor Explanation */}
        <Card className="mt-6 border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Why this plan is recommended
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              PathOS estimates that{' '}
              <span className="font-medium text-foreground">{recommendedPlan.name}</span> could save
              you about{' '}
              <SensitiveValue
                value={`${formatCurrency(Math.max(0, savings))} per year`}
                masked="$••• per year"
                localOverride={localOverride}
                className="text-emerald-400 font-medium inline"
              />{' '}
              based on your typical doctor visits, prescriptions, and coverage type.
            </p>
            <p>
              This recommendation balances your preferences for{' '}
              {assumptions.riskTolerance === 1
                ? 'predictable copays and lower risk'
                : assumptions.riskTolerance === 3
                  ? 'lower premiums with higher deductibles'
                  : 'moderate premiums and reasonable coverage'}
              . If you expect very high usage or prefer more predictable copays,{' '}
              {currentPlan.id !== recommendedPlan.id ? currentPlan.name : 'a traditional PPO'} may
              still be a better fit.
            </p>
            <Link
              href="/dashboard/benefits"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Open in PathAdvisor
              <ExternalLink className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Adjust Assumptions */}
        {showAssumptions && (
          <Card className="mt-6 border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adjust assumptions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your typical usage and preferences. PathOS will recompute plan rankings and
                estimated annual costs.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Usage Section */}
                <div className="space-y-4">
                  <p className="text-sm font-medium">Annual usage estimates</p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Primary care visits</span>
                        <span className="text-muted-foreground">
                          {assumptions.primaryCareVisitsPerYear}/year
                        </span>
                      </div>
                      <Slider
                        value={[assumptions.primaryCareVisitsPerYear]}
                        onValueChange={([v]) =>
                          setAssumptions((prev) => ({ ...prev, primaryCareVisitsPerYear: v }))
                        }
                        min={0}
                        max={12}
                        step={1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Specialist visits</span>
                        <span className="text-muted-foreground">
                          {assumptions.specialistVisitsPerYear}/year
                        </span>
                      </div>
                      <Slider
                        value={[assumptions.specialistVisitsPerYear]}
                        onValueChange={([v]) =>
                          setAssumptions((prev) => ({ ...prev, specialistVisitsPerYear: v }))
                        }
                        min={0}
                        max={12}
                        step={1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Urgent care / ER visits</span>
                        <span className="text-muted-foreground">
                          {assumptions.urgentErVisitsPerYear}/year
                        </span>
                      </div>
                      <Slider
                        value={[assumptions.urgentErVisitsPerYear]}
                        onValueChange={([v]) =>
                          setAssumptions((prev) => ({ ...prev, urgentErVisitsPerYear: v }))
                        }
                        min={0}
                        max={6}
                        step={1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Generic Rx prescriptions</span>
                        <span className="text-muted-foreground">
                          {assumptions.genericRxCount}/month
                        </span>
                      </div>
                      <Slider
                        value={[assumptions.genericRxCount]}
                        onValueChange={([v]) =>
                          setAssumptions((prev) => ({ ...prev, genericRxCount: v }))
                        }
                        min={0}
                        max={10}
                        step={1}
                      />
                    </div>
                  </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-4">
                  <p className="text-sm font-medium">Risk / cost preference</p>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Risk tolerance</span>
                      <span className="text-muted-foreground">
                        {riskToleranceLabels[assumptions.riskTolerance - 1]}
                      </span>
                    </div>
                    <Slider
                      value={[assumptions.riskTolerance]}
                      onValueChange={([v]) =>
                        setAssumptions((prev) => ({ ...prev, riskTolerance: v }))
                      }
                      min={1}
                      max={3}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Predictable</span>
                      <span>Balanced</span>
                      <span>Lower premium</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    HDHPs (high-deductible health plans) offer lower premiums but higher
                    out-of-pocket costs. They work well if you rarely use healthcare or want an HSA
                    for tax savings.
                  </p>
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
