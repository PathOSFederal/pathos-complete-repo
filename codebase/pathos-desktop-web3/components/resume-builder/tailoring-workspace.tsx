/**
 * ============================================================================
 * TAILORING WORKSPACE COMPONENT (Day 38 Correction)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Dedicated workspace view for tailoring a resume to a specific job.
 * This is the primary experience when a job is selected for tailoring.
 * Eliminates duplicated context cards and makes editor + preview the hero.
 * PathAdvisor is Guidance Strip first, full chat only as optional overlay.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used in Resume Builder page when tailoringState.targetJobId exists
 * - Replaces the noisy card-stacked layout with a clean two-pane workspace
 * - Integrates with existing ResumeEditorPane and ResumePreviewPane
 * - Uses GuidanceStrip instead of full PathAdvisor panel by default
 *
 * KEY FEATURES:
 * - Compact top bar (single bar, not stacked cards) with:
 *   - Tailoring for: [Job]
 *   - View job details button (reuse existing slide-over)
 *   - Match summary (single line)
 * - Two-pane main region:
 *   - Left: editor
 *   - Right: live preview
 * - PathAdvisor behavior:
 *   - GuidanceStrip only (quiet, contextual, collapsible)
 *   - Optional "Open PathAdvisor" button that opens chat as drawer/overlay
 * - Suggestions:
 *   - Inline at field level (before/after with accept/dismiss)
 *   - No big standalone card feed
 *
 * @version Day 38 - Resume Builder Tailoring Workspace Correction
 * ============================================================================
 */

'use client';

// Day 43: Removed useRouter - no longer needed since Resume Review is a modal mode
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PanelLeft, PanelRight, Save, FileText, Maximize2, Minimize2, Trash2, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ResumeEditorPane } from '@/components/resume-builder/resume-editor-pane';
import { ResumePreviewPane } from '@/components/resume-builder/resume-preview-pane';
import { GuidanceStrip } from '@/components/resume-builder/guidance-strip';
import { ResumeWorkspaceHeaderActions } from '@/components/resume-builder/resume-workspace-header-actions';
import { JobDetailsSlideOver } from '@/components/dashboard/job-details-slideover';
import { PathAdvisorPanel } from '@/components/path-advisor-panel';
import { ReviewExportStep } from '@/components/resume-builder/review-export-step';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { getGuidanceMessages } from '@/lib/resume/guidance-rules';
import type { ResumeData } from '@/lib/mock/resume-builder';
import type { ResumeData as PageResumeData } from '@/components/resume-builder/resume-types';
import type {
  ResumeDocument,
  ResumeVersion,
  SuggestedRewrite,
} from '@/lib/resume/resume-domain-model';
import type { GuidanceContext } from '@/lib/resume/guidance-rules';
import type { TargetJob } from '@/store/resumeBuilderStore';
import { applyTailoringHints } from '@/lib/resume/resume-helpers';
import { resumeDataToDocument } from '@/lib/resume/resume-helpers';
import { useTailoringWorkspaceStore } from '@/store/tailoringWorkspaceStore';
// Day 43: Use askPathAdvisor for anchor-first Focus Mode opening
// Day 43 Follow-up: Import preferredSurface type for docked panel
import { askPathAdvisor } from '@/lib/pathadvisor/askPathAdvisor';
import { useAdvisorContext } from '@/contexts/advisor-context';
// Day 43 Follow-up: Docked PathAdvisor panel for side-by-side workflow
import { DockedPathAdvisorPanel } from '@/components/pathadvisor/DockedPathAdvisorPanel';
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
// Day 43 Follow-up: Import stores needed for context dependencies
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useBenefitsWorkspaceStore } from '@/store/benefitsWorkspaceStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useProfileStore } from '@/store/profileStore';
import type { FocusRightRailDependencies } from '@/lib/pathadvisor/focusRightRail';

interface TailoringWorkspaceProps {
  initialResumeData: PageResumeData;
  activeTargetJob: TargetJob | null;
  onUpdateResumeData: (data: PageResumeData) => void;
  onClearTailoring: () => void;
  onOpenJobPicker?: () => void; // Day 38 Continuation: Optional callback to open job picker
  /**
   * Day 43: Callback to open Resume Review mode.
   * 
   * WHY THIS EXISTS (Day 43 UX Rule):
   * Resume Review is a MODE, not a destination. Clicking "Review my resume"
   * must NOT navigate away from the Resume Builder. Instead, this callback
   * opens the Resume Review modal overlay while keeping the Resume Builder
   * mounted underneath.
   * 
   * The parent page (Resume Builder) handles the actual modal state.
   */
  onReviewResume?: () => void;
}

/**
 * Tailoring Workspace Component
 *
 * PURPOSE:
 * Dedicated workspace for tailoring a resume to a specific job.
 * Clean, focused layout with editor + preview as the hero.
 * GuidanceStrip provides contextual help without noise.
 */
