/**
 * ============================================================================
 * ONBOARDING PATHADVISOR CONVERSATION (Day 36 - Advisor-led Conversational Onboarding Mode)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides the onboarding conversation UI within PathAdvisorPanel. This component
 * renders the deterministic conversation flow with step-by-step questions and
 * answer inputs (choice chips, multi-select, etc.).
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - UI Layer: Onboarding conversation component
 * - Integration: Used within PathAdvisorPanel when mode="onboarding"
 * - State: Reads from onboardingStore, updates via store actions
 *
 * KEY CONCEPTS:
 * - Step-based conversation: One question at a time
 * - Choice inputs: Quick choice chips for discrete answers
 * - Progress indicator: Shows onboarding progress checklist
 * - Answer handling: Calls onboardingStore.answerCurrentStep() and goNext()
 *
 * HOW IT WORKS:
 * 1. Reads currentStepId and answers from onboardingStore
 * 2. Gets step configuration from getCurrentStepConfig()
 * 3. Renders PathAdvisor message for current step
 * 4. Renders appropriate input (choice chips, multi-select, etc.)
 * 5. On answer, calls answerCurrentStep() then goNext()
 * 6. Shows progress checklist with current step highlighted
 *
 * DESIGN PRINCIPLES:
 * - One question at a time
 * - Clear, friendly microcopy
 * - Quick choice chips for fast responses
 * - Progress visible but not overwhelming
 */

'use client';

