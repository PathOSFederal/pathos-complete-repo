/**
 * ============================================================================
 * ONBOARDING WIZARD COMPONENT
 * ============================================================================
 *
 * FILE PURPOSE:
 * A multi-step wizard that guides new users through initial profile setup.
 * Collects essential information like persona type, career goals, and
 * location preferences.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * - UI Layer: Onboarding flow component
 * - Shown when: User has not completed onboarding
 * - Writes to: profileStore (persisted to localStorage)
 *
 * KEY CONCEPTS:
 * - "Persona" determines the user type (job seeker vs federal employee)
 * - "Grade band" is a simplified way for job seekers to specify target grades
 * - "Advanced grades" allows custom grade range selection
 * - Each step has validation rules before proceeding
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. Step 1: Collect name, persona, current grade (if employee), location
 * 2. Step 2: Collect target series and grade preferences
 * 3. Step 3: Collect metro area and relocation willingness
 * 4. On completion, save profile and redirect to dashboard
 *
 * WHY THIS DESIGN:
 * - Multi-step reduces cognitive load vs a single long form
 * - Validation at each step prevents incomplete submissions
 * - Persona-aware questions show relevant fields only
 * - Progress indicator shows user where they are in the flow
 *
 * HOW TO EXTEND SAFELY:
 * - Add new steps by incrementing the step count and adding validation
 * - Keep validation logic at the top of the component for visibility
 * - Test with both persona types to ensure all branches work
 *
 * TESTING / VALIDATION:
 * - pnpm typecheck (ensure no type errors)
 * - Manual: Complete onboarding as job seeker and employee
 * - Check that profile is persisted after completion
 * ============================================================================
 */

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, User, Target, MapPin, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useProfileStore,
  type PersonaType,
  type EducationLevel,
  type GoalTimeHorizon,
  type RelocationWillingness,
} from '@/store/profileStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { openPathAdvisor } from '@/lib/pathadvisor/openPathAdvisor';
import type { GradeBandKey } from '@/lib/api/profile';
// Day 43: Import anchor system for setting onboarding anchor (right rail context)
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { buildAnchorId, normalizeSourceLabel, type PathAdvisorAnchor } from '@/lib/pathadvisor/anchors';
import { GradeSelector, gradeBandOptions, type GradeSelectorRef } from '@/components/onboarding/grade-selector';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 1, title: 'Who are you?', icon: User },
  { id: 2, title: 'Career Goals', icon: Target },
  { id: 3, title: 'Location', icon: MapPin },
];

const gradeOptions = [
  'GS-5',
  'GS-6',
  'GS-7',
  'GS-8',
  'GS-9',
  'GS-10',
  'GS-11',
  'GS-12',
  'GS-13',
  'GS-14',
  'GS-15',
];

const educationOptions: { value: EducationLevel; label: string }[] = [
  { value: 'high_school', label: 'High School' },
  { value: 'associate', label: 'Associate Degree' },
  { value: 'bachelor', label: "Bachelor's Degree" },
  { value: 'master', label: "Master's Degree" },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'other', label: 'Other' },
];

const timeHorizonOptions: { value: GoalTimeHorizon; label: string }[] = [
  { value: '6_12_months', label: '6-12 months' },
  { value: '1_3_years', label: '1-3 years' },
  { value: '3_5_years_plus', label: '3-5+ years' },
];

const relocationOptions: { value: RelocationWillingness; label: string }[] = [
  { value: 'stay_local', label: 'Stay local' },
  { value: 'nearby_regions', label: 'Nearby regions' },
  { value: 'open_conus', label: 'Open CONUS' },
  { value: 'open_conus_oconus', label: 'Open CONUS + OCONUS' },
];

const seriesOptions = [
  'IT Specialist (2210)',
  'Program Analyst (0343)',
  'Contract Specialist (1102)',
  'Management Analyst (0343)',
  'Human Resources (0201)',
  'Financial Management (0501)',
  'Administrative Officer (0341)',
  'Budget Analyst (0560)',
];

