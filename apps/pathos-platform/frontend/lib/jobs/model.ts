/**
 * ============================================================================
 * CANONICAL JOB MODEL - UI Contract (Day 12)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This file defines the **canonical** (authoritative) job data model that ALL
 * UI components and stores in PathOS must use. This is the "UI contract" —
 * a stable interface that insulates the UI from changes in raw data sources.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
 * │  Raw Data       │ --> │  Adapter Layer   │ --> │  CANONICAL MODEL   │
 * │  (USAJOBS,      │     │  (mappers)       │     │  (THIS FILE)       │
 * │   mock, etc.)   │     │                  │     │                    │
 * └─────────────────┘     └──────────────────┘     └────────────────────┘
 *                                                          │
 *                                                          ▼
 *                         ┌──────────────────────────────────────────────┐
 *                         │  UI Components / Zustand Stores              │
 *                         │  (Only use canonical models, NEVER raw data) │
 *                         └──────────────────────────────────────────────┘
 *
 * WHY SPLIT CARD vs DETAIL MODELS:
 * ============================================================================
 * 1. PERFORMANCE: Card views (lists) only need subset of data. Loading full
 *    details for 100 jobs in a list would be wasteful and slow.
 *
 * 2. API EFFICIENCY: Phase 2 ingestion can return lightweight card data for
 *    search results, then fetch full details on demand (when user clicks).
 *
 * 3. BREAKAGE ISOLATION: If a data source changes its "full details" format,
 *    only the detail mapper breaks — card views keep working.
 *
 * 4. PROGRESSIVE ENHANCEMENT: We can add detail fields over time without
 *    breaking existing card-based UI components.
 *
 * EXAMPLE USAGE:
 * ```typescript
 * // In a job card component (list view):
 * import type { JobCardModel } from '@/lib/jobs/model';
 *
 * function JobCard({ job }: { job: JobCardModel }) {
 *   return (
 *     <div>
 *       <h3>{job.title}</h3>
 *       <span>{job.organizationName}</span>
 *       <span>{job.locationDisplay}</span>
 *       {job.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}
 *     </div>
 *   );
 * }
 *
 * // In a job details view (full page/slideover):
 * import type { JobDetailModel } from '@/lib/jobs/model';
 *
 * function JobDetails({ job }: { job: JobDetailModel }) {
 *   return (
 *     <>
 *       <JobCard job={job} /> {/* Uses the base card fields *\/}
 *       <p>{job.descriptionHtml}</p>  {/* Uses detail-only fields *\/}
 *       <ul>{job.duties.map(d => <li>{d}</li>)}</ul>
 *     </>
 *   );
 * }
 * ```
 *
 * DESIGN PRINCIPLES:
 * 1. Fields should be STABLE — avoid changing field names/types once released
 * 2. Fields should be OPTIONAL where real data may be missing (use `?:`)
 * 3. Use simple types (string, number, boolean) — easy to render, serialize
 * 4. Include a display-ready string for each complex field (e.g., locationDisplay)
 * 5. Never expose raw API response shapes — always map to canonical
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

// ============================================================================
// JOB SOURCE DISCRIMINATOR
// ============================================================================

/**
 * Identifies the origin of job data.
 *
 * WHY THIS MATTERS:
 * - Debugging: When something looks wrong, knowing the source helps trace issues
 * - Analytics: Track which sources provide most/best data
 * - Future-proofing: Easy to add new sources (e.g., "agency-direct", "linkedin")
 *
 * CURRENT SOURCES:
 * - "usajobs": Jobs from USAJOBS.gov API (Phase 2)
 * - "mock": Our local mock data for development
 * - "other": Catch-all for future sources or manual entries
 *
 * EXAMPLE:
 * When a mapper processes a USAJOBS payload, it sets source = "usajobs".
 * If the UI shows unexpected data, we can check diagnostics.source to see
 * if it came from USAJOBS vs our mock data.
 */
export type JobSource = 'usajobs' | 'mock' | 'other';

// ============================================================================
// NORMALIZED LOCATION
// ============================================================================

/**
 * Structured location data for filtering and display.
 *
 * WHY A SEPARATE TYPE:
 * Raw job data often has inconsistent location formats:
 * - "Washington, DC"
 * - "Washington, District of Columbia, US"
 * - "Anywhere in the U.S. (remote job)"
 *
 * By normalizing into components, we enable:
 * 1. Consistent filtering (filter by state code, not string matching)
 * 2. Consistent display (format however UI needs)
 * 3. Location-based features (distance calculations, locality pay lookup)
 *
 * EXAMPLE:
 * Input from USAJOBS: "San Antonio, Texas"
 * Normalized: { city: "San Antonio", state: "TX", country: "US" }
 * Display: "San Antonio, TX" (using locationDisplay field)
 */