import { useRef } from 'react';
import { useOnboardingStore, selectCurrentStepId, selectAnswers, selectSteps } from '@/store/onboardingStore';
import type { OnboardingStepId } from '@/store/onboardingStore';
import { getCurrentStepConfig } from '@/lib/onboarding/conversation';
import type { RelocationWillingness } from '@/store/profileStore';
import { useGuidedTourStore } from '@/store/guidedTourStore';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradeSelector, type GradeSelectorRef } from '@/components/onboarding/grade-selector';
import type { GradeBandKey } from '@/lib/api/profile';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { openPathAdvisor } from '@/lib/pathadvisor/openPathAdvisor';
// Day 43: Import anchor system for setting onboarding anchor (right rail context)
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { buildAnchorId, normalizeSourceLabel, type PathAdvisorAnchor } from '@/lib/pathadvisor/anchors';

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Gets the CTA button label for a given step.
 * Maps step IDs to appropriate button labels for better microcopy.
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

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function OnboardingPathAdvisorConversation() {
  const currentStepId = useOnboardingStore(selectCurrentStepId);
  const answers = useOnboardingStore(selectAnswers);
  const steps = useOnboardingStore(selectSteps);
  const answerCurrentStep = useOnboardingStore(function (state) {
    return state.answerCurrentStep;
  });
  const goNext = useOnboardingStore(function (state) {
    return state.goNext;
  });
  const goBack = useOnboardingStore(function (state) {
    return state.goBack;
  });
  const completeOnboarding = useOnboardingStore(function (state) {
    return state.completeOnboarding;
  });

  // Guided tour store actions
  const startTour = useGuidedTourStore(function (state) {
    return state.startTour;
  });

  // PathAdvisor integration for optional help on grade step
  const advisorContext = useAdvisorContext();

  // Day40: Ref for GradeSelector to restore focus when PathAdvisor closes
  const gradeSelectorRef = useRef<GradeSelectorRef | null>(null);

  // Day40: Ref for scroll container (message area) to normalize scroll before opening PathAdvisor
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const stepConfig = getCurrentStepConfig(currentStepId, answers);
  const currentStepIndex = steps.findIndex(function (step) {
    return step.id === currentStepId;
  });
  const canGoBack = currentStepIndex > 0;

  // Check if we should render the shared GradeSelector component
  // Only for grade step when persona is job_seeker
  const shouldUseGradeSelector = currentStepId === 'grade' && answers.persona === 'job_seeker';
  const currentGradeBand = answers.gradeBand || null;

  /**
   * Handle grade band selection from GradeSelector component
   * Called when user selects a grade band in the shared GradeSelector
   * Day 43: Does NOT auto-advance - user must click "Next" or "Help me choose"
   */
  function handleGradeBandSelect(band: GradeBandKey) {
    answerCurrentStep(band);
    // Do not auto-advance - let user click "Help me choose" or "Next"
  }

  /**
   * Handle "Help me choose" button click for grade step
   * Opens PathAdvisor with a prompt asking for help choosing a grade band
   */
  function handleGradeHelpMeChoose() {
    // Day40: Temporary diagnostic logs to identify scroll container
    console.log('[Day40] onboarding ask clicked', {
      windowScrollY: typeof window !== 'undefined' ? window.scrollY : 0,
      documentElementScrollTop: typeof document !== 'undefined' ? document.documentElement.scrollTop : 0,
      bodyScrollTop: typeof document !== 'undefined' ? document.body.scrollTop : 0,
      scrollContainerScrollTop: scrollContainerRef.current ? scrollContainerRef.current.scrollTop : null,
    });

    // Day40: Log onboarding frame bounds if available
    if (typeof document !== 'undefined') {
      const onboardingFrame = document.querySelector('[data-tour="pathadvisor-panel"]');
      if (onboardingFrame) {
        const rect = onboardingFrame.getBoundingClientRect();
        console.log('[Day40] onboarding frame bounds', {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    }

    // Day40: Normalize scroll BEFORE opening FocusMode
    // Identify the actual scroll container and reset it to top
    // This ensures FocusMode renders correctly regardless of scroll position
    if (scrollContainerRef.current) {
      // Scroll container is the message area div with overflow-y-auto
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    } else if (typeof window !== 'undefined') {
      // Fallback: if no scroll container ref, reset window scroll
      window.scrollTo(0, 0);
    }

    // Day 43: Set dashboard anchor for Focus Mode right rail context
    // Using 'dashboard' source since onboarding helps configure profile/dashboard
    const anchorId = buildAnchorId('dashboard', 'onboarding');
    const normalizedLabel = normalizeSourceLabel('Onboarding - Grade Selection', 'dashboard');
    const anchor: PathAdvisorAnchor = {
      id: anchorId,
      source: 'dashboard',
      sourceId: 'onboarding',
      sourceLabel: normalizedLabel,
      summary: 'Choosing grade band for job search',
      createdAt: Date.now(),
    };
    usePathAdvisorStore.getState().setActiveAnchor(anchor);

    // Day40: Open PathAdvisor on the next frame after scroll normalization
    // This ensures the scroll reset completes before FocusMode renders
    requestAnimationFrame(function () {
      openPathAdvisor({
        intent: 'grade_band_selection_help',
        source: 'onboarding_pathadvisor',
        prompt:
          'I am choosing a grade band for my federal job search. Can you help me understand which level might be right for me based on my experience and goals?',
        openMode: 'expanded',
        closeOverlays: false, // Keep onboarding panel open
        contextFunctions: {
          setContext: advisorContext.setContext,
          setPendingPrompt: advisorContext.setPendingPrompt,
          setIsPanelOpen: advisorContext.setIsPanelOpen,
          setShouldOpenFocusMode: advisorContext.setShouldOpenFocusMode,
          setOnPathAdvisorClose: advisorContext.setOnPathAdvisorClose,
        },
        // Day40: Restore focus to Help me choose button when PathAdvisor closes
        onClose: function () {
          if (gradeSelectorRef.current) {
            gradeSelectorRef.current.restoreFocus();
          }
        },
      });
    });
  }

  /**
   * Handle answering a choice-based step
   */
  function handleChoiceSelect(value: string) {
    if (currentStepId === 'location') {
      // Location step: store relocationWillingness
      answerCurrentStep({ relocationWillingness: value as RelocationWillingness });
      goNext();
    } else if (currentStepId === 'summary') {
      if (value === 'edit') {
        // Go back to first editable step (persona)
        // For now, just go back to persona step
        const personaStepIndex = steps.findIndex(function (step) {
          return step.id === 'persona';
        });
        if (personaStepIndex >= 0) {
          // Set current step to persona - we'll handle this via a direct step jump
          // For now, just go back multiple steps
          // This is a simplification - in a full implementation, we'd want a goToStep action
          goBack();
        }
        return;
      }
      // Confirm summary - proceed to intro
      answerCurrentStep(value);
      goNext();
    } else if (currentStepId === 'intro') {
      // Intro step: handle tour trigger
      answerCurrentStep(value);
      if (value === 'start-tour') {
        // Complete onboarding and start tour
        completeOnboarding();
        // Small delay to ensure onboarding completes before starting tour
        setTimeout(function () {
          startTour();
        }, 100);
      } else {
        // Skip tour - just complete onboarding (don't set hasSeenTour, user can replay later)
        completeOnboarding();
      }
    } else {
      // Standard step: answer and advance
      answerCurrentStep(value);
      goNext();
    }
  }

  /**
   * Handle answering a multi-choice step (priorities)
   */
  function handleMultiChoiceToggle(value: string, selectedValues: string[]) {
    if (selectedValues.includes(value)) {
      // Deselect
      const newValues = selectedValues.filter(function (v) {
        return v !== value;
      });
      answerCurrentStep(newValues);
    } else {
      // Select (up to maxSelections)
      const maxSelections = stepConfig.maxSelections || 3;
      if (selectedValues.length < maxSelections) {
        const newValues = selectedValues.concat([value]);
        answerCurrentStep(newValues);
      }
    }
  }

  /**
   * Handle continue button (for steps with no input or after selection)
   */
  function handleContinue() {
    goNext();
  }

  const currentPriorities = answers.priorities || [];

  return (
    <div className="flex flex-col h-full">
      {/* ================================================================== */}
      {/* PROGRESS CHECKLIST                                                  */}
      {/* Compact progress indicator showing onboarding steps                */}
      {/* Day 36: Fixed invisible tabs - improved contrast for inactive tabs */}
      {/* Required style logic: Active = brighter text + pill + underline,   */}
      {/* Inactive = readable text + hover, Always = scrollable row          */}
      {/* ================================================================== */}
      <div className="mb-4 p-3 rounded-lg border border-white/10 bg-white/3">
        {/* Scrollable row container with proper overflow handling */}
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-hide">
          {steps.map(function (step) {
            const isCurrent = step.id === currentStepId;
            const isComplete = step.isComplete;

            return (
              <div
                key={step.id}
                className={cn(
                  'relative flex-none inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors',
                  // Inactive: readable text (not too dim), hover background
                  !isCurrent
                    ? 'bg-transparent border-transparent text-foreground/85 hover:bg-white/8 hover:text-foreground/95'
                    : '',
                  // Active: brighter text + subtle pill bg + accent underline
                  isCurrent
                    ? 'bg-white/10 border-white/15 text-foreground font-medium'
                    : ''
                )}
              >
                {isComplete ? <Check className="w-3 h-3" /> : null}
                <span>{step.label}</span>

                {/* Active underline - accent color */}
                {isCurrent ? (
                  <div className="absolute left-2 right-2 bottom-0 h-[2px] bg-accent rounded-full" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================== */}
      {/* PATHADVISOR MESSAGE                                                 */}
      {/* Shows the message for the current step                             */}
      {/* Day 36: Added fade-in animation on step change for subtle motion   */}
      {/* Day40: Added ref for scroll normalization before opening PathAdvisor */}
      {/* ================================================================== */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto mb-4">
        {/* Day 36: Improved text contrast - use readable foreground tokens instead of muted */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap animate-in fade-in duration-200 text-foreground/95">
            {stepConfig.message}
          </div>
          {/* Reassurance line for welcome step */}
          {currentStepId === 'welcome' ? (
            <p className="text-xs text-foreground/75 mt-3">
              You can take this at your own pace. You can change these later.
            </p>
          ) : null}
        </div>
      </div>

      {/* ================================================================== */}
      {/* ANSWER INPUT AREA                                                   */}
      {/* Renders appropriate input based on step inputType                  */}
      {/* Day 40 Follow-up: Use shared GradeSelector for grade step          */}
      {/* ================================================================== */}
      <div className="space-y-3">
        {/* Grade step with job_seeker persona: use shared GradeSelector component */}
        {shouldUseGradeSelector ? (
          <GradeSelector
            ref={gradeSelectorRef}
            value={currentGradeBand}
            onChange={handleGradeBandSelect}
            showHelpMeChoose={true}
            onHelpMeChoose={handleGradeHelpMeChoose}
          />
        ) : stepConfig.inputType === 'choice' && stepConfig.options ? (
          <div className="flex flex-col gap-2">
            {stepConfig.options.map(function (option) {
              return (
                <Button
                  key={option.value}
                  variant="outline"
                  className="justify-start text-left h-auto py-3"
                  onClick={function () {
                    handleChoiceSelect(option.value);
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{option.label}</span>
                    {option.description ? (
                      <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
                    ) : null}
                  </div>
                </Button>
              );
            })}
          </div>
        ) : null}

        {stepConfig.inputType === 'multi-choice' && stepConfig.options ? (
          <div className="flex flex-col gap-2">
            {stepConfig.options.map(function (option) {
              const isSelected = currentPriorities.includes(option.value);
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  className="justify-start text-left h-auto py-3"
                  onClick={function () {
                    handleMultiChoiceToggle(option.value, currentPriorities);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {isSelected ? <Check className="w-4 h-4" /> : <div className="w-4 h-4" />}
                    <span>{option.label}</span>
                  </div>
                </Button>
              );
            })}
            {currentPriorities.length > 0 ? (
              <div className="text-xs text-muted-foreground mt-1">
                Selected {currentPriorities.length} of {stepConfig.maxSelections || 3}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ============================================================== */}
        {/* NAVIGATION BUTTONS                                              */}
        {/* Back button (if applicable) and Continue button                */}
        {/* ============================================================== */}
        <div className="flex gap-2 justify-between pt-2">
          {canGoBack ? (
            <Button variant="ghost" onClick={goBack} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <div /> // Spacer
          )}

          {stepConfig.inputType === 'none' ||
          (stepConfig.inputType === 'multi-choice' && currentPriorities.length > 0) ||
          (shouldUseGradeSelector && currentGradeBand !== null) ? (
            <Button
              onClick={handleContinue}
              className={cn(
                'gap-2 transition-all',
                // Day 36: CTA hover effect - slight arrow nudge
                'hover:gap-3'
              )}
            >
              {getCTALabel(currentStepId)}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
