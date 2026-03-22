'use client';

import { TrendingUp, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function TspSnapshotCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('benefits.tspSnapshot');
  const title = 'TSP & Retirement Snapshot';

  // Mock data
  const employeeContributionRate = 10;
  const employerMatchEstimate = 5;
  const annualSalary = 173700;
  const employeeContribution = annualSalary * (employeeContributionRate / 100);
  const employerContribution = annualSalary * (employerMatchEstimate / 100);
  const totalContribution = employeeContribution + employerContribution;

  // Retirement readiness logic (mocked)
  type ReadinessStatus = 'on-track' | 'slightly-behind' | 'needs-attention';
  const readinessStatus: ReadinessStatus = 'on-track';

  const getReadinessInfo = (status: ReadinessStatus) => {
    switch (status) {
      case 'on-track':
        return {
          label: 'On Track',
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10 border-green-500/30',
          message:
            'Based on your current contribution rate and years of service, you are on track for a comfortable retirement.',
        };
      case 'slightly-behind':
        return {
          label: 'Slightly Behind',
          icon: AlertTriangle,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10 border-amber-500/30',
          message:
            'You may want to increase contributions by 2-3% to improve your long-term retirement outlook.',
        };
      case 'needs-attention':
        return {
          label: 'Needs Attention',
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10 border-red-500/30',
          message:
            'Consider increasing your TSP contribution significantly to meet your retirement goals.',
        };
      default:
        return {
          label: 'Unknown',
          icon: AlertCircle,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/30',
          message: '',
        };
    }
  };

  const readiness = getReadinessInfo(readinessStatus);
  const ReadinessIcon = readiness.icon;

  return (
    <Card className="border-border bg-card">
      <TooltipProvider>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your contribution summary and readiness indicator
                </p>
              </div>
            </div>
            <DashboardCardVisibilityToggle cardKey="benefits.tspSnapshot" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {visible ? (
            <>
              {/* TSP Contribution Snapshot */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">TSP Contribution Snapshot</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        The federal government matches your TSP contributions up to 5% of your salary:
                        1% automatic + 4% matching.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Your Rate</p>
                    <p className="text-xl font-bold">{employeeContributionRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">of salary</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Employer Match</p>
                    <p className="text-xl font-bold">{employerMatchEstimate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">est. match</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <p className="text-xs text-muted-foreground mb-1">Total Annual</p>
                    <SensitiveValue
                      value={`$${totalContribution.toLocaleString()}`}
                      className="text-xl font-bold text-accent"
                      hide={isSensitiveHidden}
                    />
                    <p className="text-xs text-muted-foreground mt-1">combined</p>
                  </div>
                </div>

                {/* Contribution Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Contribution Breakdown</span>
                    <span>
                      <SensitiveValue
                        value={`$${totalContribution.toLocaleString()}`}
                        hide={isSensitiveHidden}
                        className="inline"
                      />{' '}
                      / year
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-4 overflow-hidden">
                    <div className="h-full flex">
                      <div
                        className="bg-accent h-full"
                        style={{
                          width: `${(employeeContributionRate / (employeeContributionRate + employerMatchEstimate)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-secondary h-full"
                        style={{
                          width: `${(employerMatchEstimate / (employeeContributionRate + employerMatchEstimate)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-accent" />
                      <span className="text-muted-foreground">
                        Employee:{' '}
                        <SensitiveValue
                          value={`$${employeeContribution.toLocaleString()}`}
                          hide={isSensitiveHidden}
                          className="inline font-medium text-foreground"
                        />
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-secondary" />
                      <span className="text-muted-foreground">
                        Employer:{' '}
                        <SensitiveValue
                          value={`$${employerContribution.toLocaleString()}`}
                          hide={isSensitiveHidden}
                          className="inline font-medium text-foreground"
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Retirement Readiness Glimpse */}
              <div className={`p-4 rounded-lg border ${readiness.bgColor}`}>
                <div className="flex items-start gap-3">
                  <ReadinessIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${readiness.color}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-semibold ${readiness.color}`}>
                        Retirement Readiness: {readiness.label}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            This is a simplified estimate based on your current contribution rate and
                            general federal retirement guidelines. It is not financial advice.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">{readiness.message}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                * All values are estimates and not official financial advice. Consult a financial
                advisor for personalized guidance.
              </p>
            </>
          ) : (
            <CardHiddenPlaceholder title={title} cardKey="benefits.tspSnapshot" />
          )}
        </CardContent>
      </TooltipProvider>
    </Card>
  );
}
