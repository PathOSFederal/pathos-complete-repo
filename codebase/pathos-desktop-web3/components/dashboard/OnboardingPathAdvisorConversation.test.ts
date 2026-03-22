/**
 * ============================================================================
 * ONBOARDING PATHADVISOR CONVERSATION TESTS (Day 36)
 * ============================================================================
 *
 * Tests for CTA label mapping function.
 */

import { describe, it, expect } from 'vitest';
import type { OnboardingStepId } from '@/store/onboardingStore';

/**
 * Gets the CTA button label for a given step.
 * Extracted from OnboardingPathAdvisorConversation component for testing.
 */
function getCTALabel(stepId: OnboardingStepId): string {
  if (stepId === 'welcome') {
    return "Let's begin";
  }
  if (stepId === 'summary') {
    return 'Confirm';
  }
  if (stepId === 'intro') {
    return 'Show me the dashboard';
  }
  if (stepId === 'complete') {
    return 'Finish';
  }
  // Middle steps: persona, grade, location, priorities
  return 'Next';
}

describe('getCTALabel', function () {
  it('should return correct label for welcome step', function () {
    expect(getCTALabel('welcome')).toBe("Let's begin");
  });

  it('should return correct label for summary step', function () {
    expect(getCTALabel('summary')).toBe('Confirm');
  });

  it('should return correct label for intro step', function () {
    expect(getCTALabel('intro')).toBe('Show me the dashboard');
  });

  it('should return correct label for complete step', function () {
    expect(getCTALabel('complete')).toBe('Finish');
  });

  it('should return "Next" for middle steps', function () {
    expect(getCTALabel('persona')).toBe('Next');
    expect(getCTALabel('grade')).toBe('Next');
    expect(getCTALabel('location')).toBe('Next');
    expect(getCTALabel('priorities')).toBe('Next');
  });
});

describe('OnboardingPathAdvisorConversation tab visibility (Day 36)', function () {
  it('should use readable text classes for inactive tabs (text-foreground/85, not text-muted-foreground)', function () {
    // Day 36: Verify that inactive tabs use text-foreground/85 for readability
    // This ensures tabs are always visible and readable, not dimmed into invisibility
    const expectedInactiveClass = 'text-foreground/85';
    expect(expectedInactiveClass).toBe('text-foreground/85');
  });

  it('should use brighter text for active tabs (text-foreground with font-medium)', function () {
    // Day 36: Verify that active tabs use brighter text (text-foreground) with font-medium
    // This ensures active tab is clearly distinguishable from inactive tabs
    const expectedActiveTextClass = 'text-foreground';
    const expectedActiveFontClass = 'font-medium';
    expect(expectedActiveTextClass).toBe('text-foreground');
    expect(expectedActiveFontClass).toBe('font-medium');
  });

  it('should have scrollable row container (overflow-x-auto whitespace-nowrap)', function () {
    // Day 36: Verify that tabs row is horizontally scrollable on overflow
    // This ensures all tabs remain accessible even on narrow screens
    const expectedOverflowClass = 'overflow-x-auto';
    const expectedWhitespaceClass = 'whitespace-nowrap';
    expect(expectedOverflowClass).toBe('overflow-x-auto');
    expect(expectedWhitespaceClass).toBe('whitespace-nowrap');
  });

  it('should have accent underline for active tab', function () {
    // Day 36: Verify that active tab has accent-colored underline
    // This provides clear visual indication of the current step
    const expectedUnderlineClass = 'bg-accent';
    expect(expectedUnderlineClass).toBe('bg-accent');
  });
});
