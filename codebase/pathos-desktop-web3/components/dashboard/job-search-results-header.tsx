/**
 * ============================================================================
 * JOB SEARCH RESULTS HEADER COMPONENT (Day 15)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays a header above the job results list showing:
 * - Total result count
 * - Sort control (by match, salary, date)
 * - Active filter chips with individual remove and "Clear all"
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used by the Job Search page above the results table
 * - Reads filter state from jobSearchStore
 * - Provides quick filter management without opening More Filters panel
 *
 * WHY THIS COMPONENT EXISTS:
 * First-principles UX: Users need to see at a glance what filters are active
 * and how many results match. This reduces cognitive load and helps users
 * understand why they are seeing specific results.
 *
 * @version Day 15 - Job Search First-Principles Refactor
 * ============================================================================
 */

'use client';

import { X, ArrowUpDown, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useJobSearchStore, type JobSearchFilters } from '@/store/jobSearchStore';

/**
 * Props for the JobSearchResultsHeader component.
 *
 * @property resultCount - Total number of jobs matching current filters
 * @property sortBy - Current sort field
 * @property onSortChange - Callback when sort changes
 */
interface JobSearchResultsHeaderProps {
  resultCount: number;
  sortBy: 'match' | 'salary' | 'date';
  onSortChange: (value: 'match' | 'salary' | 'date') => void;
}

/**
 * Represents a single active filter that can be displayed as a chip.
 *
 * @property key - The filter field name (e.g., 'location', 'gradeBand')
 * @property label - Human-readable label to display
 * @property value - The current filter value
 */
interface ActiveFilter {
  key: keyof JobSearchFilters;
  label: string;
  value: string;
}

/**
 * Maps location codes to display names.
 * Used to show human-readable location names in filter chips.
 */
const LOCATION_DISPLAY: Record<string, string> = {
  dc: 'Washington, DC',
  remote: 'Remote',
  tx: 'Texas',
  co: 'Colorado',
};

/**
 * Maps agency codes to display names.
 * Used to show human-readable agency names in filter chips.
 */
const AGENCY_DISPLAY: Record<string, string> = {
  dod: 'DoD',
  va: 'VA',
  usda: 'USDA',
  dhs: 'DHS',
};

/**
 * Maps grade band codes to display names.
 * Used to show human-readable grade names in filter chips.
 */
const GRADE_DISPLAY: Record<string, string> = {
  gs12: 'GS-12',
  gs13: 'GS-13',
  gs14: 'GS-14',
  gs15: 'GS-15',
};

/**
 * Converts a filter value to a human-readable display string.
 *
 * HOW IT WORKS:
 * 1. Check which filter key we are dealing with
 * 2. Look up the display name in the appropriate map
 * 3. Fall back to the raw value if no mapping exists
 *
 * @param key - The filter field name
 * @param value - The raw filter value
 * @returns Human-readable display string
 */
