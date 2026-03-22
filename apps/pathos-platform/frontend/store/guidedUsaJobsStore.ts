/**
 * ============================================================================
 * GUIDED USAJOBS STORE (Day 44)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Zustand store for Guided USAJOBS Mode. Owns interaction state machine,
 * ephemeral screenshot metadata, and persisted goal context for tailoring
 * PathAdvisor explanations.
 *
 * ARCHITECTURE:
 * - Explicit state machine (see lib/guided-usajobs/stateMachine.ts)
 * - Local-only persistence of goal context
 * - No screenshot persistence (memory-only)
 *
 * @version Day 44 - Guided USAJOBS Click-to-Explain v1
 * ============================================================================
 */

import { create } from 'zustand';
import { storageGetJSON, storageSetJSON } from '@/lib/storage';
import { GUIDED_USAJOBS_GOALS_STORAGE_KEY } from '@/lib/storage-keys';
import {
  getGuidedUsaJobsNextState,
  type GuidedUsaJobsEvent,
  type GuidedUsaJobsInteractionState,
} from '@/lib/guided-usajobs/stateMachine';
import type {
  GuidedUsaJobsContextState,
  GuidedUsaJobsGoalContext,
  GuidedUsaJobsRegion,
  RelocationTolerance,
  ServicePreference,
} from '@/lib/guided-usajobs/types';
import type { GuidedUsaJobsResponse, GuidedUsaJobsTopic } from '@/lib/guided-usajobs/responseBuilder';


/**
 * Ephemeral screenshot metadata (in-memory only).
 */
export interface GuidedUsaJobsScreenshot {
  dataUrl: string;
  wasBlocked: boolean;
  capturedAt: string;
}

/**
 * Embed status for the USAJOBS iframe.
 */
export type GuidedUsaJobsEmbedStatus = 'loading' | 'ready' | 'blocked';

/**
 * Transition log entry for debugging.
 */
export interface GuidedUsaJobsTransitionLog {
  from: GuidedUsaJobsInteractionState;
  to: GuidedUsaJobsInteractionState;
  event: GuidedUsaJobsEvent;
  reason: string;
  at: string;
}

interface GuidedUsaJobsState {
  // ---------------------------------------------------------------------------
  // Interaction state machine
  // ---------------------------------------------------------------------------
  interactionState: GuidedUsaJobsInteractionState;
  askModeEnabled: boolean;
  transitionLog: GuidedUsaJobsTransitionLog[];
  lastTransition: GuidedUsaJobsTransitionLog | null;

  // ---------------------------------------------------------------------------
  // Selection and screenshot context
  // ---------------------------------------------------------------------------
  selectedRegion: GuidedUsaJobsRegion | null;
  screenshot: GuidedUsaJobsScreenshot | null;
  response: GuidedUsaJobsResponse | null;
  responseTopic: GuidedUsaJobsTopic;
  contextState: GuidedUsaJobsContextState;

  // ---------------------------------------------------------------------------
  // Embed state
  // ---------------------------------------------------------------------------
  embedStatus: GuidedUsaJobsEmbedStatus;

  // ---------------------------------------------------------------------------
  // Goal tailoring context (persisted locally)
  // ---------------------------------------------------------------------------
  goals: GuidedUsaJobsGoalContext;
}

interface GuidedUsaJobsActions {
  /**
   * Apply a state machine event and log the transition.
   */
  applyEvent: (event: GuidedUsaJobsEvent, reasonOverride?: string) => void;

  /**
   * Enable or disable Ask PathAdvisor mode (flag only).
   * State transitions must be applied separately via applyEvent.
   */
  setAskModeEnabled: (enabled: boolean) => void;

  /**
   * Store a newly selected region.
   */
  setSelectedRegion: (region: GuidedUsaJobsRegion | null) => void;

  /**
   * Store ephemeral screenshot metadata.
   */
  setScreenshot: (screenshot: GuidedUsaJobsScreenshot | null) => void;

  /**
   * Store the latest PathAdvisor response.
   */
  setResponse: (response: GuidedUsaJobsResponse | null) => void;

  /**
   * Set the response topic (used for refinement).
   */
  setResponseTopic: (topic: GuidedUsaJobsTopic) => void;

  /**
   * Set the manual page context state for guidance.
   */
  setContextState: (context: GuidedUsaJobsContextState) => void;

  /**
   * Set the iframe embed status.
   */
  setEmbedStatus: (status: GuidedUsaJobsEmbedStatus) => void;

  /**
   * Update goal context fields (persisted to localStorage).
   */
  setTargetGsLevel: (value: string) => void;
  setTimelineGoal: (value: string) => void;
  setRelocationTolerance: (value: RelocationTolerance) => void;
  setServicePreference: (value: ServicePreference) => void;

  /**
   * Reset the session (keeps persisted goals).
   */
  resetSession: () => void;
}

type GuidedUsaJobsStore = GuidedUsaJobsState & GuidedUsaJobsActions;

const DEFAULT_GOALS: GuidedUsaJobsGoalContext = {
  targetGsLevel: 'GS-11',
  timelineGoal: 'Apply within 6 months',
  relocationTolerance: 'medium',
  servicePreference: 'no-preference',
};

