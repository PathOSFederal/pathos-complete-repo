/**
 * ============================================================================
 * TAILORING WORKSPACE OVERLAY COMPONENT (Day 38 Overlay v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Full-screen overlay modal that wraps workspace components for a focused
 * resume editing experience. Supports two modes:
 * - Tailoring mode: Shows TailoringWorkspace when activeTargetJob is present
 * - General workspace mode: Shows ResumeWorkspace when no activeTargetJob
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used in Resume Builder page when workspace overlay is open
 * - Wraps workspace components in a full-screen Dialog overlay
 * - Provides clean, focused editing experience without app shell distractions
 *
 * KEY FEATURES:
 * - Full-screen overlay (fixed inset-0, h-[100dvh], w-screen)
 * - Proper flex layout to prevent scroll traps (flex flex-col, min-h-0, overflow-hidden)
 * - Supports both tailoring and general workspace modes
 * - Header with "Tailor for a job" button in general mode
 *
 * LAYOUT REQUIREMENTS:
 * - Overlay root: fixed inset-0, h-[100dvh], w-screen, flex flex-col, min-h-0, overflow-hidden
 * - Main panes container: flex-1, min-h-0, overflow-hidden
 * - Each pane: min-h-0, overflow-y-auto
 * - No nested "mystery" scroll containers that prevent reaching bottom content
 *
 * @version Day 38 - Tailoring Workspace Overlay (signal-first)
 * Updated: Supports general workspace mode without activeTargetJob
 * ============================================================================
 */

'use client';

// Day 43: Removed useRouter - no longer needed since Resume Review is a modal mode
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle, DialogDescription, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { TailoringWorkspace } from '@/components/resume-builder/tailoring-workspace';
import { ResumeWorkspace } from '@/components/resume-builder/resume-workspace';
import { ResumeWorkspaceHeaderActions } from '@/components/resume-builder/resume-workspace-header-actions';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GuidanceStrip } from '@/components/resume-builder/guidance-strip';
import { ReviewExportStep } from '@/components/resume-builder/review-export-step';
import { ResumePreviewPane } from '@/components/resume-builder/resume-preview-pane';
import { PathAdvisorPanel } from '@/components/path-advisor-panel';
import { X, PanelLeft, PanelRight, Minimize2, Maximize2, Save } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { getGuidanceMessages } from '@/lib/resume/guidance-rules';
import { resumeDataToDocument } from '@/lib/resume/resume-helpers';
import type { ResumeData as PageResumeData } from '@/components/resume-builder/resume-types';
import type { TargetJob } from '@/store/resumeBuilderStore';
import type { ResumeDocument, ResumeVersion } from '@/lib/resume/resume-domain-model';
import type { GuidanceContext } from '@/lib/resume/guidance-rules';
import type { ResumeData } from '@/lib/mock/resume-builder';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo, useCallback } from 'react';
// Day 43: Use askPathAdvisor for anchor-first Focus Mode opening
import { askPathAdvisor } from '@/lib/pathadvisor/askPathAdvisor';
import { useAdvisorContext } from '@/contexts/advisor-context';

interface TailoringWorkspaceOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
 * Tailoring Workspace Overlay Component
 *
 * PURPOSE:
 * Full-screen overlay that provides a focused resume workspace.
 * Supports two modes:
 * - Tailoring mode: When activeTargetJob is present, shows TailoringWorkspace
 * - General workspace mode: When no activeTargetJob, shows ResumeWorkspace
 * The app shell's PathAdvisor right rail is hidden during this overlay to avoid duplicate guidance.
 */
