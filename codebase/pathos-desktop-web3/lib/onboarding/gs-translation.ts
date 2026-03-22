/**
 * ============================================================================
 * GS TRANSLATION LAYER (Day 40 - GS Translation Layer v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides plain-English explanations of GS grade bands for non-federal users.
 * This deterministic content layer makes grade bands understandable in <15 seconds
 * without requiring PathAdvisor or federal knowledge.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Content Layer: Reusable translation data for onboarding, job search, and PathAdvisor
 * - UI Integration: Used by onboarding wizard and other grade selection UIs
 * - PathAdvisor Integration: Can be referenced by PathAdvisor for optional reassurance
 *
 * KEY CONCEPTS:
 * - Plain-English meaning: What the grade band means in everyday terms
 * - Responsibility level: Typical autonomy and decision-making scope
 * - Example roles: Common job titles at this level
 * - "If this sounds like you" guidance: Self-identification help
 * - "If you're unsure" reassurance: Encouragement for uncertain users
 *
 * DESIGN PRINCIPLES:
 * - No salary numbers (avoids outdated claims)
 * - No eligibility claims (avoids HR-specific terminology)
 * - Trust-first framing (reversible, changeable)
 * - Scannable format (quick comprehension)
 *
 * HOW TO USE:
 * - Import getGSTranslation(bandKey) to get translation content for a grade band
 * - Use in UI components to display inline explanations
 * - Reference in PathAdvisor for optional reassurance
 * ============================================================================
 */

import type { GradeBandKey } from '@/lib/api/profile';

/**
 * Translation content for a single grade band
 */
export interface GSTranslation {
  /**
   * Plain-English meaning of this grade band
   * Example: "Your first federal role, typically for recent graduates or career changers"
   */
  plainEnglish: string;

  /**
   * Typical responsibility and autonomy level
   * Example: "You work under close supervision, learning federal processes and systems"
   */
  responsibilityLevel: string;

  /**
   * Common example roles at this level
   * Example: ["Program Assistant", "Administrative Support Specialist", "Junior Analyst"]
   */
  exampleRoles: string[];

  /**
   * "If this sounds like you" guidance for self-identification
   * Example: "You're new to federal service or transitioning from another career"
   */
  ifThisSoundsLikeYou: string;

  /**
   * "If you're unsure" reassurance message
   * Example: "This is just a starting point. You can change this anytime in your settings."
   */
  ifUnsure: string;
}

/**
 * GS Translation Content Set v1
 * Deterministic, frontend-only content for all grade bands
 */
const GS_TRANSLATIONS: Record<GradeBandKey, GSTranslation> = {
  entry: {
    plainEnglish: 'Your first federal role, typically for recent graduates or career changers',
    responsibilityLevel:
      'You work under close supervision, learning federal processes and systems. Tasks are well-defined with clear instructions.',
    exampleRoles: [
      'Program Assistant',
      'Administrative Support Specialist',
      'Junior Analyst',
      'Customer Service Representative',
      'Data Entry Specialist',
    ],
    ifThisSoundsLikeYou:
      'You are new to federal service, a recent graduate, or transitioning from another career. You want to learn the ropes and build foundational skills.',
    ifUnsure:
      'This is just a starting point to help PathOS tailor job matches. You can change this anytime in your settings.',
  },

  early: {
    plainEnglish: 'Early career roles with some experience, typically 1-3 years in your field',
    responsibilityLevel:
      'You work with moderate supervision, handling routine tasks independently and contributing to team projects. You may mentor newer colleagues.',
    exampleRoles: [
      'Program Analyst',
      'IT Specialist',
      'Contract Specialist',
      'Human Resources Specialist',
      'Budget Analyst',
    ],
    ifThisSoundsLikeYou:
      'You have some professional experience (1-3 years) or relevant education. You can work independently on standard tasks and are ready to take on more responsibility.',
    ifUnsure:
      'This helps PathOS prioritize jobs that match your experience level. You can adjust this later if needed.',
  },

  mid: {
    plainEnglish: 'Mid-career roles with solid experience, typically 3-7 years in your field',
    responsibilityLevel:
      'You work with minimal supervision, leading projects and making decisions within your area of expertise. You may supervise others or serve as a subject matter expert.',
    exampleRoles: [
      'Senior Program Analyst',
      'IT Project Manager',
      'Senior Contract Specialist',
      'Policy Analyst',
      'Operations Manager',
    ],
    ifThisSoundsLikeYou:
      'You have several years of professional experience (3-7 years) and can lead projects independently. You are ready for roles with more autonomy and decision-making authority.',
    ifUnsure:
      'This is a flexible setting. PathOS will use it to find jobs that align with your experience. You can update it anytime.',
  },

  senior: {
    plainEnglish: 'Senior roles with extensive experience, typically 7+ years in your field',
    responsibilityLevel:
      'You work independently or with broad direction, making strategic decisions and leading teams or major initiatives. You may set policy or serve in advisory roles.',
    exampleRoles: [
      'Senior Policy Advisor',
      'IT Director',
      'Branch Chief',
      'Senior Executive Advisor',
      'Division Manager',
    ],
    ifThisSoundsLikeYou:
      'You have extensive professional experience (7+ years) and are ready for leadership roles with significant autonomy. You can guide teams, set direction, and make high-level decisions.',
    ifUnsure:
      'This helps PathOS surface senior-level opportunities. Remember, you can always change this setting as your goals evolve.',
  },

  unsure: {
    plainEnglish: "You're not sure yet, and that's okay",
    responsibilityLevel:
      'PathOS will show you a variety of opportunities across different levels so you can explore what fits.',
    exampleRoles: [],
    ifThisSoundsLikeYou:
      'You are exploring federal opportunities and want to see what is available before committing to a specific level.',
    ifUnsure:
      'This is perfectly fine. PathOS will help you discover opportunities at various levels. You can always set a specific target later.',
  },

  custom: {
    plainEnglish: 'You have selected a specific grade range',
    responsibilityLevel:
      'Your responsibility level depends on the specific grades you selected. PathOS will match jobs within your chosen range.',
    exampleRoles: [],
    ifThisSoundsLikeYou:
      'You know the specific GS grades you are targeting and want PathOS to focus on those exact levels.',
    ifUnsure:
      'If you are not sure about specific grades, consider using one of the grade bands above for a simpler starting point.',
  },
};

/**
 * Get translation content for a grade band
 *
 * @param bandKey - The grade band key to get translation for
 * @returns Translation content for the grade band, or null if bandKey is invalid
 */
export function getGSTranslation(bandKey: GradeBandKey | null | undefined): GSTranslation | null {
  if (bandKey === null || bandKey === undefined) {
    return null;
  }

  const translation = GS_TRANSLATIONS[bandKey];
  if (translation === undefined) {
    return null;
  }

  return translation;
}

/**
 * Get all available grade band keys (excluding 'custom' and 'unsure' for selection UI)
 *
 * @returns Array of selectable grade band keys
 */
export function getSelectableGradeBands(): GradeBandKey[] {
  return ['entry', 'early', 'mid', 'senior', 'unsure'];
}

/**
 * Check if a grade band key is valid
 *
 * @param bandKey - The grade band key to validate
 * @returns True if the key is valid, false otherwise
 */
export function isValidGradeBand(bandKey: string | null | undefined): bandKey is GradeBandKey {
  if (bandKey === null || bandKey === undefined) {
    return false;
  }

  return bandKey in GS_TRANSLATIONS;
}

