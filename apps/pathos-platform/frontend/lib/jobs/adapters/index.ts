/**
 * ============================================================================
 * JOB ADAPTERS - Central Registry & Entrypoint (Day 12)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This is the SINGLE ENTRYPOINT for mapping raw job data to canonical models.
 * All consumers (API layer, stores) should use the functions exported here.
 *
 * WHY A CENTRAL ENTRYPOINT:
 * 1. ENCAPSULATION: Consumers don't need to know which mapper to use
 * 2. VERSIONING: Easy to swap mapper versions in one place
 * 3. REGISTRY: All available mappers are registered here
 * 4. FUTURE-PROOFING: Adding a new source = add a mapper + register here
 *
 * WHERE IT FITS:
 * ┌─────────────────┐     ┌────────────────────┐     ┌────────────────┐
 * │  API Layer      │ --> │  THIS FILE         │ --> │  Mappers       │
 * │  (lib/api/*)    │     │  (index.ts)        │     │  (mock, usajobs)│
 * └─────────────────┘     └────────────────────┘     └────────────────┘
 *                                │                           │
 *                                │  Routes to correct        │
 *                                │  mapper by source         │
 *                                ▼                           ▼
 *                         ┌────────────────────────────────────────┐
 *                         │  Canonical Models (lib/jobs/model.ts)  │
 *                         └────────────────────────────────────────┘
 *
 * USAGE EXAMPLES:
 *
 * ```typescript
 * // Map a single job to card format
 * const cardResult = mapToCanonicalJobCard(rawData, 'mock');
 * console.log(cardResult.title);           // Canonical field
 * console.log(cardResult.diagnostics);     // Includes warnings
 *
 * // Map a single job to detail format
 * const detailResult = mapToCanonicalJobDetail(rawData, 'usajobs');
 * console.log(detailResult.duties);        // Detail-only field
 *
 * // Map multiple jobs at once
 * const cards = mapToCanonicalJobCards(rawJobsArray, 'mock');
 * ```
 *
 * HOW TO ADD A NEW SOURCE:
 * 1. Create a new mapper file: lib/jobs/adapters/{source}/v1Mapper.ts
 * 2. Implement mapXxxToCard and mapXxxToDetail functions
 * 3. Add the source to JobSource type in lib/jobs/model.ts
 * 4. Register the mapper in this file's switch statements
 * 5. Add tests for the new mapper
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import type {
  JobSource,
  JobCardWithDiagnostics,
  JobDetailWithDiagnostics,
  JobDiagnostics,
  JobCardModel,
} from '../model';

// Import mappers from each source
import {
  mapMockJobToCard,
  mapMockJobToDetail,
  mapMockJobsToCards,
} from './mock/v1Mapper';

import {
  mapUSAJobsToCard,
  mapUSAJobsToDetail,
  mapUSAJobsToCards,
} from './usajobs/v1Mapper';

// ============================================================================
// MAPPER REGISTRY
// ============================================================================

/**
 * Registry of available card mappers by source.
 *
 * WHY A REGISTRY:
 * Instead of if/else chains, we use a lookup object. This:
 * 1. Makes adding new sources trivial (add entry to object)
 * 2. Enables type-safe source handling
 * 3. Is more performant than switch/case for many sources
 */
type CardMapper = (raw: unknown) => JobCardWithDiagnostics;
type DetailMapper = (raw: unknown) => JobDetailWithDiagnostics;
type BatchCardMapper = (raw: unknown[]) => JobCardWithDiagnostics[];

const cardMapperRegistry: Record<JobSource, CardMapper> = {
  mock: mapMockJobToCard,
  usajobs: mapUSAJobsToCard,
  other: mapOtherToCard,
};

const detailMapperRegistry: Record<JobSource, DetailMapper> = {
  mock: mapMockJobToDetail,
  usajobs: mapUSAJobsToDetail,
  other: mapOtherToDetail,
};

const batchCardMapperRegistry: Record<JobSource, BatchCardMapper> = {
  mock: mapMockJobsToCards,
  usajobs: mapUSAJobsToCards,
  other: mapOtherToCards,
};

// ============================================================================
// "OTHER" FALLBACK MAPPER
// ============================================================================

/**
 * Fallback mapper for unknown/other sources.
 *
 * This mapper attempts to extract basic fields from any object shape.
 * It's very lenient and will always return SOMETHING, even if minimal.
 *
 * WHEN USED:
 * - source = "other" is explicitly passed
 * - Future sources before they get dedicated mappers
 * - Manual/custom data that doesn't fit other categories
 */
