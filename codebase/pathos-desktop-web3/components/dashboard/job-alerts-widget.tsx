/**
 * ============================================================================
 * JOB ALERTS WIDGET (Day 15 Session 9 - Rename to "New matches")
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays job matches and saved searches/alerts in a compact widget format.
 * Used on the Job Search page to show new job matches and manage alerts.
 *
 * DAY 15 SESSION 9 CHANGES:
 * - Renamed "Job alerts" card to "New matches" for clarity
 * - Updated subtitle to explain what new matches represent
 * - Updated empty state copy to be truthful and useful
 * - Added "Manage alerts" CTA that scrolls to Saved searches section
 * - Renamed "Saved searches" to "Saved searches & alerts"
 * - Added helper text explaining that saved searches power alerts
 * - Changed anchor id from "saved-searches-section" to "saved-searches"
 *
 * DAY 15 PREVIOUS CHANGES:
 * - Enhanced empty state with actionable "Turn on alerts" CTA
 * - Clear explanation of what alerts require (saved search)
 * - Improved visual hierarchy and guidance
 *
 * DAY 12 CHANGES:
 * - Uses canonical field names from JobAlertItem
 * - gradeLevel (was grade)
 * - organizationName (was agency)
 * - locationDisplay (was location)
 * - matchPercent (was match)
 * - estimatedCompDisplay (was estComp)
 *
 * WHY THIS FILE EXISTS:
 * The job alerts widget provides two distinct but related surfaces:
 * 1. "New matches" - Shows job-level items that matched saved searches
 * 2. "Saved searches & alerts" - Where users manage their alerts
 *
 * This separation helps users understand:
 * - New matches = job items (the results of alerts)
 * - Saved searches = where alerts are created/managed
 *
 * @version Day 15 Session 9 - Rename to "New matches"
 * ============================================================================
 */

'use client';

