/**
 * ============================================================================
 * RESUME BUILDER FOCUS HANDLER TESTS
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the resolveFocusKey function that maps focus keys to
 * step indices and DOM selectors. This is the core mapping logic that
 * determines where to navigate and scroll when deep-linking.
 *
 * WHAT WE TEST:
 * 1. Valid focus keys return correct step index and selector
 * 2. Unknown focus keys return null (graceful degradation)
 * 3. Key normalization (lowercase, trimmed)
 * 4. All documented focus keys are covered
 *
 * WHAT WE DON'T TEST:
 * - DOM scrolling behavior (not testable in jsdom)
 * - React component rendering (focus handler renders null)
 * - URL manipulation (requires router mocking)
 *
 * @version Day 14 - ResumeFocus Deep-Link Scroll + Highlight Bugfix
 */

import { describe, it, expect } from 'vitest';
import { resolveFocusKey, FOCUS_KEY_MAP } from './resume-builder-focus-handler';

describe('resolveFocusKey', function () {
  // ==========================================================================
  // STEP 0: Profile keys
  // ==========================================================================
  describe('profile keys (step 0)', function () {
    it('should resolve "profile" to step 0 with no selector', function () {
      const result = resolveFocusKey('profile');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(0);
      expect(result!.selector).toBeNull();
    });

    it('should resolve "contact" to step 0 with no selector', function () {
      const result = resolveFocusKey('contact');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(0);
      expect(result!.selector).toBeNull();
    });
  });

  // ==========================================================================
  // STEP 1: Target Roles keys
  // ==========================================================================
  describe('target roles keys (step 1)', function () {
    it('should resolve "target-roles" to step 1 with no selector', function () {
      const result = resolveFocusKey('target-roles');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(1);
      expect(result!.selector).toBeNull();
    });

    it('should resolve "roles" to step 1 with no selector', function () {
      const result = resolveFocusKey('roles');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(1);
      expect(result!.selector).toBeNull();
    });
  });

  // ==========================================================================
  // STEP 2: Work Experience keys
  // ==========================================================================
  describe('work experience keys (step 2)', function () {
    it('should resolve "work-experience" to step 2 with no selector', function () {
      const result = resolveFocusKey('work-experience');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(2);
      expect(result!.selector).toBeNull();
    });

    it('should resolve "experience" to step 2 with no selector', function () {
      const result = resolveFocusKey('experience');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(2);
      expect(result!.selector).toBeNull();
    });

    it('should resolve "federal-experience" to step 2 with no selector', function () {
      const result = resolveFocusKey('federal-experience');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(2);
      expect(result!.selector).toBeNull();
    });
  });

  // ==========================================================================
  // STEP 3: Education keys
  // ==========================================================================
  describe('education keys (step 3)', function () {
    it('should resolve "education" to step 3 with no selector', function () {
      const result = resolveFocusKey('education');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(3);
      expect(result!.selector).toBeNull();
    });
  });

  // ==========================================================================
  // STEP 4: Skills keys (with sub-section selectors)
  // ==========================================================================
  describe('skills keys (step 4)', function () {
    it('should resolve "skills" to step 4 with skills selector', function () {
      const result = resolveFocusKey('skills');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(4);
      expect(result!.selector).toBe('[data-resume-section="skills"]');
    });

    it('should resolve "technical-skills" to step 4 with skills selector', function () {
      const result = resolveFocusKey('technical-skills');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(4);
      expect(result!.selector).toBe('[data-resume-section="skills"]');
    });

    it('should resolve "certifications" to step 4 with certifications selector', function () {
      const result = resolveFocusKey('certifications');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(4);
      expect(result!.selector).toBe('[data-resume-section="certifications"]');
    });

    it('should resolve "languages" to step 4 with languages selector', function () {
      const result = resolveFocusKey('languages');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(4);
      expect(result!.selector).toBe('[data-resume-section="languages"]');
    });

    it('should resolve "ksas" to step 4 with ksas selector', function () {
      const result = resolveFocusKey('ksas');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(4);
      expect(result!.selector).toBe('[data-resume-section="ksas"]');
    });

    it('should resolve "awards" to step 4 with certifications selector', function () {
      // Awards are grouped with certifications in the UI
      const result = resolveFocusKey('awards');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(4);
      expect(result!.selector).toBe('[data-resume-section="certifications"]');
    });
  });

  // ==========================================================================
  // STEP 5: Review keys
  // ==========================================================================
  describe('review keys (step 5)', function () {
    it('should resolve "review" to step 5 with no selector', function () {
      const result = resolveFocusKey('review');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(5);
      expect(result!.selector).toBeNull();
    });
  });

  // ==========================================================================
  // Key normalization
  // ==========================================================================
  describe('key normalization', function () {
    it('should handle uppercase keys (case insensitive)', function () {
      const result = resolveFocusKey('CERTIFICATIONS');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(4);
    });

    it('should handle mixed case keys', function () {
      const result = resolveFocusKey('Work-Experience');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(2);
    });

    it('should trim whitespace from keys', function () {
      const result = resolveFocusKey('  skills  ');
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(4);
    });
  });

  // ==========================================================================
  // Unknown keys (graceful degradation)
  // ==========================================================================
  describe('unknown keys', function () {
    it('should return null for unknown keys', function () {
      const result = resolveFocusKey('unknown-section');
      expect(result).toBeNull();
    });

    it('should return null for empty string', function () {
      const result = resolveFocusKey('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only string', function () {
      const result = resolveFocusKey('   ');
      expect(result).toBeNull();
    });

    it('should return null for typos', function () {
      const result = resolveFocusKey('certificatinos');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Map completeness check
  // ==========================================================================
  describe('FOCUS_KEY_MAP completeness', function () {
    it('should have all documented keys', function () {
      // Verify all documented keys exist in the map
      const documentedKeys = [
        'profile',
        'contact',
        'target-roles',
        'roles',
        'work-experience',
        'experience',
        'federal-experience',
        'education',
        'skills',
        'technical-skills',
        'certifications',
        'languages',
        'ksas',
        'awards',
        'review',
      ];

      for (let i = 0; i < documentedKeys.length; i++) {
        const key = documentedKeys[i];
        const mapping = FOCUS_KEY_MAP[key];
        expect(mapping).toBeDefined();
        expect(typeof mapping.stepIndex).toBe('number');
      }
    });

    it('should have valid step indices (0-5)', function () {
      const keys = Object.keys(FOCUS_KEY_MAP);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const mapping = FOCUS_KEY_MAP[key];
        expect(mapping.stepIndex).toBeGreaterThanOrEqual(0);
        expect(mapping.stepIndex).toBeLessThanOrEqual(5);
      }
    });
  });
});
