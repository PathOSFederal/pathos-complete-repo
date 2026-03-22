/**
 * ============================================================================
 * BENEFITS WORKSPACE STORE (Day 42 - Benefits Comparison Workspace v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Zustand store for managing benefits comparison workspace with Scenario A/B.
 * This enables users to create and compare benefit scenarios, safely experiment
 * with numbers, and understand trade-offs between federal and private employment.
 *
 * ARCHITECTURE:
 * - Uses Zustand for state management
 * - Persists to localStorage with SSR-safe guards
 * - Integrates with "Delete All Local Data" hook for complete data wipe
 *
 * KEY CONCEPTS:
 * - Scenario A/B: Two independent scenarios for comparison
 * - Active scenario: Currently selected scenario (A or B)
 * - Mode: Federal-only vs Federal vs Private comparison
 * - Risk posture: Explanation-only signal (low/medium/high) for context
 *
 * USAGE:
 * ```tsx
 * const activeScenarioId = useBenefitsWorkspaceStore((state) => state.activeScenarioId);
 * const scenarioA = useBenefitsWorkspaceStore((state) => state.scenarios.A);
 * const setActiveScenario = useBenefitsWorkspaceStore((state) => state.setActiveScenario);
 * const updateScenario = useBenefitsWorkspaceStore((state) => state.updateScenario);
 * ```
 *
 * @version Day 42 - Benefits Comparison Workspace v1
 * ============================================================================
 */

import { create } from 'zustand';
import type { CoverageType, TenureCategory } from './benefitsAssumptionsStore';

/**
 * Storage key for benefits workspace.
 * Exported for use by delete-all-local-data hook.
 */
export const BENEFITS_WORKSPACE_STORAGE_KEY = 'pathos-benefits-workspace-v1';

/**
 * Scenario mode for benefits comparison.
 * - 'federalOnly': Show federal benefit value framing only
 * - 'comparePrivate': Show private offer inputs, enable break-even + comparison cues
 */
export type ScenarioMode = 'federalOnly' | 'comparePrivate';

/**
 * Risk posture for explanation-only context.
 * - 'low': Conservative assumptions, stable career path
 * - 'medium': Moderate risk, some variability expected
 * - 'high': Higher risk, more uncertainty
 */
export type RiskPosture = 'low' | 'medium' | 'high';

/**
 * Private offer details for comparison mode.
 */
export interface PrivateOffer {
  /**
   * Private sector salary in dollars.
   */
  salary: number;

  /**
   * 401k match percentage (e.g., 4 for 4%).
   */
  matchPercent: number;

  /**
   * Monthly health insurance premium in dollars.
   */
  monthlyHealthPremium: number;

  /**
   * PTO days (optional, simple number).
   */
  ptoDays?: number;
}

/**
 * State for a single scenario.
 */
export interface ScenarioState {
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
   * Scenario mode (federal-only vs compare-private).
   * Default: 'federalOnly'
   */
  mode: ScenarioMode;

  /**
   * Private sector offer details (only used when mode is 'comparePrivate').
   */
  privateOffer: PrivateOffer;

  /**
   * Risk posture (explanation-only signal).
   * Default: 'medium'
   */
  riskPosture: RiskPosture;
}

/**
 * Complete workspace state.
 */
export interface BenefitsWorkspaceState {
  /**
   * Currently active scenario ID ('A' or 'B').
   */
  activeScenarioId: 'A' | 'B';

  /**
   * Scenario A state.
   */
  scenarios: {
    A: ScenarioState;
    B: ScenarioState;
  };
}

/**
 * Store actions for workspace management.
 */
interface BenefitsWorkspaceActions {
  /**
   * Set the active scenario (A or B).
   */
  setActiveScenario: (id: 'A' | 'B') => void;

  /**
   * Update a scenario with partial state.
   */
  updateScenario: (id: 'A' | 'B', partial: Partial<ScenarioState>) => void;

  /**
   * Duplicate one scenario to another.
   */
  duplicateScenario: (fromId: 'A' | 'B', toId: 'A' | 'B') => void;

  /**
   * Reset a scenario to defaults.
   */
  resetScenario: (id: 'A' | 'B') => void;

