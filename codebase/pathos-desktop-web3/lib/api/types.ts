/**
 * ============================================================================
 * API RESPONSE TYPES (Day 12)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Defines the TypeScript types for API responses used by the job search
 * functionality. These types represent the "contract" between the API layer
 * and the Zustand stores/UI components.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
 * │  API Endpoints  │ --> │  THIS FILE       │ --> │  Stores/UI     │
 * │  (route.ts)     │     │  (Response Types)│     │  (consumers)   │
 * └─────────────────┘     └──────────────────┘     └────────────────┘
 *
 * WHY SEPARATE TYPES FILE:
 * 1. SINGLE SOURCE OF TRUTH: All API shapes defined in one place
 * 2. IMPORT CYCLES: Avoids circular imports between API and stores
 * 3. DOCUMENTATION: Clear contract for what the API returns
 * 4. PHASE 2 READY: Easy to update when backend is connected
 *
 * KEY PRINCIPLE (Day 12):
 * All job-related responses now use CANONICAL models from lib/jobs.
 * Raw data shapes are NEVER exposed to UI or stores.
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import type {
  JobCardModel,
  JobDetailModel,
  JobDiagnostics,
} from '@/lib/jobs';

// ============================================================================
// JOB SEARCH API RESPONSE TYPES
// ============================================================================

/**
 * Response type for job search results.
 *
 * DESIGN NOTES:
 * - `jobs`: Array of CANONICAL JobCardModel (NOT raw data)
 * - `total`: Total count for pagination (may differ from jobs.length if paginated)
 * - `warnings`: Any issues during search/mapping (for debugging)
 * - `meta`: Optional metadata about the search operation
 *
 * EXAMPLE USAGE:
 * ```typescript
 * const response: JobSearchResponse = await fetchJobSearchResults(filters);
 *
 * // Access canonical job fields
 * response.jobs.forEach(job => {
 *   console.log(job.title);          // Canonical field
 *   console.log(job.organizationName); // Canonical field
 * });
 *
 * // Check for warnings
 * if (response.warnings.length > 0) {
 *   console.warn('Search had issues:', response.warnings);
 * }
 * ```
 */
export interface JobSearchResponse {
  /**
   * Array of jobs matching the search filters.
   * These are CANONICAL JobCardModel objects, not raw data.
   * Each job has been mapped through the adapter layer.
   */
  jobs: JobCardModel[];

  /**
   * Total count of matching jobs.
   *
   * WHY SEPARATE FROM jobs.length:
   * In paginated responses, this is the TOTAL matches, not just current page.
   * Example: total=500, but jobs.length=25 (page 1 of 20)
   *
   * For Tier 1 (no pagination), this equals jobs.length.
   */
  total: number;

  /**
   * Warnings from the search/mapping process.
   *
   * EXAMPLES:
   * - "Some jobs may not have clearance information"
   * - "Filter 'X' was applied client-side"
   * - "3 jobs had mapping warnings"
   *
   * Empty array means the operation completed cleanly.
   */
  warnings: string[];

  /**
   * Optional metadata about the search operation.
   * Useful for debugging and analytics.
   */
  meta?: JobSearchMeta;
}

/**
 * Metadata for a job search operation.
 */
export interface JobSearchMeta {
  /**
   * When the search was executed (ISO 8601).
   */
  executedAtISO: string;

  /**
   * How long the search took (milliseconds).
   */
  durationMs?: number;

  /**
   * Number of jobs that had mapping warnings.
   */
  jobsWithWarnings?: number;

  /**
   * Whether results were from cache.
   */
  fromCache?: boolean;
}

/**
 * Response type for job detail requests.
 *
 * DESIGN NOTES:
 * - `job`: CANONICAL JobDetailModel (NOT raw data)
 * - `diagnostics`: Full diagnostics for debugging (dev-only display)
 *
 * EXAMPLE USAGE:
 * ```typescript
 * const response: JobDetailResponse = await fetchJobDetail(jobId);
 *
 * // Access canonical fields
 * console.log(response.job.title);
 * console.log(response.job.duties);      // Detail-only field
 * console.log(response.job.qualifications);
 *
 * // Access diagnostics in dev mode
 * if (process.env.NODE_ENV !== 'production') {
 *   console.log(response.diagnostics);
 * }
 * ```
 */
