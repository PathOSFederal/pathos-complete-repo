/**
 * ============================================================================
 * TOOLTIP COPY — Centralized tooltip strings for Job Search (Overlay Rule v1)
 * ============================================================================
 *
 * Single source of truth for chip, sort, and fit tooltips. Used by JobSearchScreen
 * so all tooltips are deterministic and reusable. Copy kept short (<= 140 chars).
 * Consumers wrap chips/controls with canonical Tooltip (portaled); no inline tooltip DOM.
 */

/** Tooltips for job/list chips: GS, close date, Remote, Telework, risk flags, appointment type. */
export const chipTooltips: Record<string, string> = {
  /** General Schedule grade level chip. */
  grade: 'General Schedule grade level for the role.',
  /** Static close date chip (e.g. Closes Apr 1). */
  closeDate: 'Application closes on this date.',
  /** Urgency chip when closing soon. */
  closesSoon: 'Closing soon based on close date.',
  /** Fully remote per posting. */
  Remote: 'Role can be performed fully remote (per posting).',
  /** Telework eligible. */
  Telework: 'Telework eligible (some remote days), per posting.',
  /** Appointment type: competitive service. */
  Competitive: 'Competitive service appointment (permanent, career/career-conditional).',
  /** Appointment type: excepted service. */
  Excepted: 'Excepted service appointment (e.g. certain agencies, schedules).',
  /** Appointment type: term. */
  Term: 'Term appointment (time-limited, may convert).',
  /** Security clearance risk flag. */
  Clearance: 'Security clearance required or listed in posting.',
  /** Drug test risk flag. */
  'Drug test': 'Drug test required (per posting).',
  /** Travel risk flag. */
  Travel: 'Travel required (per posting).',
};

/** Tooltips for sort-by options (deterministic vs mocked). */
export const sortTooltips: Record<string, string> = {
  likelihood: 'Sorted by fit score (deterministic).',
  effortToReward: 'Sorted by reward proxy vs tailoring effort (mocked v1).',
  strategic: 'Sorted by growth/promotion potential signals (mocked v1).',
  urgency: 'Sorted by close date (soonest first).',
};

/** Tooltips for fit signals: stars, confidence, effort. */
export const fitTooltips: Record<string, string> = {
  fitStars: 'Deterministic fit estimate based on your target role + job fields.',
  confidence: 'Confidence reflects missing inputs (target role/profile fields).',
  effort: 'Effort estimate for tailoring based on requirements/risk flags.',
};

/** Tooltips for filter dropdown groups (explain what the filter means). */
export const filterGroupTooltips: Record<string, string> = {
  Sort: 'Order results by fit, effort-to-reward, strategic value, or close date.',
  Grades: 'General Schedule grade level for the role (e.g. GS-12).',
  Series: 'Job family code (e.g. 2210 for IT, 0343 for management).',
  Agencies: 'Hiring agency or sub-agency.',
  Location: 'Duty station or work location.',
  Types: 'Appointment type: Competitive, Excepted, or Term.',
};

/**
 * Get chip tooltip by display label (e.g. "Remote", "Travel", "Closes soon").
 * Falls back to closeDate for generic close-date chips.
 */
export function getChipTooltip(label: string, isClosesSoon: boolean): string {
  if (isClosesSoon && (label === 'Closes soon' || label.indexOf('Closes') !== -1)) {
    return chipTooltips.closesSoon;
  }
  if (label === 'Closes soon') return chipTooltips.closesSoon;
  const exact = chipTooltips[label];
  if (exact !== undefined) return exact;
  if (label.indexOf('Closes') !== -1) return chipTooltips.closeDate;
  return '';
}

/**
 * Get sort tooltip by sort kind (likelihood | effortToReward | strategic | urgency).
 */
export function getSortTooltip(sortKind: string): string {
  const s = sortTooltips[sortKind];
  return s !== undefined ? s : '';
}

/**
 * Get filter group tooltip by FilterDropdown label (e.g. "Grades", "Series").
 */
export function getFilterGroupTooltip(label: string): string {
  const s = filterGroupTooltips[label];
  return s !== undefined ? s : '';
}