export interface NormalizedLocation {
  /**
   * City name, if known.
   * Example: "Washington", "San Antonio", "Denver"
   * May be undefined for remote jobs or when city is not specified.
   */
  city?: string;

  /**
   * State/province code (2-letter for US states).
   * Example: "DC", "TX", "CO", "CA"
   * May be undefined for international or remote jobs.
   */
  state?: string;

  /**
   * Country code (ISO 3166-1 alpha-2).
   * Example: "US", "DE", "JP"
   * Defaults to "US" for most federal jobs.
   */
  country?: string;

  /**
   * Whether this is a remote/telework position.
   * True = position can be performed from anywhere.
   * This is separate from teleworkEligibility which describes hybrid options.
   */
  isRemote?: boolean;
}

// ============================================================================
// PAY RANGE
// ============================================================================

/**
 * Structured salary/compensation range.
 *
 * WHY A SEPARATE TYPE:
 * Federal pay is complex:
 * - GS positions have steps within grades
 * - Locality pay varies by location
 * - Some positions are "salary negotiable"
 * - Different pay plans: GS, WG, SES, etc.
 *
 * This type captures the range and plan for display and comparison.
 *
 * EXAMPLE:
 * A GS-14 in DC might have:
 * { min: 122198, max: 158860, currency: "USD", payPlan: "GS" }
 */
export interface PayRange {
  /**
   * Minimum annual salary in the range (step 1 or negotiated min).
   * Undefined if salary is not disclosed.
   */
  min?: number;

  /**
   * Maximum annual salary in the range (step 10 or negotiated max).
   * Undefined if salary is not disclosed.
   */
  max?: number;

  /**
   * Currency code (ISO 4217). Almost always "USD" for federal jobs.
   * Included for future international support.
   */
  currency?: string;

  /**
   * Federal pay plan code.
   * Common values: "GS" (General Schedule), "WG" (Wage Grade),
   * "SES" (Senior Executive Service), "SL" (Senior Level)
   */
  payPlan?: string;

  /**
   * Display-ready salary string for UI rendering.
   * Example: "$122,198 - $158,860", "Salary negotiable", "Varies by location"
   */
  displayText?: string;
}

// ============================================================================
// JOB CARD MODEL (Lightweight for lists)
// ============================================================================

/**
 * The canonical model for job cards/list items.
 *
 * DESIGN RATIONALE:
 * This type contains ONLY the fields needed to render a job in a list view.
 * It's intentionally minimal to:
 * 1. Keep list rendering fast (small objects)
 * 2. Reduce API payload size (when fetching search results)
 * 3. Ensure card UI works even with incomplete data
 *
 * REQUIRED vs OPTIONAL:
 * - `id`: REQUIRED - needed for React keys and API calls
 * - `title`: REQUIRED - can't render a job without a title
 * - `source`: REQUIRED - must always know where data came from
 * - Everything else: OPTIONAL - UI shows fallbacks for missing data
 *
 * USAGE:
 * This is the PRIMARY type used by:
 * - Job search results list
 * - Saved jobs list
 * - Job alerts list
 * - "Recommended roles" cards
 */
export interface JobCardModel {
  // ==========================================================================
  // IDENTIFIERS
  // ==========================================================================

  /**
   * Unique identifier for this job.
   * For USAJOBS: the control number (e.g., "USAJ-12345")
   * For mock: numeric ID as string (e.g., "1", "2")
   * Must be stable for the lifetime of the job posting.
   */
  id: string;

  /**
   * Source system that provided this job data.
   * Used for debugging and analytics.
   */
  source: JobSource;

  // ==========================================================================
  // CORE DISPLAY FIELDS
  // ==========================================================================

  /**
   * Job title/position title.
   * Example: "Program Analyst", "IT Specialist (INFOSEC)"
   * This is the REQUIRED human-readable name for the position.
   */
  title: string;

  /**
   * Federal occupational series code.
   * Example: "0343" (Management/Program Analyst), "2210" (IT Specialist)
   * Format: 4-digit string (leading zeros preserved).
   * May be undefined for non-GS positions or if not provided.
   */
  seriesCode?: string;

  /**
   * Grade level (for GS positions) or equivalent.
   * Example: "GS-14", "GS-12/13", "SES"
   * Display-ready string, may include ranges.
   */
  gradeLevel?: string;

