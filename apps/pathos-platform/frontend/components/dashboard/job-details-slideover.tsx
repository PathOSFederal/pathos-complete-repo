/**
 * ============================================================================
 * JOB DETAILS SLIDE-OVER COMPONENT (Day 12 - Canonical Model Update)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays detailed information about a selected job opportunity in a
 * slide-over panel. This is the primary integration point for the
 * Career Outlook intelligence signals (Day 10 feature).
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used by Job Search page to show job details
 * - Used by Resume Builder to show target job details
 * - Contains Career Outlook panel for intelligence signals
 * - Triggers PathAdvisor auto-seeded message on open
 *
 * DAY 12 CHANGES - CANONICAL MODEL INTEGRATION:
 * ============================================================================
 * This component now accepts canonical job models from lib/jobs:
 *
 * FIELD MAPPING (old → new):
 * - job.role → job.title
 * - job.agency → job.organizationName
 * - job.grade → job.gradeLevel
 * - job.series → job.seriesCode
 * - job.location → job.locationDisplay
 * - job.estTotalComp → job.estimatedTotalComp
 * - job.type → job.employmentType
 *
 * NEW FEATURES:
 * - Dev-only debug accordion showing diagnostics
 * - Proper handling of optional canonical fields
 * - Support for both JobCardModel and JobDetailModel
 *
 * CAREER OUTLOOK INTEGRATION (Day 10):
 * - Computes Career Outlook signals when job is displayed
 * - Shows full Career Outlook panel in the slide-over content
 * - Auto-seeds PathAdvisor with Career Outlook explanation offer
 * - Respects global privacy toggle and per-card visibility
 *
 * PRIVACY HANDLING:
 * - localHide: local toggle within this component
 * - globalHide: from usePrivacy context (via useCardVisibility)
 * - Career Outlook respects both toggles
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Eye,
  EyeOff,
  MapPin,
  Building2,
  Calendar,
  Clock,
  Briefcase,
  GraduationCap,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Shield,
  Info,
  Bookmark,
  BookmarkCheck,
  Bell,
  BellPlus,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { useCardVisibility } from '@/store/userPreferencesStore';
import { SensitiveValue } from '@/components/sensitive-value';
import { AskPathAdvisorButton } from '@/components/pathadvisor/AskPathAdvisorButton';
import { askPathAdvisor } from '@/lib/pathadvisor/askPathAdvisor';
import { CareerOutlookPanel } from '@/components/jobseeker-intelligence/career-outlook-panel';
import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
// Day 43 Follow-up: useTailoringWorkspaceStore import removed - no longer needed
// We now use askPathAdvisor({ preferredSurface: 'dock' }) instead of requestOpenWorkspacePathAdvisor
import {
  computeJobSeekerOutlook,
  type CareerOutlookResult,
} from '@/lib/intelligence/jobseeker-intelligence';
import { useSavedJobsStore } from '@/store/savedJobsStore';
import { useJobAlertsStore } from '@/store/jobAlertsStore';
import { useToast } from '@/hooks/use-toast';
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

// Import canonical job types (Day 12)
import type { JobDiagnostics } from '@/lib/jobs';

/**
 * Props for JobData - accepts canonical job models.
 *
 * DAY 12 MIGRATION:
 * This interface is kept for backward compatibility but now maps to
 * canonical field names. Components passing old-style objects will
 * need to update to canonical names.
 *
 * CANONICAL FIELDS USED:
 * - id: string (was number in legacy)
 * - title: string (was role)
 * - seriesCode: string (was series)
 * - gradeLevel: string (was grade)
 * - locationDisplay: string (was location)
 * - organizationName: string (was agency)
 * - employmentType: string (was type)
 * - estimatedTotalComp: number (was estTotalComp)
 * - matchPercent: number (unchanged)
 * - retirementImpact: string (unchanged)
 */
interface JobData {
  // ============================================================================
  // CANONICAL FIELDS (Day 12)
  // ============================================================================
  id: string | number;
  title: string;
  seriesCode?: string;
  gradeLevel?: string;
  locationDisplay?: string;
  organizationName?: string;
  employmentType?: string;
  estimatedTotalComp?: number;
  matchPercent?: number;
  retirementImpact?: string;
  payRange?: {
    min?: number;
    max?: number;
    displayText?: string;
  };
  // Diagnostics for dev-only debug display
  diagnostics?: JobDiagnostics;

  // ============================================================================
  // LEGACY FIELDS (for backward compatibility during migration)
  // These will be removed in a future version
  // ============================================================================
  /** @deprecated Use title instead */
  role?: string;
  /** @deprecated Use seriesCode instead */
  series?: string;
  /** @deprecated Use gradeLevel instead */
  grade?: string;
  /** @deprecated Use locationDisplay instead */
  location?: string;
  /** @deprecated Use organizationName instead */
  agency?: string;
  /** @deprecated Use employmentType instead */
  type?: string;
  /** @deprecated Use estimatedTotalComp instead */
  estTotalComp?: number;
}

interface JobDetailsSlideoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobData | null;
  onNavigateToJobSearch?: () => void;
  showTailorCTA?: boolean;
  onTailorClick?: () => void;
}

