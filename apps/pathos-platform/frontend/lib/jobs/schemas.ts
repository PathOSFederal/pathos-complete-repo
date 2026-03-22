/**
 * ============================================================================
 * ZOD SCHEMAS FOR JOB MODELS (Day 12)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Runtime validation schemas for job data using Zod. These schemas ensure
 * that data flowing through the adapter layer is valid and type-safe at
 * RUNTIME, not just at compile time.
 *
 * WHY ZOD:
 * TypeScript types disappear at runtime. When we receive data from:
 * - API responses
 * - localStorage
 * - External sources (USAJOBS)
 *
 * ...we need RUNTIME validation to ensure the data is actually correct.
 * Zod provides:
 * 1. Runtime type checking
 * 2. Automatic TypeScript type inference
 * 3. Detailed error messages
 * 4. Safe parsing (doesn't throw, returns result object)
 *
 * WHERE IT FITS:
 * ┌───────────────┐     ┌────────────────┐     ┌────────────────┐
 * │   Raw Data    │ --> │  ZOD SCHEMAS   │ --> │  Canonical     │
 * │   (unknown)   │     │  (validation)  │     │  Models        │
 * └───────────────┘     └────────────────┘     └────────────────┘
 *
 * SCHEMA PHILOSOPHY:
 * 1. Be LENIENT on input: Accept data even if some fields are missing
 * 2. Be STRICT on output: Canonical models have defined shapes
 * 3. Collect WARNINGS: Don't fail hard, track issues for diagnostics
 *
 * EXAMPLE USAGE:
 * ```typescript
 * import { JobCardModelSchema, safeParseOrWarn } from '@/lib/jobs/schemas';
 *
 * const warnings: string[] = [];
 * const result = safeParseOrWarn(
 *   JobCardModelSchema,
 *   rawData,
 *   warnings,
 *   'Job card parsing'
 * );
 *
 * if (result) {
 *   // result is typed as JobCardModel
 *   console.log(result.title);
 * } else {
 *   // Data was invalid, warnings array has details
 *   console.error('Failed to parse job:', warnings);
 * }
 * ```
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import { z } from 'zod';

// ============================================================================
// SHARED SCHEMAS (Building blocks)
// ============================================================================

/**
 * Schema for JobSource enum.
 * Validates that the source is one of the known values.
 */
export const JobSourceSchema = z.enum(['usajobs', 'mock', 'other']);

/**
 * Schema for NormalizedLocation.
 * All fields are optional since location data may be incomplete.
 */
export const NormalizedLocationSchema = z.object({
  /**
   * City name, if known.
   */
  city: z.string().optional(),

  /**
   * State/province code.
   */
  state: z.string().optional(),

  /**
   * Country code (ISO 3166-1 alpha-2).
   */
  country: z.string().optional(),

  /**
   * Whether this is a remote position.
   */
  isRemote: z.boolean().optional(),
});

/**
 * Schema for PayRange.
 * All fields are optional since salary may not be disclosed.
 */
export const PayRangeSchema = z.object({
  /**
   * Minimum salary in the range.
   */
  min: z.number().optional(),

  /**
   * Maximum salary in the range.
   */
  max: z.number().optional(),

  /**
   * Currency code.
   */
  currency: z.string().optional(),

  /**
   * Pay plan (GS, WG, etc.).
   */
  payPlan: z.string().optional(),

  /**
   * Display-ready salary string.
   */
  displayText: z.string().optional(),
});

// ============================================================================
// JOB CARD MODEL SCHEMA
// ============================================================================

/**
 * Zod schema for JobCardModel.
 *
 * REQUIRED FIELDS:
 * - id: string
 * - title: string
 * - source: JobSource
 * - tags: string[]
 *
 * All other fields are optional to handle incomplete data gracefully.
 */
