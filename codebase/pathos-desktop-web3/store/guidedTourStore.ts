/**
 * ============================================================================
 * GUIDED TOUR STORE (Day 36 - Advisor-led Guided Tour Mode)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Manages state for the optional guided tour mode that educates users with
 * spotlight highlights and short explanations of key dashboard areas.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - State Layer: Zustand store for guided tour state
 * - Persistence: localStorage key "pathos-guided-tour-state"
 * - Integration: Used by GuidedTourOverlay component to show tour steps
 *
 * KEY CONCEPTS:
 * - Tour mode: Optional educational overlay that spotlights key UI regions
 * - Steps: Sequential explanations of dashboard areas
 * - data-tour anchors: Stable selectors using data-tour attributes (not CSS)
 * - Spotlight: Highlights target element with dimmed overlay
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. User completes onboarding or clicks "Replay guided tour" in Settings
 * 2. startTour() sets isTourActive = true and stepIndex = 0
 * 3. GuidedTourOverlay renders spotlight and tooltip for current step
 * 4. User clicks Next/Back/Skip to navigate through steps
 * 5. completeTour() sets hasSeenTour = true and isTourActive = false
 * 6. All state persists to localStorage for SSR safety
 *
 * PERSISTENCE:
 * - Stores tour state in localStorage with key "pathos-guided-tour-state"
 * - Hydrates from storage on initialization (SSR-safe)
 * - Saves to storage after every state change
 * - Reset action clears tour state (called by Delete All Local Data)
 *
 * TESTING:
 * - Unit tests cover: initialization, step transitions, persistence, completion
 * - Manual verification: Complete tour flow and verify state persists
 */

import { create } from 'zustand';
import { GUIDED_TOUR_STORAGE_KEY } from '@/lib/storage-keys';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Tour step definition - metadata for each tour step
 */
export interface GuidedTourStep {
  id: string;
  title: string;
  body: string;
  /**
   * Target tour ID that matches a data-tour attribute value.
   * For example: "pathadvisor-panel", "mission-card", etc.
   */
  targetTourId: string;
  /**
   * Placement of tooltip relative to target element.
   * Options: 'top', 'bottom', 'left', 'right', 'center'
   */
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

/**
 * Guided tour state
 */
interface GuidedTourState {
  /**
   * Whether the tour is currently active (overlay visible)
   */
  isTourActive: boolean;
  /**
   * Current step index (0-based)
   */
  stepIndex: number;
  /**
   * Whether user has seen the tour before
   */
  hasSeenTour: boolean;
  /**
   * Tour steps array
   */
  steps: GuidedTourStep[];
}

/**
 * ============================================================================
 * TOUR STEPS DEFINITION
 * ============================================================================
 */

/**
 * Tour steps configuration.
 * Each step targets a UI region using data-tour attribute value.
 * Day 36: Updated to include all 8 important areas with proper fallback support.
 */
const TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'pathadvisor',
    title: 'PathAdvisor',
    body:
      "This is PathAdvisor, your AI assistant. Ask questions, get personalized guidance, and explore your career options. Try asking: 'Show me jobs in my target grade range'.",
    targetTourId: 'pathadvisor-panel',
    placement: 'right',
  },
  {
    id: 'mission',
    title: 'Your Mission',
    body:
      'Your Mission board shows three key steps: Target the right roles, Qualify and prove it, and Apply with precision. Click any mission to see detailed guidance.',
    targetTourId: 'mission-card',
    placement: 'left',
  },
  {
    id: 'career-jobs',
    title: 'Career & Resume',
    body:
      'Career & Resume helps you build your profile and manage your career information. This is where you can view and update your professional details.',
    targetTourId: 'nav-career-resume',
    placement: 'right',
  },
  {
    id: 'job-search',
    title: 'Job Search',
    body:
      'Job Search helps you find federal opportunities that match your goals. Filter by location, grade, series, and more to discover the right positions.',
    targetTourId: 'nav-job-search',
    placement: 'right',
  },
  {
    id: 'resume-builder',
    title: 'Resume Builder',
    body:
      'Resume Builder creates tailored federal resumes. Build your resume step-by-step and tailor it to specific job applications for better results.',
    targetTourId: 'nav-resume-builder',
    placement: 'right',
  },
  {
    id: 'explore',
    title: 'Explore Federal Benefits',
    body:
      'Learn about federal benefits, retirement plans, and compensation structures. This helps you understand what to expect in federal service.',
    targetTourId: 'nav-benefits',
    placement: 'right',
  },
  {
    id: 'alerts',
    title: 'Alerts Center',
    body:
      'Set up job alerts to get notified when new positions match your criteria. Manage your alerts and email preferences here.',
    targetTourId: 'nav-alerts',
    placement: 'right',
  },
  {
    id: 'import',
    title: 'Import Center',
    body:
      'Import documents like resumes, SF-50s, and other career documents. PathOS extracts key information to build your profile automatically.',
    targetTourId: 'nav-import',
    placement: 'right',
  },
];

