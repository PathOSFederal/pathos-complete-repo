'use client';

import { Calendar, Info, Plane, HeartPulse, Gift, CreditCard, Bus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function LeaveBenefitsCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('benefits.leaveBenefits');
  const title = 'Leave & Other Benefits';

  // Mock data - would come from profile/store
  const yearsOfService = 18;
  const hourlyRate = 83.51; // Approx for GS-15 Step 5

  // Annual leave accrual based on years of service
  const getAnnualLeaveHours = () => {
    if (yearsOfService >= 15) return 208; // 26 days
    if (yearsOfService >= 3) return 160; // 20 days
    return 104; // 13 days
  };

  const annualLeaveHours = getAnnualLeaveHours();
  const sickLeaveHours = 104; // 13 days per year
  const federalHolidays = 11;

  const annualLeaveValue = Math.round(annualLeaveHours * hourlyRate);
  const sickLeaveValue = Math.round(sickLeaveHours * hourlyRate);
  const holidaysValue = Math.round(federalHolidays * 8 * hourlyRate);

  const benefits = [
    {
      icon: Plane,
      label: 'Annual Leave',
      value: `${annualLeaveHours} hours/year`,
      dollarValue: `$${annualLeaveValue.toLocaleString()}`,
      description: `${annualLeaveHours / 8} days per year (15+ years service)`,
    },
    {
      icon: HeartPulse,
      label: 'Sick Leave',
      value: `${sickLeaveHours} hours/year`,
      dollarValue: `$${sickLeaveValue.toLocaleString()}`,
      description: '13 days per year, no maximum accrual',
    },
    {
      icon: Gift,
      label: 'Federal Holidays',
      value: `${federalHolidays} days/year`,
      dollarValue: `$${holidaysValue.toLocaleString()}`,
      description: 'Paid federal holidays',
    },
  ];

  const otherBenefits = [
    {
      icon: CreditCard,
      label: 'Flexible Spending Account (FSA)',
      description: 'Pre-tax healthcare & dependent care savings',
      placeholder: true,
    },
    {
      icon: Bus,
      label: 'Transit Benefits',
      description: 'Pre-tax commuter benefits up to $315/mo',
      placeholder: true,
    },
  ];

  const totalLeaveValue = annualLeaveValue + sickLeaveValue + holidaysValue;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your paid leave and additional federal benefits
              </p>
            </div>
          </div>
          <DashboardCardVisibilityToggle cardKey="benefits.leaveBenefits" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {visible ? (
          <>
            {/* Leave Benefits */}
            <div className="space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit.label} className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-muted rounded-md mt-0.5">
                        <benefit.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{benefit.label}</p>
                        <p className="text-xs text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{benefit.value}</p>
                      <div className="flex items-center gap-1 justify-end">
                        <SensitiveValue
                          value={benefit.dollarValue}
                          className="text-xs text-accent"
                          hide={isSensitiveHidden}
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>
                                Estimated dollar value calculated using your hourly rate. This is the
                                approximate cost if these hours were paid as salary.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Leave Value */}
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Leave Value</p>
                  <p className="text-xs text-muted-foreground">
                    Combined annual leave, sick leave, and holidays
                  </p>
                </div>
                <SensitiveValue
                  value={`$${totalLeaveValue.toLocaleString()}`}
                  className="text-xl font-bold text-accent"
                  hide={isSensitiveHidden}
                />
              </div>
            </div>

            {/* Other Benefits */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Other Federal Benefits</p>
              {otherBenefits.map((benefit) => (
                <div key={benefit.label} className="p-3 rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-muted rounded-md">
                      <benefit.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{benefit.label}</p>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground italic">
              * Dollar values are estimates based on your current hourly rate and are not official
              compensation figures.
            </p>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="benefits.leaveBenefits" />
        )}
      </CardContent>
    </Card>
  );
}
