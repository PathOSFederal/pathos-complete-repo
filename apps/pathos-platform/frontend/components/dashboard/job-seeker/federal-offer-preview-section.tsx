/**
 * ============================================================================
 * FEDERAL OFFER PREVIEW SECTION (Day 13 Follow-up)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component renders a collapsible section containing "offer simulator" style
 * cards that were previously displayed as top-level dashboard content. Moving them
 * into this secondary collapsible section keeps the primary Job Seeker dashboard
 * focused on high-signal content (Market Position, Next Best Moves, Benefits Gain/Loss)
 * while still preserving access to detailed federal offer estimates.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         Dashboard Page                                  │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │ PRIMARY CONTENT (always visible)                                │   │
 * │  │ ┌───────────────┐ ┌───────────────┐ ┌─────────────────────────┐│   │
 * │  │ │ Market        │ │ Next Best     │ │ Benefits Gain/Loss     ││   │
 * │  │ │ Position      │ │ Moves         │ │ (Day 13)               ││   │
 * │  │ └───────────────┘ └───────────────┘ └─────────────────────────┘│   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │ SECONDARY CONTENT (this component - collapsible)                │   │
 * │  │ ┌───────────────────────────────────────────────────────────┐   │   │
 * │  │ │ Federal Offer Preview Section                             │   │   │
 * │  │ │ - Estimated Starting Salary                               │   │   │
 * │  │ │ - Career Timeline                                         │   │   │
 * │  │ │ - FEHB Plan Options                                       │   │   │
 * │  │ │ - Location Tax Comparison                                 │   │   │
 * │  │ │ - Location & COL Insights                                 │   │   │
 * │  │ └───────────────────────────────────────────────────────────┘   │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS SECTION EXISTS:
 * Job seekers need both high-level signals AND detailed offer estimates. However,
 * showing everything at once clutters the dashboard and violates the "30-second
 * value rule" (users should get primary value within 30 seconds of viewing).
 *
 * By organizing content into primary (always visible) and secondary (collapsible),
 * we achieve both goals:
 * 1. Fast time-to-value with the three primary cards
 * 2. Preserved depth for users who want to explore federal offer details
 *
 * WHY COLLAPSED ON MOBILE (30-SECOND VALUE RULE):
 * Mobile screens are small. Showing all content expanded means users must scroll
 * extensively before seeing the primary cards. Collapsing this section on mobile
 * ensures the Market Position, Next Best Moves, and Benefits Gain/Loss cards are
 * immediately visible. Users can tap to expand when they want detailed estimates.
 *
 * MOBILE-FIRST DOCTRINE:
 * This component follows the mobile-first principle:
 * - Mobile defines what exists (the same content as desktop)
 * - Desktop adds depth via expanded default state, not different content
 * - Both viewports see identical card content; only collapse state differs
 *
 * PRIVACY INTEGRATION:
 * - Respects global privacy toggle (isSensitiveHidden masks content inside cards)
 * - Has per-section visibility toggle (can hide entire section with eye button)
 * - Visibility persists to localStorage via userPreferencesStore
 *
 * COLLAPSIBLE IMPLEMENTATION:
 * Uses Radix/shadcn Collapsible primitive from @/components/ui/collapsible.
 * The collapsed/expanded state is managed locally with useState, but the
 * per-section visibility (eye toggle) is stored in userPreferencesStore.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

// Import the dashboard cards that will be displayed inside this section.
// These are the "offer simulator" style cards that show detailed federal estimates.
import { TotalCompensationCard } from '@/components/dashboard/total-compensation';
import { RetirementReadinessCard } from '@/components/dashboard/retirement-readiness';
import { FehbComparisonCard } from '@/components/dashboard/fehb-comparison';
import { TaxInsightsCard } from '@/components/dashboard/tax-insights';
import { PcsRelocationCard } from '@/components/dashboard/pcs-relocation';

/**
 * ============================================================================
 * BREAKPOINT DETECTION HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Detects whether the viewport is at desktop size (768px+) or mobile size.
 * This is used to set the default collapsed state:
 * - Mobile (< 768px): collapsed by default
 * - Desktop (>= 768px): expanded by default
 *
 * HOW IT WORKS:
 * 1. Initialize with false (mobile-first, assume mobile)
 * 2. On mount, check window.matchMedia for min-width: 768px
 * 3. Add a listener for viewport changes
 * 4. Clean up listener on unmount
 *
 * NOTE: This uses JavaScript for breakpoint detection because we need the
 * initial collapsed state before render. CSS-only solutions (like hidden classes)
 * would cause layout shift or require the section to always render expanded first.
 */
