/**
 * ============================================================================
 * SELECTED JOB PANEL COMPONENT (Day 15)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays the right panel when a job is selected in the Job Search page.
 * Implements the first-principles UX design with:
 * - Job summary at top (title, agency, grade, location, remote, pay)
 * - Primary CTAs (View position details, Tailor my resume)
 * - Secondary actions (Save job, Save search, Alerts)
 * - "Why this matches" accordion with 3 sections
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used by Job Search page in the right column
 * - Replaces the previous "Position Match Analysis" card
 * - Integrates with PathAdvisor for job-specific prompts
 *
 * WHY THIS COMPONENT EXISTS:
 * First-principles UX: When a user selects a job, they need to quickly:
 * 1. Confirm they selected the right job (summary)
 * 2. Take the most common action (primary CTAs)
 * 3. Optionally understand why it matches (accordion)
 *
 * The accordion pattern provides progressive disclosure, keeping the
 * panel concise by default while allowing deep dives.
 *
 * @version Day 15 - Job Search First-Principles Refactor
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Bookmark,
  BookmarkCheck,
  Target,
  TrendingUp,
  DollarSign,
  Award,
  Users,
  ExternalLink,
  ChevronsUpDown,
  Bell,
  BellPlus,
} from 'lucide-react';
import { AskPathAdvisorButton } from '@/components/pathadvisor/AskPathAdvisorButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useCardVisibility } from '@/store/userPreferencesStore';
import { useSavedJobsStore } from '@/store/savedJobsStore';
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useJobAlertsStore } from '@/store/jobAlertsStore';
import { useToast } from '@/hooks/use-toast';
import { SensitiveValue } from '@/components/sensitive-value';
import { deriveSavedSearchFromJob } from '@/lib/job-search';
import type { LegacyJobFormat } from '@/store/jobSearchStore';
import type { PathAdvisorResponse } from '@/types/pathadvisor';

/**
 * ACCORDION SECTION KEYS (module-level constant for stable reference)
 * These are the three "Why this matches" accordion sections.
 * Moved outside component to avoid recreating on each render.
 */
const SECTION_KEYS = ['qualification', 'competitiveness', 'salary'] as const;

/**
 * Props for the SelectedJobPanel component.
 *
 * @property job - The currently selected job (or null if none selected)
 * @property isEmployee - Whether the user is a current federal employee
 * @property globalHide - Global privacy toggle state
 * @property onViewDetails - Callback when "View position details" is clicked
 * @property onTailorResume - Callback when "Tailor my resume" is clicked
 * @property onAskPathAdvisor - Callback when "Ask PathAdvisor" is clicked
 * @property usajobsUrl - Optional USAJOBS URL for the position (Day 15)
 *
 * DAY 15 SESSION 7 CHANGES:
 * - Removed onSaveJob prop - now handled internally via useSavedJobsStore
 * - Removed onAddToCompare - Compare feature not implemented
 * - Save job now toggles saved state with visual feedback
 * - Added "Create alert for similar jobs" action
 */
interface SelectedJobPanelProps {
  job: LegacyJobFormat | null;
  isEmployee: boolean;
  globalHide: boolean;
  onViewDetails: () => void;
  onTailorResume: () => void;
  onAskPathAdvisor: () => void;
  usajobsUrl?: string | null;
  insightsLoading?: boolean;
  pathAdvisorInsights?: PathAdvisorResponse | null;
}

/**
 * SelectedJobPanel Component
 *
 * Displays the selected job summary, primary CTAs, and match accordion.
 * Implements progressive disclosure to keep the panel concise.
 *
 * LAYOUT STRUCTURE:
 * 1. Header: Title + visibility toggle
 * 2. Job Summary: Key details at a glance
 * 3. Primary CTAs: View details, Tailor resume
 * 4. Secondary Actions: Save job, Alerts, PathAdvisor
 * 5. Why This Matches Accordion: 3 expandable sections
 *
 * ACCESSIBILITY:
 * - All interactive elements are buttons with proper labels
 * - Accordion uses Radix Collapsible for keyboard support
 * - Visibility toggle has aria-label
 */
