'use client';

import { Briefcase, DollarSign, MapPin, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SensitiveValue } from '@/components/sensitive-value';
import { MetricInfoPopover } from './metric-info-popover';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

interface CompensationSnapshotProps {
  grade: string;
  step: number;
  series?: string;
  locality: string;
  basePay: number;
  localityAdjustedPay: number;
  totalCompensation: number;
}

export function CompensationSnapshot({
  grade,
  step,
  series,
  locality,
  basePay,
  localityAdjustedPay,
  totalCompensation,
}: CompensationSnapshotProps) {
  const positionVis = useDashboardCardVisibility('compensation.currentPosition');
  const basePayVis = useDashboardCardVisibility('compensation.basePay');
  const localityPayVis = useDashboardCardVisibility('compensation.localityPay');
  const totalCompVis = useDashboardCardVisibility('compensation.totalCompensation');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Current Position */}
      <Card className="border-border bg-card hover:bg-card/80 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-accent" />
              Current Position
            </CardTitle>
            <DashboardCardVisibilityToggle cardKey="compensation.currentPosition" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {positionVis.visible ? (
            <>
              <div className="text-xl font-bold text-foreground">
                <SensitiveValue value={`${grade} Step ${step}`} hide={positionVis.isSensitiveHidden} />
              </div>
              <p className="text-sm text-muted-foreground">
                <SensitiveValue value={`${locality} Locality`} hide={positionVis.isSensitiveHidden} />
              </p>
              {series && (
                <p className="text-xs text-muted-foreground">
                  Series: <SensitiveValue value={series} hide={positionVis.isSensitiveHidden} />
                </p>
              )}
              <p className="text-xs text-accent mt-2">From your profile</p>
            </>
          ) : (
            <CardHiddenPlaceholder title="Current Position" cardKey="compensation.currentPosition" />
          )}
        </CardContent>
      </Card>

      {/* Card 2: Base Pay */}
      <Card className="border-border bg-card hover:bg-card/80 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-accent" />
              Base Pay
            </CardTitle>
            <div className="flex items-center gap-1">
              <DashboardCardVisibilityToggle cardKey="compensation.basePay" />
              <MetricInfoPopover
                title="Base Pay"
                description="Your annual GS base pay before any locality adjustments or additional benefits are applied."
                details="Base pay is determined by your GS grade and step, and is set by the Office of Personnel Management (OPM) annually."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {basePayVis.visible ? (
            <>
              <div className="text-2xl font-bold text-foreground">
                <SensitiveValue value={formatCurrency(basePay)} hide={basePayVis.isSensitiveHidden} />
              </div>
              <p className="text-xs text-muted-foreground">
                Annual GS base pay before locality and benefits
              </p>
            </>
          ) : (
            <CardHiddenPlaceholder title="Base Pay" cardKey="compensation.basePay" />
          )}
        </CardContent>
      </Card>

      {/* Card 3: Locality Adjusted Pay */}
      <Card className="border-border bg-card hover:bg-card/80 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              Locality Adjusted Pay
            </CardTitle>
            <div className="flex items-center gap-1">
              <DashboardCardVisibilityToggle cardKey="compensation.localityPay" />
              <MetricInfoPopover
                title="Locality Pay"
                description="Locality pay is an additional percentage added to your base pay to account for cost-of-living differences across geographic areas."
                details="The locality percentage varies by region, with higher-cost areas like DC, San Francisco, and NYC receiving larger adjustments."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {localityPayVis.visible ? (
            <>
              <div className="text-2xl font-bold text-foreground">
                <SensitiveValue
                  value={formatCurrency(localityAdjustedPay)}
                  hide={localityPayVis.isSensitiveHidden}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Approximate annual pay including locality adjustment
              </p>
            </>
          ) : (
            <CardHiddenPlaceholder title="Locality Adjusted Pay" cardKey="compensation.localityPay" />
          )}
        </CardContent>
      </Card>

      {/* Card 4: Estimated Total Compensation */}
      <Card className="border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-accent" />
              Total Compensation
            </CardTitle>
            <div className="flex items-center gap-1">
              <DashboardCardVisibilityToggle cardKey="compensation.totalCompensation" />
              <MetricInfoPopover
                title="Total Compensation"
                description="Your estimated total compensation package includes base pay, locality pay, and the estimated value of your federal benefits."
                details="Benefits value includes FEHB employer contribution, TSP match, and the monetary value of leave accrual. This is a modeled estimate, not exact payroll data."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {totalCompVis.visible ? (
            <>
              <div className="text-2xl font-bold text-accent">
                <SensitiveValue value={formatCurrency(totalCompensation)} hide={totalCompVis.isSensitiveHidden} />
              </div>
              <p className="text-xs text-muted-foreground">
                Includes estimated value of FEHB, TSP, and leave
              </p>
              <p className="text-xs text-amber-500/80 mt-1">
                Modeled based on assumptions, not exact payroll data
              </p>
            </>
          ) : (
            <CardHiddenPlaceholder title="Total Compensation" cardKey="compensation.totalCompensation" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
