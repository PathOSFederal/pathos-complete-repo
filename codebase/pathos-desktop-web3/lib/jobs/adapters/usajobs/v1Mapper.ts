/**
 * ============================================================================
 * USAJOBS MAPPER v1
 * ============================================================================
 *
 * FILE PURPOSE:
 * Maps USAJOBS-like API response payloads into the canonical JobCardModel
 * and JobDetailModel formats. This is the mapper for Phase 2 when we
 * integrate with real USAJOBS.gov data.
 *
 * WHERE IT FITS:
 * ┌──────────────────┐     ┌────────────────┐     ┌────────────────┐
 * │  USAJOBS API     │ --> │  THIS MAPPER   │ --> │  Canonical     │
 * │  Response        │     │  (v1Mapper.ts) │     │  Models        │
 * └──────────────────┘     └────────────────┘     └────────────────┘
 *
 * USAJOBS API STRUCTURE:
 * The USAJOBS API returns deeply nested JSON. Key fields we map:
 *
 * ```json
 * {
 *   "MatchedObjectId": "12345678",
 *   "PositionTitle": "Program Analyst",
 *   "PositionLocationDisplay": "Washington, DC",
 *   "OrganizationName": "Department of Defense",
 *   "DepartmentName": "Office of the Secretary",
 *   "JobGrade": [{ "Code": "GS-14" }],
 *   "PositionRemuneration": [{
 *     "MinimumRange": "122198",
 *     "MaximumRange": "158860"
 *   }],
 *   "UserArea": {
 *     "Details": {
 *       "JobSummary": "This position...",
 *       "MajorDuties": ["Duty 1", "Duty 2"]
 *     }
 *   }
 * }
 * ```
 *
 * MAPPER VERSION: usajobs-v1
 *
 * NOTE: For Day 12 (Tier 1), we don't have real USAJOBS integration yet.
 * This mapper is prepared for Phase 2. It can be tested with mock data
 * that mimics the USAJOBS API shape.
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import type {
  JobCardModel,
  JobDetailModel,
  JobDiagnostics,
  JobCardWithDiagnostics,
  JobDetailWithDiagnostics,
  NormalizedLocation,
  PayRange,
} from '../../model';
import { RawUSAJobsLikeSchema, safeParseOrWarn, type RawUSAJobsLike } from '../../schemas';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Version identifier for this mapper.
 */
const MAPPER_VERSION = 'usajobs-v1';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely extract the first element from an array, or undefined.
 *
 * WHY THIS HELPER:
 * USAJOBS often wraps single values in arrays (e.g., JobGrade: [{ Code: "GS-14" }]).
 * This helper safely extracts the first element without crashing on undefined.
 *
 * @param arr - Array or undefined
 * @returns First element or undefined
 */
function first<T>(arr: T[] | undefined): T | undefined {
  if (!arr || arr.length === 0) {
    return undefined;
  }
  return arr[0];
}

/**
 * Parse a location array from USAJOBS format.
 *
 * USAJOBS location format:
 * ```json
 * "PositionLocation": [{
 *   "LocationName": "Washington, District of Columbia",
 *   "CityName": "Washington",
 *   "CountryCode": "United States",
 *   "CountrySubDivisionCode": "District of Columbia"
 * }]
 * ```
 *
 * @param positionLocation - Array of location objects
 * @param positionLocationDisplay - Display string fallback
 * @param warnings - Warnings array
 * @returns NormalizedLocation
 */