export const JobCardModelSchema = z.object({
  // ==========================================================================
  // Required fields
  // ==========================================================================

  /**
   * Unique identifier (required).
   */
  id: z.string().min(1, 'Job ID is required'),

  /**
   * Job title (required).
   */
  title: z.string().min(1, 'Job title is required'),

  /**
   * Data source (required).
   */
  source: JobSourceSchema,

  /**
   * Tags/badges (required, but can be empty array).
   */
  tags: z.array(z.string()).default([]),

  // ==========================================================================
  // Optional identifier fields
  // ==========================================================================

  /**
   * Series code (e.g., "0343").
   */
  seriesCode: z.string().optional(),

  /**
   * Grade level (e.g., "GS-14").
   */
  gradeLevel: z.string().optional(),

  // ==========================================================================
  // Optional organization fields
  // ==========================================================================

  /**
   * Organization/agency name.
   */
  organizationName: z.string().optional(),

  /**
   * Department/sub-agency name.
   */
  departmentName: z.string().optional(),

  // ==========================================================================
  // Optional location fields
  // ==========================================================================

  /**
   * Structured location data.
   */
  location: NormalizedLocationSchema.optional(),

  /**
   * Display-ready location string.
   */
  locationDisplay: z.string().optional(),

  // ==========================================================================
  // Optional compensation fields
  // ==========================================================================

  /**
   * Salary range.
   */
  payRange: PayRangeSchema.optional(),

  /**
   * Estimated total compensation.
   */
  estimatedTotalComp: z.number().optional(),

  // ==========================================================================
  // Optional work arrangement fields
  // ==========================================================================

  /**
   * Employment/appointment type.
   */
  employmentType: z.string().optional(),

  /**
   * Work schedule.
   */
  workSchedule: z.string().optional(),

  /**
   * Telework eligibility.
   */
  teleworkEligibility: z.string().optional(),

  // ==========================================================================
  // Optional date fields
  // ==========================================================================

  /**
   * Opening date (ISO 8601).
   */
  openDate: z.string().optional(),

  /**
   * Closing date (ISO 8601).
   */
  closeDate: z.string().optional(),

  // ==========================================================================
  // Optional link fields
  // ==========================================================================

  /**
   * URL to job posting.
   */
  postingUrl: z.string().url().optional().or(z.literal('')).or(z.undefined()),

  /**
   * URL to apply.
   */
  applyUrl: z.string().url().optional().or(z.literal('')).or(z.undefined()),

  // ==========================================================================
  // Optional PathOS computed fields
  // ==========================================================================

  /**
   * Match percentage (0-100).
   */
  matchPercent: z.number().min(0).max(100).optional(),

  /**
   * Retirement impact assessment.
   */
  retirementImpact: z.string().optional(),
});

// ============================================================================
// JOB DETAIL MODEL SCHEMA
// ============================================================================

/**
 * Zod schema for JobDetailModel.
 * Extends JobCardModelSchema with additional detail-only fields.
 */
export const JobDetailModelSchema = JobCardModelSchema.extend({
  // ==========================================================================
  // Additional identifiers
  // ==========================================================================

  /**
   * Announcement number.
   */
  announcementNumber: z.string().optional(),

  /**
   * Position ID.
   */
  positionId: z.string().optional(),

  // ==========================================================================
  // Description content
  // ==========================================================================

  /**
   * Brief summary.
   */
  summary: z.string().optional(),

  /**
   * Full description (HTML).
   */
  descriptionHtml: z.string().optional(),

  /**
   * List of duties.
   */
  duties: z.array(z.string()).optional(),

  // ==========================================================================
  // Qualification fields
  // ==========================================================================

  /**
   * Minimum qualifications.
   */
  qualificationsMinimum: z.string().optional(),

  /**
   * Education requirements.
   */
  qualificationsEducation: z.string().optional(),

  /**
   * Specialized experience.
   */
  qualificationsSpecialized: z.array(z.string()).optional(),

  /**
   * KSAs.
   */
  ksas: z.array(z.string()).optional(),

  // ==========================================================================
  // Hiring information
  // ==========================================================================

  /**
   * Hiring paths.
   */
  hiringPaths: z.array(z.string()).optional(),

  /**
   * Open to public flag.
   */
  isOpenToPublic: z.boolean().optional(),

  /**
   * Promotion potential grade.
   */
  promotionPotential: z.string().optional(),

  /**
   * Supervisory flag.
   */
  isSupervisory: z.boolean().optional(),

  // ==========================================================================
  // Security fields
  // ==========================================================================

  /**
   * Clearance level.
   */
  clearanceLevel: z.string().optional(),

  /**
   * Drug test required flag.
   */
  drugTestRequired: z.boolean().optional(),

  // ==========================================================================
  // Travel & relocation
  // ==========================================================================

  /**
   * Travel requirement.
   */
  travelRequirement: z.string().optional(),

  /**
   * Relocation authorized flag.
   */
  relocationAuthorized: z.boolean().optional(),

  /**
   * PCS authorized flag.
   */
  pcsAuthorized: z.boolean().optional(),

  // ==========================================================================
  // Application process
  // ==========================================================================

  /**
   * How to apply steps.
   */
  howToApply: z.array(z.string()).optional(),

  /**
   * Required documents.
   */
  requiredDocuments: z.array(z.string()).optional(),

  /**
   * Estimated timeline.
   */
  estimatedTimeline: z.string().optional(),

  // ==========================================================================
  // Contact information
  // ==========================================================================

  /**
   * Contact name.
   */
  contactName: z.string().optional(),

  /**
   * Contact email.
   */
  contactEmail: z.string().email().optional().or(z.literal('')).or(z.undefined()),

  /**
   * Contact phone.
   */
  contactPhone: z.string().optional(),

  // ==========================================================================
  // PathOS enhanced fields
  // ==========================================================================

  /**
   * PathAdvisor note.
   */
  pathAdvisorNote: z.string().optional(),

  /**
   * Skills match percentage.
   */
  skillsMatchPercent: z.number().min(0).max(100).optional(),

  /**
   * Keyword match percentage.
   */
  keywordMatchPercent: z.number().min(0).max(100).optional(),
});

