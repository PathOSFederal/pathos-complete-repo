'use client';

/**
 * ============================================================================
 * CHANGE PROPOSAL CARD (Day 43 - Guidance Model)
 * ============================================================================
 *
 * FILE PURPOSE:
 * The ONLY allowed UI surface for presenting PathAdvisor resume change suggestions.
 * Enforces the non-ChatGPT behavior contract through visual design.
 *
 * ============================================================================
 * WHY THIS COMPONENT EXISTS (CRITICAL CONTRACT)
 * ============================================================================
 *
 * PathAdvisor is NOT a ChatGPT-style author.
 *
 * The problem with ChatGPT-style behavior:
 * - User asks "improve my resume"
 * - AI silently rewrites entire sections
 * - User has no visibility into WHAT changed or WHY
 * - Trust is broken because user doesn't understand or control the changes
 *
 * THIS COMPONENT ENFORCES THE GUIDANCE MODEL:
 * - WHAT changed: Shows before/after text clearly
 * - WHY it changed: Shows explicit justification (whyText)
 * - WHAT it maps to: Shows authoritative source tags (mapsTo)
 * - USER CONTROLS: Apply, Dismiss, Copy — never auto-apply
 *
 * THIS IS THE ONLY ALLOWED WAY TO PRESENT RESUME REWRITES.
 * If PathAdvisor has a suggestion, it MUST go through this component.
 * This is enforced by architecture, not developer discipline.
 *
 * ============================================================================
 * VISUAL DESIGN
 * ============================================================================
 *
 * +--------------------------------------------------+
 * | 💡 Suggested Change                              |
 * +--------------------------------------------------+
 * |                                                  |
 * | BEFORE:                                          |
 * | ┌──────────────────────────────────────────────┐ |
 * | │ Led team meetings                            │ |
 * | └──────────────────────────────────────────────┘ |
 * |                                                  |
 * | AFTER:                                           |
 * | ┌──────────────────────────────────────────────┐ |
 * | │ Led weekly meetings for 12-person team,      │ |
 * | │ reducing delays by 25%                       │ |
 * | └──────────────────────────────────────────────┘ |
 * |                                                  |
 * | WHY THIS CHANGE:                                 |
 * | Federal resumes require quantified               |
 * | accomplishments with scope and outcomes.         |
 * |                                                  |
 * | MAPS TO:                                         |
 * | [USAJOBS] [GS-14]                               |
 * |                                                  |
 * | [Copy After] [Dismiss] [Apply (disabled)]        |
 * +--------------------------------------------------+
 *
 * @version Day 43 - Guidance Model + Resume Review Workspace
 */

import React from 'react';
import { Lightbulb, Copy, X, Check, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PathAdvisorChangeProposal, ChangeProposalMapsToSource } from '@/lib/pathadvisor/changeProposals';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

/**
 * Props for ChangeProposalCard.
 *
 * WHY THESE PROPS:
 * - proposal: The change proposal data to render
 * - onApply: Optional callback when user clicks Apply (may be undefined if not wired)
 * - onDismiss: Callback when user clicks Dismiss
 * - onCopy: Optional custom copy handler (defaults to clipboard copy)
 * - className: Optional styling
 */
export interface ChangeProposalCardProps {
  /** The change proposal to render */
  proposal: PathAdvisorChangeProposal;
  /**
   * Optional callback when user clicks Apply.
   * If undefined, Apply button shows disabled with tooltip.
   */
  onApply?: (proposal: PathAdvisorChangeProposal) => void;
  /** Callback when user clicks Dismiss */
  onDismiss: (proposalId: string) => void;
  /** Optional custom copy handler (defaults to clipboard copy of afterText) */
  onCopy?: (text: string) => void;
  /** Optional additional className */
  className?: string;
}

/**
 * Gets the display label and color for a mapsTo source.
 *
 * PURPOSE:
 * Provides user-friendly labels and consistent visual styling for source badges.
 *
 * @param source - The mapsTo source type
 * @returns Object with label and variant for Badge component
 */
function getSourceBadgeConfig(source: ChangeProposalMapsToSource): {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
} {
  switch (source) {
    case 'job':
      return { label: 'Job Req', variant: 'default' };
    case 'usajobs':
      return { label: 'USAJOBS', variant: 'secondary' };
    case 'opm':
      return { label: 'OPM', variant: 'outline' };
    case 'gs-norm':
      return { label: 'GS Norm', variant: 'outline' };
    case 'other':
    default:
      return { label: 'Guidance', variant: 'outline' };
  }
}