function parseUSAJobsLocation(
  positionLocation: RawUSAJobsLike['PositionLocation'],
  positionLocationDisplay: string | undefined,
  warnings: string[]
): NormalizedLocation {
  // Try to parse structured location first
  const loc = first(positionLocation);

  if (loc) {
    // Check if it's remote (various indicators)
    const locationName = (loc.LocationName || '').toLowerCase();
    const isRemote =
      locationName.indexOf('remote') >= 0 ||
      locationName.indexOf('anywhere') >= 0 ||
      locationName.indexOf('negotiable') >= 0;

    if (isRemote) {
      return {
        isRemote: true,
        country: 'US',
      };
    }

    // Parse state code from CountrySubDivisionCode
    let state: string | undefined;
    const subdivision = loc.CountrySubDivisionCode || '';

    // CountrySubDivisionCode might be full name or code
    // Common mappings for federal jobs
    const stateCodeMap: Record<string, string> = {
      'district of columbia': 'DC',
      washington: 'DC', // Careful: this is ambiguous
      virginia: 'VA',
      maryland: 'MD',
      texas: 'TX',
      california: 'CA',
      colorado: 'CO',
      georgia: 'GA',
      florida: 'FL',
      'new york': 'NY',
      pennsylvania: 'PA',
      ohio: 'OH',
      illinois: 'IL',
    };

    if (subdivision.length === 2) {
      state = subdivision.toUpperCase();
    } else {
      state = stateCodeMap[subdivision.toLowerCase()];
    }

    // Determine country code
    let country = 'US';
    const countryRaw = loc.CountryCode || '';
    if (countryRaw.toLowerCase() !== 'united states' && countryRaw.length === 2) {
      country = countryRaw.toUpperCase();
    }

    return {
      city: loc.CityName,
      state: state,
      country: country,
      isRemote: false,
    };
  }

  // Fall back to parsing display string
  if (positionLocationDisplay) {
    const display = positionLocationDisplay.toLowerCase();

    if (display.indexOf('remote') >= 0 || display.indexOf('anywhere') >= 0) {
      return {
        isRemote: true,
        country: 'US',
      };
    }

    // Try "City, State" parsing
    const commaIndex = positionLocationDisplay.indexOf(',');
    if (commaIndex > 0) {
      const city = positionLocationDisplay.substring(0, commaIndex).trim();
      const stateRaw = positionLocationDisplay.substring(commaIndex + 1).trim();

      // Extract state code
      let state: string | undefined;
      if (stateRaw.length <= 3) {
        state = stateRaw.toUpperCase();
      }

      return {
        city: city,
        state: state,
        country: 'US',
        isRemote: false,
      };
    }
  }

  // Could not parse
  if (positionLocationDisplay) {
    warnings.push('Could not parse location: "' + positionLocationDisplay + '"');
  } else {
    warnings.push('No location data provided');
  }

  return {
    country: 'US',
  };
}

/**
 * Parse salary range from USAJOBS format.
 *
 * USAJOBS salary format:
 * ```json
 * "PositionRemuneration": [{
 *   "MinimumRange": "122198",
 *   "MaximumRange": "158860",
 *   "RateIntervalCode": "PA" // Per Annum
 * }]
 * ```
 *
 * @param remuneration - Array of salary objects
 * @param warnings - Warnings array
 * @returns PayRange
 */
function parseUSAJobsSalary(
  remuneration: RawUSAJobsLike['PositionRemuneration'],
  warnings: string[]
): PayRange {
  const salary = first(remuneration);

  if (!salary) {
    warnings.push('No salary information provided');
    return {
      currency: 'USD',
      displayText: 'Salary not specified',
    };
  }

  // Parse min/max as numbers
  const min = salary.MinimumRange ? parseFloat(salary.MinimumRange) : undefined;
  const max = salary.MaximumRange ? parseFloat(salary.MaximumRange) : undefined;

  // Validate parsed values
  const validMin = min !== undefined && !isNaN(min) ? min : undefined;
  const validMax = max !== undefined && !isNaN(max) ? max : undefined;

  if (validMin === undefined && validMax === undefined) {
    warnings.push('Could not parse salary values');
    return {
      currency: 'USD',
      displayText: 'Salary not specified',
    };
  }

  // Build display text
  let displayText: string;
  if (validMin !== undefined && validMax !== undefined) {
    displayText = '$' + validMin.toLocaleString() + ' - $' + validMax.toLocaleString();
  } else if (validMin !== undefined) {
    displayText = '$' + validMin.toLocaleString() + '+';
  } else if (validMax !== undefined) {
    displayText = 'Up to $' + validMax.toLocaleString();
  } else {
    displayText = 'Salary varies';
  }

  // Add interval if not annual
  const interval = salary.RateIntervalCode || 'PA';
  if (interval !== 'PA') {
    displayText = displayText + ' (' + interval + ')';
  }

  return {
    min: validMin,
    max: validMax,
    currency: 'USD',
    displayText: displayText,
  };
}