function getFilterDisplayValue(key: keyof JobSearchFilters, value: string): string {
  if (key === 'location') {
    return LOCATION_DISPLAY[value] || value;
  }
  if (key === 'agency') {
    return AGENCY_DISPLAY[value] || value;
  }
  if (key === 'gradeBand') {
    return GRADE_DISPLAY[value] || value;
  }
  if (key === 'segment') {
    // Capitalize first letter
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value;
}

/**
 * Extracts active filters from the current filter state.
 *
 * HOW IT WORKS:
 * 1. Get the current filter state from the store
 * 2. Check each filter field for non-empty/non-default values
 * 3. Build an array of ActiveFilter objects for display
 *
 * WHY NOT USE OBJECT.ENTRIES:
 * We need specific logic for each filter type (some are strings,
 * some are arrays, some have default values we should not show).
 *
 * @param filters - Current filter state from store
 * @returns Array of active filters to display as chips
 */
function extractActiveFilters(filters: JobSearchFilters): ActiveFilter[] {
  const active: ActiveFilter[] = [];

  // Check query (search text)
  if (filters.query && filters.query.trim() !== '') {
    active.push({
      key: 'query',
      label: 'Search',
      value: filters.query,
    });
  }

  // Check segment (only if not 'federal' which is default)
  if (filters.segment && filters.segment !== 'federal') {
    active.push({
      key: 'segment',
      label: 'Segment',
      value: getFilterDisplayValue('segment', filters.segment),
    });
  }

  // Check location
  if (filters.location) {
    active.push({
      key: 'location',
      label: 'Location',
      value: getFilterDisplayValue('location', filters.location),
    });
  }

  // Check grade band
  if (filters.gradeBand) {
    active.push({
      key: 'gradeBand',
      label: 'Grade',
      value: getFilterDisplayValue('gradeBand', filters.gradeBand),
    });
  }

  // Check agency
  if (filters.agency) {
    active.push({
      key: 'agency',
      label: 'Agency',
      value: getFilterDisplayValue('agency', filters.agency),
    });
  }

  // Check telework preference
  if (filters.teleworkPreference) {
    active.push({
      key: 'teleworkPreference',
      label: 'Telework',
      value: filters.teleworkPreference.split('-').join(' '),
    });
  }

  // Check travel frequency (only if not 'any' which is default)
  if (filters.travelFrequency && filters.travelFrequency !== 'any') {
    active.push({
      key: 'travelFrequency',
      label: 'Travel',
      value: filters.travelFrequency,
    });
  }

  return active;
}

/**
 * JobSearchResultsHeader Component
 *
 * Displays result count, sort control, and active filter chips.
 * Part of the first-principles UX redesign to reduce cognitive load.
 *
 * USAGE:
 * ```tsx
 * <JobSearchResultsHeader
 *   resultCount={jobs.length}
 *   sortBy={sortBy}
 *   onSortChange={setSortBy}
 * />
 * ```
 *
 * ACCESSIBILITY:
 * - Filter chips are buttons with clear labels
 * - Clear all has explicit aria-label
 * - Sort dropdown uses native select semantics
 */
export function JobSearchResultsHeader(props: JobSearchResultsHeaderProps) {
  // ============================================================================
  // PROPS EXTRACTION
  // ============================================================================
  const resultCount = props.resultCount;
  const sortBy = props.sortBy;
  const onSortChange = props.onSortChange;

  // ============================================================================
  // STORE ACCESS
  // ============================================================================
  const jobSearchFilters = useJobSearchStore(function (state) {
    return state.jobSearchFilters;
  });
  const setJobSearchFilters = useJobSearchStore(function (state) {
    return state.setJobSearchFilters;
  });
  const resetJobSearchFilters = useJobSearchStore(function (state) {
    return state.resetJobSearchFilters;
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const activeFilters = extractActiveFilters(jobSearchFilters);
  const hasActiveFilters = activeFilters.length > 0;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Removes a single filter when user clicks the X on a chip.
   *
   * HOW IT WORKS:
   * 1. Determine the appropriate "clear" value for this filter type
   * 2. Call setJobSearchFilters with that field set to null/default
   *
   * @param filterKey - The filter field to clear
   */
  function handleRemoveFilter(filterKey: keyof JobSearchFilters) {
    // For segment, reset to 'federal' (the default)
    if (filterKey === 'segment') {
      setJobSearchFilters({ segment: 'federal' });
      return;
    }
    // For query, set to empty string
    if (filterKey === 'query') {
      setJobSearchFilters({ query: '' });
      return;
    }
    // For other filters, set to null to clear
    const update: Partial<JobSearchFilters> = {};
    (update as Record<string, unknown>)[filterKey] = null;
    setJobSearchFilters(update);
  }

  /**
   * Clears all active filters when user clicks "Clear all".
   *
   * HOW IT WORKS:
   * Calls resetJobSearchFilters which resets to defaults.
   */
  function handleClearAll() {
    resetJobSearchFilters();
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="flex flex-col gap-2 mb-3">
      {/* Top row: Result count and sort */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{resultCount}</span>
          {' '}
          {resultCount === 1 ? 'position' : 'positions'} found
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          <Select
            value={sortBy}
            onValueChange={function (value) {
              onSortChange(value as 'match' | 'salary' | 'date');
            }}
          >
            <SelectTrigger className="w-[120px] h-7 text-xs bg-transparent border-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match" className="text-xs">Best match</SelectItem>
              <SelectItem value="salary" className="text-xs">Highest salary</SelectItem>
              <SelectItem value="date" className="text-xs">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ================================================================
          ACTIVE FILTER CHIPS AND CLEAR ALL (Day 15 Session 5)
          ================================================================
          
          DAY 15 SESSION 5 CHANGES:
          - Clear all button is now ALWAYS visible (not hidden when no filters)
          - Clear all is DISABLED when no filters are applied
          - Added "No filters applied" placeholder text when empty
          - Added X icon to Clear all button for visual affordance
          - Added tooltip when disabled: "No filters to clear"
          
          WHY ALWAYS VISIBLE:
          Users can see the action is available, understand where to find it,
          and know instantly whether filters are active (button enabled/disabled).
          
          WHY "NO FILTERS APPLIED" TEXT:
          User feedback indicated the chip row felt "invisible" when empty.
          The placeholder text provides visual confirmation that the row exists
          and that no filters are currently active.
          ================================================================ */}
      <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
        {/* Show active filter chips when filters are applied */}
        {activeFilters.map(function (filter) {
          return (
            <Badge
              key={filter.key}
              variant="secondary"
              className="text-xs flex items-center gap-1 pr-1"
            >
              <span className="text-muted-foreground">{filter.label}:</span>
              <span>{filter.value}</span>
              <button
                type="button"
                onClick={function () {
                  handleRemoveFilter(filter.key);
                }}
                className="ml-0.5 p-0.5 rounded-full hover:bg-accent/50 transition-colors"
                aria-label={'Remove ' + filter.label + ' filter'}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          );
        })}
        
        {/* "No filters applied" placeholder when no active filters */}
        {!hasActiveFilters && (
          <span className="text-xs text-muted-foreground/60 italic">
            No filters applied
          </span>
        )}
        
        {/* Clear all button with tooltip when disabled */}
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Wrapper span needed for tooltip on disabled button */}
            <span className="inline-flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={
                  'h-6 text-xs gap-1 ' +
                  (hasActiveFilters
                    ? 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
                    : 'text-muted-foreground/50 cursor-not-allowed border border-dashed border-muted-foreground/20')
                }
                onClick={handleClearAll}
                disabled={!hasActiveFilters}
                aria-label="Clear all filters"
              >
                <XCircle className="w-3 h-3" />
                Clear all
              </Button>
            </span>
          </TooltipTrigger>
          {/* Only show tooltip when disabled */}
          {!hasActiveFilters && (
            <TooltipContent>
              <p>No filters to clear</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
