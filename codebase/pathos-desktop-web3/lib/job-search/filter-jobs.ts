/**
 * ============================================================================
 * FILTER-JOBS.TS - Pure Job Filtering Functions
 * ============================================================================
 *
 * FILE PURPOSE:
 * This file contains pure functions for filtering job search results based on
 * user-selected filters. All functions are "pure" - meaning they:
 *   1. Have no side effects (don't modify input data or external state)
 *   2. Always return the same output for the same input
 *   3. Don't depend on or modify external state
 *
 * WHY PURE FUNCTIONS MATTER:
 * - TESTABILITY: Pure functions are trivial to unit test. You pass input and
 *   assert on output. No mocking required.
 * - PREDICTABILITY: Given the same inputs, you always get the same outputs.
 *   This makes debugging much easier.
 * - COMPOSABILITY: Pure functions can be combined and chained easily.
 * - SSR SAFETY: No reliance on browser APIs or localStorage.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────┐     ┌─────────────┐     ┌────────────────┐     ┌──────────┐
 * │     UI      │ --> │   Store     │ --> │  API Layer     │ --> │ Mock/    │
 * │ (Components)│     │ (Zustand)   │     │ (lib/api/*.ts) │     │ Backend  │
 * └─────────────┘     └─────────────┘     └────────────────┘     └──────────┘
 *                                                │
 *                                                ▼
 *                                    ┌─────────────────────┐
 *                                    │  THIS FILE          │
 *                                    │  (Pure Filtering)   │
 *                                    │  lib/job-search/    │
 *                                    │  filter-jobs.ts     │
 *                                    └─────────────────────┘
 *
 * The API layer calls these pure functions to filter mock data.
 * In the future, when a real backend exists, these functions could:
 *   - Be used for client-side pre-filtering before API calls
 *   - Be migrated to the backend as SQL queries or similar
 *   - Be used for client-side caching and re-filtering
 *
 * FUTURE BACKEND MIGRATION NOTE:
 * When PathAdvisor backend is implemented, the actual filtering will happen
 * server-side. This file will then serve as:
 *   1. Reference implementation for backend team
 *   2. Client-side cache filtering for instant UI feedback
 *   3. Fallback when offline (if we implement offline support)
 *
 * @version Day 11 - Job Search Filters & Saved Searches v1
 * ============================================================================
 */

import type { JobResult } from '@/lib/mock/job-search';
import type { JobSearchFilters } from '@/store/jobSearchStore';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Extended job record type that includes optional advanced fields.
 * 
 * WHY THIS EXISTS:
 * Our mock data doesn't have all the advanced filter fields (like clearanceLevel,
 * teleworkOption, etc.). This interface describes what a fully-featured job
 * record WOULD look like. We use this to understand what fields we're checking
 * and to document expected behavior.
 *
 * When the backend is implemented, job records should include these fields.
 * For now, we treat missing fields as "unknown" and handle them gracefully.
 */
export interface ExtendedJobRecord extends JobResult {
  // ============================================================================
  // EXISTING FIELDS (from JobResult):
  // - id: number
  // - role: string (job title)
  // - series: string (e.g., "0343")
  // - grade: string (e.g., "GS-14")
  // - location: string
  // - agency: string
  // - type: string (e.g., "Federal", "Military")
  // - estTotalComp: number
  // - retirementImpact: string
  // - matchPercent: number
  // ============================================================================

  // ============================================================================
  // OPTIONAL ADVANCED FIELDS (not in current mock data):
  // These fields will be populated when backend is available.
  // For filtering, we treat undefined as "unknown/any".
  // ============================================================================

  /**
   * Appointment type: "permanent", "term", "temporary", or "detail"
   * Example: A "term" appointment has a defined end date.
   */
  appointmentType?: string;

  /**
   * Work schedule: "full-time", "part-time", "intermittent", or "shift"
   */
  workSchedule?: string;

  /**
   * Whether this position is supervisory: "non-supervisory", "supervisory", "team-lead"
   */
  supervisoryStatus?: string;

  /**
   * Telework/remote work options: "remote", "telework-eligible", "on-site"
   */
  teleworkOption?: string;

