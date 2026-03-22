/**
 * ============================================================================
 * JOB SEARCH WORKSPACE DIALOG (Day 12 - Canonical Model Update)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component provides the main job search interface as a modal dialog.
 * It displays job search results, filters, saved searches, and job details.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌───────────────────────────┐
 * │   THIS FILE (UI Layer)   │
 * │  Job Search Workspace    │
 * └───────────────────────────┘
 *           │
 *           ▼ reads/writes via selectors and actions
 * ┌───────────────────────────┐
 * │   Zustand Stores         │
 * │  - jobSearchStore        │
 * │  - profileStore          │
 * │  - userPreferencesStore  │
 * └───────────────────────────┘
 *           │
 *           ▼ API calls (via store actions)
 * ┌───────────────────────────┐
 * │   API Layer              │
 * │  lib/api/job-search.ts   │
 * └───────────────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Display job search results in a table format
 * 2. Provide filter controls (basic and advanced)
 * 3. Manage saved searches (save, apply, delete)
 * 4. Show job details when a job is selected
 * 5. Handle loading and error states gracefully
 *
 * DAY 12 CHANGES - CANONICAL MODEL INTEGRATION:
 * ============================================================================
 * This component now uses canonical field names from JobCardModel:
 * - title (was: role)
 * - organizationName (was: agency)
 * - gradeLevel (was: grade)
 * - seriesCode (was: series)
 * - locationDisplay (was: location)
 * - estimatedTotalComp (was: estTotalComp)
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Building2,
  Briefcase,
  Filter,
  X,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Sparkles,
  BookOpen,
  Save,
  Bell,
  BellPlus,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog as AlertDialog,
  DialogContent as AlertDialogContent,
  DialogDescription as AlertDialogDescription,
  DialogFooter as AlertDialogFooter,
  DialogHeader as AlertDialogHeader,
  DialogTitle as AlertDialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SensitiveValue } from '@/components/sensitive-value';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { useProfileStore } from '@/store/profileStore';
import {
  useJobSearchStore,
  type SavedJobSearch,
} from '@/store/jobSearchStore';
import { useJobAlertsStore } from '@/store/jobAlertsStore';
import type { JobCardModel } from '@/lib/jobs';
import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
// Day 43: Import anchor system for setting job anchor (right rail context)
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { buildAnchorId, normalizeSourceLabel, type PathAdvisorAnchor } from '@/lib/pathadvisor/anchors';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { SaveSearchDialog } from '@/components/dashboard/save-search-dialog';
import { cn } from '@/lib/utils';
import { deriveSavedSearchFromJob } from '@/lib/job-search';
import { MoreFiltersPanel } from '@/components/dashboard/more-filters-panel';
import { toast } from '@/hooks/use-toast';

/**
 * ============================================================================
 * EXTENDED JOB TYPE (Day 12 - Canonical Fields)
 * ============================================================================
 * Extended job type that includes additional fields for the detail view.
 * The base JobCardModel from the store has core fields; this adds UI-specific
 * computed/display fields.
 *
 * DAY 12: Uses canonical field names from JobCardModel:
 * - title (was: role)
 * - organizationName (was: agency)
 * - gradeLevel (was: grade)
 * - seriesCode (was: series)
 * - locationDisplay (was: location)
 * - estimatedTotalComp (was: estTotalComp)
 *
 * NOTE: In the future, these fields would come from the backend.
 * For now, we derive some from existing data or use placeholders.
 */
interface ExtendedJobDisplay extends JobCardModel {
  description?: string;
  duties?: string[];
  compDelta?: string;
  pcsRequired?: boolean;
}

/**
 * Helper function to create extended job display data.
 * Adds UI-specific fields to a base JobCardModel.
 *
 * WHY THIS EXISTS:
 * The store's JobCardModel type has core fields. The UI needs additional
 * computed fields for display. This function bridges the gap.
 *
 * DAY 12: Updated to use canonical field names:
 * - job.title (was: job.role)
 * - job.organizationName (was: job.agency)
 * - job.locationDisplay (was: job.location)
 * - job.estimatedTotalComp (was: job.estTotalComp)
 *
 * FUTURE: When backend returns full job data, this can be simplified.
 */
function createExtendedJobDisplay(job: JobCardModel): ExtendedJobDisplay {
  // Get canonical field values with fallbacks
  const title = job.title || 'Untitled Position';
  const orgName = job.organizationName || 'Unknown Agency';
  const location = job.locationDisplay || '';
  const estComp = job.estimatedTotalComp || 0;

  // Generate a reasonable description based on job title (canonical: title)
  const description = 'This position involves ' + title.toLowerCase() +
    ' responsibilities at ' + orgName + '.';

  // Generate sample duties based on role keywords
  const duties: string[] = [
    'Perform primary duties related to ' + title,
    'Collaborate with team members and stakeholders',
    'Prepare reports and documentation',
    'Support organizational objectives',
  ];

  // Calculate comp delta (placeholder - would be computed from user profile)
  const compDelta = estComp > 130000 ? '+$' + ((estComp - 130000).toLocaleString()) : '-$' + ((130000 - estComp).toLocaleString());

  // Determine if PCS is required based on location (canonical: locationDisplay)
  const locationLower = location.toLowerCase();
  const pcsRequired = locationLower.indexOf('dc') < 0 &&
    locationLower.indexOf('remote') < 0;

  return Object.assign({}, job, {
    description: description,
    duties: duties,
    compDelta: compDelta,
    pcsRequired: pcsRequired,
  });
}

interface JobSearchWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Day 38 Continuation: Picker mode for Resume Builder job selection
  mode?: 'default' | 'resume-tailor-picker';
  onConfirm?: (job: JobCardModel) => void; // Called when user clicks "Tailor my resume for this job" in picker mode
}