function useIsDesktop(): boolean {
  // Step 1: Initialize with false (assume mobile for SSR and initial render)
  const isDesktopState = useState(false);
  const isDesktop = isDesktopState[0];
  const setIsDesktop = isDesktopState[1];

  useEffect(function () {
    // Step 2: Guard for SSR - window is not available on server
    if (typeof window === 'undefined') {
      return;
    }

    // Step 3: Create media query for desktop breakpoint (768px, same as Tailwind md:)
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    // Step 4: Set initial value based on current viewport
    setIsDesktop(mediaQuery.matches);

    // Step 5: Create handler for viewport changes
    const handleChange = function (event: MediaQueryListEvent) {
      setIsDesktop(event.matches);
    };

    // Step 6: Add listener (use addEventListener for modern browsers)
    mediaQuery.addEventListener('change', handleChange);

    // Step 7: Cleanup listener on unmount
    return function () {
      mediaQuery.removeEventListener('change', handleChange);
    };
    // Note: setIsDesktop is stable (from useState), but we include it
    // in the dependency array to satisfy the exhaustive-deps rule.
  }, [setIsDesktop]);

  return isDesktop;
}

/**
 * ============================================================================
 * MAIN COMPONENT: FederalOfferPreviewSection
 * ============================================================================
 *
 * PURPOSE:
 * Renders a collapsible section containing the "offer simulator" style cards.
 * This section appears below the primary Job Seeker dashboard cards.
 *
 * HOW IT WORKS:
 * 1. Read visibility state from userPreferencesStore (per-section visibility)
 * 2. Detect if we're on desktop to set default expanded state
 * 3. Manage local collapsed/expanded state with useState
 * 4. Render section header with title, subtitle, and visibility toggle
 * 5. Render CollapsibleContent with the dashboard card grid
 *
 * CONTENT INSIDE THIS SECTION (job seeker views):
 * - TotalCompensationCard: Shows "Estimated Starting Salary" with grade band selector
 * - RetirementReadinessCard: Shows "Career Timeline" with GS progression
 * - FehbComparisonCard: Shows "FEHB Plan Options" with recommended plans
 * - TaxInsightsCard: Shows "Location Tax Comparison" with state tax impact
 * - PcsRelocationCard: Shows "Location & COL Insights" with top COL matches
 *
 * NOTE: LeaveBenefitsCard is NOT included here to avoid duplication with
 * BenefitsSwitchingCard. The "Federal Benefits Overview" content from that
 * card is now consolidated into the primary BenefitsSwitchingCard.
 */
