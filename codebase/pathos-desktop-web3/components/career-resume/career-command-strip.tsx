/**
 * ============================================================================
 * CAREER COMMAND STRIP COMPONENT
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component is the PRIMARY ACTION SURFACE at the top of the Career & Resume
 * page. It answers the user's four key questions in 10-15 seconds:
 *   1. What should I do next?
 *   2. Why does it matter?
 *   3. How long will it take?
 *   4. Where do I click?
 *
 * WHY THIS STRIP EXISTS:
 * Without a clear action-oriented header, the Career & Resume page feels like a
 * passive status dashboard. Users scroll aimlessly looking for "what to do next."
 * This strip makes the page DECISIVE by surfacing the single most impactful action
 * and providing a one-click path to complete it.
 *
 * HOW IT WORKS:
 * 1. Reads resume completion data from the Resume Builder store
 * 2. Reads target roles from the Target Roles store/mock data
 * 3. Determines the highest priority "next best move" based on:
 *    - Missing primary target role (top priority blocker)
 *    - Incomplete resume sections (ordered by impact)
 * 4. Displays one primary CTA ("Fix now") that deep-links to the correct step
 * 5. Displays a secondary CTA ("View plan") that scrolls to the task list
 *
 * ARCHITECTURE FIT:
 * - Located in components/career-resume/ alongside other career page cards
 * - Uses the same stores (resumeBuilderStore, userPreferencesStore) as other cards
 * - Follows the same visibility/privacy patterns as sibling components
 *
 * @version Day 14 - Career & Resume First-Principles Refactor
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Rocket, Clock, Target, ChevronRight, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';

/**
 * NextMove interface defines the structure of the "next best move" recommendation.
 * Each move has an action title, impact rationale, time estimate, and navigation path.
 */
interface NextMove {
  /** Imperative action title (e.g., "Complete target role details") */
  title: string;
  /** Why this action matters (e.g., "Improves KSA coverage for SYSADMIN") */
  impact: string;
  /** Estimated time to complete (e.g., "5-10 min") */
  timeEstimate: string;
  /** URL to navigate to when "Fix now" is clicked */
  href: string;
  /** Whether this is a blocker (no valid primary target role) */
  isBlocker: boolean;
  /** Priority level for sorting (lower = higher priority) */
  priority: number;
}

interface CareerCommandStripProps {
  /** Whether to hide sensitive data (global privacy mode) */
  isSensitiveHidden: boolean;
  /** Callback to scroll to the task list section */
  onViewPlan: () => void;
  /** Resume completion percentage (0-100) from shared data source */
  completionPercent: number;
  /** Primary target role title, or null if no primary role set */
  primaryRoleTitle: string | null;
  /** Whether the primary target role has all required fields */
  isPrimaryRoleComplete: boolean;
}

/**
 * CareerCommandStrip Component
 *
 * STEP-BY-STEP HOW IT WORKS:
 * 1. Props receive current resume state (completion %, primary role status)
 * 2. useMemo computes the "next best move" based on:
 *    a. If no primary role or incomplete, that's the top blocker
 *    b. Otherwise, check resume sections for missing/incomplete items
 * 3. Render the strip with:
 *    - Title + progress bar (single source of truth)
 *    - Next move description with impact + time estimate
 *    - Primary CTA: "Fix now" -> navigates to the right step
 *    - Secondary CTA: "View plan" -> scrolls to task list
 *
 * EXAMPLE:
 * User has no primary target role selected:
 *   -> Strip shows "Complete target role" as the blocker
 *   -> "Fix now" opens the target role editor
 *
 * User has a primary role but missing certifications:
 *   -> Strip shows "Add certifications" as the next move
 *   -> "Fix now" opens Resume Builder at the skills step
 */