export interface JobDetailResponse {
  /**
   * The job detail model (or null if not found).
   */
  job: JobDetailModel | null;

  /**
   * Diagnostics from the mapping operation.
   * Contains raw data and warnings for debugging.
   */
  diagnostics?: JobDiagnostics;
}

// ============================================================================
// JOB ALERTS TYPES
// ============================================================================

/**
 * A single job alert item.
 *
 * CANONICAL INTEGRATION (Day 12):
 * Now uses canonical field names where applicable.
 * Old field names are kept for backward compatibility but deprecated.
 */
export interface JobAlertItem {
  /**
   * Unique identifier for this alert.
   */
  id: string;

  /**
   * ID of the saved search that triggered this alert.
   */
  savedSearchId: string;

  /**
   * Name of the saved search for display.
   */
  savedSearchName: string;

  /**
   * Job title (canonical field).
   */
  title: string;

  /**
   * Grade level (e.g., "GS-13").
   */
  gradeLevel: string;

  /**
   * Organization/agency name.
   */
  organizationName: string;

  /**
   * Display-ready location string.
   */
  locationDisplay: string;

  /**
   * Match percentage to saved search criteria.
   */
  matchPercent: number;

  /**
   * Estimated compensation display string.
   */
  estimatedCompDisplay: string;

  /**
   * When the alert was created (ISO 8601).
   */
  createdAtISO: string;

  /**
   * Whether this alert is new/unread.
   */
  isNew: boolean;

  // ==========================================================================
  // DEPRECATED FIELDS (kept for backward compatibility)
  // These will be removed in a future version.
  // ==========================================================================

  /**
   * @deprecated Use gradeLevel instead
   */
  grade?: string;

  /**
   * @deprecated Use organizationName instead
   */
  agency?: string;

  /**
   * @deprecated Use locationDisplay instead
   */
  location?: string;

  /**
   * @deprecated Use matchPercent instead
   */
  match?: number;

  /**
   * @deprecated Use estimatedCompDisplay instead
   */
  estComp?: string;

  /**
   * @deprecated Use createdAtISO instead
   */
  createdAt?: string;
}

/**
 * Response type for job alerts endpoint.
 */
export interface JobAlertsResponse {
  /**
   * Total count of new/unread alerts.
   */
  totalNew: number;

  /**
   * Array of alert items.
   */
  items: JobAlertItem[];
}

// ============================================================================
// RECOMMENDED ROLES TYPES
// ============================================================================

/**
 * A recommended role/career suggestion.
 *
 * These are PathOS-generated recommendations based on user profile.
 * They may or may not correspond to actual job postings.
 */
export interface RecommendedRoleItem {
  /**
   * Unique identifier.
   */
  id: string | number;

  /**
   * Role title.
   */
  title: string;

  /**
   * Location (display string).
   */
  locationDisplay: string;

  /**
   * Match percentage to user profile.
   */
  matchPercent: number;

  /**
   * Tags/badges for this recommendation.
   * Examples: "Higher pay", "Same location", "Leadership role"
   */
  tags: string[];
}

/**
 * Response type for recommended roles endpoint.
 */
export interface RecommendedRolesResponse {
  /**
   * Array of recommended roles.
   */
  roles: RecommendedRoleItem[];
}

// ============================================================================
// LEGACY TYPE ALIASES (For backward compatibility)
// ============================================================================

/**
 * @deprecated Use JobSearchResponse instead
 * This alias is kept for backward compatibility during migration.
 */
export interface JobSearchApiResult {
  jobs: JobCardModel[];
  total: number;
  warnings: string[];
}

/**
 * @deprecated Use JobAlertItem instead
 */
export type JobAlertSummaryItem = JobAlertItem;

/**
 * @deprecated Use JobAlertsResponse instead
 */
export type JobAlerts = JobAlertsResponse;
