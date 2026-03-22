/**
 * ============================================================================
 * RESUME READINESS CARD (MERGED)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component REPLACES the two separate cards (Resume Overview and Resume
 * Strength & Sections) with ONE coherent card. This eliminates competing
 * progress metrics and creates a clear, scannable view of resume status.
 *
 * WHY THIS MERGE EXISTS:
 * The previous design showed:
 *   - "Resume Overview" with 65% completion
 *   - "Resume Strength & Sections" with 45% overall strength
 * This was confusing: which number should the user trust? This merged card
 * uses ONE primary metric (completion %) and clearly labels section states.
 *
 * WHAT THIS CARD INCLUDES:
 * 1. Primary progress bar (same metric used in the Command Strip)
 * 2. "Needed next" list (top 2 missing items only, to avoid overwhelm)
 * 3. Full sections list with clear states (Complete, In progress, Not started)
 * 4. Each section row has an "Edit" action that deep-links to Resume Builder
 *
 * DEEP-LINK MECHANISM (Updated Day 14):
 * This card uses the `resumeFocus` query parameter for deep-linking.
 * The ResumeBuilderFocusHandler component reads this param and:
 *   1. Navigates to the correct wizard step
 *   2. Scrolls to the specific section within that step
 *   3. Highlights the section briefly
 *   4. Removes the param to prevent re-scroll on refresh
 *
 * See: components/resume-builder/resume-builder-focus-handler.tsx
 *
 * ARCHITECTURE FIT:
 * - Replaces: resume-overview-card.tsx, resume-strength-sections-card.tsx
 * - Uses the same stores and visibility patterns as other career cards
 * - Provides the completionPercent and primaryRoleTitle up to the parent
 *   so the Command Strip can use the same data source (single truth)
 *
 * @version Day 14 - Career & Resume First-Principles Refactor
 */

'use client';

import Link from 'next/link';
import { FileText, CheckCircle2, AlertCircle, Clock, ChevronRight, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

/**
 * Section status type for tracking resume section completion.
 * - complete: All required fields filled, content is adequate
 * - in-progress: Some fields filled, but not complete
 * - not-started: No data entered yet
 */
type SectionStatus = 'complete' | 'in-progress' | 'not-started';

/**
 * ResumeSection interface defines a resume section with its status and navigation.
 */
interface ResumeSection {
  /** Unique identifier for the section */
  id: string;
  /** Display label for the section */
  label: string;
  /** Current completion status */
  status: SectionStatus;
  /** Query param value for the Resume Builder step navigation */
  stepParam: string;
  /** Brief description of what the section contains */
  description: string;
}

/**
 * Props interface for ResumeReadinessCard.
 * Data is passed from parent to ensure single source of truth.
 */
interface ResumeReadinessCardProps {
  /** Resume completion percentage (0-100) */
  completionPercent: number;
  /** Array of section statuses */
  sections: ResumeSection[];
  /** Completion status label (Needs work, Developing, Strong) */
  statusLabel: 'Needs work' | 'Developing' | 'Strong';
}

/**
 * Status configuration for visual styling of section badges.
 * Maps each status to its display label and Tailwind classes.
 */
const statusStyles: Record<SectionStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  complete: {
    label: 'Complete',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
    icon: CheckCircle2,
  },
  'in-progress': {
    label: 'In progress',
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    icon: Clock,
  },
  'not-started': {
    label: 'Not started',
    className: 'bg-muted text-muted-foreground border-border',
    icon: AlertCircle,
  },
};

/**
 * ResumeReadinessCard Component
 *
 * STEP-BY-STEP HOW IT WORKS:
 * 1. Receives completion data and sections from parent (single source of truth)
 * 2. Uses useDashboardCardVisibility for per-card visibility toggle
 * 3. Renders:
 *    a. Header with title and visibility toggle
 *    b. Primary progress bar with completion %
 *    c. "Needed next" section showing top 2 incomplete sections
 *    d. Full sections list with status badges and Edit links
 *
 * EXAMPLE:
 * User has 65% completion with "Certifications" and "Awards" missing:
 *   -> Progress shows 65% with "Developing" badge
 *   -> "Needed next" shows Certifications and Awards
 *   -> Full list shows all sections with their statuses
 *   -> Each row has "Edit" link to Resume Builder
 */
