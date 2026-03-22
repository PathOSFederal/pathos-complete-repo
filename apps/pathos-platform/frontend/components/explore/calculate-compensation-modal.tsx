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
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  Briefcase,
  Heart,
  PiggyBank,
  ChevronDown,
  Sparkles,
  Info,
  X,
  MapPin,
} from 'lucide-react';

interface CalculateCompensationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType?: 'job-seeker' | 'employee';
  defaultLocation?: string;
  defaultGrade?: string;
  defaultStep?: string;
}

// GS Pay Tables (2025 base, simplified)
const GS_BASE_PAY: Record<string, number[]> = {
  'GS-5': [34803, 35964, 37125, 38286, 39447, 40608, 41769, 42930, 43091, 44252],
  'GS-6': [38785, 40077, 41369, 42661, 43953, 45245, 46537, 47829, 49121, 50413],
  'GS-7': [43095, 44531, 45967, 47403, 48839, 50275, 51711, 53147, 54583, 56019],
  'GS-8': [47708, 49298, 50888, 52478, 54068, 55658, 57248, 58838, 60428, 62018],
  'GS-9': [52636, 54390, 56144, 57898, 59652, 61406, 63160, 64914, 66668, 68422],
  'GS-10': [57963, 59895, 61827, 63759, 65691, 67623, 69555, 71487, 73419, 75351],
  'GS-11': [63616, 65736, 67856, 69976, 72096, 74216, 76336, 78456, 80576, 82696],
  'GS-12': [76238, 78779, 81320, 83861, 86402, 88943, 91484, 94025, 96566, 99107],
  'GS-13': [90662, 93684, 96706, 99728, 102750, 105772, 108794, 111816, 114838, 117860],
  'GS-14': [107123, 110694, 114265, 117836, 121407, 124978, 128549, 132120, 135691, 139262],
  'GS-15': [126029, 130230, 134431, 138632, 142833, 147034, 151235, 155436, 159637, 163838],
};

// Locality pay percentages (simplified)
const LOCALITY_RATES: Record<string, number> = {
  'Washington, DC Metro': 0.3294,
  'San Francisco Bay Area': 0.4386,
  'New York City': 0.3637,
  'Los Angeles': 0.3399,
  Boston: 0.3028,
  Chicago: 0.2988,
  Seattle: 0.3089,
  Denver: 0.2912,
  Houston: 0.3177,
  Atlanta: 0.2459,
  'Dallas-Fort Worth': 0.2694,
  'Rest of U.S.': 0.1753,
};

// FEHB premium estimates (employer contribution)
const FEHB_EMPLOYER_CONTRIBUTION: Record<string, Record<string, number>> = {
  'self-only': { 'low-cost': 4200, 'mid-range': 5400, 'high-cost': 6800 },
  'self-plus-one': { 'low-cost': 8400, 'mid-range': 10800, 'high-cost': 13600 },
  family: { 'low-cost': 10500, 'mid-range': 13500, 'high-cost': 17000 },
};

