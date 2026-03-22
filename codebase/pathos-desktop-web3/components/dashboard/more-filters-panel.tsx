/**
 * ============================================================================
 * MORE FILTERS PANEL - PREMIUM WORKSPACE DESIGN
 * ============================================================================
 *
 * FILE PURPOSE:
 * This dialog provides a premium "workspace" experience for advanced job search
 * filters. It uses a structured layout that feels organized and trustworthy:
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │  HEADER (Non-scrollable)                                               │
 *   │  - Title, description, close button                                    │
 *   │  - Accent underline for visual polish                                  │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │  SUMMARY BAR (Non-scrollable)                                          │
 *   │  - Active filter count + removable chips + "Clear all"                 │
 *   │  - Provides instant feedback about current filter state                │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │                                                                         │
 *   │  SCROLLABLE BODY                                                        │
 *   │  ┌─────────────────────────┐  ┌─────────────────────────┐               │
 *   │  │  Section Card A         │  │  Section Card B         │               │
 *   │  │  (Job Structure)        │  │  (Location & Travel)    │               │
 *   │  └─────────────────────────┘  └─────────────────────────┘               │
 *   │  ┌─────────────────────────┐  ┌─────────────────────────┐               │
 *   │  │  Section Card C         │  │  Section Card D         │               │
 *   │  │  (Clearance)            │  │  (Hiring Paths)         │               │
 *   │  └─────────────────────────┘  └─────────────────────────┘               │
 *   │  ...more section cards...                                               │
 *   │                                                                         │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │  FOOTER CONTROL BAR (Non-scrollable)                                   │
 *   │  - Save as default checkbox                                            │
 *   │  - Reset (ghost) + Apply (primary) buttons                             │
 *   │  - Always visible, never scrolls away                                  │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS LAYOUT:
 * 1. Summary bar provides immediate context ("what's active?")
 * 2. Section cards create visual grouping and scannability
 * 3. Footer control bar ensures actions are always reachable
 * 4. The scroll region is contained, preventing footer from disappearing
 *
 * VISUAL LANGUAGE:
 * - Accent underlines on section headers for polish
 * - Stronger selected states on toggle buttons (check icon + contrast)
 * - Subtle card backgrounds for visual lift
 * - Trust-forward microcopy ("stays on this device")
 *
 * RESPONSIVE BEHAVIOR:
 * - Single column on mobile/tablet
 * - Two-column grid at lg (1024px+) for section content
 * - Chips wrap naturally on all screen sizes
 *
 * @version Day 11 - Job Search Filters & Saved Searches v1 - Premium Workspace
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { X, Check, Filter, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useJobSearchStore,
  type TeleworkPreference,
  type TravelFrequency,
  type PositionSensitivity,
  type InternalExternal,
  type PromotionPotentialFilter,
  type QualificationEmphasis,
  type TrajectoryPreference,
  type RetirementImpactPreference,
  type CompensationFocus,
} from '@/store/jobSearchStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents an active filter chip that can be displayed and removed.
 *
 * WHY THIS TYPE:
 * The summary bar needs a uniform way to display all active filters as chips.
 * Each chip needs a unique key (for React), a display label, and a way to
 * remove itself (which calls back to the store).
 */
interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

// ============================================================================
// LABEL MAPS
// ============================================================================
// These maps convert internal filter keys to human-readable labels for chips.
// Keeping them as plain objects avoids unnecessary complexity.

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  term: 'Term',
  temporary: 'Temporary',
  detail: 'Detail/Rotational',
};

const WORK_SCHEDULE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  intermittent: 'Intermittent',
  shift: 'Shift work',
};

const SUPERVISORY_LABELS: Record<string, string> = {
  'non-supervisory': 'Non-supervisory',
  supervisory: 'Supervisory',
  'team-lead': 'Team lead',
};

const CLEARANCE_LABELS: Record<string, string> = {
  none: 'No clearance',
  'public-trust': 'Public Trust',
  secret: 'Secret',
  ts: 'Top Secret',
  'ts-sci': 'TS/SCI',
};