/**
 * SSR-safe hydration of goal context.
 */
function loadGoalsFromStorage(): GuidedUsaJobsGoalContext {
  const stored = storageGetJSON<GuidedUsaJobsGoalContext>(
    GUIDED_USAJOBS_GOALS_STORAGE_KEY,
    DEFAULT_GOALS,
  );

  return {
    targetGsLevel: stored.targetGsLevel,
    timelineGoal: stored.timelineGoal,
    relocationTolerance: stored.relocationTolerance,
    servicePreference: stored.servicePreference,
  };
}

/**
 * Persist goal context to localStorage.
 */
function persistGoals(goals: GuidedUsaJobsGoalContext): void {
  storageSetJSON(GUIDED_USAJOBS_GOALS_STORAGE_KEY, goals);
}

export const useGuidedUsaJobsStore = create<GuidedUsaJobsStore>(function (set, get) {
  const initialGoals = loadGoalsFromStorage();

  return {
    // -----------------------------------------------------------------------
    // State machine
    // -----------------------------------------------------------------------
    interactionState: 'IDLE',
    askModeEnabled: false,
    transitionLog: [],
    lastTransition: null,

    // -----------------------------------------------------------------------
    // Selection + response
    // -----------------------------------------------------------------------
    selectedRegion: null,
    screenshot: null,
    response: null,
    responseTopic: 'generic',
    contextState: 'UNKNOWN',

    // -----------------------------------------------------------------------
    // Embed status
    // -----------------------------------------------------------------------
    embedStatus: 'loading',

    // -----------------------------------------------------------------------
    // Goal context
    // -----------------------------------------------------------------------
    goals: initialGoals,

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    applyEvent: function (event, reasonOverride) {
      const currentState = get().interactionState;
      const transition = getGuidedUsaJobsNextState(currentState, event);

      const reason = reasonOverride ? reasonOverride : transition.reason;
      const logEntry: GuidedUsaJobsTransitionLog = {
        from: currentState,
        to: transition.nextState,
        event: event,
        reason: reason,
        at: new Date().toISOString(),
      };

      const nextLog = get().transitionLog.concat([logEntry]);

      set({
        interactionState: transition.nextState,
        lastTransition: logEntry,
        transitionLog: nextLog,
      });
    },

    setAskModeEnabled: function (enabled) {
      set({
        askModeEnabled: enabled,
      });
    },

    setSelectedRegion: function (region) {
      set({
        selectedRegion: region,
      });
    },

    setScreenshot: function (screenshot) {
      set({
        screenshot: screenshot,
      });
    },

    setResponse: function (response) {
      set({
        response: response,
      });
    },

    setResponseTopic: function (topic) {
      set({
        responseTopic: topic,
      });
    },

    setContextState: function (context) {
      set({
        contextState: context,
      });
    },

    setEmbedStatus: function (status) {
      set({
        embedStatus: status,
      });
    },

    setTargetGsLevel: function (value) {
      const current = get().goals;
      const nextGoals: GuidedUsaJobsGoalContext = {
        targetGsLevel: value,
        timelineGoal: current.timelineGoal,
        relocationTolerance: current.relocationTolerance,
        servicePreference: current.servicePreference,
      };
      persistGoals(nextGoals);
      set({ goals: nextGoals });
    },

    setTimelineGoal: function (value) {
      const current = get().goals;
      const nextGoals: GuidedUsaJobsGoalContext = {
        targetGsLevel: current.targetGsLevel,
        timelineGoal: value,
        relocationTolerance: current.relocationTolerance,
        servicePreference: current.servicePreference,
      };
      persistGoals(nextGoals);
      set({ goals: nextGoals });
    },

    setRelocationTolerance: function (value) {
      const current = get().goals;
      const nextGoals: GuidedUsaJobsGoalContext = {
        targetGsLevel: current.targetGsLevel,
        timelineGoal: current.timelineGoal,
        relocationTolerance: value,
        servicePreference: current.servicePreference,
      };
      persistGoals(nextGoals);
      set({ goals: nextGoals });
    },

    setServicePreference: function (value) {
      const current = get().goals;
      const nextGoals: GuidedUsaJobsGoalContext = {
        targetGsLevel: current.targetGsLevel,
        timelineGoal: current.timelineGoal,
        relocationTolerance: current.relocationTolerance,
        servicePreference: value,
      };
      persistGoals(nextGoals);
      set({ goals: nextGoals });
    },

    resetSession: function () {
      set({
        interactionState: 'IDLE',
        askModeEnabled: false,
        selectedRegion: null,
        screenshot: null,
        response: null,
        responseTopic: 'generic',
        contextState: 'UNKNOWN',
        transitionLog: [],
        lastTransition: null,
      });
    },
  };
});

export type {
  GuidedUsaJobsStore,
  GuidedUsaJobsGoalContext,
  RelocationTolerance,
  ServicePreference,
  GuidedUsaJobsContextState,
  GuidedUsaJobsRegion,
};