export function CalculateCompensationModal({
  open,
  onOpenChange,
  userType = 'job-seeker',
  defaultLocation = 'Washington, DC Metro',
  defaultGrade = 'GS-11',
  defaultStep = '1',
}: CalculateCompensationModalProps) {
  // Section A - Basic position details
  const [location, setLocation] = useState(defaultLocation);
  const [grade, setGrade] = useState(defaultGrade);
  const [step, setStep] = useState(defaultStep);
  const [employmentType, setEmploymentType] = useState<'full-time' | 'part-time'>('full-time');

  // Section B - Benefits and contributions
  const [healthPlanLevel, setHealthPlanLevel] = useState<'self-only' | 'self-plus-one' | 'family'>(
    'self-only',
  );
  const [fehbTier, setFehbTier] = useState<'low-cost' | 'mid-range' | 'high-cost'>('mid-range');
  const [tspContribution, setTspContribution] = useState(5);

  // Section C - Optional extras (collapsible)
  const [showMoreAssumptions, setShowMoreAssumptions] = useState(false);
  const [annualLeaveUsage, setAnnualLeaveUsage] = useState(15);
  const [includeTelework, setIncludeTelework] = useState(false);
  const [includeOvertime, setIncludeOvertime] = useState(false);
  const [overtimeHours, setOvertimeHours] = useState(0);

  // Calculate all compensation values
  const compensation = useMemo(() => {
    const gradeKey = grade as keyof typeof GS_BASE_PAY;
    const stepIndex = Number.parseInt(step) - 1;
    const basePay = GS_BASE_PAY[gradeKey]?.[stepIndex] ?? 63616; // Default to GS-11 Step 1

    const localityRate = LOCALITY_RATES[location] ?? LOCALITY_RATES['Rest of U.S.'];
    const localityPay = Math.round(basePay * localityRate);
    const totalBasePay = basePay + localityPay;

    // Part-time adjustment (assume 20 hours/week)
    const ptMultiplier = employmentType === 'part-time' ? 0.5 : 1;
    const adjustedBasePay = Math.round(totalBasePay * ptMultiplier);

    // FEHB employer contribution
    const fehbContribution = FEHB_EMPLOYER_CONTRIBUTION[healthPlanLevel]?.[fehbTier] ?? 5400;
    const adjustedFehb = Math.round(fehbContribution * ptMultiplier);

    // TSP: Agency automatic 1% + match up to 4% (total up to 5%)
    const tspAgencyAutomatic = Math.round(adjustedBasePay * 0.01);
    const tspMatch = Math.round(adjustedBasePay * Math.min(tspContribution / 100, 0.04));
    const totalTspAgency = tspAgencyAutomatic + tspMatch;

    // FERS pension accrual (~1% of salary per year of service, simplified)
    const fersPension = Math.round(adjustedBasePay * 0.01);

    // Overtime calculation
    const hourlyRate = adjustedBasePay / 2087;
    const overtimeValue = includeOvertime ? Math.round(hourlyRate * 1.5 * overtimeHours) : 0;

    // Total benefits value
    const totalBenefits = adjustedFehb + totalTspAgency + fersPension;

    // Total compensation
    const totalComp = adjustedBasePay + totalBenefits + overtimeValue;

    return {
      basePay: Math.round(basePay * ptMultiplier),
      localityPay: Math.round(localityPay * ptMultiplier),
      totalBasePay: adjustedBasePay,
      fehbContribution: adjustedFehb,
      tspAgencyAutomatic,
      tspMatch,
      totalTspAgency,
      fersPension,
      overtimeValue,
      totalBenefits,
      totalComp,
    };
  }, [
    location,
    grade,
    step,
    employmentType,
    healthPlanLevel,
    fehbTier,
    tspContribution,
    includeOvertime,
    overtimeHours,
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSaveEstimate = () => {
    // TODO: Save estimate to user profile/scenario
    onOpenChange(false);
  };

  const handleCompareAnother = () => {
    // Reset to defaults
    setGrade('GS-11');
    setStep('1');
    setTspContribution(5);
    setHealthPlanLevel('self-only');
    setFehbTier('mid-range');
    setIncludeOvertime(false);
    setOvertimeHours(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-5xl lg:max-w-6xl p-0 max-h-[90vh] overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Calculate Your Total Compensation
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {userType === 'job-seeker'
                  ? 'Estimate your full federal compensation, including salary, health insurance, retirement, and employer contributions.'
                  : 'Estimate your current total compensation or compare with a promotion or relocation.'}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Body - Two columns */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-0">
            {/* Left Column - Inputs */}
            <div className="p-6 border-r border-border space-y-6">
              {/* Section A - Basic position details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">Basic Position Details</h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-sm">
                      Location
                    </Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger id="location" className="bg-background">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(LOCALITY_RATES).map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="grade" className="text-sm">
                        Target Grade
                      </Label>
                      <Select value={grade} onValueChange={setGrade}>
                        <SelectTrigger id="grade" className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(GS_BASE_PAY).map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="step" className="text-sm">
                        Step
                      </Label>
                      <Select value={step} onValueChange={setStep}>
                        <SelectTrigger id="step" className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                            <SelectItem key={s} value={s.toString()}>
                              Step {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Employment Type</Label>
                    <RadioGroup
                      value={employmentType}
                      onValueChange={(v) => setEmploymentType(v as 'full-time' | 'part-time')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="full-time" id="full-time" />
                        <Label htmlFor="full-time" className="text-sm font-normal cursor-pointer">
                          Full-time
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="part-time" id="part-time" />
                        <Label htmlFor="part-time" className="text-sm font-normal cursor-pointer">
                          Part-time
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  Salary estimates use current OPM pay tables for planning and may differ from
                  actual offers.
                </p>
              </div>

              {/* Section B - Benefits and contributions */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">Benefits & Contributions</h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Health Plan Coverage</Label>
                    <RadioGroup
                      value={healthPlanLevel}
                      onValueChange={(v) =>
                        setHealthPlanLevel(v as 'self-only' | 'self-plus-one' | 'family')
                      }
                      className="grid grid-cols-3 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self-only" id="self-only" />
                        <Label htmlFor="self-only" className="text-xs font-normal cursor-pointer">
                          Self Only
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self-plus-one" id="self-plus-one" />
                        <Label
                          htmlFor="self-plus-one"
                          className="text-xs font-normal cursor-pointer"
                        >
                          Self + One
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="family" id="family" />
                        <Label htmlFor="family" className="text-xs font-normal cursor-pointer">
                          Family
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fehb-tier" className="text-sm">
                      FEHB Plan Tier
                    </Label>
                    <Select
                      value={fehbTier}
                      onValueChange={(v) =>
                        setFehbTier(v as 'low-cost' | 'mid-range' | 'high-cost')
                      }
                    >
                      <SelectTrigger id="fehb-tier" className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low-cost">Low cost</SelectItem>
                        <SelectItem value="mid-range">Mid-range</SelectItem>
                        <SelectItem value="high-cost">High cost</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Used to estimate premium range. You can refine this later in FEHB plan
                      details.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">TSP Contribution Rate</Label>
                      <span className="text-sm font-medium">{tspContribution}%</span>
                    </div>
                    <Slider
                      value={[tspContribution]}
                      onValueChange={([v]) => setTspContribution(v)}
                      min={0}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Agency automatic 1% + up to 4% match (FERS)
                    </p>
                  </div>
                </div>
              </div>

              {/* Section C - Optional extras (collapsible) */}
              <Collapsible open={showMoreAssumptions} onOpenChange={setShowMoreAssumptions}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-0 h-auto py-2 hover:bg-transparent"
                  >
                    <span className="text-sm font-medium">More assumptions</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showMoreAssumptions ? 'rotate-180' : ''}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Expected annual leave usage</Label>
                      <span className="text-sm text-muted-foreground">{annualLeaveUsage} days</span>
                    </div>
                    <Slider
                      value={[annualLeaveUsage]}
                      onValueChange={([v]) => setAnnualLeaveUsage(v)}
                      min={0}
                      max={26}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="telework"
                      checked={includeTelework}
                      onCheckedChange={(c) => setIncludeTelework(!!c)}
                    />
                    <Label htmlFor="telework" className="text-sm font-normal cursor-pointer">
                      Telework / hybrid schedule
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overtime"
                        checked={includeOvertime}
                        onCheckedChange={(c) => setIncludeOvertime(!!c)}
                      />
                      <Label htmlFor="overtime" className="text-sm font-normal cursor-pointer">
                        Include overtime
                      </Label>
                    </div>
                    {includeOvertime && (
                      <div className="ml-6 space-y-1.5">
                        <Label htmlFor="overtime-hours" className="text-xs">
                          Expected overtime hours/year
                        </Label>
                        <Input
                          id="overtime-hours"
                          type="number"
                          value={overtimeHours}
                          onChange={(e) => setOvertimeHours(Number.parseInt(e.target.value) || 0)}
                          className="w-24 h-8 text-sm"
                          min={0}
                          max={500}
                        />
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Right Column - Summary cards */}
            <div className="p-6 space-y-4 bg-muted/30">
              {/* Card 1 - Estimated Base Pay */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm font-medium">Estimated Base Pay</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(compensation.totalBasePay)}
                    <span className="text-sm font-normal text-muted-foreground"> / year</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {grade} Step {step} · {location}
                  </p>
                  <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base salary</span>
                      <span>{formatCurrency(compensation.basePay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Locality adjustment</span>
                      <span className="text-green-500">
                        +{formatCurrency(compensation.localityPay)}
                      </span>
                    </div>
                    {compensation.overtimeValue > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Overtime</span>
                        <span className="text-green-500">
                          +{formatCurrency(compensation.overtimeValue)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 2 - Estimated Benefits Value */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm font-medium">Estimated Benefits Value</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FEHB employer contribution</span>
                      <span>{formatCurrency(compensation.fehbContribution)} / year</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TSP agency automatic + match</span>
                      <span>{formatCurrency(compensation.totalTspAgency)} / year</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FERS pension accrual</span>
                      <span>~{formatCurrency(compensation.fersPension)} / year</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between font-medium">
                      <span>Total estimated benefits value</span>
                      <span className="text-accent">
                        {formatCurrency(compensation.totalBenefits)} / year
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3 - Total Compensation */}
              <Card className="border-accent/50 bg-accent/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm font-medium">
                      Total Estimated Compensation
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-accent">
                    {formatCurrency(compensation.totalComp)}
                    <span className="text-sm font-normal text-muted-foreground"> / year</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Estimates are for planning only and may differ from actual offers and official
                    OPM calculations.
                  </p>
                </CardContent>
              </Card>

              {/* Card 4 - PathAdvisor Insight */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm font-medium">PathAdvisor Insight</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    At {grade} Step {step} in {location}, federal total compensation is
                    approximately{' '}
                    <span className="text-foreground font-medium">
                      {Math.round((compensation.totalBenefits / compensation.totalBasePay) * 100)}%
                      higher
                    </span>{' '}
                    than base salary alone. The TSP employer match and FERS pension become more
                    valuable the longer you stay in federal service.
                    {tspContribution >= 5 &&
                      " You're contributing enough to get the full 5% TSP match—great choice!"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border flex items-center justify-between">
          <button
            onClick={handleCompareAnother}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Compare with another scenario
          </button>
          <Button
            onClick={handleSaveEstimate}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Save estimate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