  /**
   * Reset entire workspace to defaults.
   */
  resetWorkspace: () => void;
}

/**
 * Combined store type.
 */
type BenefitsWorkspaceStore = BenefitsWorkspaceState & BenefitsWorkspaceActions;

/**
 * Default values for a scenario.
 */
const DEFAULT_SCENARIO: ScenarioState = {
  salary: 80000,
  coverage: 'self',
  tenure: 'medium',
  mode: 'federalOnly',
  privateOffer: {
    salary: 100000,
    matchPercent: 4,
    monthlyHealthPremium: 400,
    ptoDays: 15,
  },
  riskPosture: 'medium',
};

/**
 * Default workspace state.
 */
const DEFAULT_WORKSPACE: BenefitsWorkspaceState = {
  activeScenarioId: 'A',
  scenarios: {
    A: DEFAULT_SCENARIO,
    B: {
      salary: 80000,
      coverage: 'self',
      tenure: 'medium',
      mode: 'federalOnly',
      privateOffer: {
        salary: 100000,
        matchPercent: 4,
        monthlyHealthPremium: 400,
        ptoDays: 15,
      },
      riskPosture: 'medium',
    },
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
 * @returns Parsed workspace state or undefined if not available
 */
function readFromStorage(): BenefitsWorkspaceState | undefined {
  // Guard against SSR - localStorage is not available on the server
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const stored = localStorage.getItem(BENEFITS_WORKSPACE_STORAGE_KEY);
    if (stored === null) {
      return undefined;
    }
    const parsed = JSON.parse(stored);
    // Validate shape - ensure both scenarios exist
    if (parsed && typeof parsed === 'object') {
      if (!parsed.scenarios || !parsed.scenarios.A || !parsed.scenarios.B) {
        return undefined;
      }
      // Ensure activeScenarioId is valid
      if (parsed.activeScenarioId !== 'A' && parsed.activeScenarioId !== 'B') {
        parsed.activeScenarioId = 'A';
      }
      return parsed as BenefitsWorkspaceState;
    }
    return undefined;
  } catch (error) {
    console.error('Failed to read benefits workspace from localStorage:', error);
    return undefined;
  }
}

/**
 * SSR-safe helper to write to localStorage.
 *
 * @param workspace - Workspace state to persist
 */
function writeToStorage(workspace: BenefitsWorkspaceState): void {
  // Guard against SSR - localStorage is not available on the server
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(
      BENEFITS_WORKSPACE_STORAGE_KEY,
      JSON.stringify(workspace)
    );
  } catch (error) {
    console.error('Failed to write benefits workspace to localStorage:', error);
  }
}

/**
 * Get initial state with SSR-safe localStorage hydration.
 */
function getInitialState(): BenefitsWorkspaceState {
  const stored = readFromStorage();
  if (stored) {
    return stored;
  }
  return DEFAULT_WORKSPACE;
}

/**
 * Deep clone a scenario state to avoid shared references.
 *
 * WHY THIS EXISTS:
 * When duplicating scenarios, we need to ensure the new scenario
 * has its own object references, not shared references to the original.
 * This prevents mutations in one scenario from affecting the other.
 *
 * @param scenario - Scenario state to clone
 * @returns Deep-cloned scenario state
 */
function cloneScenario(scenario: ScenarioState): ScenarioState {
  return {
    salary: scenario.salary,
    coverage: scenario.coverage,
    tenure: scenario.tenure,
    mode: scenario.mode,
    privateOffer: {
      salary: scenario.privateOffer.salary,
      matchPercent: scenario.privateOffer.matchPercent,
      monthlyHealthPremium: scenario.privateOffer.monthlyHealthPremium,
      ptoDays: scenario.privateOffer.ptoDays,
    },
    riskPosture: scenario.riskPosture,
  };
}

