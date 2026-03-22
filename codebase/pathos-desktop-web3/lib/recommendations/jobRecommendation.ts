/**
 * ============================================================================
 * JOB RECOMMENDATION ENGINE (Day 33 - PathAdvisor Recommendation v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This is a frontend-only, local-only, rules-based recommendation system
 * for Job Seeker mode. It provides actionable guidance based on:
 * - Currently selected job (if any)
 * - User profile signals (grade band, location preferences, etc.)
 * - Context signals (job search results count, has resume, etc.)
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * This is an OPSEC-safe contract for later backend logic. It does NOT make
 * external API calls or model inference. All logic is deterministic and
 * runs entirely in the browser.
 *
 * DESIGN PRINCIPLES:
 * 1. Pure function - same inputs always produce same outputs
 * 2. Explainable - each recommendation has clear rationale
 * 3. Actionable - recommendations include specific next steps
 * 4. Safe - no external dependencies, no data leakage
 *
 * HOW IT WORKS:
 * 1. Takes selected job, profile signals, and context as input
 * 2. Evaluates simple heuristics (missing fields, match signals, etc.)
 * 3. Returns structured recommendation with headline, bullets, confidence, actions
 *
 * EXAMPLE USAGE:
 * ```typescript
 * const recommendation = generateJobRecommendation({
 *   selectedJob: jobSearchStore.selectedJob,
 *   profileSignals: {
 *     gradeBand: profile.goals.gradeBand,
 *     targetGradeFrom: profile.goals.targetGradeFrom,
 *     targetGradeTo: profile.goals.targetGradeTo,
 *     locationPreference: profile.location.currentMetroArea,
 *     relocationWillingness: profile.location.relocationWillingness,
 *     workArrangement: profile.location.workArrangement,
 *   },
 *   context: {
 *     jobSearchResultsCount: jobSearchStore.jobs.length,
 *     hasResume: false, // TODO: wire to resume store when available
 *     hasSavedJob: false, // TODO: wire to saved jobs when available
 *   },
 * });
 * ```
 *
 * @version Day 33 - PathAdvisor Recommendation v1
 * ============================================================================
 */

import type { JobDetailModel } from '@/lib/jobs/model';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Input for the preview gating predicate.
 * Determines whether the recommendation preview should be shown on the Dashboard.
 */
export interface PreviewGatingInput {
  /**
   * Currently selected job from job search.
   * Null if no job is selected.
   */
  selectedJob: JobDetailModel | null;
  /**
   * Number of jobs in current search results.
   * 0 if no search has been performed or no results.
   */
  resultsCount: number;
  /**
   * Confidence level of the recommendation.
   * Used to filter out low-confidence generic advice.
   */
  confidence: 'Low' | 'Medium' | 'High';
  /**
   * Headline of the recommendation.
   * Used to detect generic "Select a job" messages that should be hidden when resultsCount is 0.
   */
  headline: string;
}

/**
 * Profile signals available locally for recommendation logic.
 * These come from the profileStore and are already available in the browser.
 */
export interface ProfileSignals {
  /**
   * User's target grade band (entry, early, mid, senior, custom, unsure).
   * Undefined if not set.
   */
  gradeBand?: string | null;
  /**
   * Target grade range start (e.g., "GS-9").
   * Undefined if not set.
   */
  targetGradeFrom?: string | null;
  /**
   * Target grade range end (e.g., "GS-11").
   * Undefined if not set.
   */
  targetGradeTo?: string | null;
  /**
   * Current metro area preference.
   * Undefined if not set.
   */
  locationPreference?: string | null;
  /**
   * Relocation willingness (stay_local, willing_to_relocate, etc.).
   * Undefined if not set.
   */
  relocationWillingness?: string | null;
  /**
   * Work arrangement preference (remote, hybrid, onsite).
   * Undefined if not set.
   */
  workArrangement?: string | null;
}

/**
 * Context signals for recommendation logic.
 * These come from various stores and provide situational awareness.
 */
export interface ContextSignals {
  /**
   * Number of jobs in current search results.
   * 0 if no search has been performed or no results.
   */
  jobSearchResultsCount: number;
  /**
   * Whether user has a resume uploaded/built.
   * Defaults to false if not available.
   */
  hasResume?: boolean;
  /**
   * Whether user has any saved jobs.
   * Defaults to false if not available.
   */
  hasSavedJob?: boolean;
}

/**
 * Input to the recommendation engine.
 */
export interface RecommendationInput {
  /**
   * Currently selected job from job search.
   * Null if no job is selected.
   */
  selectedJob: JobDetailModel | null;
  /**
   * Profile signals from profileStore.
   */
  profileSignals: ProfileSignals;
  /**
   * Context signals from various stores.
   */
  context: ContextSignals;
}

