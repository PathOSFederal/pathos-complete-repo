/**
 * ============================================================================
 * GUIDED USAJOBS INTERACTION STATE MACHINE (Day 44)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Defines the explicit state machine for Guided USAJOBS Mode. This is the
 * canonical map of allowed transitions for "Ask PathAdvisor" click-to-explain.
 *
 * WHY THIS EXISTS:
 * The feature requires an explicit, debuggable interaction lifecycle:
 * IDLE → ARMED → CAPTURING → SELECTING → CAPTURED → ANALYZING →
 * RESPONDING → COMPLETE.
 *
 * This module provides:
 * - Explicit state and event definitions
 * - A pure transition function (easy to unit test)
 * - Human-readable reasons for debugging and logs
 *
 * @version Day 44 - Guided USAJOBS Click-to-Explain v1
 * ============================================================================
 */

/**
 * All explicit interaction states for Guided USAJOBS Mode.
 */
export type GuidedUsaJobsInteractionState =
  | 'IDLE'
  | 'ARMED'
  | 'CAPTURING'
  | 'SELECTING'
  | 'CAPTURED'
  | 'ANALYZING'
  | 'RESPONDING'
  | 'COMPLETE'
  | 'ERROR';

/**
 * State transition events for Guided USAJOBS Mode.
 */
export type GuidedUsaJobsEvent =
  | 'ARM'
  | 'DISARM'
  | 'START_CAPTURE'
  | 'START_SELECTING'
  | 'CAPTURE_REGION'
  | 'CAPTURE_READY'
  | 'START_ANALYSIS'
  | 'RENDER_RESPONSE'
  | 'COMPLETE'
  | 'CAPTURE_FAILED'
  | 'RESET';

/**
 * Transition result with debuggable details.
 */
export interface GuidedUsaJobsTransitionResult {
  /** Whether the transition is valid */
  allowed: boolean;
  /** The next state (or current state if not allowed) */
  nextState: GuidedUsaJobsInteractionState;
  /** Human-readable reason for the transition decision */
  reason: string;
}

/**
 * Get the next interaction state for Guided USAJOBS.
 *
 * WHY THIS IS PURE:
 * This is a pure function with no side effects so unit tests can verify all
 * transitions without mocking stores or UI.
 */
export function getGuidedUsaJobsNextState(
  currentState: GuidedUsaJobsInteractionState,
  event: GuidedUsaJobsEvent,
): GuidedUsaJobsTransitionResult {
  // ---------------------------------------------------------------------------
  // Global overrides (valid from any state)
  // ---------------------------------------------------------------------------
  if (event === 'RESET') {
    return {
      allowed: true,
      nextState: 'IDLE',
      reason: 'Reset returns the interaction to IDLE.',
    };
  }

  if (event === 'DISARM') {
    return {
      allowed: true,
      nextState: 'IDLE',
      reason: 'Disarm returns the interaction to IDLE.',
    };
  }

  // ---------------------------------------------------------------------------
  // State-specific transitions
  // ---------------------------------------------------------------------------
  if (currentState === 'IDLE') {
    if (event === 'ARM') {
      return {
        allowed: true,
        nextState: 'ARMED',
        reason: 'Ask PathAdvisor enabled, ready for selection.',
      };
    }
  }

  if (currentState === 'ARMED') {
    if (event === 'START_CAPTURE') {
      return {
        allowed: true,
        nextState: 'CAPTURING',
        reason: 'Screen capture started for USAJOBS selection.',
      };
    }
    if (event === 'ARM') {
      return {
        allowed: true,
        nextState: 'ARMED',
        reason: 'Already armed; no state change.',
      };
    }
  }

  if (currentState === 'CAPTURING') {
    if (event === 'START_SELECTING') {
      return {
        allowed: true,
        nextState: 'SELECTING',
        reason: 'User is selecting a region to explain.',
      };
    }
  }

  if (currentState === 'SELECTING') {
    if (event === 'CAPTURE_REGION') {
      return {
        allowed: true,
        nextState: 'CAPTURED',
        reason: 'User completed region selection.',
      };
    }
    if (event === 'CAPTURE_READY') {
      return {
        allowed: true,
        nextState: 'CAPTURING',
        reason: 'Selection canceled; ready for next region.',
      };
    }
  }

  if (currentState === 'CAPTURED') {
    if (event === 'START_ANALYSIS') {
      return {
        allowed: true,
        nextState: 'ANALYZING',
        reason: 'Screenshot sent to PathAdvisor context.',
      };
    }
  }

  if (currentState === 'ANALYZING') {
    if (event === 'RENDER_RESPONSE') {
      return {
        allowed: true,
        nextState: 'RESPONDING',
        reason: 'Guidance prepared for display.',
      };
    }
  }

  if (currentState === 'RESPONDING') {
    if (event === 'COMPLETE') {
      return {
        allowed: true,
        nextState: 'COMPLETE',
        reason: 'Response rendered; session complete.',
      };
    }
  }

  if (currentState === 'COMPLETE') {
    if (event === 'ARM') {
      return {
        allowed: true,
        nextState: 'ARMED',
        reason: 'User re-armed Ask PathAdvisor.',
      };
    }
  }

  if (currentState === 'ERROR') {
    if (event === 'ARM') {
      return {
        allowed: true,
        nextState: 'ARMED',
        reason: 'User re-armed after an error.',
      };
    }
  }

  if (event === 'CAPTURE_FAILED') {
    return {
      allowed: true,
      nextState: 'ERROR',
      reason: 'Screen capture failed or permission was denied.',
    };
  }

  // ---------------------------------------------------------------------------
  // Default: transition is not allowed
  // ---------------------------------------------------------------------------
  return {
    allowed: false,
    nextState: currentState,
    reason: 'Transition not allowed from current state.',
  };
}
