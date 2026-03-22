/**
 * ============================================================================
 * BUILD DASHBOARD VIEW MODEL — Deterministic builder from dashboard data
 * ============================================================================
 *
 * PURPOSE: Maps the existing DashboardData shape (mock or API) to
 * DashboardViewModel. Keeps dashboard a preview: Today's Focus max 3 items,
 * Active Tracks limited (top 3 per track), Signals minimal. All focus
 * action routes use shared route constants (platform-neutral).
 *
 * BOUNDARY: No next/navigation. Imports routes from packages/ui/src/routes/routes.ts.
 */

import type { DashboardData } from '../DashboardScreen';
import type { DashboardViewModel, FocusItem, ActiveTrack, SignalItem } from './dashboardModel';
import {
  RESUME_BUILDER,
  SAVED_JOBS,
  GUIDED_APPLY_CANON,
  IMPORT,
  CAREER_READINESS,
} from '../../routes/routes';

const FOCUS_MAX = 3;
const TRACK_ITEMS_PREVIEW = 3;

/**
 * Builds a stable view model from dashboard data.
 * - Focus: hero (if present) + up to 2 from focusSmall, max 3 total; each has actionRoute from routes.ts.
 * - Tracks: up to 3 track cards (saved jobs, applications, resume) with limited list preview.
 * - Signals: derived from updatesSinceVisit, readinessDeltas, timeline (minimal).
 */
export function buildDashboardViewModel(data: DashboardData): DashboardViewModel {
  const lastUpdated =
    data.lastUpdated !== undefined && data.lastUpdated !== null && data.lastUpdated !== ''
      ? data.lastUpdated
      : '';

  const focus = buildFocusItems(data);
  const tracks = buildTracks(data);
  const signals = buildSignals(data);
  const updatesSinceVisit =
    data.updatesSinceVisit !== undefined
      ? data.updatesSinceVisit.slice(0, TRACK_ITEMS_PREVIEW)
      : [];
  const readinessDeltas =
    data.readinessDeltas !== undefined
      ? data.readinessDeltas.slice(0, 2)
      : [];
  const timelineEstimates =
    data.timelineEstimates !== undefined ? data.timelineEstimates : [];
  const timelineDisclaimer =
    data.timelineDisclaimer !== undefined && data.timelineDisclaimer !== null
      ? data.timelineDisclaimer
      : '';
  const timelineMethodology =
    data.timelineMethodology !== undefined && data.timelineMethodology !== null
      ? data.timelineMethodology
      : '';

  return {
    focus,
    tracks,
    signals,
    lastUpdated,
    updatesSinceVisit,
    readinessDeltas,
    timelineEstimates,
    timelineDisclaimer,
    timelineMethodology,
  };
}

/**
 * Today's Focus: hero first, then focusSmall entries, max FOCUS_MAX.
 * Every focus item has actionRoute from shared route constants.
 */
function buildFocusItems(data: DashboardData): FocusItem[] {
  const out: FocusItem[] = [];

  if (data.focusHero !== null && data.focusHero !== undefined) {
    out.push({
      id: 'focus-hero',
      title: data.focusHero.title,
      reason: data.focusHero.reason,
      actionLabel: data.focusHero.ctaLabel,
      actionRoute: CAREER_READINESS,
      updatedAt: data.lastUpdated !== undefined ? data.lastUpdated : '',
    });
  }

  const small = data.focusSmall !== undefined ? data.focusSmall : [];
  const routesForSmall = [IMPORT, GUIDED_APPLY_CANON];
  for (let i = 0; i < small.length && out.length < FOCUS_MAX; i++) {
    const route = routesForSmall[i] !== undefined ? routesForSmall[i] : GUIDED_APPLY_CANON;
    out.push({
      id: 'focus-small-' + String(i),
      title: small[i].title,
      reason: small[i].description,
      actionLabel: small[i].ctaLabel,
      actionRoute: route,
      updatedAt: data.lastUpdated !== undefined ? data.lastUpdated : '',
    });
  }

  return out;
}

/**
 * Active Tracks: one per track type (saved jobs, applications, resume), each
 * with statusSummary and route. Lists limited to TRACK_ITEMS_PREVIEW for preview.
 */
function buildTracks(data: DashboardData): ActiveTrack[] {
  const tracks: ActiveTrack[] = [];

  const savedJobs = data.savedJobs !== undefined ? data.savedJobs : [];
  const savedCount = savedJobs.length;
  const savedSummary =
    savedCount > 0
      ? String(savedCount) + ' job' + (savedCount !== 1 ? 's' : '')
      : 'No saved jobs';
  tracks.push({
    id: 'track-saved-jobs',
    type: 'saved_jobs',
    title: 'Saved Jobs',
    statusSummary: savedSummary,
    updatedAt: data.lastUpdated !== undefined ? data.lastUpdated : '',
    route: SAVED_JOBS,
  });

  const applications = data.applications !== undefined ? data.applications : [];
  const appCount = applications.length;
  const appSummary =
    appCount > 0
      ? String(appCount) + ' tracked'
      : 'No tracked applications';
  tracks.push({
    id: 'track-applications',
    type: 'applications',
    title: 'Applications',
    statusSummary: appSummary,
    updatedAt: data.lastUpdated !== undefined ? data.lastUpdated : '',
    route: IMPORT,
  });

  const resume = data.resume;
  const resumeSummary =
    resume !== undefined && resume !== null
      ? String(resume.progressPercent) + '% complete'
      : 'Not started';
  tracks.push({
    id: 'track-resume',
    type: 'resume',
    title: 'Resume',
    statusSummary: resumeSummary,
    updatedAt: data.lastUpdated !== undefined ? data.lastUpdated : '',
    route: RESUME_BUILDER,
  });

  return tracks;
}

/**
 * Signals: from updatesSinceVisit (top 3), readinessDeltas (top 2), one timeline summary.
 * Kept minimal for dashboard preview.
 */
function buildSignals(data: DashboardData): SignalItem[] {
  const out: SignalItem[] = [];

  const updates = data.updatesSinceVisit !== undefined ? data.updatesSinceVisit : [];
  const updateLimit = TRACK_ITEMS_PREVIEW;
  for (let i = 0; i < updates.length && i < updateLimit; i++) {
    const u = updates[i];
    const severity =
      u.icon === 'warning' ? 'warning' : u.icon === 'trend' ? 'success' : 'info';
    out.push({
      id: 'signal-update-' + String(i),
      type: 'update',
      title: u.text,
      detail: u.timeAgo,
      severity: severity as SignalItem['severity'],
      updatedAt: u.timeAgo,
    });
  }

  const deltas = data.readinessDeltas !== undefined ? data.readinessDeltas : [];
  const deltaLimit = 2;
  for (let i = 0; i < deltas.length && i < deltaLimit; i++) {
    const d = deltas[i];
    const severity = d.deltaPositive ? 'success' : d.deltaNegative ? 'warning' : 'neutral';
    out.push({
      id: 'signal-delta-' + String(i),
      type: 'readiness_delta',
      title: d.label,
      detail: d.delta + ' — ' + d.explanation,
      severity: severity as SignalItem['severity'],
      updatedAt: data.lastUpdated !== undefined ? data.lastUpdated : '',
    });
  }

  if (
    data.timelineEstimates !== undefined &&
    data.timelineEstimates.length > 0
  ) {
    const first = data.timelineEstimates[0];
    out.push({
      id: 'signal-timeline',
      type: 'timeline',
      title: first.label,
      detail: first.range,
      severity: 'neutral',
      updatedAt: data.lastUpdated !== undefined ? data.lastUpdated : '',
    });
  }

  return out;
}
