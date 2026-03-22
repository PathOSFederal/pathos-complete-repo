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
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Star, X, ChevronDown, ChevronUp, Sparkles, ArrowLeft, Info } from 'lucide-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface ExploreFehbPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLocation?: string;
  targetGrade?: string;
  coverageType?: 'self' | 'self-plus-one' | 'family';
}

interface PlanData {
  id: string;
  name: string;
  carrier: string;
  type: 'HMO' | 'PPO' | 'HDHP';
  rating: number;
  monthlyPremium: number;
  deductible: number;
  oopMax: number;
  primaryCareVisit: number;
  specialistVisit: number;
  network: string;
  isRecommended: boolean;
  highlights: string[];
}

const LOCALITIES = [
  'Washington, DC',
  'Orlando, FL',
  'San Antonio, TX',
  'Denver, CO',
  'Los Angeles, CA',
  'New York, NY',
  'Chicago, IL',
  'Atlanta, GA',
  'Seattle, WA',
  'Boston, MA',
];

const GRADES = ['GS-5', 'GS-7', 'GS-9', 'GS-11', 'GS-12', 'GS-13', 'GS-14', 'GS-15'];

const STEPS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const MOCK_PLANS: PlanData[] = [
  {
    id: 'bcbs-basic',
    name: 'BCBS Basic',
    carrier: 'Blue Cross Blue Shield',
    type: 'PPO',
    rating: 4.5,
    monthlyPremium: 285,
    deductible: 350,
    oopMax: 6000,
    primaryCareVisit: 25,
    specialistVisit: 40,
    network: 'Nationwide',
    isRecommended: true,
    highlights: [
      'Good for individuals who want flexibility in choosing providers.',
      'Lower premium with moderate out-of-pocket costs.',
      'Strong nationwide network for job seekers who may relocate.',
    ],
  },
  {
    id: 'kaiser-hmo',
    name: 'Kaiser HMO',
    carrier: 'Kaiser Permanente',
    type: 'HMO',
    rating: 4.8,
    monthlyPremium: 310,
    deductible: 200,
    oopMax: 4500,
    primaryCareVisit: 20,
    specialistVisit: 35,
    network: 'Regional',
    isRecommended: true,
    highlights: [
      'Excellent for those who prefer coordinated care.',
      'Lower deductible and out-of-pocket maximum.',
      'Best ratings for preventive care services.',
    ],
  },
  {
    id: 'geha-hdhp',
    name: 'GEHA HDHP',
    carrier: 'Government Employees Health Association',
    type: 'HDHP',
    rating: 4.3,
    monthlyPremium: 195,
    deductible: 1500,
    oopMax: 5000,
    primaryCareVisit: 0,
    specialistVisit: 0,
    network: 'Nationwide',
    isRecommended: false,
    highlights: [
      'Lowest premium option with HSA eligibility.',
      'Good for healthy individuals with low healthcare usage.',
      'Higher deductible but lower monthly costs.',
    ],
  },
  {
    id: 'aetna-ppo',
    name: 'Aetna Open Access',
    carrier: 'Aetna',
    type: 'PPO',
    rating: 4.2,
    monthlyPremium: 325,
    deductible: 400,
    oopMax: 5500,
    primaryCareVisit: 30,
    specialistVisit: 45,
    network: 'Nationwide',
    isRecommended: false,
    highlights: [
      'Wide network of providers nationwide.',
      'Good balance of cost and coverage.',
      'Includes telehealth options at no extra cost.',
    ],
  },
  {
    id: 'united-choice',
    name: 'United Choice Plus',
    carrier: 'UnitedHealthcare',
    type: 'PPO',
    rating: 4.1,
    monthlyPremium: 298,
    deductible: 350,
    oopMax: 5800,
    primaryCareVisit: 25,
    specialistVisit: 40,
    network: 'Nationwide',
    isRecommended: false,
    highlights: [
      'Extensive nationwide provider network.',
      'Strong mental health and wellness programs.',
      'No referrals needed for specialists.',
    ],
  },
  {
    id: 'cigna-hmo',
    name: 'CIGNA HealthCare',
    carrier: 'Cigna',
    type: 'HMO',
    rating: 4.0,
    monthlyPremium: 275,
    deductible: 300,
    oopMax: 5200,
    primaryCareVisit: 20,
    specialistVisit: 35,
    network: 'Regional',
    isRecommended: false,
    highlights: [
      'Lower costs when using in-network providers.',
      'Comprehensive preventive care coverage.',
      'Good prescription drug coverage.',
    ],
  },
];