function mapOtherToCard(raw: unknown): JobCardWithDiagnostics {
  const warnings: string[] = [];
  const fetchedAt = new Date().toISOString();

  // Try to extract any usable fields from the raw data
  const rawObj = typeof raw === 'object' && raw !== null ? raw : {};
  const rawRecord = rawObj as Record<string, unknown>;

  // Attempt to find an ID
  let id = 'unknown-' + Date.now();
  if (typeof rawRecord['id'] === 'string') {
    id = rawRecord['id'];
  } else if (typeof rawRecord['id'] === 'number') {
    id = String(rawRecord['id']);
  } else if (typeof rawRecord['ID'] === 'string') {
    id = rawRecord['ID'];
  } else if (typeof rawRecord['jobId'] === 'string') {
    id = rawRecord['jobId'];
  } else {
    warnings.push('No ID field found, using generated ID');
  }

  // Attempt to find a title
  let title = 'Untitled Position';
  const titleFields = ['title', 'Title', 'PositionTitle', 'role', 'Role', 'name', 'Name'];
  for (let i = 0; i < titleFields.length; i++) {
    if (typeof rawRecord[titleFields[i]] === 'string') {
      title = rawRecord[titleFields[i]] as string;
      break;
    }
  }
  if (title === 'Untitled Position') {
    warnings.push('No title field found, using fallback');
  }

  // Attempt to find organization
  let organizationName: string | undefined;
  const orgFields = ['organization', 'Organization', 'agency', 'Agency', 'company', 'Company'];
  for (let i = 0; i < orgFields.length; i++) {
    if (typeof rawRecord[orgFields[i]] === 'string') {
      organizationName = rawRecord[orgFields[i]] as string;
      break;
    }
  }

  // Attempt to find location
  let locationDisplay: string | undefined;
  const locFields = ['location', 'Location', 'city', 'City'];
  for (let i = 0; i < locFields.length; i++) {
    if (typeof rawRecord[locFields[i]] === 'string') {
      locationDisplay = rawRecord[locFields[i]] as string;
      break;
    }
  }

  warnings.push('Using generic "other" mapper - data may be incomplete');

  const card: JobCardModel = {
    id: id,
    source: 'other',
    title: title,
    organizationName: organizationName,
    locationDisplay: locationDisplay,
    tags: [],
  };

  const diagnostics: JobDiagnostics = {
    raw: raw,
    warnings: warnings,
    source: 'other',
    mapperVersion: 'other-v1',
    fetchedAtISO: fetchedAt,
  };

  return {
    ...card,
    diagnostics: diagnostics,
  };
}

function mapOtherToDetail(raw: unknown): JobDetailWithDiagnostics {
  const cardResult = mapOtherToCard(raw);
  const { diagnostics, ...card } = cardResult;

  return {
    ...card,
    diagnostics: diagnostics,
  };
}

function mapOtherToCards(rawJobs: unknown[]): JobCardWithDiagnostics[] {
  const results: JobCardWithDiagnostics[] = [];
  for (let i = 0; i < rawJobs.length; i++) {
    results.push(mapOtherToCard(rawJobs[i]));
  }
  return results;
}

// ============================================================================
// PUBLIC API - SINGLE JOB MAPPING
// ============================================================================

/**
 * Maps a single raw job payload to a canonical JobCardModel.
 *
 * THIS IS THE MAIN ENTRYPOINT for card mapping.
 *
 * HOW IT WORKS:
 * 1. Looks up the appropriate mapper based on source
 * 2. Delegates to that mapper
 * 3. Returns canonical model with diagnostics
 *
 * ERROR HANDLING:
 * - Never throws (mappers handle all errors internally)
 * - Always returns a valid JobCardWithDiagnostics
 * - Check diagnostics.warnings for any issues
 *
 * @param raw - The raw job payload (any shape)
 * @param source - The source system identifier ("mock", "usajobs", "other")
 * @returns JobCardWithDiagnostics - Canonical card model with diagnostics
 *
 * @example
 * // Map a mock job
 * const result = mapToCanonicalJobCard(mockJobData, 'mock');
 *
 * // Map a USAJOBS response
 * const result = mapToCanonicalJobCard(usajobsPayload, 'usajobs');
 *
 * // Access canonical fields
 * console.log(result.title);
 * console.log(result.organizationName);
 *
 * // Check for mapping issues
 * if (result.diagnostics.warnings.length > 0) {
 *   console.warn('Mapping warnings:', result.diagnostics.warnings);
 * }
 */
export function mapToCanonicalJobCard(
  raw: unknown,
  source: JobSource
): JobCardWithDiagnostics {
  // Look up the mapper for this source
  const mapper = cardMapperRegistry[source];

  // Execute the mapper
  return mapper(raw);
}

/**
 * Maps a single raw job payload to a canonical JobDetailModel.
 *
 * THIS IS THE MAIN ENTRYPOINT for detail mapping.
 *
 * Same as mapToCanonicalJobCard but returns the extended detail model
 * with additional fields like duties, qualifications, etc.
 *
 * @param raw - The raw job payload (any shape)
 * @param source - The source system identifier
 * @returns JobDetailWithDiagnostics - Canonical detail model with diagnostics
 */
