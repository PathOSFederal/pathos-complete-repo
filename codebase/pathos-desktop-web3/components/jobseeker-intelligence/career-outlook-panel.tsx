/**
 * ============================================================================
 * CAREER OUTLOOK PANEL - FULL VERSION
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays the complete Career Outlook intelligence signals in an expanded
 * panel format. Used in the Job Details slide-over where users want full
 * detail on all four intelligence signals.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Consumes computed outlook from lib/intelligence/jobseeker-intelligence.ts
 * - Respects global privacy toggle (hides content when privacy mode is active)
 * - Respects per-card visibility toggle (user can hide the entire panel)
 * - Used in Job Details slide-over (primary placement)
 *
 * COMPONENT STRUCTURE:
 * - Header with title and info tooltip
 * - Four signal sections (Locality Power, Trajectory, Benefits, Retirement)
 * - Each section has: label, value, explanations, method disclosure
 * - Privacy-aware: hides sensitive values when globalHide is true
 *
 * PROPS FLOW:
 * - outlook: CareerOutlookResult from computeJobSeekerOutlook()
 * - isHidden: boolean from useCardVisibility or local privacy toggle
 * - globalHide: boolean from usePrivacy context
 * - onToggleVisibility: optional callback for visibility toggle button
 *
 * @version v1 - Day 10 Implementation
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import {
  TrendingUp,
  MapPin,
  Heart,
  Landmark,
  Info,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SensitiveValue } from '@/components/sensitive-value';
import type { CareerOutlookResult } from '@/lib/intelligence/jobseeker-intelligence';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Props for the CareerOutlookPanel component.
 *
 * @property outlook - The computed Career Outlook result from the rules engine
 * @property isHidden - Whether the card content should be hidden (card visibility toggle)
 * @property globalHide - Whether sensitive values should be masked (global privacy mode)
 * @property onToggleVisibility - Optional callback when visibility toggle is clicked
 * @property showVisibilityToggle - Whether to show the visibility toggle button
 * @property className - Optional additional CSS classes
 */
export interface CareerOutlookPanelProps {
  outlook: CareerOutlookResult | null;
  isHidden: boolean;
  globalHide: boolean;
  onToggleVisibility?: () => void;
  showVisibilityToggle?: boolean;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * SignalCard component - renders a single intelligence signal.
 *
 * PURPOSE:
 * Provides consistent styling and structure for each of the four signals.
 * Includes the signal icon, value, explanations, and method disclosure.
 *
 * @param props.icon - Lucide icon component
 * @param props.label - Signal label (e.g., "Locality Power")
 * @param props.value - Primary value to display
 * @param props.valueBadgeVariant - Badge color variant for the value
 * @param props.explanations - Array of explanation strings
 * @param props.methodNote - Disclosure about estimation method
 * @param props.globalHide - Whether to mask sensitive values
 */
interface SignalCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueBadgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  explanations: string[];
  methodNote: string;
  globalHide: boolean;
  accentColor?: string;
}

