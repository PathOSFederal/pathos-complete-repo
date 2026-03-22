import { create } from 'zustand';
import { useCallback } from 'react';

const STORAGE_KEY = 'pathos-user-preferences';

// Export storage key for use by delete-all-local-data hook
export { STORAGE_KEY as USER_PREFERENCES_STORAGE_KEY };

/**
 * CardKey union type for all PathOS cards that display user-specific or sensitive data.
 * Naming convention:
 * - dashboard.* for main dashboard cards
 * - benefits.* for benefits-related cards
 * - retirement.* for retirement-related cards
 * - career.* for career and resume cards
 * - compensation.* for pay and compensation cards
 * - fedpath.* for FedPath scenario/planner cards
 * - jobSearch.* for job search cards
 * - resume.* for resume builder cards
 * - settings.* for profile/settings cards
 */
/**
 * ============================================================================
 * CARD KEY UNION TYPE
 * ============================================================================
 *
 * PURPOSE:
 * CardKey is a union type that defines unique string identifiers for every
 * card in the PathOS dashboard and settings pages that may display user-specific
 * or sensitive data. Each card that supports per-card visibility toggling
 * must have an entry here.
 *
 * NAMING CONVENTION:
 * - Use dot notation: "section.cardName"
 * - dashboard.* for main dashboard cards
 * - jobseeker.* for job-seeker-specific dashboard cards (Day 13)
 * - benefits.*, retirement.*, career.*, etc. for section-specific cards
 *
 * HOW IT WORKS:
 * 1. Add a new CardKey string literal when you create a new card component
 * 2. Also add it to ALL_CARD_KEYS array below so it gets default visibility
 * 3. Use useCardVisibility(cardKey) hook in your component to get/set visibility
 * 4. Visibility state is persisted to localStorage automatically
 *
 * Day 13 ADDITIONS:
 * Added three new job-seeker-specific card keys:
 * - jobseeker.marketPosition: Shows fit, salary, and mobility heuristics
 * - jobseeker.nextBestMoves: Shows actionable recommendations
 * - jobseeker.benefitsSwitching: Shows gain/loss of switching to federal
 */
export type CardKey =
  // Dashboard cards (shared or employee-focused)
  | 'dashboard.totalCompensation'
  | 'dashboard.retirementReadiness'
  | 'dashboard.taxInsights'
  | 'dashboard.fehbComparison'
  | 'dashboard.leaveBenefits'
  | 'dashboard.pcsRelocation'
  | 'dashboard.pathAdvisorInsights'
  // Job Seeker Dashboard cards (Day 13 - First-Principles Refactor)
  // These cards appear only on the Job Seeker dashboard, providing
  // a clearer, more actionable flow than the generic PathAdvisor insights.
  | 'jobseeker.marketPosition'
  | 'jobseeker.nextBestMoves'
  | 'jobseeker.benefitsSwitching'
  // Day 13 Follow-up: Federal Offer Preview section
  // This collapsible section contains "offer simulator" style cards that were
  // previously top-level on the dashboard. Moving them here keeps the primary
  // dashboard focused on high-signal Market Position and Next Best Moves content,
  // while still giving job seekers access to detailed federal offer estimates.
  // Mobile: collapsed by default (30-second value rule)
  // Desktop: expanded by default (more screen real estate)
  | 'jobseeker.federalOfferPreview'
  // Benefits cards
  | 'benefits.fehbInsights'
  | 'benefits.tspSnapshot'
  | 'benefits.leaveBenefits'
  | 'benefits.summary'
  // Retirement cards
  | 'retirement.snapshot'
  | 'retirement.scenarios'
  | 'retirement.fersDetails'
  | 'retirement.tspProjection'
  // Career & Resume cards
  | 'career.snapshot'
  | 'career.timeline'
  | 'career.promotionReadiness'
  | 'career.targetRoles'
  | 'career.resumeOverview'
  | 'career.resumeStrength'
  | 'career.nextActions'
  // Compensation cards
  | 'compensation.netPay'
  | 'compensation.payStubs'
  | 'compensation.taxWithholding'
  | 'compensation.currentPosition'
  | 'compensation.basePay'
  | 'compensation.localityPay'
  | 'compensation.totalCompensation'
  | 'compensation.payBreakdown'
  | 'compensation.benefitsOverview'
  | 'compensation.scenarioPanel'
  // FedPath scenario cards
  | 'fedpath.scenarioSummary'
  | 'fedpath.currentPosition'
  | 'fedpath.promotionOpportunities'
  | 'fedpath.relocationImpact'
  // Job Search cards
  | 'jobSearch.overview'
  | 'jobSearch.recommendations' // Day 33: PathAdvisor Recommendation card
  | 'jobSearch.careerImpact'
  // Career Outlook panel (Day 10 - Job Seeker Intelligence Layer)
  | 'jobSearch.careerOutlook'
  // Resume Builder cards
  | 'resume.scoreCard'
  | 'resume.federalEligibility'
  | 'resume.profile'
  | 'resume.currentPosition'
  | 'resume.experience'
  | 'resume.education'
  | 'resume.skills'
  | 'resume.targetRoles'
  // Settings cards
  | 'settings.identity'
  | 'settings.goals'
  | 'settings.location'
  | 'settings.benefits'
  // Other sensitive cards
  | 'other.fehbOverview'
  | 'other.leaveBalances'
  | 'other.discrepancyWatch'
  | 'other.recommendations'
  | 'other.retirementReadiness'
  | 'other.upcomingDeadlines'
  | 'other.documents';

