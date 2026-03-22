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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CardVisibilityToggle } from '@/components/compensation/card-visibility-toggle';
import { SensitiveValue } from '@/components/sensitive-value';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { TrendingUp, ChevronDown, Sparkles, ExternalLink, Info, X } from 'lucide-react';
import Link from 'next/link';

interface DetailedCompensationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradeStep?: string;
}

export function DetailedCompensationModal({
  open,
  onOpenChange,
  gradeStep = 'GS-13 Step 5',
}: DetailedCompensationModalProps) {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [isHidden, setIsHidden] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const [assumptions, setAssumptions] = useState({
    overtimeHoursPerYear: 80,
    nightPremiumPerYear: 0,
    sundayPremiumPerYear: 0,
    holidayPremiumPerYear: 0,
    tspContributionPercent: 5,
    fehbCoverageType: 'self-only' as 'self-only' | 'self-plus-one' | 'family',
  });

  const localOverride = isHidden ? 'hide' : 'default';

  // Base compensation data - would come from API
  const baseCompensationData = {
    '2025': {
      basePay: 93456,
      localityPay: 28994,
      healthInsurance: 8500,
      fersPension: 4200,
      tspAgency: 2800,
      otherBenefits: 500,
      lastYearTotal: 134150,
    },
    '2024': {
      basePay: 90500,
      localityPay: 28100,
      healthInsurance: 8200,
      fersPension: 4000,
      tspAgency: 2850,
      otherBenefits: 500,
      lastYearTotal: 130500,
    },
    '2023': {
      basePay: 88000,
      localityPay: 27500,
      healthInsurance: 7900,
      fersPension: 3800,
      tspAgency: 2800,
      otherBenefits: 500,
      lastYearTotal: 127200,
    },
  };

  const baseData = baseCompensationData[selectedYear as keyof typeof baseCompensationData];

  const totals = useMemo(() => {
    const {
      basePay,
      localityPay,
      healthInsurance,
      fersPension,
      tspAgency,
      otherBenefits,
      lastYearTotal,
    } = baseData;

    // Calculate overtime at 1.5x hourly rate (2087 work hours per year)
    const hourlyRate = (basePay + localityPay) / 2087;
    const overtimeValue = hourlyRate * 1.5 * assumptions.overtimeHoursPerYear;

    // Sum premiums
    const premiumsTotal =
      assumptions.nightPremiumPerYear +
      assumptions.sundayPremiumPerYear +
      assumptions.holidayPremiumPerYear +
      overtimeValue;

    // Adjust FEHB based on coverage type
    let fehbMultiplier = 1;
    if (assumptions.fehbCoverageType === 'self-plus-one') fehbMultiplier = 1.8;
    if (assumptions.fehbCoverageType === 'family') fehbMultiplier = 2.3;
    const adjustedHealthInsurance = Math.round(healthInsurance * fehbMultiplier);

    const totalCash = basePay + localityPay + premiumsTotal;
    const totalBenefits = adjustedHealthInsurance + fersPension + tspAgency + otherBenefits;
    const totalComp = totalCash + totalBenefits;

    const percentChangeYoY = lastYearTotal
      ? ((totalComp - lastYearTotal) / lastYearTotal) * 100
      : 0;

    return {
      basePay,
      localityPay,
      overtime: Math.round(overtimeValue),
      differentials:
        assumptions.nightPremiumPerYear +
        assumptions.sundayPremiumPerYear +
        assumptions.holidayPremiumPerYear,
      totalCash: Math.round(totalCash),
      healthInsurance: adjustedHealthInsurance,
      fersPension,
      tspAgency,
      otherBenefits,
      totalBenefits,
      totalComp: Math.round(totalComp),
      percentChangeYoY,
    };
  }, [baseData, assumptions]);

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate proportions for the visualization
  const basePercent = Math.round((totals.basePay / totals.totalComp) * 100);
  const localityPercent = Math.round((totals.localityPay / totals.totalComp) * 100);
  const benefitsPercent = 100 - basePercent - localityPercent;

  const updateAssumption = <K extends keyof typeof assumptions>(
    key: K,
    value: (typeof assumptions)[K],
  ) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  };

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
              <DialogTitle className="text-xl font-semibold">Detailed Compensation</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {gradeStep} • {selectedYear}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
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

        <div className="bg-muted/50 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-3xl font-bold text-accent">
                <SensitiveValue
                  value={formatCurrency(totals.totalComp)}
                  localOverride={localOverride}
                />
              </span>
              <p className="text-xs text-muted-foreground mt-1">Annual total compensation</p>
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${totals.percentChangeYoY >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-medium">
                {totals.percentChangeYoY >= 0 ? '+' : ''}
                {totals.percentChangeYoY.toFixed(1)}% from last year
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <span className="text-muted-foreground">Base pay</span>
              <p className="font-medium">
                <SensitiveValue
                  value={formatCurrency(totals.basePay)}
                  localOverride={localOverride}
                />
              </p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Locality pay</span>
              <p className="font-medium">
                <SensitiveValue
                  value={formatCurrency(totals.localityPay)}
                  localOverride={localOverride}
                />
              </p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Benefits value</span>
              <p className="font-medium">
                <SensitiveValue
                  value={formatCurrency(totals.totalBenefits)}
                  localOverride={localOverride}
                />
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Left Column - Cash Compensation */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Cash Compensation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Base Pay</span>
                  <span className="text-sm font-semibold">
                    <SensitiveValue
                      value={formatCurrency(totals.basePay)}
                      localOverride={localOverride}
                    />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your GS base salary before locality adjustment
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Locality Pay</span>
                  <span className="text-sm font-semibold">
                    <SensitiveValue
                      value={formatCurrency(totals.localityPay)}
                      localOverride={localOverride}
                    />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  DC-Baltimore-Arlington locality adjustment
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Premiums & Differentials
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Overtime</span>
                    <span className="font-medium">
                      <SensitiveValue
                        value={formatCurrency(totals.overtime)}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Differentials</span>
                    <span className="font-medium">
                      <SensitiveValue
                        value={formatCurrency(totals.differentials)}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Cash</span>
                  <span className="text-lg font-bold text-accent">
                    <SensitiveValue
                      value={formatCurrency(totals.totalCash)}
                      localOverride={localOverride}
                    />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Benefits & PathAdvisor */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Benefits & Long-term Value</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Benefits Value</span>
                  <span className="text-lg font-bold text-accent">
                    <SensitiveValue
                      value={formatCurrency(totals.totalBenefits)}
                      localOverride={localOverride}
                    />
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Health Insurance (FEHB)</span>
                    <span className="font-medium">
                      <SensitiveValue
                        value={formatCurrency(totals.healthInsurance)}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>FERS Pension Accrual</span>
                    <span className="font-medium">
                      <SensitiveValue
                        value={formatCurrency(totals.fersPension)}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>TSP Agency Contributions</span>
                    <span className="font-medium">
                      <SensitiveValue
                        value={formatCurrency(totals.tspAgency)}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Other Benefits</span>
                    <span className="font-medium">
                      <SensitiveValue
                        value={formatCurrency(totals.otherBenefits)}
                        localOverride={localOverride}
                      />
                    </span>
                  </div>
                </div>

                {/* Compensation Breakdown Bar */}
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Compensation Breakdown
                  </p>
                  <div className="h-3 rounded-full overflow-hidden flex">
                    <div
                      className="bg-accent h-full"
                      style={{ width: `${basePercent}%` }}
                      title={`Base Pay: ${basePercent}%`}
                    />
                    <div
                      className="bg-accent/60 h-full"
                      style={{ width: `${localityPercent}%` }}
                      title={`Locality: ${localityPercent}%`}
                    />
                    <div
                      className="bg-accent/30 h-full"
                      style={{ width: `${benefitsPercent}%` }}
                      title={`Benefits: ${benefitsPercent}%`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Base ({basePercent}%)</span>
                    <span>Locality ({localityPercent}%)</span>
                    <span>Benefits ({benefitsPercent}%)</span>
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
                    Increasing your TSP contribution by 2% could add $12,000+ to your retirement
                    over 10 years.
                  </p>
                  <Link
                    href="/dashboard/retirement"
                    className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                  >
                    Learn more about TSP
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showAssumptions && (
          <Card className="mt-6 border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adjust assumptions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fine tune overtime, premiums, and benefits assumptions. Changes here will update the
                totals at the top of this modal.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* A. Work patterns & premiums */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estimated overtime hours per year</label>
                  <p className="text-xs text-muted-foreground">
                    Used to estimate overtime pay at 1.5x your hourly rate.
                  </p>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[assumptions.overtimeHoursPerYear]}
                      onValueChange={([value]) => updateAssumption('overtimeHoursPerYear', value)}
                      min={0}
                      max={400}
                      step={10}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      className="w-20"
                      value={assumptions.overtimeHoursPerYear}
                      onChange={(e) =>
                        updateAssumption('overtimeHoursPerYear', Number(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Night, Sunday, and holiday premiums (per year)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Simple annual estimates added to your cash compensation.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      type="number"
                      placeholder="Night"
                      value={assumptions.nightPremiumPerYear || ''}
                      onChange={(e) =>
                        updateAssumption('nightPremiumPerYear', Number(e.target.value) || 0)
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Sunday"
                      value={assumptions.sundayPremiumPerYear || ''}
                      onChange={(e) =>
                        updateAssumption('sundayPremiumPerYear', Number(e.target.value) || 0)
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Holiday"
                      value={assumptions.holidayPremiumPerYear || ''}
                      onChange={(e) =>
                        updateAssumption('holidayPremiumPerYear', Number(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* B. TSP & retirement */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Your TSP contribution (% of basic pay)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Used for PathAdvisor insights. Does not reduce the gross compensation number
                    shown above.
                  </p>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[assumptions.tspContributionPercent]}
                      onValueChange={([value]) => updateAssumption('tspContributionPercent', value)}
                      min={0}
                      max={15}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      className="w-20"
                      value={assumptions.tspContributionPercent}
                      onChange={(e) =>
                        updateAssumption('tspContributionPercent', Number(e.target.value) || 0)
                      }
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Agency automatic 1% and matching contributions are included in the benefits
                    total shown above.
                  </p>
                  <p>
                    You can refine FERS and TSP projections in the dedicated retirement view later.
                  </p>
                </div>
              </div>

              {/* C. Health coverage type */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">FEHB coverage type (estimate)</label>
                  <p className="text-xs text-muted-foreground">
                    Used to estimate the employer share of your health premiums.
                  </p>
                  <Select
                    value={assumptions.fehbCoverageType}
                    onValueChange={(value) =>
                      updateAssumption(
                        'fehbCoverageType',
                        value as 'self-only' | 'self-plus-one' | 'family',
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select coverage type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self-only">Self only</SelectItem>
                      <SelectItem value="self-plus-one">Self + one</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground self-center">
                  PathOS uses typical employer share percentages for this coverage type. For exact
                  values, refer to your specific FEHB plan details.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowAssumptions((prev) => !prev)}>
              {showAssumptions ? 'Hide assumptions' : 'Adjust assumptions'}
            </Button>
            <Collapsible open={showCalculation} onOpenChange={setShowCalculation}>
              <CollapsibleTrigger className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Info className="w-4 h-4" />
                How PathOS calculated this
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showCalculation ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 absolute bg-card border border-border rounded-lg p-4 shadow-lg mt-2 max-w-md z-10">
                <ul className="text-sm text-muted-foreground space-y-1.5 pl-5 list-disc">
                  <li>Base pay from OPM GS pay tables for your grade/step</li>
                  <li>Locality rate based on your duty station</li>
                  <li>Benefits value estimated from FEHB employer contribution and FERS formula</li>
                  <li>TSP match calculated at 5% maximum agency contribution</li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/compensation">Open full compensation view</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
