/**
 * ============================================================================
 * MOCK DATA MAPPER v1
 * ============================================================================
 *
 * FILE PURPOSE:
 * Maps our existing mock job data (from lib/mock/job-search.ts) into the
 * canonical JobCardModel and JobDetailModel formats.
 *
 * WHERE IT FITS:
 * ┌─────────────────┐     ┌────────────────┐     ┌────────────────┐
 * │  Mock Job Data  │ --> │  THIS MAPPER   │ --> │  Canonical     │
 * │  (JobResult)    │     │  (v1Mapper.ts) │     │  Models        │
 * └─────────────────┘     └────────────────┘     └────────────────┘
 *
 * WHY THIS EXISTS:
 * 1. Our existing mock data has a different shape than the canonical model
 * 2. This mapper bridges that gap, allowing UI to only care about canonical
 * 3. When Phase 2 brings real USAJOBS data, we swap mappers, not UI code
 *
 * CURRENT MOCK SHAPE (from lib/mock/job-search.ts):
 * ```typescript
 * interface JobResult {
 *   id: number;           // --> canonical: id (as string)
 *   role: string;         // --> canonical: title
 *   series: string;       // --> canonical: seriesCode
 *   grade: string;        // --> canonical: gradeLevel
 *   location: string;     // --> canonical: locationDisplay + location
 *   agency: string;       // --> canonical: organizationName
 *   type: string;         // --> canonical: employmentType
 *   estTotalComp: number; // --> canonical: estimatedTotalComp + payRange
 *   retirementImpact: string; // --> canonical: retirementImpact
 *   matchPercent: number; // --> canonical: matchPercent
 * }
 * ```
 *
 * MAPPER VERSION: mock-v1
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
import { RawMockJobSchema, safeParseOrWarn } from '../../schemas';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Version identifier for this mapper.
 * Format: {source}-v{version}
 *
 * WHY VERSIONED:
 * When we fix bugs or change mapping logic, old data may have different issues.
 * The version in diagnostics helps track which mapper produced the data.
 */
const MAPPER_VERSION = 'mock-v1';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse a location string into normalized components.
 *
 * HOW IT WORKS:
 * 1. Check for "Remote" keyword
 * 2. Try to parse "City, State" format
 * 3. Handle edge cases like "Multiple Locations"
 *
 * EXAMPLES:
 * - "Washington, DC" --> { city: "Washington", state: "DC", country: "US" }
 * - "Remote" --> { isRemote: true, country: "US" }
 * - "San Antonio, TX" --> { city: "San Antonio", state: "TX", country: "US" }
 *
 * @param locationStr - Raw location string from mock data
 * @param warnings - Array to collect warnings
 * @returns NormalizedLocation object
 */
function parseLocation(locationStr: string, warnings: string[]): NormalizedLocation {
  // Handle empty/missing location
  if (!locationStr || locationStr.trim() === '') {
    warnings.push('Missing location, defaulting to empty');
    return { country: 'US' };
  }

  const location = locationStr.trim();
  const locationLower = location.toLowerCase();

  // Check for remote
  if (locationLower.indexOf('remote') >= 0) {
    return {
      isRemote: true,
      country: 'US',
    };
  }

  // Check for multiple locations
  if (locationLower.indexOf('multiple') >= 0 || locationLower.indexOf('various') >= 0) {
    return {
      country: 'US',
    };
  }

  // Try to parse "City, State" format
  // Common patterns: "Washington, DC", "San Antonio, TX"
  const commaIndex = location.indexOf(',');
  if (commaIndex > 0) {
    const city = location.substring(0, commaIndex).trim();
    const stateRaw = location.substring(commaIndex + 1).trim();

    // Extract state code (take first 2-3 characters if they look like a state)
    // Handle cases like "TX", "Texas", "District of Columbia"
    let state: string | undefined;

    if (stateRaw.length <= 3) {
      // Already a code like "DC", "TX"
      state = stateRaw.toUpperCase();
    } else {
      // Try to extract state abbreviation from common patterns
      const stateMap: Record<string, string> = {
        'district of columbia': 'DC',
        texas: 'TX',
        colorado: 'CO',
        georgia: 'GA',
        virginia: 'VA',
        maryland: 'MD',
        california: 'CA',
        florida: 'FL',
        'new york': 'NY',
      };
      state = stateMap[stateRaw.toLowerCase()];
    }

    return {
      city: city,
      state: state,
      country: 'US',
      isRemote: false,
    };
  }

  // Could not parse, return as-is with warning
  warnings.push('Could not parse location format: "' + location + '"');
  return {
    country: 'US',
  };
}