  // ==========================================================================
  // ORGANIZATION FIELDS
  // ==========================================================================

  /**
   * Name of the hiring agency/organization.
   * Example: "Department of Defense", "Veterans Affairs"
   * This is the top-level organization name.
   */
  organizationName?: string;

  /**
   * Sub-agency or department name.
   * Example: "Office of the Secretary", "Naval Sea Systems Command"
   * More specific than organizationName.
   */
  departmentName?: string;

  // ==========================================================================
  // LOCATION FIELDS
  // ==========================================================================

  /**
   * Structured, normalized location data.
   * Use for filtering and location-based calculations.
   */
  location?: NormalizedLocation;

  /**
   * Display-ready location string.
   * Example: "Washington, DC", "Remote", "Multiple Locations"
   * Always use this for UI rendering, not the structured location.
   */
  locationDisplay?: string;

  // ==========================================================================
  // COMPENSATION FIELDS
  // ==========================================================================

  /**
   * Salary/compensation range.
   * Use payRange.displayText for UI rendering.
   */
  payRange?: PayRange;

  /**
   * Estimated total compensation (salary + benefits value).
   * This is PathOS-computed, not from the job posting.
   * Useful for comparing total value of positions.
   */
  estimatedTotalComp?: number;

  // ==========================================================================
  // WORK ARRANGEMENT FIELDS
  // ==========================================================================

  /**
   * Employment type/appointment type.
   * Example: "Permanent", "Term", "Temporary", "Detail"
   * Display-ready string.
   */
  employmentType?: string;

  /**
   * Work schedule.
   * Example: "Full-time", "Part-time", "Intermittent"
   */
  workSchedule?: string;

  /**
   * Telework/remote work eligibility.
   * Example: "Remote", "Telework Eligible", "On-site Only", "Hybrid"
   * Display-ready string describing work location flexibility.
   */
  teleworkEligibility?: string;

  // ==========================================================================
  // DATES
  // ==========================================================================

  /**
   * When the job was posted/opened.
   * ISO 8601 format: "2024-11-15T00:00:00Z"
   */
  openDate?: string;

  /**
   * When the job closes/application deadline.
   * ISO 8601 format: "2024-12-15T23:59:59Z"
   * May be "Open Until Filled" in which case this is undefined.
   */
  closeDate?: string;

  // ==========================================================================
  // EXTERNAL LINKS
  // ==========================================================================

  /**
   * URL to the original job posting.
   * Example: "https://www.usajobs.gov/job/123456789"
   * Users click this to view full details on the source site.
   */
  postingUrl?: string;

  /**
   * URL to apply for the job.
   * May be same as postingUrl or a direct application link.
   */
  applyUrl?: string;

  // ==========================================================================
  // COMPUTED/PATHOSS-SPECIFIC FIELDS
  // ==========================================================================

  /**
   * Match percentage to user's profile (0-100).
   * Computed by PathOS matching algorithm.
   * May be undefined if no profile is configured.
   */
  matchPercent?: number;

  /**
   * Retirement impact assessment.
   * Example: "+2 years", "-6 months", "No change"
   * Computed by PathOS based on user's current retirement status.
   */
  retirementImpact?: string;

  /**
   * Tags/badges for quick scanning in list views.
   * Computed by the mapper based on job attributes.
   *
   * EXAMPLES:
   * - "Remote" (if telework = full remote)
   * - "GS-14" (grade badge)
   * - "Open to Public" (if open to non-federal candidates)
   * - "Closing Soon" (if close date is within 7 days)
   * - "Higher Pay" (if salary > user's current)
   *
   * DESIGN NOTE:
   * These are computed by the adapter/mapper layer, NOT raw data.
   * This keeps tag logic centralized and consistent.
   */
  tags: string[];
}

// ============================================================================
// JOB DETAIL MODEL (Full data for detail views)
// ============================================================================

/**
 * Extended model with additional fields for detail views.
 *
 * EXTENDS JobCardModel:
 * This type includes all JobCardModel fields PLUS detail-specific fields.
 * This means you can pass a JobDetailModel anywhere a JobCardModel is expected.
 *
 * WHEN TO USE:
 * - Job details page
 * - Job details slide-over panel
 * - Resume tailoring context (need full job description)
 * - PathAdvisor context (need duties for advice)
 *
 * LAZY LOADING PATTERN:
 * In Phase 2, we might:
 * 1. Fetch JobCardModel[] for search results (fast, lightweight)
 * 2. Fetch JobDetailModel when user clicks a specific job (complete data)
 */
