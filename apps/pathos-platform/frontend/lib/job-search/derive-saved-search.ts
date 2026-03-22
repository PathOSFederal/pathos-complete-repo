/**
 * ============================================================================
 * DERIVE SAVED SEARCH FROM JOB (Day 15 - Create Alert for Similar Jobs)
 * ============================================================================
 *
 * FILE PURPOSE:
 * When a user clicks "Create alert for similar jobs" on a selected job,
 * we need to derive a saved search configuration that would find similar jobs.
 * This file provides the logic to:
 * 1. Extract relevant filter criteria from a job
 * 2. Compute a grade band around the selected grade
 * 3. Infer series codes from job titles
 * 4. Generate a signature for deduplication
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │  Selected Job   │ --> │  THIS FILE      │ --> │ jobSearchStore │
 * │  Panel (UI)     │     │  (derivation)   │     │ savedSearches  │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *
 * HOUSE RULES COMPLIANCE (Day 15):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 15 - Create Alert for Similar Jobs Feature
 * ============================================================================
 */

import type { JobSearchFilters } from '@/store/jobSearchStore';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Input job data for deriving a similar-jobs search.
 * Uses canonical field names from JobCardModel/JobDetailModel.
 */
export interface JobForDerivation {
  /** Job title, e.g., "Management Analyst" */
  title: string;
  /** Series code, e.g., "0343" (optional, will infer if missing) */
  seriesCode?: string;
  /** Grade level, e.g., "GS-13" */
  gradeLevel?: string;
  /** Location display string, e.g., "Washington, DC" */
  locationDisplay?: string;
  /** Organization name, e.g., "Department of Defense" */
  organizationName?: string;
  /** Telework eligibility, e.g., "Remote", "Hybrid", "On-site Only" */
  teleworkEligibility?: string;
  /** Segment: federal, military, civilian */
  segment?: 'federal' | 'military' | 'civilian';
}

/**
 * Options for customizing the derived search.
 */
export interface DeriveOptions {
  /** If true, constrain to the same agency */
  preferSameAgency: boolean;
}

/**
 * Result of deriving a saved search from a job.
 */
export interface DerivedSavedSearch {
  /** Auto-generated label for the saved search */
  label: string;
  /** Filter configuration for the search */
  filters: Partial<JobSearchFilters>;
  /** Signature for deduplication */
  signature: string;
}

// ============================================================================
// SERIES INFERENCE MAP
// ============================================================================

/**
 * Maps common job title keywords to occupational series codes.
 * 
 * WHY THIS MAP:
 * Not all job data includes series codes. When missing, we can infer
 * the series from common title patterns. This enables creating alerts
 * for similar roles even when the source data is incomplete.
 * 
 * FORMAT:
 * Key: lowercase keyword or phrase to match in title
 * Value: 4-digit series code
 */
const TITLE_TO_SERIES_MAP: Record<string, string> = {
  'management analyst': '0343',
  'program analyst': '0343',
  'it specialist': '2210',
  'infosec': '2210',
  'cyber': '2210',
  'information technology': '2210',
  'contract specialist': '1102',
  'contracting officer': '1102',
  'hr specialist': '0201',
  'human resources': '0201',
  'budget analyst': '0560',
  'accountant': '0510',
  'financial analyst': '0501',
  'attorney': '0905',
  'paralegal': '0950',
  'administrative officer': '0341',
  'logistics management': '0346',
  'supply chain': '2001',
  'engineer': '0800',
  'scientist': '1300',
};

/**
 * Maps job titles to keyword synonyms for broader matching.
 * 
 * WHY SYNONYMS:
 * Federal job titles can vary for similar roles. For example:
 * - "Management Analyst" and "Program Analyst" are often interchangeable
 * - Searching for one should include the other
 */
const TITLE_SYNONYMS: Record<string, string[]> = {
  'management analyst': ['program analyst'],
  'program analyst': ['management analyst'],
  'it specialist': ['information technology specialist'],
  'hr specialist': ['human resources specialist'],
};