function SignalCard(props: SignalCardProps) {
  // Destructure props without using object spread
  const icon = props.icon;
  const label = props.label;
  const value = props.value;
  const valueBadgeVariant = props.valueBadgeVariant;
  const explanations = props.explanations;
  const methodNote = props.methodNote;
  const globalHide = props.globalHide;
  const accentColor = props.accentColor || 'text-accent';

  // State for method note expansion
  const [isMethodOpen, setIsMethodOpen] = useState(false);

  return (
    <div className="bg-muted/30 rounded-lg p-3 lg:p-4">
      {/* Signal Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={accentColor}>{icon}</div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <Badge variant={valueBadgeVariant} className="text-xs shrink-0">
          <SensitiveValue value={value} masked="•••" hide={globalHide} />
        </Badge>
      </div>

      {/* Explanations */}
      <div className="space-y-1 mb-2">
        {explanations.map(function (explanation, index) {
          return (
            <p key={index} className="text-xs text-muted-foreground">
              {explanation}
            </p>
          );
        })}
      </div>

      {/* Method Disclosure */}
      <Collapsible open={isMethodOpen} onOpenChange={setIsMethodOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="w-3 h-3" />
            <span>How this is estimated (v1)</span>
            {isMethodOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="text-xs text-muted-foreground mt-2 pl-4 border-l-2 border-muted">
            {methodNote}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Determines the badge variant based on signal rating.
 *
 * PURPOSE:
 * Provides visual consistency by mapping ratings to appropriate colors.
 * Strong = accent color, Moderate = secondary, Limited/Minimal = outline
 *
 * @param rating - The signal rating (Strong, Moderate, Limited, Minimal)
 * @returns Badge variant string
 */
function getBadgeVariant(
  rating: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (rating === 'Strong' || rating === 'High') {
    return 'default';
  }
  if (rating === 'Moderate' || rating === 'Medium' || rating === 'Good') {
    return 'secondary';
  }
  return 'outline';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * CareerOutlookPanel - Full Career Outlook display component.
 *
 * PURPOSE:
 * Renders all four Career Outlook signals in a detailed panel format.
 * Designed for the Job Details slide-over where space allows full detail.
 *
 * STATE MANAGEMENT:
 * - No internal state for data (data comes from props)
 * - Method disclosure sections have local expand/collapse state
 *
 * PRIVACY HANDLING:
 * - When isHidden is true: shows placeholder with "Show" button
 * - When globalHide is true: masks sensitive values but shows structure
 *
 * @example
 * <CareerOutlookPanel
 *   outlook={computedOutlook}
 *   isHidden={false}
 *   globalHide={false}
 *   showVisibilityToggle={true}
 *   onToggleVisibility={() => setVisible(!visible)}
 * />
 */
export function CareerOutlookPanel(props: CareerOutlookPanelProps) {
  // Destructure props without using object spread
  const outlook = props.outlook;
  const isHidden = props.isHidden;
  const globalHide = props.globalHide;
  const onToggleVisibility = props.onToggleVisibility;
  const showVisibilityToggle =
    props.showVisibilityToggle !== undefined ? props.showVisibilityToggle : true;
  const className = props.className || '';

  // ============================================================================
  // RENDER: Hidden State
  // ============================================================================

  // If the card is hidden (per-card visibility toggle), show placeholder
  if (isHidden) {
    return (
      <Card className={'border-border ' + className}>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-3">Career Outlook panel is hidden.</p>
            {onToggleVisibility && (
              <Button variant="outline" size="sm" onClick={onToggleVisibility}>
                Show Career Outlook
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: Loading/Empty State
  // ============================================================================

  // If no outlook data is available, show loading/empty state
  if (!outlook) {
    return (
      <Card className={'border-border ' + className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Career Outlook
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg"></div>
            <div className="h-16 bg-muted rounded-lg"></div>
            <div className="h-16 bg-muted rounded-lg"></div>
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: Full Content
  // ============================================================================

  return (
    <Card className={'border-border ' + className}>
      {/* Panel Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Career Outlook
            {/* Info tooltip explaining what this panel shows */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="w-3.5 h-3.5" />
                    <span className="sr-only">About Career Outlook</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">
                    Career Outlook provides intelligence signals to help you evaluate
                    this opportunity. These are v1 estimates using rules-based analysis.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>

          {/* Visibility toggle button */}
          {showVisibilityToggle && onToggleVisibility && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleVisibility}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              aria-label="Hide Career Outlook"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Overall summary */}
        <p className="text-xs text-muted-foreground mt-1">{outlook.overallSummary}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Signal 1: Locality Power Score */}
        <SignalCard
          icon={<MapPin className="w-4 h-4" />}
          label="Locality Power"
          value={outlook.localityPower.score + '/100 · ' + outlook.localityPower.label}
          valueBadgeVariant={getBadgeVariant(outlook.localityPower.label)}
          explanations={outlook.localityPower.explanations}
          methodNote={outlook.localityPower.methodNote}
          globalHide={globalHide}
          accentColor="text-blue-400"
        />

        {/* Signal 2: Career Trajectory Preview */}
        <SignalCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Career Trajectory"
          value={outlook.trajectory.rating + ' · ' + outlook.trajectory.yearsToNextPromotion + ' yrs'}
          valueBadgeVariant={getBadgeVariant(outlook.trajectory.rating)}
          explanations={outlook.trajectory.explanations}
          methodNote={outlook.trajectory.methodNote}
          globalHide={globalHide}
          accentColor="text-green-400"
        />

        {/* Signal 3: Benefit Value Signal */}
        <SignalCard
          icon={<Heart className="w-4 h-4" />}
          label="Federal Benefits"
          value={outlook.benefitsSignal.rating + ' · ' + outlook.benefitsSignal.estimatedAnnualValue}
          valueBadgeVariant={getBadgeVariant(outlook.benefitsSignal.rating)}
          explanations={outlook.benefitsSignal.explanations}
          methodNote={outlook.benefitsSignal.methodNote}
          globalHide={globalHide}
          accentColor="text-pink-400"
        />

        {/* Signal 4: Retirement Impact Tier */}
        <SignalCard
          icon={<Landmark className="w-4 h-4" />}
          label="Retirement Impact"
          value={outlook.retirementTier.tier + ' Impact'}
          valueBadgeVariant={getBadgeVariant(outlook.retirementTier.tier)}
          explanations={outlook.retirementTier.explanations}
          methodNote={outlook.retirementTier.methodNote}
          globalHide={globalHide}
          accentColor="text-amber-400"
        />

        {/* Disclaimer footer */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            <Info className="w-3 h-3 inline mr-1" />
            v1 estimates for illustrative purposes. PathAdvisor can provide personalized analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default CareerOutlookPanel;
