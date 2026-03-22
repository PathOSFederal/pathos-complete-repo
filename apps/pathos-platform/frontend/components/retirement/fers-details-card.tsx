'use client';

import { Shield, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function FersDetailsCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('retirement.fersDetails');
  const title = 'FERS Pension Details';

  // Mock data
  const mockData = {
    high3Salary: 126050,
    yearsOfService: 20,
    multiplier: 1.1, // 1.1% if retiring at 62+ with 20+ years
    retirementAge: 62,
  };

  // Calculate estimated annual pension
  const estimatedAnnualPension = Math.round(
    mockData.high3Salary * (mockData.multiplier / 100) * mockData.yearsOfService,
  );
  const estimatedMonthlyPension = Math.round(estimatedAnnualPension / 12);

  return (
    <Card className="border-border bg-card">
      <TooltipProvider>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Understanding your federal pension
                </p>
              </div>
            </div>
            <DashboardCardVisibilityToggle cardKey="retirement.fersDetails" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {visible ? (
            <>
              {/* FERS Components Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs text-muted-foreground">High-3 Average Salary</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          The average of your highest 3 consecutive years of basic pay. This is
                          typically your final years of service when your salary is highest.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <SensitiveValue
                    value={`$${mockData.high3Salary.toLocaleString()}`}
                    className="text-lg font-bold text-foreground"
                    hide={isSensitiveHidden}
                  />
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs text-muted-foreground">Years of Service</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{mockData.yearsOfService}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">creditable years</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs text-muted-foreground">Pension Multiplier</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          The multiplier is 1.0% for most employees. It increases to 1.1% if you retire
                          at age 62 or older with at least 20 years of service.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-lg font-bold text-foreground">{mockData.multiplier}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">per year of service</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs text-muted-foreground">Retirement Age</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{mockData.retirementAge}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">target age</p>
                </div>
              </div>

              {/* Formula Explanation */}
              <div className="p-4 rounded-lg bg-muted/20 border border-border">
                <p className="text-sm font-medium text-foreground mb-2">FERS Pension Formula</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-mono text-xs bg-muted/50 p-2 rounded">
                    Annual Pension = High-3 Salary × Multiplier × Years of Service
                  </p>
                  <p className="mt-2">
                    <SensitiveValue
                      value={`$${mockData.high3Salary.toLocaleString()}`}
                      hide={isSensitiveHidden}
                      className="inline font-medium text-foreground"
                    />{' '}
                    × {mockData.multiplier}% × {mockData.yearsOfService} years
                  </p>
                </div>
              </div>

              {/* Estimated Pension */}
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Estimated Annual Pension</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <SensitiveValue
                        value={`$${estimatedMonthlyPension.toLocaleString()}`}
                        hide={isSensitiveHidden}
                        className="inline"
                      />
                      /month before taxes
                    </p>
                  </div>
                  <SensitiveValue
                    value={`$${estimatedAnnualPension.toLocaleString()}`}
                    className="text-2xl font-bold text-accent"
                    hide={isSensitiveHidden}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                * This is an estimate based on the standard FERS formula. Actual pension may vary based
                on service computation dates, special provisions, and survivor benefit elections.
              </p>
            </>
          ) : (
            <CardHiddenPlaceholder title={title} cardKey="retirement.fersDetails" />
          )}
        </CardContent>
      </TooltipProvider>
    </Card>
  );
}
