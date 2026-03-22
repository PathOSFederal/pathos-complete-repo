/**
 * ============================================================================
 * RESUME WORKSPACE HEADER ACTIONS COMPONENT (Day 38 Fix)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Shared header actions component for Resume Workspace that provides consistent
 * action buttons across both general workspace mode and tailoring mode.
 * Supports responsive overflow menu for smaller viewports.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used in TailoringWorkspaceOverlay (general mode header)
 * - Used in TailoringWorkspace (tailoring mode header)
 * - Provides consistent action set across both modes
 *
 * KEY FEATURES:
 * - All workspace actions in one place (Save, Export, Focus view, Guidance, etc.)
 * - Responsive: Primary actions visible, secondary actions in overflow menu on small screens
 * - Mode-aware: Shows "Tailor for a job" in general mode, "Change job" in tailoring mode
 * - Accessible: Overflow menu uses proper Select/Dropdown components
 *
 * @version Day 38 - Resume Workspace Header Actions Fix
 * ============================================================================
 */

'use client';

import React from 'react';
import {
  Save,
  Download,
  Maximize2,
  HelpCircle,
  MessageSquare,
  LogOut,
  Target,
  FileText,
  MoreHorizontal,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ResumeVersion } from '@/lib/resume/resume-domain-model';

interface ResumeWorkspaceHeaderActionsProps {
  /** Mode: 'general' for general workspace, 'tailoring' for tailoring mode */
  mode: 'general' | 'tailoring';
  /** Active resume version (for version chip) */
  activeVersion?: ResumeVersion | null;
  /** Guidance count (for badge) */
  guidanceCount?: number;
  /** Save status */
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  /** Callbacks */
  onSave?: () => void;
  onExport?: () => void;
  onFocusView?: () => void;
  onGuidance?: () => void;
  onPathAdvisor?: () => void;
  onExit?: () => void;
  onManageVersions?: () => void;
  /** Tailoring mode only: Change job callback */
  onChangeJob?: () => void;
  /** Tailoring mode only: View job details callback */
  onViewJobDetails?: () => void;
  /** General mode only: Tailor for a job callback */
  onTailorForJob?: () => void;
  /** Day 43: Review my resume callback (opens Resume Review workspace) */
  onReviewResume?: () => void;
  /** Close button callback (optional, if provided will show Close button) */
  onClose?: () => void;
}

/**
 * Resume Workspace Header Actions Component
 *
 * PURPOSE:
 * Provides consistent header actions across general and tailoring workspace modes.
 * Handles responsive overflow menu for smaller viewports.
 */
