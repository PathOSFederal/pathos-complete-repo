'use client';
import { Shield, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

interface FehbInsightsCardProps {
  onPriorityChange: (priority: string) => void;
  priority: string;
}

const planArchetypes = [
  {
    id: 'lower-premium',
    name: 'Economy PPO',
    type: 'PPO',
    premiumDiff: '-$65/mo',
    riskLevel: 'Medium',
    tags: ['Lower premiums', 'Broader network'],
  },
  {
    id: 'lower-risk',
    name: 'Premium HMO',
    type: 'HMO',
    premiumDiff: '+$45/mo',
    riskLevel: 'Low',
    tags: ['Lower risk', 'Lower copays'],
  },
  {
    id: 'balanced',
    name: 'Standard HDHP',
    type: 'HDHP',
    premiumDiff: '-$120/mo',
    riskLevel: 'Medium-High',
    tags: ['HSA eligible', 'Lower premiums'],
  },
];

export function FehbInsightsCard({
  onPriorityChange,
  priority,
}: FehbInsightsCardProps) {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('benefits.fehbInsights');
  const title = 'FEHB Health Benefits Insights';

  const getHighlightedPlan = () => {
    switch (priority) {
      case 'lower-premium':
        return 'lower-premium';
      case 'lower-risk':
        return 'lower-risk';
      default:
        return 'balanced';
    }
  };

  const highlightedPlanId = getHighlightedPlan();

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your current coverage and plan exploration
              </p>
            </div>
          </div>
          <DashboardCardVisibilityToggle cardKey="benefits.fehbInsights" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {visible ? (
          <>
            {/* Current Plan Summary */}
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Current Plan: BCBS Standard</p>
                  <p className="text-xs text-muted-foreground">
                    Blue Cross Blue Shield - Self + Family
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Coverage Type</p>
                  <p className="text-sm font-semibold">Self + Family</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Plan Type</p>
                  <p className="text-sm font-semibold">PPO</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Annual Premiums</p>
                  <SensitiveValue
                    value="$5,400"
                    className="text-sm font-semibold"
                    hide={isSensitiveHidden}
                  />
                </div>
              </div>
            </div>

            {/* Cost & Risk Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <TooltipProvider>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-muted-foreground">Est. Annual Premiums (Employee)</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Your estimated annual share of FEHB premiums based on your current plan
                          selection.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <SensitiveValue value="$5,400" className="text-xl font-bold" hide={isSensitiveHidden} />
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <TooltipProvider>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-muted-foreground">Out-of-Pocket Risk Tier</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          An estimate of your potential out-of-pocket costs based on plan deductibles,
                          copays, and max limits.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <p className="text-xl font-bold text-amber-500">Medium</p>
              </div>
            </div>

            {/* Plan Comparison Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Plan Comparison Preview</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Priority:</span>
                  <Select value={priority} onValueChange={onPriorityChange}>
                    <SelectTrigger className="h-7 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="lower-premium">Lower Premium</SelectItem>
                      <SelectItem value="lower-risk">Lower Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                {planArchetypes.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      plan.id === highlightedPlanId
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{plan.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            plan.premiumDiff.startsWith('-')
                              ? 'text-green-400 border-green-400/30'
                              : 'text-amber-400 border-amber-400/30'
                          }
                        >
                          {plan.premiumDiff}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Risk: {plan.riskLevel}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {plan.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              * All values are estimates for comparison purposes only. Actual costs may vary based on
              usage and plan details.
            </p>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="benefits.fehbInsights" />
        )}
      </CardContent>
    </Card>
  );
}