export interface JobDetailModel extends JobCardModel {
  // ==========================================================================
  // DETAILED IDENTIFIERS
  // ==========================================================================

  /**
   * The job announcement number (often different from id).
   * Example: "DE-12345-24-00001"
   * This is what users reference when talking to HR.
   */
  announcementNumber?: string;

  /**
   * Position ID or control number from the source system.
   * Example: "HHS-CDC-DE-24-12345678"
   */
  positionId?: string;

  // ==========================================================================
  // JOB DESCRIPTION CONTENT
  // ==========================================================================

  /**
   * Brief summary/overview of the position.
   * Plain text, 1-3 paragraphs.
   */
  summary?: string;

  /**
   * Full job description as HTML.
   * Sanitized for safe rendering (no scripts, safe tags only).
   */
  descriptionHtml?: string;

  /**
   * List of major duties and responsibilities.
   * Each item is a single duty statement.
   */
  duties?: string[];

  // ==========================================================================
  // QUALIFICATION REQUIREMENTS
  // ==========================================================================

  /**
   * Minimum experience requirements.
   * Example: "1 year specialized experience at GS-13 or equivalent"
   */
  qualificationsMinimum?: string;

  /**
   * Education requirements or substitutions.
   * Example: "Master's degree or 2 years graduate education"
   */
  qualificationsEducation?: string;

  /**
   * Specialized experience requirements (detailed bullets).
   */
  qualificationsSpecialized?: string[];

  /**
   * Knowledge, Skills, and Abilities (KSAs) required.
   * Traditional federal resume evaluation criteria.
   */
  ksas?: string[];

  // ==========================================================================
  // HIRING INFORMATION
  // ==========================================================================

  /**
   * Hiring paths this job is open to.
   * Examples: "Federal employees - Competitive service", "Veterans",
   * "Recent graduates", "General public"
   */
  hiringPaths?: string[];

  /**
   * Whether open to the public (non-federal candidates).
   */
  isOpenToPublic?: boolean;

  /**
   * Promotion potential (target grade if different from announced).
   * Example: "GS-15" (for a GS-14 with promotion potential)
   */
  promotionPotential?: string;

  /**
   * Whether this is a supervisory position.
   */
  isSupervisory?: boolean;

  // ==========================================================================
  // SECURITY & CLEARANCE
  // ==========================================================================

  /**
   * Required security clearance level.
   * Example: "Secret", "Top Secret", "Public Trust"
   */
  clearanceLevel?: string;

  /**
   * Drug testing requirement.
   */
  drugTestRequired?: boolean;

  // ==========================================================================
  // TRAVEL & RELOCATION
  // ==========================================================================

  /**
   * Travel requirement percentage or description.
   * Example: "25% or less", "Occasional travel", "Not required"
   */
  travelRequirement?: string;

  /**
   * Whether relocation expenses are authorized.
   */
  relocationAuthorized?: boolean;

  /**
   * Whether PCS (Permanent Change of Station) is authorized.
   * Relevant for military/federal employees.
   */
  pcsAuthorized?: boolean;

  // ==========================================================================
  // APPLICATION PROCESS
  // ==========================================================================

  /**
   * How to apply instructions.
   * Each item is a step in the application process.
   */
  howToApply?: string[];

  /**
   * Required application documents.
   * Example: ["Resume", "Transcripts", "SF-50", "DD-214"]
   */
  requiredDocuments?: string[];

  /**
   * Estimated timeline for hiring process.
   * Example: "4-8 weeks for initial review"
   */
  estimatedTimeline?: string;

  // ==========================================================================
  // CONTACT INFORMATION
  // ==========================================================================

  /**
   * Point of contact name.
   */
  contactName?: string;

  /**
   * Contact email address.
   */
  contactEmail?: string;

  /**
   * Contact phone number.
   */
  contactPhone?: string;

  // ==========================================================================
  // PATHOSS ENHANCED FIELDS
  // ==========================================================================

  /**
   * PathAdvisor-generated note about this position.
   * Example: "Competition is likely high for this GS-14 position..."
   */
  pathAdvisorNote?: string;

  /**
   * Skills match percentage (PathOS computed).
   */
  skillsMatchPercent?: number;

  /**
   * Keyword match percentage (PathOS computed).
   */
  keywordMatchPercent?: number;
}

// ============================================================================
// JOB DIAGNOSTICS
// ============================================================================