const HIRING_PATH_LABELS: Record<string, string> = {
  status: 'Federal employees',
  veterans: 'Veterans',
  'recent-graduates': 'Recent graduates',
  students: 'Students',
  public: 'Public',
};

const TELEWORK_LABELS: Record<string, string> = {
  'remote-only': 'Remote only',
  'remote-or-telework': 'Remote/Telework',
  'on-site-preferred': 'On-site preferred',
};

const TRAVEL_LABELS: Record<string, string> = {
  none: 'No travel',
  'up-to-25': '≤25% travel',
  'up-to-50': '25-50% travel',
  'over-50': '50%+ travel',
};

const PROMOTION_LABELS: Record<string, string> = {
  none: 'No promotion potential',
  'up-to-current': 'Up to current grade',
  'at-or-above-target': 'At/above target',
};

const SENSITIVITY_LABELS: Record<string, string> = {
  'non-sensitive': 'Non-sensitive',
  'non-critical-sensitive': 'Non-critical sensitive',
  'critical-sensitive': 'Critical sensitive',
  'special-sensitive': 'Special sensitive',
};

const INTERNAL_EXTERNAL_LABELS: Record<string, string> = {
  'agency-only': 'Agency-only',
  'gov-wide': 'Gov-wide',
  'all-sources': 'All sources',
};

const TRAJECTORY_LABELS: Record<string, string> = {
  lateral: 'Lateral move',
  promotion: 'Promotion track',
  'senior-track': 'Senior/SES track',
};

const RETIREMENT_LABELS: Record<string, string> = {
  improve: 'Improve readiness',
  neutral: 'Neutral impact',
  'avoid-negative': 'Avoid negative',
};

const COMPENSATION_LABELS: Record<string, string> = {
  'maximize-salary': 'Maximize salary',
  'quality-of-life': 'Quality of life first',
};