export function ExploreFehbPlansModal({
  open,
  onOpenChange,
  targetLocation = 'Washington, DC',
  targetGrade = 'GS-7',
  coverageType: initialCoverage = 'self',
}: ExploreFehbPlansModalProps) {
  // Filter state
  const [locality, setLocality] = useState(targetLocation);
  const [grade, setGrade] = useState(targetGrade);
  const [step, setStep] = useState('1');
  const [coverage, setCoverage] = useState<'self' | 'self-plus-one' | 'family'>(initialCoverage);
  const [planTypes, setPlanTypes] = useState<string[]>([]);
  const [premiumRange, setPremiumRange] = useState([0, 500]);
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);
  const [nationalOnly, setNationalOnly] = useState(false);

  // UI state
  const [isHidden, setIsHidden] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [comparePlans, setComparePlans] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const localOverride = isHidden ? 'hide' : 'default';

  // Filter plans based on current filters
  const filteredPlans = useMemo(() => {
    return MOCK_PLANS.filter((plan) => {
      // Plan type filter
      if (planTypes.length > 0 && !planTypes.includes(plan.type)) {
        return false;
      }
      // Premium range filter
      if (plan.monthlyPremium < premiumRange[0] || plan.monthlyPremium > premiumRange[1]) {
        return false;
      }
      // Recommended only filter
      if (showRecommendedOnly && !plan.isRecommended) {
        return false;
      }
      // National plans only filter
      if (nationalOnly && plan.network !== 'Nationwide') {
        return false;
      }
      return true;
    });
  }, [planTypes, premiumRange, showRecommendedOnly, nationalOnly]);

  const togglePlanType = (type: string) => {
    setPlanTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleComparePlan = (planId: string) => {
    setComparePlans((prev) => {
      if (prev.includes(planId)) {
        return prev.filter((id) => id !== planId);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 plans
      }
      return [...prev, planId];
    });
  };

  const resetFilters = () => {
    setLocality(targetLocation);
    setGrade(targetGrade);
    setStep('1');
    setCoverage(initialCoverage);
    setPlanTypes([]);
    setPremiumRange([0, 500]);
    setShowRecommendedOnly(false);
    setNationalOnly(false);
  };

  const handleSaveScenario = () => {
    // TODO: Wire up to job seeker profile storage
    console.log('Saving scenario:', {
      locality,
      grade,
      step,
      coverage,
      filters: { planTypes, premiumRange, showRecommendedOnly, nationalOnly },
    });
    onOpenChange(false);
  };

  const comparedPlansData = MOCK_PLANS.filter((p) => comparePlans.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl lg:max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Explore FEHB Plans</DialogTitle>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className="shrink-0 border-b border-border p-4 lg:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogHeader className="p-0 space-y-0">
                <h2 className="text-lg font-semibold">Explore FEHB Plans</h2>
                <DialogDescription className="text-sm text-muted-foreground">
                  Preview FEHB plan options for your target federal jobs. This is for planning only,
                  not enrollment.
                </DialogDescription>
              </DialogHeader>
              {/* Scenario pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant="outline" className="text-xs">
                  Target area: {locality}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Assumed grade: {grade} Step {step}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Coverage:{' '}
                  {coverage === 'self'
                    ? 'Self only'
                    : coverage === 'self-plus-one'
                      ? 'Self + One'
                      : 'Self + Family'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CardVisibilityToggle isHidden={isHidden} onToggle={() => setIsHidden(!isHidden)} />
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
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left column - Filters */}
          <div className="shrink-0 w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border p-4 overflow-y-auto">
            <h3 className="text-sm font-medium mb-4">Filters & Scenario</h3>

            <div className="space-y-5">
              {/* Location / Locality */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Target locality</Label>
                <Select value={locality} onValueChange={setLocality}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALITIES.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Uses OPM locality and FEHB region data.
                </p>
              </div>

              {/* Grade and Step */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Grade and pay scenario</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={step} onValueChange={setStep}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Step" />
                    </SelectTrigger>
                    <SelectContent>
                      {STEPS.map((s) => (
                        <SelectItem key={s} value={s}>
                          Step {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Coverage type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Coverage type</Label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: 'self', label: 'Self only' },
                    { value: 'self-plus-one', label: 'Self plus one' },
                    { value: 'family', label: 'Self plus family' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        coverage === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="coverage"
                        value={option.value}
                        checked={coverage === option.value}
                        onChange={(e) => setCoverage(e.target.value as typeof coverage)}
                        className="sr-only"
                      />
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          coverage === option.value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/50'
                        }`}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Plan type filters */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Plan filters</Label>
                <div className="flex flex-wrap gap-2">
                  {['HMO', 'PPO', 'HDHP'].map((type) => (
                    <Badge
                      key={type}
                      variant={planTypes.includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => togglePlanType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="national-only"
                    checked={nationalOnly}
                    onCheckedChange={(checked) => setNationalOnly(checked === true)}
                  />
                  <label htmlFor="national-only" className="text-xs cursor-pointer">
                    National plans only
                  </label>
                </div>
              </div>

              {/* Premium range */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Premium range: ${premiumRange[0]} - ${premiumRange[1]}/mo
                </Label>
                <Slider
                  value={premiumRange}
                  onValueChange={setPremiumRange}
                  min={0}
                  max={500}
                  step={25}
                  className="py-2"
                />
              </div>

              {/* Recommended only */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recommended-only"
                  checked={showRecommendedOnly}
                  onCheckedChange={(checked) => setShowRecommendedOnly(checked === true)}
                />
                <label htmlFor="recommended-only" className="text-xs cursor-pointer">
                  Show only plans PathAdvisor recommends
                </label>
              </div>

              {/* Action buttons */}
              <div className="pt-2 space-y-2">
                <Button className="w-full" size="sm">
                  Update results
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={resetFilters}>
                  Reset filters
                </Button>
              </div>
            </div>
          </div>

          {/* Right column - Results */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {showComparison ? (
              /* Comparison view */
              <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-4 -ml-2"
                  onClick={() => setShowComparison(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to plan list
                </Button>

                <h3 className="text-sm font-medium mb-4">Plan Comparison</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">
                          Feature
                        </th>
                        {comparedPlansData.map((plan) => (
                          <th key={plan.id} className="text-left py-2 px-4 font-medium">
                            {plan.name}
                            {plan.isRecommended && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Recommended
                              </Badge>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-3 pr-4 text-muted-foreground">Monthly premium</td>
                        {comparedPlansData.map((plan) => (
                          <td key={plan.id} className="py-3 px-4">
                            <SensitiveValue
                              value={`$${plan.monthlyPremium}/mo`}
                              localOverride={localOverride}
                              className="font-medium"
                            />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 pr-4 text-muted-foreground">Deductible</td>
                        {comparedPlansData.map((plan) => (
                          <td key={plan.id} className="py-3 px-4">
                            <SensitiveValue
                              value={`$${plan.deductible}`}
                              localOverride={localOverride}
                            />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 pr-4 text-muted-foreground">Out-of-pocket max</td>
                        {comparedPlansData.map((plan) => (
                          <td key={plan.id} className="py-3 px-4">
                            <SensitiveValue
                              value={`$${plan.oopMax.toLocaleString()}`}
                              localOverride={localOverride}
                            />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 pr-4 text-muted-foreground">Network type</td>
                        {comparedPlansData.map((plan) => (
                          <td key={plan.id} className="py-3 px-4">
                            {plan.type} ({plan.network})
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 pr-4 text-muted-foreground">Primary care visit</td>
                        {comparedPlansData.map((plan) => (
                          <td key={plan.id} className="py-3 px-4">
                            <SensitiveValue
                              value={
                                plan.primaryCareVisit === 0
                                  ? 'After deductible'
                                  : `$${plan.primaryCareVisit}`
                              }
                              localOverride={localOverride}
                            />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 pr-4 text-muted-foreground">Rating</td>
                        {comparedPlansData.map((plan) => (
                          <td key={plan.id} className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-accent fill-accent" />
                              <span>{plan.rating}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 text-muted-foreground align-top">
                          PathAdvisor note
                        </td>
                        {comparedPlansData.map((plan) => (
                          <td key={plan.id} className="py-3 px-4 text-xs text-muted-foreground">
                            {plan.highlights[0]}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Plan list view */
              <>
                {/* Summary bar */}
                <div className="shrink-0 p-4 lg:px-6 border-b border-border">
                  <Card className="bg-muted/30 border-border">
                    <CardContent className="p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">Top matches in your target area</p>
                          <p className="text-xs text-muted-foreground">
                            Showing {filteredPlans.length} plans matching your filters.
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Info className="w-3 h-3 mr-1" />
                          Premiums shown are estimates only
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Plan list */}
                <div className="flex-1 overflow-y-auto p-4 lg:px-6 space-y-3">
                  {filteredPlans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`border-border ${plan.isRecommended ? 'ring-1 ring-emerald-500/30' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={comparePlans.includes(plan.id)}
                              onCheckedChange={() => toggleComparePlan(plan.id)}
                              className="mt-1"
                            />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{plan.name}</span>
                                {plan.isRecommended && (
                                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{plan.carrier}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="w-3 h-3 text-accent fill-accent" />
                                <span>{plan.rating}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <SensitiveValue
                              value={`$${plan.monthlyPremium}/mo`}
                              localOverride={localOverride}
                              className="text-lg font-semibold"
                            />
                            <CardVisibilityToggle
                              isHidden={isHidden}
                              onToggle={() => setIsHidden(!isHidden)}
                            />
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3 pt-3 border-t border-border/50">
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="text-sm">{plan.type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Deductible</p>
                            <SensitiveValue
                              value={`$${plan.deductible}`}
                              localOverride={localOverride}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Primary care visit</p>
                            <SensitiveValue
                              value={
                                plan.primaryCareVisit === 0
                                  ? 'After deductible'
                                  : `$${plan.primaryCareVisit}`
                              }
                              localOverride={localOverride}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Out-of-pocket max</p>
                            <SensitiveValue
                              value={`$${plan.oopMax.toLocaleString()}`}
                              localOverride={localOverride}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* Expandable details */}
                        <div className="mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)
                            }
                          >
                            {expandedPlanId === plan.id ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Hide details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                View plan details
                              </>
                            )}
                          </Button>

                          {expandedPlanId === plan.id && (
                            <div className="mt-3 p-3 bg-muted/30 rounded-md">
                              <ul className="space-y-1.5">
                                {plan.highlights.map((highlight, idx) => (
                                  <li
                                    key={idx}
                                    className="text-xs text-muted-foreground flex items-start gap-2"
                                  >
                                    <span className="text-emerald-500 mt-0.5">•</span>
                                    {highlight}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Compare strip */}
                {comparePlans.length >= 2 && (
                  <div className="shrink-0 border-t border-border p-3 bg-muted/30 flex items-center justify-between">
                    <p className="text-sm">
                      Comparing {comparePlans.length} plan{comparePlans.length > 1 ? 's' : ''}
                    </p>
                    <Button size="sm" onClick={() => setShowComparison(true)}>
                      Open comparison
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-4 lg:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-background">
          <p className="text-xs text-muted-foreground max-w-lg">
            FEHB information is for planning only. You can enroll or change plans only through
            official federal systems.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handleSaveScenario}>
              Save scenario
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