/**
 * ChangeProposalCard - The ONLY UI surface for PathAdvisor change suggestions.
 *
 * ============================================================================
 * THIS COMPONENT ENFORCES NON-CHATGPT BEHAVIOR
 * ============================================================================
 *
 * Every resume change suggestion from PathAdvisor MUST be rendered through this
 * component. There is NO OTHER allowed way to present rewrites.
 *
 * The component ensures users always see:
 * A) WHAT changed (before/after blocks)
 * B) WHY it changed (whyText section)
 * C) WHAT it maps to (source badges)
 *
 * Users control their content through explicit actions:
 * - Copy: Always enabled — user can copy afterText
 * - Dismiss: Always enabled — user can reject suggestion
 * - Apply: Only enabled if wiring exists; disabled with tooltip otherwise
 *
 * ============================================================================
 *
 * USAGE:
 * ```tsx
 * <ChangeProposalCard
 *   proposal={proposal}
 *   onApply={handleApplyChange}  // Optional
 *   onDismiss={handleDismiss}
 * />
 * ```
 */
export function ChangeProposalCard(props: ChangeProposalCardProps) {
  const proposal = props.proposal;
  const onApply = props.onApply;
  const onDismiss = props.onDismiss;
  const onCopy = props.onCopy;
  const className = props.className;

  // Track if this card is already applied or dismissed
  const isApplied = proposal.status === 'applied';
  const isDismissed = proposal.status === 'dismissed';
  const isActedUpon = isApplied || isDismissed;

  /**
   * Handles Copy button click.
   * Copies the afterText to clipboard and shows toast confirmation.
   */
  const handleCopy = function () {
    const textToCopy = proposal.afterText;

    if (onCopy) {
      // Use custom copy handler if provided
      onCopy(textToCopy);
    } else {
      // Default: Copy to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(
          function () {
            toast({
              title: 'Copied to clipboard',
              description: 'The suggested text has been copied.',
            });
          },
          function () {
            toast({
              title: 'Copy failed',
              description: 'Unable to copy text. Please select and copy manually.',
              variant: 'destructive',
            });
          }
        );
      }
    }
  };

  /**
   * Handles Dismiss button click.
   */
  const handleDismiss = function () {
    onDismiss(proposal.id);
  };

  /**
   * Handles Apply button click.
   * Only called if onApply is defined (button is disabled otherwise).
   */
  const handleApply = function () {
    if (onApply) {
      onApply(proposal);
    }
  };

  // Determine if Apply is available
  const canApply = typeof onApply === 'function';

  return (
    <Card
      className={cn(
        'border-accent/30',
        isActedUpon && 'opacity-60',
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-accent" />
          <span>Suggested Change</span>
          {isApplied && (
            <Badge variant="secondary" className="text-xs ml-auto">
              <Check className="w-3 h-3 mr-1" />
              Applied
            </Badge>
          )}
          {isDismissed && (
            <Badge variant="outline" className="text-xs ml-auto text-muted-foreground">
              Dismissed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ================================================================
            A) WHAT CHANGED: Before/After blocks
            ================================================================
            This is the core of the non-ChatGPT contract.
            Users MUST see before/after to understand the change.
        ================================================================ */}
        <div className="space-y-3">
          {/* Before block */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">
              Before
            </p>
            <div className="bg-muted/30 border border-muted rounded-md p-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {proposal.beforeText}
              </p>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-accent rotate-90" />
          </div>

          {/* After block */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">
              After
            </p>
            <div className="bg-accent/10 border border-accent/30 rounded-md p-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {proposal.afterText}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================
            B) WHY THIS CHANGE: Explicit justification
            ================================================================
            This is critical for trust. Users need to understand WHY
            PathAdvisor is suggesting this change. Without this,
            it's just another AI making arbitrary edits.
        ================================================================ */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">
            Why This Change
          </p>
          <p className="text-sm text-muted-foreground">
            {proposal.whyText}
          </p>
        </div>

        {/* ================================================================
            C) MAPS TO: Authoritative source badges
            ================================================================
            Shows what federal standards or requirements this change aligns with.
            This builds trust by connecting to authoritative sources.
        ================================================================ */}
        {proposal.mapsTo.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">
              Maps To
            </p>
            <div className="flex flex-wrap gap-1.5">
              {proposal.mapsTo.map(function (mapping, index) {
                const config = getSourceBadgeConfig(mapping.source);
                return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant={config.variant}
                          className="text-xs cursor-help"
                        >
                          {config.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">{mapping.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================
            ACTIONS: Copy, Dismiss, Apply
            ================================================================
            User controls their content through explicit actions.
            - Copy: Always enabled
            - Dismiss: Always enabled
            - Apply: Disabled with tooltip if not wired
            
            CRITICAL CONTRACT:
            Changes are NEVER applied automatically.
            The "Apply coming soon" tooltip reinforces this.
        ================================================================ */}
        {!isActedUpon && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {/* Copy button - always enabled */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>

            {/* Dismiss button - always enabled */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
              Dismiss
            </Button>

            {/* Apply button - enabled if wired, disabled with tooltip otherwise */}
            <div className="ml-auto">
              {canApply ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApply}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Apply
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        disabled
                        className="gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Apply
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Apply coming soon — changes are never applied automatically
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
