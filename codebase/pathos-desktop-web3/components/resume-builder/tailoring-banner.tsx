/**
 * ============================================================================
 * TAILORING BANNER COMPONENT (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Collapsible banner that appears when tailoring mode is active.
 * Shows target job info and "View job details" button that reuses Job Details slide-over.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used in Resume Builder workspace
 * - Integrates with JobDetailsSlideOver component
 * - Must not conflict with existing Job Details slide-over flow
 * - Low-profile, not noisy
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { TargetJob } from '@/store/resumeBuilderStore';

interface TailoringBannerProps {
  targetJob: TargetJob;
  onViewJobDetails: () => void;
  onClearTailoring: () => void;
}

/**
 * Tailoring Banner Component
 *
 * PURPOSE:
 * Displays a collapsible banner when tailoring mode is active.
 * Shows "Tailoring for: [Job]" with "View job details" button.
 */
export function TailoringBanner(props: TailoringBannerProps) {
  const targetJob = props.targetJob;
  const onViewJobDetails = props.onViewJobDetails;
  const onClearTailoring = props.onClearTailoring;

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Card className="border-accent/30 bg-accent/10">
      <Collapsible open={!isCollapsed} onOpenChange={function (open) {
        setIsCollapsed(!open);
      }}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-0">
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <span className="text-sm font-medium">
              Tailoring for: <span className="text-accent">{targetJob.title}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {targetJob.series} {targetJob.grade} • {targetJob.agency}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onViewJobDetails} className="gap-1">
              <ExternalLink className="h-3 w-3" />
              View job details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={onClearTailoring}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Location:</strong> {targetJob.location}
              </p>
              {targetJob.matchPercent !== undefined && (
                <p>
                  <strong>Match:</strong> {targetJob.matchPercent}% (Skills:{' '}
                  {targetJob.skillsMatch}%, Keywords: {targetJob.keywordMatch}%)
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}