/**
 * Build a PayRange from mock data's estTotalComp.
 *
 * HOW IT WORKS:
 * Mock data only has a single "estimated total compensation" number.
 * We create a range by estimating ±10% around that value.
 * This is a heuristic for display purposes.
 *
 * @param estTotalComp - Estimated total compensation from mock
 * @param grade - Grade string for pay plan detection
 * @returns PayRange object
 */
function buildPayRange(estTotalComp: number, grade: string): PayRange {
  // Calculate estimated min/max (±10%)
  const min = Math.round(estTotalComp * 0.9);
  const max = Math.round(estTotalComp * 1.1);

  // Detect pay plan from grade
  let payPlan: string | undefined;
  const gradeLower = grade.toLowerCase();
  if (gradeLower.indexOf('gs-') >= 0 || gradeLower.indexOf('gs') === 0) {
    payPlan = 'GS';
  } else if (gradeLower.indexOf('wg-') >= 0) {
    payPlan = 'WG';
  } else if (gradeLower.indexOf('ses') >= 0) {
    payPlan = 'SES';
  }

  // Format display text
  const displayText = '$' + min.toLocaleString() + ' - $' + max.toLocaleString();

  return {
    min: min,
    max: max,
    currency: 'USD',
    payPlan: payPlan,
    displayText: displayText,
  };
}

/**
 * Compute tags/badges for a job based on its attributes.
 *
 * DESIGN NOTE:
 * Tags are computed by the mapper, not stored in raw data.
 * This centralizes badge logic and ensures consistency.
 *
 * CURRENT TAGS:
 * - "Remote" if location is remote
 * - Grade badge (e.g., "GS-14")
 * - Employment type if not "Federal" (e.g., "Military")
 * - High match indicator if matchPercent >= 90
 *
 * @param job - The partially mapped job data
 * @param locationLower - Lowercase location string
 * @returns Array of tag strings
 */
function computeTags(
  job: {
    gradeLevel?: string;
    employmentType?: string;
    matchPercent?: number;
  },
  locationLower: string
): string[] {
  const tags: string[] = [];

  // Remote tag
  if (locationLower.indexOf('remote') >= 0) {
    tags.push('Remote');
  }

  // Grade tag
  if (job.gradeLevel) {
    tags.push(job.gradeLevel);
  }

  // Employment type tag (only if not standard Federal)
  if (job.employmentType && job.employmentType.toLowerCase() !== 'federal') {
    tags.push(job.employmentType);
  }

  // High match indicator
  if (job.matchPercent !== undefined && job.matchPercent >= 90) {
    tags.push('High Match');
  }

  return tags;
}

// ============================================================================
// MAIN MAPPER FUNCTIONS
// ============================================================================

/**
 * Maps a raw mock job object to a canonical JobCardModel with diagnostics.
 *
 * HOW IT WORKS:
 * 1. Validate input with Zod schema (collect warnings, don't throw)
 * 2. Map each field from mock shape to canonical shape
 * 3. Compute derived fields (tags, location, pay range)
 * 4. Attach diagnostics with raw data and warnings
 *
 * HANDLING INVALID INPUT:
 * If input is completely invalid (not even close to expected shape),
 * we still return a minimal valid JobCardModel with many warnings.
 * The UI can display it with an "incomplete data" indicator.
 *
 * @param rawJob - Unknown data that should be a mock JobResult
 * @returns JobCardWithDiagnostics (always returns something, never throws)
 */