/**
 * Diagnostic information attached to every canonical job model.
 *
 * WHY DIAGNOSTICS:
 * 1. DEBUGGING: When something looks wrong, check diagnostics.warnings
 * 2. DATA QUALITY: Track which fields are commonly missing
 * 3. VERSIONING: Know which mapper version produced this data
 * 4. TRACEABILITY: raw field preserves original payload for investigation
 *
 * USAGE:
 * Diagnostics are NOT for UI rendering. They're for:
 * - Developer debugging
 * - Data quality monitoring
 * - Support investigations
 *
 * The dev-only debug panel in job details shows this information.
 */
export interface JobDiagnostics {
  /**
   * The original raw payload from the source.
   * Preserved for debugging and investigation.
   *
   * IMPORTANT: Never access this in UI components!
   * Always use the canonical model fields.
   *
   * Type is `unknown` because each source has different shapes.
   */
  raw: unknown;

  /**
   * Warnings generated during mapping.
   *
   * EXAMPLES:
   * - "Missing title, using fallback: 'Untitled Position'"
   * - "Invalid salary format: 'negotiable'"
   * - "Location could not be normalized: 'Various'"
   *
   * An empty array means the mapping was clean (no issues).
   */
  warnings: string[];

  /**
   * Source system identifier.
   * Matches JobCardModel.source.
   */
  source: JobSource;

  /**
   * Version of the mapper that produced this canonical model.
   *
   * FORMAT: "{source}-v{version}"
   * EXAMPLES:
   * - "usajobs-v1" (first USAJOBS mapper)
   * - "mock-v1" (first mock data mapper)
   * - "usajobs-v2" (hypothetical updated mapper)
   *
   * WHY VERSIONED:
   * When we fix mapping bugs, old data may have different issues.
   * Knowing the mapper version helps diagnose problems.
   */
  mapperVersion: string;

  /**
   * When this data was fetched/mapped.
   * ISO 8601 format: "2024-12-12T10:30:00.000Z"
   *
   * WHY TIMESTAMP:
   * - Job data can change (salary updates, closing date extensions)
   * - Helps identify stale cached data
   * - Useful for debugging "this looked different yesterday"
   */
  fetchedAtISO: string;
}

// ============================================================================
// COMBINED TYPES FOR API RESPONSES
// ============================================================================

/**
 * JobCardModel with attached diagnostics.
 * This is what the adapter layer returns for list/card views.
 */
export type JobCardWithDiagnostics = JobCardModel & {
  diagnostics: JobDiagnostics;
};

/**
 * JobDetailModel with attached diagnostics.
 * This is what the adapter layer returns for detail views.
 */
export type JobDetailWithDiagnostics = JobDetailModel & {
  diagnostics: JobDiagnostics;
};

// ============================================================================
// TYPE GUARDS (Runtime type checking)
// ============================================================================

/**
 * Type guard to check if an object is a valid JobCardModel.
 *
 * WHEN TO USE:
 * When receiving data from an untrusted source (API, localStorage)
 * and you need to verify it has the required fields.
 *
 * EXAMPLE:
 * ```typescript
 * const maybeJob = JSON.parse(localStorage.getItem('selectedJob') || '{}');
 * if (isJobCardModel(maybeJob)) {
 *   // TypeScript now knows maybeJob is JobCardModel
 *   console.log(maybeJob.title);
 * }
 * ```
 */
export function isJobCardModel(obj: unknown): obj is JobCardModel {
  // Check if obj is an object
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Cast to any to check fields (we're doing runtime checking)
  const candidate = obj as Record<string, unknown>;

  // Check required fields exist and have correct types
  // id: string (required)
  if (typeof candidate['id'] !== 'string') {
    return false;
  }

  // title: string (required)
  if (typeof candidate['title'] !== 'string') {
    return false;
  }

  // source: JobSource (required)
  const validSources = ['usajobs', 'mock', 'other'];
  if (!validSources.includes(candidate['source'] as string)) {
    return false;
  }

  // tags: string[] (required)
  if (!Array.isArray(candidate['tags'])) {
    return false;
  }

  // All required fields present and valid
  return true;
}

/**
 * Type guard to check if an object is a valid JobDetailModel.
 *
 * JobDetailModel extends JobCardModel, so we first check card fields
 * then verify any detail-specific requirements.
 */
export function isJobDetailModel(obj: unknown): obj is JobDetailModel {
  // First check if it's a valid JobCardModel
  if (!isJobCardModel(obj)) {
    return false;
  }

  // JobDetailModel doesn't have additional REQUIRED fields beyond JobCardModel,
  // so if it passes the card check, it's a valid detail model.
  // Optional fields are... optional.
  return true;
}
