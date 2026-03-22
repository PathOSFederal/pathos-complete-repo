/**
 * ============================================================================
 * JOB SEARCH API MODULE (Day 12 - Canonical Model Refactor)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This file provides the API layer for job search functionality. It now uses
 * the canonical job model system introduced in Day 12, ensuring all job data
 * returned to consumers is in the standardized format.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────┐     ┌─────────────┐     ┌────────────────┐     ┌──────────┐
 * │     UI      │ --> │   Store     │ --> │ THIS FILE      │ --> │ Mock     │
 * │ (Components)│     │ (Zustand)   │     │ (lib/api/      │     │ Data     │
 * │             │     │             │     │  job-search.ts)│     │          │
 * └─────────────┘     └─────────────┘     └────────────────┘     └──────────┘
 *                                                │
 *                                                ▼
 *                                    ┌─────────────────────┐
 *                                    │  ADAPTER LAYER      │
 *                                    │  (lib/jobs/adapters)│
 *                                    │  Maps raw → canon   │
 *                                    └─────────────────────┘
 *
 * KEY CHANGES (Day 12):
 * 1. All job results now use JobCardModel (canonical)
 * 2. Job details use JobDetailModel (canonical)
 * 3. Raw mock data is mapped through adapters before being returned
 * 4. Diagnostics are attached for debugging
 *
 * IMPORTANT ARCHITECTURE RULE:
 * UI and stores MUST only consume canonical models.
 * Raw data is NEVER exposed - it lives only in diagnostics.raw.
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import { mockGet } from './client';
import {
  mockJobs,
  mockRecommendedRoles,
  createMockJobAlerts,
} from '@/lib/mock/job-search';
import type { JobResult, RecommendedRole, JobAlerts as LegacyJobAlerts, JobAlertSummaryItem as LegacyJobAlertSummaryItem } from '@/lib/mock/job-search';
import {
  filterJobs,
  shouldSimulateError,
  SimulatedSearchError,
} from '@/lib/job-search';
import type { JobSearchFilters } from '@/store/jobSearchStore';

// Import canonical model types and adapter
// NOTE: JobDetailModel is documented in comments but not directly referenced in code
import type { JobCardModel } from '@/lib/jobs';
import {
  mapToCanonicalJobCard,
  mapToCanonicalJobCards,
  mapToCanonicalJobDetail,
  stripDiagnostics,
} from '@/lib/jobs';

// Import API response types
// NOTE: JobSearchResponse is defined in types but only used as return type annotation in calling code
import type {
  JobDetailResponse,
  JobAlertsResponse,
  JobAlertItem,
  RecommendedRolesResponse,
  RecommendedRoleItem,
} from './types';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Result shape returned by fetchJobSearchResults.
 * 
 * WHY THIS TYPE:
 * This defines the contract between the API layer and consumers (stores/UI).
 * It includes all information needed to display results and handle edge cases.
 * 
 * DAY 12 UPDATE:
 * Now uses canonical JobCardModel instead of raw JobResult.
 */
export interface JobSearchApiResult {
  /**
   * Array of jobs matching the filters.
   * These are CANONICAL JobCardModel objects, not raw data.
   */
  jobs: JobCardModel[];

  /**
   * Total count of matching jobs
   * (For paginated results in future, this would be total across all pages)
   */
  total: number;

  /**
   * Optional warnings about filter limitations or data quality
   * Example: "Some jobs may not have clearance information"
   */
  warnings: string[];
}

/**
 * Subset of JobSearchFilters that the API explicitly supports.
 * This documents which filters are actually applied.
 *
 * For Day 12, we support ALL filters defined in JobSearchFilters.
 * Using Partial<JobSearchFilters> to indicate all fields are optional.
 */
export type JobSearchApiFilters = Partial<JobSearchFilters>;

/**
 * ============================================================================
 * INTERNAL HELPERS
 * ============================================================================
 */

/**
 * Maps raw mock JobResult[] to canonical JobCardModel[].
 *
 * HOW IT WORKS:
 * 1. Each raw job is passed through the mock adapter
 * 2. Diagnostics are attached to each result
 * 3. We strip diagnostics for the return value (store can request them separately)
 *
 * @param rawJobs - Array of raw JobResult from mock data
 * @returns Array of canonical JobCardModel
 */
function mapRawJobsToCanonical(rawJobs: JobResult[]): JobCardModel[] {
  // Use the adapter to map all jobs at once
  const mappedWithDiagnostics = mapToCanonicalJobCards(rawJobs, 'mock');

  // Strip diagnostics for the return value
  // (UI components work with JobCardModel, not JobCardWithDiagnostics)
  const canonicalJobs: JobCardModel[] = [];
  for (let i = 0; i < mappedWithDiagnostics.length; i++) {
    canonicalJobs.push(stripDiagnostics(mappedWithDiagnostics[i]));
  }

  return canonicalJobs;
}

/**
 * ============================================================================
 * API FUNCTIONS
 * ============================================================================
 */

