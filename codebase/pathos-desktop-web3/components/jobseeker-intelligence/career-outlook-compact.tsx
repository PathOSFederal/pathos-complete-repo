/**
 * ============================================================================
 * CAREER OUTLOOK COMPACT - CONDENSED VERSION
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays a condensed version of the Career Outlook intelligence signals.
 * Designed for space-constrained contexts like job cards, job search panels,
 * and the Resume Builder tailoring banner.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Consumes computed outlook from lib/intelligence/jobseeker-intelligence.ts
 * - Respects global privacy toggle (hides content when privacy mode is active)
 * - Respects per-card visibility toggle (user can hide the entire strip)
 * - Used in Job Search page (on selected job panel)
 * - Used in Resume Builder tailoring mode banner
 *
 * COMPONENT STRUCTURE:
 * - Horizontal strip showing all 4 signals in compact form
 * - Each signal: icon + score/rating
 * - Optional expand button to see more detail
 * - Privacy-aware: hides values when globalHide is true
 *
 * VARIANTS:
 * - 'strip': Horizontal inline display for cards/banners
 * - 'grid': 2x2 grid layout for slightly more space
 *
 * PROPS FLOW:
 * - outlook: CareerOutlookResult from computeJobSeekerOutlook()
 * - variant: 'strip' | 'grid' layout mode
 * - isHidden: boolean from useCardVisibility or local privacy toggle
 * - globalHide: boolean from usePrivacy context
 * - onViewDetails: optional callback to open full details panel
 *
 * @version v1 - Day 10 Implementation
 * ============================================================================
 */

'use client';

import {
  TrendingUp,
  MapPin,
  Heart,
  Landmark,
  Info,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SensitiveValue } from '@/components/sensitive-value';
import type { CareerOutlookResult } from '@/lib/intelligence/jobseeker-intelligence';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Display variant for the compact component.
 *
 * 'strip' - Horizontal inline display, all 4 signals in a row
 *           Best for: job cards, narrow panels, banners
 *
 * 'grid' - 2x2 grid layout
 *          Best for: panels with slightly more vertical space
 */
export type CompactVariant = 'strip' | 'grid';

/**
 * Props for the CareerOutlookCompact component.
 *
 * @property outlook - The computed Career Outlook result from the rules engine
 * @property variant - Layout variant: 'strip' (horizontal) or 'grid' (2x2)
 * @property isHidden - Whether the component should be hidden (card visibility)
 * @property globalHide - Whether sensitive values should be masked (privacy mode)
 * @property onViewDetails - Optional callback to open full Career Outlook panel
 * @property onToggleVisibility - Optional callback when visibility toggle is clicked
 * @property showVisibilityToggle - Whether to show the visibility toggle button
 * @property showTitle - Whether to show the "Career Outlook" title
 * @property className - Optional additional CSS classes
 */
export interface CareerOutlookCompactProps {
  outlook: CareerOutlookResult | null;
  variant?: CompactVariant;
  isHidden?: boolean;
  globalHide?: boolean;
  onViewDetails?: () => void;
  onToggleVisibility?: () => void;
  showVisibilityToggle?: boolean;
  showTitle?: boolean;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determines the text color class based on signal rating.
 *
 * PURPOSE:
 * Provides visual consistency by mapping ratings to appropriate colors.
 *
 * @param rating - The signal rating or tier
 * @returns Tailwind CSS color class
 */
function getRatingColorClass(rating: string): string {
  if (rating === 'Strong' || rating === 'High' || rating === 'Good') {
    return 'text-green-400';
  }
  if (rating === 'Moderate' || rating === 'Medium') {
    return 'text-amber-400';
  }
  return 'text-muted-foreground';
}

// ============================================================================
// SIGNAL CHIP COMPONENT
// ============================================================================

/**
 * SignalChip - Compact display of a single signal.
 *
 * PURPOSE:
 * Renders a single intelligence signal in minimal space.
 * Shows icon and primary value with optional tooltip for explanation.
 *
 * @param props.icon - Lucide icon element
 * @param props.label - Signal label for tooltip
 * @param props.value - Short value to display (e.g., "72", "Strong")
 * @param props.colorClass - Tailwind color class for the value
 * @param props.tooltip - Tooltip text explaining the signal
 * @param props.globalHide - Whether to mask the value
 */
interface SignalChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass: string;
  tooltip: string;
  globalHide: boolean;
}

