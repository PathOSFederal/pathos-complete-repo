'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Plane, ChevronDown, ChevronUp, X } from 'lucide-react';
import { SensitiveValue } from '@/components/sensitive-value';
import { CardVisibilityToggle } from '@/components/compensation/card-visibility-toggle';
import Link from 'next/link';

interface EstimatePcsCostsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PcsAssumptions {
  tempLodgingDays: number;
  lodgingType: 'on-base' | 'off-base';
  dailySpendingAbovePerDiem: number;
  fullServiceMovers: boolean;
  shippingPovAtOwnExpense: boolean;
  shippingPets: boolean;
  serviceBranch: string;
  reimbursementConfidence: 'conservative' | 'standard' | 'optimistic';
}

interface MoveDetails {
  from: string;
  to: string;
  moveType: string;
  reportDate: string;
  withDependents: boolean;
  numDependents: number;
  hhgWeight: number;
  numPovs: number;
}

export function EstimatePcsCostsModal({ open, onOpenChange }: EstimatePcsCostsModalProps) {
  const [scenario, setScenario] = useState('next-likely');
  const [isHidden, setIsHidden] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const [moveDetails, setMoveDetails] = useState<MoveDetails>({
    from: 'Fort Belvoir, VA',
    to: 'San Diego, CA',
    moveType: 'conus-conus',
    reportDate: '',
    withDependents: true,
    numDependents: 2,
    hhgWeight: 12000,
    numPovs: 2,
  });

  const [assumptions, setAssumptions] = useState<PcsAssumptions>({
    tempLodgingDays: 10,
    lodgingType: 'off-base',
    dailySpendingAbovePerDiem: 25,
    fullServiceMovers: true,
    shippingPovAtOwnExpense: false,
    shippingPets: false,
    serviceBranch: 'Army',
    reimbursementConfidence: 'standard',
  });

  const pcsEstimate = useMemo(() => {
    // Base costs calculation
    const baseHhgCost = (moveDetails.hhgWeight / 1000) * 400;
    const hhgCost = assumptions.fullServiceMovers ? baseHhgCost : baseHhgCost * 0.6;

    const travelCost = moveDetails.moveType.includes('oconus') ? 2500 : 1200;

    const perDiemBase = 150;
    const lodgingMultiplier = assumptions.lodgingType === 'off-base' ? 1.3 : 1;
    const lodgingCost =
      assumptions.tempLodgingDays * perDiemBase * lodgingMultiplier +
      assumptions.tempLodgingDays * assumptions.dailySpendingAbovePerDiem;

    const povCost = moveDetails.numPovs * (moveDetails.moveType.includes('oconus') ? 1500 : 400);
    const ownExpensePovCost = assumptions.shippingPovAtOwnExpense ? 800 : 0;

    const petCost = assumptions.shippingPets ? 500 : 0;
    const otherCosts = 350 + petCost;

    const totalCost = Math.round(
      hhgCost + travelCost + lodgingCost + povCost + ownExpensePovCost + otherCosts,
    );

    // Government coverage calculation
    const coverageMultiplier =
      assumptions.reimbursementConfidence === 'conservative'
        ? 0.55
        : assumptions.reimbursementConfidence === 'optimistic'
          ? 0.75
          : 0.65;

    const govCoverage = Math.round(totalCost * coverageMultiplier);
    const outOfPocket = totalCost - govCoverage;

    return {
      hhgCost: Math.round(hhgCost),
      travelCost: Math.round(travelCost),
      lodgingCost: Math.round(lodgingCost),
      povCost: Math.round(povCost + ownExpensePovCost),
      otherCosts: Math.round(otherCosts),
      totalCost,
      govCoverage,
      outOfPocket,
      hhgCoverage: Math.round(hhgCost * 0.8),
      travelPerDiemCoverage: Math.round((travelCost + lodgingCost) * 0.7),
      tleCoverage: Math.round(assumptions.tempLodgingDays * 100),
    };
  }, [moveDetails, assumptions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const coveragePercent = Math.round((pcsEstimate.govCoverage / pcsEstimate.totalCost) * 100);
  const outOfPocketPercent = 100 - coveragePercent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-5xl lg:max-w-6xl p-6 lg:p-8 max-h-[85vh] overflow-y-auto bg-background"
      >
        {/* Header */}
        <DialogHeader className="space-y-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-primary" />
                <DialogTitle className="text-xl font-semibold">Estimate PCS Costs</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Plan a future move based on your profile, grade, and family details.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next-likely">Next likely PCS</SelectItem>
                  <SelectItem value="custom">Custom move</SelectItem>
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

        {/* Summary Strip */}
        <div className="mt-4 grid grid-cols-3 gap-4 rounded-lg border border-border bg-card/50 p-4">
          <div>
            <p className="text-sm font-medium">No active PCS orders</p>
            <p className="text-xs text-muted-foreground">Last PCS: Fort Belvoir → DC (2022)</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Est. next PCS cost</p>
            <SensitiveValue
              value={`~${formatCurrency(pcsEstimate.totalCost)}`}
              isHidden={isHidden}
              className="text-lg font-semibold"
            />
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">Govt. coverage:</span>
              <SensitiveValue
                value={`Up to ${formatCurrency(pcsEstimate.govCoverage)}`}
                isHidden={isHidden}
                className="text-sm font-medium text-green-400"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">Est. out-of-pocket:</span>
              <SensitiveValue
                value={`~${formatCurrency(pcsEstimate.outOfPocket)}`}
                isHidden={isHidden}
                className="text-sm font-medium text-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-2 text-xs text-muted-foreground">
          Estimates are for planning only and based on typical PCS rules and your assumptions.
          Actual entitlements and reimbursements will come from your official orders and finance
          office.
        </p>

        {/* Main Two-Column Layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Left Column - Move Details & Estimated Costs */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Move details</CardTitle>
              <p className="text-xs text-muted-foreground">
                Adjust origin, destination, family size, and household goods to estimate costs.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Route & Timing */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Route & Timing
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    <Input
                      value={moveDetails.from}
                      onChange={(e) => setMoveDetails({ ...moveDetails, from: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="City or base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">To</Label>
                    <Input
                      value={moveDetails.to}
                      onChange={(e) => setMoveDetails({ ...moveDetails, to: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="City or base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Move type</Label>
                    <Select
                      value={moveDetails.moveType}
                      onValueChange={(v) => setMoveDetails({ ...moveDetails, moveType: v })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conus-conus">CONUS to CONUS</SelectItem>
                        <SelectItem value="conus-oconus">CONUS to OCONUS</SelectItem>
                        <SelectItem value="oconus-conus">OCONUS to CONUS</SelectItem>
                        <SelectItem value="oconus-oconus">OCONUS to OCONUS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Report date (optional)</Label>
                    <Input
                      type="date"
                      value={moveDetails.reportDate}
                      onChange={(e) =>
                        setMoveDetails({ ...moveDetails, reportDate: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Household Profile */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Household Profile
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">With dependents?</Label>
                    <Select
                      value={moveDetails.withDependents ? 'yes' : 'no'}
                      onValueChange={(v) =>
                        setMoveDetails({ ...moveDetails, withDependents: v === 'yes' })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Number of dependents</Label>
                    <Input
                      type="number"
                      min={0}
                      value={moveDetails.numDependents}
                      onChange={(e) =>
                        setMoveDetails({
                          ...moveDetails,
                          numDependents: Number.parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-8 text-sm"
                      disabled={!moveDetails.withDependents}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Estimated HHG weight (lbs)</Label>
                    <span className="text-xs text-muted-foreground">
                      {moveDetails.hhgWeight.toLocaleString()} lbs
                    </span>
                  </div>
                  <Slider
                    value={[moveDetails.hhgWeight]}
                    onValueChange={([v]) => setMoveDetails({ ...moveDetails, hhgWeight: v })}
                    min={2000}
                    max={18000}
                    step={500}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Number of POVs (vehicles)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={4}
                    value={moveDetails.numPovs}
                    onChange={(e) =>
                      setMoveDetails({
                        ...moveDetails,
                        numPovs: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Estimated PCS Cost Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Household goods shipment</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.hhgCost)}
                      isHidden={isHidden}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Travel (mileage / airfare)</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.travelCost)}
                      isHidden={isHidden}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temporary lodging & per diem</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.lodgingCost)}
                      isHidden={isHidden}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle shipment / mileage</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.povCost)}
                      isHidden={isHidden}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Other PCS-related costs</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.otherCosts)}
                      isHidden={isHidden}
                    />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-medium">
                    <span>Estimated total PCS cost</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.totalCost)}
                      isHidden={isHidden}
                      className="text-base font-semibold"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Government Coverage & Out-of-Pocket */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Government coverage</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Approximate coverage based on typical PCS entitlements and your profile.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HHG coverage (up to weight limit)</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.hhgCoverage)}
                      isHidden={isHidden}
                      className="text-green-400"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Travel & per diem</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.travelPerDiemCoverage)}
                      isHidden={isHidden}
                      className="text-green-400"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TLE/TLA estimate</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.tleCoverage)}
                      isHidden={isHidden}
                      className="text-green-400"
                    />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-medium">Estimated covered PCS costs</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.govCoverage)}
                      isHidden={isHidden}
                      className="font-semibold text-green-400"
                    />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-medium">Estimated out-of-pocket</span>
                    <SensitiveValue
                      value={formatCurrency(pcsEstimate.outOfPocket)}
                      isHidden={isHidden}
                      className="font-semibold text-amber-400"
                    />
                  </div>
                </div>

                {/* Coverage Bar Visualization */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Coverage breakdown</span>
                    <span>{coveragePercent}% covered</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="bg-green-500 transition-all duration-300"
                      style={{ width: `${coveragePercent}%` }}
                    />
                    <div
                      className="bg-amber-500 transition-all duration-300"
                      style={{ width: `${outOfPocketPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Govt. covered</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-muted-foreground">Out-of-pocket</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PathAdvisor Insight */}
            <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-muted-foreground space-y-2">
              <p>
                Based on your current assumptions, you may need to cover about{' '}
                <span className="font-semibold text-foreground">
                  {isHidden ? '••••••' : formatCurrency(pcsEstimate.outOfPocket)}
                </span>{' '}
                out of pocket.
              </p>
              <p>
                Reducing HHG weight, driving one POV instead of shipping, or shortening temporary
                lodging can lower your costs.
              </p>
              <Link
                href="/dashboard/retirement"
                className="text-primary hover:underline text-xs inline-block mt-1"
              >
                Open PCS advice in PathAdvisor →
              </Link>
            </div>
          </div>
        </div>

        {/* Adjust Assumptions Section */}
        {showAssumptions && (
          <Card className="mt-6 border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adjust assumptions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your moving style, lodging days, and reimbursement assumptions. PathOS will
                recompute PCS cost, government coverage, and out-of-pocket.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {/* Moving Style & Lodging */}
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Moving Style & Lodging
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Temporary lodging days</Label>
                      <span className="text-xs text-muted-foreground">
                        {assumptions.tempLodgingDays} days
                      </span>
                    </div>
                    <Slider
                      value={[assumptions.tempLodgingDays]}
                      onValueChange={([v]) =>
                        setAssumptions({ ...assumptions, tempLodgingDays: v })
                      }
                      min={0}
                      max={30}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lodging type</Label>
                    <Select
                      value={assumptions.lodgingType}
                      onValueChange={(v: 'on-base' | 'off-base') =>
                        setAssumptions({ ...assumptions, lodgingType: v })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on-base">On base</SelectItem>
                        <SelectItem value="off-base">Off base / hotel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Daily spending above per diem</Label>
                      <span className="text-xs text-muted-foreground">
                        ${assumptions.dailySpendingAbovePerDiem}
                      </span>
                    </div>
                    <Slider
                      value={[assumptions.dailySpendingAbovePerDiem]}
                      onValueChange={([v]) =>
                        setAssumptions({ ...assumptions, dailySpendingAbovePerDiem: v })
                      }
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>

                {/* Household Goods & POV */}
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Household Goods & POV
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fullService"
                      checked={assumptions.fullServiceMovers}
                      onCheckedChange={(checked) =>
                        setAssumptions({ ...assumptions, fullServiceMovers: checked as boolean })
                      }
                    />
                    <Label htmlFor="fullService" className="text-xs">
                      Full-service movers (vs packing yourself)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="povOwnExpense"
                      checked={assumptions.shippingPovAtOwnExpense}
                      onCheckedChange={(checked) =>
                        setAssumptions({
                          ...assumptions,
                          shippingPovAtOwnExpense: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="povOwnExpense" className="text-xs">
                      Shipping a POV at own expense
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pets"
                      checked={assumptions.shippingPets}
                      onCheckedChange={(checked) =>
                        setAssumptions({ ...assumptions, shippingPets: checked as boolean })
                      }
                    />
                    <Label htmlFor="pets" className="text-xs">
                      Shipping pets (adds ~$500)
                    </Label>
                  </div>
                </div>

                {/* Policy Assumptions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Policy Assumptions
                  </h4>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Service branch</Label>
                    <Select
                      value={assumptions.serviceBranch}
                      onValueChange={(v) => setAssumptions({ ...assumptions, serviceBranch: v })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Army">Army</SelectItem>
                        <SelectItem value="Navy">Navy</SelectItem>
                        <SelectItem value="Air Force">Air Force</SelectItem>
                        <SelectItem value="Marines">Marines</SelectItem>
                        <SelectItem value="Coast Guard">Coast Guard</SelectItem>
                        <SelectItem value="Space Force">Space Force</SelectItem>
                        <SelectItem value="Civilian">Civilian (DoD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Reimbursement confidence</Label>
                    <Select
                      value={assumptions.reimbursementConfidence}
                      onValueChange={(v: 'conservative' | 'standard' | 'optimistic') =>
                        setAssumptions({ ...assumptions, reimbursementConfidence: v })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative (55%)</SelectItem>
                        <SelectItem value="standard">Standard (65%)</SelectItem>
                        <SelectItem value="optimistic">Optimistic (75%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setShowAssumptions((prev) => !prev)}
            className="gap-2"
          >
            {showAssumptions ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide assumptions
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Adjust assumptions
              </>
            )}
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