export function ResumeReadinessCard(props: ResumeReadinessCardProps) {
  const completionPercent = props.completionPercent;
  const sections = props.sections;
  const statusLabel = props.statusLabel;

  // Card visibility hook - allows user to hide this card
  const visibility = useDashboardCardVisibility('career.resumeOverview');
  const visible = visibility.visible;
  const isSensitiveHidden = visibility.isSensitiveHidden;

  const title = 'Resume readiness for your target role';

  /**
   * Filter sections to get the top 2 that need attention.
   * Priority: not-started first, then in-progress.
   * This keeps the "Needed next" section focused and actionable.
   */
  const getNeededNextSections = function (): ResumeSection[] {
    const neededSections: ResumeSection[] = [];

    // First pass: collect not-started sections
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].status === 'not-started') {
        neededSections.push(sections[i]);
      }
    }

    // Second pass: collect in-progress sections
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].status === 'in-progress') {
        neededSections.push(sections[i]);
      }
    }

    // Return only top 2 to avoid overwhelming the user
    const result: ResumeSection[] = [];
    for (let i = 0; i < neededSections.length && i < 2; i++) {
      result.push(neededSections[i]);
    }
    return result;
  };

  const neededNextSections = getNeededNextSections();

  /**
   * Get the status badge color class based on completion level.
   */
  const getStatusBadgeClass = function (): string {
    if (statusLabel === 'Strong') {
      return 'bg-green-500/10 text-green-600 border-green-500/30';
    }
    if (statusLabel === 'Developing') {
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    }
    return 'bg-red-500/10 text-red-600 border-red-500/30';
  };

  return (
    <Card className="border-border bg-card lg:col-span-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <DashboardCardVisibilityToggle cardKey="career.resumeOverview" />
        </div>
        {visible && (
          <p className="text-sm text-muted-foreground">
            Complete each section so PathAdvisor can help refine your resume for your target roles.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {visible ? (
          <>
            {/* ================================================================
                PRIMARY PROGRESS SECTION
                ================================================================
                This is the SINGLE source of truth for resume completion.
                The same percentage is used in the Command Strip.
                This avoids the previous confusion of multiple competing metrics.
            ================================================================ */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Overall Completion
                </span>
                <Badge variant="outline" className={getStatusBadgeClass()}>
                  <SensitiveValue
                    value={statusLabel}
                    hide={isSensitiveHidden}
                    masked="Hidden"
                  />
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  value={isSensitiveHidden ? 0 : completionPercent}
                  className="flex-1 h-3"
                />
                <span className="text-lg font-bold text-foreground min-w-[3.5rem] text-right">
                  <SensitiveValue
                    value={completionPercent + '%'}
                    hide={isSensitiveHidden}
                    masked="••%"
                  />
                </span>
              </div>
            </div>

            {/* ================================================================
                NEEDED NEXT SECTION
                ================================================================
                Shows only the top 2 missing items to keep focus.
                Each item links directly to the Resume Builder step.
                This answers "what should I do next?" at a glance.
            ================================================================ */}
            {neededNextSections.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Needed Next
                </p>
                <div className="space-y-2">
                  {neededNextSections.map(function (section) {
                    const StatusIcon = statusStyles[section.status].icon;
                    // Deep-link using resumeFocus for scroll + highlight behavior
                    return (
                      <Link
                        key={section.id}
                        href={'/dashboard/resume-builder?resumeFocus=' + section.stepParam}
                        className="flex items-center justify-between p-3 rounded-lg border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className="w-4 h-4 text-yellow-500" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {section.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-accent group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================
                FULL SECTIONS LIST
                ================================================================
                Shows all resume sections with their current status.
                Each row has an "Edit" action that deep-links to Resume Builder.
                Status badges use consistent styling across the app.
            ================================================================ */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                All Sections
              </p>
              <div className="space-y-1">
                {sections.map(function (section) {
                  const style = statusStyles[section.status];
                  const StatusIcon = style.icon;
                  return (
                    <div
                      key={section.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon
                          className={
                            section.status === 'complete'
                              ? 'w-4 h-4 text-green-500'
                              : section.status === 'in-progress'
                                ? 'w-4 h-4 text-yellow-500'
                                : 'w-4 h-4 text-muted-foreground'
                          }
                        />
                        <span className="text-sm font-medium text-foreground">
                          {section.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={'text-xs ' + style.className}>
                          <SensitiveValue
                            value={style.label}
                            hide={isSensitiveHidden}
                            masked="Hidden"
                          />
                        </Badge>
                        {/* Edit button - deep-links with resumeFocus for scroll + highlight */}
                        <Link href={'/dashboard/resume-builder?resumeFocus=' + section.stepParam}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="career.resumeOverview" />
        )}
      </CardContent>
    </Card>
  );
}