/**
 * Action that user can take based on the recommendation.
 */
export interface RecommendationAction {
  /**
   * Unique identifier for this action.
   * Used for routing or callbacks.
   */
  id: string;
  /**
   * Human-readable label for the action button.
   */
  label: string;
  /**
   * Intent/routing target for the action.
   * Examples: "/dashboard/job-search", "resume-builder", "saved-jobs"
   */
  intent: string;
  /**
   * Optional helper text shown below the button.
   * Explains what will happen when clicked.
   */
  helperText?: string;
}

/**
 * Output of the recommendation engine.
 */
export interface JobRecommendation {
  /**
   * Main headline for the recommendation.
   * Should be clear and actionable.
   */
  headline: string;
  /**
   * Rationale bullets explaining why this recommendation was made.
   * Must have 2-4 items.
   */
  rationaleBullets: string[];
  /**
   * Confidence level in the recommendation.
   * Low: Limited data, generic advice
   * Medium: Some signals present, reasonable advice
   * High: Strong signals, specific advice
   */
  confidence: 'Low' | 'Medium' | 'High';
  /**
   * Next actions the user should take.
   * Must have 1-3 items.
   */
  nextActions: RecommendationAction[];
}

// ============================================================================
// PREVIEW GATING PREDICATE
// ============================================================================

/**
 * Determines whether the recommendation preview should be shown on the Dashboard.
 *
 * GATING RULES:
 * Preview should show ONLY when:
 * - resultsCount > 0 AND (no selectedJob OR selectedJob is present but confidence is Medium/High)
 * - AND the preview headline is not the generic "Select a job to get recommendations" unless resultsCount > 0
 *
 * Preview should hide when:
 * - resultsCount == 0
 * - OR the recommendation would be purely generic AND resultsCount == 0
 * - OR confidence is "Low" AND no selectedJob
 *
 * @param input - Preview gating input (selectedJob, resultsCount, confidence, headline)
 * @returns true if preview should be shown, false otherwise
 */
export function shouldShowRecommendationPreview(input: PreviewGatingInput): boolean {
  const selectedJob = input.selectedJob;
  const resultsCount = input.resultsCount;
  const confidence = input.confidence;
  const headline = input.headline;

  // Hide if no results
  if (resultsCount === 0) {
    return false;
  }

  // Hide if generic "Select a job" message and no results (shouldn't happen with resultsCount > 0, but defensive)
  const isGenericSelectMessage = headline.toLowerCase().indexOf('select a job') >= 0;
  if (isGenericSelectMessage && resultsCount === 0) {
    return false;
  }

  // Show if results exist and no selected job (actionable: user can select)
  if (!selectedJob && resultsCount > 0) {
    return true;
  }

  // Show if selected job present and confidence is Medium or High
  if (selectedJob && (confidence === 'Medium' || confidence === 'High')) {
    return true;
  }

  // Hide if selected job present but confidence is Low (generic advice)
  if (selectedJob && confidence === 'Low') {
    return false;
  }

  // Default: hide (defensive)
  return false;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts numeric grade from a grade string (e.g., "GS-9" -> 9).
 * Returns null if grade cannot be parsed.
 */
function extractGradeNumber(grade: string | null | undefined): number | null {
  if (!grade) {
    return null;
  }
  // Match patterns like "GS-9", "GS-12", "WG-5", etc.
  const match = grade.match(/(\d+)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) {
      return num;
    }
  }
  return null;
}

/**
 * Checks if a job's grade level matches the user's target grade range.
 * Returns true if job grade is within or close to target range.
 */
function isGradeMatch(
  jobGrade: string | null | undefined,
  targetFrom: string | null | undefined,
  targetTo: string | null | undefined
): boolean {
  if (!jobGrade || !targetFrom || !targetTo) {
    return false;
  }
  const jobNum = extractGradeNumber(jobGrade);
  const fromNum = extractGradeNumber(targetFrom);
  const toNum = extractGradeNumber(targetTo);
  if (jobNum === null || fromNum === null || toNum === null) {
    return false;
  }
  // Match if job grade is within target range (inclusive)
  return jobNum >= fromNum && jobNum <= toNum;
}

/**
 * Checks if a job's location matches user preferences.
 * Returns true if there's a match or user is willing to relocate.
 */
function isLocationMatch(
  jobLocation: string | null | undefined,
  userLocation: string | null | undefined,
  relocationWillingness: string | null | undefined
): boolean {
  // If user is willing to relocate, any location is acceptable
  if (relocationWillingness === 'willing_to_relocate' || relocationWillingness === 'open') {
    return true;
  }
  // If no job location or user location, can't determine match
  if (!jobLocation || !userLocation) {
    return false;
  }
  // Simple substring match (e.g., "Washington, DC" matches "Washington")
  const jobLower = jobLocation.toLowerCase();
  const userLower = userLocation.toLowerCase();
  return jobLower.includes(userLower) || userLower.includes(jobLower);
}

