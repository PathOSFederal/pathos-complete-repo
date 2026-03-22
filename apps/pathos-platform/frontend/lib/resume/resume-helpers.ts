/**
 * ============================================================================
 * RESUME DOMAIN MODEL HELPERS (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Helper functions for working with ResumeDocument:
 * - createDefaultResumeDocument() - Creates a new resume document with safe defaults
 * - cloneResumeDocumentDeep() - Deep clones a resume document (truly deep, no shared references)
 * - applyTailoringHints() - Frontend-only placeholder that produces "suggested rewrites" artifacts
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Pure functions, no side effects
 * - Used by resumeBuilderStore and workspace components
 * - Frontend-only, local-only (no backend calls)
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

import type {
  ResumeDocument,
  ResumeVersion,
  SuggestedRewrite,
} from './resume-domain-model';
import { DEFAULT_VIEWS } from './resume-domain-model';
import type { ResumeData } from '@/lib/mock/resume-builder';
import { initialResumeData } from '@/lib/mock/resume-builder';
import type { TargetJob } from '@/store/resumeBuilderStore';

/**
 * Create Default Resume Document
 *
 * PURPOSE:
 * Creates a new ResumeDocument with safe defaults.
 * All fields must have safe defaults - no undefined or null required fields.
 *
 * RETURNS:
 * A new ResumeDocument with:
 * - Base profile and sections from initialResumeData
 * - Default views (Federal, Private, One-Page, Full)
 * - One base version
 * - No tailoring state
 */
export function createDefaultResumeDocument(): ResumeDocument {
  const baseVersion: ResumeVersion = {
    id: 'version-base',
    name: 'Base',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBase: true,
    snapshot: {
      profile: JSON.parse(JSON.stringify(initialResumeData.profile)),
      targetRoles: JSON.parse(JSON.stringify(initialResumeData.targetRoles)),
      workExperience: JSON.parse(JSON.stringify(initialResumeData.workExperience)),
      education: JSON.parse(JSON.stringify(initialResumeData.education)),
      skills: JSON.parse(JSON.stringify(initialResumeData.skills)),
    },
    metadata: {},
  };

  return {
    baseProfile: JSON.parse(JSON.stringify(initialResumeData.profile)),
    baseSections: {
      targetRoles: JSON.parse(JSON.stringify(initialResumeData.targetRoles)),
      workExperience: JSON.parse(JSON.stringify(initialResumeData.workExperience)),
      education: JSON.parse(JSON.stringify(initialResumeData.education)),
      skills: JSON.parse(JSON.stringify(initialResumeData.skills)),
    },
    narratives: {
      federalNarrative: '',
      accomplishmentBullets: [],
    },
    views: JSON.parse(JSON.stringify(DEFAULT_VIEWS)),
    activeViewId: 'view-federal',
    versions: [baseVersion],
    activeVersionId: 'version-base',
    tailoringState: null,
  };
}

/**
 * Clone Resume Document Deep
 *
 * PURPOSE:
 * Deep clones a ResumeDocument, ensuring no shared references.
 * This is critical for versioning - each version must be independent.
 *
 * HOW IT WORKS:
 * Uses JSON.parse(JSON.stringify()) for deep cloning, then manually clones arrays
 * to ensure no shared references.
 *
 * RETURNS:
 * A completely independent copy of the ResumeDocument.
 */
export function cloneResumeDocumentDeep(doc: ResumeDocument): ResumeDocument {
  // Deep clone using JSON serialization
  const cloned = JSON.parse(JSON.stringify(doc)) as ResumeDocument;

  // Ensure arrays are truly independent (defensive deep clone)
  cloned.baseSections.targetRoles = cloned.baseSections.targetRoles.map(function (role) {
    return JSON.parse(JSON.stringify(role));
  });
  cloned.baseSections.workExperience = cloned.baseSections.workExperience.map(function (exp) {
    return JSON.parse(JSON.stringify(exp));
  });
  cloned.baseSections.education = cloned.baseSections.education.map(function (edu) {
    return JSON.parse(JSON.stringify(edu));
  });
  cloned.baseSections.skills.technicalSkills = cloned.baseSections.skills.technicalSkills.slice();
  cloned.baseSections.skills.certifications = cloned.baseSections.skills.certifications.slice();
  cloned.baseSections.skills.languages = cloned.baseSections.skills.languages.slice();

  cloned.narratives.accomplishmentBullets = cloned.narratives.accomplishmentBullets.slice();
  cloned.views = cloned.views.map(function (view) {
    return JSON.parse(JSON.stringify(view));
  });
  cloned.versions = cloned.versions.map(function (version) {
    return JSON.parse(JSON.stringify(version));
  });

  if (cloned.tailoringState !== null) {
    cloned.tailoringState = JSON.parse(JSON.stringify(cloned.tailoringState));
  }

  return cloned;
}

