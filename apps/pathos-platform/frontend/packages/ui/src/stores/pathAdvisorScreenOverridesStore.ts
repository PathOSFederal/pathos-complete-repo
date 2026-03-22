/**
 * ============================================================================
 * PATH ADVISOR SCREEN OVERRIDES STORE — Per-screen rail content
 * ============================================================================
 *
 * PURPOSE: Screens (e.g. Career & Resume) set viewingLabel, suggestedPrompts,
 * and briefingLabel when they mount so the shared PathAdvisor rail shows
 * context-appropriate content without the shell needing to be route-aware.
 * When a screen unmounts it clears the overrides so the rail falls back to
 * default (e.g. Dashboard). Platform-neutral; no next/electron.
 */

import { create } from 'zustand';

/** Optional rail content for screens that show INSIGHT + NEXT BEST ACTION blocks (e.g. Career Readiness). */
export interface PathAdvisorRailContent {
  /** Bullet strings for the INSIGHT card. */
  insightBullets: string[];
  /** Next best action text and CTA label (e.g. "Add 3 quantified accomplishments (+4)." / "Start"). */
  nextBestAction: {
    text: string;
    /** Title displayed prominently above the body text. */
    title?: string;
    ctaLabel: string;
    /** When set, renders a secondary skip/dismiss button next to the primary CTA. */
    skipLabel?: string;
  };
  /** Optional collapsed section labels (e.g. "Explain scoring", "How this works"). */
  collapsedSectionLabels?: string[];
  /** When true, style the NEXT BEST ACTION box with orange outline and accent-tinted background (mockup: Prioritize High Match). */
  highlightNextBestAction?: boolean;
}

export interface PathAdvisorScreenOverrides {
  /** Stable screen id for Context Log scope (e.g. 'job-search', 'dashboard'). Used for clear-by-screen and entry grouping. */
  screenId?: string;
  /** Chip label for "Viewing: ..." (e.g. "Resume Readiness"). */
  viewingLabel: string;
  /** Quick prompt strings for the rail chips. */
  suggestedPrompts: string[];
  /** Label above the "Do now" block (e.g. "From Resume Readiness"). When unset, card uses "From Today's Focus". */
  briefingLabel?: string;
  /** Optional one-line helper under briefingLabel (e.g. "Select a saved job to get personalized guidance."). Shown in rail when briefingLabel is set. */
  briefingHelperText?: string;
  /** Optional callback when user takes primary action from fit briefing (e.g. Save + Start Tailoring). */
  onFitBriefingPrimaryAction?: () => void;
  /** Optional rail content: INSIGHT card + NEXT BEST ACTION card (e.g. Career Readiness). When set, card shows these instead of hero Do now. */
  railContent?: PathAdvisorRailContent;
  /** Optional: when user clicks the rail NEXT BEST ACTION button (e.g. Job Search "Fix <gap>"). */
  onRailNextBestActionClick?: () => void;
  /** Optional: when user clicks the Skip button on the NEXT BEST ACTION card. */
  onRailSkipClick?: () => void;
  /** Optional: composer input placeholder (e.g. "Ask about saved jobs..."). When set, overrides default "Ask PathAdvisor...". */
  composerPlaceholder?: string;
}

interface PathAdvisorScreenOverridesState {
  overrides: PathAdvisorScreenOverrides | null;
  setOverrides: (overrides: PathAdvisorScreenOverrides | null) => void;
}

export const usePathAdvisorScreenOverridesStore = create<PathAdvisorScreenOverridesState>(function (set) {
  return {
    overrides: null,
    setOverrides: function (overrides) {
      set({ overrides });
    },
  };
});
