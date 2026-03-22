/**
 * ============================================================================
 * BENEFITS ESTIMATOR UTILITIES (Day 16)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Pure utility functions for calculating federal benefits estimates based on
 * user assumptions (salary, coverage, tenure). These functions power the
 * personalized benefits displays on the Explore Federal Benefits page.
 *
 * ARCHITECTURE:
 * - All functions are pure (no side effects, no state)
 * - Designed for easy unit testing
 * - Values are conservative estimates based on OPM published data
 *
 * KEY CONCEPTS:
 * - Annual Value: Benefits that provide immediate cash-equivalent value per year
 *   (FEHB employer contribution, TSP match, leave value, FEGLI basic)
 * - Long-term Value: Retirement-related benefits that accumulate over time
 *   (FERS pension, TSP growth, retiree health benefits)
 *
 * SOURCES:
 * - FEHB premiums: OPM 2024 plan comparison data (averaged)
 * - TSP: 5% match is statutory
 * - Leave: OPM leave accrual schedules
 * - FEGLI: OPM FEGLI premium charts
 *
 * @version Day 16 - Initial implementation
 * ============================================================================
 */

import type { CoverageType, TenureCategory } from '@/store/benefitsAssumptionsStore';

/**
 * Result of an annual value calculation.
 */
export interface AnnualValueResult {
  /**
   * FEHB employer contribution (approximately 72% of premium).
   */
  fehbEmployerContribution: number;

  /**
   * TSP agency match (5% of salary for employees contributing 5%+).
   */
  tspMatch: number;

  /**
   * TSP automatic contribution (1% of salary, always provided).
   */
  tspAutomatic: number;

  /**
   * Value of paid leave (annual + sick + holidays) converted to dollars.
   */
  leaveValue: number;

  /**
   * Basic FEGLI coverage value (free, equals annual salary).
   * Value calculated as premium cost if purchased privately.
   */
  fegliBasicValue: number;

  /**
   * FSA tax savings estimate (health + dependent care).
   */
  fsaTaxSavings: number;

  /**
   * Total annual value (sum of all above).
   */
  total: number;
}

/**
 * Result of a long-term value calculation.
 */
export interface LongTermValueResult {
  /**
   * Estimated annual FERS pension at retirement.
   * Based on high-3 average salary × years × multiplier.
   */
  fersPensionAnnual: number;

  /**
   * Estimated TSP balance at retirement (conservative growth assumption).
   */
  tspRetirementBalance: number;

  /**
   * Estimated value of retiree health benefits (FEHB continuation).
   */
  retireeHealthBenefit: number;

  /**
   * Note explaining that these are projections.
   */
  disclaimer: string;
}

/**
 * Single benefit category for ranking.
 */
export interface BenefitCategory {
  id: string;
  name: string;
  description: string;
  annualValue: number;
  isLongTerm: boolean;
}

// ============================================================================
// ESTIMATION CONSTANTS
// ============================================================================

/**
 * Average FEHB employer contribution by coverage type (2024 data).
 * Government pays approximately 72% of the weighted average premium.
 *
 * WHY THESE VALUES:
 * Based on OPM published data for popular FEHB plans (BCBS, GEHA, etc.).
 * These are conservative mid-range estimates.
 */
const FEHB_EMPLOYER_CONTRIBUTION: Record<CoverageType, number> = {
  self: 7200,        // ~$600/month employer share
  'self-plus-one': 14400, // ~$1,200/month employer share
  family: 17400,     // ~$1,450/month employer share
};

/**
 * Leave days per year by tenure category.
 * Includes annual leave + sick leave (13 days) + federal holidays (11 days).
 */
const LEAVE_DAYS: Record<TenureCategory, { annual: number; sick: number; holidays: number }> = {
  short: { annual: 13, sick: 13, holidays: 11 },   // < 3 years
  medium: { annual: 20, sick: 13, holidays: 11 },  // 3-15 years
  long: { annual: 26, sick: 13, holidays: 11 },    // 15+ years
};

/**
 * FEGLI basic coverage is free and equals annual salary.
 * This value represents the cost if purchased privately (age-based estimate).
 */
const FEGLI_BASIC_COST_EQUIVALENT = 600; // Conservative annual premium equivalent

/**
 * FSA tax savings estimate (assumes 25% marginal rate).
 * Average FSA contribution patterns: ~$2,000 health + ~$3,000 dependent care.
 */
const FSA_TAX_SAVINGS = 1250; // 25% of $5,000 average contribution

/**
 * FERS pension multiplier.
 * 1% per year for most employees, 1.1% if retiring at 62+ with 20+ years.
 */
const FERS_MULTIPLIER = 0.01;

/**
 * Assumed years of service for pension calculation by tenure.
 */
const SERVICE_YEARS_ESTIMATE: Record<TenureCategory, number> = {
  short: 2,
  medium: 10,
  long: 25,
};

/**
 * Conservative TSP growth rate (5% real return).
 */