/**
 * ============================================================================
 * ALL_CARD_KEYS ARRAY
 * ============================================================================
 *
 * PURPOSE:
 * This array contains every CardKey in the system. It is used to:
 * 1. Create default visibility state for all cards (all visible by default)
 * 2. Merge stored visibility with new keys when cards are added
 * 3. Validate stored keys against known keys (ignore unknown keys)
 *
 * IMPORTANT:
 * When you add a new CardKey to the union type above, you MUST also add it
 * here. Otherwise, the card will not have default visibility state and
 * may behave unexpectedly.
 *
 * Day 13 ADDITIONS:
 * Added the three new jobseeker.* card keys.
 */
export const ALL_CARD_KEYS: CardKey[] = [
  // Dashboard cards (shared or employee-focused)
  'dashboard.totalCompensation',
  'dashboard.retirementReadiness',
  'dashboard.taxInsights',
  'dashboard.fehbComparison',
  'dashboard.leaveBenefits',
  'dashboard.pcsRelocation',
  'dashboard.pathAdvisorInsights',
  // Job Seeker Dashboard cards (Day 13)
  'jobseeker.marketPosition',
  'jobseeker.nextBestMoves',
  'jobseeker.benefitsSwitching',
  // Day 13 Follow-up: Federal Offer Preview collapsible section
  'jobseeker.federalOfferPreview',
  'benefits.fehbInsights',
  'benefits.tspSnapshot',
  'benefits.leaveBenefits',
  'benefits.summary',
  'retirement.snapshot',
  'retirement.scenarios',
  'retirement.fersDetails',
  'retirement.tspProjection',
  'career.snapshot',
  'career.timeline',
  'career.promotionReadiness',
  'career.targetRoles',
  'career.resumeOverview',
  'career.resumeStrength',
  'career.nextActions',
  'compensation.netPay',
  'compensation.payStubs',
  'compensation.taxWithholding',
  'compensation.currentPosition',
  'compensation.basePay',
  'compensation.localityPay',
  'compensation.totalCompensation',
  'compensation.payBreakdown',
  'compensation.benefitsOverview',
  'compensation.scenarioPanel',
  'fedpath.scenarioSummary',
  'fedpath.currentPosition',
  'fedpath.promotionOpportunities',
  'fedpath.relocationImpact',
  'jobSearch.overview',
  'jobSearch.recommendations',
  'jobSearch.careerImpact',
  'jobSearch.careerOutlook',
  'resume.scoreCard',
  'resume.federalEligibility',
  'resume.profile',
  'resume.currentPosition',
  'resume.experience',
  'resume.education',
  'resume.skills',
  'resume.targetRoles',
  'settings.identity',
  'settings.goals',
  'settings.location',
  'settings.benefits',
  'other.fehbOverview',
  'other.leaveBalances',
  'other.discrepancyWatch',
  'other.recommendations',
  'other.retirementReadiness',
  'other.upcomingDeadlines',
  'other.documents',
];

/**
 * Card visibility state - maps each CardKey to its visibility boolean
 */
export type CardVisibilityState = {
  [K in CardKey]: boolean;
};

/**
 * Create default card visibility with all cards visible.
 */
function createDefaultCardVisibility(): CardVisibilityState {
  const defaults = {} as CardVisibilityState;
  for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
    defaults[ALL_CARD_KEYS[i]] = true;
  }
  return defaults;
}

const defaultCardVisibility: CardVisibilityState = createDefaultCardVisibility();

/**
 * Merge stored card visibility with defaults without using object spread.
 * Stored values override defaults; new keys get default "true".
 *
 * @param stored - Previously stored visibility state (from localStorage), or null/undefined
 * @returns Complete CardVisibilityState with all keys populated
 */