/**
 * Extract grade from USAJOBS JobGrade array.
 *
 * @param jobGrade - Array of grade objects
 * @returns Grade string or undefined
 */
function extractGrade(jobGrade: RawUSAJobsLike['JobGrade']): string | undefined {
  const grade = first(jobGrade);
  return grade?.Code;
}

/**
 * Extract series code from USAJOBS JobCategory array.
 *
 * @param jobCategory - Array of category objects
 * @returns Series code or undefined
 */
function extractSeriesCode(jobCategory: RawUSAJobsLike['JobCategory']): string | undefined {
  const category = first(jobCategory);
  return category?.Code;
}

/**
 * Extract schedule from USAJOBS PositionSchedule array.
 *
 * @param schedule - Array of schedule objects
 * @returns Schedule name or undefined
 */
function extractSchedule(schedule: RawUSAJobsLike['PositionSchedule']): string | undefined {
  const sched = first(schedule);
  return sched?.Name;
}

/**
 * Extract appointment type from USAJOBS PositionOfferingType array.
 *
 * @param offering - Array of offering type objects
 * @returns Appointment type name or undefined
 */
function extractAppointmentType(
  offering: RawUSAJobsLike['PositionOfferingType']
): string | undefined {
  const type = first(offering);
  return type?.Name;
}

/**
 * Compute tags for a USAJOBS job.
 *
 * USAJOBS-SPECIFIC TAGS:
 * - "Remote" if remote/telework eligible
 * - Grade badge (e.g., "GS-14")
 * - "Open to Public" if public hiring path
 * - "Closing Soon" if within 7 days
 * - Series code if present
 *
 * @param job - Partial job data
 * @param teleworkEligible - Telework flag from USAJOBS
 * @param location - Normalized location
 * @param closeDate - Close date string
 * @param hiringPaths - Array of hiring paths
 * @returns Array of tag strings
 */
function computeUSAJobsTags(
  job: {
    gradeLevel?: string;
    seriesCode?: string;
  },
  teleworkEligible: boolean | undefined,
  location: NormalizedLocation,
  closeDate: string | undefined,
  hiringPaths: string[] | undefined
): string[] {
  const tags: string[] = [];

  // Remote tag
  if (location.isRemote || teleworkEligible === true) {
    tags.push('Remote');
  }

  // Grade tag
  if (job.gradeLevel) {
    tags.push(job.gradeLevel);
  }

  // Open to Public tag
  if (hiringPaths && hiringPaths.length > 0) {
    for (let i = 0; i < hiringPaths.length; i++) {
      const path = hiringPaths[i].toLowerCase();
      if (path.indexOf('public') >= 0 || path.indexOf('all') >= 0) {
        tags.push('Open to Public');
        break;
      }
    }
  }

  // Closing Soon tag
  if (closeDate) {
    try {
      const closeTime = new Date(closeDate).getTime();
      const now = Date.now();
      const daysUntilClose = (closeTime - now) / (1000 * 60 * 60 * 24);

      if (daysUntilClose > 0 && daysUntilClose <= 7) {
        tags.push('Closing Soon');
      }
    } catch {
      // Ignore date parsing errors
    }
  }

  return tags;
}

// ============================================================================
// MAIN MAPPER FUNCTIONS
// ============================================================================