// ============================================================================
// GRADE BAND COMPUTATION
// ============================================================================

/**
 * Parses a grade level string and returns the numeric grade.
 * 
 * EXAMPLES:
 * - "GS-13" => 13
 * - "GS-14/15" => 14 (uses first grade in range)
 * - "SES" => null (not a GS grade)
 * 
 * @param gradeLevel - Grade level string
 * @returns Numeric grade or null if cannot parse
 */
function parseGradeNumber(gradeLevel: string): number | null {
  if (gradeLevel === null || gradeLevel === undefined || gradeLevel === '') {
    return null;
  }

  const upperGrade = gradeLevel.toUpperCase();

  // Handle GS-XX format
  if (upperGrade.indexOf('GS-') === 0) {
    // Extract number after "GS-"
    const afterPrefix = upperGrade.substring(3);
    // Handle ranges like "13/14" by taking the first number
    let numStr = '';
    for (let i = 0; i < afterPrefix.length; i++) {
      const char = afterPrefix.charAt(i);
      if (char >= '0' && char <= '9') {
        numStr = numStr + char;
      } else {
        break;
      }
    }

    if (numStr.length > 0) {
      return parseInt(numStr, 10);
    }
  }

  // Handle plain number
  let plainNum = '';
  for (let i = 0; i < gradeLevel.length; i++) {
    const char = gradeLevel.charAt(i);
    if (char >= '0' && char <= '9') {
      plainNum = plainNum + char;
    } else if (plainNum.length > 0) {
      break;
    }
  }

  if (plainNum.length > 0) {
    return parseInt(plainNum, 10);
  }

  return null;
}

/**
 * Computes a grade band around the selected grade.
 * 
 * LOGIC:
 * - GS-13 => GS-12..GS-14 (one below, one above)
 * - GS-14 => GS-13..GS-15 (one below, one above)
 * - GS-11 => GS-9..GS-12 (two below for lower grades, one above)
 * - GS-15 => GS-14..GS-15 (cap at 15)
 * - GS-1 => GS-1..GS-2 (can't go below 1)
 * 
 * @param gradeLevel - Grade level string
 * @returns Grade band string like "gs12-gs14" or null
 */
function computeGradeBand(gradeLevel: string): string | null {
  const gradeNum = parseGradeNumber(gradeLevel);

  if (gradeNum === null) {
    return null;
  }

  // Compute lower bound (one or two below, min 1)
  let lower = gradeNum - 1;
  if (gradeNum <= 11) {
    // For lower grades, go two below to capture entry-level progression
    lower = gradeNum - 2;
  }
  if (lower < 1) {
    lower = 1;
  }

  // Compute upper bound (one above, max 15)
  let upper = gradeNum + 1;
  if (upper > 15) {
    upper = 15;
  }

  // Format as "gsXX" for filter compatibility
  return 'gs' + lower + '-gs' + upper;
}

// ============================================================================
// TELEWORK PREFERENCE EXTRACTION
// ============================================================================

/**
 * Extracts telework preference from job data.
 * 
 * MAPPING:
 * - Contains "remote" => 'remote-only'
 * - Contains "hybrid" => 'remote-or-telework'
 * - Contains "on-site" or "onsite" => 'on-site-preferred'
 * - Otherwise => null (no constraint)
 * 
 * @param teleworkEligibility - Telework eligibility string
 * @param locationDisplay - Location display string (backup check)
 * @returns Telework preference filter value or null
 */
function extractTeleworkPreference(
  teleworkEligibility: string | undefined,
  locationDisplay: string | undefined
): 'remote-only' | 'remote-or-telework' | 'on-site-preferred' | null {
  // Check telework eligibility first
  if (teleworkEligibility !== undefined && teleworkEligibility !== null && teleworkEligibility !== '') {
    const lower = teleworkEligibility.toLowerCase();

    if (lower.indexOf('remote') !== -1) {
      return 'remote-only';
    }
    if (lower.indexOf('hybrid') !== -1 || lower.indexOf('telework') !== -1) {
      return 'remote-or-telework';
    }
    if (lower.indexOf('on-site') !== -1 || lower.indexOf('onsite') !== -1) {
      return 'on-site-preferred';
    }
  }

  // Fallback: check location display
  if (locationDisplay !== undefined && locationDisplay !== null && locationDisplay !== '') {
    const lower = locationDisplay.toLowerCase();

    if (lower.indexOf('remote') !== -1) {
      return 'remote-only';
    }
  }

  return null;
}

