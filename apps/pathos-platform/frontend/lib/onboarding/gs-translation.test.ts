/**
 * ============================================================================
 * GS TRANSLATION TESTS (Day 40 - GS Translation Layer v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the GS Translation content layer. Ensures data structure
 * integrity, required fields, and helper function correctness.
 *
 * TEST COVERAGE:
 * - getGSTranslation() returns correct content for all valid grade bands
 * - getGSTranslation() handles null/undefined gracefully
 * - getGSTranslation() handles invalid keys gracefully
 * - getSelectableGradeBands() returns correct bands
 * - isValidGradeBand() validates keys correctly
 * - All translations have required fields
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  getGSTranslation,
  getSelectableGradeBands,
  isValidGradeBand,
} from './gs-translation';
import type { GradeBandKey } from '@/lib/api/profile';

describe('getGSTranslation', function () {
  describe('with valid grade band keys', function () {
    it('should return translation for entry band', function () {
      const translation = getGSTranslation('entry');
      expect(translation).not.toBeNull();
      if (translation !== null) {
        expect(translation.plainEnglish).toBeTruthy();
        expect(translation.responsibilityLevel).toBeTruthy();
        expect(Array.isArray(translation.exampleRoles)).toBe(true);
        expect(translation.ifThisSoundsLikeYou).toBeTruthy();
        expect(translation.ifUnsure).toBeTruthy();
      }
    });

    it('should return translation for early band', function () {
      const translation = getGSTranslation('early');
      expect(translation).not.toBeNull();
      if (translation !== null) {
        expect(translation.plainEnglish).toContain('Early career');
        expect(translation.exampleRoles.length).toBeGreaterThan(0);
      }
    });

    it('should return translation for mid band', function () {
      const translation = getGSTranslation('mid');
      expect(translation).not.toBeNull();
      if (translation !== null) {
        expect(translation.plainEnglish).toContain('Mid-career');
        expect(translation.exampleRoles.length).toBeGreaterThan(0);
      }
    });

    it('should return translation for senior band', function () {
      const translation = getGSTranslation('senior');
      expect(translation).not.toBeNull();
      if (translation !== null) {
        expect(translation.plainEnglish).toContain('Senior');
        expect(translation.exampleRoles.length).toBeGreaterThan(0);
      }
    });

    it('should return translation for unsure band', function () {
      const translation = getGSTranslation('unsure');
      expect(translation).not.toBeNull();
      if (translation !== null) {
        expect(translation.plainEnglish).toBeTruthy();
        // unsure band may have empty exampleRoles array
        expect(Array.isArray(translation.exampleRoles)).toBe(true);
      }
    });

    it('should return translation for custom band', function () {
      const translation = getGSTranslation('custom');
      expect(translation).not.toBeNull();
      if (translation !== null) {
        expect(translation.plainEnglish).toBeTruthy();
      }
    });
  });

  describe('with invalid inputs', function () {
    it('should return null for null input', function () {
      const translation = getGSTranslation(null);
      expect(translation).toBeNull();
    });

    it('should return null for undefined input', function () {
      const translation = getGSTranslation(undefined);
      expect(translation).toBeNull();
    });

    it('should return null for invalid string', function () {
      const translation = getGSTranslation('invalid' as GradeBandKey);
      expect(translation).toBeNull();
    });
  });

  describe('translation content structure', function () {
    it('should have all required fields for entry band', function () {
      const translation = getGSTranslation('entry');
      expect(translation).not.toBeNull();
      if (translation !== null) {
        expect(typeof translation.plainEnglish).toBe('string');
        expect(translation.plainEnglish.length).toBeGreaterThan(0);
        expect(typeof translation.responsibilityLevel).toBe('string');
        expect(translation.responsibilityLevel.length).toBeGreaterThan(0);
        expect(Array.isArray(translation.exampleRoles)).toBe(true);
        expect(typeof translation.ifThisSoundsLikeYou).toBe('string');
        expect(translation.ifThisSoundsLikeYou.length).toBeGreaterThan(0);
        expect(typeof translation.ifUnsure).toBe('string');
        expect(translation.ifUnsure.length).toBeGreaterThan(0);
      }
    });

    it('should have example roles for entry band', function () {
      const translation = getGSTranslation('entry');
      expect(translation).not.toBeNull();
      if (translation !== null) {
        expect(translation.exampleRoles.length).toBeGreaterThan(0);
        for (let i = 0; i < translation.exampleRoles.length; i++) {
          expect(typeof translation.exampleRoles[i]).toBe('string');
          expect(translation.exampleRoles[i].length).toBeGreaterThan(0);
        }
      }
    });
  });
});

describe('getSelectableGradeBands', function () {
  it('should return array of selectable grade bands', function () {
    const bands = getSelectableGradeBands();
    expect(Array.isArray(bands)).toBe(true);
    expect(bands.length).toBeGreaterThan(0);
  });

  it('should include entry, early, mid, senior, and unsure', function () {
    const bands = getSelectableGradeBands();
    expect(bands).toContain('entry');
    expect(bands).toContain('early');
    expect(bands).toContain('mid');
    expect(bands).toContain('senior');
    expect(bands).toContain('unsure');
  });

  it('should not include custom band', function () {
    const bands = getSelectableGradeBands();
    expect(bands).not.toContain('custom');
  });
});

describe('isValidGradeBand', function () {
  it('should return true for valid grade band keys', function () {
    expect(isValidGradeBand('entry')).toBe(true);
    expect(isValidGradeBand('early')).toBe(true);
    expect(isValidGradeBand('mid')).toBe(true);
    expect(isValidGradeBand('senior')).toBe(true);
    expect(isValidGradeBand('unsure')).toBe(true);
    expect(isValidGradeBand('custom')).toBe(true);
  });

  it('should return false for null', function () {
    expect(isValidGradeBand(null)).toBe(false);
  });

  it('should return false for undefined', function () {
    expect(isValidGradeBand(undefined)).toBe(false);
  });

  it('should return false for invalid strings', function () {
    expect(isValidGradeBand('invalid')).toBe(false);
    expect(isValidGradeBand('')).toBe(false);
    expect(isValidGradeBand('gs-5')).toBe(false);
  });
});