function SignalChip(props: SignalChipProps) {
  // Destructure props without using object spread
  const icon = props.icon;
  const label = props.label;
  const value = props.value;
  const colorClass = props.colorClass;
  const tooltip = props.tooltip;
  const globalHide = props.globalHide;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md cursor-help">
            <span className="text-muted-foreground">{icon}</span>
            <span className={'text-xs font-medium ' + colorClass}>
              <SensitiveValue value={value} masked="•••" hide={globalHide} />
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs font-medium mb-1">{label}</p>
          <p className="text-xs text-muted-foreground">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * CareerOutlookCompact - Condensed Career Outlook display.
 *
 * PURPOSE:
 * Provides a compact view of all four Career Outlook signals.
 * Designed for space-constrained UI areas where full detail isn't needed
 * but the signals should still be visible at a glance.
 *
 * USAGE CONTEXTS:
 * 1. Job Search page - shows on the selected job analysis panel
 * 2. Resume Builder - shows in the tailoring mode banner
 * 3. Could also be used on job cards if desired
 *
 * STATE MANAGEMENT:
 * - No internal state (pure display component)
 * - All state comes from props
 *
 * PRIVACY HANDLING:
 * - When isHidden is true: returns null (component is hidden)
 * - When globalHide is true: masks sensitive values but shows structure
 *
 * @example
 * // Strip variant in a banner
 * <CareerOutlookCompact
 *   outlook={computedOutlook}
 *   variant="strip"
 *   globalHide={isSensitiveHidden}
 *   onViewDetails={() => setDetailsOpen(true)}
 * />
 *
 * // Grid variant in a panel
 * <CareerOutlookCompact
 *   outlook={computedOutlook}
 *   variant="grid"
 *   showTitle={true}
 * />
 */
export function CareerOutlookCompact(props: CareerOutlookCompactProps) {
  // Destructure props with defaults (without using spread/nullish coalescing)
  const outlook = props.outlook;
  const variant = props.variant !== undefined ? props.variant : 'strip';
  const isHidden = props.isHidden !== undefined ? props.isHidden : false;
  const globalHide = props.globalHide !== undefined ? props.globalHide : false;
  const onViewDetails = props.onViewDetails;
  const onToggleVisibility = props.onToggleVisibility;
  const showVisibilityToggle =
    props.showVisibilityToggle !== undefined ? props.showVisibilityToggle : false;
  const showTitle = props.showTitle !== undefined ? props.showTitle : false;
  const className = props.className || '';

  // ============================================================================
  // RENDER: Hidden State
  // ============================================================================

  // If the component is hidden, return null or minimal placeholder
  if (isHidden) {
    if (onToggleVisibility) {
      return (
        <div className={'flex items-center gap-2 ' + className}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={onToggleVisibility}
          >
            <EyeOff className="w-3 h-3 mr-1" />
            Show Career Outlook
          </Button>
        </div>
      );
    }
    return null;
  }

  // ============================================================================
  // RENDER: Loading/Empty State
  // ============================================================================

  // If no outlook data, show loading skeleton
  if (!outlook) {
    return (
      <div className={'flex items-center gap-2 ' + className}>
        <div className="flex items-center gap-2">
          <div className="animate-pulse bg-muted rounded-md h-6 w-16"></div>
          <div className="animate-pulse bg-muted rounded-md h-6 w-16"></div>
          <div className="animate-pulse bg-muted rounded-md h-6 w-16"></div>
          <div className="animate-pulse bg-muted rounded-md h-6 w-16"></div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PREPARE SIGNAL DATA
  // ============================================================================

  // Extract tooltip texts from explanations (first explanation as summary)
  const localityTooltip =
    outlook.localityPower.explanations.length > 0
      ? outlook.localityPower.explanations[0]
      : 'Purchasing power in this location.';

  const trajectoryTooltip =
    outlook.trajectory.explanations.length > 0
      ? outlook.trajectory.explanations[0]
      : 'Promotion runway assessment.';

  const benefitsTooltip =
    outlook.benefitsSignal.explanations.length > 0
      ? outlook.benefitsSignal.explanations[0]
      : 'Federal benefits value estimate.';

  const retirementTooltip =
    outlook.retirementTier.explanations.length > 0
      ? outlook.retirementTier.explanations[0]
      : 'Long-term retirement impact.';

  // ============================================================================
  // RENDER: Strip Variant
  // ============================================================================

  if (variant === 'strip') {
    return (
      <div className={'flex items-center gap-2 flex-wrap ' + className}>
        {/* Optional title */}
        {showTitle && (
          <div className="flex items-center gap-1 mr-2">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-foreground">Career Outlook</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    v1 estimates based on job data. These signals help evaluate the opportunity.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Signal chips in a row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Locality Power */}
          <SignalChip
            icon={<MapPin className="w-3 h-3" />}
            label="Locality Power"
            value={String(outlook.localityPower.score)}
            colorClass={getRatingColorClass(outlook.localityPower.label)}
            tooltip={localityTooltip}
            globalHide={globalHide}
          />

          {/* Trajectory */}
          <SignalChip
            icon={<TrendingUp className="w-3 h-3" />}
            label="Trajectory"
            value={outlook.trajectory.rating}
            colorClass={getRatingColorClass(outlook.trajectory.rating)}
            tooltip={trajectoryTooltip}
            globalHide={globalHide}
          />

          {/* Benefits */}
          <SignalChip
            icon={<Heart className="w-3 h-3" />}
            label="Benefits"
            value={outlook.benefitsSignal.rating}
            colorClass={getRatingColorClass(outlook.benefitsSignal.rating)}
            tooltip={benefitsTooltip}
            globalHide={globalHide}
          />

          {/* Retirement */}
          <SignalChip
            icon={<Landmark className="w-3 h-3" />}
            label="Retirement"
            value={outlook.retirementTier.tier}
            colorClass={getRatingColorClass(outlook.retirementTier.tier)}
            tooltip={retirementTooltip}
            globalHide={globalHide}
          />
        </div>

        {/* View Details button */}
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-accent hover:text-accent"
            onClick={onViewDetails}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Details
          </Button>
        )}

        {/* Visibility toggle */}
        {showVisibilityToggle && onToggleVisibility && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onToggleVisibility}
            aria-label="Hide Career Outlook"
          >
            <Eye className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: Grid Variant
  // ============================================================================

  return (
    <div className={'bg-muted/20 rounded-lg p-3 ' + className}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-foreground">Career Outlook</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">
                  v1 estimates based on job data. These signals help evaluate the opportunity.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-1">
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs text-accent hover:text-accent"
              onClick={onViewDetails}
            >
              Details
            </Button>
          )}
          {showVisibilityToggle && onToggleVisibility && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={onToggleVisibility}
              aria-label="Hide Career Outlook"
            >
              <Eye className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* 2x2 Grid of signals */}
      <div className="grid grid-cols-2 gap-2">
        {/* Locality Power */}
        <div className="bg-card/50 rounded px-2 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <MapPin className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-muted-foreground">Locality</span>
          </div>
          <div className={'text-sm font-semibold ' + getRatingColorClass(outlook.localityPower.label)}>
            <SensitiveValue
              value={outlook.localityPower.score + '/100'}
              masked="••/100"
              hide={globalHide}
            />
          </div>
        </div>

        {/* Trajectory */}
        <div className="bg-card/50 rounded px-2 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-muted-foreground">Trajectory</span>
          </div>
          <div className={'text-sm font-semibold ' + getRatingColorClass(outlook.trajectory.rating)}>
            <SensitiveValue
              value={outlook.trajectory.rating}
              masked="•••"
              hide={globalHide}
            />
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-card/50 rounded px-2 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <Heart className="w-3 h-3 text-pink-400" />
            <span className="text-xs text-muted-foreground">Benefits</span>
          </div>
          <div className={'text-sm font-semibold ' + getRatingColorClass(outlook.benefitsSignal.rating)}>
            <SensitiveValue
              value={outlook.benefitsSignal.rating}
              masked="•••"
              hide={globalHide}
            />
          </div>
        </div>

        {/* Retirement */}
        <div className="bg-card/50 rounded px-2 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <Landmark className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-muted-foreground">Retirement</span>
          </div>
          <div className={'text-sm font-semibold ' + getRatingColorClass(outlook.retirementTier.tier)}>
            <SensitiveValue
              value={outlook.retirementTier.tier + ' Impact'}
              masked="•••"
              hide={globalHide}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CareerOutlookCompact;
