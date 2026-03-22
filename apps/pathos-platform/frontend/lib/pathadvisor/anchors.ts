/**
 * ============================================================================
 * PATHADVISOR ANCHOR SYSTEM (Day 43)
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Defines the first-class PathAdvisorAnchor type and helper functions for
 * building and normalizing anchor data. An anchor represents where a user
 * initiated an "Ask PathAdvisor" action, providing context for Focus Mode.
 * 
 * WHERE IT FITS IN ARCHITECTURE:
 * - Type Layer: Core type definitions for the anchor system
 * - Used by: askPathAdvisor() function, PathAdvisor store, Focus Mode component
 * - Purpose: Ensures consistent anchor structure across all entry points
 * 
 * KEY CONCEPTS:
 * - Anchor: A structured object that captures the origin of an "Ask" action
 * - Source: The high-level feature area (job, resume, benefits, etc.)
 * - Source ID: Optional identifier for the specific item (e.g., job ID)
 * - Source Label: User-facing name for the anchor origin
 * - Summary: Short reason/context for why the user asked
 * 
 * HOW IT WORKS (STEP BY STEP):
 * 1. User clicks "Ask PathAdvisor" from a specific card/context
 * 2. askPathAdvisor() builds an anchor using buildAnchorId() and normalizeSourceLabel()
 * 3. Anchor is stored in PathAdvisor store as activeAnchor
 * 4. Focus Mode reads activeAnchor and displays anchor header + summary
 * 5. Suggested prompts are scoped by anchor.source
 * 
 * DAY 43 CONTRACT:
 * Any "Ask PathAdvisor" action MUST set a PathAdvisorAnchor before opening Focus Mode.
 * This enforces the Ask → Anchor → Focus contract.
 */

/**
 * Source type for PathAdvisor anchors.
 * 
 * PURPOSE:
 * Identifies the high-level feature area where the user initiated the Ask action.
 * Used for scoping suggested prompts and displaying context in Focus Mode.
 * 
 * VALUES:
 * - 'job': Job Search / Job Details / Selected Job panel
 * - 'resume': Resume Builder workspace / Tailor resume flow
 * - 'resume-review': Resume Review mode (collaborative review with PathAdvisor)
 * - 'benefits': Benefits workspace / optimizer
 * - 'import': Import inbox / triage
 * - 'retirement': Retirement page / calculator
 * - 'dashboard': Dashboard / general PathOS context
 * 
 * DAY 43 ADDITION:
 * 'resume-review' is distinct from 'resume' to enable specialized guidance
 * during the Resume Review mode. When this anchor is active:
 * - PathAdvisor focuses only on resume quality and alignment
 * - Suggested improvements are optional and user-driven
 * - No auto-application of changes without explicit user action
 */
export type PathAdvisorAnchorSource =
  | 'job'
  | 'resume'
  | 'resume-review'
  | 'benefits'
  | 'import'
  | 'retirement'
  | 'dashboard';

/**
 * First-class PathAdvisorAnchor type.
 * 
 * PURPOSE:
 * Structured object that captures where a user initiated an "Ask PathAdvisor" action.
 * This provides context for Focus Mode to display origin information and scope prompts.
 * 
 * CONTRACT:
 * Every "Ask PathAdvisor" action MUST create and set a PathAdvisorAnchor before
 * opening Focus Mode. This enforces consistent UX and enables anchor-aware UI.
 * 
 * FIELDS:
 * - id: Unique identifier for this anchor (generated via buildAnchorId())
 * - source: High-level feature area (job, resume, benefits, etc.)
 * - sourceId: Optional identifier for the specific item (e.g., job ID, resume ID)
 * - sourceLabel: User-facing name for the anchor origin (e.g., "GS-14 Program Analyst")
 * - summary: Short reason/context for why the user asked (e.g., "Considering this position")
 * - createdAt: Timestamp when anchor was created (milliseconds since epoch)
 */
export interface PathAdvisorAnchor {
  /** Unique identifier for this anchor instance */
  id: string;
  /** High-level feature area where Ask was initiated */
  source: PathAdvisorAnchorSource;
  /** Optional identifier for the specific item (job ID, resume ID, etc.) */
  sourceId?: string;
  /** User-facing name for the anchor origin */
  sourceLabel: string;
  /** Short reason/context for why the user asked */
  summary: string;
  /** Timestamp when anchor was created (milliseconds since epoch) */
  createdAt: number;
}

/**
 * Builds a unique anchor ID.
 * 
 * PURPOSE:
 * Generates a deterministic unique identifier for an anchor instance.
 * Uses timestamp + source + optional sourceId to ensure uniqueness.
 * 
 * HOW IT WORKS:
 * 1. Gets current timestamp in milliseconds
 * 2. Appends source type
 * 3. If sourceId provided, appends it
 * 4. Returns format: "anchor-{timestamp}-{source}-{sourceId?}"
 * 
 * EXAMPLES:
 * - buildAnchorId('job', 'job-123') => "anchor-1704067200000-job-job-123"
 * - buildAnchorId('resume') => "anchor-1704067200000-resume"
 * 
 * @param source - The anchor source type
 * @param sourceId - Optional source ID for the specific item
 * @returns Unique anchor ID string
 */
export function buildAnchorId(source: PathAdvisorAnchorSource, sourceId?: string): string {
  const timestamp = Date.now();
  const parts = ['anchor', timestamp.toString(), source];
  if (sourceId) {
    parts.push(sourceId);
  }
  return parts.join('-');
}

/**
 * Normalizes a source label to ensure consistent formatting.
 * 
 * PURPOSE:
 * Ensures user-facing source labels are consistently formatted for display
 * in Focus Mode anchor header. Trims whitespace and handles empty strings.
 * 
 * HOW IT WORKS:
 * 1. Trims leading/trailing whitespace
 * 2. If empty after trim, returns fallback based on source
 * 3. Otherwise returns trimmed label
 * 
 * EXAMPLES:
 * - normalizeSourceLabel('GS-14 Program Analyst', 'job') => "GS-14 Program Analyst"
 * - normalizeSourceLabel('  ', 'resume') => "Resume"
 * - normalizeSourceLabel('', 'benefits') => "Benefits"
 * 
 * @param label - The source label to normalize
 * @param source - The anchor source type (used for fallback)
 * @returns Normalized label string
 */
export function normalizeSourceLabel(
  label: string,
  source: PathAdvisorAnchorSource,
): string {
  const trimmed = label.trim();
  if (trimmed === '') {
    // Fallback labels for each source type
    const fallbacks: Record<PathAdvisorAnchorSource, string> = {
      job: 'Job',
      resume: 'Resume',
      'resume-review': 'Resume Review',
      benefits: 'Benefits',
      import: 'Import',
      retirement: 'Retirement',
      dashboard: 'Dashboard',
    };
    return fallbacks[source];
  }
  return trimmed;
}
