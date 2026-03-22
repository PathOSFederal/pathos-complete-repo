/**
 * ============================================================================
 * BENEFITS ASSUMPTIONS STORE (Day 16)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Zustand store for persisting user-customizable assumptions used to calculate
 * personalized federal benefits estimates. This enables job seekers to see
 * how their specific situation (salary, family size, tenure) affects the
 * value of federal benefits.
 *
 * ARCHITECTURE:
 * - Uses Zustand for state management
 * - Persists to localStorage with SSR-safe guards
 * - Integrates with "Delete All Local Data" hook for complete data wipe
 *
 * WHY A SEPARATE STORE:
 * Benefits assumptions are independent of profile data and job search filters.
 * Keeping them separate means:
 * 1. Users can experiment with assumptions without affecting other data
 * 2. Reset works at the assumptions level only (via Reset Assumptions button)
 * 3. Clear mental model: "What if I made $X and had family coverage?"
 *
 * USAGE:
 * ```tsx
 * const salary = useBenefitsAssumptionsStore((state) => state.salary);
 * const setSalary = useBenefitsAssumptionsStore((state) => state.setSalary);
 * ```
 *
 * @version Day 16 - Initial implementation
 * ============================================================================
 */

import { create } from 'zustand';

/**
 * Storage key for benefits assumptions.
 * Exported for use by delete-all-local-data hook.
 */
export const BENEFITS_ASSUMPTIONS_STORAGE_KEY = 'pathos-benefits-assumptions';

/**
 * Coverage type for FEHB calculations.
 * - 'self': Individual coverage only
 * - 'self-plus-one': Employee + one dependent
 * - 'family': Employee + multiple dependents
 */
export type CoverageType = 'self' | 'self-plus-one' | 'family';

/**
 * Expected tenure category for benefits vesting calculations.
 * - 'short': 1-2 years (may leave before pension vesting)
 * - 'medium': 3-5 years (FERS vesting at 5 years)
 * - 'long': 5+ years (fully vested, long-term benefits realized)
 */
export type TenureCategory = 'short' | 'medium' | 'long';

/**
 * Shape of benefits assumptions state.
 */
export interface BenefitsAssumptions {
  /**
   * Expected annual salary in dollars.
   * Used to calculate TSP match value, leave value, FEGLI value.
   * Default: 80000 (approximate GS-11 Step 5 in DC locality)
   */
  salary: number;

  /**
   * FEHB coverage type (affects premium estimates).
   * Default: 'self'
   */
  coverage: CoverageType;

  /**
   * Expected tenure in federal service.
   * Affects long-term benefit calculations (pension vesting, leave accrual).
   * Default: 'medium'
   */
  tenure: TenureCategory;

  /**
   * Optional private sector comparison fields.
   * Used to calculate break-even and competitive analysis.
   */
  privateOffer: {
    enabled: boolean;
    salary: number;
    matchPercent: number;
    monthlyHealthPremium: number;
  };
}

/**
 * Store actions for updating assumptions.
 */
interface BenefitsAssumptionsActions {
  setSalary: (salary: number) => void;
  setCoverage: (coverage: CoverageType) => void;
  setTenure: (tenure: TenureCategory) => void;
  setPrivateOfferEnabled: (enabled: boolean) => void;
  setPrivateOfferSalary: (salary: number) => void;
  setPrivateOfferMatchPercent: (percent: number) => void;
  setPrivateOfferHealthPremium: (premium: number) => void;
  resetAssumptions: () => void;
}

/**
 * Combined store type.
 */
type BenefitsAssumptionsStore = BenefitsAssumptions & BenefitsAssumptionsActions;

/**
 * Default values for benefits assumptions.
 */
const DEFAULT_ASSUMPTIONS: BenefitsAssumptions = {
  salary: 80000,
  coverage: 'self',
  tenure: 'medium',
  privateOffer: {
    enabled: false,
    salary: 100000,
    matchPercent: 4,
    monthlyHealthPremium: 400,
  },
};

/**
 * SSR-safe helper to read from localStorage.
 *
 * WHY THIS EXISTS:
 * Next.js renders pages on the server first, where localStorage is undefined.
 * This function returns undefined during SSR and reads from localStorage
 * only in the browser.
 *
 * @returns Parsed assumptions or undefined if not available
 */
