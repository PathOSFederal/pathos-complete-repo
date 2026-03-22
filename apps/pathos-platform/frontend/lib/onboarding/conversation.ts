/**
 * ============================================================================
 * ONBOARDING CONVERSATION (Day 36 - Advisor-led Conversational Onboarding Mode)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Defines the deterministic conversation flow for onboarding mode. This module
 * provides functions to generate PathAdvisor messages and handle answers for
 * each onboarding step.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Business Logic Layer: Determines what PathAdvisor says at each step
 * - Integration: Used by PathAdvisorPanel when mode="onboarding"
 * - State: Reads from onboardingStore to determine current step
 *
 * KEY CONCEPTS:
 * - Deterministic: No LLM calls, all responses are predefined
 * - Step-based: Each step has a question and expected answer format
 * - Conversational: One question at a time, intimate and friendly tone
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. getCurrentStepMessage(stepId, answers): Returns the PathAdvisor message for current step
 * 2. getStepInputType(stepId): Returns the input type needed (choice chips, text, etc.)
 * 3. getStepOptions(stepId, answers): Returns available options for choice-based steps
 * 4. validateStepAnswer(stepId, value): Validates that answer is appropriate for step
 *
 * CONVERSATION FLOW:
 * Step 1 (welcome): Welcome message, no answer needed
 * Step 2 (persona): Ask about job seeker vs federal employee
 * Step 3 (grade): Ask about target grade band or current grade
 * Step 4 (location): Ask about location and relocation willingness
 * Step 5 (priorities): Ask user to select top priorities (up to 3)
 * Step 6 (summary): Show summary of collected answers, confirm
 * Step 7 (intro): Personalized "how to use PathOS" explanation
 * Step 8 (complete): Completion message, unlock dashboard
 *
 * DESIGN PRINCIPLES:
 * - One question at a time
 * - Short microcopy
 * - Clear "why I am asking" language where useful
 * - Real, authentic, friendly tone (not salesy)
 * - Avoid em dashes in user-facing copy
 */

import type { OnboardingStepId, OnboardingAnswers } from '@/store/onboardingStore';
import type { GradeBandKey, RelocationWillingness } from '@/store/profileStore';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Input type for onboarding step
 */
export type OnboardingInputType = 'none' | 'choice' | 'text' | 'multi-choice';

/**
 * Step option for choice-based inputs
 */
export interface OnboardingStepOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Step message and input configuration
 */
export interface OnboardingStepConfig {
  message: string;
  inputType: OnboardingInputType;
  options?: OnboardingStepOption[];
  placeholder?: string;
  maxSelections?: number;
}

/**
 * ============================================================================
 * STEP CONFIGURATIONS
 * ============================================================================
 */

/**
 * Get the message and input configuration for a step
 */
