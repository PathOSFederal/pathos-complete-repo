/**
 * ============================================================================
 * JOB DATA LAYER - Barrel Export (Day 12)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Central export point for the entire job data layer. All consumers should
 * import from here rather than reaching into subdirectories.
 *
 * USAGE:
 * ```typescript
 * // Import everything you need from one place
 * import {
 *   // Types
 *   type JobCardModel,
 *   type JobDetailModel,
 *   type JobSource,
 *
 *   // Mapping functions
 *   mapToCanonicalJobCard,
 *   mapToCanonicalJobCards,
 *
 *   // Schemas
 *   JobCardModelSchema,
 *   safeParseOrWarn,
 * } from '@/lib/jobs';
 * ```
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

// ============================================================================
// MODEL EXPORTS
// ============================================================================

export {
  // Types
  type JobSource,
  type NormalizedLocation,
  type PayRange,
  type JobCardModel,
  type JobDetailModel,
  type JobDiagnostics,
  type JobCardWithDiagnostics,
  type JobDetailWithDiagnostics,

  // Type guards
  isJobCardModel,
  isJobDetailModel,
} from './model';

// ============================================================================
// SCHEMA EXPORTS
// ============================================================================

export {
  // Schemas
  JobSourceSchema,
  NormalizedLocationSchema,
  PayRangeSchema,
  JobCardModelSchema,
  JobDetailModelSchema,
  JobDiagnosticsSchema,
  JobCardWithDiagnosticsSchema,
  JobDetailWithDiagnosticsSchema,
  RawMockJobSchema,
  RawUSAJobsLikeSchema,

  // Inferred types
  type InferredJobCardModel,
  type InferredJobDetailModel,
  type RawMockJob,
  type RawUSAJobsLike,

  // Parsing helpers
  safeParseOrWarn,
  strictParse,
} from './schemas';

// ============================================================================
// ADAPTER EXPORTS
// ============================================================================

export {
  // Main entrypoints (use these in most cases)
  mapToCanonicalJobCard,
  mapToCanonicalJobDetail,
  mapToCanonicalJobCards,
  mapToCanonicalJobDetails,

  // Utility functions
  stripDiagnostics,
  extractAllDiagnostics,
  summarizeWarnings,

  // Individual mappers (for direct access if needed)
  mapMockJobToCard,
  mapMockJobToDetail,
  mapMockJobsToCards,
  mapUSAJobsToCard,
  mapUSAJobsToDetail,
  mapUSAJobsToCards,
} from './adapters';