/**
 * Normalizes a JobData object to use canonical field names.
 * Handles both new canonical format and legacy format for backward compatibility.
 *
 * HOW IT WORKS:
 * 1. Check if canonical field exists and has value
 * 2. If not, fall back to legacy field
 * 3. Return object with consistent canonical names
 *
 * @param job - Raw job data (may be canonical or legacy format)
 * @returns Normalized job with canonical field names
 */
function normalizeJobData(job: JobData) {
  // Normalize fields: prefer canonical, fall back to legacy
  const title = job.title || job.role || 'Untitled Position';
  const seriesCode = job.seriesCode || job.series || '';
  const gradeLevel = job.gradeLevel || job.grade || '';
  const locationDisplay = job.locationDisplay || job.location || '';
  const organizationName = job.organizationName || job.agency || '';
  const employmentType = job.employmentType || job.type || '';
  const estimatedTotalComp = job.estimatedTotalComp ?? job.estTotalComp ?? 0;

  return {
    id: String(job.id),
    title: title,
    seriesCode: seriesCode,
    gradeLevel: gradeLevel,
    locationDisplay: locationDisplay,
    organizationName: organizationName,
    employmentType: employmentType,
    estimatedTotalComp: estimatedTotalComp,
    matchPercent: job.matchPercent ?? 0,
    retirementImpact: job.retirementImpact,
    diagnostics: job.diagnostics,
  };
}

// Mock expanded job data - updated for canonical fields (Day 12)
function getExpandedJobData(job: JobData) {
  // First normalize to canonical names
  const normalized = normalizeJobData(job);

  // Generate expanded data with consistent canonical names
  return {
    id: normalized.id,
    title: normalized.title,
    seriesCode: normalized.seriesCode,
    gradeLevel: normalized.gradeLevel,
    locationDisplay: normalized.locationDisplay,
    organizationName: normalized.organizationName,
    employmentType: normalized.employmentType,
    estimatedTotalComp: normalized.estimatedTotalComp,
    matchPercent: normalized.matchPercent,
    jobId: '24-' + (1000 + parseInt(normalized.id, 10)),
    subAgency: normalized.organizationName === 'Department of Defense' ? 'Office of the Secretary' : undefined,
    telework: normalized.locationDisplay.toLowerCase().indexOf('remote') >= 0 ? 'Full Remote' : 'Hybrid (2 days/week)',
    appointmentType: 'Permanent',
    openDate: 'Nov 15, 2024',
    closeDate: 'Dec 15, 2024',
    overview:
      'This position serves as a ' +
      normalized.title +
      ' responsible for providing analytical support and recommendations on complex organizational issues. The incumbent will work with senior leadership to develop and implement strategic initiatives that improve operational efficiency and effectiveness.',
    duties: [
      'Analyze organizational processes and recommend improvements to enhance efficiency',
      'Prepare briefings, reports, and correspondence for senior leadership',
      'Coordinate with stakeholders across multiple departments and agencies',
      'Develop and maintain performance metrics and tracking systems',
      'Provide guidance on policy implementation and compliance',
      'Lead or participate in cross-functional project teams',
    ],
    qualifications: {
      minimumExperience: '1 year of specialized experience at the GS-13 level or equivalent',
      education:
        "Master's degree or equivalent graduate degree, or 2 full years of progressively higher level graduate education",
      specializedExperience: [
        'Experience analyzing complex organizational problems and developing solutions',
        'Experience preparing written reports and briefings for senior leadership',
        'Experience coordinating projects across multiple stakeholder groups',
      ],
    },
    ksas: [
      'Knowledge of organizational analysis principles and methods',
      'Ability to communicate complex information clearly in writing and orally',
      'Skill in project management and coordination',
      'Ability to work effectively with diverse stakeholder groups',
    ],
    hiringPaths: [
      'Federal employees - Competitive service',
      'Career transition (CTAP, ICTAP)',
      'Veterans',
      'Military spouses',
    ],
    howToApply: [
      'Review the qualifications and ensure you meet the minimum requirements',
      'Prepare your federal resume with all required information',
      'Gather supporting documents (transcripts, SF-50, DD-214 if applicable)',
      'Submit your complete application package via USAJOBS before the closing date',
    ],
    estimatedTimeline: '4-8 weeks for initial review, 2-3 months total hiring process',
    pathAdvisorNote:
      'Competition for this ' +
      normalized.gradeLevel +
      ' position is likely high. Strong KSAs demonstrating specific accomplishments will be important. Consider highlighting any experience with ' +
      normalized.organizationName +
      ' or similar agencies.',
    // Include diagnostics for dev panel
    diagnostics: normalized.diagnostics,
  };
}