export function SelectedJobPanel(props: SelectedJobPanelProps) {
  // ============================================================================
  // PROPS EXTRACTION
  // ============================================================================
  const job = props.job;
  const isEmployee = props.isEmployee;
  const globalHide = props.globalHide;
  const onViewDetails = props.onViewDetails;
  const onTailorResume = props.onTailorResume;
  const onAskPathAdvisor = props.onAskPathAdvisor;
  const usajobsUrl = props.usajobsUrl !== undefined && props.usajobsUrl !== null ? props.usajobsUrl : null;
  const insightsLoading = props.insightsLoading !== undefined ? props.insightsLoading : false;
  const pathAdvisorInsights = props.pathAdvisorInsights !== undefined && props.pathAdvisorInsights !== null ? props.pathAdvisorInsights : null;

  // ============================================================================
  // TOAST HOOK (Day 15)
  // ============================================================================
  const toastApi = useToast();

  // ============================================================================
  // SAVED JOBS STORE (Day 15)
  // ============================================================================
  /**
   * Connect to the saved jobs store to:
   * 1. Check if the current job is saved
   * 2. Toggle saved state when user clicks "Save job"
   * 3. Load saved jobs from localStorage on mount
   */
  const isSavedFn = useSavedJobsStore(function (state) {
    return state.isSaved;
  });
  const toggleSavedFn = useSavedJobsStore(function (state) {
    return state.toggleSaved;
  });
  const loadFromStorage = useSavedJobsStore(function (state) {
    return state.loadFromStorage;
  });
  const isStoreLoaded = useSavedJobsStore(function (state) {
    return state.isLoaded;
  });

  // ============================================================================
  // JOB SEARCH STORE - FOR ALERTS (Day 15)
  // ============================================================================
  const hasSignature = useJobSearchStore(function (state) {
    return state.hasSignature;
  });
  const saveSearchWithAlerts = useJobSearchStore(function (state) {
    return state.saveSearchWithAlerts;
  });
  const setJobSearchFilters = useJobSearchStore(function (state) {
    return state.setJobSearchFilters;
  });

  // ============================================================================
  // JOB ALERTS STORE (Day 20 Fix)
  // ============================================================================
  /**
   * Connect to the jobAlertsStore to create actual alert rules.
   *
   * DAY 20 FIX:
   * Previously, "Create Alert" only created a saved search in jobSearchStore.
   * The Alerts Center page reads from jobAlertsStore, so alerts were invisible.
   * Now we create an alert rule in jobAlertsStore that persists to
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
  // LOCAL STATE FOR CREATE ALERT DIALOG (Day 15)
  // ============================================================================
  /**
   * showCreateAlertDialog: Controls visibility of the "Create alert for similar jobs" dialog.
   * alertFrequency: Selected frequency for the alert (daily or weekly).
   * preferSameAgency: Whether to constrain the alert to the same agency.
   */
  const [showCreateAlertDialog, setShowCreateAlertDialog] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [preferSameAgency, setPreferSameAgency] = useState(false);

  // ============================================================================
  // LOAD SAVED JOBS FROM STORAGE (Day 15)
  // ============================================================================
  /**
   * Effect: Load saved jobs from localStorage on mount.
   * This ensures the saved state is correct when the component renders.
   */
  useEffect(function loadSavedJobsOnMount() {
    if (!isStoreLoaded) {
      loadFromStorage();
    }
  }, [isStoreLoaded, loadFromStorage]);

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
  // COMPUTED: IS CURRENT JOB SAVED? (Day 15)
  // ============================================================================
  /**
   * Check if the currently selected job is in the saved jobs list.
   * Returns false if no job is selected or store is not loaded.
   */
  const isJobSaved = (function checkIfJobSaved(): boolean {
    if (job === null) {
      return false;
    }
    if (!isStoreLoaded) {
      return false;
    }
    return isSavedFn(String(job.id));
  })();

  // ============================================================================
  // LOCAL STATE (Day 15 Session 5 - Responsive expand/collapse, no flash)
  // ============================================================================
  
  /**
   * Computes the initial expand state based on screen width.
   * 
   * DAY 15 SESSION 5 FIX:
   * Previously used useEffect which caused a flash (collapsed -> expanded).
   * Now we compute initial state immediately using a function initializer.
   * 
   * HOW IT WORKS:
   * 1. Check if window is available (client-side only)
   * 2. If desktop (>=1024px), return all sections expanded
   * 3. If mobile or SSR, return all sections collapsed
   * 
   * WHY THIS APPROACH:
   * - No flash because state is correct from the first render
   * - SSR-safe: returns collapsed state when window is undefined
   * - Desktop users see expanded sections immediately
   * 
   * @returns Initial expand state object
   */
  function getInitialExpandState(): Record<string, boolean> {
    // SSR safety: window is not available during server render
    if (typeof window === 'undefined') {
      return {
        qualification: false,
        competitiveness: false,
        salary: false,
      };
    }
    
    // Check if desktop (breakpoint: 1024px)
    const isDesktop = window.innerWidth >= 1024;
    
    if (isDesktop) {
      // Desktop: all sections expanded by default for quick scanning
      return {
        qualification: true,
        competitiveness: true,
        salary: true,
      };
    }
    
    // Mobile: all collapsed to reduce drawer height
    return {
      qualification: false,
      competitiveness: false,
      salary: false,
    };
  }
  
  /**
   * Track which accordion sections are expanded.
   * 
   * DAY 15 BEHAVIOR:
   * - Desktop (>=1024px): All sections default expanded for quick scanning
   * - Mobile (<1024px): All sections default collapsed to reduce height
   * 
   * WHY THIS MATTERS:
   * On desktop, users have screen real estate to see all match info at once.
   * On mobile, the panel is in a drawer and we want to minimize scroll fatigue.
   * 
   * NOTE: The function initializer runs only once on mount and computes
   * the correct initial state based on current viewport width.
   */
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(getInitialExpandState);

  // ============================================================================
  // HOOKS
  // ============================================================================
  const careerImpactVisibility = useCardVisibility('jobSearch.careerImpact');

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Toggles an accordion section open/closed.
   *
   * @param section - The section key to toggle
   */
  function toggleSection(section: string) {
    setExpandedSections(function (prev) {
      const next: Record<string, boolean> = {};
      const keys = Object.keys(prev);
      for (let i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[section] = !next[section];
      return next;
    });
  }
  
  /**
   * Compute whether all sections are currently expanded.
   * Used to determine the label for the Expand/Collapse all button.
   */
  const allExpanded = useCallback(function checkAllExpanded(): boolean {
    for (let i = 0; i < SECTION_KEYS.length; i++) {
      if (!expandedSections[SECTION_KEYS[i]]) {
        return false;
      }
    }
    return true;
  }, [expandedSections]);
  
  /**
   * Toggles all sections expanded or collapsed.
   * 
   * HOW IT WORKS:
   * - If any section is collapsed, expand all
   * - If all sections are expanded, collapse all
   * 
   * WHY THIS UX:
   * Users want a quick way to see everything or hide everything.
   * The toggle behavior matches common accordion patterns.
   */
  function handleExpandCollapseAll() {
    const shouldExpand = !allExpanded();
    
    const next: Record<string, boolean> = {};
    for (let i = 0; i < SECTION_KEYS.length; i++) {
      next[SECTION_KEYS[i]] = shouldExpand;
    }
    setExpandedSections(next);
  }

  // ============================================================================
  // SAVE JOB HANDLER (Day 15)
  // ============================================================================
  /**
   * Handles saving/unsaving the current job.
   * 
   * HOW IT WORKS:
   * 1. Toggle the saved state in the store
   * 2. Show a toast with the result
   * 3. Store automatically persists to localStorage
   * 
   * TOAST MESSAGES:
   * - "Saved job" when adding to saved jobs
   * - "Removed from saved" when removing
   */
  function handleSaveJob() {
    if (job === null) {
      return;
    }

    // Build the saved job summary from legacy format
    const savedJobData = {
      id: String(job.id),
      title: job.role,
      organizationName: job.agency,
      locationDisplay: job.location,
      gradeLevel: job.grade,
      seriesCode: job.series,
      matchPercent: job.matchPercent,
      estimatedTotalComp: job.estTotalComp,
    };

    const result = toggleSavedFn(savedJobData);

    if (result === 'saved') {
      toastApi.toast({
        title: 'Saved job',
        description: job.role + ' at ' + job.agency,
      });
    } else {
      toastApi.toast({
        title: 'Removed from saved',
        description: job.role + ' at ' + job.agency,
      });
    }
  }

  // ============================================================================
  // CREATE ALERT HANDLER (Day 15)
  // ============================================================================
  /**
   * Opens the "Create alert for similar jobs" dialog.
   * Resets the dialog state to defaults.
   */
  function handleOpenCreateAlertDialog() {
    setAlertFrequency('weekly');
    setPreferSameAgency(false);
    setShowCreateAlertDialog(true);
  }

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
   * 6. Apply the filters to show similar jobs immediately
   * 7. Show success toast
   */
  function handleCreateAlert() {
    if (job === null) {
      return;
    }

    // Derive saved search from job
    const derivedSearch = deriveSavedSearchFromJob(
      {
        title: job.role,
        seriesCode: job.series,
        gradeLevel: job.grade,
        locationDisplay: job.location,
        organizationName: job.agency,
        // Try to infer telework from location
        teleworkEligibility: job.location.toLowerCase().indexOf('remote') !== -1 ? 'Remote' : undefined,
        segment: 'federal',
      },
      { preferSameAgency: preferSameAgency }
    );

    // Check for duplicate
    if (hasSignature(derivedSearch.signature)) {
      toastApi.toast({
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
      // This shouldn't happen since we checked for duplicates, but handle it
      toastApi.toast({
        title: 'Alert already exists',
        description: 'You already have an alert for similar jobs.',
      });
      setShowCreateAlertDialog(false);
      return;
    }

    // ========================================================================
    // DAY 20 FIX: Also create alert rule in jobAlertsStore
    // ========================================================================
    // This is the key fix! The Alerts Center page reads from jobAlertsStore,
    // so we must create an alert rule there for it to appear.
    // We extract keywords from the job title and build the alert criteria.
    // ========================================================================

    // Derive keywords from job title (e.g., "Program Analyst" -> "Program Analyst")
    const alertKeywords = job.role;

    // Determine grade band from job grade (e.g., "GS-13" -> "gs13")
    let gradeBand: string | null = null;
    if (job.grade !== undefined && job.grade !== null && job.grade !== '') {
      // Normalize grade format: "GS-13" -> "gs13"
      const gradeNormalized = job.grade.toLowerCase().replace('-', '');
      gradeBand = gradeNormalized;
    }

    // Determine series
    let series: string | null = null;
    if (job.series !== undefined && job.series !== null && job.series !== '') {
      series = job.series;
    }

    // Determine location (use state code or 'dc' pattern)
    let location: string | null = null;
    if (job.location !== undefined && job.location !== null && job.location !== '') {
      // Use the location display as-is for now; matching logic handles partial matches
      location = job.location;
    }

    // Determine if remote-only based on location
    const isRemote = job.location.toLowerCase().indexOf('remote') !== -1;

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

    // Create the alert rule in jobAlertsStore - this persists to pathos-job-alerts
    const createdAlert = createAlertInStore(alertDraft);

    // Apply the derived filters to show similar jobs
    setJobSearchFilters(derivedSearch.filters);

    // Show success toast
    toastApi.toast({
      title: 'Alert created',
      description: 'Tracking similar jobs in your Alerts tab (' + alertFrequency + '). ID: ' + createdAlert.id,
    });

    setShowCreateAlertDialog(false);
  }

  // ============================================================================
  // RENDER: No job selected (empty state)
  // ============================================================================
  if (!job) {
    return (
      <Card className="lg:col-span-2 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selected Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-base font-medium mb-2">No position selected</h3>
            <p className="text-sm max-w-xs mx-auto">
              Click on a job from the results list to see details, match analysis, and tailoring options.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: Card hidden by user
  // ============================================================================
  if (!careerImpactVisibility.visible) {
    return (
      <Card className="lg:col-span-2 border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Selected Position</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={careerImpactVisibility.toggle}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              aria-label="Show this card"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-4">This card is hidden.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={function () {
                careerImpactVisibility.setVisible(true);
              }}
            >
              Show this card
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  // Determine remote/telework status from location
  const locationLower = job.location.toLowerCase();
  const isRemote = locationLower.indexOf('remote') !== -1;
  const teleworkLabel = isRemote ? 'Full Remote' : 'Hybrid';

  /**
   * Get insights values with safe defaults.
   * 
   * DAY 15 SESSION 5 FIX:
   * Replaced ?. and ?? operators with explicit null checks per house rules.
   * 
   * HOW IT WORKS:
   * 1. Check if pathAdvisorInsights exists
   * 2. Access nested properties only if parent exists
   * 3. Return null as fallback for missing values
   */
  let qualMatch: number | null = null;
  let compScore: number | null = null;
  let estSalary: number | null = null;
  let relocationRisk: string | null = null;
  
  if (pathAdvisorInsights !== null) {
    // Extract qualification match percentage
    if (pathAdvisorInsights.qualificationMatch !== undefined) {
      qualMatch = pathAdvisorInsights.qualificationMatch;
    }
    
    // Extract competitiveness score
    if (pathAdvisorInsights.competitivenessScore !== undefined) {
      compScore = pathAdvisorInsights.competitivenessScore;
    }
    
    // Extract estimated salary from nested salaryProjection object
    if (pathAdvisorInsights.salaryProjection !== undefined && pathAdvisorInsights.salaryProjection !== null) {
      if (pathAdvisorInsights.salaryProjection.estimatedNewSalary !== undefined) {
        estSalary = pathAdvisorInsights.salaryProjection.estimatedNewSalary;
      }
    }
    
    // Extract relocation risk level from nested relocationInsights object
    if (pathAdvisorInsights.relocationInsights !== undefined && pathAdvisorInsights.relocationInsights !== null) {
      if (pathAdvisorInsights.relocationInsights.riskLevel !== undefined) {
        relocationRisk = pathAdvisorInsights.relocationInsights.riskLevel;
      }
    }
  }

  // ============================================================================
  // RENDER: Job selected
  // ============================================================================
  return (
    <>
    <Card className="lg:col-span-2 border-border border-2 border-accent/30">
      {/* ================================================================
          HEADER WITH PROMINENT ACTION ICONS (Day 19 Fix)
          ================================================================
          
          PURPOSE:
          Provides clear, visible action icons for Save, Create Alert, and
          USAJOBS link right in the header. This ensures users can easily
          find these actions without scrolling.
          
          LAYOUT:
          - Left: Title with target icon
          - Right: Icon button group (Save, Create Alert, USAJOBS, Visibility)
          ================================================================ */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Selected Position
          </CardTitle>
          {/* ================================================================
              HEADER ACTION ICONS (Day 19)
              ================================================================
              
              Prominent icon buttons for quick actions:
              1. Save/Unsave - Toggle bookmark state
              2. Create Alert - Open alert dialog (bell icon)
              3. USAJOBS - External link to job posting
              4. Visibility - Hide/show card
              ================================================================ */}
          <div className="flex items-center gap-1">
            {/* Save/Unsave icon button */}
            <Button
              type="button"
              variant={isJobSaved ? 'default' : 'ghost'}
              size="icon"
              onClick={handleSaveJob}
              className={'h-7 w-7 ' + (isJobSaved ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}
              aria-label={isJobSaved ? 'Unsave job' : 'Save job'}
              aria-pressed={isJobSaved}
            >
              {isJobSaved ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </Button>
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
            {/* USAJOBS external link */}
            {usajobsUrl && (
              <a
                href={usajobsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Open in USAJOBS"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {/* Visibility toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={careerImpactVisibility.toggle}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label={careerImpactVisibility.visible ? 'Hide this card' : 'Show this card'}
            >
              {careerImpactVisibility.visible ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ================================================================
            JOB SUMMARY
            Shows key details at a glance so user confirms they selected
            the right job.
            ================================================================ */}
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">{job.role}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span>{job.agency}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">{job.series}</Badge>
            <Badge variant="secondary" className="text-xs">{job.grade}</Badge>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.location}
            </Badge>
            <Badge variant="outline" className="text-xs">{teleworkLabel}</Badge>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-green-500" />
              <SensitiveValue
                value={'$' + job.estTotalComp.toLocaleString()}
                masked="$•••,•••"
                hide={globalHide || careerImpactVisibility.isSensitiveHidden}
                className="text-sm font-medium text-green-500"
              />
              <span className="text-xs text-muted-foreground">/yr est.</span>
            </div>
            <Badge
              variant={job.matchPercent >= 90 ? 'default' : 'secondary'}
              className={job.matchPercent >= 90 ? 'bg-accent text-accent-foreground' : ''}
            >
              {job.matchPercent}% match
            </Badge>
          </div>
        </div>

        {/* ================================================================
            PRIMARY CTAs
            The two most common actions, in priority order.
            ================================================================ */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full bg-transparent"
            onClick={onViewDetails}
          >
            View position details
          </Button>
          <Button
            type="button"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={onTailorResume}
          >
            Tailor my resume for this job
          </Button>
        </div>

        {/* ================================================================
            SECONDARY ACTIONS (Day 15 Session 7 - Saved Jobs & Alerts)
            Less common actions, presented as a grid of smaller buttons.
            Actions: Save job (toggle), Create alert, Ask PathAdvisor, Open in USAJOBS
            
            DAY 15 SESSION 7 CHANGES:
            - Save job now toggles saved state with visual feedback
            - Added "Create alert for similar jobs" action
            - Removed Compare button (feature not implemented)
            ================================================================ */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Save job button - toggles saved state (Day 15) */}
          <Button
            type="button"
            variant={isJobSaved ? 'default' : 'ghost'}
            size="sm"
            className={'text-xs gap-1 ' + (isJobSaved ? 'bg-accent text-accent-foreground' : '')}
            onClick={handleSaveJob}
            aria-pressed={isJobSaved}
          >
            {isJobSaved ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                Save job
              </>
            )}
          </Button>
          {/* Create alert button - opens dialog (Day 15) */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={handleOpenCreateAlertDialog}
          >
            <BellPlus className="w-3.5 h-3.5" />
            Create alert
          </Button>
          <AskPathAdvisorButton
            onClick={onAskPathAdvisor}
            fullWidth={false}
            className="text-xs h-8 px-3"
          >
            Ask PathAdvisor
          </AskPathAdvisorButton>
          {usajobsUrl && (
            <a
              href={usajobsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 text-xs h-8 px-3 rounded-md hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in USAJOBS
            </a>
          )}
        </div>

        {/* ================================================================
            WHY THIS MATCHES ACCORDION (Day 15 - Expand/Collapse All)
            Progressive disclosure: concise by default, expandable for details.
            Three sections: Qualification, Competitiveness, Salary/Relocation
            
            DAY 15 CHANGES:
            - Desktop: all sections default expanded for quick scanning
            - Mobile: all sections default collapsed to reduce drawer height
            - Added Expand all / Collapse all button for quick toggling
            ================================================================ */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Why this matches</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={handleExpandCollapseAll}
              aria-label={allExpanded() ? 'Collapse all sections' : 'Expand all sections'}
            >
              <ChevronsUpDown className="w-3 h-3" />
              {allExpanded() ? 'Collapse all' : 'Expand all'}
            </Button>
          </div>

          {insightsLoading && (
            <div className="text-xs text-muted-foreground text-center py-2">
              Loading match analysis...
            </div>
          )}

          {/* ================================================================
              QUALIFICATION MATCH SECTION
              
              DAY 15 SESSION 5:
              Added compact summary hint when collapsed to reduce "empty" feeling.
              The hint shows key signals without duplicating PathAdvisor sidebar.
              ================================================================ */}
          <Collapsible
            open={expandedSections.qualification}
            onOpenChange={function () {
              toggleSection('qualification');
            }}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full text-sm py-2 hover:bg-muted/30 rounded px-2 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-accent" />
                  Qualification match
                </span>
                <div className="flex items-center gap-2">
                  <SensitiveValue
                    value={qualMatch !== null ? qualMatch + '%' : 'Analyzing...'}
                    masked="••%"
                    hide={globalHide || careerImpactVisibility.isSensitiveHidden}
                    className="text-sm font-medium"
                  />
                  {expandedSections.qualification ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
            {/* Compact summary hint when collapsed - reduces empty feeling */}
            {!expandedSections.qualification && (
              <div className="px-2 pb-1 text-[10px] text-muted-foreground/70">
                Skills aligned • Grade requirements met • Series match
              </div>
            )}
            <CollapsibleContent className="px-2 pb-2">
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                <p>Your skills and experience align well with this role&apos;s requirements.</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Experience level matches grade requirements</li>
                  <li>Series code aligns with your background</li>
                  <li>Education requirements likely met</li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ================================================================
              COMPETITIVENESS SECTION
              
              DAY 15 SESSION 5:
              Added compact summary hint when collapsed.
              ================================================================ */}
          <Collapsible
            open={expandedSections.competitiveness}
            onOpenChange={function () {
              toggleSection('competitiveness');
            }}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full text-sm py-2 hover:bg-muted/30 rounded px-2 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  Competitiveness
                </span>
                <div className="flex items-center gap-2">
                  <SensitiveValue
                    value={compScore !== null ? compScore + '%' : 'Analyzing...'}
                    masked="••%"
                    hide={globalHide || careerImpactVisibility.isSensitiveHidden}
                    className={
                      'text-sm font-medium ' +
                      (compScore !== null && compScore >= 70 ? 'text-green-500' : '')
                    }
                  />
                  {expandedSections.competitiveness ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
            {/* Compact summary hint when collapsed */}
            {!expandedSections.competitiveness && (
              <div className="px-2 pb-1 text-[10px] text-muted-foreground/70">
                Moderate pool • Profile stands out • Agency competitive
              </div>
            )}
            <CollapsibleContent className="px-2 pb-2">
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                <p>Based on typical applicant pools for {job.grade} positions.</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Location: {job.location} attracts moderate competition</li>
                  <li>Agency: {job.agency} positions are competitive</li>
                  <li>Your profile stands out in key areas</li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ================================================================
              SALARY AND RELOCATION SECTION
              
              DAY 15 SESSION 5:
              Added compact summary hint when collapsed.
              ================================================================ */}
          <Collapsible
            open={expandedSections.salary}
            onOpenChange={function () {
              toggleSection('salary');
            }}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full text-sm py-2 hover:bg-muted/30 rounded px-2 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Salary and relocation
                </span>
                <div className="flex items-center gap-2">
                  <SensitiveValue
                    value={estSalary !== null ? '$' + (estSalary / 1000).toFixed(0) + 'k' : 'Analyzing...'}
                    masked="$••k"
                    hide={globalHide || careerImpactVisibility.isSensitiveHidden}
                    className="text-sm font-medium"
                  />
                  {expandedSections.salary ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
            {/* Compact summary hint when collapsed */}
            {!expandedSections.salary && (
              <div className="px-2 pb-1 text-[10px] text-muted-foreground/70">
                Locality pay: {job.location} • Low relocation risk
              </div>
            )}
            <CollapsibleContent className="px-2 pb-2">
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                <p>Compensation and location considerations:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>
                    Estimated total compensation:{' '}
                    <SensitiveValue
                      value={'$' + job.estTotalComp.toLocaleString()}
                      masked="$•••,•••"
                      hide={globalHide || careerImpactVisibility.isSensitiveHidden}
                      className=""
                    />
                  </li>
                  <li>Locality pay: {job.location}</li>
                  <li>
                    Relocation risk:{' '}
                    {relocationRisk
                      ? relocationRisk.charAt(0).toUpperCase() + relocationRisk.slice(1)
                      : 'Low'}
                  </li>
                  {isEmployee && (
                    <li>
                      Retirement impact:{' '}
                      <span
                        className={
                          job.retirementImpact.indexOf('+') !== -1
                            ? 'text-red-400'
                            : job.retirementImpact.indexOf('-') !== -1
                              ? 'text-green-400'
                              : ''
                        }
                      >
                        {job.retirementImpact}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>

    </Card>

      {/* ================================================================
          CREATE ALERT DIALOG (Day 15 Session 7)
          ================================================================
          
          PURPOSE:
          Allows users to create an alert for jobs similar to the selected one.
          
          DIALOG CONTENT:
          - Frequency selector (daily/weekly)
          - "Prefer same agency" toggle
          - Summary of what will be tracked
          
          ON CONFIRM:
          - Derives a saved search from the job
          - Enables alerts with the selected frequency
          - Shows toast confirmation
          ================================================================ */}
      <Dialog open={showCreateAlertDialog} onOpenChange={setShowCreateAlertDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Create alert for similar jobs
            </DialogTitle>
            <DialogDescription>
              Track similar job postings in your Alerts tab.
            </DialogDescription>
          </DialogHeader>

          {/* Alert configuration form */}
          <div className="space-y-4 py-4">
            {/* Summary of what will be tracked */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Alert will track:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Series: {job !== null ? job.series : ''}</li>
                <li>• Title keywords: {job !== null ? job.role : ''}</li>
                <li>• Grade range: around {job !== null ? job.grade : ''}</li>
                <li>• Work mode: {job !== null && job.location.toLowerCase().indexOf('remote') !== -1 ? 'Remote' : 'Any'}</li>
              </ul>
            </div>

            {/* ================================================================
                FREQUENCY SELECTOR (Day 15 - Ensure no truncation)
                ================================================================
                
                SelectTrigger has min-w-[140px] and whitespace-nowrap to ensure
                "Weekly digest" and "Daily digest" labels display fully.
                
                Unlike the saved searches row (which has tight space), this
                dialog has room, but we add consistency for future-proofing.
                ================================================================ */}
            <div className="space-y-2">
              <Label htmlFor="alert-frequency">Alert frequency</Label>
              <Select
                value={alertFrequency}
                onValueChange={function (value: string) {
                  if (value === 'daily' || value === 'weekly') {
                    setAlertFrequency(value);
                  }
                }}
              >
                <SelectTrigger id="alert-frequency" className="min-w-[140px] whitespace-nowrap">
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
                <Label htmlFor="prefer-agency">Prefer same agency</Label>
                <p className="text-xs text-muted-foreground">
                  Only alert for jobs at {job !== null ? job.agency : 'this agency'}
                </p>
              </div>
              <Switch
                id="prefer-agency"
                checked={preferSameAgency}
                onCheckedChange={setPreferSameAgency}
              />
            </div>
          </div>

          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
