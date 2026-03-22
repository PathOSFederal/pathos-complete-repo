/**
 * ============================================================================
 * BENEFITS SWITCHING CARD (Day 13 - Job Seeker Dashboard First-Principles Refactor)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component displays a "Benefits Gain/Loss if Switching" card for job seekers
 * that frames the trade-offs of switching from private sector to federal employment.
 * It's designed to be high-signal and scenario-driven, not a deep retirement model.
 *
 * Day 13 Follow-up: This card is now the PRIMARY benefits information for job seekers.
 * The LeaveBenefitsCard's "Federal Benefits Overview" content has been consolidated
 * here to avoid duplication. A "Details" link routes to /explore/benefits for users
 * who want deeper information about federal benefits.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * This card is the third section on the Job Seeker dashboard, appearing after
 * MarketPositionCard and NextBestMovesCard. It provides a qualitative overview
 * of federal benefits vs. private sector trade-offs.
 *
 * KEY DESIGN PRINCIPLES:
 * 1. HIGH SIGNAL: Focus on the most impactful differences
 * 2. SCENARIO-DRIVEN: Frame benefits in terms of user's likely situation
 * 3. BALANCED VIEW: Show both gains AND trade-offs honestly
 * 4. NO DEEP MODELING: This is Tier 1, not a retirement calculator
 *
 * CONTENT STRATEGY:
 * The card presents two sections:
 *
 * WHAT YOU GAIN (switching to federal):
 * - Job stability and security (shutdown pay, tenure protections)
 * - FEHB (Federal Employees Health Benefits) - premium subsidies
 * - FERS retirement system (pension + TSP match)
 * - Locality pay adjustments (32%+ in DC metro)
 * - Structured career progression (GS step increases)
 * - Work-life balance (telework, leave policies)
 *
 * WHAT YOU MIGHT GIVE UP:
 * - Faster compensation growth in private sector
 * - Stock options / equity compensation
 * - More flexibility in role/project choices
 * - Bureaucratic processes can be slower
 * - Geographic constraints for some positions
 *
 * PRIVACY INTEGRATION:
 * - Respects global privacy toggle
 * - Has per-card visibility toggle
 * - Visibility persists to localStorage
 */

'use client';

/**
 * TYPE-ONLY IMPORT FOR ComponentType
 * We import ComponentType directly from 'react' using a type-only import.
 * This avoids the "Cannot find namespace 'React'" TypeScript error that
 * occurs when using React.ComponentType without a full React import.
 * Type-only imports are erased at compile time and add no runtime cost.
 */
import type { ComponentType } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  CheckCircle,
  XCircle,
  Info,
  Shield,
  Heart,
  Banknote,
  TrendingUp,
  Building,
  Clock,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * BenefitItem represents a single benefit or trade-off point.
 */
interface BenefitItem {
  /** Unique identifier for React key */
  id: string;
  /** Short title for the benefit/trade-off */
  title: string;
  /** Brief description explaining the point */
  description: string;
  /**
   * Icon component from lucide-react.
   * Uses ComponentType from the type-only import at the top of this file
   * instead of React.ComponentType to avoid namespace resolution issues.
   */
  icon: ComponentType<{ className?: string }>;
}

/**
 * ============================================================================
 * STATIC DATA
 * ============================================================================
 * Benefits and trade-offs are defined statically since they don't depend on
 * user data. In future versions, we could personalize based on user's
 * priorities in their profile.
 */

/**
 * What You Gain by switching to federal employment.
 * These are the primary advantages of federal service.
 */
const GAINS: BenefitItem[] = [
  {
    id: 'stability',
    title: 'Job Stability',
    description: 'Strong tenure protections, shutdown pay guarantees, and consistent employment.',
    icon: Shield,
  },
  {
    id: 'fehb',
    title: 'FEHB Health Coverage',
    description: 'Government subsidizes 70-75% of premiums. Wide plan choices.',
    icon: Heart,
  },
  {
    id: 'retirement',
    title: 'FERS Retirement',
    description: 'Pension + TSP with 5% matching. Builds wealth for retirement.',
    icon: Banknote,
  },
  {
    id: 'locality',
    title: 'Locality Pay',
    description: 'Automatic locality adjustments (e.g., +32% in DC metro).',
    icon: MapPin,
  },
  {
    id: 'progression',
    title: 'Structured Progression',
    description: 'Automatic step increases (~3% annually) within grade.',
    icon: TrendingUp,
  },
  {
    id: 'balance',
    title: 'Work-Life Balance',
    description: 'Generous leave (13-26 days/year), telework options, holidays.',
    icon: Clock,
  },
];

/**
 * What You Might Give Up when switching from private sector.
 * These are honest trade-offs to consider.
 */
const TRADEOFFS: BenefitItem[] = [
  {
    id: 'comp-growth',
    title: 'Faster Comp Growth',
    description: 'Private sector may offer quicker salary jumps, especially in tech.',
    icon: TrendingUp,
  },
  {
    id: 'equity',
    title: 'Stock / Equity',
    description: 'No stock options or RSUs. Comp is salary + benefits only.',
    icon: Banknote,
  },
  {
    id: 'bureaucracy',
    title: 'Bureaucratic Pace',
    description: 'Processes can be slower. Approvals take longer than private sector.',
    icon: Building,
  },
  {
    id: 'flexibility',
    title: 'Role Flexibility',
    description: 'Positions are more structured. Less freedom to pivot quickly.',
    icon: Briefcase,
  },
  {
    id: 'location',
    title: 'Location Constraints',
    description: 'Some roles require specific duty stations. Remote options vary.',
    icon: MapPin,
  },
];