const TSP_ANNUAL_GROWTH_RATE = 0.05;

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate annual value (immediate cash-equivalent benefits).
 *
 * HOW IT WORKS:
 * 1. FEHB: Look up employer contribution by coverage type
 * 2. TSP: 1% automatic + 5% match (assumes employee contributes 5%+)
 * 3. Leave: Convert leave days to dollar value using hourly rate
 * 4. FEGLI: Fixed estimate for basic coverage value
 * 5. FSA: Fixed estimate for tax savings
 *
 * @param salary - Annual salary in dollars
 * @param coverage - FEHB coverage type
 * @param tenure - Expected tenure category
 * @returns Breakdown of annual value components and total
 *
 * @example
 * const result = calculateAnnualValue(80000, 'self', 'medium');
 * // result.total might be ~$28,000/year
 */
export function calculateAnnualValue(
  salary: number,
  coverage: CoverageType,
  tenure: TenureCategory
): AnnualValueResult {
  // FEHB employer contribution (based on coverage type)
  const fehbEmployerContribution = FEHB_EMPLOYER_CONTRIBUTION[coverage];

  // TSP automatic contribution (1% of salary, always)
  const tspAutomatic = Math.round(salary * 0.01);

  // TSP match (5% of salary, assuming employee contributes 5%+)
  const tspMatch = Math.round(salary * 0.05);

  // Leave value calculation
  const leaveDays = LEAVE_DAYS[tenure];
  const totalLeaveDays = leaveDays.annual + leaveDays.sick + leaveDays.holidays;
  // Convert to hourly rate (2080 work hours per year = 260 days × 8 hours)
  const dailyRate = salary / 260;
  const leaveValue = Math.round(totalLeaveDays * dailyRate);

  // FEGLI basic value
  const fegliBasicValue = FEGLI_BASIC_COST_EQUIVALENT;

  // FSA tax savings
  const fsaTaxSavings = FSA_TAX_SAVINGS;

  // Calculate total
  const total =
    fehbEmployerContribution +
    tspAutomatic +
    tspMatch +
    leaveValue +
    fegliBasicValue +
    fsaTaxSavings;

  return {
    fehbEmployerContribution,
    tspMatch,
    tspAutomatic,
    leaveValue,
    fegliBasicValue,
    fsaTaxSavings,
    total,
  };
}

/**
 * Calculate long-term value (retirement-related benefits).
 *
 * HOW IT WORKS:
 * 1. FERS pension: high-3 × years × 1% multiplier
 * 2. TSP: Project balance assuming consistent contributions and growth
 * 3. Retiree health: Estimated value of FEHB continuation in retirement
 *
 * @param salary - Annual salary in dollars
 * @param tenure - Expected tenure category (affects years of service)
 * @returns Long-term value estimates
 *
 * @example
 * const result = calculateLongTermValue(80000, 'long');
 * // result.fersPensionAnnual might be ~$20,000/year at retirement
 */
export function calculateLongTermValue(
  salary: number,
  tenure: TenureCategory
): LongTermValueResult {
  const yearsOfService = SERVICE_YEARS_ESTIMATE[tenure];

  // FERS pension calculation
  // Pension = High-3 average salary × years × 1%
  // Simplified: assume current salary is high-3
  const fersPensionAnnual = Math.round(salary * yearsOfService * FERS_MULTIPLIER);

  // TSP balance projection
  // Assumes: 5% employee + 5% match = 10% annual contribution
  // Future value = contribution × ((1 + r)^n - 1) / r
  const annualContribution = salary * 0.10;
  let tspRetirementBalance = 0;
  if (yearsOfService > 0) {
    // Simple compound growth formula
    const growthFactor = Math.pow(1 + TSP_ANNUAL_GROWTH_RATE, yearsOfService);
    tspRetirementBalance = Math.round(
      annualContribution * ((growthFactor - 1) / TSP_ANNUAL_GROWTH_RATE)
    );
  }

  // Retiree health benefit value
  // Only vested after 5 years. Value is the present value of future FEHB coverage.
  let retireeHealthBenefit = 0;
  if (tenure === 'long') {
    // Conservative estimate: 15 years of retirement × $8,000/year employer contribution
    retireeHealthBenefit = 120000;
  } else if (tenure === 'medium') {
    retireeHealthBenefit = 80000;
  }
  // Short tenure: no retiree health benefit (not vested)

  return {
    fersPensionAnnual,
    tspRetirementBalance,
    retireeHealthBenefit,
    disclaimer:
      'Long-term projections assume consistent contributions and 5% annual growth. Actual results will vary based on market conditions and career progression.',
  };
}