// ============================================================================
// JOB DIAGNOSTICS SCHEMA
// ============================================================================

/**
 * Zod schema for JobDiagnostics.
 */
export const JobDiagnosticsSchema = z.object({
  /**
   * Raw payload (any shape accepted).
   */
  raw: z.unknown(),

  /**
   * Array of warning messages.
   */
  warnings: z.array(z.string()),

  /**
   * Source identifier.
   */
  source: JobSourceSchema,

  /**
   * Mapper version string.
   */
  mapperVersion: z.string(),

  /**
   * Fetch timestamp (ISO 8601).
   */
  fetchedAtISO: z.string(),
});

// ============================================================================
// COMBINED SCHEMAS (Model + Diagnostics)
// ============================================================================

/**
 * JobCardModel with diagnostics attached.
 */
export const JobCardWithDiagnosticsSchema = JobCardModelSchema.extend({
  diagnostics: JobDiagnosticsSchema,
});

/**
 * JobDetailModel with diagnostics attached.
 */
export const JobDetailWithDiagnosticsSchema = JobDetailModelSchema.extend({
  diagnostics: JobDiagnosticsSchema,
});

// ============================================================================
// RAW MOCK DATA SCHEMA
// ============================================================================

/**
 * Schema for our existing mock job data format.
 *
 * This matches the shape in lib/mock/job-search.ts:
 * ```typescript
 * interface JobResult {
 *   id: number;
 *   role: string;
 *   series: string;
 *   grade: string;
 *   location: string;
 *   agency: string;
 *   type: string;
 *   estTotalComp: number;
 *   retirementImpact: string;
 *   matchPercent: number;
 * }
 * ```
 *
 * Used by the mock mapper to validate input before mapping.
 */
export const RawMockJobSchema = z.object({
  /**
   * Numeric ID (will be converted to string).
   */
  id: z.number(),

  /**
   * Job role/title.
   */
  role: z.string(),

  /**
   * Series code (e.g., "0343").
   */
  series: z.string(),

  /**
   * Grade (e.g., "GS-14").
   */
  grade: z.string(),

  /**
   * Location string.
   */
  location: z.string(),

  /**
   * Agency name.
   */
  agency: z.string(),

  /**
   * Employment type (Federal, Military, etc.).
   */
  type: z.string(),

  /**
   * Estimated total compensation.
   */
  estTotalComp: z.number(),

  /**
   * Retirement impact string.
   */
  retirementImpact: z.string(),

  /**
   * Match percentage.
   */
  matchPercent: z.number(),
});

// ============================================================================
// RAW USAJOBS-LIKE SCHEMA
// ============================================================================