export function JobSearchWorkspaceDialog(props: JobSearchWorkspaceDialogProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const mode = props.mode || 'default';
  const onConfirm = props.onConfirm;

  const router = useRouter();

  // ============================================================================
  // STORE SELECTORS
  // ============================================================================
  // We pull individual pieces of state from stores to minimize re-renders.
  // Each selector only causes re-render when that specific value changes.

  // User preferences for sensitive data visibility
  const globalHide = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  // User profile data
  const user = useProfileStore(function (state) {
    return state.user;
  });

  // ============================================================================
  // JOB SEARCH STORE SELECTORS
  // ============================================================================

  // Current filter state
  const jobSearchFilters = useJobSearchStore(function (state) {
    return state.jobSearchFilters;
  });
  const setJobSearchFilters = useJobSearchStore(function (state) {
    return state.setJobSearchFilters;
  });

  // Job results from the store (filtered by API layer)
  // These are the jobs that match current filters
  const storeJobs = useJobSearchStore(function (state) {
    return state.jobs;
  });

  // Async status for loading/error states
  const searchStatus = useJobSearchStore(function (state) {
    return state.searchStatus;
  });
  const searchError = useJobSearchStore(function (state) {
    return state.searchError;
  });
  const searchTotal = useJobSearchStore(function (state) {
    return state.searchTotal;
  });

  // Search action - triggers API call with current filters
  const searchJobs = useJobSearchStore(function (state) {
    return state.searchJobs;
  });
  const clearSearchError = useJobSearchStore(function (state) {
    return state.clearSearchError;
  });

  // Saved searches
  const savedSearches = useJobSearchStore(function (state) {
    return state.savedJobSearches;
  });
  const applySavedJobSearch = useJobSearchStore(function (state) {
    return state.applySavedJobSearch;
  });
  const deleteSavedJobSearch = useJobSearchStore(function (state) {
    return state.deleteSavedJobSearch;
  });
  const activeSavedSearchId = useJobSearchStore(function (state) {
    return state.activeSavedSearchId;
  });

  // Job alerts
  const jobAlerts = useJobSearchStore(function (state) {
    return state.jobAlerts;
  });
  const fetchJobAlerts = useJobSearchStore(function (state) {
    return state.fetchJobAlerts;
  });

  // UI state
  const setSeriesGuideOpen = useJobSearchStore(function (state) {
    return state.setSeriesGuideOpen;
  });

  // ============================================================================
  // ALERT CREATION STORE SELECTORS (Day 19)
  // ============================================================================
  /**
   * Store actions for creating alerts from selected job:
   * - hasSignature: Check if an alert with this signature already exists
   * - saveSearchWithAlerts: Create a saved search with alerts enabled
   */
  const hasSignature = useJobSearchStore(function (state) {
    return state.hasSignature;
  });
  const saveSearchWithAlerts = useJobSearchStore(function (state) {
    return state.saveSearchWithAlerts;
  });

  // ============================================================================
  // JOB ALERTS STORE (Day 20 Fix)
  // ============================================================================
  /**
   * Connect to jobAlertsStore to create actual alert rules.
   *
   * DAY 20 FIX:
   * Previously, "Create Alert" only created a saved search in jobSearchStore.
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

  // ============================================================================
  // ADVISOR CONTEXT
  // ============================================================================
  const advisorContextData = useAdvisorContext();
  const setAdvisorContext = advisorContextData.setContext;
  const setPendingPrompt = advisorContextData.setPendingPrompt;
  const setIsPanelOpen = advisorContextData.setIsPanelOpen;

  // ============================================================================
  // RESUME BUILDER STORE
  // ============================================================================
  const startTailoredResumeSession = useResumeBuilderStore(function (state) {
    return state.startTailoredResumeSession;
  });
  const setCurrentStep = useResumeBuilderStore(function (state) {
    return state.setCurrentStep;
  });

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  /**
   * Track the ID of the user-selected job (from clicking a row).
   * This is null until user explicitly selects a job.
   *
   * WHY selectedJobId instead of selectedJob:
   * We store just the ID and derive the full job object. This avoids
   * the setState-in-effect pattern that was causing lint errors.
   */
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Dialog states
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  // ============================================================================
  // CREATE ALERT DIALOG STATE (Day 19)
  // ============================================================================
  /**
   * showCreateAlertDialog: Controls visibility of the "Create alert" dialog.
   * alertFrequency: Selected frequency for the alert (daily or weekly).
   * preferSameAgency: Whether to constrain alert to same agency.
   */
  const [showCreateAlertDialog, setShowCreateAlertDialog] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [preferSameAgency, setPreferSameAgency] = useState(false);

  // Calculate alert count
  let alertCount = 0;
  if (jobAlerts && jobAlerts.totalNew !== undefined && jobAlerts.totalNew !== null) {
    alertCount = jobAlerts.totalNew;
  }

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  /**
   * Derive the effective selected job ID.
   *
   * HOW IT WORKS:
   * - If user has selected a job (selectedJobId is set), use that
   * - Otherwise, default to the first job in the list
   *
   * WHY:
   * This pattern replaces the useEffect that was calling setSelectedJob.
   * Instead of updating state when jobs change, we derive the effective
   * selection from the current state + jobs list.
   */
  const effectiveSelectedJobId = useMemo(function computeEffectiveSelectedJobId() {
    // If user has explicitly selected a job that still exists in the list, use it
    if (selectedJobId !== null) {
      const stillExists = storeJobs.some(function (job) {
        return job.id === selectedJobId;
      });
      if (stillExists) {
        return selectedJobId;
      }
    }

    // Otherwise, default to first job (if any)
    if (storeJobs.length > 0) {
      return storeJobs[0].id;
    }

    return null;
  }, [selectedJobId, storeJobs]);

  /**
   * Derive the selected job display object from the effective ID.
   * This is the object used for rendering the detail panel.
   */
  const selectedJob: ExtendedJobDisplay | null = useMemo(function computeSelectedJob() {
    if (effectiveSelectedJobId === null) {
      return null;
    }

    const foundJob = storeJobs.find(function (job) {
      return job.id === effectiveSelectedJobId;
    });

    if (foundJob) {
      return createExtendedJobDisplay(foundJob);
    }

    return null;
  }, [effectiveSelectedJobId, storeJobs]);

  /**
   * Wrapper function for setting the selected job by ID.
   * Used by event handlers to update selection.
   */
  function setSelectedJob(job: ExtendedJobDisplay | null): void {
    if (job === null) {
      setSelectedJobId(null);
    } else {
      setSelectedJobId(job.id);
    }
  }

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Effect: Trigger search when dialog opens or filters change.
   *
   * HOW IT WORKS:
   * 1. When dialog opens, trigger a search with current filters
   * 2. Fetch job alerts for notification badge
   *
   * WHY: Ensures results are always fresh when dialog is opened.
   *
   * NOTE: We no longer auto-select first job here. That's now handled
   * by the derived effectiveSelectedJobId which defaults to first job.
   */
  useEffect(function triggerSearchOnDialogOpen() {
    if (open) {
      // Trigger search with current filters
      searchJobs();

      // Fetch job alerts for notification badge
      fetchJobAlerts();
    }
  }, [open, searchJobs, fetchJobAlerts]);

  /**
   * Effect: Load job alerts from localStorage on mount (Day 20 Fix).
   * Ensures jobAlertsStore is hydrated before we try to create alerts.
   */
  useEffect(function loadJobAlertsOnMount() {
    if (!isJobAlertsLoaded) {
      loadJobAlertsFromStorage();
    }
  }, [isJobAlertsLoaded, loadJobAlertsFromStorage]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Convert store jobs to extended display format.
   * The store provides base JobResult, we add UI-specific fields.
   *
   * NOTE: Filtering is now done by the API layer (via store.searchJobs).
   * The UI just displays what the store provides.
   */
  const displayJobs: ExtendedJobDisplay[] = [];
  for (let i = 0; i < storeJobs.length; i++) {
    displayJobs.push(createExtendedJobDisplay(storeJobs[i]));
  }

  // ============================================================================
  // HANDLER FUNCTIONS
  // ============================================================================

  /**
   * Handler: Use current user profile to populate filters.
   *
   * HOW IT WORKS:
   * 1. Extract user's grade and target location from profile
   * 2. Set filters to match user's current position
   * 3. Trigger a search with new filters
   *
   * WHY: Helps users quickly find jobs similar to their current role.
   *
   * NOTE: The User type has limited fields. We use:
   * - gradeStep: e.g., "GS-13 Step 5" - extract grade from this
   * - targetLocation: User's preferred location
   * - agency: Current agency for agency filter
   */
  const handleUseMyProfile = function () {
    // Extract grade from gradeStep (e.g., "GS-13 Step 5" -> "gs13")
    let gradeBand: string | null = null;
    if (user.gradeStep) {
      // Parse "GS-13 Step 5" to extract "gs13"
      const parts = user.gradeStep.split(' ');
      if (parts.length > 0 && parts[0]) {
        // "GS-13" -> "gs13"
        gradeBand = parts[0].toLowerCase().replace('-', '');
      }
    }

    // Use target location if available, otherwise null
    let location: string | null = null;
    if (user.targetLocation) {
      location = user.targetLocation.toLowerCase();
      // Map common locations to filter values
      if (location.indexOf('dc') >= 0 || location.indexOf('washington') >= 0) {
        location = 'dc';
      } else if (location.indexOf('remote') >= 0) {
        location = 'remote';
      }
    }

    setJobSearchFilters({
      query: '', // No query by default
      segment: 'federal',
      gradeBand: gradeBand,
      location: location,
      agency: user.agency ? user.agency.toLowerCase() : null,
    });

    // Trigger search with new filters
    searchJobs();
  };

  /**
   * Handler: Apply a saved search.
   *
   * HOW IT WORKS:
   * 1. Call store action to apply saved search filters
   * 2. Store action automatically triggers a search
   * 3. Close any saved search dropdown (handled by Select component)
   *
   * WHY: Allows users to quickly switch between saved filter configurations.
   */
  const handleApplySavedSearch = function (searchId: string) {
    if (!searchId) return;

    // Store action applies filters AND triggers search
    applySavedJobSearch(searchId);

    // Show toast notification
    let search: SavedJobSearch | undefined;
    const searches = savedSearches || [];
    for (let j = 0; j < searches.length; j++) {
      if (searches[j].id === searchId) {
        search = searches[j];
        break;
      }
    }
    if (search) {
      toast({
        title: 'Search applied',
        description: 'Filters from "' + search.name + '" have been applied.',
      });
    }
  };

  /**
   * Handler: Delete a saved search.
   *
   * HOW IT WORKS:
   * 1. Call store action to delete the saved search
   * 2. Store action returns the deleted search name (for toast)
   * 3. Show confirmation toast
   *
   * WHY: Allows users to clean up saved searches they no longer need.
   */
  const handleDeleteSavedSearch = function (searchId: string, event: React.MouseEvent) {
    // Prevent the click from bubbling to the SelectItem
    event.stopPropagation();
    event.preventDefault();

    // Delete the search and get its name for the toast
    const deletedName = deleteSavedJobSearch(searchId);

    // Show confirmation toast
    if (deletedName) {
      toast({
        title: 'Search deleted',
        description: '"' + deletedName + '" has been removed from your saved searches.',
      });
    }
  };

  /**
   * Handler: Retry search after error.
   *
   * HOW IT WORKS:
   * 1. Clear the current error
   * 2. Trigger a new search
   *
   * WHY: Allows users to retry after a transient error.
   */
  const handleRetrySearch = function () {
    clearSearchError();
    searchJobs();
  };

  /**
   * Handler: Start tailoring resume for the selected job.
   *
   * HOW IT WORKS:
   * 1. Get current user's employee info if applicable
   * 2. Start a tailored resume session with selected job
   * 3. Navigate to resume builder with job context
   *
   * WHY: Connects job search to resume tailoring workflow.
   */
  const handleTailorResume = function () {
    if (!selectedJob) {
      return;
    }

    let employeeInfo = undefined;
    if (user.currentEmployee) {
      let currentGrade = 'GS-13';
      if (user.gradeStep && user.gradeStep.indexOf('-') !== -1) {
        const parts = user.gradeStep.split('-');
        if (parts.length > 0) {
          currentGrade = parts[0];
        }
      }
      employeeInfo = {
        isEmployee: true,
        currentGrade: currentGrade,
        currentSeries: '0343',
        currentAgency: user.agency || 'Department of Defense',
      };
    }

    // Day 12: Use canonical field names for tailored resume session
    const targetJob = startTailoredResumeSession(
      {
        id: String(selectedJob.id),
        role: selectedJob.title, // Canonical: title (was: role)
        series: selectedJob.seriesCode || '', // Canonical: seriesCode (was: series)
        grade: selectedJob.gradeLevel || '', // Canonical: gradeLevel (was: grade)
        agency: selectedJob.organizationName || '', // Canonical: organizationName (was: agency)
        location: selectedJob.locationDisplay || '', // Canonical: locationDisplay (was: location)
        matchPercent: selectedJob.matchPercent || 0,
      },
      employeeInfo,
    );

    // Set default step to Work Experience (index 2) for tailoring
    setCurrentStep(2);

    // Close the dialog first
    onOpenChange(false);

    if (targetJob) {
      let targetJobId = String(selectedJob.id);
      if (targetJob.jobId) {
        targetJobId = String(targetJob.jobId);
      }

      const url =
        '/dashboard/resume-builder?targetJobId=' +
        encodeURIComponent(targetJobId) +
        '&mode=tailor';

      router.push(url);
    }
  };

  /**
   * Handler: Get application tips from PathAdvisor.
   *
   * HOW IT WORKS:
   * 1. Set advisor context with job details
   * 2. Generate a prompt based on user status
   * 3. Open the advisor panel with the prompt
   *
   * WHY: Provides AI-assisted application guidance.
   */
  /**
   * Handler: Get application tips from PathAdvisor.
   * Day 12: Updated to use canonical field names.
   */
  const handleGetApplicationTips = function () {
    if (selectedJob) {
      // Day 12: Use canonical field names
      const title = selectedJob.title || 'Untitled Position';
      const series = selectedJob.seriesCode || '';
      const grade = selectedJob.gradeLevel || '';
      const agency = selectedJob.organizationName || '';
      const location = selectedJob.locationDisplay || '';

      // Day 43: Set job anchor for Focus Mode right rail context
      const jobLabel = title + (series ? ', ' + series : '') + (grade ? ' ' + grade : '');
      const anchorId = buildAnchorId('job', String(selectedJob.id));
      const normalizedLabel = normalizeSourceLabel(jobLabel, 'job');
      const anchor: PathAdvisorAnchor = {
        id: anchorId,
        source: 'job',
        sourceId: String(selectedJob.id),
        sourceLabel: normalizedLabel,
        summary: 'Getting application tips',
        createdAt: Date.now(),
      };
      usePathAdvisorStore.getState().setActiveAnchor(anchor);

      setAdvisorContext({
        source: 'job-details',
        jobTitle: title,
        jobSeries: series,
        jobGrade: grade,
        jobAgency: agency,
        jobLocation: location,
      });

      let prompt = '';
      if (user.currentEmployee) {
        const gradeStepParts2 = user.gradeStep ? user.gradeStep.split('-') : [];
        const currentGrade2 = gradeStepParts2.length > 0 ? gradeStepParts2[0] : 'GS-13';
        const agencyName = user.agency || 'my agency';
        prompt =
          "I'm a current " +
          currentGrade2 +
          ' at ' +
          agencyName +
          '. Give me application tips for this ' +
          title +
          ', ' +
          series +
          ' ' +
          grade +
          ' position at ' +
          agency +
          '. What should I emphasize on my resume and in my application?';
      } else {
        prompt =
          "I'm a job seeker applying for this " +
          title +
          ', ' +
          series +
          ' ' +
          grade +
          ' position at ' +
          agency +
          '. Give me application tips. What should I emphasize on my resume and in my application?';
      }

      setPendingPrompt(prompt);
      setIsPanelOpen(true);
    }
  };

  /**
   * Handler: Select a job from the table.
   *
   * HOW IT WORKS:
   * 1. Find the job in displayJobs
   * 2. Set it as selected for detail view
   */
  const handleSelectJob = function (job: ExtendedJobDisplay) {
    setSelectedJob(job);
  };

  // ============================================================================
  // CREATE ALERT HANDLERS (Day 19)
  // ============================================================================
  
  /**
   * Opens the "Create alert for similar jobs" dialog.
   * Resets dialog state to defaults.
   */
  const handleOpenCreateAlertDialog = function () {
    setAlertFrequency('weekly');
    setPreferSameAgency(false);
    setShowCreateAlertDialog(true);
  };

  /**
   * Creates an alert for similar jobs based on the selected job.
   * 
   * DAY 20 FIX: This function now creates an alert in BOTH stores:
   * 1. jobSearchStore (saved search with alerts) - for quick filters/navigation
   * 2. jobAlertsStore (alert rule) - for Alerts Center display and matching
   *
   * Previously only #1 was done, so alerts didn't appear in Alerts Center.
   *
   * HOW IT WORKS:
   * 1. Derive a saved search from the job's attributes
   * 2. Check for duplicate signature
   * 3. If duplicate, show "Alert already exists" toast
   * 4. If new, create the saved search with alerts enabled (jobSearchStore)
   * 5. Also create an alert rule in jobAlertsStore (Day 20 fix)
   * 6. Apply filters and show success toast
   */
  const handleCreateAlert = function () {
    if (selectedJob === null) {
      return;
    }

    // Derive saved search from job using canonical fields
    const derivedSearch = deriveSavedSearchFromJob(
      {
        title: selectedJob.title,
        seriesCode: selectedJob.seriesCode !== undefined && selectedJob.seriesCode !== null ? selectedJob.seriesCode : '',
        gradeLevel: selectedJob.gradeLevel !== undefined && selectedJob.gradeLevel !== null ? selectedJob.gradeLevel : '',
        locationDisplay: selectedJob.locationDisplay !== undefined && selectedJob.locationDisplay !== null ? selectedJob.locationDisplay : '',
        organizationName: selectedJob.organizationName !== undefined && selectedJob.organizationName !== null ? selectedJob.organizationName : '',
        // Infer telework from location
        teleworkEligibility: (selectedJob.locationDisplay !== undefined && selectedJob.locationDisplay !== null ? selectedJob.locationDisplay : '').toLowerCase().indexOf('remote') !== -1 ? 'Remote' : undefined,
        segment: 'federal',
      },
      { preferSameAgency: preferSameAgency }
    );

    // Check for duplicate
    if (hasSignature(derivedSearch.signature)) {
      toast({
        title: 'Alert already exists',
        description: 'You already have an alert for similar jobs.',
      });
      setShowCreateAlertDialog(false);
      return;
    }

    // Create the saved search with alerts enabled (keeps jobSearchStore in sync)
    const newSearch = saveSearchWithAlerts(
      derivedSearch.label,
      alertFrequency,
      derivedSearch.signature
    );

    if (newSearch === null) {
      toast({
        title: 'Alert already exists',
        description: 'You already have an alert for similar jobs.',
      });
      setShowCreateAlertDialog(false);
      return;
    }

    // ========================================================================
    // DAY 20 FIX: Also create alert rule in jobAlertsStore
    // ========================================================================
    // The Alerts Center page reads from jobAlertsStore, so we must create
    // an alert rule there for it to appear.
    // ========================================================================

    // Derive keywords from job title
    const alertKeywords = selectedJob.title;

    // Determine grade band from job grade
    let gradeBand: string | null = null;
    if (selectedJob.gradeLevel !== undefined && selectedJob.gradeLevel !== null && selectedJob.gradeLevel !== '') {
      // Normalize grade format: "GS-13" -> "gs13"
      const gradeNormalized = selectedJob.gradeLevel.toLowerCase().replace('-', '');
      gradeBand = gradeNormalized;
    }

    // Determine series
    let series: string | null = null;
    if (selectedJob.seriesCode !== undefined && selectedJob.seriesCode !== null && selectedJob.seriesCode !== '') {
      series = selectedJob.seriesCode;
    }

    // Determine location
    let location: string | null = null;
    if (selectedJob.locationDisplay !== undefined && selectedJob.locationDisplay !== null && selectedJob.locationDisplay !== '') {
      location = selectedJob.locationDisplay;
    }

    // Determine if remote-only based on location
    const isRemote = (selectedJob.locationDisplay !== undefined && selectedJob.locationDisplay !== null ? selectedJob.locationDisplay : '').toLowerCase().indexOf('remote') !== -1;

    // Create the alert draft
    const alertDraft = {
      name: derivedSearch.label,
      enabled: true,
      frequency: alertFrequency,
      keywords: alertKeywords,
      series: series,
      gradeBand: gradeBand,
      location: location,
      remoteOnly: isRemote,
    };

    // Create the alert rule in jobAlertsStore - persists to pathos-job-alerts
    const createdAlert = createAlertInStore(alertDraft);

    // Apply the derived filters to show similar jobs
    setJobSearchFilters(derivedSearch.filters);
    // Trigger search with new filters
    setTimeout(function () { searchJobs(); }, 0);

    // Show success toast
    toast({
      title: 'Alert created',
      description: 'Tracking similar jobs in your Alerts tab (' + alertFrequency + '). ID: ' + createdAlert.id,
    });

    setShowCreateAlertDialog(false);
  };

  return (
    <>
      <SaveSearchDialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen} />
      <MoreFiltersPanel open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen} />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-[1200px] xl:max-w-[1400px] max-h-[95vh] h-[90vh] p-6 lg:p-8 bg-background border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
            {/* ================================================================
                ACCESSIBILITY FIX (Day 20)
                ================================================================
                
                Radix Dialog requires both DialogTitle and DialogDescription
                for proper accessibility. Using VisuallyHidden to satisfy
                aria requirements without changing visual layout.
                ================================================================ */}
            <VisuallyHidden.Root>
              <DialogTitle>Job Search Workspace</DialogTitle>
              <DialogDescription>
                Use your current profile to explore federal, military, and civilian roles.
              </DialogDescription>
            </VisuallyHidden.Root>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-shrink-0">
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {mode === 'resume-tailor-picker' ? 'Select a Job to Tailor For' : 'Job Search Workspace'}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === 'resume-tailor-picker'
                    ? 'Search and select a job to tailor your resume for.'
                    : 'Use your current profile to explore federal, military, and civilian roles.'}
                </p>
              </div>
                {/* ================================================================
                    ALERTS PILL (Day 19 Enhancement)
                    ================================================================
                    
                    PURPOSE:
                    Displays count of new job alerts. Now clickable to close the
                    workspace modal and let user see the Alerts tab in the main page.
                    
                    WHY CLOSE MODAL:
                    The workspace modal is a focused search interface without
                    its own Alerts view. Closing it allows the user to see the
                    Alerts tab on the main job search page.
                    ================================================================ */}
                {alertCount > 0 && (
                <button
                  type="button"
                  onClick={function () {
                    // Close the workspace modal to show the Alerts tab
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  aria-label={'View ' + alertCount + ' new alerts'}
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{alertCount} new alerts</span>
                </button>
              )}
              <Button variant="ghost" size="icon" onClick={function () { onOpenChange(false); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Divider */}
            <div className="border-b border-border my-4 flex-shrink-0" />

            {/* Sticky Search and Filters */}
            <div className="flex-shrink-0 space-y-3 pb-4">
              {/* Search input + segment toggles */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search job titles, series, or keywords... (Press Enter to search)"
                    className="pl-10 h-10 bg-background"
                    value={jobSearchFilters.query}
                    onChange={function (e) { setJobSearchFilters({ query: e.target.value }); }}
                    onKeyDown={function (e) {
                      // Trigger search when Enter is pressed
                      if (e.key === 'Enter') {
                        searchJobs();
                      }
                    }}
                  />
                  {/* Clear button for query input */}
                  {jobSearchFilters.query && jobSearchFilters.query.length > 0 && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={function () {
                        setJobSearchFilters({ query: '' });
                        searchJobs();
                      }}
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Segment toggle buttons - trigger search on change */}
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {['Federal', 'Military', 'Civilian'].map(function (type) {
                      return (
                        <button
                          key={type}
                          onClick={function () {
                            setJobSearchFilters({
                              segment: type.toLowerCase() as 'federal' | 'military' | 'civilian',
                            });
                            // Trigger search with new segment
                            // Note: searchJobs reads from store, so we call it after setJobSearchFilters
                            setTimeout(function () { searchJobs(); }, 0);
                          }}
                          className={cn(
                            'px-4 py-2 text-sm font-medium transition-colors',
                            jobSearchFilters.segment === type.toLowerCase()
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-card text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-accent whitespace-nowrap"
                    onClick={handleUseMyProfile}
                  >
                    Use my current profile
                  </Button>
                </div>
              </div>

              {/* ================================================================
                  FILTERS ROW
                  Quick filter dropdowns that trigger search on change.
                  Each dropdown updates the filter and triggers searchJobs.
                  ================================================================ */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Location filter */}
                <Select
                  value={jobSearchFilters.location || ''}
                  onValueChange={function (value) {
                    setJobSearchFilters({ location: value || null });
                    setTimeout(function () { searchJobs(); }, 0);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dc">Washington, DC</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="tx">Texas</SelectItem>
                    <SelectItem value="co">Colorado</SelectItem>
                    <SelectItem value="ga">Georgia</SelectItem>
                  </SelectContent>
                </Select>

                {/* Grade band filter */}
                <Select
                  value={jobSearchFilters.gradeBand || ''}
                  onValueChange={function (value) {
                    setJobSearchFilters({ gradeBand: value || null });
                    setTimeout(function () { searchJobs(); }, 0);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Grade/Band" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gs12">GS-12</SelectItem>
                    <SelectItem value="gs13">GS-13</SelectItem>
                    <SelectItem value="gs14">GS-14</SelectItem>
                    <SelectItem value="gs15">GS-15</SelectItem>
                  </SelectContent>
                </Select>

                {/* Series guide button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-2 gap-1"
                  onClick={function () { setSeriesGuideOpen(true); }}
                >
                  <BookOpen className="w-3 h-3" />
                  Series guide
                </Button>

                {/* Agency filter */}
                <Select
                  value={jobSearchFilters.agency || ''}
                  onValueChange={function (value) {
                    setJobSearchFilters({ agency: value || null });
                    setTimeout(function () { searchJobs(); }, 0);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dod">DoD</SelectItem>
                    <SelectItem value="va">VA</SelectItem>
                    <SelectItem value="usda">USDA</SelectItem>
                    <SelectItem value="dhs">DHS</SelectItem>
                    <SelectItem value="opm">OPM</SelectItem>
                    <SelectItem value="cdc">CDC</SelectItem>
                  </SelectContent>
                </Select>

                {/* Work type filter */}
                {/* ================================================================
                    WORK TYPE FILTER (Day 19 Fix)
                    ================================================================
                    Fixed dropdown width to prevent truncation of selected values
                    like "On-site" or "Remote".
                    
                    SOLUTION:
                    - min-w-[140px] w-auto: Ensures minimum width while allowing growth
                    - whitespace-nowrap: Prevents text wrapping inside the trigger
                    - SelectContent uses w-[var(--radix-select-trigger-width)] to match
                      the trigger width, ensuring dropdown is never narrower
                    ================================================================ */}
                <Select
                  value={jobSearchFilters.workType || ''}
                  onValueChange={function (value) {
                    setJobSearchFilters({ workType: value || null });
                    setTimeout(function () { searchJobs(); }, 0);
                  }}
                >
                  <SelectTrigger className="min-w-[140px] w-auto h-8 text-xs whitespace-nowrap">
                    <Briefcase className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      <SelectValue placeholder="Work Type" />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>

                {/* More filters button - opens advanced filters panel */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 bg-transparent"
                  onClick={function () { setMoreFiltersOpen(true); }}
                >
                  <Filter className="w-3 h-3" />
                  More filters
                </Button>

                {/* ================================================================
                    SAVED SEARCHES & SAVE BUTTON
                    Shows saved searches dropdown with delete capability
                    and button to save current filters.
                    ================================================================ */}
                <div className="ml-auto flex items-center gap-2">
                  {savedSearches && savedSearches.length > 0 && (
                    <Select
                      value={activeSavedSearchId || ''}
                      onValueChange={function (value) { handleApplySavedSearch(value); }}
                    >
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Saved searches" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Map each saved search to a selectable item with delete button */}
                        {savedSearches.map(function (search) {
                          return (
                            <div
                              key={search.id}
                              className="flex items-center justify-between pr-1 group"
                            >
                              <SelectItem
                                value={search.id}
                                className="flex-1 pr-1"
                              >
                                <span className="truncate">{search.name}</span>
                                {search.isDefault && (
                                  <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                                    Default
                                  </Badge>
                                )}
                              </SelectItem>
                              {/* Delete button - only shows on hover */}
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={function (e) { handleDeleteSavedSearch(search.id, e); }}
                                title="Delete saved search"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 bg-transparent"
                    onClick={function () { setSaveSearchOpen(true); }}
                  >
                    <Save className="w-3 h-3" />
                    Save search
                  </Button>
                </div>

                {/* ================================================================
                    RESULTS COUNT
                    Shows number of results from the search.
                    Updates dynamically as filters change.
                    ================================================================ */}
                <div className="text-xs text-muted-foreground">
                  {searchStatus === 'loading' ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching...
                    </span>
                  ) : (
                    searchTotal + ' results'
                  )}
                </div>
              </div>
            </div>

            {/* ================================================================
                TWO-PANEL MAIN LAYOUT
                Left: Job results table with loading/error states
                Right: Job details and PathAdvisor insight
                ================================================================ */}
            <div className="flex-1 min-h-0 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              {/* Left: Job results table */}
              <div className="flex flex-col min-h-0 rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {/* ============================================================
                      ERROR STATE
                      Shows when search failed. Includes retry button.
                      ============================================================ */}
                  {searchStatus === 'error' && (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Search failed
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        {searchError || 'An error occurred while searching for jobs.'}
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleRetrySearch}
                        className="gap-2"
                      >
                        <Search className="w-4 h-4" />
                        Retry search
                      </Button>
                      {/* Dev hint for testing */}
                      {searchError && searchError.indexOf('__FAIL__') >= 0 && (
                        <p className="text-xs text-muted-foreground mt-4">
                          Tip: Remove &quot;__FAIL__&quot; from your search query to fix this.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ============================================================
                      LOADING STATE
                      Shows spinner while search is in progress.
                      ============================================================ */}
                  {searchStatus === 'loading' && (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Searching jobs...
                      </p>
                    </div>
                  )}

                  {/* ============================================================
                      EMPTY STATE
                      Shows when search succeeds but no results match filters.
                      ============================================================ */}
                  {searchStatus !== 'loading' && searchStatus !== 'error' && displayJobs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <Search className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No jobs found
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Try adjusting your filters or search query to see more results.
                      </p>
                    </div>
                  )}

                  {/* ============================================================
                      RESULTS TABLE
                      Shows job results when we have data and no error.
                      ============================================================ */}
                  {searchStatus !== 'loading' && searchStatus !== 'error' && displayJobs.length > 0 && (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                            Role
                          </th>
                          <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                            Grade
                          </th>
                          <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                            Location
                          </th>
                          <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">
                            Est. Comp
                          </th>
                          <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                            {user.currentEmployee ? 'Retire' : 'Fit'}
                          </th>
                          <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                            Match
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Day 12: Use canonical field names in table */}
                        {displayJobs.map(function (job) {
                          // Get canonical field values with fallbacks
                          const title = job.title || 'Untitled';
                          const orgName = job.organizationName || '';
                          const grade = job.gradeLevel || '';
                          const location = job.locationDisplay || '';
                          const estComp = job.estimatedTotalComp || 0;
                          const retireImpact = job.retirementImpact || 'No change';
                          const matchPct = job.matchPercent || 0;

                          return (
                            <tr
                              key={job.id}
                              className={cn(
                                'border-t border-border hover:bg-muted/30 cursor-pointer transition-colors',
                                selectedJob && selectedJob.id === job.id && 'bg-accent/10',
                              )}
                              onClick={function () { handleSelectJob(job); }}
                            >
                              <td className="px-3 py-3">
                                <div className="font-medium text-foreground">{title}</div>
                                <div className="text-xs text-muted-foreground">{orgName}</div>
                              </td>
                              <td className="px-3 py-3 text-foreground">{grade}</td>
                              <td className="px-3 py-3 text-foreground">{location}</td>
                              <td className="px-3 py-3 text-right">
                                <SensitiveValue
                                  value={'$' + estComp.toLocaleString()}
                                  masked="$•••,•••"
                                  hide={globalHide}
                                  className="font-medium"
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                {user.currentEmployee ? (
                                  <span
                                    className={cn(
                                      'text-xs',
                                      retireImpact.indexOf('+') >= 0
                                        ? 'text-red-400'
                                        : retireImpact.indexOf('-') >= 0
                                          ? 'text-green-400'
                                          : 'text-muted-foreground',
                                    )}
                                  >
                                    {retireImpact}
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <Star className="w-3 h-3 text-accent fill-accent" />
                                    <span className="text-xs">High</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Badge
                                  variant={matchPct >= 90 ? 'default' : 'secondary'}
                                  className={
                                    matchPct >= 90 ? 'bg-accent text-accent-foreground' : ''
                                  }
                                >
                                  {matchPct}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Right: Job details + PathAdvisor panel */}
              <div className="flex flex-col min-h-0 gap-4 overflow-y-auto">
                {selectedJob ? (
                  <>
                    {/* ================================================================
                        JOB DETAILS CARD (Day 19 Enhancement)
                        ================================================================
                        
                        PURPOSE:
                        Shows details of the selected job with action buttons in header.
                        
                        HEADER ACTIONS (Day 19):
                        - Create Alert: Opens dialog to create alert for similar jobs
                        - USAJOBS: External link to job posting
                        
                        Uses canonical field names from Day 12.
                        ================================================================ */}
                    <Card className="border-border bg-card flex-shrink-0">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{selectedJob.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedJob.organizationName || ''}
                            </p>
                          </div>
                          {/* ================================================================
                              HEADER ACTION BUTTONS (Day 19)
                              ================================================================
                              
                              Prominent action buttons for quick access:
                              1. Create Alert - Opens dialog to create alert (bell icon)
                              2. USAJOBS - External link to job posting
                              
                              The Create Alert button is the key GOAL 1 requirement:
                              Users must be able to easily find the alert action without
                              scrolling in the workspace modal.
                              ================================================================ */}
                          <div className="flex items-center gap-1">
                            {/* Create Alert icon button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={handleOpenCreateAlertDialog}
                              className="h-7 w-7 text-muted-foreground hover:text-accent hover:bg-accent/10"
                              aria-label="Create alert for similar jobs"
                            >
                              <BellPlus className="w-4 h-4" />
                            </Button>
                            {/* USAJOBS external link button */}
                            <Button variant="outline" size="sm" className="gap-1 bg-transparent h-7">
                              <ExternalLink className="w-3 h-3" />
                              USAJOBS
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Key info row - Day 12: Use canonical fields */}
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="outline">{selectedJob.gradeLevel || ''}</Badge>
                          <Badge variant="outline">{selectedJob.seriesCode || ''}</Badge>
                          <Badge variant="outline">{selectedJob.locationDisplay || ''}</Badge>
                          {selectedJob.pcsRequired && (
                            <Badge variant="secondary" className="text-amber-600 bg-amber-500/10">
                              PCS Required
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground">{selectedJob.description}</p>

                        {/* Key duties */}
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">
                            Key Duties
                          </h4>
                          <ul className="text-sm space-y-1">
                            {(selectedJob.duties || []).slice(0, 3).map(function (duty, i) {
                              return (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  <span>{duty}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {/* Fit metrics - Day 12: Use canonical field names */}
                        <div className="pt-2 border-t border-border">
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">
                            Fit Metrics
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent/10 text-sm">
                              <span className="font-medium">{selectedJob.matchPercent || 0}%</span>
                              <span className="text-muted-foreground">Match</span>
                            </div>
                            <div
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm',
                                (selectedJob.retirementImpact || '').indexOf('+') >= 0
                                  ? 'bg-red-500/10 text-red-400'
                                  : (selectedJob.retirementImpact || '').indexOf('-') >= 0
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {(selectedJob.retirementImpact || '').indexOf('+') >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (selectedJob.retirementImpact || '').indexOf('-') >= 0 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              <span className="font-medium">{selectedJob.retirementImpact || 'No change'}</span>
                              <span className="text-muted-foreground">Retire</span>
                            </div>
                            <div
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm',
                                selectedJob.compDelta && selectedJob.compDelta.indexOf('+') >= 0
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-red-500/10 text-red-400',
                              )}
                            >
                              <SensitiveValue
                                value={selectedJob.compDelta || '$0'}
                                masked="$••••"
                                hide={globalHide}
                                className="font-medium"
                              />
                              <span className="text-muted-foreground">Comp</span>
                            </div>
                          </div>
                        </div>

                        {/* Tailor Resume CTA */}
                        <div className="pt-3 border-t border-border space-y-2">
                          <Button
                            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                            onClick={function () {
                              // Day 38 Continuation: In picker mode, call onConfirm instead of handleTailorResume
                              if (mode === 'resume-tailor-picker' && onConfirm && selectedJob) {
                                onConfirm(selectedJob);
                                onOpenChange(false);
                              } else {
                                handleTailorResume();
                              }
                            }}
                          >
                            Tailor my resume for this job
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            {user.currentEmployee
                              ? 'PathOS will tailor your resume for this promotion or lateral move and guide you through updates section by section.'
                              : 'PathOS will link this job to your resume and guide you through updates section by section.'}
                          </p>
                          {mode !== 'resume-tailor-picker' && (
                            <Button
                              variant="ghost"
                              className="w-full gap-2 text-muted-foreground hover:text-foreground text-sm"
                              onClick={handleGetApplicationTips}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Get application tips from PathAdvisor
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* PathAdvisor Card - Day 12: Use canonical field names */}
                    <Card className="border-border bg-card flex-shrink-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-accent" />
                          PathAdvisor Insight
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-muted-foreground">
                        {(selectedJob.matchPercent || 0) >= 90 ? (
                          <p>
                            Based on your profile, this role is a{' '}
                            <span className="text-foreground font-medium">strong match</span> for
                            your grade, skills, and career goals.
                            {(selectedJob.retirementImpact || '').indexOf('+') >= 0 && (
                              <span>
                                {' '}
                                Note that this move would add time to your retirement eligibility.
                              </span>
                            )}
                          </p>
                        ) : (selectedJob.matchPercent || 0) >= 80 ? (
                          <p>
                            This role is a{' '}
                            <span className="text-foreground font-medium">good match</span> for your
                            experience.
                            {selectedJob.pcsRequired && (
                              <span>
                                {' '}
                                Consider the relocation costs and impact on your current situation.
                              </span>
                            )}
                          </p>
                        ) : (
                          <p>
                            This role may require additional qualifications or represent a
                            significant change from your current position. Consider whether the
                            compensation increase justifies the transition.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border-border bg-card flex-1 flex items-center justify-center">
                    <CardContent className="text-center py-12">
                      <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Select a job on the left to see details
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* ================================================================
          CREATE ALERT DIALOG (Day 19)
          ================================================================
          
          PURPOSE:
          Allows users to create an alert for jobs similar to the selected one.
          This dialog is triggered by the BellPlus icon in the job details header.
          
          DIALOG CONTENT:
          - Summary of what will be tracked
          - Frequency selector (daily/weekly)
          - "Prefer same agency" toggle
          
          ON CONFIRM:
          - Derives a saved search from the job
          - Enables alerts with selected frequency
          - Shows toast confirmation
          ================================================================ */}
      <AlertDialog open={showCreateAlertDialog} onOpenChange={setShowCreateAlertDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Create alert for similar jobs
            </AlertDialogTitle>
            <AlertDialogDescription>
              Track similar job postings in your Alerts tab.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Alert configuration form */}
          <div className="space-y-4 py-4">
            {/* Summary of what will be tracked */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Alert will track:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Series: {selectedJob !== null ? (selectedJob.seriesCode || 'Any') : ''}</li>
                <li>• Title keywords: {selectedJob !== null ? selectedJob.title : ''}</li>
                <li>• Grade range: around {selectedJob !== null ? (selectedJob.gradeLevel || 'Any') : ''}</li>
                <li>• Work mode: {selectedJob !== null && (selectedJob.locationDisplay || '').toLowerCase().indexOf('remote') !== -1 ? 'Remote' : 'Any'}</li>
              </ul>
            </div>

            {/* Frequency selector */}
            <div className="space-y-2">
              <Label htmlFor="workspace-alert-frequency">Alert frequency</Label>
              <Select
                value={alertFrequency}
                onValueChange={function (value: string) {
                  if (value === 'daily' || value === 'weekly') {
                    setAlertFrequency(value);
                  }
                }}
              >
                <SelectTrigger id="workspace-alert-frequency" className="min-w-[140px] whitespace-nowrap">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly digest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Track matches locally (no email in Tier 1).
              </p>
            </div>

            {/* Prefer same agency toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="workspace-prefer-agency">Prefer same agency</Label>
                <p className="text-xs text-muted-foreground">
                  Only alert for jobs at {selectedJob !== null ? (selectedJob.organizationName || 'this agency') : 'this agency'}
                </p>
              </div>
              <Switch
                id="workspace-prefer-agency"
                checked={preferSameAgency}
                onCheckedChange={setPreferSameAgency}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={function () {
                setShowCreateAlertDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateAlert}
            >
              Create alert
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