// ============================================================================
// SERIES INFERENCE
// ============================================================================

/**
 * Infers series code from job title if not provided.
 * 
 * HOW IT WORKS:
 * 1. If series code is provided and valid, use it
 * 2. Otherwise, search for known keywords in title
 * 3. Return first matching series or null
 * 
 * @param title - Job title
 * @param seriesCode - Existing series code (may be undefined)
 * @returns Series code or null
 */
function inferSeriesCode(title: string, seriesCode: string | undefined): string | null {
  // Use provided series if valid
  if (seriesCode !== undefined && seriesCode !== null && seriesCode !== '') {
    // Validate it looks like a series code (4 digits)
    if (seriesCode.length === 4) {
      return seriesCode;
    }
    // Try to extract 4-digit code
    let digits = '';
    for (let i = 0; i < seriesCode.length; i++) {
      const char = seriesCode.charAt(i);
      if (char >= '0' && char <= '9') {
        digits = digits + char;
      }
      if (digits.length === 4) {
        return digits;
      }
    }
    if (digits.length === 4) {
      return digits;
    }
  }

  // Infer from title
  const lowerTitle = title.toLowerCase();

  const keywords = Object.keys(TITLE_TO_SERIES_MAP);
  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    if (lowerTitle.indexOf(keyword) !== -1) {
      return TITLE_TO_SERIES_MAP[keyword];
    }
  }

  return null;
}

// ============================================================================
// KEYWORD GENERATION
// ============================================================================

/**
 * Generates search keywords from job title.
 * Includes synonyms for broader matching.
 * 
 * @param title - Job title
 * @returns Keywords string for search query
 */
function generateKeywords(title: string): string {
  const lowerTitle = title.toLowerCase();
  let keywords = title;

  // Add synonyms if title matches known patterns
  const synonymKeys = Object.keys(TITLE_SYNONYMS);
  for (let i = 0; i < synonymKeys.length; i++) {
    const key = synonymKeys[i];
    if (lowerTitle.indexOf(key) !== -1) {
      const synonyms = TITLE_SYNONYMS[key];
      for (let j = 0; j < synonyms.length; j++) {
        // Add synonym if not already in keywords
        if (keywords.toLowerCase().indexOf(synonyms[j]) === -1) {
          keywords = keywords + ' ' + synonyms[j];
        }
      }
    }
  }

  return keywords;
}

// ============================================================================
// LOCATION BUCKETING
// ============================================================================

/**
 * Extracts a location bucket (state) from location display.
 * For non-remote jobs, we constrain to the same state/metro area.
 * 
 * WHY BUCKET:
 * Exact city matching is too narrow (might miss nearby opportunities).
 * State-level matching is a reasonable balance.
 * 
 * @param locationDisplay - Location display string
 * @returns State abbreviation or null
 */
function extractLocationBucket(locationDisplay: string | undefined): string | null {
  if (locationDisplay === undefined || locationDisplay === null || locationDisplay === '') {
    return null;
  }

  const lower = locationDisplay.toLowerCase();

  // Don't constrain for remote
  if (lower.indexOf('remote') !== -1) {
    return null;
  }

  // Look for state abbreviations (2 uppercase letters)
  // Common pattern: "City, ST" or "City, State"
  const parts = locationDisplay.split(',');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim();
    // Check if it's a 2-letter state code
    if (lastPart.length === 2) {
      return lastPart.toLowerCase();
    }
    // Check for "DC" specifically
    if (lastPart.toUpperCase() === 'DC' || lastPart.toLowerCase().indexOf('dc') !== -1) {
      return 'dc';
    }
  }

  return null;
}