function mergeCardVisibility(stored: Partial<CardVisibilityState> | null | undefined): CardVisibilityState {
  // Object.assign is safe and avoids modern spread syntax.
  // We also guard so that non-object values don't crash.
  const base: CardVisibilityState = Object.assign({}, defaultCardVisibility);

  if (stored && typeof stored === 'object') {
    // Copy only keys we know about (prevents random keys from being added).
    for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
      const key = ALL_CARD_KEYS[i];
      if (Object.prototype.hasOwnProperty.call(stored, key)) {
        base[key] = !!stored[key];
      }
    }
  }

  return base as CardVisibilityState;
}

// Store interface
interface UserPreferencesState {
  hasAcceptedGlobalDisclaimer: boolean;
  hasSeenRetirementDisclaimer: boolean;
  hasSeenFehbDisclaimer: boolean;
  isLoaded: boolean;

  // Global privacy mode: mask sensitive values when true
  isSensitiveHidden: boolean;

  // Per-card visibility
  cardVisibility: CardVisibilityState;
}

interface UserPreferencesActions {
  setHasAcceptedGlobalDisclaimer: (value: boolean) => void;
  setHasSeenRetirementDisclaimer: (value: boolean) => void;
  setHasSeenFehbDisclaimer: (value: boolean) => void;

  // Privacy actions
  toggleSensitiveData: () => void;
  setSensitiveHidden: (hidden: boolean) => void;

  // Card visibility actions
  setCardVisibility: (cardKey: CardKey, visible: boolean) => void;
  toggleCardVisibility: (cardKey: CardKey) => void;

  // Reset action for delete all local data
  resetUserPreferences: () => void;

  // Storage
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export type UserPreferencesStore = UserPreferencesState & UserPreferencesActions;

// Selectors
export const selectHasAcceptedGlobalDisclaimer = function (state: UserPreferencesStore): boolean {
  return state.hasAcceptedGlobalDisclaimer;
};

export const selectHasSeenRetirementDisclaimer = function (state: UserPreferencesStore): boolean {
  return state.hasSeenRetirementDisclaimer;
};

export const selectHasSeenFehbDisclaimer = function (state: UserPreferencesStore): boolean {
  return state.hasSeenFehbDisclaimer;
};

export const selectIsLoaded = function (state: UserPreferencesStore): boolean {
  return state.isLoaded;
};

export const selectIsSensitiveHidden = function (state: UserPreferencesStore): boolean {
  return state.isSensitiveHidden;
};

export const selectGlobalHide = function (state: UserPreferencesStore): boolean {
  return state.isSensitiveHidden;
};

export const selectCardVisibility = function (state: UserPreferencesStore): CardVisibilityState {
  return state.cardVisibility;
};

// Default state for reset
const defaultState: Omit<UserPreferencesState, 'isLoaded'> = {
  hasAcceptedGlobalDisclaimer: false,
  hasSeenRetirementDisclaimer: false,
  hasSeenFehbDisclaimer: false,
  isSensitiveHidden: false,
  cardVisibility: mergeCardVisibility(null),
};

// Create the store
export const useUserPreferencesStore = create<UserPreferencesStore>(function (set, get) {
  return {
    // Initial state (safe defaults; hydration will replace these)
    hasAcceptedGlobalDisclaimer: false,
    hasSeenRetirementDisclaimer: false,
    hasSeenFehbDisclaimer: false,
    isLoaded: false,
    isSensitiveHidden: false,
    cardVisibility: mergeCardVisibility(null),

    // Disclaimer actions
    setHasAcceptedGlobalDisclaimer: function (value) {
      set({ hasAcceptedGlobalDisclaimer: value });
      get().saveToStorage();
    },

    setHasSeenRetirementDisclaimer: function (value) {
      set({ hasSeenRetirementDisclaimer: value });
      get().saveToStorage();
    },

    setHasSeenFehbDisclaimer: function (value) {
      set({ hasSeenFehbDisclaimer: value });
      get().saveToStorage();
    },

    // Privacy actions (IMPORTANT: must persist)
    toggleSensitiveData: function () {
      const state = get();
      const next = !state.isSensitiveHidden;
      set({ isSensitiveHidden: next });
      get().saveToStorage();
    },

    setSensitiveHidden: function (hidden) {
      set({ isSensitiveHidden: hidden });
      get().saveToStorage();
    },

    // Card visibility actions
    // These functions create a new CardVisibilityState object to trigger React re-renders.
    // We use Object.assign instead of spread syntax per project coding standards.
    setCardVisibility: function (cardKey, visible) {
      const state = get();
      const nextMap: CardVisibilityState = Object.assign({}, state.cardVisibility);
      nextMap[cardKey] = visible;

      set({ cardVisibility: nextMap });
      get().saveToStorage();
    },

    toggleCardVisibility: function (cardKey) {
      const state = get();
      const currentValue = !!state.cardVisibility[cardKey];

      const nextMap: CardVisibilityState = Object.assign({}, state.cardVisibility);
      nextMap[cardKey] = !currentValue;

      set({ cardVisibility: nextMap });
      get().saveToStorage();
    },

    // Reset action for delete all local data
    resetUserPreferences: function () {
      set({
        hasAcceptedGlobalDisclaimer: defaultState.hasAcceptedGlobalDisclaimer,
        hasSeenRetirementDisclaimer: defaultState.hasSeenRetirementDisclaimer,
        hasSeenFehbDisclaimer: defaultState.hasSeenFehbDisclaimer,
        isSensitiveHidden: defaultState.isSensitiveHidden,
        cardVisibility: mergeCardVisibility(null),
        isLoaded: true,
      });

      // Clear storage (SSR-safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.error('Failed to clear user preferences from storage:', error);
        }
      }
    },

    // Storage
    loadFromStorage: function () {
      // SSR guard: localStorage is not available on the server
      if (typeof window === 'undefined') {
        set({ isLoaded: true });
        return;
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);

          // Note: we intentionally treat undefined as "use default".
          set({
            hasAcceptedGlobalDisclaimer:
              parsed && parsed.hasAcceptedGlobalDisclaimer !== undefined
                ? !!parsed.hasAcceptedGlobalDisclaimer
                : false,

            hasSeenRetirementDisclaimer:
              parsed && parsed.hasSeenRetirementDisclaimer !== undefined
                ? !!parsed.hasSeenRetirementDisclaimer
                : false,

            hasSeenFehbDisclaimer:
              parsed && parsed.hasSeenFehbDisclaimer !== undefined ? !!parsed.hasSeenFehbDisclaimer : false,

            isSensitiveHidden:
              parsed && parsed.isSensitiveHidden !== undefined ? !!parsed.isSensitiveHidden : false,

            cardVisibility: mergeCardVisibility(parsed ? parsed.cardVisibility : null),

            isLoaded: true,
          });
        } else {
          // No stored preferences yet
          set({
            hasAcceptedGlobalDisclaimer: false,
            hasSeenRetirementDisclaimer: false,
            hasSeenFehbDisclaimer: false,
            isSensitiveHidden: false,
            cardVisibility: mergeCardVisibility(null),
            isLoaded: true,
          });
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
        set({ isLoaded: true });
      }
    },