export function ResumeWorkspaceHeaderActions(props: ResumeWorkspaceHeaderActionsProps) {
  const {
    mode,
    activeVersion,
    guidanceCount = 0,
    saveStatus = 'saved',
    onSave,
    onExport,
    onFocusView,
    onGuidance,
    onPathAdvisor,
    onExit,
    onManageVersions,
    onChangeJob,
    onViewJobDetails,
    onTailorForJob,
    onReviewResume,
    onClose,
  } = props;

  // Build action list for overflow menu (actions that are hidden on smaller screens)
  // Primary actions (always visible): Tailor/Change job, Save, Export
  // Secondary actions (overflow on small): Guidance, Focus view, PathAdvisor, Version, Exit
  const overflowActions: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    separator?: boolean;
  }> = [];

  // Review my resume - shown in overflow on small screens
  if (onReviewResume) {
    overflowActions.push({
      id: 'review-resume',
      label: 'Review my resume',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: onReviewResume,
    });
  }

  // Guidance (if count > 0) - shown in overflow on small screens
  if (guidanceCount > 0 && onGuidance) {
    overflowActions.push({
      id: 'guidance',
      label: `Guidance (${guidanceCount})`,
      icon: <HelpCircle className="h-4 w-4" />,
      onClick: onGuidance,
    });
  }

  // Focus view - shown in overflow on small screens
  if (onFocusView) {
    overflowActions.push({
      id: 'focus-view',
      label: 'Focus view',
      icon: <Maximize2 className="h-4 w-4" />,
      onClick: onFocusView,
    });
  }

  // Version management - shown in overflow on small screens
  if (activeVersion && onManageVersions) {
    overflowActions.push({
      id: 'versions',
      label: `Version: ${activeVersion.name}`,
      icon: <FileText className="h-4 w-4" />,
      onClick: onManageVersions,
    });
  }

  // PathAdvisor - shown in overflow on small screens
  if (onPathAdvisor) {
    overflowActions.push({
      id: 'pathadvisor',
      label: 'Open PathAdvisor',
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: onPathAdvisor,
    });
  }

  // Separator before exit
  if (onExit && overflowActions.length > 0) {
    overflowActions.push({
      id: 'separator',
      separator: true,
      label: '',
      icon: null,
    });
  }

  // Exit - shown in overflow on small screens
  if (onExit) {
    overflowActions.push({
      id: 'exit',
      label: 'Exit',
      icon: <LogOut className="h-4 w-4" />,
      onClick: onExit,
    });
  }

  // Close - shown in overflow on small screens (if not already added as Exit)
  if (onClose && !onExit) {
    overflowActions.push({
      id: 'close',
      label: 'Close',
      icon: <X className="h-4 w-4" />,
      onClick: onClose,
    });
  }

  const showOverflowMenu = overflowActions.length > 0;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* ================================================================
          Day 43: Review my resume button (primary action)
          ================================================================
          Opens the Resume Review workspace where users can see their
          resume alongside PathAdvisor suggestions. This is the primary
          entry point for resume review with the guidance model.
      ================================================================ */}
      {onReviewResume && (
        <Button
          variant="default"
          size="sm"
          onClick={onReviewResume}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Review my resume</span>
          <span className="sm:hidden">Review</span>
        </Button>
      )}

      {/* General mode: Tailor for a job button (primary, always visible) */}
      {mode === 'general' && onTailorForJob && (
        <Button
          variant="outline"
          size="sm"
          onClick={onTailorForJob}
          className="gap-2"
        >
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">Tailor for a job</span>
          <span className="sm:hidden">Tailor</span>
        </Button>
      )}

      {/* Tailoring mode: Change job button (primary, always visible) */}
      {mode === 'tailoring' && onChangeJob && (
        <Button
          variant="outline"
          size="sm"
          onClick={onChangeJob}
          className="text-xs"
        >
          Change job
        </Button>
      )}

      {/* Tailoring mode: View job details button (primary, always visible) */}
      {mode === 'tailoring' && onViewJobDetails && (
        <Button
          variant="outline"
          size="sm"
          onClick={onViewJobDetails}
          className="text-xs"
        >
          View job details
        </Button>
      )}

      {/* Guidance button (primary if count > 0, otherwise in overflow) */}
      {guidanceCount > 0 && onGuidance && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGuidance}
          className="text-xs gap-1 relative hidden sm:flex"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Guidance</span>
          <Badge
            variant="default"
            className="ml-1 h-4 min-w-4 px-1 text-[10px] font-semibold"
          >
            {guidanceCount}
          </Badge>
        </Button>
      )}

      {/* Save button (primary, always visible) */}
      {onSave && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className="text-xs gap-1"
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save version'}
          </span>
        </Button>
      )}

      {/* Export button (primary, always visible) */}
      {onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="text-xs gap-1"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      )}

      {/* Focus view button (always visible on desktop, overflow on smaller) */}
      {onFocusView && (
        <Button
          variant="outline"
          size="sm"
          onClick={onFocusView}
          className="text-xs gap-1 hidden lg:flex"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Focus view</span>
        </Button>
      )}

      {/* Version chip/button (always visible on desktop, overflow on smaller) */}
      {activeVersion && onManageVersions && (
        <Button
          variant="outline"
          size="sm"
          onClick={onManageVersions}
          className="text-xs gap-1 h-6 px-2 hidden lg:flex"
        >
          <FileText className="h-3 w-3" />
          <span className="truncate max-w-[120px]">{activeVersion.name}</span>
        </Button>
      )}

      {/* PathAdvisor button (always visible on desktop, overflow on smaller) */}
      {onPathAdvisor && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPathAdvisor}
          className="text-xs gap-1 hidden lg:flex"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open PathAdvisor</span>
        </Button>
      )}

      {/* Exit button (always visible on desktop, overflow on smaller) */}
      {onExit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="text-xs gap-1 hidden lg:flex"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exit</span>
        </Button>
      )}

      {/* Close button (always visible on desktop if provided) */}
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-xs gap-1 hidden lg:flex"
        >
          <X className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Close</span>
        </Button>
      )}

      {/* Overflow menu (visible on smaller screens) */}
      {showOverflowMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflowActions.map(function (action) {
              if (action.separator) {
                return <DropdownMenuSeparator key={action.id} />;
              }
              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="gap-2"
                >
                  {action.icon}
                  <span>{action.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