// ============================================================================
// SIGNATURE GENERATION
// ============================================================================

/**
 * Generates a signature string for deduplication.
 * 
 * FORMAT:
 * segment|series|titleNormalized|gradeBand|teleworkPreference|locationBucket|agencyOrAny
 * 
 * EXAMPLE:
 * "federal|0343|management analyst|gs12-gs14|remote-only|any|any"
 * 
 * @param job - Job data
 * @param filters - Derived filters
 * @param options - Derivation options
 * @returns Signature string
 */
function generateSignature(
  job: JobForDerivation,
  filters: Partial<JobSearchFilters>,
  options: DeriveOptions
): string {
  const parts: string[] = [];

  // Segment
  const segment = job.segment !== undefined && job.segment !== null ? job.segment : 'federal';
  parts.push(segment);

  // Series
  const series = filters.seriesCode !== undefined && filters.seriesCode !== null
    ? filters.seriesCode
    : 'any';
  parts.push(series);

  // Normalized title (lowercase, trimmed)
  const titleNorm = job.title.toLowerCase().trim();
  parts.push(titleNorm);

  // Grade band
  const gradeBand = filters.gradeBand !== undefined && filters.gradeBand !== null
    ? filters.gradeBand
    : 'any';
  parts.push(gradeBand);

  // Telework preference
  const telework = filters.teleworkPreference !== undefined && filters.teleworkPreference !== null
    ? filters.teleworkPreference
    : 'any';
  parts.push(telework);

  // Location bucket
  const location = filters.location !== undefined && filters.location !== null
    ? filters.location
    : 'any';
  parts.push(location);

  // Agency (only if preferSameAgency is true)
  let agency = 'any';
  if (options.preferSameAgency && job.organizationName !== undefined && job.organizationName !== null) {
    agency = job.organizationName.toLowerCase().trim();
  }
  parts.push(agency);

  return parts.join('|');
}

// ============================================================================
// LABEL GENERATION
// ============================================================================

/**
 * Generates a human-readable label for the saved search.
 * 
 * FORMAT:
 * "series • gradeBand • telework"
 * 
 * EXAMPLE:
 * "0343 • GS-12–14 • Remote"
 * 
 * @param job - Job data
 * @param filters - Derived filters
 * @returns Label string
 */
function generateLabel(
  job: JobForDerivation,
  filters: Partial<JobSearchFilters>
): string {
  const labelParts: string[] = [];

  // Series
  if (filters.seriesCode !== undefined && filters.seriesCode !== null && filters.seriesCode !== '') {
    labelParts.push(filters.seriesCode);
  }

  // Grade band (format nicely)
  if (filters.gradeBand !== undefined && filters.gradeBand !== null && filters.gradeBand !== '') {
    // Convert "gs12-gs14" to "GS-12–14"
    const gradeBand = filters.gradeBand;
    const match = gradeBand.match(/gs(\d+)-gs(\d+)/i);
    if (match !== null && match.length === 3) {
      labelParts.push('GS-' + match[1] + '–' + match[2]);
    } else {
      labelParts.push(gradeBand.toUpperCase());
    }
  } else if (job.gradeLevel !== undefined && job.gradeLevel !== null && job.gradeLevel !== '') {
    labelParts.push(job.gradeLevel);
  }

  // Telework preference
  if (filters.teleworkPreference !== undefined && filters.teleworkPreference !== null) {
    if (filters.teleworkPreference === 'remote-only') {
      labelParts.push('Remote');
    } else if (filters.teleworkPreference === 'remote-or-telework') {
      labelParts.push('Hybrid');
    } else if (filters.teleworkPreference === 'on-site-preferred') {
      labelParts.push('On-site');
    }
  }

  // If no parts, use title
  if (labelParts.length === 0) {
    return 'Similar to: ' + job.title;
  }

  return labelParts.join(' • ');
}

// ============================================================================
// MAIN DERIVATION FUNCTION
// ============================================================================

