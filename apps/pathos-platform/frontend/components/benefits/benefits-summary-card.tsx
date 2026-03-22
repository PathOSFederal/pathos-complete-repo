'use client';

import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import type { CardKey } from '@/store/userPreferencesStore';
import type { ReactNode } from 'react';

interface BenefitsSummaryCardProps {
  cardKey: CardKey;
  title: string;
  value: string;
  subtitle: string;
  tooltipContent: string;
  icon: ReactNode;
  highlighted?: boolean;
}

export function BenefitsSummaryCard({
  cardKey,
  title,
  value,
  subtitle,
  tooltipContent,
  icon,
  highlighted = false,
}: BenefitsSummaryCardProps) {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility(cardKey);

  return (
    <TooltipProvider>
      <Card
        className={`border-border bg-card hover:bg-card/80 transition-colors ${highlighted ? 'border-accent/50 bg-accent/5' : ''}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${highlighted ? 'bg-accent/20' : 'bg-muted'}`}>
                {icon}
              </div>
              <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{tooltipContent}</p>
                </TooltipContent>
              </Tooltip>
              <DashboardCardVisibilityToggle cardKey={cardKey} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {visible ? (
            <>
              <div className={`text-2xl font-bold ${highlighted ? 'text-accent' : 'text-foreground'}`}>
                <SensitiveValue value={value} hide={isSensitiveHidden} />
              </div>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </>
          ) : (
            <CardHiddenPlaceholder title={title} cardKey={cardKey} />
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
