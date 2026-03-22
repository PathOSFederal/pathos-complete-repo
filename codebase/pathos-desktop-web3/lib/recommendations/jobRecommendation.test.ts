/**
 * ============================================================================
 * JOB RECOMMENDATION ENGINE TESTS (Day 33)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the job recommendation engine. These tests ensure that
 * the recommendation logic produces correct outputs for various input scenarios.
 *
 * TEST COVERAGE:
 * - No selected job scenarios
 * - Selected job with missing key fields
 * - Selected job with grade level mismatch
 * - Selected job with location mismatch
 * - Selected job with work arrangement mismatch
 * - Selected job with strong match signals (High confidence)
 * - Rationale bullets length constraints (2-4 items)
 * - Actions constraints (1-3 items) and stable IDs
 *
 * @version Day 33 - PathAdvisor Recommendation v1
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  generateJobRecommendation,
  shouldShowRecommendationPreview,
  type RecommendationInput,
  type PreviewGatingInput,
} from './jobRecommendation';
import type { JobDetailModel } from '@/lib/jobs/model';

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

/**
 * Creates a minimal valid JobDetailModel for testing.
 */
function createTestJob(overrides: Partial<JobDetailModel> = {}): JobDetailModel {
  return Object.assign(
    {
      id: '1',
      title: 'Test Analyst',
      source: 'mock',
      tags: [],
      gradeLevel: 'GS-9',
      locationDisplay: 'Washington, DC',
      employmentType: 'hybrid',
      payRange: {
        min: 60000,
        max: 80000,
        displayText: '$60,000 - $80,000',
      },
    },
    overrides
  ) as JobDetailModel;
}

/**
 * Creates default profile signals for testing.
 */
function createDefaultProfileSignals() {
  return {
    gradeBand: 'early',
    targetGradeFrom: 'GS-7',
    targetGradeTo: 'GS-9',
    locationPreference: 'Washington, DC',
    relocationWillingness: 'stay_local',
    workArrangement: 'hybrid',
  };
}

/**
 * Creates default context signals for testing.
 */
function createDefaultContext() {
  return {
    jobSearchResultsCount: 10,
    hasResume: false,
    hasSavedJob: false,
  };
}

// ============================================================================
// TESTS: No Selected Job
// ============================================================================

