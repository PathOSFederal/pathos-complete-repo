/**
 * ============================================================================
 * GUIDED USAJOBS SHARED TYPES (Day 44)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Shared type definitions for Guided USAJOBS Mode to avoid circular imports.
 *
 * @version Day 44 - Guided USAJOBS Click-to-Explain v1
 * ============================================================================
 */

/**
 * Relocation tolerance for goal tailoring.
 */
export type RelocationTolerance = 'low' | 'medium' | 'high';

/**
 * Service preference for federal hiring context.
 */
export type ServicePreference = 'competitive' | 'excepted' | 'no-preference';

/**
 * Known page context states (manual selection, no DOM inference).
 */
export type GuidedUsaJobsContextState =
  | 'SEARCH_RESULTS'
  | 'JOB_ANNOUNCEMENT'
  | 'QUALIFICATIONS'
  | 'WHO_MAY_APPLY'
  | 'HOW_YOU_WILL_BE_EVALUATED'
  | 'REQUIRED_DOCUMENTS'
  | 'QUESTIONNAIRE'
  | 'APPLICATION_STATUS'
  | 'UNKNOWN';

/**
 * Selected region coordinates within the capture surface.
 */
export interface GuidedUsaJobsRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Minimal, local-only goal context for response tailoring.
 */
export interface GuidedUsaJobsGoalContext {
  /** Target GS level (string for flexible entry) */
  targetGsLevel: string;
  /** Career timeline goal (plain text) */
  timelineGoal: string;
  /** Relocation tolerance */
  relocationTolerance: RelocationTolerance;
  /** Service preference */
  servicePreference: ServicePreference;
}
