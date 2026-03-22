/**
 * ============================================================================
 * RESUME WORKSPACE COMPONENT (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Main two-pane workspace component that orchestrates the Resume Builder experience.
 * Left: Editor pane with structured inputs
 * Right: Live preview pane with formatted resume output
 * Includes: Version cards, view switching, Guidance Strip, Tailoring Banner, Rewrite UI
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Replaces the step-by-step wizard in Resume Builder page
 * - Integrates with resumeBuilderStore for state management
 * - Uses all the new Day 38 components (editor, preview, guidance, etc.)
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ResumeEditorPane } from '@/components/resume-builder/resume-editor-pane';
import { ResumePreviewPane } from '@/components/resume-builder/resume-preview-pane';
import { GuidanceStrip } from '@/components/resume-builder/guidance-strip';
import { TailoringBanner } from '@/components/resume-builder/tailoring-banner';
import { RewriteTransitionUI } from '@/components/resume-builder/rewrite-transition-ui';
import { JobDetailsSlideOver } from '@/components/dashboard/job-details-slideover';
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

interface ResumeWorkspaceProps {
  initialResumeData: PageResumeData;
  activeTargetJob: TargetJob | null;
  isTailoringMode: boolean;
  onUpdateResumeData: (data: PageResumeData) => void;
  onClearTailoring: () => void;
  onFocusView?: () => void;
}

/**
 * Resume Workspace Component
 *
 * PURPOSE:
 * Main workspace that orchestrates the two-pane editing experience.
 * Manages versioning, view switching, guidance, and tailoring state.
 */
export function ResumeWorkspace(props: ResumeWorkspaceProps) {
  const initialResumeData = props.initialResumeData;
  const activeTargetJob = props.activeTargetJob;
  const isTailoringMode = props.isTailoringMode;
  const onUpdateResumeData = props.onUpdateResumeData;
  const onClearTailoring = props.onClearTailoring;
  const onFocusView = props.onFocusView;

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
      if (isTailoringMode && activeTargetJob) {
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
    [isTailoringMode, activeTargetJob, resumeDocument]
  );

  // Get active version and view
  const activeVersion = resumeDocument.versions.find(function (v) {
    return v.id === resumeDocument.activeVersionId;
  });
  const activeView = resumeDocument.views.find(function (v) {
    return v.id === resumeDocument.activeViewId;
  });

  // Current resume data (from active version) - convert back to PageResumeData format
  // Wrapped in useMemo to stabilize dependencies for useCallback
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

    setResumeDocument(
      Object.assign({}, resumeDocument, {
        versions: newVersions,
        activeVersionId: newVersion.id,
      })
    );
  }, [resumeDocument, currentResumeData]);

  const handleSelectVersion = function (versionId: string) {
    setResumeDocument(Object.assign({}, resumeDocument, { activeVersionId: versionId }));
  };

  const handleRenameVersion = function (versionId: string, newName: string) {
    const now = Date.now();
    const newVersions = resumeDocument.versions.map(function (v) {
      if (v.id === versionId) {
        return Object.assign({}, v, { name: newName, updatedAt: now });
      }
      return v;
    });
    setResumeDocument(Object.assign({}, resumeDocument, { versions: newVersions }));
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
    if (!version || version.isBase) return; // Can't delete base version

    const newVersions = resumeDocument.versions.filter(function (v) {
      return v.id !== versionId;
    });

    // If deleting active version, switch to base
    const newActiveVersionId =
      resumeDocument.activeVersionId === versionId
        ? resumeDocument.versions[0].id
        : resumeDocument.activeVersionId;

    setResumeDocument(
      Object.assign({}, resumeDocument, {
        versions: newVersions,
        activeVersionId: newActiveVersionId,
      })
    );
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
    isTailoringMode: isTailoringMode,
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

  // Coverage map (simplified - would be calculated from tailoring state)
  const coverageMap = resumeDocument.tailoringState
    ? resumeDocument.tailoringState.coverageMap
    : undefined;

  return (
    <div className="h-full flex flex-col">
      {/* Tailoring Banner */}
      {isTailoringMode && activeTargetJob && (
        <div className="mb-4">
          <TailoringBanner
            targetJob={activeTargetJob}
            onViewJobDetails={function () {
              setIsJobDetailsOpen(true);
            }}
            onClearTailoring={onClearTailoring}
          />
        </div>
      )}

      {/* Guidance Strip */}
      <div className="mb-4">
        <GuidanceStrip context={guidanceContext} />
      </div>

      {/* Rewrite Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <RewriteTransitionUI
            suggestions={suggestions}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
          />
        </div>
      )}

      {/* Two-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left: Editor Pane */}
        <div className="h-full overflow-y-auto">
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
          />
        </div>

        {/* Right: Preview Pane */}
        {/* Click preview to open Focus View */}
        {/* Prevent Focus View from opening when clicking interactive elements (toggles, buttons, etc.) */}
        <div 
          className="h-full overflow-y-auto cursor-pointer"
          onClick={function (e) {
            // Only handle click if onFocusView is provided
            if (!onFocusView) {
              return;
            }
            
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
            onFocusView();
          }}
          title={onFocusView ? "Click to open Focus View" : undefined}
        >
          {activeView && (
            <ResumePreviewPane
              resumeData={currentResumeData}
              activeView={activeView}
              isTailoringMode={isTailoringMode}
              coverageMap={coverageMap}
            />
          )}
        </div>
      </div>

      {/* Job Details Slide-Over */}
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

