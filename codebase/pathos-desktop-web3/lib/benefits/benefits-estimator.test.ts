/**
 * ============================================================================
 * BENEFITS ESTIMATOR TESTS (Day 16)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the benefits estimation utilities.
 * Tests cover calculation accuracy, edge cases, and ranking logic.
 *
 * TEST CATEGORIES:
 * 1. calculateAnnualValue - annual cash-equivalent benefits
 * 2. calculateLongTermValue - retirement projections
 * 3. calculateBreakEvenSalary - private sector comparison
 * 4. getRankedBenefitCategories - ranking logic
 * 5. formatDollarValue / getValueRange - formatting utilities
 *
 * @version Day 16 - Initial implementation
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAnnualValue,
  calculateLongTermValue,
  calculateBreakEvenSalary,
  getRankedBenefitCategories,
  formatDollarValue,
  getValueRange,
} from './benefits-estimator';

// ============================================================================
// calculateAnnualValue tests
// ============================================================================

describe('calculateAnnualValue', function () {
  describe('with valid inputs', function () {
    it('should calculate annual value for self coverage, medium tenure', function () {
      const result = calculateAnnualValue(80000, 'self', 'medium');

      // Verify structure
      expect(result).toHaveProperty('fehbEmployerContribution');
      expect(result).toHaveProperty('tspMatch');
      expect(result).toHaveProperty('tspAutomatic');
      expect(result).toHaveProperty('leaveValue');
      expect(result).toHaveProperty('fegliBasicValue');
      expect(result).toHaveProperty('fsaTaxSavings');
      expect(result).toHaveProperty('total');

      // Verify types
      expect(typeof result.fehbEmployerContribution).toBe('number');
      expect(typeof result.total).toBe('number');

      // Verify total is sum of components
      const expectedTotal =
        result.fehbEmployerContribution +
        result.tspMatch +
        result.tspAutomatic +
        result.leaveValue +
        result.fegliBasicValue +
        result.fsaTaxSavings;
      expect(result.total).toBe(expectedTotal);
    });

    it('should return higher FEHB value for family coverage than self', function () {
      const selfResult = calculateAnnualValue(80000, 'self', 'medium');
      const familyResult = calculateAnnualValue(80000, 'family', 'medium');

      expect(familyResult.fehbEmployerContribution).toBeGreaterThan(
        selfResult.fehbEmployerContribution
      );
    });

    it('should return higher leave value for longer tenure', function () {
      const shortResult = calculateAnnualValue(80000, 'self', 'short');
      const longResult = calculateAnnualValue(80000, 'self', 'long');

      expect(longResult.leaveValue).toBeGreaterThan(shortResult.leaveValue);
    });

    it('should scale TSP match with salary', function () {
      const lowerSalary = calculateAnnualValue(60000, 'self', 'medium');
      const higherSalary = calculateAnnualValue(100000, 'self', 'medium');

      expect(higherSalary.tspMatch).toBeGreaterThan(lowerSalary.tspMatch);
      // TSP match is 5% of salary
      expect(lowerSalary.tspMatch).toBe(3000); // 60000 * 0.05
      expect(higherSalary.tspMatch).toBe(5000); // 100000 * 0.05
    });

    it('should calculate TSP automatic as 1% of salary', function () {
      const result = calculateAnnualValue(80000, 'self', 'medium');
      expect(result.tspAutomatic).toBe(800); // 80000 * 0.01
    });
  });

  describe('with edge cases', function () {
    it('should handle zero salary', function () {
      const result = calculateAnnualValue(0, 'self', 'medium');

      expect(result.tspMatch).toBe(0);
      expect(result.tspAutomatic).toBe(0);
      expect(result.leaveValue).toBe(0);
      // FEHB, FEGLI, FSA are fixed values
      expect(result.fehbEmployerContribution).toBeGreaterThan(0);
    });

    it('should handle very high salary', function () {
      const result = calculateAnnualValue(500000, 'self', 'medium');

      expect(result.tspMatch).toBe(25000); // 500000 * 0.05
      expect(result.total).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// calculateLongTermValue tests
// ============================================================================

describe('calculateLongTermValue', function () {
  describe('with valid inputs', function () {
    it('should calculate long-term value structure', function () {
      const result = calculateLongTermValue(80000, 'medium');

      expect(result).toHaveProperty('fersPensionAnnual');
      expect(result).toHaveProperty('tspRetirementBalance');
      expect(result).toHaveProperty('retireeHealthBenefit');
      expect(result).toHaveProperty('disclaimer');
    });

    it('should return higher pension for longer tenure', function () {
      const shortResult = calculateLongTermValue(80000, 'short');
      const longResult = calculateLongTermValue(80000, 'long');

      expect(longResult.fersPensionAnnual).toBeGreaterThan(shortResult.fersPensionAnnual);
    });

    it('should calculate FERS pension correctly', function () {
      // FERS = salary × years × 1%
      // medium tenure = 10 years estimate
      const result = calculateLongTermValue(80000, 'medium');
      expect(result.fersPensionAnnual).toBe(8000); // 80000 × 10 × 0.01
    });

    it('should return retiree health benefit only for medium or long tenure', function () {
      const shortResult = calculateLongTermValue(80000, 'short');
      const mediumResult = calculateLongTermValue(80000, 'medium');
      const longResult = calculateLongTermValue(80000, 'long');

      expect(shortResult.retireeHealthBenefit).toBe(0);
      expect(mediumResult.retireeHealthBenefit).toBeGreaterThan(0);
      expect(longResult.retireeHealthBenefit).toBeGreaterThan(mediumResult.retireeHealthBenefit);
    });

    it('should include disclaimer about projections', function () {
      const result = calculateLongTermValue(80000, 'medium');
      expect(result.disclaimer).toContain('projection');
    });
  });
});

// ============================================================================
// calculateBreakEvenSalary tests
// ============================================================================

describe('calculateBreakEvenSalary', function () {
  describe('with valid inputs', function () {
    it('should return a break-even salary higher than federal salary', function () {
      const breakEven = calculateBreakEvenSalary(80000, 'self', 'medium');

      // Break-even should be higher because federal includes benefits
      expect(breakEven).toBeGreaterThan(80000);
    });

    it('should return higher break-even for family coverage', function () {
      const selfBreakEven = calculateBreakEvenSalary(80000, 'self', 'medium');
      const familyBreakEven = calculateBreakEvenSalary(80000, 'family', 'medium');

      // Family coverage has higher FEHB value, so break-even should be higher
      expect(familyBreakEven).toBeGreaterThan(selfBreakEven);
    });

    it('should scale with coverage type', function () {
      const selfBreakEven = calculateBreakEvenSalary(80000, 'self', 'medium');
      const familyBreakEven = calculateBreakEvenSalary(80000, 'family', 'medium');

      // Family coverage has higher FEHB value
      expect(selfBreakEven).toBeGreaterThan(0);
      expect(familyBreakEven).toBeGreaterThan(selfBreakEven);
    });
  });
});

// ============================================================================
// getRankedBenefitCategories tests
// ============================================================================

describe('getRankedBenefitCategories', function () {
  describe('ranking logic', function () {
    it('should return specified number of categories', function () {
      const top3 = getRankedBenefitCategories(80000, 'self', 'medium', 3);
      const top5 = getRankedBenefitCategories(80000, 'self', 'medium', 5);

      expect(top3).toHaveLength(3);
      expect(top5).toHaveLength(5);
    });

    it('should return categories sorted by annual value descending', function () {
      const ranked = getRankedBenefitCategories(80000, 'self', 'medium', 6);

      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].annualValue).toBeGreaterThanOrEqual(ranked[i + 1].annualValue);
      }
    });

    it('should include required properties for each category', function () {
      const ranked = getRankedBenefitCategories(80000, 'self', 'medium', 3);

      for (let i = 0; i < ranked.length; i++) {
        const category = ranked[i];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('annualValue');
        expect(category).toHaveProperty('isLongTerm');
      }
    });

    it('should rank FEHB higher for family coverage', function () {
      const selfRanked = getRankedBenefitCategories(80000, 'self', 'medium', 6);
      const familyRanked = getRankedBenefitCategories(80000, 'family', 'medium', 6);

      // Find FEHB in each
      let selfFehbValue = 0;
      let familyFehbValue = 0;
      for (let i = 0; i < selfRanked.length; i++) {
        if (selfRanked[i].id === 'fehb') {
          selfFehbValue = selfRanked[i].annualValue;
        }
      }
      for (let i = 0; i < familyRanked.length; i++) {
        if (familyRanked[i].id === 'fehb') {
          familyFehbValue = familyRanked[i].annualValue;
        }
      }

      expect(familyFehbValue).toBeGreaterThan(selfFehbValue);
    });

    it('should flag FERS as long-term', function () {
      const ranked = getRankedBenefitCategories(80000, 'self', 'medium', 6);

      let fersCategory = null;
      for (let i = 0; i < ranked.length; i++) {
        if (ranked[i].id === 'fers') {
          fersCategory = ranked[i];
          break;
        }
      }

      expect(fersCategory).not.toBeNull();
      if (fersCategory !== null) {
        expect(fersCategory.isLongTerm).toBe(true);
      }
    });
  });
});

// ============================================================================
// Formatting utilities tests
// ============================================================================

describe('formatDollarValue', function () {
  it('should format positive numbers with $ and commas', function () {
    expect(formatDollarValue(1000)).toBe('$1,000');
    expect(formatDollarValue(12500)).toBe('$12,500');
    expect(formatDollarValue(1000000)).toBe('$1,000,000');
  });

  it('should handle zero', function () {
    expect(formatDollarValue(0)).toBe('$0');
  });
});

describe('getValueRange', function () {
  it('should return a range string with default 15% variance', function () {
    const range = getValueRange(10000);

    // 10000 ± 15% = 8500 - 11500
    expect(range).toBe('$8,500 - $11,500');
  });

  it('should apply custom variance percentage', function () {
    const range = getValueRange(10000, 10);

    // 10000 ± 10% = 9000 - 11000
    expect(range).toBe('$9,000 - $11,000');
  });
});