export function getCurrentStepConfig(stepId: OnboardingStepId, answers: OnboardingAnswers): OnboardingStepConfig {
  if (stepId === 'welcome') {
    return {
      message:
        "Welcome to PathOS. I'm PathAdvisor.\n\n" +
        "I'll help you plan a realistic path into federal service.\n\n" +
        "I'll ask a few quick questions so I can tailor the dashboard to you.",
      inputType: 'none',
    };
  }

  if (stepId === 'persona') {
    return {
      message:
        'First, I need to understand your situation. Are you currently a federal employee, or are you seeking to enter federal service?',
      inputType: 'choice',
      options: [
        { value: 'job_seeker', label: "I'm seeking federal employment", description: 'Looking for my first or next federal job' },
        { value: 'federal_employee', label: "I'm a current federal employee", description: 'Already working in the federal government' },
      ],
    };
  }

  if (stepId === 'grade') {
    // Different question based on persona
    if (answers.persona === 'job_seeker') {
      return {
        message:
          'What grade level are you targeting? This helps me find the right opportunities for you.',
        inputType: 'choice',
        options: [
          { value: 'entry', label: 'Entry level (GS-5 to GS-7)', description: 'Starting your federal career' },
          { value: 'early', label: 'Early career (GS-7 to GS-9)', description: 'Some experience, ready for growth' },
          { value: 'mid', label: 'Mid career (GS-9 to GS-11)', description: 'Established professional' },
          { value: 'senior', label: 'Senior (GS-12 to GS-13)', description: 'Leadership and advanced roles' },
          { value: 'unsure', label: "I'm not sure yet", description: 'Still exploring options' },
        ],
      };
    } else {
      // Federal employee - ask about current grade
      return {
        message: 'What is your current grade level? This helps me understand where you are in your career journey.',
        inputType: 'choice',
        options: [
          { value: 'GS-5', label: 'GS-5' },
          { value: 'GS-6', label: 'GS-6' },
          { value: 'GS-7', label: 'GS-7' },
          { value: 'GS-8', label: 'GS-8' },
          { value: 'GS-9', label: 'GS-9' },
          { value: 'GS-10', label: 'GS-10' },
          { value: 'GS-11', label: 'GS-11' },
          { value: 'GS-12', label: 'GS-12' },
          { value: 'GS-13', label: 'GS-13' },
          { value: 'GS-14', label: 'GS-14' },
          { value: 'GS-15', label: 'GS-15' },
        ],
      };
    }
  }

  if (stepId === 'location') {
    return {
      message:
        'How open are you to relocating for a federal position? This helps me filter opportunities that match your preferences.',
      inputType: 'choice',
      options: [
        { value: 'stay_local', label: 'Stay local', description: 'Not interested in relocating' },
        { value: 'nearby_regions', label: 'Nearby regions', description: 'Open to nearby cities or states' },
        { value: 'open_conus', label: 'Open CONUS', description: 'Willing to relocate anywhere in the continental US' },
        { value: 'open_conus_oconus', label: 'Open CONUS + OCONUS', description: 'Willing to relocate anywhere, including overseas' },
      ],
    };
  }

  if (stepId === 'priorities') {
    return {
      message:
        'What matters most to you in your career? Select up to 3 priorities that guide your job search.',
      inputType: 'multi-choice',
      options: [
        { value: 'Higher pay', label: 'Higher pay' },
        { value: 'Work-life balance', label: 'Work-life balance' },
        { value: 'Remote / hybrid', label: 'Remote / hybrid work' },
        { value: 'Job security', label: 'Job security' },
        { value: 'Career growth', label: 'Career growth' },
        { value: 'Mission / impact', label: 'Mission / impact' },
        { value: 'Benefits', label: 'Benefits' },
        { value: 'Location', label: 'Location' },
      ],
      maxSelections: 3,
    };
  }

  if (stepId === 'summary') {
    // Build summary message from collected answers
    const summaryParts: string[] = [];
    summaryParts.push("Great! Here's what I learned about you:");

    if (answers.persona === 'job_seeker') {
      summaryParts.push('- You are seeking federal employment');
      if (answers.gradeBand) {
        const gradeLabels: Record<GradeBandKey, string> = {
          entry: 'Entry level (GS-5 to GS-7)',
          early: 'Early career (GS-7 to GS-9)',
          mid: 'Mid career (GS-9 to GS-11)',
          senior: 'Senior (GS-12 to GS-13)',
          unsure: 'Not sure yet',
          custom: 'Custom grade range',
        };
        summaryParts.push('- Target grade: ' + (gradeLabels[answers.gradeBand] || 'Not specified'));
      }
    } else {
      summaryParts.push('- You are a current federal employee');
      if (answers.currentGrade) {
        summaryParts.push('- Current grade: ' + answers.currentGrade);
      }
    }

    if (answers.relocationWillingness) {
      const relocationLabels: Record<RelocationWillingness, string> = {
        stay_local: 'Stay local',
        nearby_regions: 'Nearby regions',
        open_conus: 'Open CONUS',
        open_conus_oconus: 'Open CONUS + OCONUS',
        no_preference: 'No preference',
      };
      summaryParts.push('- Relocation: ' + (relocationLabels[answers.relocationWillingness] || 'Not specified'));
    }

    if (answers.priorities && answers.priorities.length > 0) {
      summaryParts.push('- Priorities: ' + answers.priorities.join(', '));
    }

    summaryParts.push('\nDoes this look correct?');

    return {
      message: summaryParts.join('\n'),
      inputType: 'choice',
      options: [
        { value: 'confirm', label: "Yes, that's correct" },
        { value: 'edit', label: 'I want to change something' },
      ],
    };
  }

  if (stepId === 'intro') {
    // Personalized intro based on answers
    // Build personalized greeting based on persona
    let introMessage = '';
    if (answers.persona === 'job_seeker') {
      introMessage = "Perfect! Based on what you've shared, I've tailored PathOS for you.\n\n";
    } else {
      introMessage = "Perfect! Your dashboard is now personalized for your federal career journey.\n\n";
    }

    // Add location context if available
    if (answers.relocationWillingness) {
      const locationContext = answers.relocationWillingness === 'stay_local'
        ? "You prefer to stay local"
        : answers.relocationWillingness === 'open_conus' || answers.relocationWillingness === 'open_conus_oconus'
        ? "You're open to relocating"
        : "You're open to nearby opportunities";
      introMessage += locationContext + ", and ";
    }

    // Add priorities context if available
    if (answers.priorities && answers.priorities.length > 0) {
      introMessage += "you're focused on " + answers.priorities.slice(0, 2).join(' and ');
      if (answers.priorities.length > 2) {
        introMessage += " (and " + answers.priorities[2] + ")";
      }
      introMessage += ".\n\n";
    } else {
      introMessage += ".\n\n";
    }

    introMessage += "Here's how to use PathOS:\n\n";
    introMessage += "• Dashboard: Your personalized hub with insights and recommendations\n";
    introMessage += "• Job Search: Find and save federal job opportunities\n";
    introMessage += "• Resume Builder: Create and tailor your resume for specific positions\n\n";
    introMessage += "Example: Try asking me 'Show me jobs in my target grade range' or 'Help me understand my market position'.\n\n";
    introMessage += "Want a quick 60-second tour of the dashboard?";

    return {
      message: introMessage,
      inputType: 'choice',
      options: [
        { value: 'start-tour', label: 'Start tour' },
        { value: 'skip-tour', label: 'Not now' },
      ],
    };
  }

  if (stepId === 'complete') {
    return {
      message: "Wonderful! You're all set. Your dashboard is now unlocked. Welcome to PathOS!",
      inputType: 'none',
    };
  }

  // Default fallback
  return {
    message: "I'm here to help you get started with PathOS.",
    inputType: 'none',
  };
}

/**
 * Validate an answer for a step
 */
export function validateStepAnswer(stepId: OnboardingStepId, value: unknown): boolean {
  if (stepId === 'welcome' || stepId === 'complete') {
    return true; // No validation needed for informational steps
  }

  if (stepId === 'persona') {
    return value === 'job_seeker' || value === 'federal_employee';
  }

  if (stepId === 'grade') {
    return typeof value === 'string' && value.length > 0;
  }

  if (stepId === 'location') {
    // Location step can accept object with location and relocationWillingness
    if (typeof value === 'object' && value !== null) {
      return true;
    }
    return typeof value === 'string' && value.length > 0;
  }

  if (stepId === 'priorities') {
    return Array.isArray(value) && value.length > 0 && value.length <= 3;
  }

  if (stepId === 'summary') {
    return value === 'confirm' || value === 'edit';
  }

  if (stepId === 'intro') {
    return value === 'ready';
  }

  return false;
}







