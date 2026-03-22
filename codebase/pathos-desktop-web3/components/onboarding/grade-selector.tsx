/**
 * ============================================================================
 * GRADE SELECTOR COMPONENT (Day 40 Follow-up - Shared Grade Step)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Shared grade band selector component that renders the GS Translation UI
 * (expandable "Learn more" content + microcopy) for use in both the standard
 * onboarding wizard and the PathAdvisor onboarding flow.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - UI Layer: Reusable grade selection component
 * - Used by: components/onboarding-wizard.tsx and components/dashboard/OnboardingPathAdvisorConversation.tsx
 * - Content: Pulls translation content from lib/onboarding/gs-translation.ts
 *
 * KEY CONCEPTS:
 * - Grade band selection: Entry/Early/Mid/Senior + "I'm not sure yet"
 * - Expandable "Learn more": Only one band's details expanded at a time
 * - Translation content: Plain-English explanations from GS Translation Layer
 * - Optional PathAdvisor help: "Help me choose" button (optional)
 * - Microcopy: Required messaging visible on the step
 *
 * DESIGN PRINCIPLES:
 * - UI-first: Component stands alone; PathAdvisor help is optional
 * - Single source of truth: Translation content from gs-translation.ts
 * - Accessibility: Keyboard operable, clear selection state, aria-expanded for expand/collapse
 * - Minimal diffs: Shared component reduces duplication
 *
 * HOW TO USE:
 * ```tsx
 * <GradeSelector
 *   value={gradeBand}
 *   onChange={(newValue) => setGradeBand(newValue)}
 *   showHelpMeChoose={true}
 *   onHelpMeChoose={() => openPathAdvisor(...)}
 * />
 * ```
 * ============================================================================
 */

'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getGSTranslation } from '@/lib/onboarding/gs-translation';
import type { GradeBandKey } from '@/lib/api/profile';
import { AskPathAdvisorButton } from '@/components/pathadvisor/AskPathAdvisorButton';

/**
 * Grade band options for job seekers
 * These match the options defined in lib/onboarding/conversation.ts
 * Exported for use in onboarding-wizard.tsx for grade band to grade range mapping
 */
export const gradeBandOptions: {
  key: GradeBandKey;
  label: string;
  from: string | null;
  to: string | null;
}[] = [
  { key: 'entry', label: 'Entry level (GS-5–7)', from: 'GS-5', to: 'GS-7' },
  { key: 'early', label: 'Early career (GS-7–9)', from: 'GS-7', to: 'GS-9' },
  { key: 'mid', label: 'Mid career (GS-9–11)', from: 'GS-9', to: 'GS-11' },
  { key: 'senior', label: 'Senior (GS-12–13)', from: 'GS-12', to: 'GS-13' },
  { key: 'unsure', label: "I'm not sure yet", from: null, to: null },
];

/**
 * Props for GradeSelector component
 */
export interface GradeSelectorProps {
  /**
   * Currently selected grade band (null if none selected)
   */
  value: GradeBandKey | null;
  /**
   * Callback when a grade band is selected
   */
  onChange: (newValue: GradeBandKey) => void;
  /**
   * Optional callback when "Help me choose" is clicked
   * If provided and showHelpMeChoose is true, the help button is shown
   */
  onHelpMeChoose?: () => void;
  /**
   * Whether to show the "Help me choose" button
   * Defaults to false
   */
  showHelpMeChoose?: boolean;
}

/**
 * Ref methods exposed by GradeSelector
 */
export interface GradeSelectorRef {
  /**
   * Restore focus to the "Help me choose" button or selected grade option
   */
  restoreFocus: () => void;
}

/**
 * Shared Grade Selector Component
 *
 * Renders grade band selection UI with:
 * - Grade band options (Entry/Early/Mid/Senior + "I'm not sure yet")
 * - Expandable "Learn more" sections (only one expanded at a time)
 * - Translation content from lib/onboarding/gs-translation.ts
 * - Required microcopy
 * - Optional "Help me choose" button
 */
