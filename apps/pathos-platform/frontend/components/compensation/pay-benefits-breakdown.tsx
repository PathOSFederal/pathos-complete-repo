'use client';

import { Card, CardContent } from '@/components/ui/card';
import { SensitiveValue } from '@/components/sensitive-value';
import { MetricInfoPopover } from './metric-info-popover';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

interface PayBreakdownItem {
  label: string;
  value: number;
  percentage: number;
  description?: string;
}

interface BenefitItem {
  label: string;
  value: number;
  description: string;
  tooltip: { title: string; description: string; details?: string };
}

interface PayBenefitsBreakdownProps {
  payBreakdown: PayBreakdownItem[];
  benefits: BenefitItem[];
  totalPay: number;
}

export function PayBenefitsBreakdown({
  payBreakdown,
  benefits,
  totalPay,
}: PayBenefitsBreakdownProps) {
  const payBreakdownVis = useDashboardCardVisibility('compensation.payBreakdown');
  const benefitsVis = useDashboardCardVisibility('compensation.benefitsOverview');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left: Pay Breakdown */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Pay Breakdown</h3>
              <DashboardCardVisibilityToggle cardKey="compensation.payBreakdown" />
            </div>
            {payBreakdownVis.visible ? (
              <div className="space-y-3">
                {payBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-secondary/30"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.percentage.toFixed(1)}% of total
                      </span>
                    </div>
                    <span className="text-sm font-bold">
                      <SensitiveValue
                        value={formatCurrency(item.value)}
                        hide={payBreakdownVis.isSensitiveHidden}
                      />
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Total Annual Pay</span>
                    <span className="text-lg font-bold text-accent">
                      <SensitiveValue value={formatCurrency(totalPay)} hide={payBreakdownVis.isSensitiveHidden} />
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <CardHiddenPlaceholder title="Pay Breakdown" cardKey="compensation.payBreakdown" />
            )}
          </div>

          {/* Right: Benefits Overview */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Benefits Overview</h3>
              <DashboardCardVisibilityToggle cardKey="compensation.benefitsOverview" />
            </div>
            {benefitsVis.visible ? (
              <div className="space-y-3">
                {benefits.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20"
                  >
                    <div className="flex flex-col flex-1 mr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{item.label}</span>
                        <MetricInfoPopover
                          title={item.tooltip.title}
                          description={item.tooltip.description}
                          details={item.tooltip.details}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                    <span className="text-sm font-bold text-accent">
                      <SensitiveValue value={formatCurrency(item.value)} hide={benefitsVis.isSensitiveHidden} />
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Estimated Benefits Value</span>
                    <span className="text-lg font-bold text-green-500">
                      <SensitiveValue
                        value={formatCurrency(benefits.reduce((sum, b) => sum + b.value, 0))}
                        hide={benefitsVis.isSensitiveHidden}
                      />
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <CardHiddenPlaceholder title="Benefits Overview" cardKey="compensation.benefitsOverview" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
