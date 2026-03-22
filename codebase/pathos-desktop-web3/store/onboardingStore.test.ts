/**
 * ============================================================================
 * ONBOARDING STORE TESTS (Day 36)
 * ============================================================================
 *
 * Tests for onboarding store initialization, step transitions, answer storage,
 * profile mapping, and completion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from './onboardingStore';
import { useProfileStore } from './profileStore';

describe('onboardingStore', function () {
  beforeEach(function () {
    // Clear localStorage before each test
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    // Reset stores to initial state
    useOnboardingStore.getState().restartOnboarding();
    useOnboardingStore.setState({
      isOnboardingMode: false,
      currentStepId: 'welcome',
      answers: {},
      onboardingComplete: false,
      steps: [
        { id: 'welcome', label: 'Welcome', isComplete: false },
        { id: 'persona', label: 'Persona', isComplete: false },
        { id: 'grade', label: 'Grade', isComplete: false },
        { id: 'location', label: 'Location', isComplete: false },
        { id: 'priorities', label: 'Priorities', isComplete: false },
        { id: 'summary', label: 'Summary', isComplete: false },
        { id: 'intro', label: 'Introduction', isComplete: false },
        { id: 'complete', label: 'Complete', isComplete: false },
      ],
    });
  });

  describe('initialization and hydration', function () {
    it('should initialize with default state', function () {
      const state = useOnboardingStore.getState();
      expect(state.isOnboardingMode).toBe(false);
      expect(state.currentStepId).toBe('welcome');
      expect(state.answers).toEqual({});
      expect(state.onboardingComplete).toBe(false);
    });

    it('should hydrate from storage', function () {
      // Skip test if localStorage is not available (SSR/Node environment)
      if (typeof window === 'undefined') {
        return;
      }

      // Save state to storage
      localStorage.setItem(
        'pathos-onboarding-state',
        JSON.stringify({
          isOnboardingMode: true,
          currentStepId: 'persona',
          answers: { persona: 'job_seeker' },
          onboardingComplete: false,
          steps: [
            { id: 'welcome', label: 'Welcome', isComplete: true },
            { id: 'persona', label: 'Persona', isComplete: false },
            { id: 'grade', label: 'Grade', isComplete: false },
            { id: 'location', label: 'Location', isComplete: false },
            { id: 'priorities', label: 'Priorities', isComplete: false },
            { id: 'summary', label: 'Summary', isComplete: false },
            { id: 'intro', label: 'Introduction', isComplete: false },
            { id: 'complete', label: 'Complete', isComplete: false },
          ],
        })
      );

      // Create a fresh store instance by resetting state first
      useOnboardingStore.setState({
        isOnboardingMode: false,
        currentStepId: 'welcome',
        answers: {},
        onboardingComplete: false,
        steps: [],
      });

      // Now hydrate
      useOnboardingStore.getState().hydrateFromStorage();

      const state = useOnboardingStore.getState();
      expect(state.isOnboardingMode).toBe(true);
      expect(state.currentStepId).toBe('persona');
      expect(state.answers.persona).toBe('job_seeker');
    });
  });

  describe('step transitions', function () {
    it('should start onboarding and set isOnboardingMode to true', function () {
      useOnboardingStore.getState().startOnboarding();
      const state = useOnboardingStore.getState();
      expect(state.isOnboardingMode).toBe(true);
      expect(state.currentStepId).toBe('welcome');
    });

    it('should advance to next step', function () {
      useOnboardingStore.getState().startOnboarding();
      useOnboardingStore.getState().goNext();
      const state = useOnboardingStore.getState();
      expect(state.currentStepId).toBe('persona');
    });

    it('should go back to previous step', function () {
      useOnboardingStore.getState().startOnboarding();
      useOnboardingStore.getState().goNext(); // welcome -> persona
      useOnboardingStore.getState().goNext(); // persona -> grade
      useOnboardingStore.getState().goBack(); // grade -> persona
      const state = useOnboardingStore.getState();
      expect(state.currentStepId).toBe('persona');
    });

    it('should not go back from first step', function () {
      useOnboardingStore.getState().startOnboarding();
      useOnboardingStore.getState().goBack();
      const state = useOnboardingStore.getState();
      expect(state.currentStepId).toBe('welcome'); // Still on welcome
    });
  });

  describe('answer storage', function () {
    it('should store answer for persona step', function () {
      useOnboardingStore.getState().startOnboarding();
      useOnboardingStore.getState().goNext(); // Move to persona step
      useOnboardingStore.getState().answerCurrentStep('job_seeker');
      const state = useOnboardingStore.getState();
      expect(state.answers.persona).toBe('job_seeker');
    });

    it('should mark step as complete after answering', function () {
      useOnboardingStore.getState().startOnboarding();
      useOnboardingStore.getState().goNext(); // Move to persona step
      useOnboardingStore.getState().answerCurrentStep('job_seeker');
      const state = useOnboardingStore.getState();
      const personaStep = state.steps.find(function (step) {
        return step.id === 'persona';
      });
      expect(personaStep !== undefined && personaStep.isComplete).toBe(true);
    });

    it('should store priorities as array', function () {
      useOnboardingStore.getState().startOnboarding();
      // Set current step to priorities (answerCurrentStep checks currentStepId)
      useOnboardingStore.setState({ currentStepId: 'priorities' });
      const priorities = ['Higher pay', 'Work-life balance'];
      useOnboardingStore.getState().answerCurrentStep(priorities);
      const state = useOnboardingStore.getState();
      expect(Array.isArray(state.answers.priorities)).toBe(true);
      if (state.answers.priorities) {
        expect(state.answers.priorities.length).toBe(2);
        expect(state.answers.priorities[0]).toBe('Higher pay');
        expect(state.answers.priorities[1]).toBe('Work-life balance');
      }
    });
  });

  describe('completion', function () {
    it('should complete onboarding and set onboardingComplete to true', function () {
      useOnboardingStore.getState().startOnboarding();
      useOnboardingStore.getState().completeOnboarding();
      const state = useOnboardingStore.getState();
      expect(state.onboardingComplete).toBe(true);
      expect(state.isOnboardingMode).toBe(false);
      expect(state.currentStepId).toBe('complete');
    });

    it('should mark profile as complete in profileStore when onboarding completes', function () {
      useOnboardingStore.getState().startOnboarding();
      useOnboardingStore.getState().completeOnboarding();
      const profileState = useProfileStore.getState();
      expect(profileState.isOnboardingComplete).toBe(true);
      expect(profileState.profile.isComplete).toBe(true);
    });
  });

  describe('restart', function () {
    it('should restart onboarding and clear answers', function () {
      useOnboardingStore.getState().startOnboarding();
      useOnboardingStore.getState().goNext(); // Move to persona
      useOnboardingStore.getState().answerCurrentStep('job_seeker');
      useOnboardingStore.getState().restartOnboarding();

      const state = useOnboardingStore.getState();
      expect(state.isOnboardingMode).toBe(true);
      expect(state.currentStepId).toBe('welcome');
      expect(state.answers).toEqual({});
      expect(state.onboardingComplete).toBe(false);
    });
  });
});