export const GradeSelector = forwardRef<GradeSelectorRef, GradeSelectorProps>(function GradeSelector(
  props,
  ref,
) {
  const value = props.value;
  const onChange = props.onChange;
  const onHelpMeChoose = props.onHelpMeChoose;
  const showHelpMeChoose = props.showHelpMeChoose !== undefined ? props.showHelpMeChoose : false;

  // Track which band's "Learn more" section is expanded (only one at a time)
  const [expandedBandKey, setExpandedBandKey] = useState<GradeBandKey | null>(null);
  
  // Track focused option for keyboard navigation (radiogroup pattern)
  // Initialize to selected value if provided, otherwise null
  const [focusedOptionKey, setFocusedOptionKey] = useState<GradeBandKey | null>(value);
  
  // Refs for each option button (for keyboard navigation)
  const optionRefs = useRef<Record<GradeBandKey, HTMLButtonElement | null>>({
    entry: null,
    early: null,
    mid: null,
    senior: null,
    unsure: null,
    custom: null,
  });
  
  // Ref for the radiogroup container
  const radiogroupRef = useRef<HTMLDivElement | null>(null);

  // Day40: Ref for "Help me choose" button for focus restoration
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);

  // Day40: Expose focus restore method via ref
  useImperativeHandle(ref, function () {
    return {
      restoreFocus: function () {
        // Try to focus "Help me choose" button first, otherwise focus selected grade option
        if (helpButtonRef.current) {
          helpButtonRef.current.focus();
        } else if (value && optionRefs.current[value]) {
          optionRefs.current[value]?.focus();
        }
      },
    };
  }, [value]);

  /**
   * Handle grade band selection
   * Calls onChange with the selected band key
   * Also updates focused option for keyboard navigation
   */
  function handleGradeBandSelect(band: GradeBandKey) {
    onChange(band);
    setFocusedOptionKey(band);
  }
  
  /**
   * Handle keyboard navigation for radiogroup
   * Arrow keys move focus/selection, Enter/Space selects
   */
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = focusedOptionKey
      ? gradeBandOptions.findIndex(function (opt) {
          return opt.key === focusedOptionKey;
        })
      : -1;
    
    let newIndex = currentIndex;
    
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      newIndex = currentIndex < gradeBandOptions.length - 1 ? currentIndex + 1 : 0;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : gradeBandOptions.length - 1;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (focusedOptionKey) {
        handleGradeBandSelect(focusedOptionKey);
      }
      return;
    } else {
      // Not a navigation key, let it bubble
      return;
    }
    
    // Update focused option
    const newFocusedKey = gradeBandOptions[newIndex].key;
    setFocusedOptionKey(newFocusedKey);
    
    // Focus the button element
    const buttonRef = optionRefs.current[newFocusedKey];
    if (buttonRef) {
      buttonRef.focus();
    }
  }
  

  /**
   * Handle expand/collapse of "Learn more" section
   * Only one band's details can be expanded at a time
   */
  function handleToggleExpand(band: GradeBandKey) {
    if (expandedBandKey === band) {
      // Collapse if already expanded
      setExpandedBandKey(null);
    } else {
      // Expand this band's details
      setExpandedBandKey(band);
    }
  }

  return (
    <div className="space-y-3">
      {/* Label and optional "Help me choose" button */}
      <div className="flex items-center justify-between">
        <Label>What level are you aiming for?</Label>
        {showHelpMeChoose && onHelpMeChoose ? (
          <AskPathAdvisorButton
            ref={helpButtonRef}
            onClick={onHelpMeChoose}
            fullWidth={false}
            className="text-xs h-8 px-3"
          >
            Help me choose
          </AskPathAdvisorButton>
        ) : null}
      </div>

      {/* Required microcopy - visible on the step */}
      <p className="text-xs text-muted-foreground">
        This helps PathOS tailor job matches. You can change this anytime.
      </p>
      <p className="text-xs text-muted-foreground">
        This is not an eligibility check.
      </p>

      {/* Grade band selection buttons with expandable translation content */}
      {/* Radiogroup container with keyboard navigation */}
      <div
        ref={radiogroupRef}
        role="radiogroup"
        aria-label="Grade band selection"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-2"
      >
        {gradeBandOptions.map(function (band) {
          const translation = getGSTranslation(band.key);
          const isExpanded = expandedBandKey === band.key;
          const isSelected = value === band.key;
          const isFocused = focusedOptionKey === band.key;
          const expandableId = `grade-band-${band.key}-details`;

          return (
            <div key={band.key} className="flex flex-col gap-1">
              {/* Grade band selection button (radio role) */}
              <button
                ref={function (el) {
                  optionRefs.current[band.key] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={band.label}
                onClick={function () {
                  handleGradeBandSelect(band.key);
                }}
                onFocus={function () {
                  setFocusedOptionKey(band.key);
                }}
                className={cn(
                  'px-4 py-2 rounded-full text-sm border transition-colors text-left',
                  isSelected
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                  isFocused && !isSelected ? 'ring-2 ring-accent/50 ring-offset-1' : '',
                )}
              >
                {band.label}
              </button>
              {/* Expandable translation content */}
              {translation ? (
                <div className="pl-1">
                  <button
                    type="button"
                    onClick={function () {
                      handleToggleExpand(band.key);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={expandableId}
                  >
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 transition-transform',
                        isExpanded && 'rotate-180',
                      )}
                    />
                    {isExpanded ? 'Less' : 'Learn more'}
                  </button>
                  {isExpanded ? (
                    <div
                      id={expandableId}
                      className="mt-2 p-3 rounded-lg bg-muted/30 border border-muted-foreground/10 text-xs space-y-2"
                    >
                      <p className="font-medium text-foreground">
                        {translation.plainEnglish}
                      </p>
                      <p className="text-muted-foreground">
                        {translation.responsibilityLevel}
                      </p>
                      {translation.exampleRoles.length > 0 ? (
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            Example roles:
                          </p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                            {translation.exampleRoles.map(function (role, idx) {
                              return <li key={idx}>{role}</li>;
                            })}
                          </ul>
                        </div>
                      ) : null}
                      <p className="text-muted-foreground italic">
                        {translation.ifThisSoundsLikeYou}
                      </p>
                      <p className="text-muted-foreground">
                        {translation.ifUnsure}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});