export function JobDetailsSlideOver(props: JobDetailsSlideoverProps) {
  // ============================================================================
  // PROPS EXTRACTION
  // ============================================================================
  // Extracting props without destructuring to maintain compatibility
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const job = props.job;
  const onNavigateToJobSearch = props.onNavigateToJobSearch;
  const showTailorCTA = props.showTailorCTA !== undefined ? props.showTailorCTA : true;
  const onTailorClick = props.onTailorClick;

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  // localHide: Per-panel privacy toggle (overrides global for this component)
  const [localHide, setLocalHide] = useState(false);
  
  // expandedSections: Tracks which collapsible sections are open
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    duties: true,
    qualifications: true,
    hiringPaths: false,
    howToApply: false,
    timeline: false,
  });
  
  /**
   * DAY 15: Responsive sheet side behavior.
   * 
   * isMobile: Tracks whether we're on a mobile viewport.
   * 
   * HOW IT WORKS:
   * - On mobile (<1024px): Sheet slides in from bottom (more natural for touch)
   * - On desktop (>=1024px): Sheet slides in from right (traditional panel)
   * 
   * WHY BOTTOM ON MOBILE:
   * Bottom sheets are the standard mobile pattern for overlays. They:
   * 1. Are easier to dismiss with a swipe
   * 2. Don't obscure the main navigation
   * 3. Feel more natural for touch interaction
   */
  const [isMobile, setIsMobile] = useState(false);
  
  // ============================================================================
  // SAVED JOBS STORE (Day 19)
  // ============================================================================
  const isSavedFn = useSavedJobsStore(function (state) {
    return state.isSaved;
  });
  const toggleSavedFn = useSavedJobsStore(function (state) {
    return state.toggleSaved;
  });
  const loadSavedJobsFromStorage = useSavedJobsStore(function (state) {
    return state.loadFromStorage;
  });
  const isSavedJobsLoaded = useSavedJobsStore(function (state) {
    return state.isLoaded;
  });

  // ============================================================================
  // JOB ALERTS STORE (Day 19)
  // ============================================================================
  const createAlert = useJobAlertsStore(function (state) {
    return state.createAlert;
  });
  const loadAlertsFromStorage = useJobAlertsStore(function (state) {
    return state.loadFromStorage;
  });
  const isAlertsLoaded = useJobAlertsStore(function (state) {
    return state.isLoaded;
  });

  // ============================================================================
  // TOAST HOOK (Day 19)
  // ============================================================================
  const toastApi = useToast();

  // ============================================================================
  // CREATE ALERT DIALOG STATE (Day 19)
  // ============================================================================
  const [showCreateAlertDialog, setShowCreateAlertDialog] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [alertRemoteOnly, setAlertRemoteOnly] = useState(false);

  /**
   * Effect: Track mobile state on mount and resize.
   * 
   * We check window.innerWidth to determine mobile vs desktop.
   * The 1024px breakpoint matches Tailwind's 'lg' breakpoint.
   */
  useEffect(function trackMobileState() {
    if (typeof window === 'undefined') return;
    
    function checkMobile() {
      setIsMobile(window.innerWidth < 1024);
    }
    
    // Check on mount
    checkMobile();
    
    // Check on resize
    window.addEventListener('resize', checkMobile);
    
    return function cleanup() {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // ============================================================================
  // HOOKS
  // ============================================================================
  // Advisor context for PathAdvisor integration
  const advisorContextData = useAdvisorContext();
  const setPendingPrompt = advisorContextData.setPendingPrompt;
  const setContext = advisorContextData.setContext;
  const setShouldOpenFocusMode = advisorContextData.setShouldOpenFocusMode;
  const setOnPathAdvisorClose = advisorContextData.setOnPathAdvisorClose;

  // Card visibility hook for Career Outlook panel
  // Allows users to hide the Career Outlook panel specifically
  const careerOutlookVisibility = useCardVisibility('jobSearch.careerOutlook');

  // Track whether we've already sent the auto-seeded prompt for this job
  // This prevents re-sending the prompt if the user closes/reopens the panel
  const hasSeededPromptRef = useRef<string | null>(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Memoized normalized job data.
   * Converts legacy field names to canonical format.
   */
  const normalizedJob = useMemo(
    function normalizeForDisplay() {
      if (!job) return null;
      return normalizeJobData(job);
    },
    [job]
  );

  /**
   * Memo: Compute Career Outlook when job changes
   * 
   * PURPOSE:
   * Computes the Career Outlook signals for the current job using the
   * deterministic rules engine. Uses useMemo to avoid unnecessary
   * recalculations and to comply with React best practices.
   *
   * INPUTS:
   * - job data including location, salary, grade, series
   *
   * OUTPUTS:
   * - CareerOutlookResult object or null if no job
   *
   * DAY 12: Updated to use canonical field names
   */
  const careerOutlook = useMemo(
    function computeOutlookForJob(): CareerOutlookResult | null {
      // Only compute if we have a job
      if (!normalizedJob) {
        return null;
      }

      // Compute Career Outlook signals from job data
      // We need to extract salary range from estimatedTotalComp (using ±10% as estimate)
      const salaryEstimate = normalizedJob.estimatedTotalComp;
      const salaryMin = Math.round(salaryEstimate * 0.85);
      const salaryMax = Math.round(salaryEstimate * 1.05);

      // Determine if remote based on location text
      const locationDisplay = normalizedJob.locationDisplay || '';
      const locationLower = locationDisplay.toLowerCase();
      const isRemote = locationLower.indexOf('remote') !== -1;

      // Compute and return the outlook using canonical field names
      return computeJobSeekerOutlook({
        jobTitle: normalizedJob.title,
        location: locationDisplay,
        salaryMin: salaryMin,
        salaryMax: salaryMax,
        grade: normalizedJob.gradeLevel,
        series: normalizedJob.seriesCode,
        isRemote: isRemote,
        telework: isRemote ? 'Full Remote' : 'Hybrid',
        agency: normalizedJob.organizationName,
      });
    },
    [normalizedJob]
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Effect: Auto-seed PathAdvisor with Career Outlook explanation
   * 
   * PURPOSE:
   * When the slide-over opens for a job, automatically seed a PathAdvisor
   * message that offers to explain the Career Outlook signals. This is
   * educational, calm, and does NOT imply document ingestion.
   *
   * BEHAVIOR:
   * - Only sends once per job (tracked by hasSeededPromptRef)
   * - Sets context to job-details source
   * - Opens the PathAdvisor panel
   * - Sets a friendly, educational prompt
   *
   * OPSEC COMPLIANCE:
   * - No mention of uploads, scanning, or ingestion
   * - Focus is on explaining the signals, not collecting data
   *
   * DAY 12: Updated to use canonical field names
   */
  useEffect(
    function autoSeedPathAdvisorOnOpen() {
      // Only trigger when panel opens with a job
      if (!open || !normalizedJob) {
        return;
      }

      // Check if we already seeded for this job (prevent re-seeding)
      const jobKey = String(normalizedJob.id);
      if (hasSeededPromptRef.current === jobKey) {
        return;
      }

      // Mark this job as having been seeded
      hasSeededPromptRef.current = jobKey;

      // Set advisor context for job details (using canonical field names)
      setContext({
        source: 'job-details',
        jobTitle: normalizedJob.title,
        jobSeries: normalizedJob.seriesCode,
        jobGrade: normalizedJob.gradeLevel,
        jobAgency: normalizedJob.organizationName,
        jobLocation: normalizedJob.locationDisplay,
      });

      // Auto-seed a calm, educational message about Career Outlook
      // This prompt offers to explain the signals without any OPSEC concerns
      const careerOutlookPrompt =
        'I see you are viewing the ' +
        normalizedJob.title +
        ' position (' +
        normalizedJob.seriesCode +
        ' ' +
        normalizedJob.gradeLevel +
        ') at ' +
        normalizedJob.organizationName +
        '. Would you like me to explain the Career Outlook signals shown for this job? I can help you understand what the Locality Power score, Career Trajectory, Benefits Value, and Retirement Impact mean for your decision.';

      // Set the pending prompt (will show when user interacts with PathAdvisor)
      setPendingPrompt(careerOutlookPrompt);

      // Note: We don't auto-open the panel here - let the user open it
      // This is less intrusive and respects user attention
    },
    [open, normalizedJob, setContext, setPendingPrompt]
  );

  // ============================================================================
  // LOAD SAVED JOBS AND ALERTS FROM STORAGE (Day 19)
  // ============================================================================
  useEffect(function loadStoresOnMount() {
    if (!isSavedJobsLoaded) {
      loadSavedJobsFromStorage();
    }
    if (!isAlertsLoaded) {
      loadAlertsFromStorage();
    }
  }, [isSavedJobsLoaded, loadSavedJobsFromStorage, isAlertsLoaded, loadAlertsFromStorage]);

  // ============================================================================
  // COMPUTED: IS CURRENT JOB SAVED? (Day 19)
  // ============================================================================
  const isJobSaved = (function checkIfJobSaved(): boolean {
    if (!normalizedJob) {
      return false;
    }
    if (!isSavedJobsLoaded) {
      return false;
    }
    return isSavedFn(String(normalizedJob.id));
  })();

  // ============================================================================
  // SAVE JOB HANDLER (Day 19)
  // ============================================================================
  function handleSaveJob() {
    if (!normalizedJob) {
      return;
    }

    const savedJobData = {
      id: String(normalizedJob.id),
      title: normalizedJob.title,
      organizationName: normalizedJob.organizationName,
      locationDisplay: normalizedJob.locationDisplay,
      gradeLevel: normalizedJob.gradeLevel,
      seriesCode: normalizedJob.seriesCode,
      matchPercent: normalizedJob.matchPercent,
      estimatedTotalComp: normalizedJob.estimatedTotalComp,
    };

    const result = toggleSavedFn(savedJobData);

    if (result === 'saved') {
      toastApi.toast({
        title: 'Saved job',
        description: normalizedJob.title + ' at ' + normalizedJob.organizationName,
      });
    } else {
      toastApi.toast({
        title: 'Removed from saved',
        description: normalizedJob.title + ' at ' + normalizedJob.organizationName,
      });
    }
  }

  // ============================================================================
  // CREATE ALERT HANDLERS (Day 19)
  // ============================================================================
  function handleOpenCreateAlertDialog() {
    if (!normalizedJob) return;
    
    // Pre-fill remoteOnly based on job's location
    const locationLower = (normalizedJob.locationDisplay || '').toLowerCase();
    setAlertRemoteOnly(locationLower.indexOf('remote') !== -1);
    setAlertFrequency('weekly');
    setShowCreateAlertDialog(true);
  }

  function handleCreateAlert() {
    if (!normalizedJob) {
      return;
    }

    // Generate alert name from job attributes
    const alertName = (normalizedJob.seriesCode || '') + ' ' + 
      (normalizedJob.gradeLevel || '') + ' - ' +
      normalizedJob.title.substring(0, 30);

    // Compute grade band from job grade
    let gradeBand: string | null = null;
    if (normalizedJob.gradeLevel) {
      const gradeMatch = normalizedJob.gradeLevel.toUpperCase().match(/GS-(\d+)/);
      if (gradeMatch !== null && gradeMatch.length > 1) {
        const gradeNum = parseInt(gradeMatch[1], 10);
        const lower = Math.max(1, gradeNum - 1);
        const upper = Math.min(15, gradeNum + 1);
        gradeBand = 'gs' + lower + '-gs' + upper;
      }
    }

    // Create the alert
    createAlert({
      name: alertName,
      enabled: true,
      frequency: alertFrequency,
      keywords: normalizedJob.title,
      series: normalizedJob.seriesCode || null,
      gradeBand: gradeBand,
      location: null, // Don't constrain by location unless remoteOnly
      remoteOnly: alertRemoteOnly,
    });

    toastApi.toast({
      title: 'Alert created',
      description: 'We\'ll track similar jobs in your Alerts tab (' + alertFrequency + ').',
    });

    setShowCreateAlertDialog(false);
  }

  // Day 38 Polish: Check if we're in tailoring mode (hooks must be called before early return)
  // Day 43 Follow-up: Used to determine preferredSurface ('dock' in tailoring mode)
  const isTailoringMode = useResumeBuilderStore(function (state) {
    return state.isTailoringMode;
  });
  // Note: requestOpenWorkspacePathAdvisor is no longer used - Day 43 Follow-up replaced it
  // with askPathAdvisor({ preferredSurface: 'dock' }) for proper anchor-first visibility

  if (!job) return null;

  const expandedJob = getExpandedJobData(job);

  const toggleSection = function (section: string) {
    setExpandedSections(function (prev) {
      const next: Record<string, boolean> = {};
      const keys = Object.keys(prev);
      for (let i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[section] = !next[section];
      return next;
    });
  };

  // ============================================================================
  // DAY 43 FOLLOW-UP: JOB DETAILS ASK PATHADVISOR HANDLER
  // ============================================================================
  //
  // WHY THIS MATTERS:
  // When users click "Ask PathAdvisor" from Job Details while in Resume Builder
  // tailoring mode, they expect to see PathAdvisor without losing their resume.
  //
  // OLD BEHAVIOR (BUG):
  // In tailoring mode, this used requestOpenWorkspacePathAdvisor() which only
  // opened the sidebar panel - NOT a visible primary surface. This violated
  // the Day 43 visibility contract.
  //
  // NEW BEHAVIOR (FIX):
  // All paths now use askPathAdvisor() with proper preferredSurface:
  // - In tailoring mode: preferredSurface: 'dock' (opens docked panel)
  // - Outside tailoring mode: preferredSurface: 'focus' (opens Focus Mode)
  //
  // DAY 43 CONTRACT PRESERVED:
  // Both paths guarantee immediate visibility. Anchor is always set before
  // opening the surface. User always sees PathAdvisor respond.
  // ============================================================================
  const handleAskPathAdvisor = function () {
    if (!normalizedJob) return;

    // Build job label for anchor
    const jobLabel = normalizedJob.title + ', ' + normalizedJob.seriesCode + ' ' + normalizedJob.gradeLevel;
    const prompt =
      "I'm considering this position: " +
      normalizedJob.title +
      ', ' +
      normalizedJob.seriesCode +
      ' ' +
      normalizedJob.gradeLevel +
      ', ' +
      normalizedJob.organizationName +
      ', ' +
      normalizedJob.locationDisplay +
      '. Based on my profile and your match analysis' +
      (normalizedJob.matchPercent ? ' (' + normalizedJob.matchPercent + '% match)' : '') +
      ", what are your top tips for my application? What should I emphasize in my resume and KSAs, and are there any risks or gaps I should address?";

    // Day 43 Follow-up: Use askPathAdvisor for both tailoring and non-tailoring modes
    // The only difference is preferredSurface:
    // - Tailoring mode: 'dock' (keeps resume visible in side-by-side layout)
    // - Non-tailoring: 'focus' (full-screen Focus Mode)
    askPathAdvisor({
      source: 'job',
      sourceId: String(normalizedJob.id),
      sourceLabel: jobLabel,
      summary: 'Considering this position',
      contextPayload: {
        source: 'job-details',
        prompt: prompt,
        jobTitle: normalizedJob.title,
        jobSeries: normalizedJob.seriesCode,
        jobGrade: normalizedJob.gradeLevel,
        jobAgency: normalizedJob.organizationName,
        jobLocation: normalizedJob.locationDisplay,
      },
      contextFunctions: {
        setContext: setContext,
        setPendingPrompt: setPendingPrompt,
        setShouldOpenFocusMode: setShouldOpenFocusMode,
        setOnPathAdvisorClose: setOnPathAdvisorClose,
      },
      onClose: function () {
        // Close slideover when PathAdvisor closes
        onOpenChange(false);
      },
      // Day 43 Follow-up: Use docked panel in tailoring mode to preserve resume visibility
      // In tailoring mode, users are editing their resume and need side-by-side view
      // Outside tailoring mode, Focus Mode is the primary experience
      preferredSurface: isTailoringMode ? 'dock' : 'focus',
    });

    // Close the slideover after triggering PathAdvisor
    onOpenChange(false);
  };

  const handleOpenInJobSearch = function () {
    onOpenChange(false);
    if (onNavigateToJobSearch) {
      onNavigateToJobSearch();
    }
  };

  const handleTailorResume = function () {
    if (onTailorClick) {
      onOpenChange(false);
      onTailorClick();
    }
  };

  const shouldShowTailorCTA = showTailorCTA && onTailorClick;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* ================================================================
          DAY 15: Responsive Sheet Side
          ================================================================
          
          Mobile (<1024px): bottom sheet for natural touch interaction
          Desktop (>=1024px): right slide-over for traditional panel UX
          
          STYLING NOTES:
          - Mobile: max-h-[85vh] to leave room for swipe dismissal hint
          - Mobile: rounded-t-lg for polished bottom sheet appearance
          - Desktop: full height with right border
          ================================================================ */}
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile
            ? 'h-[85vh] max-h-[85vh] rounded-t-xl p-0 flex flex-col bg-background border-t border-border'
            : 'w-full sm:w-[90vw] sm:max-w-xl lg:w-[45%] lg:max-w-2xl p-0 flex flex-col bg-background border-l border-border'
        }
        showCloseButton={false}
      >
        {/* Header - Updated for canonical fields (Day 12) */}
        <SheetHeader className="p-4 lg:p-6 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg lg:text-xl font-bold text-foreground">
                {expandedJob.title}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground mt-1">
                {expandedJob.organizationName}
                {expandedJob.subAgency ? ' · ' + expandedJob.subAgency : ''}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  {expandedJob.seriesCode}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {expandedJob.gradeLevel}
                </Badge>
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {expandedJob.locationDisplay}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {expandedJob.telework}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={function () {
                  setLocalHide(!localHide);
                }}
                className="h-8 w-8"
              >
                {localHide ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="sr-only">{localHide ? 'Show' : 'Hide'} sensitive data</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={function () {
                  onOpenChange(false);
                }}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* Helper text for Resume Builder context */}
          {!showTailorCTA && (
            <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-lg p-2.5 lg:p-3">
              You can keep this open while you update your resume.
            </p>
          )}

          {/* Tailor CTA */}
          {shouldShowTailorCTA && (
            <div className="space-y-2">
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleTailorResume}
              >
                Tailor my resume for this job
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                PathOS will link this job to your resume and guide you through updates.
              </p>
            </div>
          )}

          {/* Match Summary Strip - Updated for canonical fields (Day 12) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3 p-3 lg:p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-accent">
                {expandedJob.matchPercent}%
              </div>
              <div className="text-xs text-muted-foreground">Match</div>
            </div>
            <div className="text-center">
              <SensitiveValue
                value={'$' + expandedJob.estimatedTotalComp.toLocaleString()}
                masked="$•••,•••"
                hide={localHide}
                className="text-xl lg:text-2xl font-bold"
              />
              <div className="text-xs text-muted-foreground">Est. Comp</div>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-foreground">
                {expandedJob.appointmentType}
              </div>
              <div className="text-xs text-muted-foreground">Type</div>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-foreground">
                {expandedJob.telework.split(' ')[0]}
              </div>
              <div className="text-xs text-muted-foreground">Telework</div>
            </div>
          </div>

          {/* ================================================================
              CAREER OUTLOOK PANEL (Day 10 - Job Seeker Intelligence Layer)
              ================================================================
              
              PURPOSE:
              Displays all four Career Outlook intelligence signals to help
              the job seeker understand the full value of this opportunity.
              
              SIGNALS SHOWN:
              1. Locality Power Score - Purchasing power in this location
              2. Career Trajectory - Promotion runway assessment
              3. Federal Benefits - Benefits value estimate
              4. Retirement Impact - Long-term retirement leverage
              
              PRIVACY HANDLING:
              - isHidden: from careerOutlookVisibility (per-card toggle)
              - globalHide: combined with localHide (this component's toggle)
              - User can hide the entire panel or just mask values
              ================================================================ */}
          <CareerOutlookPanel
            outlook={careerOutlook}
            isHidden={!careerOutlookVisibility.visible}
            globalHide={localHide || careerOutlookVisibility.isSensitiveHidden}
            showVisibilityToggle={true}
            onToggleVisibility={careerOutlookVisibility.toggle}
          />

          {/* Overview Section - Updated for canonical fields (Day 12) */}
          <section>
            <h3 className="text-sm lg:text-base font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-accent" />
              Overview
            </h3>
            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
              {expandedJob.overview}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="flex items-center gap-2 text-sm lg:text-base text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{expandedJob.locationDisplay}</span>
              </div>
              <div className="flex items-center gap-2 text-sm lg:text-base text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span>{expandedJob.telework}</span>
              </div>
              <div className="flex items-center gap-2 text-sm lg:text-base text-muted-foreground">
                <Briefcase className="w-3 h-3" />
                <span>{expandedJob.appointmentType}</span>
              </div>
              <div className="flex items-center gap-2 text-sm lg:text-base text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Closes: {expandedJob.closeDate}</span>
              </div>
            </div>
          </section>

          {/* ================================================================
              DEV-ONLY DEBUG PANEL (Day 12)
              ================================================================
              Shows diagnostics information for debugging purposes.
              Only visible in development mode (NODE_ENV !== 'production').
              
              DISPLAYS:
              - diagnostics.source: Where the data came from
              - diagnostics.mapperVersion: Which mapper processed it
              - diagnostics.fetchedAtISO: When it was fetched
              - diagnostics.warnings: Any mapping issues
              - diagnostics.raw: The original raw payload
              ================================================================ */}
          {process.env.NODE_ENV !== 'production' && expandedJob.diagnostics && (
            <Collapsible
              open={expandedSections.timeline}
              onOpenChange={function () {
                toggleSection('timeline');
              }}
            >
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-sm lg:text-base font-medium py-2 hover:text-amber-400 transition-colors bg-amber-500/10 rounded px-2">
                  <span className="flex items-center gap-2 text-amber-400">
                    <Shield className="w-4 h-4" />
                    🔧 Debug: Job Diagnostics (dev only)
                  </span>
                  {expandedSections.timeline ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pb-2 mt-2">
                {/* Source and version info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/30 rounded p-2">
                    <span className="text-muted-foreground">Source:</span>
                    <span className="ml-2 font-mono">{expandedJob.diagnostics.source}</span>
                  </div>
                  <div className="bg-muted/30 rounded p-2">
                    <span className="text-muted-foreground">Mapper:</span>
                    <span className="ml-2 font-mono">{expandedJob.diagnostics.mapperVersion}</span>
                  </div>
                </div>
                <div className="bg-muted/30 rounded p-2 text-xs">
                  <span className="text-muted-foreground">Fetched:</span>
                  <span className="ml-2 font-mono">{expandedJob.diagnostics.fetchedAtISO}</span>
                </div>

                {/* Warnings */}
                {expandedJob.diagnostics.warnings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
                    <p className="text-xs font-medium text-amber-400 mb-1">
                      ⚠️ Mapping Warnings ({expandedJob.diagnostics.warnings.length})
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {expandedJob.diagnostics.warnings.map(function (warning, idx) {
                        return (
                          <li key={idx} className="font-mono">
                            • {warning}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Raw payload */}
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Raw Payload (diagnostics.raw)
                  </p>
                  <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-40 p-2 bg-background rounded border border-border">
                    {JSON.stringify(expandedJob.diagnostics.raw, null, 2)}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Duties Section */}
          <Collapsible
            open={expandedSections.duties}
            onOpenChange={function () {
              toggleSection('duties');
            }}
          >
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-sm lg:text-base font-medium py-2 hover:text-accent transition-colors">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  Duties & Responsibilities
                </span>
                {expandedSections.duties ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="space-y-2 pl-6 pb-2">
                {expandedJob.duties.map(function (duty, index) {
                  return (
                    <li key={index} className="text-sm lg:text-base text-muted-foreground list-disc">
                      {duty}
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>

          {/* Qualifications Section */}
          <Collapsible
            open={expandedSections.qualifications}
            onOpenChange={function () {
              toggleSection('qualifications');
            }}
          >
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-sm lg:text-base font-medium py-2 hover:text-accent transition-colors">
                <span className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-accent" />
                  Qualifications & KSAs
                </span>
                {expandedSections.qualifications ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pb-2">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1">
                  Minimum Experience
                </p>
                <p className="text-sm lg:text-base text-muted-foreground">
                  {expandedJob.qualifications.minimumExperience}
                </p>
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1">
                  Education
                </p>
                <p className="text-sm lg:text-base text-muted-foreground">
                  {expandedJob.qualifications.education}
                </p>
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1">
                  Specialized Experience
                </p>
                <ul className="space-y-1 pl-4">
                  {expandedJob.qualifications.specializedExperience.map(function (exp, index) {
                    return (
                      <li
                        key={index}
                        className="text-sm lg:text-base text-muted-foreground list-disc"
                      >
                        {exp}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1">
                  KSAs / Competencies
                </p>
                <ul className="space-y-1 pl-4">
                  {expandedJob.ksas.map(function (ksa, index) {
                    return (
                      <li
                        key={index}
                        className="text-sm lg:text-base text-muted-foreground list-disc"
                      >
                        {ksa}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* How You Match */}
              <div className="bg-muted/30 rounded-lg p-3 mt-2">
                <p className="text-xs lg:text-sm font-medium mb-2">How you match</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs lg:text-sm">
                    Skills Match: 85%
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-xs lg:text-sm bg-green-500/20 text-green-400"
                  >
                    Experience: Qualified
                  </Badge>
                  <Badge variant="secondary" className="text-xs lg:text-sm">
                    Keyword Match: 72%
                  </Badge>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Hiring Paths Section */}
          <Collapsible
            open={expandedSections.hiringPaths}
            onOpenChange={function () {
              toggleSection('hiringPaths');
            }}
          >
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-sm lg:text-base font-medium py-2 hover:text-accent transition-colors">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  Hiring Path & Eligibility
                </span>
                {expandedSections.hiringPaths ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-2 pb-2">
                {expandedJob.hiringPaths.map(function (path, index) {
                  return (
                    <Badge key={index} variant="outline" className="text-xs lg:text-sm">
                      {path}
                    </Badge>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* How to Apply Section */}
          <Collapsible
            open={expandedSections.howToApply}
            onOpenChange={function () {
              toggleSection('howToApply');
            }}
          >
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-sm lg:text-base font-medium py-2 hover:text-accent transition-colors">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  How to Apply
                </span>
                {expandedSections.howToApply ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ol className="space-y-2 pl-6 pb-2">
                {expandedJob.howToApply.map(function (step, index) {
                  return (
                    <li
                      key={index}
                      className="text-sm lg:text-base text-muted-foreground list-decimal"
                    >
                      {step}
                    </li>
                  );
                })}
              </ol>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mt-2">
                <p className="text-xs lg:text-sm text-muted-foreground">
                  <Shield className="w-3 h-3 inline mr-1" />
                  PathOS does not submit applications; it only guides users through the process.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Timeline Section */}
          <Collapsible
            open={expandedSections.timeline}
            onOpenChange={function () {
              toggleSection('timeline');
            }}
          >
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-sm lg:text-base font-medium py-2 hover:text-accent transition-colors">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  Timeline & Notes
                </span>
                {expandedSections.timeline ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pb-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-xs lg:text-sm text-muted-foreground">Close Date</p>
                  <p className="text-sm lg:text-base font-medium">{expandedJob.closeDate}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-xs lg:text-sm text-muted-foreground">Est. Timeline</p>
                  <p className="text-sm lg:text-base font-medium">2-3 months</p>
                </div>
              </div>
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs lg:text-sm text-muted-foreground">
                    {expandedJob.pathAdvisorNote}
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ================================================================
              SECONDARY ACTIONS (Day 19 - Save Job + Create Alert)
              ================================================================ */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {/* Save/Unsave toggle button */}
            <Button
              type="button"
              variant={isJobSaved ? 'default' : 'outline'}
              size="sm"
              className={'gap-1.5 ' + (isJobSaved ? 'bg-accent text-accent-foreground' : 'bg-transparent')}
              onClick={handleSaveJob}
              aria-pressed={isJobSaved}
            >
              {isJobSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Save job
                </>
              )}
            </Button>

            {/* Create alert button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 bg-transparent"
              onClick={handleOpenCreateAlertDialog}
            >
              <BellPlus className="w-4 h-4" />
              Create alert
            </Button>
          </div>

          {/* Actions inside slide-over */}
          <div className="space-y-2 pt-2">
            <AskPathAdvisorButton onClick={handleAskPathAdvisor}>
              Ask PathAdvisor about this job
            </AskPathAdvisorButton>
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleOpenInJobSearch}
            >
              <ExternalLink className="w-4 h-4" />
              Open in Job Search
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-3 lg:p-4 space-y-2 lg:space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <AskPathAdvisorButton
              onClick={handleAskPathAdvisor}
              fullWidth={false}
              className="flex-1"
            >
              <span className="hidden sm:inline">Ask PathAdvisor about this job</span>
              <span className="sm:hidden">Ask PathAdvisor</span>
            </AskPathAdvisorButton>
            {onNavigateToJobSearch && (
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-transparent"
                onClick={handleOpenInJobSearch}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Open in Job Search</span>
                <span className="sm:hidden">Job Search</span>
              </Button>
            )}
          </div>
          <p className="text-xs lg:text-sm text-muted-foreground text-center flex items-center justify-center gap-1">
            <Info className="w-3 h-3" />
            Data for illustrative purposes only
          </p>
        </div>
      </SheetContent>

      {/* ================================================================
          CREATE ALERT DIALOG (Day 19)
          ================================================================
          
          PURPOSE:
          Allows users to create an alert for jobs similar to the selected one.
          
          DIALOG CONTENT:
          - Summary of what will be tracked (series, title, grade range)
          - Frequency selector (daily/weekly)
          - Remote-only toggle
          
          ON CONFIRM:
          - Creates alert with derived criteria
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
                <li>• Series: {normalizedJob ? normalizedJob.seriesCode : ''}</li>
                <li>• Title keywords: {normalizedJob ? normalizedJob.title : ''}</li>
                <li>• Grade range: around {normalizedJob ? normalizedJob.gradeLevel : ''}</li>
                <li>• Work mode: {alertRemoteOnly ? 'Remote only' : 'Any'}</li>
              </ul>
            </div>

            {/* Frequency selector */}
            <div className="space-y-2">
              <Label htmlFor="alert-frequency-slideover">Alert frequency</Label>
              <Select
                value={alertFrequency}
                onValueChange={function (value: string) {
                  if (value === 'daily' || value === 'weekly') {
                    setAlertFrequency(value);
                  }
                }}
              >
                <SelectTrigger id="alert-frequency-slideover" className="min-w-[140px]">
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

            {/* Remote-only toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="alert-remote-only">Remote jobs only</Label>
                <p className="text-xs text-muted-foreground">
                  Only alert for remote positions
                </p>
              </div>
              <Switch
                id="alert-remote-only"
                checked={alertRemoteOnly}
                onCheckedChange={setAlertRemoteOnly}
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
    </Sheet>
  );
}