    saveToStorage: function () {
      // SSR guard
      if (typeof window === 'undefined') {
        return;
      }

      const state = get();

      // IMPORTANT:
      // Do NOT gate on isLoaded. If a user toggles privacy early,
      // we still want persistence to be reliable across refresh.
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            hasAcceptedGlobalDisclaimer: state.hasAcceptedGlobalDisclaimer,
            hasSeenRetirementDisclaimer: state.hasSeenRetirementDisclaimer,
            hasSeenFehbDisclaimer: state.hasSeenFehbDisclaimer,
            isSensitiveHidden: state.isSensitiveHidden,
            cardVisibility: state.cardVisibility,
          })
        );
      } catch (error) {
        console.error('Failed to save user preferences:', error);
      }
    },
  };
});

/**
 * Helper hook for per-card visibility.
 * Returns visibility state and actions for a specific card.
 *
 * @example
 * const { visible, setVisible, toggle } = useCardVisibility('dashboard.retirementReadiness');
 */
export function useCardVisibility(cardKey: CardKey) {
  const visible = useUserPreferencesStore(function (state) {
    const map = state.cardVisibility;
    if (map && Object.prototype.hasOwnProperty.call(map, cardKey)) {
      return map[cardKey];
    }
    // Default visible if unset
    return true;
  });

  const isSensitiveHidden = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  const setCardVisibilityAction = useUserPreferencesStore(function (state) {
    return state.setCardVisibility;
  });

  const toggleCardVisibilityAction = useUserPreferencesStore(function (state) {
    return state.toggleCardVisibility;
  });

  // Use useCallback to stabilize function references and prevent infinite re-renders
  const setVisible = useCallback(
    function (value: boolean) {
      setCardVisibilityAction(cardKey, value);
    },
    [setCardVisibilityAction, cardKey]
  );

  const toggle = useCallback(
    function () {
      toggleCardVisibilityAction(cardKey);
    },
    [toggleCardVisibilityAction, cardKey]
  );

  return {
    /** Whether the card content should be shown (true) or placeholder (false) */
    visible: visible,
    /** Whether sensitive values should be masked (global privacy mode) */
    isSensitiveHidden: isSensitiveHidden,
    /** Set the card's visibility */
    setVisible: setVisible,
    /** Toggle the card's visibility */
    toggle: toggle,
  };
}
