/**
 * ============================================================================
 * ONBOARDING STORE (Day 36 - Advisor-led Conversational Onboarding Mode)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Manages onboarding state, step progression, and answer collection for the
 * advisor-led conversational onboarding experience. This store tracks progress,
 * stores answers, and maps them to the profile store when onboarding completes.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - State Layer: Zustand store for onboarding mode state
 * - Persistence: localStorage key "pathos-onboarding-state"
 * - Integration: Reads/writes to profileStore to update profile as user answers
 * - UI Integration: Dashboard checks this store to determine if onboarding mode should be active
 *
 * KEY CONCEPTS:
 * - Onboarding mode: Dashboard state where cards are dimmed and PathAdvisor guides conversation
 * - Steps: Sequential questions that PathAdvisor asks one at a time
 * - Answers: Structured object that collects user responses
 * - Profile mapping: Answers are mapped to profile fields when step completes
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. On dashboard mount, check if onboarding should start (profile incomplete or onboardingComplete false)
 * 2. If yes, startOnboarding() is called, which sets isOnboardingMode = true
 * 3. PathAdvisor asks current step question based on currentStepId
 * 4. User answers via answerCurrentStep(value)
 * 5. Answer is stored in answers object and mapped to profile store immediately
 * 6. goNext() advances to next step
 * 7. When all steps complete, completeOnboarding() sets onboardingComplete = true and exits mode
 * 8. All state persists to localStorage for SSR safety
 *
 * ONBOARDING STEPS (v1):
 * Step 1: Welcome and framing (informational, no answer needed)
 * Step 2: Persona selection (Job Seeker vs Federal Employee)
 * Step 3: Target grade band or current grade (depends on persona)
 * Step 4: Location preference and relocation stance
 * Step 5: Top priorities (choose up to 3)
 * Step 6: Confirm summary (review collected answers)
 * Step 7: Personalized "how to use PathOS" explanation (informational)
 * Step 8: Complete onboarding (sets onboardingComplete = true)
 *
 * PERSISTENCE:
 * - Stores onboarding state in localStorage with key "pathos-onboarding-state"
 * - Hydrates from storage on initialization (SSR-safe)
 * - Saves to storage after every state change
 * - Answers are mapped to profileStore immediately as user progresses
 *
 * PROFILE MAPPING:
 * Answers collected during onboarding are immediately mapped to profile fields:
 * - persona -> profile.persona
 * - gradeBand/targetGradeFrom/targetGradeTo -> profile.goals
 * - location -> profile.location
 * - priorities -> profile.preferences.priorities
 * - name -> profile.name (if collected)
 *
 * TESTING:
 * - Unit tests cover: initialization, step transitions, answer storage, profile mapping, completion
 * - Manual verification: Complete onboarding flow and verify profile updates persist
 */

import { create } from 'zustand';
import { useProfileStore } from './profileStore';
import type { PersonaType, GradeBandKey, RelocationWillingness } from '@/store/profileStore';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Step ID type - defines all possible onboarding steps
 */
export type OnboardingStepId =
  | 'welcome'
  | 'persona'
  | 'grade'
  | 'location'
  | 'priorities'
  | 'summary'
  | 'intro'
  | 'complete';

/**
 * Step definition - metadata for each onboarding step
 */
export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  isComplete: boolean;
  isOptional?: boolean;
}

/**
 * Onboarding answers - structured object that collects user responses
 */
export interface OnboardingAnswers {
  persona?: PersonaType;
  name?: string;
  gradeBand?: GradeBandKey;
  targetGradeFrom?: string;
  targetGradeTo?: string;
  currentGrade?: string;
  location?: string;
  relocationWillingness?: RelocationWillingness;
  priorities?: string[];
}

/**
 * Onboarding state - all state managed by the store
 */
interface OnboardingState {
  /**
   * Whether onboarding mode is currently active
   */
  isOnboardingMode: boolean;
  /**
   * Array of step definitions with completion status
   */
  steps: OnboardingStep[];
  /**
   * ID of the current step being shown
   */
  currentStepId: OnboardingStepId;
  /**
   * Collected answers from user responses
   */
  answers: OnboardingAnswers;
  /**
   * Whether onboarding has been completed (persisted flag)
   */
  onboardingComplete: boolean;
}