/**
 * Minimal schema for USAJOBS-like payloads.
 *
 * This is a SIMPLIFIED version of the real USAJOBS API response.
 * It validates the fields we actually use in our mapper.
 * The real USAJOBS API has many more fields that we may ignore.
 *
 * DESIGN NOTE:
 * We use .passthrough() to allow extra fields we don't care about.
 * This makes the schema forward-compatible with API changes.
 *
 * EXAMPLE USAJOBS-like payload:
 * ```json
 * {
 *   "MatchedObjectId": "12345",
 *   "PositionTitle": "Program Analyst",
 *   "PositionLocationDisplay": "Washington, DC",
 *   "OrganizationName": "Department of Defense",
 *   "JobGrade": [{ "Code": "GS-14" }],
 *   "PositionRemuneration": [{
 *     "MinimumRange": "122198",
 *     "MaximumRange": "158860"
 *   }]
 * }
 * ```
 */
export const RawUSAJobsLikeSchema = z
  .object({
    /**
     * Unique identifier from USAJOBS.
     */
    MatchedObjectId: z.string().optional(),

    /**
     * Position title.
     */
    PositionTitle: z.string().optional(),

    /**
     * Position location (display string).
     */
    PositionLocationDisplay: z.string().optional(),

    /**
     * Position location array (structured).
     */
    PositionLocation: z
      .array(
        z.object({
          LocationName: z.string().optional(),
          CityName: z.string().optional(),
          CountryCode: z.string().optional(),
          CountrySubDivisionCode: z.string().optional(),
        })
      )
      .optional(),

    /**
     * Organization name.
     */
    OrganizationName: z.string().optional(),

    /**
     * Department name.
     */
    DepartmentName: z.string().optional(),

    /**
     * Job category (series).
     */
    JobCategory: z
      .array(
        z.object({
          Name: z.string().optional(),
          Code: z.string().optional(),
        })
      )
      .optional(),

    /**
     * Job grade array.
     */
    JobGrade: z
      .array(
        z.object({
          Code: z.string().optional(),
        })
      )
      .optional(),

    /**
     * Salary information.
     */
    PositionRemuneration: z
      .array(
        z.object({
          MinimumRange: z.string().optional(),
          MaximumRange: z.string().optional(),
          RateIntervalCode: z.string().optional(),
        })
      )
      .optional(),

    /**
     * Schedule type (Full-time, Part-time, etc.).
     */
    PositionSchedule: z
      .array(
        z.object({
          Name: z.string().optional(),
          Code: z.string().optional(),
        })
      )
      .optional(),

    /**
     * Offering type (permanent, term, etc.).
     */
    PositionOfferingType: z
      .array(
        z.object({
          Name: z.string().optional(),
          Code: z.string().optional(),
        })
      )
      .optional(),

    /**
     * Announcement number.
     */
    PositionID: z.string().optional(),

    /**
     * Control number.
     */
    PositionURI: z.string().optional(),

    /**
     * Apply URI.
     */
    ApplyURI: z.array(z.string()).optional(),

    /**
     * Opening date.
     */
    PositionStartDate: z.string().optional(),

    /**
     * Closing date.
     */
    PositionEndDate: z.string().optional(),

    /**
     * Publication start date.
     */
    PublicationStartDate: z.string().optional(),

    /**
     * Application close date.
     */
    ApplicationCloseDate: z.string().optional(),

    /**
     * Telework eligibility.
     */
    TeleworkEligible: z.boolean().optional(),

    /**
     * User area (contains nested details).
     */
    UserArea: z
      .object({
        Details: z
          .object({
            JobSummary: z.string().optional(),
            MajorDuties: z.array(z.string()).optional(),
            Education: z.string().optional(),
            Qualifications: z.string().optional(),
            HowToApply: z.string().optional(),
            WhatToExpectNext: z.string().optional(),
            RequiredDocuments: z.string().optional(),
            Benefits: z.string().optional(),
            BenefitsUrl: z.string().optional(),
            OtherInformation: z.string().optional(),
            SecurityClearance: z.string().optional(),
            DrugTestRequired: z.string().optional(),
            TravelRequired: z.string().optional(),
            PromotionPotential: z.string().optional(),
            SupervisoryStatus: z.string().optional(),
            HiringPath: z.array(z.string()).optional(),
            TotalOpenings: z.string().optional(),
            AgencyContactEmail: z.string().optional(),
            AgencyContactPhone: z.string().optional(),
            AgencyContactName: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough(); // Allow extra fields we don't use

// ============================================================================
// INFERRED TYPES (From Zod schemas)
// ============================================================================

/**
 * Inferred TypeScript type from JobCardModelSchema.
 * Use this when you need the Zod-derived type rather than importing from model.ts.
 */
export type InferredJobCardModel = z.infer<typeof JobCardModelSchema>;

/**
 * Inferred TypeScript type from JobDetailModelSchema.
 */
export type InferredJobDetailModel = z.infer<typeof JobDetailModelSchema>;

/**
 * Inferred TypeScript type from RawMockJobSchema.
 */
export type RawMockJob = z.infer<typeof RawMockJobSchema>;

/**
 * Inferred TypeScript type from RawUSAJobsLikeSchema.
 */
export type RawUSAJobsLike = z.infer<typeof RawUSAJobsLikeSchema>;

// ============================================================================
// SAFE PARSING HELPER
// ============================================================================

/**
 * Safely parse data with a Zod schema, collecting warnings instead of throwing.
 *
 * HOW IT WORKS:
 * 1. Attempts to parse data with the provided schema
 * 2. On SUCCESS: Returns the parsed (typed) data
 * 3. On FAILURE: Pushes formatted error messages to warnings array, returns null
 *
 * WHY THIS PATTERN:
 * - We don't want to throw on bad data (graceful degradation)
 * - We want to collect ALL issues, not just the first one
 * - We want warnings in diagnostics for debugging
 * - We want to continue processing even with partial data
 *
 * EXAMPLE:
 * ```typescript
 * const warnings: string[] = [];
 *
 * // Parse a job card
 * const card = safeParseOrWarn(
 *   JobCardModelSchema,
 *   rawData,
 *   warnings,
 *   'Parsing job card'
 * );
 *
 * if (card) {
 *   // card is typed as JobCardModel
 *   console.log('Parsed:', card.title);
 * } else {
 *   // Parsing failed, check warnings
 *   console.error('Parse failed:', warnings);
 * }
 *
 * // Either way, warnings array now contains any issues
 * console.log('Warnings:', warnings);
 * ```
 *
 * @param schema - The Zod schema to parse with
 * @param data - The data to parse (unknown type)
 * @param warnings - Array to push warning messages into
 * @param contextLabel - Label for context in warning messages (e.g., "Job card parsing")
 * @returns Parsed data (typed) or null if parsing failed
 */
export function safeParseOrWarn<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  warnings: string[],
  contextLabel: string
): z.infer<T> | null {
  // Attempt to parse the data with Zod's safeParse (doesn't throw)
  const parseResult = schema.safeParse(data);

  // If parsing succeeded, return the typed data
  if (parseResult.success) {
    return parseResult.data;
  }

  // Parsing failed - collect all errors as warnings
  // Zod errors are structured; we format them as readable strings

  // Get the issues array from the error
  const issues = parseResult.error.issues;

  // Format each issue as a warning message
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];

    // Build the field path (e.g., "location.city" or "[0].title")
    const path = issue.path.join('.');

    // Build the warning message
    let warningMessage = '[' + contextLabel + '] ';

    if (path) {
      warningMessage = warningMessage + 'Field "' + path + '": ';
    }

    warningMessage = warningMessage + issue.message;

    // Add code for more specific debugging
    warningMessage = warningMessage + ' (code: ' + issue.code + ')';

    // Push to warnings array
    warnings.push(warningMessage);
  }

  // Return null to indicate parsing failed
  return null;
}

/**
 * Parse data and throw if invalid (for cases where we MUST have valid data).
 *
 * WHY BOTH safeParseOrWarn AND strictParse:
 * - safeParseOrWarn: For graceful degradation (show partial data with warnings)
 * - strictParse: For critical paths where invalid data would cause crashes
 *
 * EXAMPLE:
 * ```typescript
 * try {
 *   const job = strictParse(JobCardModelSchema, data, 'Loading selected job');
 *   // job is guaranteed to be valid here
 * } catch (error) {
 *   // Handle the error (show error UI, log, etc.)
 * }
 * ```
 *
 * @param schema - The Zod schema to parse with
 * @param data - The data to parse
 * @param contextLabel - Label for error messages
 * @returns Parsed data (typed)
 * @throws Error with formatted message if parsing fails
 */
export function strictParse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  contextLabel: string
): z.infer<T> {
  const warnings: string[] = [];
  const result = safeParseOrWarn(schema, data, warnings, contextLabel);

  if (result === null) {
    // Build an error message from warnings
    const errorMessage =
      '[' + contextLabel + '] Validation failed:\n' + warnings.join('\n');
    throw new Error(errorMessage);
  }

  return result;
}