export function mapToCanonicalJobDetail(
  raw: unknown,
  source: JobSource
): JobDetailWithDiagnostics {
  const mapper = detailMapperRegistry[source];
  return mapper(raw);
}

// ============================================================================
// PUBLIC API - BATCH MAPPING
// ============================================================================

/**
 * Maps an array of raw job payloads to canonical JobCardModels.
 *
 * BATCH MAPPING:
 * Use this when you have multiple jobs to map (e.g., search results).
 * More efficient than calling mapToCanonicalJobCard in a loop.
 *
 * ERROR HANDLING:
 * Each job is mapped independently. Failures in one don't affect others.
 * Check each result's diagnostics.warnings for issues.
 *
 * @param rawJobs - Array of raw job payloads
 * @param source - The source system identifier (all jobs must be from same source)
 * @returns Array of JobCardWithDiagnostics
 */
export function mapToCanonicalJobCards(
  rawJobs: unknown[],
  source: JobSource
): JobCardWithDiagnostics[] {
  const mapper = batchCardMapperRegistry[source];
  return mapper(rawJobs);
}

/**
 * Maps an array of raw job payloads to canonical JobDetailModels.
 *
 * @param rawJobs - Array of raw job payloads
 * @param source - The source system identifier
 * @returns Array of JobDetailWithDiagnostics
 */
export function mapToCanonicalJobDetails(
  rawJobs: unknown[],
  source: JobSource
): JobDetailWithDiagnostics[] {
  const results: JobDetailWithDiagnostics[] = [];

  for (let i = 0; i < rawJobs.length; i++) {
    const mapper = detailMapperRegistry[source];
    results.push(mapper(rawJobs[i]));
  }

  return results;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Strips diagnostics from a JobCardWithDiagnostics.
 *
 * WHEN TO USE:
 * Sometimes you need to store or display just the canonical model
 * without the diagnostics (e.g., in localStorage, in logs).
 *
 * @param jobWithDiagnostics - Job with diagnostics attached
 * @returns JobCardModel without diagnostics
 */
export function stripDiagnostics<
  T extends JobCardWithDiagnostics | JobDetailWithDiagnostics,
>(jobWithDiagnostics: T): Omit<T, 'diagnostics'> {
  // Create a copy without the diagnostics field
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentional destructure to omit diagnostics
  const { diagnostics: _diagnostics, ...jobWithoutDiagnostics } = jobWithDiagnostics;
  return jobWithoutDiagnostics as Omit<T, 'diagnostics'>;
}

/**
 * Extracts only diagnostics from multiple jobs.
 *
 * WHEN TO USE:
 * For logging/monitoring, you might want to collect all diagnostics
 * from a batch operation without the full job data.
 *
 * @param jobs - Array of jobs with diagnostics
 * @returns Array of JobDiagnostics
 */
export function extractAllDiagnostics(
  jobs: Array<JobCardWithDiagnostics | JobDetailWithDiagnostics>
): JobDiagnostics[] {
  const diagnostics: JobDiagnostics[] = [];

  for (let i = 0; i < jobs.length; i++) {
    diagnostics.push(jobs[i].diagnostics);
  }

  return diagnostics;
}

/**
 * Counts warnings across multiple mapped jobs.
 *
 * WHEN TO USE:
 * Quick health check on a batch mapping operation.
 * If many jobs have warnings, there might be a data quality issue.
 *
 * @param jobs - Array of jobs with diagnostics
 * @returns Object with total warning count and count of jobs with warnings
 */
export function summarizeWarnings(
  jobs: Array<JobCardWithDiagnostics | JobDetailWithDiagnostics>
): {
  totalWarnings: number;
  jobsWithWarnings: number;
  cleanJobs: number;
} {
  let totalWarnings = 0;
  let jobsWithWarnings = 0;
  let cleanJobs = 0;

  for (let i = 0; i < jobs.length; i++) {
    const warningCount = jobs[i].diagnostics.warnings.length;
    totalWarnings = totalWarnings + warningCount;

    if (warningCount > 0) {
      jobsWithWarnings = jobsWithWarnings + 1;
    } else {
      cleanJobs = cleanJobs + 1;
    }
  }

  return {
    totalWarnings: totalWarnings,
    jobsWithWarnings: jobsWithWarnings,
    cleanJobs: cleanJobs,
  };
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export types that consumers might need
export type {
  JobSource,
  JobCardModel,
  JobDetailModel,
  JobCardWithDiagnostics,
  JobDetailWithDiagnostics,
  JobDiagnostics,
  NormalizedLocation,
  PayRange,
} from '../model';

// Re-export individual mappers for direct access if needed
export {
  mapMockJobToCard,
  mapMockJobToDetail,
  mapMockJobsToCards,
} from './mock/v1Mapper';

export {
  mapUSAJobsToCard,
  mapUSAJobsToDetail,
  mapUSAJobsToCards,
} from './usajobs/v1Mapper';