/**
 * Maps a USAJOBS-like raw payload to a canonical JobCardModel with diagnostics.
 *
 * HOW IT WORKS:
 * 1. Validate input with Zod schema (lenient, collect warnings)
 * 2. Extract and normalize each field from USAJOBS structure
 * 3. Compute derived fields (tags, location, pay range)
 * 4. Attach diagnostics
 *
 * HANDLING INVALID INPUT:
 * If input is invalid, we still return a minimal JobCardModel.
 * The UI can show it with an "incomplete data" indicator.
 *
 * @param rawJob - Unknown data that should be a USAJOBS-like payload
 * @returns JobCardWithDiagnostics
 */
export function mapUSAJobsToCard(rawJob: unknown): JobCardWithDiagnostics {
  const warnings: string[] = [];
  const fetchedAt = new Date().toISOString();

  // ==========================================================================
  // STEP 1: Validate input with Zod schema
  // ==========================================================================
  const parsed = safeParseOrWarn(
    RawUSAJobsLikeSchema,
    rawJob,
    warnings,
    'USAJOBS payload validation'
  );

  // Handle complete parsing failure
  if (!parsed) {
    const rawObj = typeof rawJob === 'object' && rawJob !== null ? rawJob : {};
    const rawRecord = rawObj as Record<string, unknown>;

    // Try to salvage an ID
    let fallbackId = 'unknown-' + Date.now();
    if (typeof rawRecord['MatchedObjectId'] === 'string') {
      fallbackId = rawRecord['MatchedObjectId'];
    }

    // Try to salvage a title
    const fallbackTitle =
      typeof rawRecord['PositionTitle'] === 'string'
        ? rawRecord['PositionTitle']
        : 'Untitled Position';

    warnings.push('Using fallback values due to validation failure');

    const minimalCard: JobCardModel = {
      id: fallbackId,
      title: fallbackTitle,
      source: 'usajobs',
      tags: [],
    };

    const diagnostics: JobDiagnostics = {
      raw: rawJob,
      warnings: warnings,
      source: 'usajobs',
      mapperVersion: MAPPER_VERSION,
      fetchedAtISO: fetchedAt,
    };

    return {
      ...minimalCard,
      diagnostics: diagnostics,
    };
  }

  // ==========================================================================
  // STEP 2: Extract and map fields
  // ==========================================================================

  // ID
  const id = parsed.MatchedObjectId || 'unknown-' + Date.now();
  if (!parsed.MatchedObjectId) {
    warnings.push('Missing MatchedObjectId, using generated ID');
  }

  // Title
  const title = parsed.PositionTitle || 'Untitled Position';
  if (!parsed.PositionTitle) {
    warnings.push('Missing PositionTitle, using fallback');
  }

  // Location
  const location = parseUSAJobsLocation(
    parsed.PositionLocation,
    parsed.PositionLocationDisplay,
    warnings
  );
  const locationDisplay = parsed.PositionLocationDisplay || 'Location not specified';

  // Organization
  const organizationName = parsed.OrganizationName;
  const departmentName = parsed.DepartmentName;

  // Grade and Series
  const gradeLevel = extractGrade(parsed.JobGrade);
  const seriesCode = extractSeriesCode(parsed.JobCategory);

  // Pay
  const payRange = parseUSAJobsSalary(parsed.PositionRemuneration, warnings);
  const estimatedTotalComp = payRange.max
    ? Math.round((payRange.min || payRange.max) * 1.1)
    : undefined;

  // Work arrangement
  const workSchedule = extractSchedule(parsed.PositionSchedule);
  const employmentType = extractAppointmentType(parsed.PositionOfferingType);

  // Telework
  let teleworkEligibility = 'On-site';
  if (parsed.TeleworkEligible === true || location.isRemote) {
    teleworkEligibility = location.isRemote ? 'Remote' : 'Telework Eligible';
  }

  // Dates
  const openDate = parsed.PublicationStartDate || parsed.PositionStartDate;
  const closeDate = parsed.ApplicationCloseDate || parsed.PositionEndDate;

  // URLs
  const postingUrl = parsed.PositionURI;
  const applyUrl = first(parsed.ApplyURI);

  // Hiring paths from UserArea
  const hiringPaths = parsed.UserArea?.Details?.HiringPath;

  // Compute tags
  const tags = computeUSAJobsTags(
    { gradeLevel: gradeLevel, seriesCode: seriesCode },
    parsed.TeleworkEligible,
    location,
    closeDate,
    hiringPaths
  );

  // ==========================================================================
  // STEP 3: Build the card model
  // ==========================================================================
  const card: JobCardModel = {
    id: id,
    source: 'usajobs',
    title: title,
    seriesCode: seriesCode,
    gradeLevel: gradeLevel,
    organizationName: organizationName,
    departmentName: departmentName,
    location: location,
    locationDisplay: locationDisplay,
    payRange: payRange,
    estimatedTotalComp: estimatedTotalComp,
    employmentType: employmentType,
    workSchedule: workSchedule,
    teleworkEligibility: teleworkEligibility,
    openDate: openDate,
    closeDate: closeDate,
    postingUrl: postingUrl,
    applyUrl: applyUrl,
    tags: tags,
  };

  // ==========================================================================
  // STEP 4: Build diagnostics and return
  // ==========================================================================
  const diagnostics: JobDiagnostics = {
    raw: rawJob,
    warnings: warnings,
    source: 'usajobs',
    mapperVersion: MAPPER_VERSION,
    fetchedAtISO: fetchedAt,
  };

  return {
    ...card,
    diagnostics: diagnostics,
  };
}