  /**
   * Travel requirements as a percentage or category
   * Example: "none", "occasional", "frequent", "25%", "50%"
   */
  travelRequirement?: string;

  /**
   * Required security clearance level
   */
  clearanceLevel?: string;

  /**
   * Position sensitivity designation
   */
  positionSensitivity?: string;

  /**
   * Hiring paths this position is open to
   */
  hiringPaths?: string[];

  /**
   * Whether this is internal (agency/gov-wide only) or open to public
   */
  internalExternal?: string;

  /**
   * Promotion potential (target grade if different from current)
   * Example: A GS-12 position with promotion potential to GS-14
   */
  promotionPotentialGrade?: string;
}

/**
 * Result shape returned by the filter function.
 * This matches what the API will eventually return from the backend.
 */
export interface FilteredJobsResult {
  /**
   * Array of jobs that match all applied filters
   */
  jobs: JobResult[];

  /**
   * Total count of matching jobs (same as jobs.length for now)
   */
  total: number;

  /**
   * Optional warnings about filters that couldn't be fully applied
   * Example: "Clearance level filter applied, but some jobs lack this field"
   */
  warnings: string[];
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 * Small, reusable pure functions for common matching operations.
 */

/**
 * Checks if a text field contains the search query (case-insensitive).
 *
 * HOW IT WORKS:
 * 1. Convert both strings to lowercase for case-insensitive matching
 * 2. Check if the field contains the query using indexOf
 *
 * EXAMPLE:
 *   matchesText("Program Analyst", "analyst") => true
 *   matchesText("Program Analyst", "Manager")  => false
 *   matchesText("", "test")                    => false
 *
 * @param fieldValue - The field value to search in
 * @param query - The search query
 * @returns true if field contains query, false otherwise
 */
export function matchesText(fieldValue: string, query: string): boolean {
  // Empty query matches everything
  if (!query || query === '') {
    return true;
  }

  // Empty field value can't match a non-empty query
  if (!fieldValue || fieldValue === '') {
    return false;
  }

  // Case-insensitive substring matching
  return fieldValue.toLowerCase().indexOf(query.toLowerCase()) >= 0;
}

/**
 * Checks if a value matches any item in an array of allowed values.
 *
 * HOW IT WORKS:
 * 1. If allowedValues is empty or undefined, everything matches (no filter)
 * 2. Otherwise, check if fieldValue is in the allowedValues array
 *
 * EXAMPLE:
 *   matchesAny("permanent", ["permanent", "term"]) => true
 *   matchesAny("temporary", ["permanent", "term"]) => false
 *   matchesAny("anything", [])                     => true (no filter)
 *
 * @param fieldValue - The value to check
 * @param allowedValues - Array of allowed values (empty = allow all)
 * @returns true if matches or no filter applied, false otherwise
 */
export function matchesAny(fieldValue: string | undefined, allowedValues: string[]): boolean {
  // Empty filter array means "allow all"
  if (!allowedValues || allowedValues.length === 0) {
    return true;
  }

  // If field value is undefined/null, we treat it as "unknown"
  // Unknown values don't match when a specific filter is set
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    // DESIGN DECISION: When a filter is active but the job doesn't have this field,
    // we exclude the job. This is the conservative approach.
    // Alternative: We could include unknown values, but that may show irrelevant results.
    return false;
  }