/**
 * ============================================================================
 * BENEFIT ITEM COMPONENT
 * ============================================================================
 * Renders a single benefit or trade-off item.
 */
interface BenefitItemRowProps {
  item: BenefitItem;
  type: 'gain' | 'tradeoff';
}

function BenefitItemRow(props: BenefitItemRowProps) {
  const item = props.item;
  const type = props.type;
  const IconComponent = item.icon;

  // Color styling based on type
  const iconBgClass = type === 'gain' ? 'bg-green-500/20' : 'bg-yellow-500/20';
  const iconColorClass = type === 'gain' ? 'text-green-400' : 'text-yellow-400';

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Icon */}
      <div className={'shrink-0 w-7 h-7 rounded-full flex items-center justify-center ' + iconBgClass}>
        <IconComponent className={'w-3.5 h-3.5 ' + iconColorClass} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * COLLAPSIBLE SECTION COMPONENT
 * ============================================================================
 * A section that can be expanded/collapsed on mobile for progressive disclosure.
 */
interface CollapsibleSectionProps {
  title: string;
  items: BenefitItem[];
  type: 'gain' | 'tradeoff';
  defaultExpanded?: boolean;
  badge?: string;
}

function CollapsibleSection(props: CollapsibleSectionProps) {
  const title = props.title;
  const items = props.items;
  const type = props.type;
  const badge = props.badge;

  // Start expanded by default (can be collapsed on mobile)
  const defaultExpanded = props.defaultExpanded !== undefined ? props.defaultExpanded : true;
  const expandedState = useState(defaultExpanded);
  const isExpanded = expandedState[0];
  const setIsExpanded = expandedState[1];

  const headerIcon = type === 'gain' ? (
    <CheckCircle className="w-4 h-4 text-green-400" />
  ) : (
    <XCircle className="w-4 h-4 text-yellow-400" />
  );

  const headerBgClass = type === 'gain' ? 'bg-green-500/10' : 'bg-yellow-500/10';
  const headerBorderClass = type === 'gain' ? 'border-green-500/20' : 'border-yellow-500/20';

  const toggleExpanded = function () {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={'rounded-lg border ' + headerBorderClass}>
      {/* Section Header (clickable on mobile)
          type="button" is required to prevent unintended form submission if
          this card is ever embedded within a <form> element. Without it,
          the default type is "submit" which would trigger form submission. */}
      <button
        type="button"
        onClick={toggleExpanded}
        className={'w-full flex items-center justify-between p-3 rounded-t-lg ' + headerBgClass + ' hover:opacity-90 transition-opacity'}
        aria-expanded={isExpanded}
        aria-label={(isExpanded ? 'Collapse ' : 'Expand ') + title}
      >
        <div className="flex items-center gap-2">
          {headerIcon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && (
            <Badge variant="outline" className="text-xs ml-1">
              {badge}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-3 pt-1 space-y-1">
          {items.map(function (item) {
            return <BenefitItemRow key={item.id} item={item} type={type} />;
          })}
        </div>
      )}
    </div>
  );
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function BenefitsSwitchingCard() {
  // ============================================================================
  // VISIBILITY STATE
  // ============================================================================

  // Per-card visibility and global privacy state
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('jobseeker.benefitsSwitching');

  // ============================================================================
  // RENDER
  // ============================================================================

  const cardTitle = 'Benefits: Gain vs. Give Up';

  // If card is hidden via per-card visibility toggle, show placeholder
  if (!visible) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-accent" />
              {cardTitle}
            </CardTitle>
            <DashboardCardVisibilityToggle cardKey="jobseeker.benefitsSwitching" />
          </div>
        </CardHeader>
        <CardContent>
          <CardHiddenPlaceholder title={cardTitle} cardKey="jobseeker.benefitsSwitching" />
        </CardContent>
      </Card>
    );
  }

  // If global privacy is on, show simplified view
  if (isSensitiveHidden) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-accent" />
              {cardTitle}
            </CardTitle>
            <DashboardCardVisibilityToggle cardKey="jobseeker.benefitsSwitching" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Benefits comparison hidden for privacy.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Toggle global privacy to view details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      {/* Card Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-accent" />
            {cardTitle}
          </CardTitle>
          <DashboardCardVisibilityToggle cardKey="jobseeker.benefitsSwitching" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Understand the trade-offs of switching to federal employment
        </p>
      </CardHeader>

      {/* Card Content - Two Sections */}
      <CardContent className="space-y-4">
        {/* What You Gain */}
        <CollapsibleSection
          title="What You Gain"
          items={GAINS}
          type="gain"
          badge={GAINS.length + ' benefits'}
          defaultExpanded={true}
        />

        {/* What You Might Give Up */}
        <CollapsibleSection
          title="What You Might Give Up"
          items={TRADEOFFS}
          type="tradeoff"
          badge={TRADEOFFS.length + ' considerations'}
          defaultExpanded={false}
        />

        {/* Footer Note with Details Link */}
        {/* Day 13 Follow-up: Added "Details" link to route to benefits page.
            This consolidates benefits information - job seekers get the overview
            here and can click through for detailed FEHB, FERS, leave info. */}
        <div className="flex items-start justify-between gap-2 pt-3 border-t border-border">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              This is a general overview. Actual benefits vary by position, agency, and location.
            </p>
          </div>
          {/* Details link - routes to the benefits exploration page */}
          <Link
            href="/explore/benefits"
            className="shrink-0 inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
          >
            Details
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