/**
 * ============================================================================
 * STORE INTERFACE
 * ============================================================================
 */

interface GuidedTourStore extends GuidedTourState {
  /**
   * Hydrate state from localStorage (SSR-safe)
   */
  hydrateFromStorage: () => void;
  /**
   * Start the guided tour
   */
  startTour: () => void;
  /**
   * Move to next step
   */
  nextStep: () => void;
  /**
   * Move to previous step
   */
  prevStep: () => void;
  /**
   * Skip the tour (mark as seen, exit tour)
   */
  skipTour: () => void;
  /**
   * Complete the tour (mark as seen, exit tour)
   */
  completeTour: () => void;
  /**
   * Save state to localStorage
   */
  saveToStorage: () => void;
  /**
   * Reset tour state (called by Delete All Local Data)
   */
  reset: () => void;
}

/**
 * ============================================================================
 * INITIAL STATE
 * ============================================================================
 */

const initialState: GuidedTourState = {
  isTourActive: false,
  stepIndex: 0,
  hasSeenTour: false,
  steps: TOUR_STEPS,
};

/**
 * ============================================================================
 * ZUSTAND STORE
 * ============================================================================
 */

export const useGuidedTourStore = create<GuidedTourStore>(function (set, get) {
  return {
    ...initialState,

    /**
     * Hydrate state from localStorage (SSR-safe)
     */
    hydrateFromStorage: function () {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const stored = localStorage.getItem(GUIDED_TOUR_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          set({
            hasSeenTour: parsed.hasSeenTour === true,
            // Do not restore isTourActive or stepIndex from storage
            // Tour should always start fresh
          });
        }
      } catch (error) {
        console.error('Failed to load guided tour state:', error);
      }
    },

    /**
     * Start the guided tour
     */
    startTour: function () {
      set({
        isTourActive: true,
        stepIndex: 0,
      });
      get().saveToStorage();
    },

    /**
     * Move to next step
     */
    nextStep: function () {
      const state = get();
      if (state.stepIndex < state.steps.length - 1) {
        set({
          stepIndex: state.stepIndex + 1,
        });
        get().saveToStorage();
      } else {
        // Reached last step, complete tour
        get().completeTour();
      }
    },

    /**
     * Move to previous step
     */
    prevStep: function () {
      const state = get();
      if (state.stepIndex > 0) {
        set({
          stepIndex: state.stepIndex - 1,
        });
        get().saveToStorage();
      }
    },

    /**
     * Skip the tour (mark as seen, exit tour)
     */
    skipTour: function () {
      set({
        isTourActive: false,
        stepIndex: 0,
        // Do not set hasSeenTour = true when skipping
        // User can replay later if they skipped
      });
      get().saveToStorage();
    },

    /**
     * Complete the tour (mark as seen, exit tour)
     */
    completeTour: function () {
      set({
        isTourActive: false,
        stepIndex: 0,
        hasSeenTour: true,
      });
      get().saveToStorage();
    },

    /**
     * Save state to localStorage
     */
    saveToStorage: function () {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const state = get();
        const toStore = {
          hasSeenTour: state.hasSeenTour,
          // Do not persist isTourActive or stepIndex
          // Tour should always start fresh when started
        };
        localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Failed to save guided tour state:', error);
      }
    },

    /**
     * Reset tour state (called by Delete All Local Data)
     */
    reset: function () {
      set(initialState);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(GUIDED_TOUR_STORAGE_KEY);
        } catch (error) {
          console.error('Failed to clear guided tour state:', error);
        }
      }
    },
  };
});

/**
 * ============================================================================
 * SELECTORS
 * ============================================================================
 */

export function selectIsTourActive(state: GuidedTourStore): boolean {
  return state.isTourActive;
}

export function selectCurrentStep(state: GuidedTourStore): GuidedTourStep | null {
  const steps = state.steps;
  const stepIndex = state.stepIndex;
  if (stepIndex >= 0 && stepIndex < steps.length) {
    return steps[stepIndex];
  }
  return null;
}

export function selectHasSeenTour(state: GuidedTourStore): boolean {
  return state.hasSeenTour;
}