  // Check if the field value is in the allowed list
  for (let i = 0; i < allowedValues.length; i++) {
    if (allowedValues[i] === fieldValue || 
        allowedValues[i].toLowerCase() === fieldValue.toLowerCase()) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if any item in a job's array field matches any of the allowed values.
 *
 * HOW IT WORKS:
 * Useful for fields like hiringPaths where a job might have multiple values
 * and the user might select multiple allowed values. We check for any overlap.
 *
 * EXAMPLE:
 *   matchesAnyInArray(["status", "veterans"], ["status"]) => true
 *   matchesAnyInArray(["public"], ["status", "veterans"]) => false
 *   matchesAnyInArray(["anything"], [])                   => true (no filter)
 *
 * @param fieldValues - Array of values from the job
 * @param allowedValues - Array of allowed values (empty = allow all)
 * @returns true if any overlap exists or no filter applied
 */
export function matchesAnyInArray(
  fieldValues: string[] | undefined,
  allowedValues: string[]
): boolean {
  // Empty filter array means "allow all"
  if (!allowedValues || allowedValues.length === 0) {
    return true;
  }

  // If job has no values for this field, exclude it when filter is active
  if (!fieldValues || fieldValues.length === 0) {
    return false;
  }

  // Check for any overlap between the two arrays
  for (let i = 0; i < fieldValues.length; i++) {
    for (let j = 0; j < allowedValues.length; j++) {
      if (fieldValues[i] === allowedValues[j] ||
          fieldValues[i].toLowerCase() === allowedValues[j].toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Matches a single value against a single filter value (for non-array filters).
 *
 * EXAMPLE:
 *   matchesSingle("remote-only", "remote-only") => true
 *   matchesSingle("on-site", "remote-only")     => false
 *   matchesSingle("anything", null)             => true (no filter)
 *
 * @param fieldValue - The job's field value
 * @param filterValue - The filter value (null = no filter)
 * @returns true if matches or no filter applied
 */
export function matchesSingle(
  fieldValue: string | undefined,
  filterValue: string | null
): boolean {
  // Null filter means "allow all"
  if (filterValue === null || filterValue === '') {
    return true;
  }

  // If field value is missing, exclude when filter is active
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    return false;
  }

  // Case-insensitive exact match
  return fieldValue.toLowerCase() === filterValue.toLowerCase();
}

/**
 * Extracts grade level number from a grade string.
 *
 * EXAMPLE:
 *   parseGradeLevel("GS-14") => 14
 *   parseGradeLevel("gs13")  => 13
 *   parseGradeLevel("WG-10") => 10
 *   parseGradeLevel("SES")   => null
 *
 * @param grade - Grade string like "GS-14", "gs13", "WG-10"
 * @returns Numeric grade level or null if can't parse
 */
export function parseGradeLevel(grade: string): number | null {
  if (!grade) {
    return null;
  }

  // Common patterns: "GS-14", "gs14", "GS14", "WG-10"
  // We want to extract the numeric portion after letters
  const normalized = grade.toUpperCase().replace(/-/g, '');
  
  // Try to find a number at the end
  const match = normalized.match(/(\d+)$/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Checks if a job's location matches the location filter.
 * 
 * HOW IT WORKS:
 * Location filters can be short codes ("dc", "tx") or full strings.
 * We do fuzzy matching: "dc" matches "Washington, DC".
 *
 * LOCATION MAPPING:
 * - "dc" matches locations containing "DC" or "Washington"
 * - "remote" matches locations containing "Remote"
 * - "tx" matches locations containing "TX" or "Texas"
 * - "co" matches locations containing "CO" or "Colorado"
 * - "ga" matches locations containing "GA" or "Georgia"
 *
 * @param jobLocation - The job's location string
 * @param filterLocation - The filter value
 * @returns true if matches
 */
export function matchesLocation(
  jobLocation: string,
  filterLocation: string | null
): boolean {
  // No filter = match all
  if (filterLocation === null || filterLocation === '') {
    return true;
  }

  if (!jobLocation || jobLocation === '') {
    return false;
  }

  const jobLoc = jobLocation.toLowerCase();
  const filterLoc = filterLocation.toLowerCase();

  // Direct substring match first
  if (jobLoc.indexOf(filterLoc) >= 0) {
    return true;
  }

  // Location code mappings for common filter values
  // These map short filter codes to terms that should match
  const locationMappings: { [key: string]: string[] } = {
    'dc': ['washington', 'dc', 'd.c.'],
    'remote': ['remote', 'telework', 'anywhere'],
    'tx': ['texas', 'tx', 'san antonio', 'houston', 'dallas', 'austin'],
    'co': ['colorado', 'co', 'denver', 'colorado springs'],
    'ga': ['georgia', 'ga', 'atlanta'],
    'va': ['virginia', 'va', 'arlington', 'alexandria', 'fairfax'],
    'md': ['maryland', 'md', 'bethesda', 'rockville'],
    'ca': ['california', 'ca', 'san diego', 'los angeles', 'san francisco']
  };

  // Check if filter is a known code
  const mappedTerms = locationMappings[filterLoc];
  if (mappedTerms) {
    for (let i = 0; i < mappedTerms.length; i++) {
      if (jobLoc.indexOf(mappedTerms[i]) >= 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a job's grade matches the grade band filter.
 *
 * HOW IT WORKS:
 * Grade filters like "gs13" should match "GS-13" jobs.
 * We normalize and compare the numeric portion.
 *
 * @param jobGrade - The job's grade string (e.g., "GS-14")
 * @param filterGradeBand - The filter value (e.g., "gs14")
 * @returns true if matches
 */
export function matchesGradeBand(
  jobGrade: string,
  filterGradeBand: string | null
): boolean {
  // No filter = match all
  if (filterGradeBand === null || filterGradeBand === '') {
    return true;
  }

  if (!jobGrade || jobGrade === '') {
    return false;
  }

  // Parse both to numeric levels for comparison
  const jobLevel = parseGradeLevel(jobGrade);
  const filterLevel = parseGradeLevel(filterGradeBand);

  // If we can't parse either, fall back to substring matching
  if (jobLevel === null || filterLevel === null) {
    return jobGrade.toLowerCase().indexOf(filterGradeBand.toLowerCase()) >= 0;
  }

  // Exact grade match
  return jobLevel === filterLevel;
}

/**
 * Checks if a job's agency matches the agency filter.
 *
 * HOW IT WORKS:
 * Agency filters can be short codes ("dod", "va") or full names.
 * We map common abbreviations to full agency names.
 *
 * @param jobAgency - The job's agency string
 * @param filterAgency - The filter value
 * @returns true if matches
 */
export function matchesAgency(
  jobAgency: string,
  filterAgency: string | null
): boolean {
  // No filter = match all
  if (filterAgency === null || filterAgency === '') {
    return true;
  }

  if (!jobAgency || jobAgency === '') {
    return false;
  }

  const jobAg = jobAgency.toLowerCase();
  const filterAg = filterAgency.toLowerCase();

  // Direct substring match
  if (jobAg.indexOf(filterAg) >= 0) {
    return true;
  }

  // Agency code mappings
  const agencyMappings: { [key: string]: string[] } = {
    'dod': ['defense', 'dod', 'army', 'navy', 'air force', 'marine', 'space force'],
    'va': ['veterans', 'va'],
    'usda': ['agriculture', 'usda'],
    'dhs': ['homeland', 'dhs'],
    'opm': ['personnel management', 'opm'],
    'cdc': ['disease control', 'cdc', 'centers for disease'],
    'fda': ['food and drug', 'fda'],
    'epa': ['environmental protection', 'epa'],
    'nasa': ['nasa', 'aeronautics', 'space administration'],
    'doe': ['energy', 'doe'],
    'hhs': ['health and human', 'hhs'],
    'doj': ['justice', 'doj'],
    'treasury': ['treasury', 'irs'],
    'state': ['state department', 'state'],
    'gsa': ['general services', 'gsa'],
    'ssa': ['social security', 'ssa']
  };

  const mappedTerms = agencyMappings[filterAg];
  if (mappedTerms) {
    for (let i = 0; i < mappedTerms.length; i++) {
      if (jobAg.indexOf(mappedTerms[i]) >= 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Maps travel frequency filter values to expected job field patterns.
 *
 * @param jobTravel - Job's travel requirement field (if present)
 * @param filterTravel - Filter value like "none", "up-to-25", etc.
 * @returns true if matches
 */
/**
 * Maps travel frequency filter values to expected job field patterns.
 *
 * NOTE: filterTravel is typed as string | null (not TravelFrequency)
 * because it comes from the filter object and may include 'any' or other values.
 */
export function matchesTravelFrequency(
  jobTravel: string | undefined,
  filterTravel: string | null
): boolean {
  // No filter = match all
  // Check for null, empty string, or 'any' value
  if (filterTravel === null || filterTravel === '') {
    return true;
  }
  // Also treat 'any' as "no filter"
  if (filterTravel.toLowerCase() === 'any') {
    return true;
  }

  // For mock data that doesn't have travel info, we allow it through
  // This is a graceful degradation until backend provides this field
  if (jobTravel === undefined || jobTravel === null || jobTravel === '') {
    // DESIGN DECISION: For unknown travel requirements, we allow the job
    // This is more permissive - user will see results but may need to
    // verify travel requirements manually
    return true;
  }

  const travelLower = jobTravel.toLowerCase();

  // Match based on filter value
  switch (filterTravel) {
    case 'none':
      // Match "none", "no travel", "minimal", "occasional" (<10%), "0%"
      return travelLower.indexOf('none') >= 0 ||
             travelLower.indexOf('no travel') >= 0 ||
             travelLower.indexOf('minimal') >= 0 ||
             travelLower.indexOf('0%') >= 0;
    
    case 'up-to-25':
      // Match anything up to 25%
      return travelLower.indexOf('25') >= 0 ||
             travelLower.indexOf('occasional') >= 0 ||
             travelLower.indexOf('none') >= 0;
    
    case 'up-to-50':
      // Match 25-50%
      return travelLower.indexOf('50') >= 0 ||
             travelLower.indexOf('moderate') >= 0;
    
    case 'over-50':
      // Match 50%+ or "frequent"
      return travelLower.indexOf('frequent') >= 0 ||
             travelLower.indexOf('extensive') >= 0 ||
             travelLower.indexOf('75') >= 0 ||
             travelLower.indexOf('100') >= 0;
    
    default:
      return true;
  }
}

/**
 * Checks if job matches telework preference filter.
 *
 * @param jobTelework - Job's telework option field
 * @param filterTelework - Filter value like "remote-only", "remote-or-telework", etc.
 * @returns true if matches
 */
export function matchesTeleworkPreference(
  jobTelework: string | undefined,
  jobLocation: string,
  filterTelework: string | null
): boolean {
  // No filter = match all
  if (filterTelework === null || filterTelework === '' || filterTelework === 'any') {
    return true;
  }

  // Check location for "Remote" as fallback
  const isRemoteLocation = jobLocation && jobLocation.toLowerCase().indexOf('remote') >= 0;

  // For mock data, infer telework from location
  const effectiveTelework = jobTelework || (isRemoteLocation ? 'remote' : 'on-site');

  const teleworkLower = effectiveTelework.toLowerCase();

  switch (filterTelework) {
    case 'remote-only':
      return isRemoteLocation || teleworkLower.indexOf('remote') >= 0;
    
    case 'remote-or-telework':
      return isRemoteLocation ||
             teleworkLower.indexOf('remote') >= 0 ||
             teleworkLower.indexOf('telework') >= 0 ||
             teleworkLower.indexOf('hybrid') >= 0;
    
    case 'on-site-preferred':
      return !isRemoteLocation &&
             (teleworkLower.indexOf('on-site') >= 0 ||
              teleworkLower.indexOf('onsite') >= 0 ||
              teleworkLower === 'on-site');
    
    default:
      return true;
  }
}

/**
 * ============================================================================
 * MAIN FILTER FUNCTION
 * ============================================================================
 */

/**
 * Filters an array of jobs based on the provided filter criteria.
 *
 * HOW IT WORKS:
 * 1. Start with all jobs
 * 2. For each active filter, check if the job matches
 * 3. A job must match ALL active filters to be included (AND logic)
 * 4. Empty/null filters are ignored (match everything)
 *
 * FILTER BEHAVIOR SUMMARY:
 * - Text filters (query): Substring match against role, agency, location, series
 * - Array filters (appointmentTypes, hiringPaths): Job must match ANY selected value
 * - Single-value filters (teleworkPreference): Exact match
 * - Missing job fields: Generally excluded when filter is active (conservative approach)
 *
 * EXAMPLE USAGE:
 * ```typescript
 * const filters: JobSearchFilters = {
 *   query: 'analyst',
 *   location: 'dc',
 *   gradeBand: 'gs14',
 *   // ... other filters
 * };
 * 
 * const result = filterJobs(allJobs, filters);
 * console.log(result.jobs); // Jobs matching all filters
 * console.log(result.total); // Count of matching jobs
 * console.log(result.warnings); // Any filter warnings
 * ```
 *
 * @param jobs - Array of all jobs to filter
 * @param filters - Filter criteria from JobSearchFilters
 * @returns FilteredJobsResult with matched jobs, count, and warnings
 */
export function filterJobs(
  jobs: JobResult[],
  filters: JobSearchFilters
): FilteredJobsResult {
  // Track warnings for filters that couldn't be fully applied
  const warnings: string[] = [];

  // ============================================================================
  // STEP 1: Initialize result array
  // We'll iterate through jobs and push matching ones to this array
  // ============================================================================
  const matchedJobs: JobResult[] = [];

  // ============================================================================
  // STEP 2: Iterate through each job and check all filters
  // A job must pass ALL active filters to be included
  // ============================================================================
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    let matches = true; // Assume match until proven otherwise

    // Cast to extended type to access potential additional fields
    const extJob = job as ExtendedJobRecord;

    // ------------------------------------------------------------------------
    // BASIC FILTERS
    // ------------------------------------------------------------------------

    // QUERY FILTER: Match against role, agency, location, series
    if (filters.query && filters.query !== '') {
      const queryMatches =
        matchesText(job.role, filters.query) ||
        matchesText(job.agency, filters.query) ||
        matchesText(job.location, filters.query) ||
        matchesText(job.series, filters.query);
      
      if (!queryMatches) {
        matches = false;
      }
    }

    // SEGMENT FILTER: Match type against segment
    // "federal" should match type="Federal", etc.
    if (matches && filters.segment) {
      const typeMatches = matchesText(job.type, filters.segment);
      if (!typeMatches) {
        matches = false;
      }
    }

    // LOCATION FILTER
    if (matches && filters.location !== null) {
      if (!matchesLocation(job.location, filters.location)) {
        matches = false;
      }
    }

    // GRADE BAND FILTER
    if (matches && filters.gradeBand !== null) {
      if (!matchesGradeBand(job.grade, filters.gradeBand)) {
        matches = false;
      }
    }

    // AGENCY FILTER
    if (matches && filters.agency !== null) {
      if (!matchesAgency(job.agency, filters.agency)) {
        matches = false;
      }
    }

    // SERIES CODE FILTER (single)
    if (matches && filters.seriesCode !== null && filters.seriesCode !== '') {
      if (!matchesText(job.series, filters.seriesCode)) {
        matches = false;
      }
    }

    // SERIES CODES FILTER (multiple)
    if (matches && filters.seriesCodes && filters.seriesCodes.length > 0) {
      let seriesMatches = false;
      for (let sc = 0; sc < filters.seriesCodes.length; sc++) {
        if (matchesText(job.series, filters.seriesCodes[sc])) {
          seriesMatches = true;
          break;
        }
      }
      if (!seriesMatches) {
        matches = false;
      }
    }

    // ------------------------------------------------------------------------
    // ADVANCED FILTERS
    // These check fields that may not exist in current mock data.
    // We use graceful fallbacks and only filter when data is available.
    // ------------------------------------------------------------------------

    // APPOINTMENT TYPE FILTER
    if (matches && filters.appointmentTypes && filters.appointmentTypes.length > 0) {
      // Use type field as proxy for appointment type in mock data
      // Mock data doesn't have explicit appointmentType, so we're permissive
      if (extJob.appointmentType !== undefined) {
        if (!matchesAny(extJob.appointmentType, filters.appointmentTypes)) {
          matches = false;
        }
      }
      // If field doesn't exist, we allow it through (no warning needed - just mock limitation)
    }

    // WORK SCHEDULE FILTER
    if (matches && filters.workSchedules && filters.workSchedules.length > 0) {
      if (extJob.workSchedule !== undefined) {
        if (!matchesAny(extJob.workSchedule, filters.workSchedules)) {
          matches = false;
        }
      }
      // Mock data doesn't have this - allow through
    }

    // SUPERVISORY STATUS FILTER
    if (matches && filters.supervisoryStatuses && filters.supervisoryStatuses.length > 0) {
      if (extJob.supervisoryStatus !== undefined) {
        if (!matchesAny(extJob.supervisoryStatus, filters.supervisoryStatuses)) {
          matches = false;
        }
      }
      // Check role name for hints about supervisory status
      const roleLower = job.role.toLowerCase();
      const isSupervisory = roleLower.indexOf('supervisory') >= 0 ||
                         roleLower.indexOf('supervisor') >= 0 ||
                         roleLower.indexOf('chief') >= 0 ||
                         roleLower.indexOf('director') >= 0 ||
                         roleLower.indexOf('manager') >= 0;
      const isTeamLead = roleLower.indexOf('lead') >= 0;

      // Check if inferred status matches filter
      let filterHasSupervisory = false;
      let filterHasTeamLead = false;
      let filterHasNonSupervisory = false;
      
      for (let ss = 0; ss < filters.supervisoryStatuses.length; ss++) {
        if (filters.supervisoryStatuses[ss] === 'supervisory') filterHasSupervisory = true;
        if (filters.supervisoryStatuses[ss] === 'team-lead') filterHasTeamLead = true;
        if (filters.supervisoryStatuses[ss] === 'non-supervisory') filterHasNonSupervisory = true;
      }

      let supervisoryMatch = false;
      if (filterHasSupervisory && isSupervisory) supervisoryMatch = true;
      if (filterHasTeamLead && isTeamLead) supervisoryMatch = true;
      if (filterHasNonSupervisory && !isSupervisory && !isTeamLead) supervisoryMatch = true;

      // Only apply if we have some inference; otherwise allow through
      if (isSupervisory || isTeamLead) {
        if (!supervisoryMatch) {
          matches = false;
        }
      } else if (!filterHasNonSupervisory && (filterHasSupervisory || filterHasTeamLead)) {
        // User only wants supervisory/lead roles but this doesn't appear to be one
        // Allow through since we can't be certain from role name alone
      }
    }

    // TELEWORK PREFERENCE FILTER
    if (matches && filters.teleworkPreference !== null && filters.teleworkPreference !== 'any') {
      if (!matchesTeleworkPreference(extJob.teleworkOption, job.location, filters.teleworkPreference)) {
        matches = false;
      }
    }

    // TRAVEL FREQUENCY FILTER
    // Note: TravelFrequency type doesn't include 'any' - the null check is sufficient
    if (matches && filters.travelFrequency !== null) {
      if (!matchesTravelFrequency(extJob.travelRequirement, filters.travelFrequency)) {
        matches = false;
      }
    }

    // CLEARANCE LEVEL FILTER
    if (matches && filters.clearanceLevels && filters.clearanceLevels.length > 0) {
      if (extJob.clearanceLevel !== undefined) {
        if (!matchesAny(extJob.clearanceLevel, filters.clearanceLevels)) {
          matches = false;
        }
      }
      // Mock data doesn't have clearance - allow all through
    }

    // POSITION SENSITIVITY FILTER
    if (matches && filters.positionSensitivities && filters.positionSensitivities.length > 0) {
      if (extJob.positionSensitivity !== undefined) {
        if (!matchesAny(extJob.positionSensitivity, filters.positionSensitivities)) {
          matches = false;
        }
      }
      // Mock data doesn't have this - allow all through
    }

    // HIRING PATHS FILTER
    if (matches && filters.hiringPaths && filters.hiringPaths.length > 0) {
      if (extJob.hiringPaths !== undefined) {
        if (!matchesAnyInArray(extJob.hiringPaths, filters.hiringPaths)) {
          matches = false;
        }
      }
      // Mock data doesn't have this - allow all through
    }

    // INTERNAL/EXTERNAL FILTER
    if (matches && filters.internalExternal !== null) {
      if (extJob.internalExternal !== undefined) {
        if (!matchesSingle(extJob.internalExternal, filters.internalExternal)) {
          matches = false;
        }
      }
      // Mock data doesn't have this - allow all through
    }

    // ------------------------------------------------------------------------
    // PATHOS PREFERENCE FILTERS
    // These are PathOS-specific filters that may require additional logic
    // For now, we document them but don't strictly filter (mock data limitation)
    // ------------------------------------------------------------------------

    // QUALIFICATION EMPHASIS - Would require job to have tags/metadata
    // For now, we don't filter on this but acknowledge the filter exists
    if (filters.qualificationEmphasis !== null && filters.qualificationEmphasis !== 'any') {
      // Future: Check job's skill tags or description keywords
    }

    // TRAJECTORY PREFERENCE - Would need career path metadata
    if (filters.trajectoryPreference !== null && filters.trajectoryPreference !== 'any') {
      // Future: Check job's promotion potential vs current user grade
    }

    // RETIREMENT IMPACT PREFERENCE - Use existing retirementImpact field
    if (matches && filters.retirementImpactPreference !== null && 
        filters.retirementImpactPreference !== 'any') {
      const impact = job.retirementImpact || '';
      const isPositive = impact.indexOf('+') >= 0; // Adds time to retirement
      const isNegative = impact.indexOf('-') >= 0; // Reduces time to retirement
      const isNeutral = impact.toLowerCase() === 'no change' || 
                     (!isPositive && !isNegative);

      switch (filters.retirementImpactPreference) {
        case 'improve':
          // User wants jobs that reduce time to retirement (negative values)
          if (!isNegative) {
            matches = false;
          }
          break;
        case 'neutral':
          // User wants no significant change
          if (!isNeutral) {
            matches = false;
          }
          break;
        case 'avoid-negative':
          // User wants to avoid jobs that add time (positive values)
          if (isPositive) {
            matches = false;
          }
          break;
      }
    }

    // COMPENSATION FOCUS - Would need salary analysis
    // For now, we don't filter but could sort by salary
    if (filters.compensationFocus !== null && filters.compensationFocus !== 'balance') {
      // Future: Prioritize high-salary jobs for "maximize-salary"
    }

    // ------------------------------------------------------------------------
    // WORK TYPE FILTER (from basic filters)
    // Maps to telework/remote classification
    // ------------------------------------------------------------------------
    if (matches && filters.workType !== null) {
      const jobLocLower = job.location.toLowerCase();
      let workTypeMatch = false;

      switch (filters.workType) {
        case 'remote':
          workTypeMatch = jobLocLower.indexOf('remote') >= 0;
          break;
        case 'onsite':
        case 'on-site':
          workTypeMatch = jobLocLower.indexOf('remote') < 0;
          break;
        case 'hybrid':
          // Hybrid is tricky - for now, anything not explicitly remote
          workTypeMatch = jobLocLower.indexOf('remote') < 0;
          break;
        default:
          workTypeMatch = true;
      }

      if (!workTypeMatch) {
        matches = false;
      }
    }

    // ============================================================================
    // STEP 3: Add job to results if it passed all filters
    // ============================================================================
    if (matches) {
      matchedJobs.push(job);
    }
  }

  // ============================================================================
  // STEP 4: Return result with jobs, count, and any warnings
  // ============================================================================
  return {
    jobs: matchedJobs,
    total: matchedJobs.length,
    warnings: warnings
  };
}

/**
 * ============================================================================
 * DEV-ONLY ERROR SIMULATION
 * ============================================================================
 * 
 * This function checks if the filters indicate we should simulate an error.
 * Used for testing UI error states during development.
 *
 * HOW TO TRIGGER:
 * Include "__FAIL__" anywhere in the query string to trigger a simulated error.
 *
 * EXAMPLE:
 *   filters.query = "__FAIL__ analyst"  // Will trigger error
 *   filters.query = "analyst"           // Normal search
 *
 * @param filters - The filter object to check
 * @returns true if we should simulate an error, false for normal operation
 */
export function shouldSimulateError(filters: JobSearchFilters): boolean {
  // Check query for the special error trigger token
  if (filters.query && filters.query.indexOf('__FAIL__') >= 0) {
    return true;
  }
  return false;
}

/**
 * Error class for simulated API failures.
 * This allows UI to distinguish between real and test errors if needed.
 *
 * WHY A CUSTOM ERROR CLASS:
 * Having a distinct error type allows the UI to:
 * 1. Distinguish simulated errors from real errors
 * 2. Show appropriate messaging (e.g., "remove __FAIL__ to fix")
 * 3. Handle differently in error logging
 */
export class SimulatedSearchError extends Error {
  constructor(message: string) {
    // Call parent constructor with super()
    super(message);
    this.name = 'SimulatedSearchError';
  }
}