/**
 * Zustand store for benefits workspace.
 *
 * HOW IT WORKS:
 * 1. Initial state is read from localStorage (SSR-safe)
 * 2. Each action updates state and persists to localStorage
 * 3. resetWorkspace returns all values to defaults
 *
 * EXAMPLE USAGE:
 * ```tsx
 * function ScenarioSelector() {
 *   const activeScenarioId = useBenefitsWorkspaceStore((state) => state.activeScenarioId);
 *   const setActiveScenario = useBenefitsWorkspaceStore((state) => state.setActiveScenario);
 *
 *   return (
 *     <Tabs value={activeScenarioId} onValueChange={setActiveScenario}>
 *       <TabsList>
 *         <TabsTrigger value="A">Scenario A</TabsTrigger>
 *         <TabsTrigger value="B">Scenario B</TabsTrigger>
 *       </TabsList>
 *     </Tabs>
 *   );
 * }
 * ```
 */
export const useBenefitsWorkspaceStore = create<BenefitsWorkspaceStore>(
  function (set, get) {
    return {
      // Initial state from localStorage or defaults
      ...getInitialState(),

      setActiveScenario: function (id: 'A' | 'B') {
        set({ activeScenarioId: id });
        const current = get();
        writeToStorage({
          activeScenarioId: id,
          scenarios: current.scenarios,
        });
      },

      updateScenario: function (id: 'A' | 'B', partial: Partial<ScenarioState>) {
        const current = get();
        const currentScenario = current.scenarios[id];
        const updatedScenario: ScenarioState = {
          salary:
            partial.salary !== undefined
              ? partial.salary
              : currentScenario.salary,
          coverage:
            partial.coverage !== undefined
              ? partial.coverage
              : currentScenario.coverage,
          tenure:
            partial.tenure !== undefined
              ? partial.tenure
              : currentScenario.tenure,
          mode:
            partial.mode !== undefined ? partial.mode : currentScenario.mode,
          privateOffer:
            partial.privateOffer !== undefined
              ? {
                  salary:
                    partial.privateOffer.salary !== undefined
                      ? partial.privateOffer.salary
                      : currentScenario.privateOffer.salary,
                  matchPercent:
                    partial.privateOffer.matchPercent !== undefined
                      ? partial.privateOffer.matchPercent
                      : currentScenario.privateOffer.matchPercent,
                  monthlyHealthPremium:
                    partial.privateOffer.monthlyHealthPremium !== undefined
                      ? partial.privateOffer.monthlyHealthPremium
                      : currentScenario.privateOffer.monthlyHealthPremium,
                  ptoDays:
                    partial.privateOffer.ptoDays !== undefined
                      ? partial.privateOffer.ptoDays
                      : currentScenario.privateOffer.ptoDays,
                }
              : currentScenario.privateOffer,
          riskPosture:
            partial.riskPosture !== undefined
              ? partial.riskPosture
              : currentScenario.riskPosture,
        };
        const updatedScenarios = {
          A: id === 'A' ? updatedScenario : current.scenarios.A,
          B: id === 'B' ? updatedScenario : current.scenarios.B,
        };
        set({ scenarios: updatedScenarios });
        writeToStorage({
          activeScenarioId: current.activeScenarioId,
          scenarios: updatedScenarios,
        });
      },

      duplicateScenario: function (fromId: 'A' | 'B', toId: 'A' | 'B') {
        const current = get();
        const sourceScenario = current.scenarios[fromId];
        const clonedScenario = cloneScenario(sourceScenario);
        const updatedScenarios = {
          A: toId === 'A' ? clonedScenario : current.scenarios.A,
          B: toId === 'B' ? clonedScenario : current.scenarios.B,
        };
        set({ scenarios: updatedScenarios });
        writeToStorage({
          activeScenarioId: current.activeScenarioId,
          scenarios: updatedScenarios,
        });
      },

      resetScenario: function (id: 'A' | 'B') {
        const current = get();
        const resetScenario = cloneScenario(DEFAULT_SCENARIO);
        const updatedScenarios = {
          A: id === 'A' ? resetScenario : current.scenarios.A,
          B: id === 'B' ? resetScenario : current.scenarios.B,
        };
        set({ scenarios: updatedScenarios });
        writeToStorage({
          activeScenarioId: current.activeScenarioId,
          scenarios: updatedScenarios,
        });
      },

      resetWorkspace: function () {
        set(DEFAULT_WORKSPACE);
        writeToStorage(DEFAULT_WORKSPACE);
      },
    };
  }
);
