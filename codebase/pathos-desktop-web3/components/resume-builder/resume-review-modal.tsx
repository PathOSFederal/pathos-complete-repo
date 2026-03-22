/**
 * ============================================================================
 * RESUME REVIEW MODAL (Day 43 - Modal Workspace Mode)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Full-screen modal overlay for collaborative resume review with PathAdvisor.
 * Implements the DAY 43 REQUIREMENT: Resume Review is a MODE, not a destination.
 *
 * ============================================================================
 * KEY PRINCIPLES (LOCKED)
 * ============================================================================
 *
 * 1) Resume Review is a MODE, not a destination.
 *    - Must NOT navigate away from Resume Builder.
 *    - Must preserve scroll, cursor, and edit state.
 *
 * 2) PathAdvisor is a COLLABORATIVE REVIEWER, not a ChatGPT author.
 *    - No silent edits.
 *    - No automatic rewrites.
 *    - All changes must be visible, justified, and user-approved.
 *
 * 3) During Resume Review:
 *    - Resume MUST remain editable.
 *    - PathAdvisor MUST remain visible.
 *    - Suggested changes are secondary artifacts, not the main interaction.
 *
 * ============================================================================
 * LAYOUT
 * ============================================================================
 *
 * +------------------------------------------------------------------+
 * | ✨ Resume Review    Reviewing with PathAdvisor    [Exit Review] |
 * +------------------------------------------------------------------+
 * |                          |                                       |
 * |   LEFT PANE (60%):       |   RIGHT PANE (40%):                   |
 * |   Live, EDITABLE resume  |   PathAdvisor Review Panel            |
 * |   - Same editor as       |   - Anchor header                     |
 * |     Resume Builder       |   - Conversational guidance           |
 * |   - Cursor/typing works  |   - Collapsible "Proposed             |
 * |   - Scroll preserved     |     Improvements" section             |
 * |                          |   - Chat input                        |
 * |                          |                                       |
 * +------------------------------------------------------------------+
 *
 * @version Day 43 - PathAdvisor Collaborative Resume Review Mode
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { X, Sparkles, Send, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { buildAnchorId, normalizeSourceLabel } from '@/lib/pathadvisor/anchors';
import type { PathAdvisorAnchor } from '@/lib/pathadvisor/anchors';
import { generateDemoProposals } from '@/lib/pathadvisor/demoProposalFactory';
import { ChangeProposalCard } from '@/components/pathadvisor/ChangeProposalCard';
import { ResumeEditorPane } from '@/components/resume-builder/resume-editor-pane';
import type { ResumeData as PageResumeData } from '@/components/resume-builder/resume-types';
import type { ResumeDocument } from '@/lib/resume/resume-domain-model';
import { resumeDataToDocument } from '@/lib/resume/resume-helpers';
import type { ResumeData } from '@/lib/mock/resume-builder';

/**
 * Props for ResumeReviewModal.
 */
export interface ResumeReviewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Current resume data */
  resumeData: PageResumeData;
  /** Callback to update resume data */
  onUpdateResumeData: (data: PageResumeData) => void;
}

/**
 * ResumeReviewModal Component.
 *
 * PURPOSE:
 * Provides full-screen modal workspace for collaborative resume review.
 * User can edit their resume while seeing PathAdvisor suggestions.
 *
 * DAY 43 CONTRACT:
 * - Resume remains EDITABLE at all times
 * - PathAdvisor provides GUIDANCE, not silent rewrites
 * - Change Proposals are SECONDARY, collapsed by default
 * - Exit returns user to exact prior editing context
 */