/**
 * Checks if a job's work arrangement matches user preference.
 * Returns true if there's a match or preference is flexible.
 */
function isWorkArrangementMatch(
  jobArrangement: string | null | undefined,
  userPreference: string | null | undefined
): boolean {
  if (!jobArrangement || !userPreference) {
    return false;
  }
  // Normalize both to lowercase for comparison
  const jobLower = jobArrangement.toLowerCase();
  const userLower = userPreference.toLowerCase();
  // Exact match
  if (jobLower === userLower) {
    return true;
  }
  // Hybrid is acceptable if user wants remote or onsite
  if (jobLower === 'hybrid') {
    return userLower === 'remote' || userLower === 'onsite';
  }
  return false;
}

// ============================================================================
// MAIN RECOMMENDATION ENGINE
// ============================================================================

/**
 * Generates a job recommendation based on selected job, profile signals, and context.
 *
 * HEURISTICS (in priority order):
 * 1. No selected job -> Recommend selecting a job or running a search
 * 2. Selected job missing key fields (pay range, location) -> Recommend verifying info
 * 3. Selected job has low match signals -> Recommend targeting closer match or tailoring resume
 * 4. Selected job has strong match signals -> Recommend proceeding with application
 * 5. Pay range missing -> Recommend verifying compensation expectations
 * 6. Location mismatch -> Recommend checking location or updating preferences
 * 7. Work arrangement mismatch -> Recommend checking work arrangement
 *
 * @param input - Recommendation input (selected job, profile signals, context)
 * @returns Structured recommendation with headline, bullets, confidence, actions
 */
