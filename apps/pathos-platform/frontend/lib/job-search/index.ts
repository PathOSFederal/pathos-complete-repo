/**
 * ============================================================================
 * JOB SEARCH MODULE - Barrel Export
 * ============================================================================
 *
 * FILE PURPOSE:
 * Central export point for all job search utilities. Allows importing like:
 *   import { filterJobs, matchesText } from '@/lib/job-search';
 *
 * This pattern keeps imports clean and allows internal restructuring without
 * breaking external consumers.
 *
 * DAY 15 UPDATE:
 * Added exports for derive-saved-search utilities (Create Alert for Similar Jobs).
 *
 * @version Day 15 - Saved Jobs & Job Alerts
 * ============================================================================
 */

// Export all filter functions and types from filter-jobs.ts
export {
  // Main filter function
  filterJobs,
  
  // Helper functions (useful for testing or custom filtering)
  matchesText,
  matchesAny,
  matchesAnyInArray,
  matchesSingle,
  matchesLocation,
  matchesGradeBand,
  matchesAgency,
  matchesTravelFrequency,
  matchesTeleworkPreference,
  parseGradeLevel,
  
  // Dev utilities
  shouldSimulateError,
  SimulatedSearchError,
  
  // Types
  type ExtendedJobRecord,
  type FilteredJobsResult,
} from './filter-jobs';

// Day 15: Export derive-saved-search utilities
export {
  deriveSavedSearchFromJob,
  isDuplicateSignature,
  type JobForDerivation,
  type DeriveOptions,
  type DerivedSavedSearch,
} from './derive-saved-search';
