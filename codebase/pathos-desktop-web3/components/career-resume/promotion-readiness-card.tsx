'use client';

import { TrendingUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

// Mock readiness data
const readinessData = {
  status: 'on-track' as 'on-track' | 'needs-attention' | 'early',
  overallScore: 72,
  checks: [
    {
      label: 'Time-in-grade requirement',
      status: 'met' as 'met' | 'almost' | 'not-met',
      detail: '1 year 8 months (52 weeks required)',
    },
    {
      label: 'Experience breadth vs target role',
      status: 'high' as 'high' | 'medium' | 'low',
      detail: 'Strong match with SYSADMIN track',
    },
    {
      label: 'Required KSAs / competencies',
      status: 'mostly-met' as 'mostly-met' | 'missing',
      detail: '4 of 5 key competencies documented',
    },
    {
      label: 'Education requirements',
      status: 'met' as 'met' | 'almost' | 'not-met',
      detail: "Bachelor's degree on file",
    },
  ],
};

const statusConfig = {
  'on-track': {
    label: 'On Track',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  'needs-attention': {
    label: 'Needs Attention',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  early: {
    label: 'Early in Grade',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
};

const checkStatusIcon = (status: string) => {
  switch (status) {
    case 'met':
    case 'high':
    case 'mostly-met':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'almost':
    case 'medium':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-red-500" />;
  }
};

export function PromotionReadinessCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('career.promotionReadiness');
  const title = 'Promotion Readiness';
  const config = statusConfig[readinessData.status];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <DashboardCardVisibilityToggle cardKey="career.promotionReadiness" />
        </div>
        {visible && (
          <p className="text-sm text-muted-foreground">
            A lightweight readiness summary for your target promotion.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            {/* Status Badge and Progress */}
            <div className="flex items-center gap-4">
              <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} border`}>
                <SensitiveValue value={config.label} hide={isSensitiveHidden} masked="Hidden" />
              </Badge>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Readiness Score</span>
                  <span className="text-sm font-medium">
                    <SensitiveValue value={`${readinessData.overallScore}%`} hide={isSensitiveHidden} masked="••%" />
                  </span>
                </div>
                <Progress value={isSensitiveHidden ? 0 : readinessData.overallScore} className="h-2" />
              </div>
            </div>

            {/* Readiness Checks */}
            <div className="space-y-2">
              {readinessData.checks.map((check, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                  {checkStatusIcon(check.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{check.label}</p>
                    <p className="text-xs text-muted-foreground">
                      <SensitiveValue value={check.detail} hide={isSensitiveHidden} masked="Details hidden while privacy mode is on" />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="career.promotionReadiness" />
        )}
      </CardContent>
    </Card>
  );
}