const QUALIFICATION_LABELS: Record<string, string> = {
  technical: 'Technical emphasis',
  leadership: 'Leadership emphasis',
  'policy-analysis': 'Policy/analysis emphasis',
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface MoreFiltersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MoreFiltersPanel(props: MoreFiltersPanelProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;

  // ============================================================================
  // STORE SELECTORS
  // ============================================================================
  const jobSearchFilters = useJobSearchStore(function (state) {
    return state.jobSearchFilters;
  });
  const setJobSearchFilters = useJobSearchStore(function (state) {
    return state.setJobSearchFilters;
  });
  const setJobSearchDefaults = useJobSearchStore(function (state) {
    return state.setJobSearchDefaults;
  });
  const searchJobs = useJobSearchStore(function (state) {
    return state.searchJobs;
  });

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // ============================================================================
  // COMPUTE ACTIVE FILTER CHIPS
  // ============================================================================
  /**
   * Builds an array of active filter chips for the summary bar.
   *
   * WHY COMPUTE THIS:
   * The summary bar needs to show all non-default filters as removable chips.
   * Each chip has a label (what the user sees) and an onRemove callback
   * (what happens when user clicks X on the chip).
   *
   * HOW IT WORKS:
   * 1. Check each filter category
   * 2. If it has a non-default value, create a chip for it
   * 3. Array filters create one chip per selected value
   * 4. Single-value filters create one chip if set
   */
  const activeChips: ActiveFilterChip[] = [];

  // Appointment types (array)
  const appointmentTypes = jobSearchFilters.appointmentTypes || [];
  for (let i = 0; i < appointmentTypes.length; i++) {
    const val = appointmentTypes[i];
    activeChips.push({
      key: 'apt-' + val,
      label: APPOINTMENT_TYPE_LABELS[val] || val,
      onRemove: function () {
        const next = appointmentTypes.filter(function (v) { return v !== val; });
        setJobSearchFilters({ appointmentTypes: next });
      },
    });
  }

  // Work schedules (array)
  const workSchedules = jobSearchFilters.workSchedules || [];
  for (let i = 0; i < workSchedules.length; i++) {
    const val = workSchedules[i];
    activeChips.push({
      key: 'ws-' + val,
      label: WORK_SCHEDULE_LABELS[val] || val,
      onRemove: function () {
        const next = workSchedules.filter(function (v) { return v !== val; });
        setJobSearchFilters({ workSchedules: next });
      },
    });
  }

  // Supervisory statuses (array)
  const supervisoryStatuses = jobSearchFilters.supervisoryStatuses || [];
  for (let i = 0; i < supervisoryStatuses.length; i++) {
    const val = supervisoryStatuses[i];
    activeChips.push({
      key: 'sup-' + val,
      label: SUPERVISORY_LABELS[val] || val,
      onRemove: function () {
        const next = supervisoryStatuses.filter(function (v) { return v !== val; });
        setJobSearchFilters({ supervisoryStatuses: next });
      },
    });
  }

  // Clearance levels (array)
  const clearanceLevels = jobSearchFilters.clearanceLevels || [];
  for (let i = 0; i < clearanceLevels.length; i++) {
    const val = clearanceLevels[i];
    activeChips.push({
      key: 'clr-' + val,
      label: CLEARANCE_LABELS[val] || val,
      onRemove: function () {
        const next = clearanceLevels.filter(function (v) { return v !== val; });
        setJobSearchFilters({ clearanceLevels: next });
      },
    });
  }

  // Position sensitivities (array)
  const positionSensitivities = jobSearchFilters.positionSensitivities || [];
  for (let i = 0; i < positionSensitivities.length; i++) {
    const val = positionSensitivities[i];
    activeChips.push({
      key: 'sens-' + val,
      label: SENSITIVITY_LABELS[val] || val,
      onRemove: function () {
        const next = positionSensitivities.filter(function (v) { return v !== val; });
        setJobSearchFilters({ positionSensitivities: next });
      },
    });
  }

  // Hiring paths (array)
  const hiringPaths = jobSearchFilters.hiringPaths || [];
  for (let i = 0; i < hiringPaths.length; i++) {
    const val = hiringPaths[i];
    activeChips.push({
      key: 'hp-' + val,
      label: HIRING_PATH_LABELS[val] || val,
      onRemove: function () {
        const next = hiringPaths.filter(function (v) { return v !== val; });
        setJobSearchFilters({ hiringPaths: next });
      },
    });
  }

  // Promotion potential (single value)
  if (jobSearchFilters.promotionPotential) {
    const val = jobSearchFilters.promotionPotential;
    activeChips.push({
      key: 'promo-' + val,
      label: PROMOTION_LABELS[val] || val,
      onRemove: function () {
        setJobSearchFilters({ promotionPotential: null });
      },
    });
  }

  // Telework preference (single value, skip 'any')
  if (jobSearchFilters.teleworkPreference && jobSearchFilters.teleworkPreference !== 'any') {
    const val = jobSearchFilters.teleworkPreference;
    activeChips.push({
      key: 'tele-' + val,
      label: TELEWORK_LABELS[val] || val,
      onRemove: function () {
        setJobSearchFilters({ teleworkPreference: null });
      },
    });
  }

  // Travel frequency (single value, skip 'any')
  if (jobSearchFilters.travelFrequency && jobSearchFilters.travelFrequency !== 'any') {
    const val = jobSearchFilters.travelFrequency;
    activeChips.push({
      key: 'travel-' + val,
      label: TRAVEL_LABELS[val] || val,
      onRemove: function () {
        setJobSearchFilters({ travelFrequency: null });
      },
    });
  }

  // Internal/external (single value)
  if (jobSearchFilters.internalExternal) {
    const val = jobSearchFilters.internalExternal;
    activeChips.push({
      key: 'intex-' + val,
      label: INTERNAL_EXTERNAL_LABELS[val] || val,
      onRemove: function () {
        setJobSearchFilters({ internalExternal: null });
      },
    });
  }

  // Trajectory preference (single value, skip 'any')
  if (jobSearchFilters.trajectoryPreference && jobSearchFilters.trajectoryPreference !== 'any') {
    const val = jobSearchFilters.trajectoryPreference;
    activeChips.push({
      key: 'traj-' + val,
      label: TRAJECTORY_LABELS[val] || val,
      onRemove: function () {
        setJobSearchFilters({ trajectoryPreference: null });
      },
    });
  }

  // Retirement impact preference (single value, skip 'any')
  if (jobSearchFilters.retirementImpactPreference && jobSearchFilters.retirementImpactPreference !== 'any') {
    const val = jobSearchFilters.retirementImpactPreference;
    activeChips.push({
      key: 'retire-' + val,
      label: RETIREMENT_LABELS[val] || val,
      onRemove: function () {
        setJobSearchFilters({ retirementImpactPreference: null });
      },
    });
  }

  // Compensation focus (single value, skip 'balance')
  if (jobSearchFilters.compensationFocus && jobSearchFilters.compensationFocus !== 'balance') {
    const val = jobSearchFilters.compensationFocus;
    activeChips.push({
      key: 'comp-' + val,
      label: COMPENSATION_LABELS[val] || val,
      onRemove: function () {
        setJobSearchFilters({ compensationFocus: null });
      },
    });
  }

  // Qualification emphasis (single value, skip 'any')
  if (jobSearchFilters.qualificationEmphasis && jobSearchFilters.qualificationEmphasis !== 'any') {
    const val = jobSearchFilters.qualificationEmphasis;
    activeChips.push({
      key: 'qual-' + val,
      label: QUALIFICATION_LABELS[val] || val,
      onRemove: function () {
        setJobSearchFilters({ qualificationEmphasis: null });
      },
    });
  }

  const activeCount = activeChips.length;

  // ============================================================================
  // HANDLER FUNCTIONS
  // ============================================================================

  /**
   * Handler: Apply filters and close the panel.
   */
  const handleApply = function () {
    if (saveAsDefault) {
      setJobSearchDefaults(jobSearchFilters);
      toast({
        title: 'Preferences saved',
        description: 'These filters will be your default on next visit.',
      });
    }
    searchJobs();
    onOpenChange(false);
  };

  /**
   * Handler: Reset all advanced filters to defaults.
   * Reuses existing logic - does NOT create new code paths.
   */
  const handleResetAdvanced = function () {
    setJobSearchFilters({
      appointmentTypes: [],
      workSchedules: [],
      promotionPotential: null,
      supervisoryStatuses: [],
      teleworkPreference: null,
      travelFrequency: null,
      clearanceLevels: [],
      positionSensitivities: [],
      hiringPaths: [],
      internalExternal: null,
      qualificationEmphasis: null,
      trajectoryPreference: null,
      retirementImpactPreference: null,
      compensationFocus: null,
    });
    toast({
      title: 'Filters cleared',
      description: 'All advanced filters have been reset.',
    });
  };

  /**
   * Helper: Toggle a value in an array filter.
   * Existing logic preserved exactly.
   */
  const toggleArrayFilter = function <T extends string>(
    key: string,
    value: T,
    current: T[] | undefined,
  ) {
    const arr = current || [];
    let found = false;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === value) {
        found = true;
        break;
      }
    }

    const next: T[] = [];
    if (found) {
      for (let j = 0; j < arr.length; j++) {
        if (arr[j] !== value) {
          next.push(arr[j]);
        }
      }
    } else {
      for (let k = 0; k < arr.length; k++) {
        next.push(arr[k]);
      }
      next.push(value);
    }

    const update: Record<string, unknown> = {};
    update[key] = next;
    setJobSearchFilters(update);
  };

  /**
   * Helper: Check if a value exists in an array filter.
   * Returns true if selected.
   */
  const isSelected = function <T extends string>(arr: T[] | undefined, value: T): boolean {
    const items = arr || [];
    for (let i = 0; i < items.length; i++) {
      if (items[i] === value) {
        return true;
      }
    }
    return false;
  };

  // ============================================================================
  // RENDER HELPER: FILTER PILL BUTTON
  // ============================================================================
  /**
   * Creates a toggle button for multi-select filter options.
   *
   * WHY CUSTOM STYLING:
   * - Selected state needs stronger visual contrast (not just a subtle tint)
   * - Check icon reinforces selection state (accessibility)
   * - Unselected state is deliberately muted to reduce visual noise
   */
  /**
   * Renders a pill-style toggle button for array-based filters.
   *
   * @param filterKey - The key in jobSearchFilters to update (e.g., 'workSchedules')
   * @param value - The value to toggle (e.g., 'full-time')
   * @param label - The display label for the button
   * @param currentArray - The current array of selected values
   * @param _typeHint - Optional type hint for future type checking (currently unused)
   *
   * WHY 5TH PARAMETER:
   * Some call sites pass a type name (like 'WorkSchedule') as a 5th argument.
   * This was intended for future type-safe validation but is not yet implemented.
   * We accept it to avoid breaking those call sites.
   */
  const renderPillButton = function (
    filterKey: string,
    value: string,
    label: string,
    currentArray: string[] | undefined,
  ) {
    const selected = isSelected(currentArray, value);
    return (
      <Button
        key={value}
        variant={selected ? 'secondary' : 'outline'}
        size="sm"
        className={cn(
          'text-xs h-8 gap-1.5 transition-all',
          selected
            ? 'bg-accent/20 border-accent/50 text-accent-foreground font-medium'
            : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
        )}
        onClick={function () {
          toggleArrayFilter(filterKey, value as never, currentArray as never);
        }}
      >
        {selected && <Check className="h-3 w-3" />}
        {label}
      </Button>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
      {/*
        ========================================================================
        MODAL CONTAINER
        ========================================================================
        
        WHY flex flex-col:
        - Enables three-zone layout: Header + Summary + Body + Footer
        - Header/Summary/Footer use shrink-0 to stay fixed
        - Body uses flex-1 + overflow-y-auto to scroll
        
        WHY THESE SIZES:
        - w-[95vw]: Nearly full width with breathing room
        - max-w-5xl / xl:max-w-6xl: Caps width on large screens
        - max-h-[92vh]: Leaves room for browser chrome
      */}
      <DialogContent
        showCloseButton={false}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-5xl xl:max-w-6xl max-h-[92vh] rounded-2xl border border-border bg-background p-0 shadow-xl flex flex-col"
      >
        {/* ================================================================
            ACCESSIBILITY: VisuallyHidden title and description
            ================================================================
            Radix Dialog requires both DialogTitle and DialogDescription
            for screen reader accessibility. Since this dialog uses a
            custom visual header (line 633-656), we hide the semantic
            elements while keeping them accessible.
            ================================================================ */}
        <VisuallyHidden.Root>
          <DialogTitle>Advanced filters</DialogTitle>
          <DialogDescription>
            Refine your job search with detailed criteria including location, grade, series, and work preferences.
          </DialogDescription>
        </VisuallyHidden.Root>

        {/*
          ========================================================================
          HEADER (NON-SCROLLABLE)
          ========================================================================
          
          WHY ACCENT BORDER-BOTTOM:
          - Adds subtle visual polish without being overwhelming
          - Creates clear separation between header and content
          - The accent color ties into PathOS branding
        */}
        <div className="shrink-0 p-6 lg:p-8 border-b border-border/60 bg-background rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold">Advanced filters</h2>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Refine your search with detailed criteria.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={function () {
                onOpenChange(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {/* Accent underline for visual polish */}
          <div className="mt-4 h-0.5 w-16 bg-gradient-to-r from-accent to-accent/30 rounded-full" />
        </div>

        {/*
          ========================================================================
          SUMMARY BAR (NON-SCROLLABLE)
          ========================================================================
          
          WHY SUMMARY BAR:
          - Provides instant context: "what filters are active?"
          - Chips allow quick removal without scrolling to find the filter
          - "Clear all" is a common pattern users expect
          
          WHY shrink-0:
          - Must not shrink when body overflows
          - Always visible above the scroll area
        */}
        <div className="shrink-0 px-6 lg:px-8 py-4 border-b border-border/40 bg-muted/30">
          <div className="flex flex-wrap items-center gap-3">
            {/* Left: Active count */}
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 font-medium">
                {activeCount}
              </Badge>
              <span className="text-muted-foreground">
                {activeCount === 1 ? 'active filter' : 'active filters'}
              </span>
            </div>

            {/* Middle: Chips (wrap naturally) */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 flex-1">
                {activeChips.map(function (chip) {
                  return (
                    <Badge
                      key={chip.key}
                      variant="outline"
                      className="pl-2 pr-1 py-1 text-xs bg-background border-border/60 hover:border-border gap-1 group"
                    >
                      {chip.label}
                      <button
                        type="button"
                        className="ml-0.5 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={chip.onRemove}
                        title={'Remove ' + chip.label}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Right: Clear all */}
            {activeChips.length > 0 && (
              <Button
                variant="link"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-auto p-0"
                onClick={handleResetAdvanced}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/*
          ========================================================================
          SCROLLABLE BODY
          ========================================================================
          
          WHY flex-1 + overflow-y-auto:
          - flex-1 expands to fill space between summary bar and footer
          - overflow-y-auto adds scrollbar only when needed
          - Header, summary bar, and footer stay visible
          
          WHY space-y-6:
          - Consistent vertical rhythm between section cards
          - Not too cramped, not too spacious
        */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/*
            ========================================================================
            SECTION CARD: JOB STRUCTURE
            ========================================================================
            
            WHY SECTION CARDS:
            - Visual grouping improves scannability
            - Subtle background lift creates depth
            - Consistent padding and spacing across all cards
            
            CARD STYLING:
            - rounded-xl: Softer corners than the modal
            - border-border/50: Subtle border, not harsh
            - bg-card/50: Very subtle background lift
            - p-5: Comfortable internal padding
          */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                Job structure
              </h3>
              <div className="mt-1 h-0.5 w-10 bg-accent/40 rounded-full" />
            </div>

            {/* Appointment type */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Appointment type</p>
              <p className="text-xs text-muted-foreground">Select what you are open to.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {renderPillButton('appointmentTypes', 'permanent', 'Permanent', jobSearchFilters.appointmentTypes)}
                {renderPillButton('appointmentTypes', 'term', 'Term', jobSearchFilters.appointmentTypes)}
                {renderPillButton('appointmentTypes', 'temporary', 'Temporary', jobSearchFilters.appointmentTypes)}
                {renderPillButton('appointmentTypes', 'detail', 'Detail/Rotational', jobSearchFilters.appointmentTypes)}
              </div>
            </div>

            {/* Work schedule */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Work schedule</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {renderPillButton('workSchedules', 'full-time', 'Full-time', jobSearchFilters.workSchedules)}
                {renderPillButton('workSchedules', 'part-time', 'Part-time', jobSearchFilters.workSchedules)}
                {renderPillButton('workSchedules', 'intermittent', 'Intermittent', jobSearchFilters.workSchedules)}
                {renderPillButton('workSchedules', 'shift', 'Shift work', jobSearchFilters.workSchedules)}
              </div>
            </div>

            {/* Grid: Promotion + Supervisory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Promotion potential</p>
                <Select
                  value={jobSearchFilters.promotionPotential || ''}
                  onValueChange={function (value) {
                    setJobSearchFilters({
                      promotionPotential: value ? (value as PromotionPotentialFilter) : null,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No promotion potential</SelectItem>
                    <SelectItem value="up-to-current">Up to my current grade</SelectItem>
                    <SelectItem value="at-or-above-target">At or above my target</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Supervisory status</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {renderPillButton('supervisoryStatuses', 'non-supervisory', 'Non-supervisory', jobSearchFilters.supervisoryStatuses)}
                  {renderPillButton('supervisoryStatuses', 'supervisory', 'Supervisory', jobSearchFilters.supervisoryStatuses)}
                  {renderPillButton('supervisoryStatuses', 'team-lead', 'Team lead', jobSearchFilters.supervisoryStatuses)}
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================
              SECTION CARD: LOCATION & TRAVEL
              ================================================================ */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold">Location & travel</h3>
              <div className="mt-1 h-0.5 w-10 bg-accent/40 rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Telework preference</p>
                <Select
                  value={jobSearchFilters.teleworkPreference || ''}
                  onValueChange={function (value) {
                    setJobSearchFilters({
                      teleworkPreference: value ? (value as TeleworkPreference) : null,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="remote-only">Remote only</SelectItem>
                    <SelectItem value="remote-or-telework">Remote or telework</SelectItem>
                    <SelectItem value="on-site-preferred">On-site preferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Travel requirements</p>
                <Select
                  value={jobSearchFilters.travelFrequency || ''}
                  onValueChange={function (value) {
                    setJobSearchFilters({
                      travelFrequency: value ? (value as TravelFrequency) : null,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="none">Little to no travel</SelectItem>
                    <SelectItem value="up-to-25">Up to 25%</SelectItem>
                    <SelectItem value="up-to-50">25-50%</SelectItem>
                    <SelectItem value="over-50">50%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ================================================================
              SECTION CARD: CLEARANCE & SENSITIVITY
              ================================================================ */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold">Clearance & sensitivity</h3>
              <div className="mt-1 h-0.5 w-10 bg-accent/40 rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Security clearance</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {renderPillButton('clearanceLevels', 'none', 'None required', jobSearchFilters.clearanceLevels)}
                  {renderPillButton('clearanceLevels', 'public-trust', 'Public Trust', jobSearchFilters.clearanceLevels)}
                  {renderPillButton('clearanceLevels', 'secret', 'Secret', jobSearchFilters.clearanceLevels)}
                  {renderPillButton('clearanceLevels', 'ts', 'Top Secret', jobSearchFilters.clearanceLevels)}
                  {renderPillButton('clearanceLevels', 'ts-sci', 'TS/SCI', jobSearchFilters.clearanceLevels)}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Position sensitivity</p>
                <Select
                  value={
                    jobSearchFilters.positionSensitivities &&
                    jobSearchFilters.positionSensitivities[0]
                      ? jobSearchFilters.positionSensitivities[0]
                      : ''
                  }
                  onValueChange={function (value) {
                    setJobSearchFilters({
                      positionSensitivities: value ? [value as PositionSensitivity] : [],
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-sensitive">Non-sensitive</SelectItem>
                    <SelectItem value="non-critical-sensitive">Non-critical sensitive</SelectItem>
                    <SelectItem value="critical-sensitive">Critical sensitive</SelectItem>
                    <SelectItem value="special-sensitive">Special sensitive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ================================================================
              SECTION CARD: HIRING PATHS
              ================================================================ */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold">Hiring paths & eligibility</h3>
              <div className="mt-1 h-0.5 w-10 bg-accent/40 rounded-full" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Hiring path</p>
              <p className="text-xs text-muted-foreground">Select paths you are eligible for.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {renderPillButton('hiringPaths', 'status', 'Federal employees (status)', jobSearchFilters.hiringPaths)}
                {renderPillButton('hiringPaths', 'veterans', 'Veterans', jobSearchFilters.hiringPaths)}
                {renderPillButton('hiringPaths', 'recent-graduates', 'Recent graduates', jobSearchFilters.hiringPaths)}
                {renderPillButton('hiringPaths', 'students', 'Students', jobSearchFilters.hiringPaths)}
                {renderPillButton('hiringPaths', 'public', 'Public', jobSearchFilters.hiringPaths)}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Internal vs external</p>
              <Select
                value={jobSearchFilters.internalExternal || ''}
                onValueChange={function (value) {
                  setJobSearchFilters({
                    internalExternal: value ? (value as InternalExternal) : null,
                  });
                }}
              >
                <SelectTrigger className="h-9 text-sm w-full lg:w-[240px]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency-only">Agency-only</SelectItem>
                  <SelectItem value="gov-wide">Gov-wide</SelectItem>
                  <SelectItem value="all-sources">All sources</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* ================================================================
              SECTION CARD: SERIES & EMPHASIS
              ================================================================ */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold">Series & emphasis</h3>
              <div className="mt-1 h-0.5 w-10 bg-accent/40 rounded-full" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Series codes</p>
              <p className="text-xs text-muted-foreground">Set via Series guide. Edit here if needed.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {jobSearchFilters.seriesCodes && jobSearchFilters.seriesCodes.length > 0 ? (
                  jobSearchFilters.seriesCodes.map(function (code) {
                    return (
                      <Badge
                        key={code}
                        variant="outline"
                        className="pl-2 pr-1 py-1 font-mono text-xs bg-background"
                      >
                        {code}
                        <button
                          type="button"
                          className="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          onClick={function () {
                            const next: string[] = [];
                            const arr = jobSearchFilters.seriesCodes || [];
                            for (let i = 0; i < arr.length; i++) {
                              if (arr[i] !== code) {
                                next.push(arr[i]);
                              }
                            }
                            setJobSearchFilters({ seriesCodes: next });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground italic">No series selected</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Qualification emphasis</p>
              <Select
                value={jobSearchFilters.qualificationEmphasis || 'any'}
                onValueChange={function (value) {
                  setJobSearchFilters({
                    qualificationEmphasis: value as QualificationEmphasis,
                  });
                }}
              >
                <SelectTrigger className="h-9 text-sm w-full lg:w-[280px]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="technical">Technical skills emphasis</SelectItem>
                  <SelectItem value="leadership">Leadership/management emphasis</SelectItem>
                  <SelectItem value="policy-analysis">Policy/analysis emphasis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* ================================================================
              SECTION CARD: PATHOS PREFERENCES
              ================================================================ */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold">PathOS preferences</h3>
              <p className="text-xs text-muted-foreground mt-1">Career-aware filters unique to PathOS.</p>
              <div className="mt-1 h-0.5 w-10 bg-accent/40 rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Career trajectory</p>
                <Select
                  value={jobSearchFilters.trajectoryPreference || 'any'}
                  onValueChange={function (value) {
                    setJobSearchFilters({
                      trajectoryPreference: value as TrajectoryPreference,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="lateral">Good for lateral move</SelectItem>
                    <SelectItem value="promotion">Good for promotion</SelectItem>
                    <SelectItem value="senior-track">Senior/SES track</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Retirement impact</p>
                <Select
                  value={jobSearchFilters.retirementImpactPreference || 'any'}
                  onValueChange={function (value) {
                    setJobSearchFilters({
                      retirementImpactPreference: value as RetirementImpactPreference,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="improve">Improve my readiness</SelectItem>
                    <SelectItem value="neutral">Neutral impact</SelectItem>
                    <SelectItem value="avoid-negative">Avoid negative impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <p className="text-sm font-medium">Compensation focus</p>
                <Select
                  value={jobSearchFilters.compensationFocus || 'balance'}
                  onValueChange={function (value) {
                    setJobSearchFilters({
                      compensationFocus: value as CompensationFocus,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm w-full lg:w-[320px]">
                    <SelectValue placeholder="Balance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maximize-salary">Maximize salary now</SelectItem>
                    <SelectItem value="balance">Balance salary and stability</SelectItem>
                    <SelectItem value="quality-of-life">Quality of life first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>

        {/*
          ========================================================================
          FOOTER CONTROL BAR (NON-SCROLLABLE)
          ========================================================================
          
          WHY "CONTROL BAR":
          - More visually distinct than a simple footer
          - Elevated background creates separation from scrollable content
          - Actions are always visible and reachable
          
          WHY bg-muted/50:
          - Subtle tinted background distinguishes from body
          - Not harsh enough to distract from content
          
          TRUST INDICATOR:
          - Shield icon + "stays on this device" builds user trust
          - Users want to know their filter data isn't uploaded
        */}
        <div className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 lg:p-6 border-t border-border/60 bg-muted/50 rounded-b-2xl">
          {/* Left: Save as default + trust indicator */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={saveAsDefault}
                onCheckedChange={function (value) {
                  setSaveAsDefault(Boolean(value));
                }}
              />
              <span className="text-foreground">Remember as my defaults</span>
            </label>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Filters stay on this device</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAdvanced}
              className="text-muted-foreground hover:text-foreground"
            >
              Reset all
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="bg-accent text-accent-foreground hover:bg-accent/90 min-w-[100px]"
            >
              Apply filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