export function CareerCommandStrip(props: CareerCommandStripProps) {
  const isSensitiveHidden = props.isSensitiveHidden;
  const onViewPlan = props.onViewPlan;
  const completionPercent = props.completionPercent;
  const primaryRoleTitle = props.primaryRoleTitle;
  const isPrimaryRoleComplete = props.isPrimaryRoleComplete;

  /**
   * Compute the next best move based on current state.
   * Priority order:
   * 1. No primary target role -> must set one first (blocker)
   * 2. Primary role missing required fields -> complete it (blocker)
   * 3. Missing resume sections -> complete them by priority
   */
  const nextMove = useMemo(function (): NextMove {
    // ========================================================================
    // PRIORITY 1: No primary target role at all
    // ========================================================================
    // This is a blocker because PathAdvisor cannot give tailored advice
    // without knowing what role the user is targeting.
    //
    // DEEP-LINK: Uses resumeFocus=target-roles to navigate to the Target Roles
    // step and scroll to the appropriate section with highlight.
    // @see components/resume-builder/resume-builder-focus-handler.tsx
    if (!primaryRoleTitle) {
      return {
        title: 'Set your primary target role',
        impact: 'PathAdvisor needs a target to give tailored career advice',
        timeEstimate: '2-3 min',
        href: '/dashboard/resume-builder?resumeFocus=target-roles',
        isBlocker: true,
        priority: 1,
      };
    }

    // ========================================================================
    // PRIORITY 2: Primary target role exists but is missing required fields
    // ========================================================================
    // User has indicated a target but hasn't provided enough detail for
    // the system to match KSAs and provide accurate guidance.
    //
    // DEEP-LINK: Uses resumeFocus=target-roles to navigate to the Target Roles
    // step and scroll to the appropriate section with highlight.
    if (!isPrimaryRoleComplete) {
      return {
        title: 'Complete required details for your target role',
        impact: 'Missing details prevent accurate KSA matching for ' + primaryRoleTitle,
        timeEstimate: '3-5 min',
        href: '/dashboard/resume-builder?resumeFocus=target-roles',
        isBlocker: true,
        priority: 2,
      };
    }

    // ========================================================================
    // PRIORITY 3+: Resume sections incomplete
    // ========================================================================
    // Check completion percent and recommend the next most impactful section.
    // These recommendations are based on what matters most for federal resumes:
    // - Work experience with accomplishments (most important for KSA matching)
    // - Skills and certifications (required for many positions)
    // - Education (often a hard requirement)
    //
    // DEEP-LINK: Each recommendation uses resumeFocus to navigate to the
    // correct step and scroll/highlight the target section.

    if (completionPercent < 40) {
      // Very low completion - focus on work experience first
      return {
        title: 'Add federal work experience',
        impact: 'Work history is critical for KSA coverage and grade qualification',
        timeEstimate: '10-15 min',
        href: '/dashboard/resume-builder?resumeFocus=work-experience',
        isBlocker: false,
        priority: 3,
      };
    }

    if (completionPercent < 60) {
      // Medium completion - skills and certifications next
      return {
        title: 'Add certifications and skills',
        impact: 'Certifications improve match score for ' + primaryRoleTitle,
        timeEstimate: '5-10 min',
        href: '/dashboard/resume-builder?resumeFocus=certifications',
        isBlocker: false,
        priority: 4,
      };
    }

    if (completionPercent < 80) {
      // Good progress - education and remaining details
      return {
        title: 'Complete education and training',
        impact: 'Education requirements are checked for grade qualification',
        timeEstimate: '5 min',
        href: '/dashboard/resume-builder?resumeFocus=education',
        isBlocker: false,
        priority: 5,
      };
    }

    // High completion - polish and review
    return {
      title: 'Review and finalize your resume',
      impact: 'Final review ensures USAJOBS readiness for ' + primaryRoleTitle,
      timeEstimate: '5-10 min',
      href: '/dashboard/resume-builder?resumeFocus=review',
      isBlocker: false,
      priority: 6,
    };
  }, [primaryRoleTitle, isPrimaryRoleComplete, completionPercent]);

  /**
   * Determine the status label based on completion level.
   */
  const getStatusLabel = function (): string {
    if (completionPercent >= 80) {
      return 'Strong';
    }
    if (completionPercent >= 40) {
      return 'Developing';
    }
    return 'Needs work';
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-accent/10">
      <CardContent className="p-4 sm:p-6">
        {/* Top Row: Title + Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">
              Resume readiness for your target role
            </h2>
          </div>

          {/* Progress indicator - single source of truth */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-[120px]">
              <Progress
                value={isSensitiveHidden ? 0 : completionPercent}
                className="h-2 flex-1"
              />
              <span className="text-sm font-medium text-foreground min-w-[3rem] text-right">
                <SensitiveValue
                  value={completionPercent + '%'}
                  hide={isSensitiveHidden}
                  masked="••%"
                />
              </span>
            </div>
            <Badge
              variant="outline"
              className={
                completionPercent >= 80
                  ? 'bg-green-500/10 text-green-600 border-green-500/30'
                  : completionPercent >= 40
                    ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                    : 'bg-red-500/10 text-red-600 border-red-500/30'
              }
            >
              <SensitiveValue
                value={getStatusLabel()}
                hide={isSensitiveHidden}
                masked="Hidden"
              />
            </Badge>
          </div>
        </div>

        {/* Target Role Context */}
        {primaryRoleTitle && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Target className="w-4 h-4" />
            <span>
              Targeting:{' '}
              <SensitiveValue
                value={primaryRoleTitle}
                hide={isSensitiveHidden}
                masked="••••••••••••"
              />
            </span>
          </div>
        )}

        {/* Blocker Alert (if applicable) */}
        {nextMove.isBlocker && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Action required before PathAdvisor can help
            </p>
          </div>
        )}

        {/* Next Best Move Section */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Move Description */}
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">
              Next best move:{' '}
              <span className="text-accent">{nextMove.title}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              <SensitiveValue
                value={nextMove.impact}
                hide={isSensitiveHidden}
                masked="Impact details hidden"
              />
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{nextMove.timeEstimate}</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Primary CTA: Fix now - navigates to the correct step */}
            {/* Note: Even inside Link, type="button" prevents form submission if
                this component ever ends up inside a form context */}
            <Link href={nextMove.href}>
              <Button type="button" className="w-full sm:w-auto gap-2">
                {nextMove.isBlocker ? 'Complete target role' : 'Fix now'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>

            {/* Secondary CTA: View plan - scrolls to task list */}
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto gap-2 bg-transparent"
              onClick={onViewPlan}
            >
              View plan
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
