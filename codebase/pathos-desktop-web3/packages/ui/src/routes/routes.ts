/**
 * ============================================================================
 * SHARED ROUTE CONSTANTS — Single source of truth for Sidebar and routing
 * ============================================================================
 *
 * PURPOSE: All Sidebar hrefs and canonical route paths live here so Next (3000)
 * and Desktop (5173) stay in parity. No string duplication in shell/nav.
 *
 * RULES:
 * - Sidebar links MUST use these constants.
 * - Both Next and Desktop MUST resolve every href (real screen or placeholder).
 * - Guided Apply: canonical path is GUIDED_APPLY_CANON; GUIDED_APPLY_ALIAS
 *   is for redirects only (not used by Sidebar).
 */

/** Dashboard root (Overview). */
export const DASHBOARD = '/dashboard';

/** Career Readiness (competitiveness baseline for federal roles). */
export const CAREER_READINESS = '/dashboard/career-readiness';

/** Money & Pay. */
export const COMPENSATION = '/dashboard/compensation';

/** Benefits (employee). */
export const BENEFITS = '/dashboard/benefits';

/** Retirement (employee). */
export const RETIREMENT = '/dashboard/retirement';

/** Resume Readiness (canonical). Sidebar links here. */
export const RESUME_READINESS = '/dashboard/resume-readiness';

/** Alias for Resume Readiness. Redirect to RESUME_READINESS; kept for backward compatibility. */
export const CAREER = '/dashboard/career';

/** Resume Builder. */
export const RESUME_BUILDER = '/dashboard/resume-builder';

/** Job Search. */
export const JOB_SEARCH = '/dashboard/job-search';

/** Saved Jobs. */
export const SAVED_JOBS = '/dashboard/saved-jobs';

/**
 * Canonical Guided Apply path. Sidebar links here.
 * Both Next and Desktop must serve this route (or redirect alias to it).
 */
export const GUIDED_APPLY_CANON = '/desktop/usajobs-guided';

/**
 * Alias for Guided Apply. Redirect to GUIDED_APPLY_CANON; not used by Sidebar.
 */
export const GUIDED_APPLY_ALIAS = '/guided-apply';

/** Application Confidence Center. */
export const APPLICATION_CONFIDENCE_CENTER = '/application-confidence-center';

/** Explore Federal Benefits (job seeker). */
export const EXPLORE_BENEFITS = '/explore/benefits';

/** Alerts Center. */
export const ALERTS = '/alerts';

/** Import Center. */
export const IMPORT = '/import';

/** Settings. */
export const SETTINGS = '/settings';

/**
 * Ordered list of route paths that appear in the shared Sidebar.
 * Used by scripts/check-route-parity.mjs to verify Desktop and Next resolve every Sidebar href.
 * Do not include GUIDED_APPLY_ALIAS (redirect-only; not in Sidebar).
 */
export const SIDEBAR_ROUTES: readonly string[] = [
  DASHBOARD,
  CAREER_READINESS,
  COMPENSATION,
  BENEFITS,
  RETIREMENT,
  RESUME_READINESS,
  RESUME_BUILDER,
  JOB_SEARCH,
  SAVED_JOBS,
  GUIDED_APPLY_CANON,
  APPLICATION_CONFIDENCE_CENTER,
  EXPLORE_BENEFITS,
  ALERTS,
  IMPORT,
  SETTINGS,
];