export function mapMockJobToCard(rawJob: unknown): JobCardWithDiagnostics {
  // Initialize warnings array for this mapping operation
  const warnings: string[] = [];

  // Current timestamp for diagnostics
  const fetchedAt = new Date().toISOString();

  // ==========================================================================
  // STEP 1: Validate input with Zod schema
  // ==========================================================================
  const parsed = safeParseOrWarn(RawMockJobSchema, rawJob, warnings, 'Mock job validation');

  // If parsing completely failed, create a minimal fallback
  if (!parsed) {
    // Extract what we can from raw data
    const rawObj = typeof rawJob === 'object' && rawJob !== null ? rawJob : {};
    const rawRecord = rawObj as Record<string, unknown>;

    // Try to get ID from raw data, or generate a fallback
    let fallbackId = 'unknown-' + Date.now();
    if (typeof rawRecord['id'] === 'number') {
      fallbackId = String(rawRecord['id']);
    } else if (typeof rawRecord['id'] === 'string') {
      fallbackId = rawRecord['id'];
    }

    // Try to get title
    const fallbackTitle =
      typeof rawRecord['role'] === 'string'
        ? rawRecord['role']
        : typeof rawRecord['title'] === 'string'
          ? rawRecord['title']
          : 'Untitled Position';

    warnings.push('Using fallback values due to validation failure');

    // Return minimal valid card
    const minimalCard: JobCardModel = {
      id: fallbackId,
      title: fallbackTitle,
      source: 'mock',
      tags: [],
    };

    const diagnostics: JobDiagnostics = {
      raw: rawJob,
      warnings: warnings,
      source: 'mock',
      mapperVersion: MAPPER_VERSION,
      fetchedAtISO: fetchedAt,
    };

    return {
      ...minimalCard,
      diagnostics: diagnostics,
    };
  }

  // ==========================================================================
  // STEP 2: Map validated data to canonical fields
  // ==========================================================================

  // Parse location
  const normalizedLocation = parseLocation(parsed.location, warnings);
  const locationLower = parsed.location.toLowerCase();

  // Build pay range from estTotalComp
  const payRange = buildPayRange(parsed.estTotalComp, parsed.grade);

  // Determine telework eligibility from location
  let teleworkEligibility = 'On-site';
  if (normalizedLocation.isRemote) {
    teleworkEligibility = 'Remote';
  } else if (locationLower.indexOf('hybrid') >= 0 || locationLower.indexOf('telework') >= 0) {
    teleworkEligibility = 'Telework Eligible';
  }

  // Build the card model
  const card: JobCardModel = {
    // Identifiers
    id: String(parsed.id),
    source: 'mock',

    // Core display fields
    title: parsed.role,
    seriesCode: parsed.series,
    gradeLevel: parsed.grade,

    // Organization
    organizationName: parsed.agency,

    // Location
    location: normalizedLocation,
    locationDisplay: parsed.location,

    // Compensation
    payRange: payRange,
    estimatedTotalComp: parsed.estTotalComp,

    // Work arrangement
    employmentType: parsed.type,
    workSchedule: 'Full-time', // Mock data doesn't specify, assume full-time
    teleworkEligibility: teleworkEligibility,

    // PathOS computed fields
    matchPercent: parsed.matchPercent,
    retirementImpact: parsed.retirementImpact,

    // Computed tags
    tags: [], // Will be computed below
  };

  // Compute tags based on mapped data
  card.tags = computeTags(
    {
      gradeLevel: card.gradeLevel,
      employmentType: card.employmentType,
      matchPercent: card.matchPercent,
    },
    locationLower
  );

  // ==========================================================================
  // STEP 3: Build diagnostics
  // ==========================================================================
  const diagnostics: JobDiagnostics = {
    raw: rawJob,
    warnings: warnings,
    source: 'mock',
    mapperVersion: MAPPER_VERSION,
    fetchedAtISO: fetchedAt,
  };

  // ==========================================================================
  // STEP 4: Return card with diagnostics
  // ==========================================================================
  return {
    ...card,
    diagnostics: diagnostics,
  };
}

/**
 * Maps a raw mock job object to a canonical JobDetailModel with diagnostics.
 *
 * HOW IT WORKS:
 * 1. First maps to JobCardModel (reuses mapMockJobToCard)
 * 2. Adds detail-specific fields (mock data doesn't have these, so we generate)
 * 3. Returns extended model with diagnostics
 *
 * MOCK DATA LIMITATION:
 * Our current mock data doesn't have detail fields like duties, qualifications,
 * etc. This mapper generates realistic placeholder content for development.
 * Phase 2 with real USAJOBS data will have actual detail content.
 *
 * @param rawJob - Unknown data that should be a mock JobResult
 * @returns JobDetailWithDiagnostics
 */