function readFromStorage(): BenefitsAssumptions | undefined {
  // Guard against SSR - localStorage is not available on the server
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const stored = localStorage.getItem(BENEFITS_ASSUMPTIONS_STORAGE_KEY);
    if (stored === null) {
      return undefined;
    }
    const parsed = JSON.parse(stored);
    // Validate shape - if privateOffer is missing, add defaults
    if (parsed && typeof parsed === 'object') {
      if (!parsed.privateOffer) {
        parsed.privateOffer = DEFAULT_ASSUMPTIONS.privateOffer;
      }
      return parsed as BenefitsAssumptions;
    }
    return undefined;
  } catch (error) {
    console.error('Failed to read benefits assumptions from localStorage:', error);
    return undefined;
  }
}

/**
 * SSR-safe helper to write to localStorage.
 *
 * @param assumptions - Assumptions to persist
 */
function writeToStorage(assumptions: BenefitsAssumptions): void {
  // Guard against SSR - localStorage is not available on the server
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(
      BENEFITS_ASSUMPTIONS_STORAGE_KEY,
      JSON.stringify(assumptions)
    );
  } catch (error) {
    console.error('Failed to write benefits assumptions to localStorage:', error);
  }
}

/**
 * Get initial state with SSR-safe localStorage hydration.
 */
function getInitialState(): BenefitsAssumptions {
  const stored = readFromStorage();
  if (stored) {
    return stored;
  }
  return DEFAULT_ASSUMPTIONS;
}

/**
 * Zustand store for benefits assumptions.
 *
 * HOW IT WORKS:
 * 1. Initial state is read from localStorage (SSR-safe)
 * 2. Each setter updates state and persists to localStorage
 * 3. resetAssumptions returns all values to defaults
 *
 * EXAMPLE USAGE:
 * ```tsx
 * function SalaryInput() {
 *   const salary = useBenefitsAssumptionsStore((state) => state.salary);
 *   const setSalary = useBenefitsAssumptionsStore((state) => state.setSalary);
 *
 *   return (
 *     <Input
 *       type="number"
 *       value={salary}
 *       onChange={(e) => setSalary(Number(e.target.value))}
 *     />
 *   );
 * }
 * ```
 */
export const useBenefitsAssumptionsStore = create<BenefitsAssumptionsStore>(
  function (set, get) {
    return {
      // Initial state from localStorage or defaults
      ...getInitialState(),

      setSalary: function (salary: number) {
        set({ salary });
        writeToStorage({ ...get(), salary });
      },

      setCoverage: function (coverage: CoverageType) {
        set({ coverage });
        writeToStorage({ ...get(), coverage });
      },

      setTenure: function (tenure: TenureCategory) {
        set({ tenure });
        writeToStorage({ ...get(), tenure });
      },

      setPrivateOfferEnabled: function (enabled: boolean) {
        const currentPrivateOffer = get().privateOffer;
        const newPrivateOffer = {
          enabled: enabled,
          salary: currentPrivateOffer.salary,
          matchPercent: currentPrivateOffer.matchPercent,
          monthlyHealthPremium: currentPrivateOffer.monthlyHealthPremium,
        };
        set({ privateOffer: newPrivateOffer });
        writeToStorage({ ...get(), privateOffer: newPrivateOffer });
      },

      setPrivateOfferSalary: function (salary: number) {
        const currentPrivateOffer = get().privateOffer;
        const newPrivateOffer = {
          enabled: currentPrivateOffer.enabled,
          salary: salary,
          matchPercent: currentPrivateOffer.matchPercent,
          monthlyHealthPremium: currentPrivateOffer.monthlyHealthPremium,
        };
        set({ privateOffer: newPrivateOffer });
        writeToStorage({ ...get(), privateOffer: newPrivateOffer });
      },

      setPrivateOfferMatchPercent: function (percent: number) {
        const currentPrivateOffer = get().privateOffer;
        const newPrivateOffer = {
          enabled: currentPrivateOffer.enabled,
          salary: currentPrivateOffer.salary,
          matchPercent: percent,
          monthlyHealthPremium: currentPrivateOffer.monthlyHealthPremium,
        };
        set({ privateOffer: newPrivateOffer });
        writeToStorage({ ...get(), privateOffer: newPrivateOffer });
      },

      setPrivateOfferHealthPremium: function (premium: number) {
        const currentPrivateOffer = get().privateOffer;
        const newPrivateOffer = {
          enabled: currentPrivateOffer.enabled,
          salary: currentPrivateOffer.salary,
          matchPercent: currentPrivateOffer.matchPercent,
          monthlyHealthPremium: premium,
        };
        set({ privateOffer: newPrivateOffer });
        writeToStorage({ ...get(), privateOffer: newPrivateOffer });
      },

      resetAssumptions: function () {
        set(DEFAULT_ASSUMPTIONS);
        writeToStorage(DEFAULT_ASSUMPTIONS);
      },
    };
  }
);
