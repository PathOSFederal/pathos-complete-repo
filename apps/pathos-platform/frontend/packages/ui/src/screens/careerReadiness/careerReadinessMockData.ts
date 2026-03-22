/**
 * ============================================================================
 * CAREER READINESS MOCK DATA — Local-only data for Career Readiness screen
 * ============================================================================
 *
 * No backend calls. Used by CareerReadinessScreen to render score, trajectory,
 * radar, gaps, and action plan. Persist selections in component state for v1.
 */

/** Single point on the readiness trajectory (time label + score). */
export interface TrajectoryPoint {
  label: string;
  score: number;
}

/**
 * Two-series trajectory for v0: Actual (progress over time) and Possible
 * (where you could be if you complete selected actions). Local-only.
 */
export interface TrajectoryData {
  /** Actual trajectory: solid line, primary accent. */
  actualPoints: TrajectoryPoint[];
  /** Possible trajectory: dashed line, muted color. */
  possiblePoints: TrajectoryPoint[];
}

/** One spoke on the radar (dimension name + value 0–100). */
export interface RadarSpoke {
  name: string;
  value: number;
}

/** One gap in "Top gaps holding you back" with impact delta and CTA. */
export interface ReadinessGap {
  name: string;
  impact: number;
  reason: string;
  ctaLabel: string;
}

/** One action plan item with impact, effort (S/M/L), and helper text. */
export interface ActionPlanItem {
  id: string;
  label: string;
  impact: number;
  effort: 'S' | 'M' | 'L';
  helperText: string;
}

export interface CareerReadinessMockData {
  score: number;
  scoreMax: number;
  badgeLabel: string;
  explanationText: string;
  /** Two-series trajectory: actual + possible (v0 parity). */
  trajectory: TrajectoryData;
  radarSpokes: RadarSpoke[];
  gaps: ReadinessGap[];
  actionPlanItems: ActionPlanItem[];
  /** Evidence & Inputs expanded content. */
  evidenceProfileFields: string[];
  evidenceResumeUsed: string;
  evidenceTargetRoleUsed: string;
  evidencePrivacyNote: string;
}

/** v1 mock: Actual = progress over time; Possible = if selected actions completed. */
const TRAJECTORY_ACTUAL: TrajectoryPoint[] = [
  { label: 'Today', score: 74 },
  { label: '3 mo', score: 74 },
  { label: '6 mo', score: 75 },
  { label: '12 mo', score: 76 },
];
const TRAJECTORY_POSSIBLE: TrajectoryPoint[] = [
  { label: 'Today', score: 74 },
  { label: '3 mo', score: 78 },
  { label: '6 mo', score: 84 },
  { label: '12 mo', score: 90 },
];
const TRAJECTORY: TrajectoryData = {
  actualPoints: TRAJECTORY_ACTUAL,
  possiblePoints: TRAJECTORY_POSSIBLE,
};

const RADAR_SPOKES: RadarSpoke[] = [
  { name: 'Target Alignment', value: 68 },
  { name: 'Specialized Exp', value: 72 },
  { name: 'Resume Evidence', value: 58 },
  { name: 'Keywords Coverage', value: 75 },
  { name: 'Leadership & Scope', value: 65 },
];

const GAPS: ReadinessGap[] = [
  { name: 'Resume Evidence', impact: 6, reason: 'Bullets describe duties more than outcomes.', ctaLabel: 'Improve resume' },
  { name: 'Target Alignment', impact: 4, reason: 'Profile is split across multiple role paths.', ctaLabel: 'Set target role' },
  { name: 'Leadership & Scope', impact: 3, reason: 'Limited evidence of leading projects.', ctaLabel: 'Add leadership examples' },
];

const ACTION_PLAN_ITEMS: ActionPlanItem[] = [
  { id: 'quantified', label: 'Add 3 quantified accomplishments', impact: 4, effort: 'M', helperText: 'Add numbers: $, %, time saved, volume, error reduction.' },
  { id: 'leadership', label: 'Add 2 leadership examples', impact: 3, effort: 'S', helperText: 'Show leading projects, coordinating teams, owning outcomes.' },
  { id: 'target', label: 'Set a primary target role', impact: 4, effort: 'S', helperText: 'Focus improves alignment and keyword targeting.' },
  { id: 'pmp', label: 'Add certification: PMP', impact: 5, effort: 'L', helperText: 'Optional, high impact for program roles.' },
];

/** Default mock data for Career Readiness screen (matches screenshot content). */
export const CAREER_READINESS_MOCK: CareerReadinessMockData = {
  score: 74,
  scoreMax: 100,
  badgeLabel: 'Competitive with improvements',
  explanationText: 'You meet core qualification standards. Resume evidence and leadership signals are limiting competitiveness.',
  trajectory: TRAJECTORY,
  radarSpokes: RADAR_SPOKES,
  gaps: GAPS,
  actionPlanItems: ACTION_PLAN_ITEMS,
  evidenceProfileFields: ['Grade', 'Series', 'Years experience', 'Location'],
  evidenceResumeUsed: 'Master Resume v3',
  evidenceTargetRoleUsed: 'General readiness',
  evidencePrivacyNote: 'Computed locally. Not shared.',
};

// ---------------------------------------------------------------------------
// CareerReadinessSummary — Single source of truth for Dashboard (and other consumers)
// ---------------------------------------------------------------------------
//
// PURPOSE: Dashboard and PathAdvisor rail reuse the same readiness numbers
// (score, label, top gaps, next best action) without duplicating mock data.
// Export a small summary type and a selector so Dashboard stays in sync with
// Career Readiness screen.

/**
 * Summary shape for Dashboard readiness tile and "Do now" / Next best action.
 * Derived from CAREER_READINESS_MOCK (or future real data). Single source of truth.
 */
export interface CareerReadinessSummary {
  score: number;
  scoreMax: number;
  label: string;
  updatedAt: string;
  targetRoleLabel: string;
  /** First item from action plan = next best action (e.g. "Add 3 quantified accomplishments (+4)"). */
  nextBestActionText: string;
  /** Top gaps (same list as Career Readiness screen). */
  topGaps: ReadinessGap[];
}

/**
 * Returns the shared readiness summary for Dashboard and rail.
 * Today: derived from CAREER_READINESS_MOCK. Future: could read from store/API.
 */
export function getCareerReadinessSummary(): CareerReadinessSummary {
  const mock = CAREER_READINESS_MOCK;
  const firstAction =
    mock.actionPlanItems.length > 0
      ? mock.actionPlanItems[0]
      : null;
  const nextBestActionText =
    firstAction !== null
      ? firstAction.label + ' (+' + String(firstAction.impact) + ')'
      : '';
  return {
    score: mock.score,
    scoreMax: mock.scoreMax,
    label: mock.badgeLabel,
    updatedAt: '2 min ago',
    targetRoleLabel: mock.evidenceTargetRoleUsed,
    nextBestActionText,
    topGaps: mock.gaps,
  };
}