export function OnboardingWizard(props: OnboardingWizardProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;

  const router = useRouter();
  const toastHook = useToast();
  const toast = toastHook.toast;

  const updateProfile = useProfileStore(function (state) {
    return state.updateProfile;
  });
  const updateCurrent = useProfileStore(function (state) {
    return state.updateCurrent;
  });
  const updateJobSeeker = useProfileStore(function (state) {
    return state.updateJobSeeker;
  });
  const updateGoals = useProfileStore(function (state) {
    return state.updateGoals;
  });
  const updateLocation = useProfileStore(function (state) {
    return state.updateLocation;
  });
  const markProfileComplete = useProfileStore(function (state) {
    return state.markProfileComplete;
  });

  // PathAdvisor integration for optional help
  const advisorContext = useAdvisorContext();

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state
  const [name, setName] = useState('');
  const [persona, setPersona] = useState<PersonaType>('job_seeker');
  const [education, setEducation] = useState<EducationLevel>('bachelor');
  const [currentGrade, setCurrentGrade] = useState('GS-9');
  const [currentLocation, setCurrentLocation] = useState('');

  // Step 2 state
  const [targetGradeFrom, setTargetGradeFrom] = useState('GS-9');
  const [targetGradeTo, setTargetGradeTo] = useState('GS-11');
  const [targetSeries, setTargetSeries] = useState<string[]>([]);
  const [timeHorizon, setTimeHorizon] = useState<GoalTimeHorizon>('1_3_years');
  // Job seeker-specific grade band state
  const [gradeBand, setGradeBand] = useState<GradeBandKey | null>(null);
  const [showAdvancedGrades, setShowAdvancedGrades] = useState(false);

  // Day40: Ref for GradeSelector to restore focus when PathAdvisor closes
  const gradeSelectorRef = useRef<GradeSelectorRef | null>(null);

  // Day40: Ref for scroll container (step content area) to normalize scroll before opening PathAdvisor
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Step 3 state
  const [metroArea, setMetroArea] = useState('');
  const [relocation, setRelocation] = useState<RelocationWillingness>('stay_local');

  const isStep1Valid =
    name.trim().length > 0 &&
    (persona === 'job_seeker' || (currentGrade && currentLocation.trim().length > 0));

  // -------------------------------------------------------------------------
  // STEP 2 VALIDATION
  // -------------------------------------------------------------------------
  // For job seekers: either a grade band is selected, OR advanced grades are
  // configured (both from and to). Plus at least one target series.
  // For employees: must have grade range and at least one target series.
  //
  // WHY Boolean(): The && operator returns the last truthy value (a string),
  // not a boolean. We explicitly convert to boolean to match the type.
  let isStep2Valid = false;
  if (persona === 'job_seeker') {
    // Check if grade requirements are met (either band or custom range)
    const hasGradeRequirement =
      gradeBand !== null || Boolean(showAdvancedGrades && targetGradeFrom && targetGradeTo);
    isStep2Valid = hasGradeRequirement && targetSeries.length > 0;
  } else {
    isStep2Valid = Boolean(targetGradeFrom) && Boolean(targetGradeTo) && targetSeries.length > 0;
  }

  const isStep3Valid = metroArea.trim().length > 0;

  const handleSeriesToggle = function (series: string) {
    const index = targetSeries.indexOf(series);
    if (index >= 0) {
      const newList: string[] = [];
      for (let i = 0; i < targetSeries.length; i++) {
        if (targetSeries[i] !== series) {
          newList.push(targetSeries[i]);
        }
      }
      setTargetSeries(newList);
    } else {
      const newList2 = targetSeries.slice();
      newList2.push(series);
      setTargetSeries(newList2);
    }
  };

  const handleGradeBandSelect = function (band: GradeBandKey) {
    setGradeBand(band);
    let selected = null;
    for (let i = 0; i < gradeBandOptions.length; i++) {
      if (gradeBandOptions[i].key === band) {
        selected = gradeBandOptions[i];
        break;
      }
    }
    if (selected && selected.from && selected.to) {
      setTargetGradeFrom(selected.from);
      setTargetGradeTo(selected.to);
    } else if (band === 'unsure') {
      // Keep existing values or set defaults for "unsure"
      setTargetGradeFrom('');
      setTargetGradeTo('');
    }
    // Hide advanced when a band is selected
    setShowAdvancedGrades(false);
  };

  const handleAdvancedGradeChange = function (field: 'from' | 'to', value: string) {
    if (field === 'from') {
      setTargetGradeFrom(value);
    } else {
      setTargetGradeTo(value);
    }
    // Clear the band selection when using advanced
    setGradeBand(null);
  };

  /**
   * Handle PathAdvisor help request for grade band selection
   * Opens PathAdvisor with a prompt asking for help choosing a grade band
   */
  const handlePathAdvisorHelp = function () {
    // Day40: Temporary diagnostic logs to identify scroll container
    console.log('[Day40] onboarding ask clicked', {
      windowScrollY: typeof window !== 'undefined' ? window.scrollY : 0,
      documentElementScrollTop: typeof document !== 'undefined' ? document.documentElement.scrollTop : 0,
      bodyScrollTop: typeof document !== 'undefined' ? document.body.scrollTop : 0,
      scrollContainerScrollTop: scrollContainerRef.current ? scrollContainerRef.current.scrollTop : null,
    });

    // Day40: Log onboarding wizard dialog bounds if available
    if (typeof document !== 'undefined') {
      const wizardDialog = document.querySelector('[data-slot="dialog-content"]');
      if (wizardDialog) {
        const rect = wizardDialog.getBoundingClientRect();
        console.log('[Day40] onboarding wizard dialog bounds', {
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
      // Scroll container is the step content div
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
        source: 'onboarding_wizard',
        prompt:
          'I am choosing a grade band for my federal job search. Can you help me understand which level might be right for me based on my experience and goals?',
        openMode: 'expanded',
        closeOverlays: false, // Keep wizard open
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
  };

  const handleNext = function () {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = function () {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = function () {
    // Save all profile data
    updateProfile({ name: name, persona: persona });

    if (persona === 'federal_employee') {
      updateCurrent({
        grade: currentGrade,
        dutyLocation: currentLocation,
        agency: '',
        series: '',
        step: '1',
      });
    } else {
      updateJobSeeker({
        highestEducation: education,
        yearsOfExperience: 0,
      });
    }

    // Build goals update object
    const goalsUpdate: {
      targetGradeFrom?: string;
      targetGradeTo?: string;
      targetSeries: string[];
      goalTimeHorizon: GoalTimeHorizon;
      gradeBand?: GradeBandKey;
    } = {
      targetGradeFrom: targetGradeFrom || undefined,
      targetGradeTo: targetGradeTo || undefined,
      targetSeries: targetSeries,
      goalTimeHorizon: timeHorizon,
    };

    // For job seekers, include the selected gradeBand
    if (persona === 'job_seeker' && gradeBand !== null) {
      goalsUpdate.gradeBand = gradeBand;
    }

    updateGoals(goalsUpdate);

    updateLocation({
      currentMetroArea: metroArea,
      relocationWillingness: relocation,
    });

    markProfileComplete();

    toast({
      title: 'Profile saved',
      description: 'PathOS will now use this to personalize your dashboard.',
    });

    onOpenChange(false);
    router.push('/settings');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* ================================================================
            ACCESSIBILITY: VisuallyHidden title and description
            ================================================================
            Radix Dialog requires both DialogTitle and DialogDescription
            for screen reader accessibility. Since this dialog uses a
            custom visual stepper header, we hide the semantic elements
            while keeping them accessible.
            ================================================================ */}
        <VisuallyHidden.Root>
          <DialogTitle>PathOS Onboarding Wizard</DialogTitle>
          <DialogDescription>
            Set up your PathOS profile by providing your basic information, career goals, and location preferences.
          </DialogDescription>
        </VisuallyHidden.Root>
        {/* Stepper header */}
        <div className="bg-muted/30 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map(function (step, index) {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                        isCompleted
                          ? 'bg-accent border-accent text-accent-foreground'
                          : isActive
                            ? 'border-accent text-accent'
                            : 'border-muted-foreground/30 text-muted-foreground',
                      )}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isActive ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        Step {step.id}
                      </p>
                      <p
                        className={cn(
                          'text-xs',
                          isActive ? 'text-muted-foreground' : 'text-muted-foreground/60',
                        )}
                      >
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground/30 mx-4 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        {/* Day40: Added ref for scroll normalization before opening PathAdvisor */}
        <div ref={scrollContainerRef} className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Tell us about yourself</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This helps PathOS tailor guidance for your situation.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={function (e) { setName(e.target.value); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={function () { setPersona('job_seeker'); }}
                      className={cn(
                        'p-4 rounded-lg border-2 text-left transition-colors',
                        persona === 'job_seeker'
                          ? 'border-accent bg-accent/10'
                          : 'border-muted-foreground/20 hover:border-muted-foreground/40',
                      )}
                    >
                      <p className="font-medium text-foreground">Job Seeker</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Looking for federal positions
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={function () { setPersona('federal_employee'); }}
                      className={cn(
                        'p-4 rounded-lg border-2 text-left transition-colors',
                        persona === 'federal_employee'
                          ? 'border-accent bg-accent/10'
                          : 'border-muted-foreground/20 hover:border-muted-foreground/40',
                      )}
                    >
                      <p className="font-medium text-foreground">Federal Employee</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Currently in government service
                      </p>
                    </button>
                  </div>
                </div>

                {persona === 'job_seeker' ? (
                  <div className="space-y-2">
                    <Label>Highest education</Label>
                    <Select
                      value={education}
                      onValueChange={function (v) { setEducation(v as EducationLevel); }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {educationOptions.map(function (opt) {
                          return (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Current grade</Label>
                      <Select value={currentGrade} onValueChange={setCurrentGrade}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeOptions.map(function (grade) {
                            return (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Duty location</Label>
                      <Input
                        placeholder="e.g., Washington, DC"
                        value={currentLocation}
                        onChange={function (e) { setCurrentLocation(e.target.value); }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  What are your career goals?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {persona === 'job_seeker'
                    ? 'Set your targets so PathOS knows which jobs and grades to prioritize for your first federal role.'
                    : 'Set your targets so PathOS knows what to prioritize for promotions and lateral moves.'}
                </p>
              </div>

              <div className="space-y-4">
                {/* Grade selection - different UI for job seekers vs employees */}
                {persona === 'job_seeker' ? (
                  <div className="space-y-3">
                    {/* Shared GradeSelector component with PathAdvisor help support */}
                    <GradeSelector
                      ref={gradeSelectorRef}
                      value={gradeBand}
                      onChange={function (newValue) {
                        handleGradeBandSelect(newValue);
                      }}
                      showHelpMeChoose={true}
                      onHelpMeChoose={handlePathAdvisorHelp}
                    />

                    {/* Advanced option for specific grades */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={function () { setShowAdvancedGrades(!showAdvancedGrades); }}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform',
                            showAdvancedGrades && 'rotate-180',
                          )}
                        />
                        Advanced: choose specific grades
                      </button>

                      {showAdvancedGrades && (
                        <div className="grid grid-cols-2 gap-4 mt-3 p-4 rounded-lg bg-muted/30 border border-muted-foreground/10">
                          <div className="space-y-2">
                            <Label className="text-xs">Target grade from</Label>
                            <Select
                              value={targetGradeFrom}
                              onValueChange={function (v) { handleAdvancedGradeChange('from', v); }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                {gradeOptions.map(function (grade) {
                                  return (
                                    <SelectItem key={grade} value={grade}>
                                      {grade}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Target grade to</Label>
                            <Select
                              value={targetGradeTo}
                              onValueChange={function (v) { handleAdvancedGradeChange('to', v); }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                {gradeOptions.map(function (grade) {
                                  return (
                                    <SelectItem key={grade} value={grade}>
                                      {grade}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Federal employee: keep existing from/to dropdowns */
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target grade from</Label>
                      <Select value={targetGradeFrom} onValueChange={setTargetGradeFrom}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeOptions.map(function (grade) {
                            return (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target grade to</Label>
                      <Select value={targetGradeTo} onValueChange={setTargetGradeTo}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeOptions.map(function (grade) {
                            return (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Shared fields: target series and time horizon */}
                <div className="space-y-2">
                  <Label>Target series or fields</Label>
                  <p className="text-xs text-muted-foreground">Select one or more</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {seriesOptions.map(function (series) {
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={function () { handleSeriesToggle(series); }}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm border transition-colors',
                            targetSeries.indexOf(series) >= 0
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                          )}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Goal time horizon</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeHorizonOptions.map(function (opt) {
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={function () { setTimeHorizon(opt.value); }}
                          className={cn(
                            'py-2 px-3 rounded-lg border text-sm transition-colors',
                            timeHorizon === opt.value
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Where do you want to work?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell us your location preferences.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current metro area</Label>
                  <Input
                    placeholder="e.g., Washington, DC Metro"
                    value={metroArea}
                    onChange={function (e) { setMetroArea(e.target.value); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Willingness to relocate</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {relocationOptions.map(function (opt) {
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={function () { setRelocation(opt.value); }}
                          className={cn(
                            'py-2 px-3 rounded-lg border text-sm transition-colors',
                            relocation === opt.value
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/20 px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1}>
            Back
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid)
              }
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={!isStep3Valid}>
              Finish and go to profile
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