/**
 * ============================================================================
 * JOB ALERTS WIDGET (Day 15 Session 9 - UX Clarity Update)
 * ============================================================================
 *
 * SESSION HISTORY:
 *
 * DAY 15 SESSION 9 CHANGES:
 * - Renamed "Job alerts" → "New matches" for clarity
 * - Saved searches section renamed to "Saved searches & alerts"
 * - Added "Manage alerts" button in empty state
 * - Updated all copy to clarify the relationship between matches and alerts
 *
 * DAY 15 SESSION 5 CHANGES:
 * - Changed alert channel default to 'email' (Tier 1 retention strategy)
 * - Fixed effect comment to accurately describe "fetch on mount" behavior
 * - Fixed dropdown value to show 'off' when alerts.enabled=false
 * - Added toast confirmation when deleting a saved search
 * - Replaced ?? operators with explicit null checks per house rules
 *
 * DAY 15 SESSION 8 CHANGES:
 * - Implemented lastSeenAt mechanism for "new" badge correctness
 * - "New" count is now computed from stored alertsLastSeenAt timestamps
 * - Mark alerts as seen when user clicks on an alert
 * - Uses getNewAlertsCount() from store instead of mock totalNew
 *
 * @version Day 15 Session 9
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { Bell, Bookmark, Trash2, BellPlus, Info, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { useJobAlertsStore } from '@/store/jobAlertsStore';
import { SensitiveValue } from '@/components/sensitive-value';

interface JobAlertsWidgetProps {
  onOpenWorkspace: () => void;
}

export function JobAlertsWidget(props: JobAlertsWidgetProps) {
  const onOpenWorkspace = props.onOpenWorkspace;

  const jobAlerts = useJobSearchStore(function (state) {
    return state.jobAlerts;
  });
  const fetchJobAlerts = useJobSearchStore(function (state) {
    return state.fetchJobAlerts;
  });
  const savedJobSearches = useJobSearchStore(function (state) {
    return state.savedJobSearches;
  });
  const applySavedJobSearch = useJobSearchStore(function (state) {
    return state.applySavedJobSearch;
  });
  const setActiveSavedSearchId = useJobSearchStore(function (state) {
    return state.setActiveSavedSearchId;
  });
  const updateSavedJobSearch = useJobSearchStore(function (state) {
    return state.updateSavedJobSearch;
  });
  const deleteSavedJobSearch = useJobSearchStore(function (state) {
    return state.deleteSavedJobSearch;
  });
  
  /**
   * DAY 15: Get the new alerts count computed from lastSeenAt.
   * This replaces the mock totalNew count with real stored state.
   */
  const getNewAlertsCount = useJobSearchStore(function (state) {
    return state.getNewAlertsCount;
  });
  const markAlertsAsSeen = useJobSearchStore(function (state) {
    return state.markAlertsAsSeen;
  });
  
  /**
   * DAY 15 SESSION 7: Get current filters and save action for one-click alert setup.
   */
  const jobSearchFilters = useJobSearchStore(function (state) {
    return state.jobSearchFilters;
  });
  const saveSearchWithAlerts = useJobSearchStore(function (state) {
    return state.saveSearchWithAlerts;
  });

  const globalHide = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  // ============================================================================
  // JOB ALERTS STORE (Day 20 Fix)
  // ============================================================================
  /**
   * Connect to jobAlertsStore to create actual alert rules.
   *
   * DAY 20 FIX:
   * Previously, "Save this search & enable alerts" only created a saved search.
   * The Alerts Center page reads from jobAlertsStore, so alerts were invisible.
   * Now we also create an alert rule in jobAlertsStore that persists to
   * pathos-job-alerts localStorage key and appears in the Alerts Center.
   */
  const createAlertInStore = useJobAlertsStore(function (state) {
    return state.createAlert;
  });
  const loadJobAlertsFromStorage = useJobAlertsStore(function (state) {
    return state.loadFromStorage;
  });
  const isJobAlertsLoaded = useJobAlertsStore(function (state) {
    return state.isLoaded;
  });

  /**
   * Access toast notification system for delete confirmation.
   * DAY 15 SESSION 5: Added to provide feedback when deleting saved searches.
   */
  const toastApi = useToast();

  /**
   * Effect: Fetch job alerts on component mount.
   * 
   * DAY 15 SESSION 5 FIX:
   * The previous comment said "fetch on mount and when saved searches change"
   * but the effect only has fetchJobAlerts as a dependency (which is stable).
   * 
   * DESIGN DECISION:
   * We only fetch on mount. If the user wants fresh data after saving a search,
   * they can refresh the page or we could add a manual refresh button.
   * This keeps the effect simple and predictable.
   * 
   * WHY NOT REFETCH ON SAVED SEARCHES CHANGE:
   * - savedJobSearches is a local state, not server data
   * - Job alerts come from a simulated API that doesn't know about local saves
   * - Refetching would just get the same mock data
   */
  useEffect(
    function fetchAlertsOnMount() {
      fetchJobAlerts();
    },
    [fetchJobAlerts],
  );

  /**
   * Effect: Load job alerts from localStorage on mount (Day 20 Fix).
   * Ensures jobAlertsStore is hydrated before we try to create alerts.
   */
  useEffect(
    function loadJobAlertsOnMount() {
      if (!isJobAlertsLoaded) {
        loadJobAlertsFromStorage();
      }
    },
    [isJobAlertsLoaded, loadJobAlertsFromStorage],
  );

  // Check if any saved search has alerts enabled
  let hasAlertsEnabled = false;
  for (let i = 0; i < savedJobSearches.length; i++) {
    const search = savedJobSearches[i];
    if (search.alerts && search.alerts.enabled) {
      hasAlertsEnabled = true;
      break;
    }
  }

  /**
   * DAY 15: Compute the new alerts count from stored lastSeenAt timestamps.
   * 
   * HOW IT WORKS:
   * The store compares each alert item's createdAt to the saved search's
   * alertsLastSeenAt. Items created after lastSeenAt are counted as new.
   * 
   * WHY COMPUTED:
   * - "New" is derived state based on real stored timestamps
   * - Not hardcoded mock data
   * - Updates automatically when alerts are marked as seen
   */
  const computedNewCount = (function computeNewCount(): number {
    // Only compute if alerts are enabled
    if (!hasAlertsEnabled) {
      return 0;
    }
    return getNewAlertsCount();
  })();

  // ============================================================================
  // LOCAL STATE (Day 15)
  // ============================================================================
  // showAlertSetup: Controls visibility of the inline alert setup form
  const [showAlertSetup, setShowAlertSetup] = useState(false);

 /**
 * Handles clicking on an alert job item.
 *
 * DAY 15: Marks alerts as seen for the associated saved search (scoped),
 * so only that search’s "new" count is cleared.
 */