/**
 * Onboarding actions - functions that modify state
 */
interface OnboardingActions {
  /**
   * Start onboarding mode
   * Sets isOnboardingMode = true and resets to first step
   */
  startOnboarding: () => void;
  /**
   * Answer the current step with a value
   * Stores answer and maps to profile store
   */
  answerCurrentStep: (value: unknown) => void;
  /**
   * Advance to the next step
   */
  goNext: () => void;
  /**
   * Go back to the previous step
   */
  goBack: () => void;
  /**
   * Skip an optional step
   */
  skipOptional: () => void;
  /**
   * Complete onboarding
   * Sets onboardingComplete = true, exits onboarding mode, marks profile as complete
   */
  completeOnboarding: () => void;
  /**
   * Restart onboarding from the beginning
   * Clears answers and resets to first step
   */
  restartOnboarding: () => void;
  /**
   * Hydrate state from localStorage (SSR-safe)
   */
  hydrateFromStorage: () => void;
  /**
   * Save current state to localStorage (SSR-safe)
   */
  saveToStorage: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

/**
 * ============================================================================
 * CONSTANTS
 * ============================================================================
 */

import { ONBOARDING_STORAGE_KEY } from '@/lib/storage-keys';

/**
 * Step definitions - ordered list of onboarding steps
 */
const STEP_DEFINITIONS: OnboardingStep[] = [
  { id: 'welcome', label: 'Welcome', isComplete: false },
  { id: 'persona', label: 'Persona', isComplete: false },
  { id: 'grade', label: 'Grade', isComplete: false },
  { id: 'location', label: 'Location', isComplete: false },
  { id: 'priorities', label: 'Priorities', isComplete: false },
  { id: 'summary', label: 'Summary', isComplete: false },
  { id: 'intro', label: 'Introduction', isComplete: false },
  { id: 'complete', label: 'Complete', isComplete: false },
];

/**
 * Step order - defines the sequence of steps
 */
const STEP_ORDER: OnboardingStepId[] = [
  'welcome',
  'persona',
  'grade',
  'location',
  'priorities',
  'summary',
  'intro',
  'complete',
];

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Helper: Get step index from step ID
 * Returns -1 if step ID not found
 */
function getStepIndex(stepId: OnboardingStepId): number {
  for (let i = 0; i < STEP_ORDER.length; i++) {
    if (STEP_ORDER[i] === stepId) {
      return i;
    }
  }
  return -1;
}

/**
 * Helper: Get next step ID from current step ID
 * Returns null if already at last step
 */
function getNextStepId(currentStepId: OnboardingStepId): OnboardingStepId | null {
  const currentIndex = getStepIndex(currentStepId);
  if (currentIndex < 0 || currentIndex >= STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[currentIndex + 1];
}

/**
 * Helper: Get previous step ID from current step ID
 * Returns null if already at first step
 */
function getPreviousStepId(currentStepId: OnboardingStepId): OnboardingStepId | null {
  const currentIndex = getStepIndex(currentStepId);
  if (currentIndex <= 0) {
    return null;
  }
  return STEP_ORDER[currentIndex - 1];
}

/**
 * Helper: Map onboarding answers to profile store updates
 * This function applies answers to the profile store immediately as user progresses
 */
function mapAnswersToProfile(answers: OnboardingAnswers): void {
  const profileStore = useProfileStore.getState();

  // Map persona if provided
  if (answers.persona !== undefined) {
    profileStore.updateProfile({ persona: answers.persona });
  }

  // Map name if provided
  if (answers.name !== undefined && answers.name.trim().length > 0) {
    profileStore.updateProfile({ name: answers.name });
  }

  // Map grade information based on persona
  if (answers.persona === 'job_seeker') {
    // For job seekers, use gradeBand or targetGradeFrom/To
    if (answers.gradeBand !== undefined) {
      profileStore.updateGoals({ gradeBand: answers.gradeBand });

      // Map gradeBand to targetGradeFrom/To if applicable
      if (answers.gradeBand === 'entry') {
        profileStore.updateGoals({ targetGradeFrom: 'GS-5', targetGradeTo: 'GS-7' });
      } else if (answers.gradeBand === 'early') {
        profileStore.updateGoals({ targetGradeFrom: 'GS-7', targetGradeTo: 'GS-9' });
      } else if (answers.gradeBand === 'mid') {
        profileStore.updateGoals({ targetGradeFrom: 'GS-9', targetGradeTo: 'GS-11' });
      } else if (answers.gradeBand === 'senior') {
        profileStore.updateGoals({ targetGradeFrom: 'GS-12', targetGradeTo: 'GS-13' });
      }
    }

    if (answers.targetGradeFrom !== undefined) {
      profileStore.updateGoals({ targetGradeFrom: answers.targetGradeFrom });
    }
    if (answers.targetGradeTo !== undefined) {
      profileStore.updateGoals({ targetGradeTo: answers.targetGradeTo });
    }
  } else if (answers.persona === 'federal_employee' && answers.currentGrade !== undefined) {
    // For employees, use currentGrade
    // Note: This would need to be mapped to current.grade, but we'll handle that separately
    // For now, we'll just store it in answers for use in summary step
  }

  // Map location preferences
  if (answers.location !== undefined) {
    profileStore.updateLocation({ currentMetroArea: answers.location });
  }
  if (answers.relocationWillingness !== undefined) {
    profileStore.updateLocation({ relocationWillingness: answers.relocationWillingness });
  }

  // Map priorities
  if (answers.priorities !== undefined && answers.priorities.length > 0) {
    profileStore.updatePreferences({ priorities: answers.priorities });
  }
}

/**
 * ============================================================================
 * STORE CREATION
 * ============================================================================
 */

/**
 * Create the onboarding store
 * Uses Zustand with SSR-safe localStorage persistence
 */
export const useOnboardingStore = create<OnboardingStore>(function (set, get) {
  return {
    // Initial state
    isOnboardingMode: false,
    steps: STEP_DEFINITIONS.map(function (step) {
      return Object.assign({}, step);
    }),
    currentStepId: 'welcome',
    answers: {},
    onboardingComplete: false,

    // Actions
    startOnboarding: function () {
      set({
        isOnboardingMode: true,
        currentStepId: 'welcome',
        steps: STEP_DEFINITIONS.map(function (step) {
          return Object.assign({}, step, { isComplete: false });
        }),
        answers: {},
      });
      get().saveToStorage();
    },

    answerCurrentStep: function (value) {
      const state = get();
      const currentStepId = state.currentStepId;
      const answers = Object.assign({}, state.answers);

      // Store answer based on current step
      if (currentStepId === 'persona') {
        answers.persona = value as PersonaType;
      } else if (currentStepId === 'grade') {
        // Grade step can have different value types depending on persona
        if (typeof value === 'string') {
          if (state.answers.persona === 'job_seeker') {
            answers.gradeBand = value as GradeBandKey;
          } else {
            answers.currentGrade = value;
          }
        } else if (value !== null && typeof value === 'object') {
          const gradeObj = value as { gradeBand?: GradeBandKey; targetGradeFrom?: string; targetGradeTo?: string };
          if (gradeObj.gradeBand !== undefined) {
            answers.gradeBand = gradeObj.gradeBand;
          }
          if (gradeObj.targetGradeFrom !== undefined) {
            answers.targetGradeFrom = gradeObj.targetGradeFrom;
          }
          if (gradeObj.targetGradeTo !== undefined) {
            answers.targetGradeTo = gradeObj.targetGradeTo;
          }
        }
      } else if (currentStepId === 'location') {
        const locationObj = value as { location?: string; relocationWillingness?: RelocationWillingness };
        if (locationObj.location !== undefined) {
          answers.location = locationObj.location;
        }
        if (locationObj.relocationWillingness !== undefined) {
          answers.relocationWillingness = locationObj.relocationWillingness;
        }
      } else if (currentStepId === 'priorities') {
        answers.priorities = value as string[];
      }

      // Mark current step as complete
      const updatedSteps = state.steps.map(function (step) {
        if (step.id === currentStepId) {
          return Object.assign({}, step, { isComplete: true });
        }
        return step;
      });

      set({
        answers: answers,
        steps: updatedSteps,
      });

      // Map answers to profile store immediately
      mapAnswersToProfile(answers);

      get().saveToStorage();
    },

    goNext: function () {
      const state = get();
      const nextStepId = getNextStepId(state.currentStepId);
      if (nextStepId !== null) {
        set({ currentStepId: nextStepId });
        get().saveToStorage();
      }
    },

    goBack: function () {
      const state = get();
      const previousStepId = getPreviousStepId(state.currentStepId);
      if (previousStepId !== null) {
        set({ currentStepId: previousStepId });
        get().saveToStorage();
      }
    },

    skipOptional: function () {
      const state = get();
      const currentStep = state.steps.find(function (step) {
        return step.id === state.currentStepId;
      });
      if (currentStep !== undefined && currentStep.isOptional === true) {
        get().goNext();
      }
    },

    completeOnboarding: function () {
      const profileStore = useProfileStore.getState();

      // Mark onboarding as complete in profile store
      profileStore.setOnboardingComplete(true);
      profileStore.markProfileComplete();

      // Update onboarding store state
      set({
        isOnboardingMode: false,
        onboardingComplete: true,
        currentStepId: 'complete',
      });

      get().saveToStorage();
    },

    restartOnboarding: function () {
      set({
        isOnboardingMode: true,
        currentStepId: 'welcome',
        steps: STEP_DEFINITIONS.map(function (step) {
          return Object.assign({}, step, { isComplete: false });
        }),
        answers: {},
        onboardingComplete: false,
      });
      get().saveToStorage();
    },

    hydrateFromStorage: function () {
      // SSR guard: localStorage is not available on the server
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          set({
            isOnboardingMode: parsed.isOnboardingMode === true,
            currentStepId: parsed.currentStepId || 'welcome',
            answers: parsed.answers || {},
            onboardingComplete: parsed.onboardingComplete === true,
            // Steps are recreated from definitions but preserve completion status if stored
            steps: STEP_DEFINITIONS.map(function (step) {
              const storedStep = parsed.steps
                ? parsed.steps.find(function (s: OnboardingStep) {
                    return s.id === step.id;
                  })
                : undefined;
              return Object.assign({}, step, {
                isComplete: storedStep !== undefined ? storedStep.isComplete === true : false,
              });
            }),
          });
        }
      } catch (error) {
        console.error('Failed to load onboarding state from storage:', error);
      }
    },

    saveToStorage: function () {
      // SSR guard: localStorage is not available on the server
      if (typeof window === 'undefined') {
        return;
      }

      const state = get();
      try {
        localStorage.setItem(
          ONBOARDING_STORAGE_KEY,
          JSON.stringify({
            isOnboardingMode: state.isOnboardingMode,
            currentStepId: state.currentStepId,
            answers: state.answers,
            onboardingComplete: state.onboardingComplete,
            steps: state.steps,
          })
        );
      } catch (error) {
        console.error('Failed to save onboarding state to storage:', error);
      }
    },
  };
});

/**
 * ============================================================================
 * SELECTORS
 * ============================================================================
 */

/**
 * Selector: Get whether onboarding mode is active
 */
export function selectIsOnboardingMode(state: OnboardingStore): boolean {
  return state.isOnboardingMode;
}

/**
 * Selector: Get current step ID
 */
export function selectCurrentStepId(state: OnboardingStore): OnboardingStepId {
  return state.currentStepId;
}

/**
 * Selector: Get all steps
 */
export function selectSteps(state: OnboardingStore): OnboardingStep[] {
  return state.steps;
}

/**
 * Selector: Get onboarding answers
 */
export function selectAnswers(state: OnboardingStore): OnboardingAnswers {
  return state.answers;
}

/**
 * Selector: Get whether onboarding is complete
 */
export function selectOnboardingComplete(state: OnboardingStore): boolean {
  return state.onboardingComplete;
}