export function ResumeReviewModal(props: ResumeReviewModalProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const resumeData = props.resumeData;
  const onUpdateResumeData = props.onUpdateResumeData;

  // ============================================================================
  // STORE SUBSCRIPTIONS
  // ============================================================================

  const activeAnchor = usePathAdvisorStore(function (state) {
    return state.activeAnchor;
  });
  const setActiveAnchor = usePathAdvisorStore(function (state) {
    return state.setActiveAnchor;
  });
  const proposals = usePathAdvisorStore(function (state) {
    return state.proposals;
  });
  const addProposal = usePathAdvisorStore(function (state) {
    return state.addProposal;
  });
  const dismissProposal = usePathAdvisorStore(function (state) {
    return state.dismissProposal;
  });
  const markProposalApplied = usePathAdvisorStore(function (state) {
    return state.markProposalApplied;
  });
  const setLastOpenReason = usePathAdvisorStore(function (state) {
    return state.setLastOpenReason;
  });

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  // Chat state
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([]);

  // Proposals section collapsed state (collapsed by default per spec)
  const [isProposalsOpen, setIsProposalsOpen] = useState(false);

  // Track if anchor has been initialized
  const anchorInitializedRef = useRef(false);

  // Resume document state for editor
  const [resumeDocument, setResumeDocument] = useState<ResumeDocument>(function () {
    return resumeDataToDocument(normalizeResumeDataInternal(resumeData));
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Normalizes PageResumeData to ResumeData format.
   */
  function normalizeResumeDataInternal(data: PageResumeData): ResumeData {
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
  }

  // ============================================================================
  // ANCHOR INITIALIZATION (Auto-anchor when review mode opens)
  // ============================================================================

  useEffect(
    function initializeAnchor() {
      if (!open) {
        // Modal closed, reset initialization flag
        anchorInitializedRef.current = false;
        return;
      }

      if (anchorInitializedRef.current) {
        // Already initialized
        return;
      }

      anchorInitializedRef.current = true;

      // Build anchor for resume review using 'resume-review' source type (Day 43)
      // This is distinct from 'resume' to enable specialized guidance during review
      const anchorId = buildAnchorId('resume-review', 'review-modal');
      const sourceLabel = normalizeSourceLabel('Resume Review', 'resume-review');

      const anchor: PathAdvisorAnchor = {
        id: anchorId,
        source: 'resume-review',
        sourceId: 'review-modal',
        sourceLabel: sourceLabel,
        summary: 'Collaboratively reviewing your resume for federal readiness and job alignment',
        createdAt: Date.now(),
      };

      // Set the anchor
      setActiveAnchor(anchor);
      setLastOpenReason('ask');

      // Generate demo proposals if none exist for this anchor
      const existingProposals = proposals.filter(function (p) {
        return p.anchorId === anchorId;
      });

      if (existingProposals.length === 0) {
        // Generate 2 demo proposals based on resume content
        const demoProposals = generateDemoProposals({
          anchorId: anchorId,
          resumeContent: {
            workExperience: resumeData.workExperience.map(function (exp) {
              return {
                id: exp.id,
                title: exp.title,
                employer: exp.employer,
                accomplishments: exp.accomplishments,
              };
            }),
            summary: resumeData.skills.ksas,
          },
          count: 2,
        });

        // Add each proposal to store
        for (let i = 0; i < demoProposals.length; i++) {
          addProposal(demoProposals[i]);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  // Update resume document when resumeData changes
  useEffect(
    function updateDocument() {
      const newDoc = resumeDataToDocument(normalizeResumeDataInternal(resumeData));
      setResumeDocument(newDoc);
    },
    [resumeData]
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Exit review mode.
   */
  const handleExitReview = function () {
    onOpenChange(false);
  };

  /**
   * Handle dismissing a proposal.
   */
  const handleDismissProposal = useCallback(
    function (proposalId: string) {
      dismissProposal(proposalId);
    },
    [dismissProposal]
  );

  /**
   * Handle applying a proposal.
   */
  const handleApplyProposal = useCallback(
    function (proposal: { id: string }) {
      markProposalApplied(proposal.id);
      // TODO: Actually apply the change to resume data
    },
    [markProposalApplied]
  );

  /**
   * Handle sending a message.
   */
  const handleSendMessage = function () {
    if (inputValue.trim()) {
      const newMessage = {
        id: 'msg-' + Date.now(),
        role: 'user' as const,
        content: inputValue.trim(),
      };
      setMessages(function (prev) {
        return prev.concat([newMessage]);
      });
      setInputValue('');

      // Simulate assistant response (would be AI in production)
      setTimeout(function () {
        const response = {
          id: 'msg-' + (Date.now() + 1),
          role: 'assistant' as const,
          content:
            "I'm reviewing your resume against federal expectations and your selected role. " +
            "As you edit, I'll flag opportunities to improve clarity, scope, and alignment. " +
            'Would you like me to focus on a specific section?',
        };
        setMessages(function (prev) {
          return prev.concat([response]);
        });
      }, 1000);
    }
  };

  /**
   * Handle input key down (Enter to send).
   */
  const handleKeyDown = function (e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================================================
  // EDITOR UPDATE HANDLERS
  // ============================================================================

  const handleUpdateProfile = function (data: PageResumeData['profile']) {
    const newData = Object.assign({}, resumeData, { profile: data });
    onUpdateResumeData(newData);
  };

  const handleUpdateTargetRoles = function (data: PageResumeData['targetRoles']) {
    const newData = Object.assign({}, resumeData, { targetRoles: data });
    onUpdateResumeData(newData);
  };

  const handleUpdateWorkExperience = function (data: PageResumeData['workExperience']) {
    const newData = Object.assign({}, resumeData, { workExperience: data });
    onUpdateResumeData(newData);
  };

  const handleUpdateEducation = function (data: PageResumeData['education']) {
    const newData = Object.assign({}, resumeData, { education: data });
    onUpdateResumeData(newData);
  };

  const handleUpdateSkills = function (data: PageResumeData['skills']) {
    const newData = Object.assign({}, resumeData, { skills: data });
    onUpdateResumeData(newData);
  };

  // Version/view handlers (no-op in review mode, but required by editor)
  const handleSelectVersion = function (_versionId: string) {
    void _versionId;
    // No-op in review mode
  };

  const handleCreateVersion = function () {
    // No-op in review mode
  };

  const handleRenameVersion = function (_versionId: string, _newName: string) {
    void _versionId;
    void _newName;
    // No-op in review mode
  };

  const handleDuplicateVersion = function (_versionId: string) {
    void _versionId;
    // No-op in review mode
  };

  const handleDeleteVersion = function (_versionId: string) {
    void _versionId;
    // No-op in review mode
  };

  const handleSelectView = function (_viewId: string) {
    void _viewId;
    // No-op in review mode
  };

  const handleTypingActivity = function () {
    // Could track typing for reactive suggestions
  };

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  // Get proposals for current anchor
  const currentProposals = activeAnchor
    ? proposals.filter(function (p) {
        return p.anchorId === activeAnchor.id;
      })
    : [];

  // Filter to only show non-dismissed proposals
  const visibleProposals = currentProposals.filter(function (p) {
    return p.status !== 'dismissed';
  });

  // Get active version for editor
  const activeVersion = resumeDocument.versions.find(function (v) {
    return v.id === resumeDocument.activeVersionId;
  });

  // Current resume data for editor
  const currentResumeData: PageResumeData = activeVersion
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
    : resumeData;

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ================================================================
          MODAL HEADER
          ================================================================ */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Resume Review</h1>
            <p className="text-xs text-muted-foreground">
              Reviewing your resume with PathAdvisor
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExitReview}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Exit Review
        </Button>
      </div>

      {/* ================================================================
          SPLIT VIEW: Resume Editor (left) + PathAdvisor (right)
          ================================================================ */}
      <div className="flex-1 flex min-h-0">
        {/* ================================================================
            LEFT PANE: Live, EDITABLE Resume Editor
            ================================================================
            This is the SAME editor used in Resume Builder.
            Cursor and typing MUST work normally.
            No read-only state.
        ================================================================ */}
        <div className="flex-[3] border-r border-border overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <Badge variant="outline" className="text-xs">
                <span className="text-green-600 mr-1">●</span>
                Live Editing Enabled
              </Badge>
            </div>
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
        </div>

        {/* ================================================================
            RIGHT PANE: PathAdvisor Review Panel
            ================================================================
            Contains:
            1. Anchor header strip
            2. Conversational guidance (IMPORTANT)
            3. Collapsible "Proposed Improvements" section
            4. Chat thread
            5. Input composer
        ================================================================ */}
        <div className="flex-[2] flex flex-col bg-muted/10">
          {/* ================================================================
              ANCHOR HEADER STRIP
          ================================================================ */}
          <div className="border-b border-border p-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">PathAdvisor Review</h2>
                {activeAnchor && (
                  <p className="text-xs text-muted-foreground truncate">
                    {activeAnchor.summary}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================
              SCROLLABLE CONTENT
          ================================================================ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ================================================================
                CONVERSATIONAL GUIDANCE (IMPORTANT - per spec)
                ================================================================
                PathAdvisor must open with guidance, NOT a list of changes.
            ================================================================ */}
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-4">
                <p className="text-sm text-foreground">
                  I&apos;m reviewing your resume against federal expectations and your selected role.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  As you edit, I&apos;ll flag opportunities to improve clarity, scope, and alignment.
                  Feel free to ask questions or request specific feedback.
                </p>
              </CardContent>
            </Card>

            {/* ================================================================
                COLLAPSIBLE "PROPOSED IMPROVEMENTS" SECTION
                ================================================================
                Per spec: Collapsible by default, appears only after
                PathAdvisor interaction OR explicit user request.
            ================================================================ */}
            {visibleProposals.length > 0 && (
              <Collapsible
                open={isProposalsOpen}
                onOpenChange={setIsProposalsOpen}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-3 py-2 h-auto"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      Proposed Improvements ({visibleProposals.length})
                    </span>
                    {isProposalsOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  {visibleProposals.map(function (proposal) {
                    return (
                      <ChangeProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        onDismiss={handleDismissProposal}
                        onApply={handleApplyProposal}
                      />
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* ================================================================
                CHAT THREAD
            ================================================================ */}
            {messages.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Conversation
                </h3>
                {messages.map(function (message) {
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'rounded-lg p-3 text-sm',
                        message.role === 'user'
                          ? 'bg-accent/20 border border-accent/30 ml-8'
                          : 'bg-secondary/20 border border-secondary/30 mr-8'
                      )}
                    >
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================================================================
              INPUT COMPOSER
          ================================================================ */}
          <div className="border-t border-border p-4 shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your resume..."
                className="text-sm h-10 bg-background border-border flex-1"
                value={inputValue}
                onChange={function (e) {
                  setInputValue(e.target.value);
                }}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="icon"
                className="h-10 w-10 bg-accent text-accent-foreground hover:bg-accent/90 flex-shrink-0"
                onClick={handleSendMessage}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ask for feedback on a specific section, or request help improving a bullet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