/**
 * Calculate the break-even private sector salary needed to match federal total comp.
 *
 * HOW IT WORKS:
 * 1. Calculate total federal annual value (salary + benefits)
 * 2. Estimate what private sector salary would provide equivalent value
 * 3. Account for: no TSP match (need 401k match), no FEHB (need to buy own)
 *
 * @param salary - Federal annual salary
 * @param coverage - FEHB coverage type
 * @param tenure - Expected tenure
 * @param privateMatchPercent - Private employer 401k match (default 4%)
 * @param privateMonthlyHealth - Private monthly health premium (default $400)
 * @returns Break-even private salary in dollars
 *
 * @example
 * const breakEven = calculateBreakEvenSalary(80000, 'self', 'medium');
 * // breakEven might be ~$105,000
 */
export function calculateBreakEvenSalary(
  salary: number,
  coverage: CoverageType,
  tenure: TenureCategory
): number {
  /**
   * Calculate break-even salary for private sector comparison.
   *
   * HOW IT WORKS:
   * We compute the federal total compensation (salary + benefits) and then
   * apply a 10% buffer to account for intangibles (job security, work-life balance,
   * pension value, etc.). This gives a conservative estimate of what private
   * salary would be needed to match federal total comp.
   *
   * FUTURE ENHANCEMENT:
   * Could accept privateMatchPercent and privateMonthlyHealth to do a
   * detailed comparison of private 401k match and health costs.
   */

  // Get federal annual value (FEHB, TSP, leave, FEGLI, FSA)
  const annualValue = calculateAnnualValue(salary, coverage, tenure);

  // Total federal compensation = salary + annual benefits value
  const federalTotalComp = salary + annualValue.total;

  // Apply 10% buffer for intangibles (job security, work-life balance, pension value)
  // This is a conservative estimate that accounts for non-quantifiable benefits
  const breakEvenSalary = Math.round(federalTotalComp * 1.1);

  return breakEvenSalary;
}

/**
 * Get ranked benefit categories based on annual value.
 *
 * HOW IT WORKS:
 * 1. Calculate value of each benefit category
 * 2. Sort by annual value (descending)
 * 3. Return top N categories
 *
 * @param salary - Annual salary
 * @param coverage - FEHB coverage type
 * @param tenure - Expected tenure
 * @param limit - Number of categories to return (default 3)
 * @returns Ranked array of benefit categories
 *
 * @example
 * const top3 = getRankedBenefitCategories(80000, 'family', 'medium', 3);
 * // Might return: [FEHB, Leave, TSP] for family coverage
 */
export function getRankedBenefitCategories(
  salary: number,
  coverage: CoverageType,
  tenure: TenureCategory,
  limit: number = 3
): BenefitCategory[] {
  const annual = calculateAnnualValue(salary, coverage, tenure);
  const longTerm = calculateLongTermValue(salary, tenure);

  // Build category list
  const categories: BenefitCategory[] = [
    {
      id: 'fehb',
      name: 'Health Insurance (FEHB)',
      description: 'Government pays ~72% of your health insurance premium',
      annualValue: annual.fehbEmployerContribution,
      isLongTerm: false,
    },
    {
      id: 'tsp',
      name: 'TSP Retirement Match',
      description: '5% matching + 1% automatic = 6% free retirement contribution',
      annualValue: annual.tspMatch + annual.tspAutomatic,
      isLongTerm: false,
    },
    {
      id: 'leave',
      name: 'Paid Leave',
      description: 'Generous annual, sick, and holiday leave',
      annualValue: annual.leaveValue,
      isLongTerm: false,
    },
    {
      id: 'fers',
      name: 'FERS Pension',
      description: 'Guaranteed retirement income after 5 years',
      annualValue: longTerm.fersPensionAnnual,
      isLongTerm: true,
    },
    {
      id: 'fegli',
      name: 'Life Insurance (FEGLI)',
      description: 'Basic coverage (1x salary) at no cost to you',
      annualValue: annual.fegliBasicValue,
      isLongTerm: false,
    },
    {
      id: 'fsa',
      name: 'Flexible Spending Accounts',
      description: 'Pre-tax savings for health and dependent care',
      annualValue: annual.fsaTaxSavings,
      isLongTerm: false,
    },
  ];

  // Sort by annual value (descending)
  categories.sort(function (a, b) {
    return b.annualValue - a.annualValue;
  });

  // Return top N
  const result: BenefitCategory[] = [];
  for (let i = 0; i < Math.min(limit, categories.length); i++) {
    result.push(categories[i]);
  }
  return result;
}

/**
 * Format a dollar value for display.
 *
 * @param value - Dollar amount
 * @returns Formatted string (e.g., "$12,400")
 */
export function formatDollarValue(value: number): string {
  return '$' + value.toLocaleString('en-US');
}

/**
 * Get a human-readable range for annual value.
 *
 * @param baseValue - Base calculated value
 * @param variancePercent - Variance percentage (default 15%)
 * @returns Range string (e.g., "$24,000 - $28,000")
 */
export function getValueRange(baseValue: number, variancePercent: number = 15): string {
  const variance = Math.round(baseValue * (variancePercent / 100));
  const low = baseValue - variance;
  const high = baseValue + variance;
  return formatDollarValue(low) + ' - ' + formatDollarValue(high);
}