export function TailoringWorkspaceOverlay(props: TailoringWorkspaceOverlayProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const initialResumeData = props.initialResumeData;
  const activeTargetJob = props.activeTargetJob;
  const onUpdateResumeData = props.onUpdateResumeData;
  const onClearTailoring = props.onClearTailoring;
  const onOpenJobPicker = props.onOpenJobPicker;
  // Day 43: Callback to open Resume Review mode (not navigation)
  const onReviewResume = props.onReviewResume;

  // Day 43: Get advisor context functions for askPathAdvisor
  const advisorContextData = useAdvisorContext();

  // Determine if we're in tailoring mode (has activeTargetJob)
  const isTailoringMode = activeTargetJob !== null;

  // Day 38 Fix: State management for general workspace mode header actions
  // Helper to normalize PageResumeData to ResumeData
  const normalizeResumeData = useCallback(function (data: PageResumeData): ResumeData {
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
  }, []);

  // Resume document state (for general mode)
  const [resumeDocument, setResumeDocument] = useState<ResumeDocument>(function () {
    return resumeDataToDocument(normalizeResumeData(initialResumeData));
  });

  // Update resume document when initial data changes
  useEffect(
    function () {
      const normalized = normalizeResumeData(initialResumeData);
      const newDoc = resumeDataToDocument(normalized);
      setTimeout(function () {
        setResumeDocument(newDoc);
      }, 0);
    },
    [initialResumeData, normalizeResumeData]
  );

  // Get active version and view
  const activeVersion = resumeDocument.versions.find(function (v) {
    return v.id === resumeDocument.activeVersionId;
  });
  const activeView = resumeDocument.views.find(function (v) {
    return v.id === resumeDocument.activeViewId;
  });

  // Current resume data (from active version)
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

  // Guidance context and count (for general mode)
  const guidanceContext: GuidanceContext = useMemo(function () {
    return {
      isFirstEntry: false,
      hasResumeData: currentResumeData.workExperience.length > 0,
      activeVersionId: resumeDocument.activeVersionId,
      versionCount: resumeDocument.versions.length,
      isNewVersion: false,
      activeViewType: activeView ? activeView.type : 'federal',
      isViewChange: false,
      isTailoringMode: false,
      tailoringJobTitle: null,
      hasTailoringSuggestions: false,
      hasWorkExperience: currentResumeData.workExperience.length > 0,
      hasEducation: currentResumeData.education.length > 0,
      hasSkills:
        currentResumeData.skills.technicalSkills.length > 0 ||
        currentResumeData.skills.certifications.length > 0,
      completenessScore: calculateCompletenessScore(currentResumeData),
      isTyping: false,
      lastTypingTime: 0,
    };
  }, [currentResumeData, resumeDocument, activeView]);

  const guidanceMessages = getGuidanceMessages(guidanceContext);

  // Modal states (for general mode)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [isManageVersionsModalOpen, setIsManageVersionsModalOpen] = useState(false);
  const [isSaveVersionModalOpen, setIsSaveVersionModalOpen] = useState(false);
  const [saveVersionName, setSaveVersionName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [pathAdvisorMode, setPathAdvisorMode] = useState<'closed' | 'side' | 'full'>('closed');
  const [pathAdvisorDock, setPathAdvisorDock] = useState<'left' | 'right'>('right');
  const [dismissedGuidanceIds, setDismissedGuidanceIds] = useState<Set<string>>(new Set());

  // Track changes for save status
  useEffect(
    function () {
      const timeoutId = setTimeout(function () {
        setSaveStatus('unsaved');
      }, 500);
      return function () {
        clearTimeout(timeoutId);
      };
    },
    [currentResumeData]
  );

  // Calculate resume strength for export
  const calculateResumeStrength = useCallback(function (data: PageResumeData) {
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
  }, []);

  // Action handlers (for general mode)
  const handleSave = useCallback(function () {
    const versionNumber = resumeDocument.versions.length + 1;
    const suggestedName = 'Version ' + versionNumber;
    setSaveVersionName(suggestedName);
    setIsSaveVersionModalOpen(true);
  }, [resumeDocument]);

  const handleSaveVersionWithName = useCallback(async function () {
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

      await new Promise(function (resolve) {
        setTimeout(resolve, 300);
      });

      toastResult.update({
        id: toastResult.id,
        title: 'Saved to Versions',
        description: 'Your resume version has been saved',
        variant: 'success',
      });

      setSaveStatus('saved');
      setSaveVersionName('');
    } catch (error) {
      toastResult.update({
        id: toastResult.id,
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save version',
        variant: 'destructive',
      });
      setSaveStatus('unsaved');
    }
  }, [saveVersionName, currentResumeData, resumeDocument]);

  const handleExport = useCallback(function () {
    setIsExportModalOpen(true);
  }, []);

  const handleFocusView = useCallback(function () {
    setIsFocusViewOpen(true);
  }, []);

  const handleGuidance = useCallback(function () {
    setIsGuidanceOpen(true);
  }, []);

  const handlePathAdvisor = useCallback(function () {
    setPathAdvisorMode('side');
  }, []);

  const handleManageVersions = useCallback(function () {
    setIsManageVersionsModalOpen(true);
  }, []);

  // Handle closing the overlay
  const handleClose = useCallback(function (newOpen: boolean) {
    if (!newOpen) {
      // When overlay closes, exit tailoring mode if we were in it
      if (isTailoringMode) {
        onClearTailoring();
      }
    }
    onOpenChange(newOpen);
  }, [isTailoringMode, onClearTailoring, onOpenChange]);

  const handleExit = useCallback(function () {
    handleClose(false);
  }, [handleClose]);

  /**
   * Day 43: Open Resume Review mode (not navigation).
   * 
   * WHY THIS DOESN'T NAVIGATE (Day 43 UX Rule):
   * Resume Review is a MODE, not a destination. The user must stay on the
   * Resume Builder page, with the Resume Review modal opening as an overlay.
   * This preserves scroll position, cursor state, and edit context.
   * 
   * BEHAVIOR:
   * 1. Closes the current overlay
   * 2. Calls onReviewResume callback to open the Review modal
   * 3. Does NOT navigate - Resume Builder remains mounted underneath
   */
  const handleReviewResume = useCallback(function () {
    handleClose(false);
    if (onReviewResume) {
      onReviewResume();
    }
  }, [handleClose, onReviewResume]);

  const handleGuidanceDismiss = useCallback(function (messageId: string) {
    setDismissedGuidanceIds(function (prev) {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
  }, []);

  const visibleGuidanceMessages = useMemo(function () {
    return guidanceMessages.filter(function (msg) {
      return !dismissedGuidanceIds.has(msg.id);
    });
  }, [guidanceMessages, dismissedGuidanceIds]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm" />
        {/* ================================================================
            FULL-SCREEN OVERLAY CONTENT
            ================================================================
            WHY fixed inset-0:
            - Takes up entire viewport (full-screen overlay)
            
            WHY h-[100dvh] w-screen:
            - Uses dynamic viewport height for mobile support
            - Full width to cover entire screen
            
            WHY flex flex-col min-h-0 overflow-hidden:
            - flex flex-col: Enables vertical layout (top bar + body)
            - min-h-0: Allows flex children to shrink below content size
            - overflow-hidden: Prevents scroll traps, content scrolls within panes
            
            WHY no padding on DialogContent:
            - TailoringWorkspace handles its own internal spacing
            - Full-screen means no border/padding needed
        ================================================================ */}
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 h-[100dvh] w-screen flex flex-col min-h-0 overflow-hidden',
            'bg-background border-0 rounded-none shadow-none p-0',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'duration-200'
          )}
        >
          {/* ================================================================
              ACCESSIBILITY FIX
              ================================================================
              
              Radix Dialog requires both DialogTitle and DialogDescription
              for proper accessibility. Using VisuallyHidden to satisfy
              aria requirements without changing visual layout.
          ================================================================ */}
          <VisuallyHidden.Root>
            <DialogTitle>{isTailoringMode ? 'Tailoring Workspace' : 'Resume Workspace'}</DialogTitle>
            <DialogDescription>
              {isTailoringMode && activeTargetJob
                ? 'Tailor your resume for ' + activeTargetJob.title + '.'
                : 'Edit and manage your resume.'}
            </DialogDescription>
          </VisuallyHidden.Root>
          
          {/* Header bar for general workspace mode only (TailoringWorkspace has its own header) */}
          {!isTailoringMode && (
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-3 border-b bg-background shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  Resume Workspace
                </span>
              </div>
              <ResumeWorkspaceHeaderActions
                mode="general"
                activeVersion={activeVersion}
                guidanceCount={visibleGuidanceMessages.length}
                saveStatus={saveStatus}
                onSave={handleSave}
                onExport={handleExport}
                onFocusView={handleFocusView}
                onGuidance={handleGuidance}
                onPathAdvisor={handlePathAdvisor}
                onExit={handleExit}
                onManageVersions={handleManageVersions}
                onTailorForJob={onOpenJobPicker}
                onReviewResume={handleReviewResume}
                onClose={function () {
                  handleClose(false);
                }}
              />
            </div>
          )}

          {/* Render appropriate workspace based on mode */}
          {isTailoringMode && activeTargetJob ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <TailoringWorkspace
                initialResumeData={initialResumeData}
                activeTargetJob={activeTargetJob}
                onUpdateResumeData={onUpdateResumeData}
                onClearTailoring={function () {
                  handleClose(false);
                }}
                onOpenJobPicker={onOpenJobPicker}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <ResumeWorkspace
                initialResumeData={initialResumeData}
                activeTargetJob={null}
                isTailoringMode={false}
                onUpdateResumeData={onUpdateResumeData}
                onClearTailoring={function () {
                  // No-op in general mode
                }}
                onFocusView={handleFocusView}
              />
            </div>
          )}

          {/* Day 38 Fix: Modals for general workspace mode */}
          {!isTailoringMode && (
            <>
              {/* Export Modal */}
              <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
                <DialogContent className="w-[95vw] max-w-6xl sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Export Resume</DialogTitle>
                    <DialogDescription>
                      Preview and export your resume for USAJOBS.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto mt-4">
                    <ReviewExportStep
                      resumeData={currentResumeData}
                      resumeStrength={calculateResumeStrength(currentResumeData)}
                      onAskPathAdvisor={function () {
                        // ============================================================================
                        // DAY 43 FOLLOW-UP: USE DOCKED PANEL FOR RESUME BUILDER
                        // ============================================================================
                        //
                        // WHY preferredSurface: 'dock':
                        // This is the general workspace mode (not tailoring), but users are still
                        // in the Resume Builder context. They may want to see their resume while
                        // receiving PathAdvisor guidance. Docked mode preserves this workflow.
                        //
                        // DAY 43 CONTRACT PRESERVED:
                        // - Anchor is set before opening (same as Focus Mode)
                        // - PathAdvisor surface opens immediately (docked panel)
                        // - User always sees PathAdvisor respond to their Ask
                        // ============================================================================

                        // Build prompt for general resume review
                        let prompt = 'Review my resume export for USAJOBS. Please check:\n';
                        prompt += '- Work history completeness (hours/week, dates, supervisor info if present)\n';
                        prompt += '- Quantified accomplishments (metrics, scope, outcomes)\n';
                        prompt += '- Keyword alignment to federal job requirements\n';
                        prompt += '- Clarity and formatting for USAJOBS style (duties vs accomplishments)\n';
                        prompt += 'Give concrete rewrite suggestions.';

                        // Close export modal first
                        setIsExportModalOpen(false);

                        // Day 43 Follow-up: Use askPathAdvisor with preferredSurface: 'dock'
                        // This opens the docked side panel instead of full Focus Mode
                        askPathAdvisor({
                          source: 'resume',
                          sourceLabel: 'Resume Export Review',
                          summary: 'Reviewing general resume before submitting to USAJOBS',
                          contextPayload: {
                            source: 'recommendations',
                            prompt: prompt,
                          },
                          contextFunctions: {
                            setContext: advisorContextData.setContext,
                            setPendingPrompt: advisorContextData.setPendingPrompt,
                            setShouldOpenFocusMode: advisorContextData.setShouldOpenFocusMode,
                            setOnPathAdvisorClose: advisorContextData.setOnPathAdvisorClose,
                          },
                          // Day 43 Follow-up: Request docked panel for Resume Builder workflow
                          preferredSurface: 'dock',
                        });
                      }}
                      jobContext={null}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Focus View Modal */}
              <Dialog open={isFocusViewOpen} onOpenChange={setIsFocusViewOpen}>
                <DialogContent
                  className="w-[95vw] max-w-6xl sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col [&>button.absolute]:hidden"
                  showCloseButton={false}
                >
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <DialogTitle>Focus View</DialogTitle>
                        <DialogDescription>
                          Full preview of your resume. Switch between USAJOBS and Traditional formats.
                        </DialogDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSave}
                          disabled={saveStatus === 'saving'}
                          className="text-xs gap-1"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Save version</span>
                        </Button>
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
                        isTailoringMode={false}
                        coverageMap={undefined}
                      />
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">
                        Select a view to see preview
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Guidance Sheet */}
              <Sheet open={isGuidanceOpen} onOpenChange={setIsGuidanceOpen}>
                <SheetContent side="bottom" className="h-[80vh] overflow-hidden flex flex-col" showCloseButton={false}>
                  <SheetHeader>
                    <div className="flex items-center justify-between gap-4">
                      <SheetTitle>Guidance</SheetTitle>
                      <div className="flex items-center gap-2 shrink-0">
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

              {/* Save Version Modal */}
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
                      placeholder="e.g., Version 2"
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

              {/* Manage Versions Modal */}
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
                                    onClick={function () {
                                      setResumeDocument(
                                        Object.assign({}, resumeDocument, {
                                          activeVersionId: version.id,
                                        })
                                      );
                                      setIsManageVersionsModalOpen(false);
                                    }}
                                    className="text-xs"
                                  >
                                    Select
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

              {/* PathAdvisor Side Sheet */}
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
                      <div className="flex items-center justify-between gap-4">
                        <SheetTitle>PathAdvisor</SheetTitle>
                        <div className="flex items-center gap-1 shrink-0">
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={function () {
                                    setPathAdvisorMode('full');
                                  }}
                                  aria-label="Open large"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Open large</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                          setPathAdvisorMode('full');
                        }}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {/* PathAdvisor Full Dialog */}
              {pathAdvisorMode === 'full' && (
                <Dialog
                  open={true}
                  onOpenChange={function (open) {
                    if (!open) {
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
                      <div className="flex items-center gap-1 shrink-0">
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={function () {
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
                    <div className="flex-1 overflow-hidden min-h-0">
                      <PathAdvisorPanel
                        dock={pathAdvisorDock}
                        title="PathAdvisor"
                        hideDockSelector={true}
                        isExpandedMode={true}
                        onRequestFullScreen={function () {
                          setPathAdvisorMode('side');
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
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