/**
 * Maps a USAJOBS-like raw payload to a canonical JobDetailModel with diagnostics.
 *
 * @param rawJob - Unknown data that should be a USAJOBS-like payload
 * @returns JobDetailWithDiagnostics
 */
export function mapUSAJobsToDetail(rawJob: unknown): JobDetailWithDiagnostics {
  // Start with card mapping
  const cardWithDiagnostics = mapUSAJobsToCard(rawJob);
  const { diagnostics, ...card } = cardWithDiagnostics;

  // Parse the payload again for detail fields
  const parsed = safeParseOrWarn(RawUSAJobsLikeSchema, rawJob, [], 'USAJOBS detail extraction');

  // Extract UserArea.Details
  const details = parsed?.UserArea?.Details;

  // Build detail model
  const detail: JobDetailModel = {
    ...card,

    // Identifiers
    announcementNumber: parsed?.PositionID,

    // Content
    summary: details?.JobSummary,
    duties: details?.MajorDuties,

    // Qualifications
    qualificationsMinimum: details?.Qualifications,
    qualificationsEducation: details?.Education,

    // Hiring info
    hiringPaths: details?.HiringPath,
    promotionPotential: details?.PromotionPotential,
    isSupervisory: details?.SupervisoryStatus
      ? details.SupervisoryStatus.toLowerCase().indexOf('supervisory') >= 0
      : undefined,

    // Security
    clearanceLevel: details?.SecurityClearance,
    drugTestRequired: details?.DrugTestRequired
      ? details.DrugTestRequired.toLowerCase() === 'yes'
      : undefined,

    // Travel
    travelRequirement: details?.TravelRequired,

    // Contact
    contactName: details?.AgencyContactName,
    contactEmail: details?.AgencyContactEmail,
    contactPhone: details?.AgencyContactPhone,
  };

  return {
    ...detail,
    diagnostics: diagnostics,
  };
}

/**
 * Maps an array of USAJOBS-like payloads to canonical JobCardModels.
 *
 * @param rawJobs - Array of unknown data
 * @returns Array of JobCardWithDiagnostics
 */
export function mapUSAJobsToCards(rawJobs: unknown[]): JobCardWithDiagnostics[] {
  const results: JobCardWithDiagnostics[] = [];

  for (let i = 0; i < rawJobs.length; i++) {
    const mapped = mapUSAJobsToCard(rawJobs[i]);
    results.push(mapped);
  }

  return results;
}