describe('generateJobRecommendation', function () {
  describe('with no selected job', function () {
    it('should recommend running a search when no results exist', function () {
      const input: RecommendationInput = {
        selectedJob: null,
        profileSignals: createDefaultProfileSignals(),
        context: {
          jobSearchResultsCount: 0,
          hasResume: false,
          hasSavedJob: false,
        },
      };

      const result = generateJobRecommendation(input);

      expect(result.headline).toContain('Start your job search');
      expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
      expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
      expect(result.nextActions.length).toBeGreaterThanOrEqual(1);
      expect(result.nextActions.length).toBeLessThanOrEqual(3);
      expect(result.nextActions[0].id).toBe('job-search');
    });

    it('should recommend selecting a job when results exist', function () {
      const input: RecommendationInput = {
        selectedJob: null,
        profileSignals: createDefaultProfileSignals(),
        context: {
          jobSearchResultsCount: 5,
          hasResume: false,
          hasSavedJob: false,
        },
      };

      const result = generateJobRecommendation(input);

      expect(result.headline).toContain('Select a job');
      expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
      expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
      expect(result.nextActions.length).toBeGreaterThanOrEqual(1);
      expect(result.nextActions.length).toBeLessThanOrEqual(3);
      expect(result.nextActions[0].id).toBe('select-job');
    });
  });

  // ============================================================================
  // TESTS: Missing Key Fields
  // ============================================================================

  describe('with selected job missing key fields', function () {
    it('should recommend verifying details when pay range and location are missing', function () {
      const job = createTestJob({
        payRange: undefined,
        locationDisplay: undefined,
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: createDefaultProfileSignals(),
        context: createDefaultContext(),
      };

      const result = generateJobRecommendation(input);

      expect(result.headline).toContain('Verify job details');
      expect(result.confidence).toBe('High');
      expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
      expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
      expect(result.nextActions.length).toBeGreaterThanOrEqual(1);
      expect(result.nextActions.length).toBeLessThanOrEqual(3);
    });

    it('should recommend verifying compensation when pay range is missing', function () {
      const job = createTestJob({
        payRange: undefined,
        locationDisplay: 'Washington, DC',
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: createDefaultProfileSignals(),
        context: createDefaultContext(),
      };

      const result = generateJobRecommendation(input);

      expect(result.headline).toContain('compensation');
      expect(result.confidence).toBe('High');
      expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
      expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
    });
  });

  // ============================================================================
  // TESTS: Grade Level Mismatch
  // ============================================================================

  describe('with grade level mismatch', function () {
    it('should recommend targeting closer match when grade is outside target range', function () {
      const job = createTestJob({
        gradeLevel: 'GS-12', // Outside target range of GS-7 to GS-9
        payRange: {
          min: 60000,
          max: 80000,
          displayText: '$60,000 - $80,000',
        },
        locationDisplay: 'Washington, DC',
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: {
          gradeBand: 'early',
          targetGradeFrom: 'GS-7',
          targetGradeTo: 'GS-9',
          locationPreference: 'Washington, DC',
          relocationWillingness: 'stay_local',
          workArrangement: 'hybrid',
        },
        context: createDefaultContext(),
      };

      const result = generateJobRecommendation(input);

      expect(result.headline).toContain('targeting positions closer');
      expect(result.confidence).toBe('Medium');
      expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
      expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
    });
  });

  // ============================================================================
  // TESTS: Location Mismatch
  // ============================================================================

  describe('with location mismatch', function () {
    it('should recommend checking location when job location does not match preference', function () {
      const job = createTestJob({
        gradeLevel: 'GS-9',
        locationDisplay: 'San Francisco, CA',
        payRange: {
          min: 60000,
          max: 80000,
          displayText: '$60,000 - $80,000',
        },
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: {
          gradeBand: 'early',
          targetGradeFrom: 'GS-7',
          targetGradeTo: 'GS-9',
          locationPreference: 'Washington, DC',
          relocationWillingness: 'stay_local',
          workArrangement: 'hybrid',
        },
        context: createDefaultContext(),
      };

      const result = generateJobRecommendation(input);

      expect(result.headline).toContain('location');
      expect(result.confidence).toBe('Medium');
      expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
      expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
    });

    it('should accept any location when user is willing to relocate', function () {
      const job = createTestJob({
        gradeLevel: 'GS-9',
        locationDisplay: 'San Francisco, CA',
        payRange: {
          min: 60000,
          max: 80000,
          displayText: '$60,000 - $80,000',
        },
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: {
          gradeBand: 'early',
          targetGradeFrom: 'GS-7',
          targetGradeTo: 'GS-9',
          locationPreference: 'Washington, DC',
          relocationWillingness: 'willing_to_relocate',
          workArrangement: 'hybrid',
        },
        context: createDefaultContext(),
      };

      const result = generateJobRecommendation(input);

      // Should not recommend checking location when willing to relocate
      expect(result.headline).not.toContain('location');
    });
  });

  // ============================================================================
  // TESTS: Work Arrangement Mismatch
  // ============================================================================

  describe('with work arrangement mismatch', function () {
    it('should recommend checking work arrangement when job type does not match preference', function () {
      const job = createTestJob({
        gradeLevel: 'GS-9',
        locationDisplay: 'Washington, DC',
        employmentType: 'onsite',
        payRange: {
          min: 60000,
          max: 80000,
          displayText: '$60,000 - $80,000',
        },
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: {
          gradeBand: 'early',
          targetGradeFrom: 'GS-7',
          targetGradeTo: 'GS-9',
          locationPreference: 'Washington, DC',
          relocationWillingness: 'stay_local',
          workArrangement: 'remote',
        },
        context: createDefaultContext(),
      };

      const result = generateJobRecommendation(input);

      expect(result.headline).toContain('work arrangement');
      expect(result.confidence).toBe('Medium');
      expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
      expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
    });
  });

  // ============================================================================
  // TESTS: Strong Match (High Confidence)
  // ============================================================================

  describe('with strong match signals', function () {
    it('should recommend proceeding when job matches grade, location, and work arrangement', function () {
      const job = createTestJob({
        gradeLevel: 'GS-9',
        locationDisplay: 'Washington, DC',
        employmentType: 'hybrid',
        payRange: {
          min: 60000,
          max: 80000,
          displayText: '$60,000 - $80,000',
        },
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: {
          gradeBand: 'early',
          targetGradeFrom: 'GS-7',
          targetGradeTo: 'GS-9',
          locationPreference: 'Washington, DC',
          relocationWillingness: 'stay_local',
          workArrangement: 'hybrid',
        },
        context: createDefaultContext(),
      };

      const result = generateJobRecommendation(input);

      expect(result.headline).toContain('strong match');
      expect(result.confidence).toBe('High');
      expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
      expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
      expect(result.nextActions.length).toBeGreaterThanOrEqual(1);
      expect(result.nextActions.length).toBeLessThanOrEqual(3);
    });

    it('should include resume action when user does not have resume', function () {
      const job = createTestJob({
        gradeLevel: 'GS-9',
        locationDisplay: 'Washington, DC',
        employmentType: 'hybrid',
        payRange: {
          min: 60000,
          max: 80000,
          displayText: '$60,000 - $80,000',
        },
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: {
          gradeBand: 'early',
          targetGradeFrom: 'GS-7',
          targetGradeTo: 'GS-9',
          locationPreference: 'Washington, DC',
          relocationWillingness: 'stay_local',
          workArrangement: 'hybrid',
        },
        context: {
          jobSearchResultsCount: 10,
          hasResume: false,
          hasSavedJob: false,
        },
      };

      const result = generateJobRecommendation(input);

      const resumeAction = result.nextActions.find(function (action) {
        return action.id === 'build-resume';
      });
      expect(resumeAction).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS: Constraints Validation
  // ============================================================================

  describe('output constraints', function () {
    it('should always return 2-4 rationale bullets', function () {
      const testCases = [
        // No selected job
        {
          selectedJob: null,
          profileSignals: createDefaultProfileSignals(),
          context: { jobSearchResultsCount: 0, hasResume: false, hasSavedJob: false },
        },
        // Missing fields
        {
          selectedJob: createTestJob({ payRange: undefined }),
          profileSignals: createDefaultProfileSignals(),
          context: createDefaultContext(),
        },
        // Strong match
        {
          selectedJob: createTestJob({
            gradeLevel: 'GS-9',
            locationDisplay: 'Washington, DC',
            employmentType: 'hybrid',
          }),
          profileSignals: createDefaultProfileSignals(),
          context: createDefaultContext(),
        },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const result = generateJobRecommendation(testCases[i] as RecommendationInput);
        expect(result.rationaleBullets.length).toBeGreaterThanOrEqual(2);
        expect(result.rationaleBullets.length).toBeLessThanOrEqual(4);
      }
    });

    it('should always return 1-3 next actions', function () {
      const testCases = [
        // No selected job
        {
          selectedJob: null,
          profileSignals: createDefaultProfileSignals(),
          context: { jobSearchResultsCount: 0, hasResume: false, hasSavedJob: false },
        },
        // Missing fields
        {
          selectedJob: createTestJob({ payRange: undefined }),
          profileSignals: createDefaultProfileSignals(),
          context: createDefaultContext(),
        },
        // Strong match
        {
          selectedJob: createTestJob({
            gradeLevel: 'GS-9',
            locationDisplay: 'Washington, DC',
            employmentType: 'hybrid',
          }),
          profileSignals: createDefaultProfileSignals(),
          context: createDefaultContext(),
        },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const result = generateJobRecommendation(testCases[i] as RecommendationInput);
        expect(result.nextActions.length).toBeGreaterThanOrEqual(1);
        expect(result.nextActions.length).toBeLessThanOrEqual(3);
      }
    });

    it('should always return stable action IDs', function () {
      const job = createTestJob({
        gradeLevel: 'GS-9',
        locationDisplay: 'Washington, DC',
        employmentType: 'hybrid',
        payRange: {
          min: 60000,
          max: 80000,
          displayText: '$60,000 - $80,000',
        },
      });

      const input: RecommendationInput = {
        selectedJob: job,
        profileSignals: createDefaultProfileSignals(),
        context: createDefaultContext(),
      };

      // Run multiple times to ensure IDs are stable
      const result1 = generateJobRecommendation(input);
      const result2 = generateJobRecommendation(input);

      expect(result1.nextActions.length).toBe(result2.nextActions.length);
      for (let i = 0; i < result1.nextActions.length; i++) {
        expect(result1.nextActions[i].id).toBe(result2.nextActions[i].id);
      }
    });
  });
});

// ============================================================================
// TESTS: Preview Gating Predicate
// ============================================================================

describe('shouldShowRecommendationPreview', function () {
  describe('with no results', function () {
    it('should return false when resultsCount is 0', function () {
      const input: PreviewGatingInput = {
        selectedJob: null,
        resultsCount: 0,
        confidence: 'Medium',
        headline: 'Start your job search',
      };

      const result = shouldShowRecommendationPreview(input);
      expect(result).toBe(false);
    });
  });

  describe('with results but no selected job', function () {
    it('should return true when resultsCount > 0 and no selectedJob', function () {
      const input: PreviewGatingInput = {
        selectedJob: null,
        resultsCount: 5,
        confidence: 'Medium',
        headline: 'Select a job to get recommendations',
      };

      const result = shouldShowRecommendationPreview(input);
      expect(result).toBe(true);
    });
  });

  describe('with selected job and confidence levels', function () {
    const testJob = createTestJob();

    it('should return true when selectedJob present and confidence is Medium', function () {
      const input: PreviewGatingInput = {
        selectedJob: testJob,
        resultsCount: 10,
        confidence: 'Medium',
        headline: 'Tailor your approach for this position',
      };

      const result = shouldShowRecommendationPreview(input);
      expect(result).toBe(true);
    });

    it('should return true when selectedJob present and confidence is High', function () {
      const input: PreviewGatingInput = {
        selectedJob: testJob,
        resultsCount: 10,
        confidence: 'High',
        headline: 'This position looks like a strong match',
      };

      const result = shouldShowRecommendationPreview(input);
      expect(result).toBe(true);
    });

    it('should return false when selectedJob present but confidence is Low', function () {
      const input: PreviewGatingInput = {
        selectedJob: testJob,
        resultsCount: 10,
        confidence: 'Low',
        headline: 'Generic advice',
      };

      const result = shouldShowRecommendationPreview(input);
      expect(result).toBe(false);
    });
  });

  describe('with generic select message', function () {
    it('should return true when generic message but resultsCount > 0', function () {
      const input: PreviewGatingInput = {
        selectedJob: null,
        resultsCount: 5,
        confidence: 'Medium',
        headline: 'Select a job to get recommendations',
      };

      const result = shouldShowRecommendationPreview(input);
      expect(result).toBe(true);
    });

    it('should return false when generic message and resultsCount is 0', function () {
      const input: PreviewGatingInput = {
        selectedJob: null,
        resultsCount: 0,
        confidence: 'Medium',
        headline: 'Select a job to get recommendations',
      };

      const result = shouldShowRecommendationPreview(input);
      expect(result).toBe(false);
    });
  });
});