/**
 * Fetches all available job listings (unfiltered).
 *
 * WHY THIS EXISTS:
 * Sometimes you need all jobs without filtering, for example:
 * - Initial page load before user sets filters
 * - Admin/dashboard views showing all listings
 * - Building filter option lists dynamically
 *
 * DAY 12 UPDATE:
 * Now returns canonical JobCardModel[] instead of raw JobResult[].
 *
 * @returns Promise resolving to array of canonical jobs
 */
export function fetchJobs(): Promise<JobCardModel[]> {
  return mockGet(function() {
    // Map raw mock data to canonical format
    return mapRawJobsToCanonical(mockJobs);
  });
}

/**
 * Fetches job search results with full filter support.
 *
 * HOW IT WORKS:
 * 1. Check for error simulation trigger (dev-only)
 * 2. Apply all provided filters using pure filter function
 * 3. Map filtered results to canonical format
 * 4. Return results wrapped in standardized result shape
 *
 * DAY 12 CHANGES:
 * - Returns JobCardModel[] (canonical) instead of JobResult[] (raw)
 * - All jobs go through the adapter layer before being returned
 * - Warnings from mapping are included in the result
 *
 * FILTER BEHAVIOR:
 * - All filters are applied with AND logic (job must match all)
 * - Empty/null/undefined filters are ignored (match everything)
 * - Missing job fields are handled gracefully (see filter-jobs.ts)
 *
 * EXAMPLE USAGE:
 * ```typescript
 * // Search with filters
 * const result = await fetchJobSearchResults({
 *   query: 'analyst',
 *   location: 'dc',
 *   gradeBand: 'gs14',
 *   appointmentTypes: ['permanent'],
 *   teleworkPreference: 'remote-only'
 * });
 * 
 * // Access canonical fields
 * result.jobs.forEach(job => {
 *   console.log(job.title);           // Canonical field (was "role")
 *   console.log(job.organizationName); // Canonical field (was "agency")
 *   console.log(job.gradeLevel);      // Canonical field (was "grade")
 * });
 * ```
 *
 * ERROR SIMULATION (Dev Only):
 * Include "__FAIL__" in the query to simulate an API error.
 *
 * @param filters - Filter criteria (all optional)
 * @returns Promise resolving to JobSearchApiResult
 * @throws SimulatedSearchError if query contains "__FAIL__" (dev only)
 */
export function fetchJobSearchResults(
  filters?: JobSearchApiFilters
): Promise<JobSearchApiResult> {
  return mockGet(function() {
    // ========================================================================
    // STEP 1: Handle empty filters case
    // ========================================================================
    const effectiveFilters: JobSearchFilters = {
      query: '',
      segment: 'federal',
      location: null,
      gradeBand: null,
      agency: null,
      workType: null,
      seriesCode: null,
      seriesCodes: [],
      appointmentTypes: [],
      workSchedules: [],
      promotionPotential: null,
      supervisoryStatuses: [],
      teleworkPreference: null,
      travelFrequency: null,
      clearanceLevels: [],
      positionSensitivities: [],
      hiringPaths: [],
      internalExternal: null,
      qualificationEmphasis: null,
      trajectoryPreference: null,
      retirementImpactPreference: null,
      compensationFocus: null
    };

    // Merge provided filters into defaults
    if (filters) {
      const keys = Object.keys(filters) as Array<keyof JobSearchFilters>;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const filterValue = filters[key];
        if (filterValue !== undefined) {
          (effectiveFilters as unknown as Record<string, unknown>)[key as string] = filterValue;
        }
      }
    }

    // ========================================================================
    // STEP 2: Check for dev-only error simulation
    // ========================================================================
    if (shouldSimulateError(effectiveFilters)) {
      const error = new SimulatedSearchError(
        'Simulated API error for testing. Remove "__FAIL__" from query to fix.'
      );
      throw error;
    }

    // ========================================================================
    // STEP 3: Apply filters using pure filter function
    // Note: filterJobs still works with raw JobResult for now
    // We map to canonical AFTER filtering
    // ========================================================================
    const filterResult = filterJobs(mockJobs, effectiveFilters);

    // ========================================================================
    // STEP 4: Map filtered results to canonical format
    // This is the key Day 12 change - all jobs go through adapter
    // ========================================================================
    const canonicalJobs = mapRawJobsToCanonical(filterResult.jobs);

    // Collect any mapping warnings
    const allWarnings: string[] = [];

    // Add filter warnings
    for (let w = 0; w < filterResult.warnings.length; w++) {
      allWarnings.push(filterResult.warnings[w]);
    }

    // ========================================================================
    // STEP 5: Return canonical results
    // ========================================================================
    return {
      jobs: canonicalJobs,
      total: canonicalJobs.length,
      warnings: allWarnings
    };
  });
}