/**
 * Derives a saved search configuration from a selected job.
 * 
 * HOW IT WORKS:
 * 1. Extract segment (default: federal)
 * 2. Infer or use provided series code
 * 3. Generate keywords from title with synonyms
 * 4. Compute grade band around selected grade
 * 5. Extract telework preference
 * 6. Bucket location (state level) for non-remote
 * 7. Optionally constrain to same agency
 * 8. Generate signature for deduplication
 * 9. Generate human-readable label
 * 
 * DERIVATION RULES (from spec):
 * A) Hard anchors: segment, series, keywords
 * B) Strong constraints: grade band, telework
 * C) Soft constraints: agency (optional), location (state bucket)
 * 
 * @param job - Job data to derive from
 * @param options - Customization options
 * @returns Derived saved search configuration
 * 
 * @example
 * const result = deriveSavedSearchFromJob(
 *   {
 *     title: 'Management Analyst',
 *     seriesCode: '0343',
 *     gradeLevel: 'GS-13',
 *     locationDisplay: 'Washington, DC',
 *     teleworkEligibility: 'Remote',
 *     segment: 'federal',
 *   },
 *   { preferSameAgency: false }
 * );
 * // result.label: "0343 • GS-12–14 • Remote"
 * // result.signature: "federal|0343|management analyst|gs12-gs14|remote-only|any|any"
 */
export function deriveSavedSearchFromJob(
  job: JobForDerivation,
  options: DeriveOptions
): DerivedSavedSearch {
  // Build filters object
  const filters: Partial<JobSearchFilters> = {};

  // ========================================================================
  // A) HARD ANCHORS
  // ========================================================================

  // Segment (default: federal)
  const segment = job.segment !== undefined && job.segment !== null ? job.segment : 'federal';
  filters.segment = segment;

  // Series code (infer if missing)
  const series = inferSeriesCode(job.title, job.seriesCode);
  if (series !== null) {
    filters.seriesCode = series;
    // Also add to seriesCodes array
    filters.seriesCodes = [series];
  }

  // Keywords (title + synonyms)
  const keywords = generateKeywords(job.title);
  filters.query = keywords;

  // ========================================================================
  // B) STRONG CONSTRAINTS
  // ========================================================================

  // Grade band
  if (job.gradeLevel !== undefined && job.gradeLevel !== null && job.gradeLevel !== '') {
    const gradeBand = computeGradeBand(job.gradeLevel);
    if (gradeBand !== null) {
      filters.gradeBand = gradeBand;
    }
  }

  // Telework preference
  const telework = extractTeleworkPreference(job.teleworkEligibility, job.locationDisplay);
  if (telework !== null) {
    filters.teleworkPreference = telework;
  }

  // ========================================================================
  // C) SOFT CONSTRAINTS
  // ========================================================================

  // Agency (only if preferSameAgency is true)
  // NOTE: We don't set agency filter because it would require mapping
  // organization names to filter codes. For now, we include it in
  // the signature for deduplication but not in the actual filters.
  // Future: add agency mapping table.

  // Location bucket (state level for non-remote)
  if (telework !== 'remote-only') {
    const locationBucket = extractLocationBucket(job.locationDisplay);
    if (locationBucket !== null) {
      filters.location = locationBucket;
    }
  }

  // ========================================================================
  // GENERATE SIGNATURE AND LABEL
  // ========================================================================

  const signature = generateSignature(job, filters, options);
  const label = generateLabel(job, filters);

  return {
    label: label,
    filters: filters,
    signature: signature,
  };
}

/**
 * Checks if a saved search with the given signature already exists.
 * 
 * @param signature - Signature to check
 * @param existingSignatures - Array of existing signatures
 * @returns true if duplicate exists, false otherwise
 */
export function isDuplicateSignature(
  signature: string,
  existingSignatures: string[]
): boolean {
  for (let i = 0; i < existingSignatures.length; i++) {
    if (existingSignatures[i] === signature) {
      return true;
    }
  }
  return false;
}
