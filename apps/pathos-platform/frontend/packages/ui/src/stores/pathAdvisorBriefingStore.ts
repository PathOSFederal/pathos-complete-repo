/**
 * ============================================================================
 * PATH ADVISOR BRIEFING STORE — Shared state for PathAdvisor “Briefing” content
 * ============================================================================
 *
 * FILE PURPOSE:
 * Holds the current briefing payload and visibility so the Dashboard can open
 * a briefing (e.g. “Why this is your next best move”, “How PathAdvisor estimates
 * timelines”) and the PathAdvisor rail can render it inside the existing
 * PathAdvisor card without layout shift on the dashboard.
 *
 * WHERE IT FITS:
 * - Dashboard “Ask PathAdvisor” buttons call openBriefing(briefing).
 * - PathAdvisorCard reads briefing + isOpen and renders the Briefing section;
 *   close control calls closeBriefing() / clearBriefing().
 *
 * SSR SAFETY:
 * No persistence in this pass; no localStorage. If persistence is added later,
 * guard localStorage access with typeof window !== 'undefined'.
 *
 * CONVENTIONS:
 * - No var; use const/let only. No ?. or ?? or spread in this file.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BriefingSection {
  heading: string;
  body: string;
}

/** Optional primary CTA shown at bottom of a generic briefing (e.g. dimension briefing). */
export interface BriefingPrimaryCta {
  label: string;
  route: string;
}

/** Generic briefing (Dashboard "Ask PathAdvisor" style): heading + body sections. */
export interface PathAdvisorBriefing {
  id: string;
  title: string;
  subtitle?: string;
  sections: BriefingSection[];
  sourceLabel?: string;
  /** When set, PathAdvisor card renders a primary CTA button that navigates to this route. */
  primaryCta?: BriefingPrimaryCta;
}

/**
 * Fit explanation briefing: deterministic "Why this fit?" from Job Search.
 * Dispatched when user clicks "Explain this in PathAdvisor" in details Snapshot
 * or "Why this fit?" in results list; rail shows alignment summary, reasons,
 * what's missing, and recommended next action.
 */
export interface PathAdvisorBriefingFit {
  type: 'fit';
  jobId: string;
  jobTitle: string;
  stars: number;
  confidence: string;
  reasons: string[];
  /** Single primary blocker line (e.g. series mismatch, grade gap). Empty if none. */
  blocker: string;
  /** Effort level for tailoring: Low | Medium | High. */
  effort: string;
  /** Risk flag labels (Travel, Drug test, Clearance, etc.). */
  risks: string[];
  inputsUsed: string[];
  missingInputs: string[];
  /** When true, show "Open Decision Brief" or "Start Tailoring"; when false, "Save + Start Tailoring". */
  isJobSaved: boolean;
}

/** Union: rail can show either a generic briefing or a fit explanation. */
export type PathAdvisorBriefingPayload = PathAdvisorBriefing | PathAdvisorBriefingFit;

/** Type guard: true when payload is fit briefing. */
export function isFitBriefing(
  b: PathAdvisorBriefingPayload | null
): b is PathAdvisorBriefingFit {
  return b !== null && typeof b === 'object' && (b as PathAdvisorBriefingFit).type === 'fit';
}

interface PathAdvisorBriefingState {
  /** Current briefing payload; null when none. */
  briefing: PathAdvisorBriefingPayload | null;
  /** Whether the briefing panel is visible in the rail. */
  isOpen: boolean;
}

interface PathAdvisorBriefingActions {
  /** Set briefing and show it in the rail. */
  openBriefing: (briefing: PathAdvisorBriefingPayload) => void;
  /** Hide the briefing panel; keep briefing data so it can be reopened if desired. */
  closeBriefing: () => void;
  /** Clear briefing and close. */
  clearBriefing: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePathAdvisorBriefingStore = create<PathAdvisorBriefingState & PathAdvisorBriefingActions>(
  function (set) {
    return {
      briefing: null,
      isOpen: false,

      openBriefing: function (briefing: PathAdvisorBriefingPayload) {
        set({ briefing, isOpen: true });
      },

      closeBriefing: function () {
        set({ isOpen: false });
      },

      clearBriefing: function () {
        set({ briefing: null, isOpen: false });
      },
    };
  }
);