export function mapMockJobToDetail(rawJob: unknown): JobDetailWithDiagnostics {
  // Start with card mapping
  const cardWithDiagnostics = mapMockJobToCard(rawJob);

  // Extract card and diagnostics
  const { diagnostics, ...card } = cardWithDiagnostics;

  // Add warning that detail fields are generated
  diagnostics.warnings.push(
    'Detail fields (duties, qualifications) are generated placeholders for mock data'
  );

  // ==========================================================================
  // Generate mock detail fields
  // These are realistic placeholders for development purposes
  // ==========================================================================

  // Generate duties based on job title
  const duties = [
    'Analyze organizational processes and recommend improvements to enhance efficiency',
    'Prepare briefings, reports, and correspondence for senior leadership',
    'Coordinate with stakeholders across multiple departments and agencies',
    'Develop and maintain performance metrics and tracking systems',
    'Provide guidance on policy implementation and compliance',
    'Lead or participate in cross-functional project teams',
  ];

  // Generate qualifications based on grade
  const gradeLevel = card.gradeLevel || 'GS-13';
  const prevGrade = gradeLevel.replace(/(\d+)/, function (match) {
    return String(Math.max(1, parseInt(match, 10) - 1));
  });

  const qualificationsMinimum =
    '1 year of specialized experience at the ' +
    prevGrade +
    ' level or equivalent';

  const qualificationsEducation =
    "Master's degree or equivalent graduate degree, or 2 full years of " +
    'progressively higher level graduate education';

  const qualificationsSpecialized = [
    'Experience analyzing complex organizational problems and developing solutions',
    'Experience preparing written reports and briefings for senior leadership',
    'Experience coordinating projects across multiple stakeholder groups',
  ];

  const ksas = [
    'Knowledge of organizational analysis principles and methods',
    'Ability to communicate complex information clearly in writing and orally',
    'Skill in project management and coordination',
    'Ability to work effectively with diverse stakeholder groups',
  ];

  const hiringPaths = [
    'Federal employees - Competitive service',
    'Career transition (CTAP, ICTAP)',
    'Veterans',
    'Military spouses',
  ];

  const howToApply = [
    'Review the qualifications and ensure you meet the minimum requirements',
    'Prepare your federal resume with all required information',
    'Gather supporting documents (transcripts, SF-50, DD-214 if applicable)',
    'Submit your complete application package via USAJOBS before the closing date',
  ];

  // Generate dates (mock: opening was 30 days ago, closes in 15 days)
  const now = new Date();
  const openDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const closeDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();

  // Build the detail model
  const detail: JobDetailModel = {
    ...card,

    // Additional identifiers
    announcementNumber: 'MOCK-' + card.id + '-2024',
    positionId: 'POS-' + card.id,

    // Description content
    summary:
      'This position serves as a ' +
      card.title +
      ' responsible for providing analytical ' +
      'support and recommendations on complex organizational issues. The incumbent will work ' +
      'with senior leadership to develop and implement strategic initiatives.',
    duties: duties,

    // Qualification requirements
    qualificationsMinimum: qualificationsMinimum,
    qualificationsEducation: qualificationsEducation,
    qualificationsSpecialized: qualificationsSpecialized,
    ksas: ksas,

    // Hiring information
    hiringPaths: hiringPaths,
    isOpenToPublic: true,
    promotionPotential: gradeLevel, // Same as current for mock
    isSupervisory: false,

    // Security
    clearanceLevel: 'Public Trust',
    drugTestRequired: false,

    // Travel
    travelRequirement: 'Occasional travel - 25% or less',
    relocationAuthorized: false,
    pcsAuthorized: false,

    // Application
    howToApply: howToApply,
    requiredDocuments: ['Resume', 'Transcripts (if qualifying based on education)'],
    estimatedTimeline: '4-8 weeks for initial review, 2-3 months total hiring process',

    // Dates
    openDate: openDate,
    closeDate: closeDate,

    // PathOS enhanced
    pathAdvisorNote:
      'Competition for this ' +
      gradeLevel +
      ' position is likely high. Strong KSAs ' +
      'demonstrating specific accomplishments will be important.',
    skillsMatchPercent: Math.max(0, (card.matchPercent || 80) - Math.random() * 10),
    keywordMatchPercent: Math.max(0, (card.matchPercent || 75) - Math.random() * 15),
  };

  // Return with diagnostics
  return {
    ...detail,
    diagnostics: diagnostics,
  };
}

/**
 * Maps an array of raw mock jobs to canonical JobCardModels.
 *
 * BATCH MAPPING:
 * Useful for mapping search results where you have multiple jobs.
 * Each job is mapped independently; failures in one don't affect others.
 *
 * @param rawJobs - Array of unknown data
 * @returns Array of JobCardWithDiagnostics
 */
export function mapMockJobsToCards(rawJobs: unknown[]): JobCardWithDiagnostics[] {
  const results: JobCardWithDiagnostics[] = [];

  for (let i = 0; i < rawJobs.length; i++) {
    const mapped = mapMockJobToCard(rawJobs[i]);
    results.push(mapped);
  }

  return results;
}