export function generateJobRecommendation(input: RecommendationInput): JobRecommendation {
  const selectedJob = input.selectedJob;
  const profile = input.profileSignals;
  const context = input.context;

  // ============================================================================
  // HEURISTIC 1: No selected job
  // ============================================================================
  if (!selectedJob) {
    if (context.jobSearchResultsCount === 0) {
      // No jobs found - recommend running a search
      return {
        headline: 'Start your job search',
        rationaleBullets: [
          'You haven\'t run a job search yet',
          'Finding matching positions is the first step to applying',
        ],
        confidence: 'Medium',
        nextActions: [
          {
            id: 'job-search',
            label: 'Search Jobs',
            intent: '/dashboard/job-search',
            helperText: 'Find positions that match your goals',
          },
        ],
      };
    }
    // Has results but no selection - recommend selecting a job
    return {
      headline: 'Select a job to get recommendations',
      rationaleBullets: [
        'You have ' + context.jobSearchResultsCount + ' job' + (context.jobSearchResultsCount === 1 ? '' : 's') + ' in your search results',
        'Selecting a job helps us provide targeted advice',
      ],
      confidence: 'Medium',
      nextActions: [
        {
          id: 'select-job',
          label: 'View Job Search',
          intent: '/dashboard/job-search',
          helperText: 'Browse and select a position to analyze',
        },
      ],
    };
  }

  // ============================================================================
  // HEURISTIC 2: Missing key fields (pay range, location)
  // ============================================================================
  const hasPayRange = selectedJob.payRange !== null && selectedJob.payRange !== undefined &&
    (selectedJob.payRange.min !== null && selectedJob.payRange.min !== undefined ||
     selectedJob.payRange.max !== null && selectedJob.payRange.max !== undefined ||
     (selectedJob.payRange.displayText !== null && selectedJob.payRange.displayText !== undefined && selectedJob.payRange.displayText.trim().length > 0));
  const hasLocation = selectedJob.locationDisplay !== null && selectedJob.locationDisplay !== undefined && selectedJob.locationDisplay.trim().length > 0;

  if (!hasPayRange && !hasLocation) {
    return {
      headline: 'Verify job details before applying',
      rationaleBullets: [
        'This position is missing pay range and location information',
        'Confirming these details helps set accurate expectations',
      ],
      confidence: 'High',
      nextActions: [
        {
          id: 'verify-details',
          label: 'View Full Details',
          intent: '/dashboard/job-search',
          helperText: 'Check the complete job posting for missing information',
        },
      ],
    };
  }

  if (!hasPayRange) {
    return {
      headline: 'Verify compensation expectations',
      rationaleBullets: [
        'This position doesn\'t show a pay range',
        'Understanding compensation helps you make informed decisions',
      ],
      confidence: 'High',
      nextActions: [
        {
          id: 'check-pay',
          label: 'View Job Details',
          intent: '/dashboard/job-search',
          helperText: 'Check the full posting for salary information',
        },
      ],
    };
  }

  // ============================================================================
  // HEURISTIC 3: Grade level mismatch
  // ============================================================================
  const gradeMatch = isGradeMatch(selectedJob.gradeLevel, profile.targetGradeFrom, profile.targetGradeTo);
  if (!gradeMatch && profile.targetGradeFrom && profile.targetGradeTo) {
    return {
      headline: 'Consider targeting positions closer to your grade range',
      rationaleBullets: [
        'This position is ' + (selectedJob.gradeLevel || 'at a different grade') + ', but you\'re targeting ' + profile.targetGradeFrom + ' to ' + profile.targetGradeTo,
        'Focusing on your target grade range increases your chances of success',
      ],
      confidence: 'Medium',
      nextActions: [
        {
          id: 'refine-search',
          label: 'Refine Search',
          intent: '/dashboard/job-search',
          helperText: 'Update filters to target your preferred grade range',
        },
      ],
    };
  }

  // ============================================================================
  // HEURISTIC 4: Location mismatch
  // ============================================================================
  const locationMatch = isLocationMatch(
    selectedJob.locationDisplay,
    profile.locationPreference,
    profile.relocationWillingness
  );
  if (!locationMatch && selectedJob.locationDisplay && profile.locationPreference) {
    return {
      headline: 'Check if this location works for you',
      rationaleBullets: [
        'This position is in ' + selectedJob.locationDisplay + ', but you prefer ' + profile.locationPreference,
        'Confirming location fit is important before applying',
      ],
      confidence: 'Medium',
      nextActions: [
        {
          id: 'check-location',
          label: 'View Job Details',
          intent: '/dashboard/job-search',
          helperText: 'Review location requirements and your preferences',
        },
      ],
    };
  }

  // ============================================================================
  // HEURISTIC 5: Work arrangement mismatch
  // ============================================================================
  const workArrangementMatch = isWorkArrangementMatch(selectedJob.employmentType, profile.workArrangement);
  if (!workArrangementMatch && selectedJob.employmentType && profile.workArrangement) {
    return {
      headline: 'Verify work arrangement matches your preference',
      rationaleBullets: [
        'This position is ' + selectedJob.employmentType + ', but you prefer ' + profile.workArrangement,
        'Work arrangement affects your daily routine and work-life balance',
      ],
      confidence: 'Medium',
      nextActions: [
        {
          id: 'check-arrangement',
          label: 'View Job Details',
          intent: '/dashboard/job-search',
          helperText: 'Confirm the work arrangement requirements',
        },
      ],
    };
  }

  // ============================================================================
  // HEURISTIC 6: Strong match - recommend proceeding
  // ============================================================================
  // If we get here, the job has key fields and matches user preferences
  const matchSignals = [];
  if (gradeMatch) {
    matchSignals.push('grade level');
  }
  if (locationMatch) {
    matchSignals.push('location');
  }
  if (workArrangementMatch) {
    matchSignals.push('work arrangement');
  }

  if (matchSignals.length >= 2) {
    // Strong match - recommend proceeding
    const actions: RecommendationAction[] = [];
    if (!context.hasResume) {
      actions.push({
        id: 'build-resume',
        label: 'Build Resume',
        intent: '/dashboard/resume',
        helperText: 'Create or update your resume to match this position',
      });
    }
    actions.push({
      id: 'apply',
      label: 'Review Application',
      intent: '/dashboard/job-search',
      helperText: 'Review the full job posting and application requirements',
    });
    if (context.hasSavedJob) {
      actions.push({
        id: 'saved-jobs',
        label: 'View Saved Jobs',
        intent: '/dashboard/saved-jobs',
        helperText: 'Compare this position with your saved jobs',
      });
    }

    return {
      headline: 'This position looks like a strong match',
      rationaleBullets: [
        'Matches your preferences for ' + matchSignals.join(' and '),
        'Has complete information (pay range, location)',
        'Ready for next steps in your application process',
      ],
      confidence: 'High',
      nextActions: actions.slice(0, 3), // Ensure max 3 actions
    };
  }

  // ============================================================================
  // HEURISTIC 7: Partial match - recommend tailoring
  // ============================================================================
  // Some match signals but not all
  return {
    headline: 'Tailor your approach for this position',
    rationaleBullets: [
      'This position has some alignment with your goals',
      'Focus on highlighting relevant experience in your resume',
      'Consider updating your profile if this role type interests you',
    ],
    confidence: 'Medium',
    nextActions: [
      {
        id: 'tailor-resume',
        label: 'Tailor Resume',
        intent: '/dashboard/resume',
        helperText: 'Update your resume to emphasize relevant qualifications',
      },
      {
        id: 'view-details',
        label: 'View Full Details',
        intent: '/dashboard/job-search',
        helperText: 'Review requirements and qualifications carefully',
      },
    ],
  };
}

