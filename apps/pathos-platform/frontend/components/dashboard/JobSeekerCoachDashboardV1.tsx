/**
 * ============================================================================
 * JOB SEEKER COACH DASHBOARD V1 (Day 35 - Hybrid Advisor + Mission Board Dashboard)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component is the main composition component for the new Job Seeker
 * dashboard layout. It combines:
 * - CoachSessionPanel (primary, left column on desktop)
 * - MissionBoardV1 (secondary, right column on desktop)
 * - EvidenceDrawerV1 (secondary, right column on desktop, collapsed by default)
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * This component replaces the current Job Seeker dashboard content area
 * (Market Position, Next Best Moves, Benefits, Offer Preview cards).
 * It is used in app/dashboard/page.tsx for Job Seekers only.
 *
 * LAYOUT:
 * Desktop (lg breakpoint and above):
 * - 2-column layout
 * - Left (primary): CoachSessionPanel (full height)
 * - Right (secondary): MissionBoardV1 + EvidenceDrawerV1 (stacked)
 *
 * Mobile (below lg breakpoint):
 * - Single column layout
 * - CoachSessionPanel (full width)
 * - Mission Board becomes compact tabs/pills
 * - Evidence Drawer becomes inline expandable area
 *
 * STATE MANAGEMENT:
 * - evidenceOpen: boolean (local state)
 * - evidenceCard: EvidenceCardType | null (local state)
 * - Mission clicks inject messages into CoachSessionPanel (via callback)
 *
 * DESIGN PRINCIPLES:
 * - Real, authentic, friendly
 * - High-confidence via process certainty
 * - Calm and low-noise
 * - "I'm being guided" not "I'm reading analytics"
 */

'use client';

import { useState } from 'react';
import { CoachSessionPanel } from './CoachSessionPanel';
import { MissionBoardV1 } from './MissionBoardV1';
import { EvidenceDrawerV1, type EvidenceCardType } from './EvidenceDrawerV1';
import Link from 'next/link';

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

interface JobSeekerCoachDashboardV1Props {
  /**
   * Whether onboarding mode is currently active.
   * When true, CoachSessionPanel shows onboarding conversation.
   */
  isOnboardingMode?: boolean;
}

export function JobSeekerCoachDashboardV1(props?: JobSeekerCoachDashboardV1Props) {
  const isOnboardingMode = props !== undefined && props.isOnboardingMode === true;

  // ============================================================================
  // LOCAL STATE
  // Manage evidence drawer open/close state and selected card type.
  // Day 35: Drawer opens by default to show Priority Alerts.
  // Day 36: Drawer is closed during onboarding mode.
  // ============================================================================

  const [evidenceOpen, setEvidenceOpen] = useState(!isOnboardingMode); // Closed during onboarding
  const [evidenceCard, setEvidenceCard] = useState<EvidenceCardType | null>(null);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles clicking an evidence chip in the CoachSessionPanel.
   * Opens the evidence drawer and selects the appropriate card.
   */
  function handleEvidenceChipClick(cardType: EvidenceCardType) {
    setEvidenceCard(cardType);
    setEvidenceOpen(true);
  }

  /**
   * Handles clicking a mission in the MissionBoardV1.
   * In Plan Mode, this should inject a targeted advisor message and open
   * relevant evidence. For now, we just open the evidence drawer.
   */
  function handleMissionClick(missionId: string, evidenceCardType: EvidenceCardType) {
    // TODO: Inject targeted advisor message into CoachSessionPanel
    // For now, just open the evidence drawer
    setEvidenceCard(evidenceCardType);
    setEvidenceOpen(true);
  }

  /**
   * Handles closing the evidence drawer.
   */
  function handleEvidenceClose() {
    setEvidenceOpen(false);
    // Optionally clear the card type when closing
    // setEvidenceCard(null);
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* ================================================================== */}
      {/* PRIMARY CONTENT: 2-Column Layout (Desktop)                        */}
      {/* Day 35: Wider layout - 9/3 split to emphasize PathAdvisor          */}
      {/* Single column (Mobile)                                             */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Left Column: Coach Session Panel (Primary) - 9 columns */}
        {/* Day 35: PathAdvisor-first - dominant left column                 */}
        {/* Day 36: Shows onboarding conversation when isOnboardingMode is true */}
        <div className="lg:col-span-9">
          <CoachSessionPanel
            evidenceOpen={evidenceOpen}
            evidenceCard={evidenceCard}
            onEvidenceChipClick={handleEvidenceChipClick}
            isOnboardingMode={isOnboardingMode}
          />
        </div>

        {/* Right Column: Mission Board + Evidence Drawer (Secondary) - 3 columns */}
        {/* Day 35: Supporting context cards in narrower right column        */}
        <div className="lg:col-span-3 space-y-4">
          <MissionBoardV1 onMissionClick={handleMissionClick} />
          <EvidenceDrawerV1
            open={evidenceOpen}
            cardType={evidenceCard}
            onClose={handleEvidenceClose}
          />
        </div>
      </div>

      {/* ================================================================== */}
      {/* EXPLORE LATER LINKS                                                */}
      {/* Subtle links to Benefits and Offer Preview (replaces large cards) */}
      {/* ================================================================== */}
      <div className="space-y-2 pt-4 border-t border-border">
        <Link
          href="/dashboard/benefits"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
        >
          Explore benefits later
        </Link>
        <Link
          href="/dashboard/compensation"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
        >
          Preview offers later
        </Link>
      </div>
    </div>
  );
}