/**
 * Apply Tailoring Hints
 *
 * PURPOSE:
 * Frontend-only placeholder that produces "suggested rewrites" artifacts.
 * This is NOT a final authoritative rewriting engine - it's a placeholder
 * that generates deterministic suggestions based on job requirements.
 *
 * HOW IT WORKS:
 * 1. Compares current resume content to job requirements
 * 2. Identifies gaps (missing keywords, missing experience areas)
 * 3. Generates suggested rewrites for work experience bullets
 * 4. Returns SuggestedRewrite[] array for the rewrite transition UI
 *
 * NOTE:
 * This is a deterministic, frontend-only function. No AI calls, no backend.
 * In a future implementation, this could call a backend service, but for Day 38
 * it's a simple rule-based placeholder.
 *
 * RETURNS:
 * Array of SuggestedRewrite objects that can be accepted or rejected.
 */
export function applyTailoringHints(
  resumeData: ResumeData,
  targetJob: TargetJob,
): SuggestedRewrite[] {
  const suggestions: SuggestedRewrite[] = [];

  // Simple rule-based suggestions (placeholder implementation)
  // In a real implementation, this would analyze job requirements and generate
  // contextually appropriate suggestions.

  // Example: Suggest adding job series to work experience if missing
  if (targetJob.series && resumeData.workExperience.length > 0) {
    const firstExp = resumeData.workExperience[0];
    if (!firstExp.series || firstExp.series !== targetJob.series) {
      suggestions.push({
        id: 'suggestion-' + Date.now() + '-0',
        sectionType: 'workExperience',
        sectionId: firstExp.id,
        fieldName: 'series',
        oldValue: firstExp.series || '',
        newValue: targetJob.series,
        reason: 'GS-calibrated: Match target job series',
        status: 'pending',
      });
    }
  }

  // Example: Suggest adding keywords to accomplishments
  if (targetJob.duties && targetJob.duties.length > 0 && resumeData.workExperience.length > 0) {
    const keywords = targetJob.duties.slice(0, 3); // First 3 duties as keywords
    const firstExp = resumeData.workExperience[0];
    if (firstExp.accomplishments) {
      const hasKeywords = keywords.some(function (keyword) {
        return firstExp.accomplishments.toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
      });
      if (!hasKeywords) {
        suggestions.push({
          id: 'suggestion-' + Date.now() + '-1',
          sectionType: 'workExperience',
          sectionId: firstExp.id,
          fieldName: 'accomplishments',
          oldValue: firstExp.accomplishments,
          newValue:
            firstExp.accomplishments +
            '\n• ' +
            keywords[0] +
            ' experience demonstrated through ' +
            firstExp.title,
          reason: 'USAJOBS keyword coverage: Add relevant keywords',
          status: 'pending',
        });
      }
    }
  }

  return suggestions;
}

/**
 * Convert ResumeData to ResumeDocument
 *
 * PURPOSE:
 * Converts existing ResumeData (from store) to new ResumeDocument format.
 * Used for migration from old wizard-based format to new workspace format.
 *
 * RETURNS:
 * A ResumeDocument created from existing ResumeData.
 */
export function resumeDataToDocument(resumeData: ResumeData): ResumeDocument {
  const doc = createDefaultResumeDocument();

  // Copy profile
  doc.baseProfile = JSON.parse(JSON.stringify(resumeData.profile));

  // Copy sections
  doc.baseSections.targetRoles = JSON.parse(JSON.stringify(resumeData.targetRoles));
  doc.baseSections.workExperience = JSON.parse(JSON.stringify(resumeData.workExperience));
  doc.baseSections.education = JSON.parse(JSON.stringify(resumeData.education));
  doc.baseSections.skills = JSON.parse(JSON.stringify(resumeData.skills));

  // Update base version snapshot
  if (doc.versions.length > 0) {
    doc.versions[0].snapshot = {
      profile: JSON.parse(JSON.stringify(resumeData.profile)),
      targetRoles: JSON.parse(JSON.stringify(resumeData.targetRoles)),
      workExperience: JSON.parse(JSON.stringify(resumeData.workExperience)),
      education: JSON.parse(JSON.stringify(resumeData.education)),
      skills: JSON.parse(JSON.stringify(resumeData.skills)),
    };
    doc.versions[0].updatedAt = Date.now();
  }

  return doc;
}