export function TailoringWorkspace(props: TailoringWorkspaceProps) {
  const initialResumeData = props.initialResumeData;
  const activeTargetJob = props.activeTargetJob;
  const onUpdateResumeData = props.onUpdateResumeData;
  const onClearTailoring = props.onClearTailoring;
  const onOpenJobPicker = props.onOpenJobPicker;
  // Day 43: Callback to open Resume Review mode (not navigation)
  const onReviewResume = props.onReviewResume;

  // Helper to normalize PageResumeData to ResumeData (required fields)
  const normalizeResumeData = function (data: PageResumeData): ResumeData {
    return {
      profile: {
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        email: data.profile.email,
        phone: data.profile.phone,
        address: data.profile.address,
        city: data.profile.city,
        state: data.profile.state,
        zip: data.profile.zip,
        citizenship: data.profile.citizenship,
        veteranStatus: data.profile.veteranStatus,
        securityClearance: data.profile.securityClearance,
        currentAgency: data.profile.currentAgency || '',
        currentSeries: data.profile.currentSeries || '',
        currentGrade: data.profile.currentGrade || '',
      },
      targetRoles: data.targetRoles.map(function (r) {
        return {
          id: r.id,
          title: r.title,
          series: r.series,
          gradeMin: r.gradeMin,
          gradeMax: r.gradeMax,
          location: r.location,
        };
      }),
      workExperience: data.workExperience.map(function (exp) {
        return {
          id: exp.id,
          employer: exp.employer,
          title: exp.title,
          series: exp.series || '',
          grade: exp.grade || '',
          startDate: exp.startDate,
          endDate: exp.endDate,
          current: exp.current,
          hoursPerWeek: exp.hoursPerWeek,
          salary: exp.salary || '',
          supervisorName: exp.supervisorName || '',
          supervisorPhone: exp.supervisorPhone || '',
          duties: exp.duties,
          accomplishments: exp.accomplishments,
        };
      }),
      education: data.education.map(function (edu) {
        return {
          id: edu.id,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          graduationDate: edu.graduationDate,
          gpa: edu.gpa || '',
          credits: edu.credits || '',
        };
      }),
      skills: {
        technicalSkills: data.skills.technicalSkills,
        certifications: data.skills.certifications,
        languages: data.skills.languages,
        ksas: data.skills.ksas,
      },
    };
  };

  const [resumeDocument, setResumeDocument] = useState<ResumeDocument>(function () {
    return resumeDataToDocument(normalizeResumeData(initialResumeData));
  });

  // Typing activity tracking for Guidance Strip quiet mode
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Job details slide-over state
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);

  // Day 43: Get advisor context functions for askPathAdvisor
  const advisorContextData = useAdvisorContext();

  // ============================================================================
  // DAY 43 FOLLOW-UP: DOCKED PATHADVISOR PANEL STATE
  // ============================================================================
  //
  // WHY DOCKED PANEL EXISTS:
  // Resume Builder users need to view/edit their resume while receiving
  // PathAdvisor guidance. Full Focus Mode hides the resume, breaking the
  // side-by-side workflow users expect. Docked panel solves this.
  //
  // HOW IT WORKS:
  // 1. askPathAdvisor() with preferredSurface: 'dock' sets shouldOpenDockedPanel in store
  // 2. This component watches that flag and opens the docked panel
  // 3. Docked panel shows anchor context + thread + input
  // 4. User can "Pop out to Focus Mode" for full-screen if needed
  // ============================================================================

  // Day 43 Follow-up: Watch store flag for docked panel requests
  const shouldOpenDockedPanel = usePathAdvisorStore(function (state) {
    return state.shouldOpenDockedPanel;
  });
  // Note: clearShouldOpenDockedPanel is called inside DockedPathAdvisorPanel after it opens

  // Day 43 Follow-up: Local state for docked panel open/close
  const [isDockedPanelOpen, setIsDockedPanelOpen] = useState(false);

  // Day 43 Follow-up: Messages state for docked panel thread
  // Note: This is separate from the sidebar PathAdvisorPanel messages.
  // In a production app, these would be unified via a messages store.
  const [dockedPanelMessages, setDockedPanelMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([]);
  const [dockedPanelInputValue, setDockedPanelInputValue] = useState('');
  const dockedPanelMessageIdCounter = useRef(0);

  // Day 43 Follow-up: Store dependencies for context panel
  const profile = useProfileStore(function (state) {
    return state.profile;
  });
  const selectedJob = useJobSearchStore(function (state) {
    return state.selectedJob;
  });
  const benefitsScenarioA = useBenefitsWorkspaceStore(function (state) {
    return state.scenarios.A;
  });
  const activeScenarioId = useBenefitsWorkspaceStore(function (state) {
    return state.activeScenarioId;
  });
  const benefitsScenarioB = useBenefitsWorkspaceStore(function (state) {
    return state.scenarios.B;
  });
  const dashboardCompensation = useDashboardStore(function (state) {
    return state.compensation;
  });

  // Day 43 Follow-up: Build context dependencies for AnchorContextPanel
  const getGradeDisplay = function () {
    if (profile.persona === 'job_seeker') {
      if (profile.goals.gradeBand === 'custom') {
        return profile.goals.targetGradeFrom + '–' + profile.goals.targetGradeTo;
      }
      const bandMap: Record<string, string> = {
        entry: 'GS-5–7',
        early: 'GS-7–9',
        mid: 'GS-9–11',
        senior: 'GS-12–13',
        unsure: 'Exploring',
      };
      return bandMap[profile.goals.gradeBand] || 'Not set';
    } else {
      return profile.goals.targetGradeFrom + '–' + profile.goals.targetGradeTo;
    }
  };

  // Day 43 Follow-up: Map persona to expected type
  // Profile store uses 'federal_employee' but FocusRightRailDependencies expects 'fed_employee'
  const mappedPersona = profile.persona === 'federal_employee' ? 'fed_employee' : 'job_seeker';
  
  const dockedPanelDependencies: FocusRightRailDependencies = {
    selectedJob: selectedJob,
    benefitsScenario: activeScenarioId === 'A' ? benefitsScenarioA : benefitsScenarioB,
    profile: {
      persona: mappedPersona,
      targetGrade: getGradeDisplay(),
      location: profile.location.currentMetroArea || undefined,
    },
    resume: {
      activeTargetJobTitle: activeTargetJob?.title,
      isTailoringMode: true,
    },
    dashboardMetrics: {
      totalComp: dashboardCompensation.totalCompensation,
    },
  };

  // Day 43 Follow-up: Handle sending message in docked panel
  const handleDockedPanelSendMessage = useCallback(function (message: string) {
    dockedPanelMessageIdCounter.current = dockedPanelMessageIdCounter.current + 1;
    const userMsgId = 'docked-user-' + dockedPanelMessageIdCounter.current;
    dockedPanelMessageIdCounter.current = dockedPanelMessageIdCounter.current + 1;
    const assistantMsgId = 'docked-assistant-' + dockedPanelMessageIdCounter.current;

    const userMessage = {
      id: userMsgId,
      role: 'user' as const,
      content: message,
    };

    // Mock assistant response (in production, this would call an AI service)
    const assistantMessage = {
      id: assistantMsgId,
      role: 'assistant' as const,
      content: generateResumeGuidanceResponse(message, activeTargetJob),
    };

    setDockedPanelMessages(function (prev) {
      return prev.concat([userMessage, assistantMessage]);
    });
  }, [activeTargetJob]);

  // Day 43 Follow-up: Effect to open docked panel when store signals
  useEffect(function handleDockedPanelRequest() {
    if (shouldOpenDockedPanel) {
      setIsDockedPanelOpen(true);
      // The DockedPathAdvisorPanel component will clear the flag after rendering
    }
  }, [shouldOpenDockedPanel]);

  // Day 43 Follow-up: Handle pop out to Focus Mode
  const handlePopOutToFocusMode = useCallback(function () {
    // Close docked panel
    setIsDockedPanelOpen(false);
    // Open Focus Mode via advisor context
    advisorContextData.setShouldOpenFocusMode(true);
  }, [advisorContextData]);

  // PathAdvisor drawer state
  // Day 38 Continuation: Local docking state for workspace-aware PathAdvisor
  // Day 38 Polish Fix: Single instance mode - 'closed' | 'side' | 'full'
  // When 'full', side sheet is closed and full-screen dialog is open
  // When 'side', side sheet is open
  // When 'closed', nothing is rendered
  const [pathAdvisorMode, setPathAdvisorMode] = useState<'closed' | 'side' | 'full'>('closed');
  const [pathAdvisorDock, setPathAdvisorDock] = useState<'left' | 'right'>('right');

  // Day 38 Session Closure: Export and exit state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
  // Day 38 Polish: Resume Library modal state
  const [isResumeLibraryOpen, setIsResumeLibraryOpen] = useState(false);

  // Day 38 Continuation: Guidance drawer state (replaces persistent GuidanceStrip)
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  
  // Day 38 Continuation: Track guidance count for toast notifications
  const [guidanceCount, setGuidanceCount] = useState(0);
  const [lastGuidanceCount, setLastGuidanceCount] = useState(0);
  const toastDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Day 38 Polish: Version management modals
  const [isSaveVersionModalOpen, setIsSaveVersionModalOpen] = useState(false);
  const [isManageVersionsModalOpen, setIsManageVersionsModalOpen] = useState(false);
  const [saveVersionName, setSaveVersionName] = useState('');
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionName, setEditingVersionName] = useState('');
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  
  // Day 38 Polish: Focus view modal
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);
  
  // Day 38 Polish: Guidance notifications toggle (persisted in localStorage)
  const [guidanceNotificationsEnabled, setGuidanceNotificationsEnabled] = useState(function () {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('resume-builder-guidance-notifications');
      return stored !== 'false'; // Default to true
    } catch {
      return true;
    }
  });
  
  // Day 38 Polish: Track dismissed guidance items for auto-close
  const [dismissedGuidanceIds, setDismissedGuidanceIds] = useState<Set<string>>(new Set());

  // Track typing activity
  const handleTypingActivity = useCallback(function () {
    const now = Date.now();
    setLastTypingTime(now);
    setIsTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current !== null) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to false after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(function () {
      setIsTyping(false);
    }, 2000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(
    function () {
      return function () {
        if (typingTimeoutRef.current !== null) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    },
    []
  );

  // Day 38 Polish: Listen for workspace PathAdvisor requests (from Job Details)
  const pathAdvisorRequest = useTailoringWorkspaceStore(function (state) {
    return state.pathAdvisorRequest;
  });
  const clearPathAdvisorRequest = useTailoringWorkspaceStore(function (state) {
    return state.clearPathAdvisorRequest;
  });
  
  // Day 38 Polish: Open workspace PathAdvisor when requested
  useEffect(
    function () {
      if (pathAdvisorRequest !== null) {
        // Open the workspace PathAdvisor in side mode
        setPathAdvisorMode('side');
        
        // TODO: Pre-seed PathAdvisor prompt with job information if payload provided
        // This would require PathAdvisorPanel to accept an initial prompt prop
        // For now, just opening the panel is sufficient
        
        // Clear the request after handling
        clearPathAdvisorRequest();
      }
    },
    [pathAdvisorRequest, clearPathAdvisorRequest]
  );

  // Update resume document when initial data changes
  useEffect(
    function () {
      const normalized = normalizeResumeData(initialResumeData);
      const newDoc = resumeDataToDocument(normalized);
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(function () {
        setResumeDocument(newDoc);
      }, 0);
    },
    [initialResumeData]
  );

  // Generate tailoring suggestions when in tailoring mode
  const [suggestions, setSuggestions] = useState<SuggestedRewrite[]>([]);
  useEffect(
    function () {
      if (activeTargetJob) {
        const currentResumeData: ResumeData = {
          profile: resumeDocument.baseProfile,
          targetRoles: resumeDocument.baseSections.targetRoles,
          workExperience: resumeDocument.baseSections.workExperience,
          education: resumeDocument.baseSections.education,
          skills: resumeDocument.baseSections.skills,
        };
        const newSuggestions = applyTailoringHints(currentResumeData, activeTargetJob);
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(function () {
          setSuggestions(newSuggestions);
        }, 0);
      } else {
        setTimeout(function () {
          setSuggestions([]);
        }, 0);
      }
    },
    [activeTargetJob, resumeDocument]
  );

  // Get active version and view
  const activeVersion = resumeDocument.versions.find(function (v) {
    return v.id === resumeDocument.activeVersionId;
  });
  const activeView = resumeDocument.views.find(function (v) {
    return v.id === resumeDocument.activeViewId;
  });

  // Current resume data (from active version) - convert back to PageResumeData format
  // Day 38 Session Closure: Wrapped in useMemo to fix dependency warnings
  const currentResumeData: PageResumeData = useMemo(function () {
    return activeVersion
    ? {
        profile: {
          firstName: activeVersion.snapshot.profile.firstName,
          lastName: activeVersion.snapshot.profile.lastName,
          email: activeVersion.snapshot.profile.email,
          phone: activeVersion.snapshot.profile.phone,
          address: activeVersion.snapshot.profile.address,
          city: activeVersion.snapshot.profile.city,
          state: activeVersion.snapshot.profile.state,
          zip: activeVersion.snapshot.profile.zip,
          citizenship: activeVersion.snapshot.profile.citizenship,
          veteranStatus: activeVersion.snapshot.profile.veteranStatus,
          securityClearance: activeVersion.snapshot.profile.securityClearance,
          currentAgency: activeVersion.snapshot.profile.currentAgency || undefined,
          currentSeries: activeVersion.snapshot.profile.currentSeries || undefined,
          currentGrade: activeVersion.snapshot.profile.currentGrade || undefined,
        },
        targetRoles: activeVersion.snapshot.targetRoles,
        workExperience: activeVersion.snapshot.workExperience.map(function (exp) {
          return {
            id: exp.id,
            employer: exp.employer,
            title: exp.title,
            series: exp.series || undefined,
            grade: exp.grade || undefined,
            startDate: exp.startDate,
            endDate: exp.endDate,
            current: exp.current,
            hoursPerWeek: exp.hoursPerWeek,
            salary: exp.salary || undefined,
            supervisorName: exp.supervisorName || undefined,
            supervisorPhone: exp.supervisorPhone || undefined,
            duties: exp.duties,
            accomplishments: exp.accomplishments,
          };
        }),
        education: activeVersion.snapshot.education.map(function (edu) {
          return {
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            graduationDate: edu.graduationDate,
            gpa: edu.gpa || undefined,
            credits: edu.credits || undefined,
          };
        }),
        skills: activeVersion.snapshot.skills,
      }
    : {
        profile: {
          firstName: resumeDocument.baseProfile.firstName,
          lastName: resumeDocument.baseProfile.lastName,
          email: resumeDocument.baseProfile.email,
          phone: resumeDocument.baseProfile.phone,
          address: resumeDocument.baseProfile.address,
          city: resumeDocument.baseProfile.city,
          state: resumeDocument.baseProfile.state,
          zip: resumeDocument.baseProfile.zip,
          citizenship: resumeDocument.baseProfile.citizenship,
          veteranStatus: resumeDocument.baseProfile.veteranStatus,
          securityClearance: resumeDocument.baseProfile.securityClearance,
          currentAgency: resumeDocument.baseProfile.currentAgency || undefined,
          currentSeries: resumeDocument.baseProfile.currentSeries || undefined,
          currentGrade: resumeDocument.baseProfile.currentGrade || undefined,
        },
        targetRoles: resumeDocument.baseSections.targetRoles,
        workExperience: resumeDocument.baseSections.workExperience.map(function (exp) {
          return {
            id: exp.id,
            employer: exp.employer,
            title: exp.title,
            series: exp.series || undefined,
            grade: exp.grade || undefined,
            startDate: exp.startDate,
            endDate: exp.endDate,
            current: exp.current,
            hoursPerWeek: exp.hoursPerWeek,
            salary: exp.salary || undefined,
            supervisorName: exp.supervisorName || undefined,
            supervisorPhone: exp.supervisorPhone || undefined,
            duties: exp.duties,
            accomplishments: exp.accomplishments,
          };
        }),
        education: resumeDocument.baseSections.education.map(function (edu) {
          return {
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            graduationDate: edu.graduationDate,
            gpa: edu.gpa || undefined,
            credits: edu.credits || undefined,
          };
        }),
        skills: resumeDocument.baseSections.skills,
      };
  }, [activeVersion, resumeDocument]);

  // Day 38 Session Closure: Track changes for save status
  useEffect(
    function () {
      // Mark as unsaved when data changes (debounced)
      const timeoutId = setTimeout(function () {
        setSaveStatus('unsaved');
      }, 500);
      return function () {
        clearTimeout(timeoutId);
      };
    },
    [currentResumeData]
  );

  // Update handlers
  const handleUpdateProfile = function (data: PageResumeData['profile']) {
    const newData = Object.assign({}, currentResumeData, { profile: data });
    onUpdateResumeData(newData);
    handleTypingActivity();
  };

  const handleUpdateTargetRoles = function (data: PageResumeData['targetRoles']) {
    const newData = Object.assign({}, currentResumeData, { targetRoles: data });
    onUpdateResumeData(newData);
    handleTypingActivity();
  };

  const handleUpdateWorkExperience = function (data: PageResumeData['workExperience']) {
    const newData = Object.assign({}, currentResumeData, { workExperience: data });
    onUpdateResumeData(newData);
    handleTypingActivity();
  };

  const handleUpdateEducation = function (data: PageResumeData['education']) {
    const newData = Object.assign({}, currentResumeData, { education: data });
    onUpdateResumeData(newData);
    handleTypingActivity();
  };

  const handleUpdateSkills = function (data: PageResumeData['skills']) {
    const newData = Object.assign({}, currentResumeData, { skills: data });
    onUpdateResumeData(newData);
    handleTypingActivity();
  };

  // Version management handlers
  const handleCreateVersion = useCallback(function () {
    const now = Date.now();
    const versionNumber = resumeDocument.versions.length + 1;
    const snapshotCopy = JSON.parse(JSON.stringify(currentResumeData));
    const newVersion: ResumeVersion = {
      id: 'version-' + now,
      name: 'Version ' + versionNumber,
      createdAt: now,
      updatedAt: now,
      isBase: false,
      snapshot: snapshotCopy,
      metadata: {},
    };

    const newVersions = resumeDocument.versions.slice();
    newVersions.push(newVersion);

    // Day 38: After creating version, select it and update document
    setResumeDocument(
      Object.assign({}, resumeDocument, {
        versions: newVersions,
        activeVersionId: newVersion.id,
      })
    );

    // Day 38: Persist versions to localStorage for discoverability
    try {
      const versionsKey = 'resume-builder-versions';
      const existingVersions = localStorage.getItem(versionsKey);
      const allVersions = existingVersions ? JSON.parse(existingVersions) : [];
      allVersions.push({
        id: newVersion.id,
        name: newVersion.name,
        createdAt: newVersion.createdAt,
        updatedAt: newVersion.updatedAt,
        snapshot: newVersion.snapshot,
      });
      localStorage.setItem(versionsKey, JSON.stringify(allVersions));
    } catch (e) {
      console.error('Failed to persist version:', e);
    }
  }, [resumeDocument, currentResumeData]);

  const handleSelectVersion = function (versionId: string) {
    setResumeDocument(Object.assign({}, resumeDocument, { activeVersionId: versionId }));
  };

  const handleRenameVersion = function (versionId: string, newName: string) {
    if (!newName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this version',
        variant: 'destructive',
      });
      return;
    }
    
    const now = Date.now();
    const newVersions = resumeDocument.versions.map(function (v) {
      if (v.id === versionId) {
        return Object.assign({}, v, { name: newName.trim(), updatedAt: now });
      }
      return v;
    });
    setResumeDocument(Object.assign({}, resumeDocument, { versions: newVersions }));
    
    // Persist rename to localStorage
    try {
      const versionsKey = 'resume-builder-versions';
      const existingVersions = localStorage.getItem(versionsKey);
      if (existingVersions) {
        const allVersions = JSON.parse(existingVersions);
        const versionIndex = allVersions.findIndex(function (v: ResumeVersion) {
          return v.id === versionId;
        });
        if (versionIndex >= 0) {
          allVersions[versionIndex].name = newName.trim();
          allVersions[versionIndex].updatedAt = now;
          localStorage.setItem(versionsKey, JSON.stringify(allVersions));
        }
      }
    } catch (e) {
      console.error('Failed to persist version rename:', e);
    }
    
    toast({
      title: 'Version renamed',
      description: 'Version name has been updated',
      variant: 'success',
    });
  };

  const handleDuplicateVersion = function (versionId: string) {
    const sourceVersion = resumeDocument.versions.find(function (v) {
      return v.id === versionId;
    });
    if (!sourceVersion) return;

    const now = Date.now();
    const snapshotCopy = JSON.parse(JSON.stringify(sourceVersion.snapshot));
    const metadataCopy = JSON.parse(JSON.stringify(sourceVersion.metadata));
    const newVersion: ResumeVersion = {
      id: 'version-' + now,
      name: sourceVersion.name + ' (Copy)',
      createdAt: now,
      updatedAt: now,
      isBase: false,
      snapshot: snapshotCopy,
      metadata: metadataCopy,
    };

    const newVersions = resumeDocument.versions.slice();
    newVersions.push(newVersion);

    setResumeDocument(
      Object.assign({}, resumeDocument, {
        versions: newVersions,
        activeVersionId: newVersion.id,
      })
    );
  };

  const handleDeleteVersion = function (versionId: string) {
    const version = resumeDocument.versions.find(function (v) {
      return v.id === versionId;
    });
    if (!version || version.isBase) {
      toast({
        title: 'Cannot delete',
        description: 'Base version cannot be deleted',
        variant: 'destructive',
      });
      return;
    }

    // Show confirmation dialog
    setDeletingVersionId(versionId);
  };
  
  // Day 38 Polish: Confirm delete version
  const handleConfirmDeleteVersion = function () {
    if (!deletingVersionId) return;
    
    const versionId = deletingVersionId;
    const newVersions = resumeDocument.versions.filter(function (v) {
      return v.id !== versionId;
    });

    // If deleting active version, switch to previous or base
    let newActiveVersionId = resumeDocument.activeVersionId;
    if (resumeDocument.activeVersionId === versionId) {
      // Find previous version or fall back to base
      const currentIndex = resumeDocument.versions.findIndex(function (v) {
        return v.id === versionId;
      });
      if (currentIndex > 0) {
        newActiveVersionId = resumeDocument.versions[currentIndex - 1].id;
      } else if (newVersions.length > 0) {
        newActiveVersionId = newVersions[0].id;
      }
    }

    setResumeDocument(
      Object.assign({}, resumeDocument, {
        versions: newVersions,
        activeVersionId: newActiveVersionId,
      })
    );
    
    // Persist delete to localStorage
    try {
      const versionsKey = 'resume-builder-versions';
      const existingVersions = localStorage.getItem(versionsKey);
      if (existingVersions) {
        const allVersions = JSON.parse(existingVersions);
        const filtered = allVersions.filter(function (v: ResumeVersion) {
          return v.id !== versionId;
        });
        localStorage.setItem(versionsKey, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Failed to persist version delete:', e);
    }
    
    setDeletingVersionId(null);
    toast({
      title: 'Version deleted',
      description: 'Version has been removed',
      variant: 'success',
    });
  };

  // View switching handler
  const handleSelectView = function (viewId: string) {
    setResumeDocument(Object.assign({}, resumeDocument, { activeViewId: viewId }));
  };

  // Rewrite suggestion handlers
  const handleAcceptSuggestion = function (suggestionId: string) {
    const suggestion = suggestions.find(function (s) {
      return s.id === suggestionId;
    });
    if (!suggestion) return;

    // Apply the suggestion to the current resume data
    // This is a simplified implementation - in a real system, this would update the specific field
    const updatedSuggestions = suggestions.map(function (s) {
      if (s.id === suggestionId) {
        return Object.assign({}, s, { status: 'accepted' });
      }
      return s;
    });
    setSuggestions(updatedSuggestions);
  };

  const handleRejectSuggestion = function (suggestionId: string) {
    const updatedSuggestions = suggestions.map(function (s) {
      if (s.id === suggestionId) {
        return Object.assign({}, s, { status: 'rejected' });
      }
      return s;
    });
    setSuggestions(updatedSuggestions);
  };

  // Guidance context
  const guidanceContext: GuidanceContext = {
    isFirstEntry: false, // TODO: Track this properly
    hasResumeData: currentResumeData.workExperience.length > 0,
    activeVersionId: resumeDocument.activeVersionId,
    versionCount: resumeDocument.versions.length,
    isNewVersion: false, // TODO: Track this properly
    activeViewType: activeView ? activeView.type : 'federal',
    isViewChange: false, // TODO: Track this properly
    isTailoringMode: true,
    tailoringJobTitle: activeTargetJob ? activeTargetJob.title : null,
    hasTailoringSuggestions: suggestions.filter(function (s) {
      return s.status === 'pending';
    }).length > 0,
    hasWorkExperience: currentResumeData.workExperience.length > 0,
    hasEducation: currentResumeData.education.length > 0,
    hasSkills:
      currentResumeData.skills.technicalSkills.length > 0 ||
      currentResumeData.skills.certifications.length > 0,
    completenessScore: calculateCompletenessScore(currentResumeData),
    isTyping: isTyping,
    lastTypingTime: lastTypingTime,
  };

  // Day 38 Continuation: Calculate guidance count for badge display
  const guidanceMessages = getGuidanceMessages(guidanceContext);
  // Day 38 Polish: Filter out dismissed messages for count
  const visibleGuidanceMessages = guidanceMessages.filter(function (msg) {
    return !dismissedGuidanceIds.has(msg.id);
  });
  const currentGuidanceCount = visibleGuidanceMessages.length;

  // Day 38 Continuation: Track guidance count changes for toast notifications
  useEffect(function () {
    setGuidanceCount(currentGuidanceCount);
  }, [currentGuidanceCount]);

  // Day 38 Polish: Show blue toast when guidance count increases (if notifications enabled)
  useEffect(function () {
    // Skip if notifications disabled
    if (!guidanceNotificationsEnabled) {
      if (guidanceCount !== lastGuidanceCount) {
        setLastGuidanceCount(guidanceCount);
      }
      return;
    }
    
    // Skip on initial mount (only fire on subsequent increases)
    if (lastGuidanceCount === 0 && guidanceCount > 0) {
      setLastGuidanceCount(guidanceCount);
      return;
    }

    // Only fire when count increases (not decreases)
    if (guidanceCount > lastGuidanceCount && lastGuidanceCount > 0) {
      // Clear existing debounce timeout
      if (toastDebounceRef.current !== null) {
        clearTimeout(toastDebounceRef.current);
      }

      // Debounce toast notification (2 seconds)
      toastDebounceRef.current = setTimeout(function () {
        // Day 38 Polish: Use blue toast (variant: default with blue styling via className)
        toast({
          title: 'New guidance available',
          description: 'Open Guidance to review suggestions.',
          variant: 'default',
          className: 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-50',
          action: (
            <ToastAction
              altText="Open Guidance"
              onClick={function () {
                setIsGuidanceOpen(true);
              }}
            >
              Open Guidance
            </ToastAction>
          ),
        });
        setLastGuidanceCount(guidanceCount);
      }, 2000);
    } else if (guidanceCount !== lastGuidanceCount) {
      // Update last count even if not showing toast (for decreases or initial set)
      setLastGuidanceCount(guidanceCount);
    }

    // Cleanup timeout on unmount
    return function () {
      if (toastDebounceRef.current !== null) {
        clearTimeout(toastDebounceRef.current);
      }
    };
  }, [guidanceCount, lastGuidanceCount, guidanceNotificationsEnabled]);
  
  // Day 38 Polish: Persist guidance notifications toggle
  useEffect(function () {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('resume-builder-guidance-notifications', String(guidanceNotificationsEnabled));
    } catch (e) {
      console.error('Failed to persist guidance notifications setting:', e);
    }
  }, [guidanceNotificationsEnabled]);
  
  // Day 38 Polish: Auto-close guidance modal when all items dismissed
  useEffect(function () {
    if (isGuidanceOpen && currentGuidanceCount === 0) {
      setIsGuidanceOpen(false);
    }
  }, [isGuidanceOpen, currentGuidanceCount]);
  
  // Day 38 Polish: Handle guidance dismiss
  const handleGuidanceDismiss = useCallback(function (messageId: string) {
    setDismissedGuidanceIds(function (prev) {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
  }, []);

  // Coverage map (simplified - would be calculated from tailoring state)
  const coverageMap = resumeDocument.tailoringState
    ? resumeDocument.tailoringState.coverageMap
    : undefined;

  // Calculate match summary
  const matchSummary = activeTargetJob
    ? activeTargetJob.matchPercent !== undefined
      ? activeTargetJob.matchPercent + '% match'
      : 'Tailoring mode'
    : '';

  // Day 38 Polish: Save handler (opens Save Version modal with name prompt)
  const handleSave = function () {
    // Prefill with suggested name
    const versionNumber = resumeDocument.versions.length + 1;
    const suggestedName = activeTargetJob
      ? activeTargetJob.title + ' – v' + versionNumber
      : 'Version ' + versionNumber;
    setSaveVersionName(suggestedName);
    setIsSaveVersionModalOpen(true);
  };
  
  // Day 38 Polish: Save version with name
  const handleSaveVersionWithName = async function () {
    if (!saveVersionName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this version',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaveVersionModalOpen(false);
    setSaveStatus('saving');
    const toastResult = toast({
      title: 'Saving version…',
      description: 'Creating a snapshot of your resume',
    });

    try {
      // Create a new version snapshot with custom name
      const now = Date.now();
      const snapshotCopy = JSON.parse(JSON.stringify(currentResumeData));
      const newVersion: ResumeVersion = {
        id: 'version-' + now,
        name: saveVersionName.trim(),
        createdAt: now,
        updatedAt: now,
        isBase: false,
        snapshot: snapshotCopy,
        metadata: {},
      };

      const newVersions = resumeDocument.versions.slice();
      newVersions.push(newVersion);

      setResumeDocument(
        Object.assign({}, resumeDocument, {
          versions: newVersions,
          activeVersionId: newVersion.id,
        })
      );

      // Persist to localStorage
      try {
        const versionsKey = 'resume-builder-versions';
        const existingVersions = localStorage.getItem(versionsKey);
        const allVersions = existingVersions ? JSON.parse(existingVersions) : [];
        allVersions.push({
          id: newVersion.id,
          name: newVersion.name,
          createdAt: newVersion.createdAt,
          updatedAt: newVersion.updatedAt,
          snapshot: newVersion.snapshot,
        });
        localStorage.setItem(versionsKey, JSON.stringify(allVersions));
      } catch (e) {
        console.error('Failed to persist version:', e);
      }
      
      // Wait a bit for state to update
      await new Promise(function (resolve) {
        setTimeout(resolve, 300);
      });

      // Update toast to success (green)
      toastResult.update({
        id: toastResult.id,
        title: 'Saved to Versions',
        description: 'Your resume version has been saved',
        variant: 'success',
      });

      setSaveStatus('saved');
      setSaveVersionName('');
    } catch (error) {
      // Update toast to error (red)
      toastResult.update({
        id: toastResult.id,
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save version',
        variant: 'destructive',
      });
      setSaveStatus('unsaved');
    }
  };

  // Day 38 Session Closure: Export handler (opens export modal)
  const handleExport = function () {
    setIsExportModalOpen(true);
  };

  // Day 38 Session Closure: Exit handler (with confirmation if unsaved)
  const handleExit = function () {
    if (saveStatus === 'unsaved') {
      setIsExitConfirmOpen(true);
    } else {
      onClearTailoring();
    }
  };

  /**
   * Day 43: Open Resume Review mode (not navigation).
   * 
   * WHY THIS DOESN'T NAVIGATE (Day 43 UX Rule):
   * Resume Review is a MODE, not a destination. The user must stay on the
   * Resume Builder page, with the Resume Review modal opening as an overlay.
   * This preserves scroll position, cursor state, and edit context.
   * 
   * BEHAVIOR:
   * 1. Exits tailoring mode (clears active job context)
   * 2. Calls onReviewResume callback to open the Review modal
   * 3. Does NOT navigate - Resume Builder remains mounted underneath
   */
  const handleReviewResume = function () {
    onClearTailoring();
    if (onReviewResume) {
      onReviewResume();
    }
  };

  // Day 38 Session Closure: Calculate resume strength for export
  const calculateResumeStrength = function (data: PageResumeData) {
    let score = 0;
    const checks: Array<{ id: string; label: string; status: 'success' | 'warning' | 'incomplete'; tip: string }> = [];

    const hasProfile = data.profile.firstName && data.profile.lastName && data.profile.email;
    if (hasProfile) score += 15;
    checks.push({
      id: 'profile',
      label: 'Contact information complete',
      status: hasProfile ? 'success' : 'incomplete',
      tip: 'Complete your contact information.',
    });

    const hasTargetRoles = data.targetRoles.length > 0;
    if (hasTargetRoles) score += 15;
    checks.push({
      id: 'target-roles',
      label: 'Tailored to a target series',
      status: hasTargetRoles ? 'success' : 'warning',
      tip: 'Adding target roles helps tailor your resume.',
    });

    const hasWorkExperience = data.workExperience.length > 0;
    if (hasWorkExperience) score += 20;
    checks.push({
      id: 'work-experience',
      label: 'Recent work experience added',
      status: hasWorkExperience ? 'success' : 'warning',
      tip: 'Federal resumes require detailed work history.',
    });

    const hasEducation = data.education.length > 0;
    if (hasEducation) score += 20;
    checks.push({
      id: 'education',
      label: 'Education credentials listed',
      status: hasEducation ? 'success' : 'incomplete',
      tip: 'Include all degrees and relevant coursework.',
    });

    const hasSkills = data.skills.technicalSkills.length > 0 || data.skills.ksas.length > 0;
    if (hasSkills) score += 15;
    checks.push({
      id: 'skills',
      label: 'Skills and KSAs documented',
      status: hasSkills ? 'success' : 'incomplete',
      tip: 'Document your technical skills and KSAs.',
    });

    let label: 'Needs work' | 'Developing' | 'Strong' = 'Needs work';
    if (score >= 80) label = 'Strong';
    else if (score >= 50) label = 'Developing';

    return { score, label, checks };
  };

  if (!activeTargetJob) {
    return null;
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* ================================================================
          COMPACT TOP BAR (Single bar, not stacked cards)
          ================================================================
          Shows:
          - Tailoring for: [Job]
          - View job details button
          - Match summary (single line)
          - Optional PathAdvisor button
          Day 38: Made sticky so it stays visible when scrolling
          Day 38 Continuation: Added Guidance button with badge count
          Day 38 Continuation: Added Current Version chip/button
      ================================================================ */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            Tailoring for:
          </span>
          <span className="text-sm text-accent truncate">{activeTargetJob.title}</span>
          {matchSummary && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {matchSummary}
            </span>
          )}
          {/* Day 38 Polish: Current Version chip (opens Manage Versions modal) */}
          {activeVersion && (
            <Button
              variant="outline"
              size="sm"
              onClick={function () {
                setIsManageVersionsModalOpen(true);
              }}
              className="text-xs gap-1 h-6 px-2"
            >
              <FileText className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{activeVersion.name}</span>
            </Button>
          )}
        </div>
        <ResumeWorkspaceHeaderActions
          mode="tailoring"
          activeVersion={activeVersion}
          guidanceCount={currentGuidanceCount}
          saveStatus={saveStatus}
          onSave={handleSave}
          onExport={handleExport}
          onFocusView={function () {
            setIsFocusViewOpen(true);
          }}
          onGuidance={function () {
            setIsGuidanceOpen(true);
          }}
          onPathAdvisor={function () {
            setPathAdvisorMode('side');
          }}
          onExit={handleExit}
          onManageVersions={function () {
            setIsManageVersionsModalOpen(true);
          }}
          onChangeJob={onOpenJobPicker}
          onViewJobDetails={function () {
            setIsJobDetailsOpen(true);
          }}
          onReviewResume={handleReviewResume}
        />
      </div>

      {/* Day 38 Continuation: Guidance Sheet (replaces persistent GuidanceStrip) */}
      {/* Day 38 Polish: Fixed header layout - Notifications toggle and close button in same flex row, no overlap */}
      <Sheet open={isGuidanceOpen} onOpenChange={setIsGuidanceOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-hidden flex flex-col" showCloseButton={false}>
          <SheetHeader>
            <div className="flex items-center justify-between gap-4">
              <SheetTitle>Guidance</SheetTitle>
              {/* Day 38 Polish: Right-side cluster with Notifications toggle and Close button */}
              <div className="flex items-center gap-2 shrink-0">
                <Label htmlFor="guidance-notifications" className="text-sm text-muted-foreground whitespace-nowrap">
                  Notifications
                </Label>
                <Switch
                  id="guidance-notifications"
                  checked={guidanceNotificationsEnabled}
                  onCheckedChange={setGuidanceNotificationsEnabled}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={function () {
                    setIsGuidanceOpen(false);
                  }}
                  aria-label="Close Guidance"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            <GuidanceStrip context={guidanceContext} onDismiss={handleGuidanceDismiss} />
          </div>
        </SheetContent>
      </Sheet>

      {/* ================================================================
          TWO-PANE MAIN REGION (Editor + Preview as hero)
          ================================================================
          Left: Editor pane
          Right: Live preview pane
          No vertical stacking - both panes visible simultaneously.
          This container must own the scroll area and prevent nested scroll traps.
          Day 38: Improved real estate - removed extra padding, ensured proper flex layout
          Day 38 Polish: Added padding-bottom to ensure content is fully reachable
      ================================================================ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-3 min-h-0 overflow-hidden">
        {/* Left: Editor Pane */}
        {/* Day 38 Polish: Added pb-8 padding to ensure bottom content is fully reachable */}
        <div className="min-h-0 overflow-y-auto pb-8">
          <ResumeEditorPane
            resumeData={currentResumeData}
            versions={resumeDocument.versions}
            activeVersionId={resumeDocument.activeVersionId}
            views={resumeDocument.views}
            activeViewId={resumeDocument.activeViewId}
            onUpdateProfile={handleUpdateProfile}
            onUpdateTargetRoles={handleUpdateTargetRoles}
            onUpdateWorkExperience={handleUpdateWorkExperience}
            onUpdateEducation={handleUpdateEducation}
            onUpdateSkills={handleUpdateSkills}
            onSelectVersion={handleSelectVersion}
            onCreateVersion={handleCreateVersion}
            onRenameVersion={handleRenameVersion}
            onDuplicateVersion={handleDuplicateVersion}
            onDeleteVersion={handleDeleteVersion}
            onSelectView={handleSelectView}
            onTypingActivity={handleTypingActivity}
            suggestions={suggestions}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
          />
        </div>

        {/* Right: Preview Pane */}
        {/* Day 38 Polish: Added pb-8 padding to ensure bottom content is fully reachable */}
        {/* Day 38 Polish: Click preview to open Focus View */}
        {/* Day 38 Polish Fix: Prevent Focus View from opening when clicking interactive elements (toggles, buttons, etc.) */}
        <div 
          className="min-h-0 overflow-y-auto px-1 pb-8 cursor-pointer"
          onClick={function (e) {
            // Get the click target element
            const el = e.target as HTMLElement | null;
            if (!el) {
              return;
            }
            
            // Check if the click originated from an interactive element
            // This prevents Focus View from opening when clicking:
            // - Buttons (format toggle buttons)
            // - Links
            // - Inputs, textareas, selects
            // - Elements with role="tab" (TabsList/TabsTrigger)
            // - Elements with data-prevent-focus-view attribute
            const isInteractive = el.closest('button, a, input, textarea, select, [role="tab"], [data-prevent-focus-view]');
            if (isInteractive) {
              // Click was on an interactive element, don't open Focus View
              return;
            }
            
            // Click was on the resume body, open Focus View
            setIsFocusViewOpen(true);
          }}
          title="Click to open Focus View"
        >
          {activeView ? (
            <ResumePreviewPane
              resumeData={currentResumeData}
              activeView={activeView}
              isTailoringMode={true}
              coverageMap={coverageMap}
            />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              Select a view to see preview
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          JOB DETAILS SLIDE-OVER
          ================================================================
          Reuses existing JobDetailsSlideOver component.
      ================================================================ */}
      {activeTargetJob && (
        <JobDetailsSlideOver
          open={isJobDetailsOpen}
          onOpenChange={setIsJobDetailsOpen}
          job={{
            id: activeTargetJob.jobId || '0',
            title: activeTargetJob.title,
            seriesCode: activeTargetJob.series,
            gradeLevel: activeTargetJob.grade,
            locationDisplay: activeTargetJob.location,
            organizationName: activeTargetJob.agency,
            employmentType: 'Full-time',
            estimatedTotalComp: 120000,
            matchPercent: activeTargetJob.matchPercent || 0,
          }}
          showTailorCTA={false}
        />
      )}

      {/* ================================================================
          PATHADVISOR DRAWER (Optional overlay, workspace-aware docking)
          ================================================================
          Day 38 Continuation: PathAdvisor opens as a local drawer within
          the overlay. Supports left/right docking that only affects the
          overlay drawer, NOT the global app-shell PathAdvisor.
          Do NOT call global app-shell docking logic from this overlay.
          Day 38 Polish: z-index ensures PathAdvisor is above workspace overlay
          Day 38 Polish Fix: Single instance mode - only render side OR full, never both
      ================================================================ */}
      {/* Side mode: Sheet with PathAdvisorPanel */}
      {pathAdvisorMode === 'side' && (
        <Sheet 
          open={true} 
          onOpenChange={function (open) {
            if (!open) {
              setPathAdvisorMode('closed');
            }
          }}
        >
          <SheetContent
            side={pathAdvisorDock}
            className="w-full sm:max-w-lg z-[60]"
            showCloseButton={false}
          >
            <SheetHeader>
              {/* PathAdvisor UX Fix: Standard PathOS header layout - title on left, controls grouped on right */}
              <div className="flex items-center justify-between gap-4">
                <SheetTitle>PathAdvisor</SheetTitle>
                {/* PathAdvisor UX Fix: Header controls grouped together on right (dock toggle + expand + close) */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Dock toggle - moved to right side with other controls */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={function () {
                      setPathAdvisorDock(pathAdvisorDock === 'left' ? 'right' : 'left');
                    }}
                    aria-label="Toggle dock position"
                  >
                    {pathAdvisorDock === 'left' ? (
                      <PanelLeft className="h-4 w-4" />
                    ) : (
                      <PanelRight className="h-4 w-4" />
                    )}
                  </Button>
                  {/* Expand/Make large button - grouped with other controls on right */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={function () {
                            // When "Open large" is clicked, switch to full mode
                            setPathAdvisorMode('full');
                          }}
                          aria-label="Open large"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open large</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {/* Close button - grouped with other controls on right */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={function () {
                      setPathAdvisorMode('closed');
                    }}
                    aria-label="Close PathAdvisor"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>
            <div className="mt-4 h-[calc(100vh-8rem)]">
              <PathAdvisorPanel 
                dock={pathAdvisorDock} 
                title="PathAdvisor" 
                hideDockSelector={true}
                hideExpandButton={true}
                onRequestFullScreen={function () {
                  // Expand button is now in SheetHeader, so this callback is not used
                  // but kept for API compatibility
                  setPathAdvisorMode('full');
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
      
      {/* Full mode: Dialog with PathAdvisorPanel (full-screen) */}
      {pathAdvisorMode === 'full' && (
        <Dialog 
          open={true} 
          onOpenChange={function (open) {
            if (!open) {
              // PathAdvisor UX Fix: When dialog is closed (e.g., ESC key), fully close PathAdvisor
              setPathAdvisorMode('closed');
            }
          }}
        >
          <DialogContent 
            className="w-[95vw] max-w-none sm:max-w-none h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 [&>button.absolute]:hidden"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between gap-4 p-4 border-b shrink-0">
              <DialogTitle className="text-lg">PathAdvisor</DialogTitle>
              {/* PathAdvisor UX Fix: Header controls grouped together on right (dock toggle + collapse + close) */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Dock toggle - grouped with other controls on right */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={function () {
                    setPathAdvisorDock(pathAdvisorDock === 'left' ? 'right' : 'left');
                  }}
                  aria-label="Toggle dock position"
                >
                  {pathAdvisorDock === 'left' ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelRight className="h-4 w-4" />
                  )}
                </Button>
                {/* Collapse button - grouped with other controls on right */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={function () {
                          // PathAdvisor UX Fix: Collapse button retracts from expanded back to sidebar
                          setPathAdvisorMode('side');
                        }}
                        aria-label="Collapse"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Collapse</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* PathAdvisor UX Fix: Close button fully closes PathAdvisor (no fallback to sidebar) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={function () {
                    // PathAdvisor UX Fix: Fully close PathAdvisor when X is clicked in expanded view
                    setPathAdvisorMode('closed');
                  }}
                  aria-label="Close PathAdvisor"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <PathAdvisorPanel 
                dock={pathAdvisorDock} 
                title="PathAdvisor" 
                hideDockSelector={true}
                isExpandedMode={true}
                onRequestFullScreen={function () {
                  // PathAdvisor UX Fix: Collapse button retracts from expanded back to sidebar
                  setPathAdvisorMode('side');
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Day 38 Session Closure: Export Modal */}
      {/* Day 38 Polish: Fixed width - ensure DialogContent allows wide sizing */}
      {/* Day 38 Polish: Explicitly override sm:max-w-lg with sm:max-w-6xl to ensure wide dialog */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Export Resume</DialogTitle>
            <DialogDescription>
              Preview and export your tailored resume for USAJOBS.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {/* Day 43: Use askPathAdvisor for anchor-first Focus Mode opening */}
            <ReviewExportStep
              resumeData={currentResumeData}
              resumeStrength={calculateResumeStrength(currentResumeData)}
              onAskPathAdvisor={function () {
                // ============================================================================
                // DAY 43 FOLLOW-UP: USE DOCKED PANEL FOR RESUME BUILDER
                // ============================================================================
                //
                // WHY preferredSurface: 'dock':
                // Resume Builder users need to see their resume while editing with
                // PathAdvisor guidance. Full Focus Mode hides the resume, which breaks
                // the side-by-side workflow. Docked mode opens a panel alongside the resume.
                //
                // DAY 43 CONTRACT PRESERVED:
                // - Anchor is set before opening (same as Focus Mode)
                // - PathAdvisor surface opens immediately (docked panel, not Focus Mode)
                // - User always sees PathAdvisor respond to their Ask
                // ============================================================================

                // Build prompt with job context if available
                let prompt = 'Review my tailored resume export for USAJOBS. Please check:\n';
                prompt += '- Work history completeness (hours/week, dates, supervisor info if present)\n';
                prompt += '- Quantified accomplishments (metrics, scope, outcomes)\n';
                prompt += '- Keyword alignment to the target job\n';
                prompt += '- Clarity and formatting for USAJOBS style (duties vs accomplishments)\n';
                prompt += 'Give concrete rewrite suggestions.';

                // Build source label with job context
                let sourceLabel = 'Resume Export Review';
                let summary = 'Reviewing tailored resume before submitting to USAJOBS';

                if (activeTargetJob) {
                  sourceLabel = 'Resume Export: ' + activeTargetJob.title;
                  summary = 'Reviewing resume tailored for ' + activeTargetJob.title + ' (' + activeTargetJob.grade + ') at ' + activeTargetJob.agency;
                }

                // Close export modal first
                setIsExportModalOpen(false);

                // Day 43 Follow-up: Use askPathAdvisor with preferredSurface: 'dock'
                // This opens the docked side panel instead of full Focus Mode
                askPathAdvisor({
                  source: 'resume',
                  sourceLabel: sourceLabel,
                  summary: summary,
                  contextPayload: {
                    source: 'recommendations',
                    prompt: prompt,
                    jobTitle: activeTargetJob?.title,
                    jobAgency: activeTargetJob?.agency,
                    jobGrade: activeTargetJob?.grade,
                  },
                  contextFunctions: {
                    setContext: advisorContextData.setContext,
                    setPendingPrompt: advisorContextData.setPendingPrompt,
                    setShouldOpenFocusMode: advisorContextData.setShouldOpenFocusMode,
                    setOnPathAdvisorClose: advisorContextData.setOnPathAdvisorClose,
                  },
                  // Day 43 Follow-up: Request docked panel instead of Focus Mode
                  // This preserves the side-by-side workflow Resume Builder users need
                  preferredSurface: 'dock',
                });
              }}
              jobContext={
                activeTargetJob
                  ? {
                      title: activeTargetJob.title,
                      agency: activeTargetJob.agency,
                      grade: activeTargetJob.grade,
                    }
                  : null
              }
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Day 38 Polish: Save Version Modal */}
      <Dialog open={isSaveVersionModalOpen} onOpenChange={setIsSaveVersionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Version</DialogTitle>
            <DialogDescription>
              Enter a name for this resume version. This will create a snapshot of your current resume.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="version-name">Version name</Label>
            <Input
              id="version-name"
              value={saveVersionName}
              onChange={function (e) {
                setSaveVersionName(e.target.value);
              }}
              placeholder="e.g., GS-13 Program Analyst – v2"
              className="mt-2"
              onKeyDown={function (e) {
                if (e.key === 'Enter') {
                  handleSaveVersionWithName();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={function () {
                setIsSaveVersionModalOpen(false);
                setSaveVersionName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveVersionWithName}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Day 38 Polish: Manage Versions Modal */}
      <Dialog open={isManageVersionsModalOpen} onOpenChange={setIsManageVersionsModalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Versions</DialogTitle>
            <DialogDescription>
              View, rename, delete, and switch between saved resume versions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-2">
              {resumeDocument.versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No saved versions yet.</p>
                  <p className="text-sm mt-2">Create a version by clicking &quot;Save version&quot; in the workspace.</p>
                </div>
              ) : (
                resumeDocument.versions.map(function (version) {
                  const isActive = version.id === resumeDocument.activeVersionId;
                  const isEditing = editingVersionId === version.id;
                  
                  return (
                    <div
                      key={version.id}
                      className={
                        'p-4 border rounded-lg ' +
                        (isActive
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:bg-accent/5')
                      }
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingVersionName}
                            onChange={function (e) {
                              setEditingVersionName(e.target.value);
                            }}
                            onKeyDown={function (e) {
                              if (e.key === 'Enter') {
                                handleRenameVersion(version.id, editingVersionName);
                                setEditingVersionId(null);
                                setEditingVersionName('');
                              } else if (e.key === 'Escape') {
                                setEditingVersionId(null);
                                setEditingVersionName('');
                              }
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={function () {
                              handleRenameVersion(version.id, editingVersionName);
                              setEditingVersionId(null);
                              setEditingVersionName('');
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={function () {
                              setEditingVersionId(null);
                              setEditingVersionName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{version.name}</span>
                              {isActive && (
                                <Badge variant="default" className="text-xs">
                                  Active
                                </Badge>
                              )}
                              {version.isBase && (
                                <Badge variant="outline" className="text-xs">
                                  Base
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Updated{' '}
                              {new Date(version.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={function () {
                                  handleSelectVersion(version.id);
                                  setIsManageVersionsModalOpen(false);
                                }}
                                className="text-xs"
                              >
                                Select
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={function () {
                                setEditingVersionId(version.id);
                                setEditingVersionName(version.name);
                              }}
                              className="text-xs"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {!version.isBase && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={function () {
                                  handleDeleteVersion(version.id);
                                }}
                                className="text-xs text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Day 38 Polish: Delete Version Confirmation Dialog */}
      <Dialog open={deletingVersionId !== null} onOpenChange={function (open) {
        if (!open) {
          setDeletingVersionId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete version?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The version will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={function () {
                setDeletingVersionId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteVersion}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Day 38 Polish: Focus View Modal */}
      {/* Day 38 Polish: Explicitly override sm:max-w-lg with sm:max-w-6xl to ensure wide dialog */}
      {/* Day 38 Polish Fix: Header layout prevents toggle overlap with close button */}
      {/* Day 38 Polish Fix: Hide default close button and add custom header with Exit + Save controls */}
      <Dialog open={isFocusViewOpen} onOpenChange={setIsFocusViewOpen}>
        <DialogContent 
          className="w-[95vw] max-w-6xl sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col [&>button.absolute]:hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            {/* Day 38 Polish Fix: Custom header with title, format toggle, Exit, and Save controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle>Focus View</DialogTitle>
                <DialogDescription>
                  Full preview of your resume. Switch between USAJOBS and Traditional formats.
                </DialogDescription>
              </div>
              {/* Right-side cluster: Format toggle, Save, Exit - with proper spacing to prevent overlap */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Format toggle - positioned before Exit/Save buttons */}
                {activeView && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={activeView.type === 'federal' ? 'default' : 'outline'}
                      size="sm"
                      onClick={function () {
                        const federalView = resumeDocument.views.find(function (v) {
                          return v.type === 'federal';
                        });
                        if (federalView) {
                          handleSelectView(federalView.id);
                        }
                      }}
                      data-prevent-focus-view="true"
                    >
                      USAJOBS
                    </Button>
                    <Button
                      variant={activeView.type !== 'federal' ? 'default' : 'outline'}
                      size="sm"
                      onClick={function () {
                        // Find first non-federal view (private, one-page, or full)
                        const nonFederalView = resumeDocument.views.find(function (v) {
                          return v.type !== 'federal';
                        });
                        if (nonFederalView) {
                          handleSelectView(nonFederalView.id);
                        }
                      }}
                      data-prevent-focus-view="true"
                    >
                      Traditional
                    </Button>
                  </div>
                )}
                {/* Optional Save version button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={function () {
                    handleSave();
                  }}
                  disabled={saveStatus === 'saving'}
                  className="text-xs gap-1"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Save version</span>
                </Button>
                {/* Explicit Exit Focus button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={function () {
                    setIsFocusViewOpen(false);
                  }}
                  className="text-xs gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit Focus</span>
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {activeView ? (
              <ResumePreviewPane
                resumeData={currentResumeData}
                activeView={activeView}
                isTailoringMode={true}
                coverageMap={coverageMap}
              />
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                Select a view to see preview
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Day 38 Session Closure: Exit Confirmation Dialog */}
      <Dialog open={isExitConfirmOpen} onOpenChange={setIsExitConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit tailoring session?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save a new version before exiting?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={function () {
                setIsExitConfirmOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={function () {
                setIsExitConfirmOpen(false);
                onClearTailoring();
              }}
            >
              Exit without saving
            </Button>
            <Button
              onClick={function () {
                handleSave();
                setIsExitConfirmOpen(false);
                setTimeout(function () {
                  onClearTailoring();
                }, 1000);
              }}
            >
              Save version & exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================
          DAY 43 FOLLOW-UP: DOCKED PATHADVISOR PANEL
          ================================================================
          Side-by-side PathAdvisor panel for Resume Builder workflow.
          Opens when askPathAdvisor() is called with preferredSurface: 'dock'.
          
          WHY DOCKED PANEL:
          Resume Builder users need to view/edit their resume while receiving
          PathAdvisor guidance. Full Focus Mode hides the resume, which breaks
          the side-by-side workflow users expect.
          
          LAYOUT:
          Renders as a right-side panel within the workspace.
          Uses Sheet for proper overlay behavior.
      ================================================================ */}
      <Sheet open={isDockedPanelOpen} onOpenChange={setIsDockedPanelOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md lg:max-w-lg p-0 z-[60]"
          showCloseButton={false}
        >
          <DockedPathAdvisorPanel
            open={isDockedPanelOpen}
            onOpenChange={setIsDockedPanelOpen}
            onPopOutToFocusMode={handlePopOutToFocusMode}
            dependencies={dockedPanelDependencies}
            messages={dockedPanelMessages}
            onSendMessage={handleDockedPanelSendMessage}
            inputValue={dockedPanelInputValue}
            onInputChange={setDockedPanelInputValue}
          />
        </SheetContent>
      </Sheet>

      {/* Day 38 Polish: Resume Library Modal */}
      <Dialog open={isResumeLibraryOpen} onOpenChange={setIsResumeLibraryOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Resume Library</DialogTitle>
            <DialogDescription>
              View and manage your saved resume versions. Saved locally on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-2">
              {resumeDocument.versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No saved versions yet.</p>
                  <p className="text-sm mt-2">Create a version by clicking &quot;Save version&quot; in the workspace.</p>
                </div>
              ) : (
                resumeDocument.versions.map(function (version) {
                  const isActive = version.id === resumeDocument.activeVersionId;
                  return (
                    <div
                      key={version.id}
                      className={
                        'p-4 border rounded-lg cursor-pointer transition-colors ' +
                        (isActive
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:bg-accent/5')
                      }
                      onClick={function () {
                        if (!isActive) {
                          handleSelectVersion(version.id);
                          setIsResumeLibraryOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{version.name}</span>
                            {isActive && (
                              <span className="text-xs text-accent">(Active)</span>
                            )}
                            {version.isBase && (
                              <span className="text-xs text-muted-foreground">(Base)</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated{' '}
                            {new Date(version.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        {!isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={function (e) {
                              e.stopPropagation();
                              handleSelectVersion(version.id);
                              setIsResumeLibraryOpen(false);
                            }}
                            className="text-xs"
                          >
                            Open
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Calculate Completeness Score
 *
 * PURPOSE:
 * Calculates a 0-100 score based on resume completeness.
 * Used by Guidance Strip to determine when to show completeness messages.
 */
function calculateCompletenessScore(resumeData: PageResumeData): number {
  let score = 0;

  // Profile (20 points)
  if (resumeData.profile.firstName && resumeData.profile.lastName) {
    score += 10;
  }
  if (resumeData.profile.email && resumeData.profile.phone) {
    score += 10;
  }

  // Work Experience (40 points)
  if (resumeData.workExperience.length > 0) {
    score += 20;
    if (resumeData.workExperience.length >= 2) {
      score += 20;
    }
  }

  // Education (20 points)
  if (resumeData.education.length > 0) {
    score += 20;
  }

  // Skills (20 points)
  if (
    resumeData.skills.technicalSkills.length > 0 ||
    resumeData.skills.certifications.length > 0
  ) {
    score += 20;
  }

  return score;
}

/**
 * Generate Resume Guidance Response (Day 43 Follow-up)
 *
 * PURPOSE:
 * Generates a mock assistant response for resume-related questions.
 * In production, this would call an AI service.
 *
 * WHY THIS EXISTS:
 * The DockedPathAdvisorPanel needs to show responses when users ask questions.
 * This mock provides contextual guidance based on the user's message and
 * active target job (if tailoring).
 *
 * @param userMessage - The user's question/message
 * @param targetJob - Optional target job if in tailoring mode
 * @returns Mock assistant response string
 */
function generateResumeGuidanceResponse(
  userMessage: string,
  targetJob: TargetJob | null
): string {
  const messageLower = userMessage.toLowerCase();

  // Check for common resume questions and provide contextual responses
  if (messageLower.includes('accomplishment') || messageLower.includes('bullet')) {
    return (
      'Great question about accomplishments! Here are my tips:\n\n' +
      '**Use the STAR method:**\n' +
      '1. **Situation:** Brief context for the challenge\n' +
      '2. **Task:** Your specific responsibility\n' +
      '3. **Action:** What you did (use action verbs)\n' +
      '4. **Result:** Quantified outcome (numbers, %, $)\n\n' +
      '**Example transformation:**\n' +
      '❌ "Managed team projects"\n' +
      '✅ "Led 5-person cross-functional team to deliver $2M software upgrade 3 weeks ahead of schedule, reducing operational costs by 15%"\n\n' +
      (targetJob
        ? 'For the ' + targetJob.title + ' role at ' + targetJob.agency + ', emphasize accomplishments that demonstrate ' + targetJob.grade + '-level leadership and impact.'
        : 'Would you like me to review a specific bullet point?')
    );
  }

  if (messageLower.includes('keyword') || messageLower.includes('match')) {
    return (
      'Keyword optimization is crucial for federal resumes! Here\'s how:\n\n' +
      '**1. Mirror the announcement language:**\n' +
      '- Use exact phrases from the "Duties" and "Qualifications" sections\n' +
      '- Don\'t paraphrase unnecessarily\n\n' +
      '**2. Include occupation-specific terms:**\n' +
      '- Technical skills and tools mentioned\n' +
      '- Industry acronyms (spelled out first time)\n\n' +
      '**3. Address specialized experience:**\n' +
      '- Each qualification should have a matching experience bullet\n\n' +
      (targetJob
        ? 'For the ' + targetJob.series + ' ' + targetJob.grade + ' position, I can help identify the key terms to emphasize. Would you like me to analyze the job announcement?'
        : 'Share the job announcement, and I\'ll help identify key terms to include.')
    );
  }

  if (messageLower.includes('format') || messageLower.includes('structure')) {
    return (
      'USAJOBS resumes have specific formatting requirements:\n\n' +
      '**Required sections:**\n' +
      '- Contact info (phone, email, address)\n' +
      '- Citizenship and veteran status\n' +
      '- Work experience (with hours/week, dates, supervisor info)\n' +
      '- Education (with credits/degrees)\n' +
      '- Skills and certifications\n\n' +
      '**For each job:**\n' +
      '- Employer name and location\n' +
      '- Job title and series/grade (if federal)\n' +
      '- Start and end dates (month/year)\n' +
      '- Hours per week\n' +
      '- Supervisor name and phone (if OK to contact)\n' +
      '- Detailed duties AND accomplishments\n\n' +
      'Your resume is currently in the workspace. Would you like me to check if any required information is missing?'
    );
  }

  // Default helpful response
  return (
    "I'm here to help with your federal resume! I can assist with:\n\n" +
    '- **Writing stronger accomplishment bullets** using the STAR method\n' +
    '- **Keyword optimization** to match job announcements\n' +
    '- **USAJOBS formatting** requirements\n' +
    '- **Tailoring strategy** for specific positions\n' +
    '- **KSA/competency** development\n\n' +
    (targetJob
      ? 'I see you\'re tailoring for the ' + targetJob.title + ' position at ' + targetJob.agency + '. What specific aspect would you like to focus on?'
      : 'What aspect of your resume would you like to work on?')
  );
}