const handleAlertClick = function (savedSearchId: string) {
  if (savedSearchId) {
    setActiveSavedSearchId(savedSearchId);
    applySavedJobSearch(savedSearchId);

    // ✅ scoped: only this saved search
    markAlertsAsSeen(savedSearchId);
  }

  onOpenWorkspace();
};

  /**
   * Handles "Turn on alerts" button click.
   *
   * HOW IT WORKS:
   * - If user has saved searches, show the inline setup form
   * - If no saved searches, prompt them to save a search first
   */
  function handleTurnOnAlerts() {
    if (savedJobSearches.length > 0) {
      setShowAlertSetup(true);
    } else {
      // No saved searches, guide user to save one first
      onOpenWorkspace();
    }
  }

  /**
   * Enables alerts for a saved search with the selected frequency.
   *
   * DAY 15 SESSION 5:
   * Changed channel default from 'in-app' to 'email' per Tier 1 retention
   * strategy. Tier 1 users get high-signal email digests (daily or weekly).
   *
   * @param searchId - The saved search to enable alerts for
   * @param frequency - 'daily' or 'weekly'
   */
  function handleEnableAlert(searchId: string, frequency: 'daily' | 'weekly') {
    updateSavedJobSearch(searchId, {
      alerts: {
        enabled: true,
        frequency: frequency,
        minMatch: 80,
        channel: 'email', // DAY 15 FIX: Tier 1 = email digests, not in-app
      },
    });
    setShowAlertSetup(false);
  }

  // ============================================================================
  // DAY 15 SESSION 7: One-click "Save this search & enable alerts"
  // ============================================================================

  /**
   * Checks if the current search has any meaningful filters applied.
   * 
   * HOW IT WORKS:
   * A search is considered "empty" if:
   * - No query text
   * - No location filter
   * - No grade filter
   * - No agency filter
   * - Default segment (federal)
   * 
   * We only check basic filters since advanced filters are less common.
   * 
   * @returns true if search is empty, false if has meaningful filters
   */
  function isCurrentSearchEmpty(): boolean {
    // Check query
    if (jobSearchFilters.query !== undefined && jobSearchFilters.query !== null && jobSearchFilters.query.trim() !== '') {
      return false;
    }
    
    // Check location
    if (jobSearchFilters.location !== undefined && jobSearchFilters.location !== null && jobSearchFilters.location !== '') {
      return false;
    }
    
    // Check grade
    if (jobSearchFilters.gradeBand !== undefined && jobSearchFilters.gradeBand !== null && jobSearchFilters.gradeBand !== '') {
      return false;
    }
    
    // Check agency
    if (jobSearchFilters.agency !== undefined && jobSearchFilters.agency !== null && jobSearchFilters.agency !== '') {
      return false;
    }
    
    // Check series codes
    if (jobSearchFilters.seriesCodes !== undefined && jobSearchFilters.seriesCodes !== null && jobSearchFilters.seriesCodes.length > 0) {
      return false;
    }
    
    // All basic filters are empty/default
    return true;
  }

  /**
   * Generates a label for the current search based on applied filters.
   * 
   * @returns Human-readable label for the search
   */
  function generateSearchLabel(): string {
    const parts: string[] = [];
    
    // Add segment (but not if federal since that's default)
    if (jobSearchFilters.segment !== 'federal') {
      parts.push(jobSearchFilters.segment.charAt(0).toUpperCase() + jobSearchFilters.segment.slice(1));
    }
    
    // Add query if present
    if (jobSearchFilters.query !== undefined && jobSearchFilters.query !== null && jobSearchFilters.query.trim() !== '') {
      const queryShort = jobSearchFilters.query.length > 20
        ? jobSearchFilters.query.substring(0, 20) + '...'
        : jobSearchFilters.query;
      parts.push('"' + queryShort + '"');
    }
    
    // Add grade if present
    if (jobSearchFilters.gradeBand !== undefined && jobSearchFilters.gradeBand !== null && jobSearchFilters.gradeBand !== '') {
      parts.push(jobSearchFilters.gradeBand.toUpperCase());
    }
    
    // Add location if present
    if (jobSearchFilters.location !== undefined && jobSearchFilters.location !== null && jobSearchFilters.location !== '') {
      parts.push(jobSearchFilters.location.toUpperCase());
    }
    
    if (parts.length === 0) {
      return 'All federal jobs';
    }
    
    return parts.join(' • ');
  }

  /**
   * Handles the one-click "Save this search & enable alerts" action.
   *
   * DAY 20 FIX: This function now creates an alert in BOTH stores:
   * 1. jobSearchStore (saved search with alerts) - for quick filters/navigation
   * 2. jobAlertsStore (alert rule) - for Alerts Center display and matching
   *
   * HOW IT WORKS:
   * 1. Generate a label from current filters
   * 2. Save the search with weekly alerts enabled (jobSearchStore)
   * 3. Also create an alert rule in jobAlertsStore (Day 20 fix)
   * 4. Show success toast
   *
   * DAY 15 SESSION 7 ADDITION, DAY 20 FIX.
   */
  function handleSaveSearchWithAlerts() {
    const label = generateSearchLabel();

    const newSearch = saveSearchWithAlerts(label, 'weekly');

    if (newSearch !== null) {
      // ======================================================================
      // DAY 20 FIX: Also create alert rule in jobAlertsStore
      // ======================================================================
      // The Alerts Center page reads from jobAlertsStore, so we must create
      // an alert rule there for it to appear. We derive keywords from filters.
      // ======================================================================

      // Derive keywords from query filter
      let alertKeywords = '';
      if (jobSearchFilters.query !== undefined && jobSearchFilters.query !== null && jobSearchFilters.query.trim() !== '') {
        alertKeywords = jobSearchFilters.query.trim();
      } else {
        // Use label as fallback for keywords
        alertKeywords = label;
      }

      // Determine grade band from filters
      let gradeBand: string | null = null;
      if (jobSearchFilters.gradeBand !== undefined && jobSearchFilters.gradeBand !== null && jobSearchFilters.gradeBand !== '') {
        gradeBand = jobSearchFilters.gradeBand;
      }

      // Determine series (if any series codes are set, use the first one)
      let series: string | null = null;
      if (jobSearchFilters.seriesCodes !== undefined && jobSearchFilters.seriesCodes !== null && jobSearchFilters.seriesCodes.length > 0) {
        series = jobSearchFilters.seriesCodes[0];
      }

      // Determine location
      let location: string | null = null;
      if (jobSearchFilters.location !== undefined && jobSearchFilters.location !== null && jobSearchFilters.location !== '') {
        location = jobSearchFilters.location;
      }

      // Determine if remote-only based on telework filter
      let isRemote = false;
      if (jobSearchFilters.teleworkPreference !== undefined && jobSearchFilters.teleworkPreference !== null) {
        const teleworkLower = jobSearchFilters.teleworkPreference.toLowerCase();
        isRemote = teleworkLower.indexOf('remote') !== -1;
      }

      // Create the alert draft
      const alertDraft = {
        name: label,
        enabled: true,
        frequency: 'weekly' as const,
        keywords: alertKeywords,
        series: series,
        gradeBand: gradeBand,
        location: location,
        remoteOnly: isRemote,
      };

      // Create the alert rule in jobAlertsStore - persists to pathos-job-alerts
      const createdAlert = createAlertInStore(alertDraft);

      toastApi.toast({
        title: 'Search saved with alerts enabled',
        description: 'Tracking matches in your Alerts tab. ID: ' + createdAlert.id,
      });
    } else {
      toastApi.toast({
        title: 'Search already exists',
        description: 'You already have a saved search with these filters.',
      });
    }
  }

  return (
    <>
      <Card className="mt-3 border-border bg-card/80">
        <CardHeader className="py-3">
          {/* ================================================================
              NEW MATCHES HEADER (Day 15 Session 9)
              ================================================================
              
              WHY "NEW MATCHES" INSTEAD OF "JOB ALERTS":
              Users were confused because "Job alerts" sounded like it should
              show the alerts they created, but it actually shows new job items.
              
              The rename clarifies:
              - "New matches" = job-level items (results of alerts)
              - "Saved searches & alerts" = where alerts are managed
              ================================================================ */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">New matches</p>
                <p className="text-xs text-muted-foreground">
                  Jobs that matched your saved searches since you last checked.
                </p>
              </div>
            </div>
            {/* ================================================================
                NEW BADGE (Day 15 - Only show when alerts are enabled)
                ================================================================
                
                DAY 15 FIX:
                The "new" badge should ONLY appear when the user has alerts enabled.
                Otherwise, showing "X new" when alerts are off is misleading.
                
                WHY THIS MATTERS:
                Users expect the badge to mean "new jobs since last check via alerts"
                not just "new jobs matching your search criteria."
                
                DAY 15 SESSION 8:
                Now uses computedNewCount from lastSeenAt mechanism instead of
                mock totalNew constant. The count is derived from stored state.
                ================================================================ */}
            {hasAlertsEnabled && computedNewCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                {computedNewCount} new
              </span>
            )}
          </div>
        </CardHeader>

        {/* ================================================================
            EMPTY STATE: No alerts enabled (Day 15 Session 7 enhancement)
            ================================================================
            
            DAY 15 SESSION 7 CHANGES:
            - Added one-click "Save this search & enable alerts" CTA
            - CTA is disabled/shows hint when current search is empty
            - Improved guidance and explanation
            ================================================================ */}
        {!hasAlertsEnabled ? (
          <CardContent className="py-3 space-y-3">
            {/* ONE-CLICK "SAVE THIS SEARCH & ENABLE ALERTS" (Day 15 Session 7) */}
            {!showAlertSetup && (
              <div className="space-y-2">
                {isCurrentSearchEmpty() ? (
                  // Current search is empty - show hint
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1 opacity-50"
                          disabled
                        >
                          <Zap className="h-3 w-3" />
                          Save this search & enable alerts
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Run a search or apply filters first</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  // Current search has filters - show active CTA
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="w-full text-xs gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={handleSaveSearchWithAlerts}
                  >
                    <Zap className="h-3 w-3" />
                    Save this search & enable alerts
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground text-center">
                  Saves current search criteria and enables weekly email digest.
                </p>
              </div>
            )}

            {/* Inline alert setup form - for existing saved searches */}
            {showAlertSetup && savedJobSearches.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Choose a saved search and frequency:
                </p>
                {savedJobSearches.slice(0, 3).map(function (search) {
                  return (
                    <div
                      key={search.id}
                      className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded-lg px-2 py-2"
                    >
                      <span className="truncate font-medium">{search.name}</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={function () {
                            handleEnableAlert(search.id, 'weekly');
                          }}
                        >
                          Weekly
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={function () {
                            handleEnableAlert(search.id, 'daily');
                          }}
                        >
                          Daily
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={function () {
                    setShowAlertSetup(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                {/* Default empty state with CTA */}
                <div className="text-center space-y-2">
                  <BellPlus className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    {savedJobSearches.length === 0
                      ? 'Save a search first, then turn on alerts to track new matches.'
                      : 'Turn on alerts to track when new jobs match your saved searches.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={handleTurnOnAlerts}
                  >
                    <Bell className="h-3 w-3" />
                    {savedJobSearches.length === 0 ? 'Save a search first' : 'Turn on alerts'}
                  </Button>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded p-2">
                  <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span>
                    Alerts track matches locally (daily or weekly). Email delivery coming in a future release.
                  </span>
                </div>
              </>
            )}
          </CardContent>
        ) : computedNewCount === 0 ? (
          /* ================================================================
             EMPTY STATE: Alerts enabled but no new matches (Day 15 Session 9)
             ================================================================
             
             WHY THIS COPY:
             When the user has alerts enabled but there are no new matches,
             we want to:
             1. Reassure them that the system is working
             2. Explain where matches come from (saved searches)
             3. Provide a clear path to manage their alerts
             
             THE "MANAGE ALERTS" CTA:
             Scrolls to the saved searches section so users can:
             - Adjust alert frequency
             - Add/remove saved searches
             - See which searches power their alerts
             ================================================================ */
          <CardContent className="py-3 space-y-2">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Bell className="h-4 w-4 text-emerald-500/50 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>No new matches yet. New jobs will appear here when they match your saved searches.</p>
                <p className="text-[10px]">Manage your alerts below to adjust frequency or add new searches.</p>
              </div>
            </div>
            {/* ================================================================
                MANAGE ALERTS CTA (Day 15 Session 9)
                ================================================================
                
                HOW IT WORKS:
                - Clicking scrolls smoothly to the #saved-searches section
                - Uses document.getElementById inside click handler for SSR safety
                - scrollIntoView with smooth behavior for better UX
                
                WHY SSR-SAFE:
                We only access `document` inside the click handler, not at render
                time. This prevents hydration mismatches in Next.js.
                ================================================================ */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1"
              onClick={function handleManageAlertsClick() {
                // SSR-safe: only access document inside the click handler
                const savedSearchesSection = document.getElementById('saved-searches');
                if (savedSearchesSection !== null && savedSearchesSection !== undefined) {
                  savedSearchesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              <Bookmark className="h-3 w-3" />
              Manage alerts
            </Button>
          </CardContent>
        ) : (
          <CardContent className="py-3 space-y-2">
            {/* Job alert items - Updated for canonical fields (Day 12, Day 15 Session 5) */}
            {jobAlerts.items.slice(0, 3).map(function (alert) {
              /**
               * DAY 15 SESSION 5 FIX:
               * Replaced ?? operators with explicit null/undefined checks
               * per house rules (avoid nullish coalescing).
               * 
               * Uses canonical field names with fallback to legacy for compatibility.
               */
              let gradeLevel = '';
              if (alert.gradeLevel !== undefined && alert.gradeLevel !== null && alert.gradeLevel !== '') {
                gradeLevel = alert.gradeLevel;
              } else if (alert.grade !== undefined && alert.grade !== null && alert.grade !== '') {
                gradeLevel = alert.grade;
              }
              
              let orgName = '';
              if (alert.organizationName !== undefined && alert.organizationName !== null && alert.organizationName !== '') {
                orgName = alert.organizationName;
              } else if (alert.agency !== undefined && alert.agency !== null && alert.agency !== '') {
                orgName = alert.agency;
              }
              
              let location = '';
              if (alert.locationDisplay !== undefined && alert.locationDisplay !== null && alert.locationDisplay !== '') {
                location = alert.locationDisplay;
              } else if (alert.location !== undefined && alert.location !== null && alert.location !== '') {
                location = alert.location;
              }
              
              let matchPct = 0;
              if (alert.matchPercent !== undefined && alert.matchPercent !== null) {
                matchPct = alert.matchPercent;
              } else if (alert.match !== undefined && alert.match !== null) {
                matchPct = alert.match;
              }
              
              let compDisplay = '';
              if (alert.estimatedCompDisplay !== undefined && alert.estimatedCompDisplay !== null && alert.estimatedCompDisplay !== '') {
                compDisplay = alert.estimatedCompDisplay;
              } else if (alert.estComp !== undefined && alert.estComp !== null && alert.estComp !== '') {
                compDisplay = alert.estComp;
              }

              return (
                <button
                  key={alert.id}
                  className="w-full flex items-center justify-between gap-3 text-left text-xs hover:bg-accent/40 rounded-lg px-2 py-1.5 transition-colors"
                  onClick={function () {
                    handleAlertClick(alert.savedSearchId);
                  }}
                >
                  <div className="truncate min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{alert.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {gradeLevel} &bull; {orgName} &bull; {location} &bull; from{' '}
                      {alert.savedSearchName}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                      {matchPct}%
                    </span>
                    {compDisplay && (
                      <SensitiveValue
                        value={compDisplay}
                        masked="$•••,•••"
                        hide={globalHide}
                        className="text-[11px] text-muted-foreground"
                      />
                    )}
                  </div>
                </button>
              );
            })}
            {/* DAY 15: Updated to use items.length since totalNew may differ from computed count */}
            {jobAlerts.items.length > 3 && (
              <Button variant="link" className="px-0 text-xs h-auto" onClick={onOpenWorkspace}>
                View all {jobAlerts.items.length} alerts
              </Button>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              Alerts are based on public job postings and your saved searches. Always review the
              full announcement on the official site before applying.
            </p>
          </CardContent>
        )}
      </Card>

      {/* ================================================================
          SAVED SEARCHES & ALERTS SECTION (Day 15 Session 9)
          ================================================================
          
          WHY "SAVED SEARCHES & ALERTS":
          This section is where users manage their alerts. The rename makes
          it clear that:
          - Saved searches power alerts
          - This is the alert management surface
          
          ANCHOR ID "saved-searches":
          The "Manage alerts" button in the empty state scrolls here.
          We use a simple id so the smooth scroll works correctly.
          ================================================================ */}
      {savedJobSearches.length > 0 && (
        <Card id="saved-searches" className="mt-3 border-border bg-card/80">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Saved searches & alerts</p>
                <p className="text-xs text-muted-foreground">
                  {savedJobSearches.length} saved{' '}
                  {savedJobSearches.length === 1 ? 'search' : 'searches'} &bull; Choose Daily/Weekly to track matches
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-3 space-y-2">
            {savedJobSearches.map(function (search) {
              /**
               * DAY 15 SESSION 5 FIX:
               * The dropdown value must show 'off' when alerts.enabled=false,
               * even if frequency is set to 'daily' or 'weekly'.
               * 
               * Previously: showed frequency regardless of enabled state
               * Now: shows 'off' when enabled=false, frequency when enabled=true
               */
              let alertFrequency = 'off';
              if (search.alerts !== undefined && search.alerts !== null) {
                // Only show the frequency if alerts are actually enabled
                if (search.alerts.enabled === true && search.alerts.frequency) {
                  alertFrequency = search.alerts.frequency;
                }
                // If enabled=false, keep alertFrequency as 'off'
              }

              return (
                <div
                  key={search.id}
                  className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 hover:bg-accent/20 transition-colors"
                >
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={function () {
                      applySavedJobSearch(search.id);
                      onOpenWorkspace();
                    }}
                  >
                    <p className="font-medium text-sm truncate">{search.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Created{' '}
                      {search.createdAt
                        ? new Date(search.createdAt).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {search.filters.segment} – {search.filters.query ? search.filters.query : 'All keywords'}
                    </p>
                  </button>
                  {/* ================================================================
                      RIGHT-SIDE CONTROLS CONTAINER (Day 15 - Fix truncation)
                      ================================================================
                      
                      min-w-[140px] ensures the dropdown + delete button have room.
                      flex-shrink-0 prevents the container from collapsing.
                      ================================================================ */}
                  <div className="flex items-center gap-1 flex-shrink-0 min-w-[140px]">
                    {/* ================================================================
                        FREQUENCY DROPDOWN (Day 15 - Fix truncation)
                        ================================================================
                        
                        PROBLEM:
                        The original w-[72px] was too narrow to display "Weekly" fully.
                        Text was truncating to "Weel" or similar.
                        
                        FIX:
                        - Changed from fixed width (w-[72px]) to minimum width (min-w-[110px])
                        - Added whitespace-nowrap to prevent text wrapping
                        - Added justify-between for proper label/icon alignment
                        - Responsive: min-w-[110px] on mobile, min-w-[120px] on sm screens
                        
                        WHY MIN-WIDTH INSTEAD OF FIXED WIDTH:
                        Min-width allows the dropdown to grow if needed (e.g., localization)
                        while ensuring "Weekly" never truncates.
                        ================================================================ */}
                    <Select
                      value={alertFrequency}
                      onValueChange={function (value: string) {
                        /**
                         * Build the new alerts config.
                         * 
                         * DAY 15 SESSION 5:
                         * - Changed default channel to 'email' (Tier 1 retention)
                         * - Replaced || operators with explicit checks
                         */
                        let minMatchValue = 80;
                        let channelValue: 'in-app' | 'email' = 'email';
                        
                        if (search.alerts !== undefined && search.alerts !== null) {
                          if (search.alerts.minMatch !== undefined && search.alerts.minMatch !== null) {
                            minMatchValue = search.alerts.minMatch;
                          }
                          if (search.alerts.channel !== undefined && search.alerts.channel !== null) {
                            channelValue = search.alerts.channel;
                          }
                        }
                        
                        const newAlerts: {
                          enabled: boolean;
                          frequency: 'off' | 'daily' | 'weekly';
                          minMatch: number;
                          channel: 'in-app' | 'email';
                        } = {
                          enabled: value !== 'off',
                          frequency: value as 'off' | 'daily' | 'weekly',
                          minMatch: minMatchValue,
                          channel: channelValue,
                        };
                        
                        updateSavedJobSearch(search.id, {
                          alerts: newAlerts,
                        });
                      }}
                    >
                      <SelectTrigger className="h-6 min-w-[110px] sm:min-w-[120px] text-[10px] bg-transparent border-border whitespace-nowrap justify-between">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off" className="text-xs">
                          Off
                        </SelectItem>
                        <SelectItem value="weekly" className="text-xs">
                          Weekly
                        </SelectItem>
                        <SelectItem value="daily" className="text-xs">
                          Daily
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={function () {
                        /**
                         * DAY 15 SESSION 5:
                         * Added toast confirmation when deleting a saved search.
                         * This provides clear feedback that the action completed.
                         */
                        const searchName = search.name;
                        deleteSavedJobSearch(search.id);
                        toastApi.toast({
                          title: 'Saved search deleted',
                          description: '"' + searchName + '" has been removed.',
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}
