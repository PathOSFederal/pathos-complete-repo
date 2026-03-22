/**
 * ============================================================================
 * COACH SESSION PANEL (Day 35 - PathAdvisor-First Dashboard)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component wraps PathAdvisorPanel for the dashboard context, providing
 * a constrained-height PathAdvisor session experience. PathAdvisor is now
 * the center of the dashboard experience, with cards as supporting context.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * This is the PRIMARY panel in the Job Seeker dashboard layout:
 * - Left column (desktop): CoachSessionPanel (PathAdvisor session)
 * - Right column (desktop): MissionBoardV1 + EvidenceDrawerV1
 * - Full width (mobile): CoachSessionPanel, Mission Board becomes compact tabs
 *
 * KEY FEATURES:
 * - Title: "PathAdvisor" (replaces "Your Plan")
 * - Chat history area scrolls (overflow-y-auto)
 * - Input box visible immediately on first load (no scrolling needed)
 * - Constrained height on desktop (max-h-[calc(100vh-220px)])
 * - Input area pinned/sticky at bottom inside the panel
 * - Quick replies and suggested prompts preserved
 *
 * HEIGHT CONSTRAINTS:
 * - Desktop: max-h-[calc(100vh-220px)] to prevent panel from pushing input off-screen
 * - Chat history uses overflow-y-auto for scrolling
 * - Input area is sticky/pinned at bottom
 *
 * DESIGN PRINCIPLES:
 * - PathAdvisor-first experience
 * - Intimate and guided
 * - Cards are supporting context, not primary
 * - Real, authentic, friendly tone
 */

'use client';

import { PathAdvisorPanel } from '@/components/path-advisor-panel';
import { OnboardingPathAdvisorConversation } from './OnboardingPathAdvisorConversation';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * EvidenceCardType represents the different evidence cards that can be shown
 * in the Evidence Drawer when a chip is clicked.
 */
export type EvidenceCardType = 'snapshot' | 'blockers' | 'focus' | 'moves';

/**
 * ============================================================================
 * PROPS INTERFACE
 * ============================================================================
 */

interface CoachSessionPanelProps {
  /**
   * Whether the evidence drawer is currently open.
   * Used to highlight evidence chips when drawer is open.
   */
  evidenceOpen: boolean;
  /**
   * The currently selected evidence card type.
   * Used to highlight the active evidence chip.
   */
  evidenceCard: EvidenceCardType | null;
  /**
   * Callback when an evidence chip is clicked.
   * Should open the evidence drawer and select the appropriate card.
   */
  onEvidenceChipClick: (cardType: EvidenceCardType) => void;
  /**
   * Whether onboarding mode is currently active.
   * When true, shows onboarding conversation instead of normal PathAdvisor.
   */
  isOnboardingMode?: boolean;
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 *
 * DAY 35 CHANGE:
 * Replaced static "Your Plan" panel with actual PathAdvisorPanel component.
 * PathAdvisor is now the center of the dashboard experience.
 *
 * HEIGHT CONSTRAINTS:
 * - Desktop: max-h-[calc(100vh-220px)] prevents panel from pushing input off-screen
 * - Chat history area uses overflow-y-auto for scrolling
 * - Input area is sticky/pinned at bottom inside the panel
 */

export function CoachSessionPanel(props: CoachSessionPanelProps) {
  // Props are kept for backward compatibility but not used directly
  // PathAdvisorPanel manages its own state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _evidenceOpen = props.evidenceOpen;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _evidenceCard = props.evidenceCard;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _onEvidenceChipClick = props.onEvidenceChipClick;
  const isOnboardingMode = props.isOnboardingMode === true;

  // ============================================================================
  // ONBOARDING MODE (Day 36)
  // When onboarding mode is active, show onboarding conversation instead of
  // normal PathAdvisor panel.
  // ============================================================================
  if (isOnboardingMode) {
    return (
      <div className={cn('flex flex-col h-full max-h-[calc(100vh-220px)]')}>
        {/* Day 36: PathAdvisor presence - thin accent border/glow around panel */}
        {/* This provides subtle visual emphasis without an avatar */}
        {/* Note: Using border-accent/30 instead of rgba(var(--accent)) for compatibility */}
        {/* data-tour anchors are used by GuidedTourOverlay for stable spotlight targeting */}
        {/* Single anchor on the panel container (not duplicated across branches) */}
        <div
          data-tour="pathadvisor-panel"
          className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 bg-card rounded-lg border-2 border-accent/30"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>PathAdvisor</span>
            {/* Small accent glyph indicator for presence */}
            <span className="text-accent text-xs">●</span>
          </h2>
          <OnboardingPathAdvisorConversation />
        </div>
      </div>
    );
  }

  // ============================================================================
  // NORMAL MODE (Day 35)
  // Standard PathAdvisor panel for regular dashboard usage.
  // ============================================================================
  return (
    <div className={cn('flex flex-col h-full max-h-[calc(100vh-220px)]')}>
      {/* ================================================================== */}
      {/* PATHADVISOR PANEL                                                 */}
      {/* Day 35: Replaced "Your Plan" with actual PathAdvisor session      */}
      {/* Title: "PathAdvisor" (without "AI" for dashboard context)         */}
      {/* Height constrained to prevent input from being pushed off-screen  */}
      {/* Chat history scrolls (overflow-y-auto in PathAdvisorPanel)         */}
      {/* Input box visible immediately on first load (no scrolling needed)  */}
      {/* data-tour anchors are used by GuidedTourOverlay for stable spotlight targeting */}
      {/* Single anchor on the panel container (same as onboarding mode) */}
      {/* ================================================================== */}
      <div
        data-tour="pathadvisor-panel"
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <PathAdvisorPanel dock="right" title="PathAdvisor" />
      </div>
    </div>
  );
}
