/**
 * ============================================================================
 * GUIDED TOUR STORE TESTS (Day 36)
 * ============================================================================
 *
 * Tests for guidedTourStore covering:
 * - State initialization
 * - Step transitions (start, next, prev, skip, complete)
 * - Persistence (hydrate, save)
 * - Reset functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGuidedTourStore } from './guidedTourStore';
import { GUIDED_TOUR_STORAGE_KEY } from '@/lib/storage-keys';

// Setup/teardown
beforeEach(function () {
  // Clear localStorage before each test
  if (typeof window !== 'undefined') {
    localStorage.clear();
  }
  
  // Reset store to initial state
  useGuidedTourStore.setState({
    isTourActive: false,
    stepIndex: 0,
    hasSeenTour: false,
    steps: useGuidedTourStore.getState().steps, // Keep steps from store
  });
});

describe('guidedTourStore', function () {
  describe('initialization', function () {
    it('should initialize with default state', function () {
      const state = useGuidedTourStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.stepIndex).toBe(0);
      expect(state.hasSeenTour).toBe(false);
      expect(state.steps.length).toBeGreaterThan(0);
    });
  });

  describe('startTour', function () {
    it('should set isTourActive to true and stepIndex to 0', function () {
      useGuidedTourStore.getState().startTour();
      const state = useGuidedTourStore.getState();
      expect(state.isTourActive).toBe(true);
      expect(state.stepIndex).toBe(0);
    });

    it('should save state to localStorage', function () {
      if (typeof window === 'undefined') {
        return; // Skip test if window is not available
      }
      useGuidedTourStore.getState().startTour();
      const stored = localStorage.getItem(GUIDED_TOUR_STORAGE_KEY);
      expect(stored).not.toBeNull();
      if (stored) {
        const parsed = JSON.parse(stored);
        // Should persist hasSeenTour (not isTourActive or stepIndex)
        expect(typeof parsed.hasSeenTour).toBe('boolean');
      }
    });
  });

  describe('nextStep', function () {
    it('should advance to next step when not at last step', function () {
      useGuidedTourStore.getState().startTour();
      const initialState = useGuidedTourStore.getState();
      const initialStepIndex = initialState.stepIndex;

      useGuidedTourStore.getState().nextStep();

      const newState = useGuidedTourStore.getState();
      expect(newState.stepIndex).toBe(initialStepIndex + 1);
    });

    it('should complete tour when at last step', function () {
      useGuidedTourStore.getState().startTour();
      const steps = useGuidedTourStore.getState().steps;
      // Move to last step
      useGuidedTourStore.setState({ stepIndex: steps.length - 1 });

      useGuidedTourStore.getState().nextStep();

      const state = useGuidedTourStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.stepIndex).toBe(0);
      expect(state.hasSeenTour).toBe(true);
    });
  });

  describe('prevStep', function () {
    it('should go back to previous step when not at first step', function () {
      useGuidedTourStore.getState().startTour();
      useGuidedTourStore.setState({ stepIndex: 2 });

      useGuidedTourStore.getState().prevStep();

      const state = useGuidedTourStore.getState();
      expect(state.stepIndex).toBe(1);
    });

    it('should not go back when at first step', function () {
      useGuidedTourStore.getState().startTour();
      useGuidedTourStore.setState({ stepIndex: 0 });

      useGuidedTourStore.getState().prevStep();

      const state = useGuidedTourStore.getState();
      expect(state.stepIndex).toBe(0);
    });
  });

  describe('skipTour', function () {
    it('should exit tour without marking as seen', function () {
      useGuidedTourStore.getState().startTour();
      useGuidedTourStore.setState({ stepIndex: 2 });

      useGuidedTourStore.getState().skipTour();

      const state = useGuidedTourStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.stepIndex).toBe(0);
      expect(state.hasSeenTour).toBe(false); // Should NOT mark as seen when skipping
    });
  });

  describe('completeTour', function () {
    it('should exit tour and mark as seen', function () {
      if (typeof window === 'undefined') {
        return; // Skip test if window is not available
      }
      useGuidedTourStore.getState().startTour();
      useGuidedTourStore.setState({ stepIndex: 2 });

      useGuidedTourStore.getState().completeTour();

      const state = useGuidedTourStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.stepIndex).toBe(0);
      expect(state.hasSeenTour).toBe(true);
    });

    it('should save hasSeenTour to localStorage', function () {
      if (typeof window === 'undefined') {
        return; // Skip test if window is not available
      }
      useGuidedTourStore.getState().startTour();
      useGuidedTourStore.getState().completeTour();

      const stored = localStorage.getItem(GUIDED_TOUR_STORAGE_KEY);
      expect(stored).not.toBeNull();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.hasSeenTour).toBe(true);
      }
    });
  });

  describe('hydrateFromStorage', function () {
    it('should load hasSeenTour from localStorage', function () {
      if (typeof window === 'undefined') {
        return; // Skip test if window is not available
      }
      localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, JSON.stringify({ hasSeenTour: true }));

      useGuidedTourStore.getState().hydrateFromStorage();

      const state = useGuidedTourStore.getState();
      expect(state.hasSeenTour).toBe(true);
    });

    it('should handle missing localStorage gracefully', function () {
      if (typeof window === 'undefined') {
        return; // Skip test if window is not available
      }
      localStorage.removeItem(GUIDED_TOUR_STORAGE_KEY);

      useGuidedTourStore.getState().hydrateFromStorage();

      const state = useGuidedTourStore.getState();
      expect(state.hasSeenTour).toBe(false);
    });

    it('should handle invalid JSON gracefully', function () {
      if (typeof window === 'undefined') {
        return; // Skip test if window is not available
      }
      localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, 'invalid-json');

      // Should not throw
      expect(function () {
        useGuidedTourStore.getState().hydrateFromStorage();
      }).not.toThrow();

      const state = useGuidedTourStore.getState();
      expect(state.hasSeenTour).toBe(false);
    });
  });

  describe('reset', function () {
    it('should reset state to initial values', function () {
      if (typeof window === 'undefined') {
        return; // Skip test if window is not available
      }
      useGuidedTourStore.getState().startTour();
      useGuidedTourStore.setState({ stepIndex: 2, hasSeenTour: true });
      localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, JSON.stringify({ hasSeenTour: true }));

      useGuidedTourStore.getState().reset();

      const state = useGuidedTourStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.stepIndex).toBe(0);
      expect(state.hasSeenTour).toBe(false);
      // Reset should clear localStorage
      expect(localStorage.getItem(GUIDED_TOUR_STORAGE_KEY)).toBeNull();
    });
  });
});







