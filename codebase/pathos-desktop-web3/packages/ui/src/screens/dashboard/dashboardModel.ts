/**
 * ============================================================================
 * DASHBOARD VIEW MODEL CONTRACT — Stable types for Command Center v1
 * ============================================================================
 *
 * PURPOSE: Platform-neutral view model consumed by DashboardScreen. No
 * next/navigation or electron imports. Used by buildDashboardViewModel and
 * useDashboardSnapshot.
 *
 * All routes are string paths; navigation is performed by the host (Next or
 * Desktop) via @pathos/adapters or callback.
 */

/** Single focus item (Today's Focus hero or secondary card). */
export interface FocusItem {
  id: string;
  title: string;
  reason: string;
  actionLabel: string;
  /** Canonical path for "Do now" / primary CTA; from packages/ui/src/routes/routes.ts. */
  actionRoute: string;
  updatedAt: string;
}

/** Active track row (Saved Jobs, Applications, or Resume). */
export interface ActiveTrack {
  id: string;
  type: 'saved_jobs' | 'applications' | 'resume';
  title: string;
  statusSummary: string;
  updatedAt: string;
  /** Route to open this track (e.g. saved-jobs, import, resume-builder). */
  route: string;
}

/** Signal row (updates, readiness delta, timeline). */
export interface SignalItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  severity: 'info' | 'success' | 'warning' | 'neutral';
  updatedAt: string;
}

/** Full dashboard view model: focus (max 3), tracks (preview), signals, timestamp. */
export interface DashboardViewModel {
  focus: FocusItem[];
  tracks: ActiveTrack[];
  signals: SignalItem[];
  lastUpdated: string;
  /** Raw shapes for existing signal cards (Updates, Readiness, Timeline). */
  updatesSinceVisit: Array<{ icon: string; text: string; timeAgo: string }>;
  readinessDeltas: Array<{
    label: string;
    delta: string;
    deltaPositive?: boolean;
    deltaNegative?: boolean;
    explanation: string;
  }>;
  timelineEstimates: Array<{ label: string; range: string }>;
  timelineDisclaimer: string;
  timelineMethodology: string;
}