export function FederalOfferPreviewSection() {
  // ============================================================================
  // VISIBILITY STATE
  // Read from userPreferencesStore. This controls whether the entire section
  // is visible or shows a "hidden" placeholder.
  //
  // NOTE: We don't use isSensitiveHidden at the section level because the
  // individual cards inside handle their own privacy masking. The section
  // just needs to know if it should be visible at all.
  // ============================================================================

  const visibilityState = useDashboardCardVisibility('jobseeker.federalOfferPreview');
  const visible = visibilityState.visible;

  // ============================================================================
  // COLLAPSED/EXPANDED STATE
  // Uses local useState for collapsed state, but initialized based on viewport.
  // Mobile (< 768px): collapsed by default
  // Desktop (>= 768px): expanded by default
  // ============================================================================

  const isDesktop = useIsDesktop();

  // Track whether we've done initial mount setup.
  // This prevents a flash of incorrect state on first render.
  const hasMountedState = useState(false);
  const hasMounted = hasMountedState[0];
  const setHasMounted = hasMountedState[1];

  // Collapsed state: start as collapsed (mobile-first default)
  // Will be updated on mount based on isDesktop
  const openState = useState(false);
  const isOpen = openState[0];
  const setIsOpen = openState[1];

  // On mount, set the initial open state based on viewport
  useEffect(function () {
    // Only run once on mount
    if (!hasMounted) {
      // Set initial state: desktop = expanded, mobile = collapsed
      setIsOpen(isDesktop);
      setHasMounted(true);
    }
    // Note: setIsOpen and setHasMounted are stable (from useState), but we
    // include them in the dependency array to satisfy exhaustive-deps rule.
  }, [isDesktop, hasMounted, setIsOpen, setHasMounted]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const sectionTitle = 'Federal Offer Preview';
  const sectionSubtitle = 'Estimated federal offer signals based on your current goals';

  // If section is hidden via per-section visibility toggle, show placeholder
  if (!visible) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-accent" />
              {sectionTitle}
            </CardTitle>
            <DashboardCardVisibilityToggle cardKey="jobseeker.federalOfferPreview" />
          </div>
        </CardHeader>
        <CardContent>
          <CardHiddenPlaceholder title={sectionTitle} cardKey="jobseeker.federalOfferPreview" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // COLLAPSIBLE STATE MANAGEMENT
  // ============================================================================
  // The Radix Collapsible primitive handles toggling via CollapsibleTrigger.
  // We use controlled mode: open={isOpen} and onOpenChange={setIsOpen}.
  // When the user clicks the CollapsibleTrigger, Radix calls onOpenChange
  // with the new value, and we update isOpen accordingly.
  //
  // IMPORTANT: We do NOT add an onClick handler to the trigger button.
  // Doing so would cause a double-toggle: once from Radix's internal handler
  // and once from our manual onClick, resulting in no visible change.
  // ============================================================================

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border bg-card">
        {/* ================================================================== */}
        {/* SECTION HEADER                                                     */}
        {/* Contains: title, subtitle, collapse toggle, and visibility toggle  */}
        {/* CollapsibleTrigger handles click events via Radix; it calls        */}
        {/* onOpenChange which updates our isOpen state. No manual onClick.    */}
        {/* ================================================================== */}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {/* Title and collapse trigger */}
            {/* type="button" prevents form submission if this card is ever     */}
            {/* embedded in a form context. This is defensive best practice.    */}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                aria-expanded={isOpen}
                aria-label={(isOpen ? 'Collapse ' : 'Expand ') + sectionTitle}
              >
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-accent" />
                  {sectionTitle}
                </CardTitle>
                {/* Collapse indicator icon */}
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
                {/* Card count badge */}
                <Badge variant="outline" className="text-xs ml-1">
                  5 cards
                </Badge>
              </button>
            </CollapsibleTrigger>

            {/* Visibility toggle (eye icon) - separate from collapse toggle */}
            <DashboardCardVisibilityToggle cardKey="jobseeker.federalOfferPreview" />
          </div>

          {/* Subtitle - always visible even when collapsed */}
          <p className="text-xs text-muted-foreground mt-1">
            {sectionSubtitle}
          </p>
        </CardHeader>

        {/* ================================================================== */}
        {/* COLLAPSIBLE CONTENT                                                */}
        {/* Contains the grid of "offer simulator" style cards                 */}
        {/* This content is hidden when collapsed                              */}
        {/* ================================================================== */}
        <CollapsibleContent>
          <CardContent className="pt-2">
            {/* ============================================================== */}
            {/* CARDS GRID                                                      */}
            {/* Responsive grid: 1 column on mobile, 2 on sm, 3 on lg          */}
            {/* These cards internally switch to their jobseeker-view variant  */}
            {/* based on user.currentEmployee from profileStore                 */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {/* Card 1: Estimated Starting Salary */}
              {/* Shows GS grade band selector and salary range estimates */}
              <TotalCompensationCard />

              {/* Card 2: Career Timeline */}
              {/* Shows GS progression path and time-to-promotion estimates */}
              <RetirementReadinessCard />

              {/* Card 3: FEHB Plan Options */}
              {/* Shows recommended health insurance plans for target location */}
              <FehbComparisonCard />

              {/* Card 4: Location Tax Comparison */}
              {/* Shows take-home pay comparison by state tax */}
              <TaxInsightsCard />

              {/* Card 5: Location & COL Insights */}
              {/* Shows cost of living comparison for target agencies */}
              <PcsRelocationCard />

              {/* NOTE: LeaveBenefitsCard is intentionally NOT included here.
                  The "Federal Benefits Overview" content from that card has been
                  consolidated into the primary BenefitsSwitchingCard to avoid
                  duplication. Job seekers get benefits info in one place. */}
            </div>

            {/* ============================================================== */}
            {/* FOOTER NOTE                                                     */}
            {/* Explains what this section contains and how to interpret it    */}
            {/* ============================================================== */}
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
              These estimates are based on your profile settings. Actual offers vary by position, 
              agency, and location. Update your target grade and location in Profile & Settings.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