/**
 * Fetches a single job by ID with full detail.
 *
 * DAY 12 UPDATE:
 * Returns canonical JobDetailModel instead of raw JobResult.
 * Includes extended detail fields like duties, qualifications, etc.
 *
 * @param id - The job ID to fetch (string or number)
 * @returns Promise resolving to JobDetailResponse
 */
export function fetchJobDetail(id: string | number): Promise<JobDetailResponse> {
  return mockGet(function() {
    // Convert id to number for comparison with mock data
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    // Find the raw job in mock data
    let rawJob: JobResult | null = null;
    for (let i = 0; i < mockJobs.length; i++) {
      if (mockJobs[i].id === numericId) {
        rawJob = mockJobs[i];
        break;
      }
    }

    if (!rawJob) {
      return {
        job: null,
        diagnostics: undefined
      };
    }

    // Map to canonical detail model
    const detailWithDiagnostics = mapToCanonicalJobDetail(rawJob, 'mock');

    // Extract diagnostics separately
    const { diagnostics, ...jobDetail } = detailWithDiagnostics;

    return {
      job: jobDetail,
      diagnostics: diagnostics
    };
  });
}

/**
 * Fetches a single job by ID (legacy format for backward compatibility).
 *
 * @deprecated Use fetchJobDetail instead for canonical format
 * @param id - The job ID to fetch
 * @returns Promise resolving to JobCardModel or null if not found
 */
export function fetchJobById(id: number): Promise<JobCardModel | null> {
  return mockGet(function() {
    for (let i = 0; i < mockJobs.length; i++) {
      if (mockJobs[i].id === id) {
        // Map to canonical format
        const mappedWithDiagnostics = mapToCanonicalJobCard(mockJobs[i], 'mock');
        return stripDiagnostics(mappedWithDiagnostics);
      }
    }
    return null;
  });
}

/**
 * Fetches recommended roles based on user profile.
 *
 * WHY THIS EXISTS:
 * Shows personalized role recommendations on the job search page.
 * These are "suggested next moves" based on the user's current position.
 *
 * DAY 12 UPDATE:
 * Returns RecommendedRolesResponse with canonical field names.
 *
 * @returns Promise resolving to array of recommended roles
 */
export function fetchRecommendedRoles(): Promise<RecommendedRolesResponse> {
  return mockGet(function() {
    // Map mock recommended roles to canonical format
    const canonicalRoles: RecommendedRoleItem[] = [];

    for (let i = 0; i < mockRecommendedRoles.length; i++) {
      const raw = mockRecommendedRoles[i];
      canonicalRoles.push({
        id: raw.id,
        title: raw.title,
        locationDisplay: raw.location,
        matchPercent: raw.matchPercent,
        tags: raw.tags
      });
    }

    return {
      roles: canonicalRoles
    };
  });
}

/**
 * Fetches job alerts for the user.
 *
 * WHY THIS EXISTS:
 * Job alerts notify users about new postings matching their saved searches.
 * This function returns the current alert state.
 *
 * DAY 12 UPDATE:
 * Returns JobAlertsResponse with canonical field names.
 *
 * @returns Promise resolving to JobAlertsResponse
 */
export function fetchJobAlerts(): Promise<JobAlertsResponse> {
  return mockGet(function() {
    const mockAlerts = createMockJobAlerts();

    // Map to canonical format
    const canonicalItems: JobAlertItem[] = [];

    for (let i = 0; i < mockAlerts.items.length; i++) {
      const raw = mockAlerts.items[i];
      canonicalItems.push({
        id: raw.id,
        savedSearchId: raw.savedSearchId,
        savedSearchName: raw.savedSearchName,
        title: raw.title,
        gradeLevel: raw.grade,
        organizationName: raw.agency,
        locationDisplay: raw.location,
        matchPercent: raw.match,
        estimatedCompDisplay: raw.estComp,
        createdAtISO: raw.createdAt,
        isNew: raw.isNew,
        // Legacy fields for backward compatibility
        grade: raw.grade,
        agency: raw.agency,
        location: raw.location,
        match: raw.match,
        estComp: raw.estComp,
        createdAt: raw.createdAt
      });
    }

    return {
      totalNew: mockAlerts.totalNew,
      items: canonicalItems
    };
  });
}

/**
 * ============================================================================
 * LEGACY RE-EXPORTS FOR BACKWARD COMPATIBILITY
 * ============================================================================
 * These exports maintain compatibility with existing code that imports
 * from this file. They should be migrated to the new canonical types
 * over time.
 */

// Re-export types for type-safe consumption
export type { JobResult, RecommendedRole };

// Re-export legacy types with deprecation note
/** @deprecated Use JobAlertsResponse from @/lib/api/types instead */
export type { LegacyJobAlerts as JobAlerts, LegacyJobAlertSummaryItem as JobAlertSummaryItem };

// Re-export raw mock data for stores that need synchronous initial state
// NOTE: This is a temporary pattern for Tier 1. In production, stores would
// start with empty state and load data via API calls.
export { mockJobs, mockRecommendedRoles, createMockJobAlerts } from '@/lib/mock/job-search';
