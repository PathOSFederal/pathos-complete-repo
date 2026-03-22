/**
 * ============================================================================
 * NEXT ACTIONS CARD (REFACTORED)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component displays a list of ACTIONABLE TASKS that help the user
 * complete their resume and target role setup. Each task is a complete-able
 * item with a clear action, impact, time estimate, and deep-link.
 *
 * WHY THIS REFACTOR:
 * The previous design showed tasks as simple list items without:
 *   - Clear "why it matters" rationale
 *   - Time estimates
 *   - Completion/dismiss actions
 *   - Accurate deep-links to the correct edit surface
 *
 * This refactored version answers four questions for each task:
 *   1. What should I do? -> Action title (imperative)
 *   2. Why does it matter? -> Impact description
 *   3. How long will it take? -> Time estimate
 *   4. Where do I click? -> "Fix now" button with deep-link
 *
 * DEEP-LINK MECHANISM:
 * Each task specifies an `href` that navigates to the correct step in the
 * Resume Builder or to the target role editor. The Resume Builder reads
 * the `step` query param and auto-navigates to that section.
 *
 * Example deep-links:
 *   - /dashboard/resume-builder?step=skills (for certifications)
 *   - /dashboard/resume-builder?step=work-experience (for experience)
 *   - /dashboard/resume-builder?step=target-roles (for target role tasks)
 *
 * SNOOZE/DISMISS:
 * These actions are UI-only for now. A future version could persist
 * dismissed/snoozed tasks to localStorage or a backend.
 *
 * ARCHITECTURE FIT:
 * - Located in components/career-resume/ alongside other career page cards
 * - Uses the same stores and visibility patterns as sibling components
 * - Provides the data source for the Command Strip's "next best move"
 *
 * @version Day 14 - Career & Resume First-Principles Refactor
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  ChevronRight,
  Clock,
  X,
  BellOff,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import { AskPathAdvisorButton } from '@/components/pathadvisor/AskPathAdvisorButton';
import { askPathAdvisor } from '@/lib/pathadvisor/askPathAdvisor';
import { useAdvisorContext } from '@/contexts/advisor-context';

/**
 * Priority levels for tasks. Higher priority tasks appear first.
 * - high: Blockers or critical items
 * - medium: Important but not blocking
 * - low: Nice-to-have improvements
 */
type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Task status for tracking completion and dismissal.
 * - pending: Not yet completed
 * - completed: User marked as done (UI-only for now)
 * - snoozed: User deferred for later (UI-only for now)
 * - dismissed: User dismissed permanently (UI-only for now)
 */
type TaskStatus = 'pending' | 'completed' | 'snoozed' | 'dismissed';

/**
 * ActionTask interface defines a single actionable task.
 */
interface ActionTask {
  /** Unique identifier for the task */
  id: string;
  /** Imperative action title (e.g., "Add certifications") */
  title: string;
  /** Why this task matters (e.g., "Improves KSA coverage") */
  impact: string;
  /** Estimated time to complete (e.g., "5-10 min") */
  timeEstimate: string;
  /** Priority level for sorting and styling */
  priority: TaskPriority;
  /** URL to navigate when "Fix now" is clicked */
  href: string;
  /** Current status of the task */
  status: TaskStatus;
}

/**
 * Initial task list derived from common resume gaps.
 * In a real implementation, this would be computed from actual resume data
 * and target role requirements.
 *
 * IMPORTANT: The message about "Fill out at least one target role" has been
 * replaced with the accurate "Complete required details for your primary target role"
 * when roles exist but are incomplete.
 *
 * DEEP-LINK MECHANISM (Day 14 Bugfix):
 * Each task's href now uses the `resumeFocus` query parameter instead of `step`.
 * The ResumeBuilderFocusHandler component reads this param and:
 *   1. Navigates to the correct wizard step
 *   2. Scrolls to the specific section within that step
 *   3. Highlights the section briefly
 *   4. Removes the param to prevent re-scroll on refresh
 *
 * @see components/resume-builder/resume-builder-focus-handler.tsx
 */
const initialTasks: ActionTask[] = [
  {
    id: '1',
    title: 'Complete required details for your primary target role',
    impact: 'Enables accurate KSA matching and tailored guidance from PathAdvisor',
    timeEstimate: '3-5 min',
    priority: 'high',
    // resumeFocus=target-roles navigates to step 1 (Target Roles)
    href: '/dashboard/resume-builder?resumeFocus=target-roles',
    status: 'pending',
  },
  {
    id: '2',
    title: 'Add federal work experience details',
    impact: 'Work history is critical for grade qualification and specialized experience',
    timeEstimate: '10-15 min',
    priority: 'high',
    // resumeFocus=work-experience navigates to step 2 (Work Experience)
    href: '/dashboard/resume-builder?resumeFocus=work-experience',
    status: 'pending',
  },
  {
    id: '3',
    title: 'Add certifications and training',
    impact: 'Many federal positions require specific certifications for qualification',
    timeEstimate: '5-10 min',
    priority: 'medium',
    // resumeFocus=certifications navigates to step 4 (Skills) and scrolls to
    // the certifications section specifically
    href: '/dashboard/resume-builder?resumeFocus=certifications',
    status: 'pending',
  },
  {
    id: '4',
    title: 'Review and update awards section',
    impact: 'Awards demonstrate performance and can differentiate your application',
    timeEstimate: '5 min',
    priority: 'low',
    // resumeFocus=awards also navigates to certifications section (awards are
    // grouped with certifications in the current UI)
    href: '/dashboard/resume-builder?resumeFocus=awards',
    status: 'pending',
  },
];

/**
 * Priority styling configuration for task badges and borders.
 */
const priorityStyles: Record<TaskPriority, { badge: string; border: string; text: string }> = {
  high: {
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    border: 'border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
  },
  medium: {
    badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    border: 'border-yellow-500/30',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  low: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    border: 'border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
};

/**
 * Priority labels for display.
 */
const priorityLabels: Record<TaskPriority, string> = {
  high: 'High priority',
  medium: 'Medium',
  low: 'Optional',
};

/**
 * NextActionsCard Component
 *
 * STEP-BY-STEP HOW IT WORKS:
 * 1. Uses local state to track task statuses (snooze, dismiss, complete)
 * 2. Filters tasks to show only pending ones
 * 3. Renders each task as a full row with:
 *    a. Priority badge
 *    b. Action title (imperative)
 *    c. Impact description
 *    d. Time estimate
 *    e. "Fix now" button (deep-link)
 *    f. Snooze/Dismiss actions
 * 4. Shows PathAdvisor prompt at the bottom for career guidance
 *
 * EXAMPLE:
 * User sees "Add certifications" task:
 *   -> Badge shows "Medium"
 *   -> Impact says "Many federal positions require specific certifications"
 *   -> Time estimate shows "5-10 min"
 *   -> "Fix now" navigates to /dashboard/resume-builder?step=skills
 *   -> Snooze/X buttons can defer or dismiss the task
 */
export function NextActionsCard() {
  const visibility = useDashboardCardVisibility('career.nextActions');
  const visible = visibility.visible;
  const isSensitiveHidden = visibility.isSensitiveHidden;
  const title = 'Next Actions';

  // Advisor context for PathAdvisor integration
  const advisorContextData = useAdvisorContext();
  const setContext = advisorContextData.setContext;
  const setPendingPrompt = advisorContextData.setPendingPrompt;
  const setShouldOpenFocusMode = advisorContextData.setShouldOpenFocusMode;
  const setOnPathAdvisorClose = advisorContextData.setOnPathAdvisorClose;

  // Local state for task management
  // In a real implementation, this would persist to localStorage or backend
  const [tasks, setTasks] = useState<ActionTask[]>(initialTasks);

  /**
   * Handle snoozing a task.
   * For now, this just updates local state. A real implementation would
   * persist to localStorage and show snoozed tasks after a delay.
   */
  const handleSnooze = function (taskId: string) {
    const newTasks: ActionTask[] = [];
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) {
        const updatedTask: ActionTask = {
          id: tasks[i].id,
          title: tasks[i].title,
          impact: tasks[i].impact,
          timeEstimate: tasks[i].timeEstimate,
          priority: tasks[i].priority,
          href: tasks[i].href,
          status: 'snoozed',
        };
        newTasks.push(updatedTask);
      } else {
        newTasks.push(tasks[i]);
      }
    }
    setTasks(newTasks);
  };

  /**
   * Handle dismissing a task permanently.
   * For now, this just updates local state. A real implementation would
   * persist dismissed tasks so they don't reappear.
   */
  const handleDismiss = function (taskId: string) {
    const newTasks: ActionTask[] = [];
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) {
        const updatedTask: ActionTask = {
          id: tasks[i].id,
          title: tasks[i].title,
          impact: tasks[i].impact,
          timeEstimate: tasks[i].timeEstimate,
          priority: tasks[i].priority,
          href: tasks[i].href,
          status: 'dismissed',
        };
        newTasks.push(updatedTask);
      } else {
        newTasks.push(tasks[i]);
      }
    }
    setTasks(newTasks);
  };

  /**
   * Handle marking a task as completed.
   */
  const handleComplete = function (taskId: string) {
    const newTasks: ActionTask[] = [];
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) {
        const updatedTask: ActionTask = {
          id: tasks[i].id,
          title: tasks[i].title,
          impact: tasks[i].impact,
          timeEstimate: tasks[i].timeEstimate,
          priority: tasks[i].priority,
          href: tasks[i].href,
          status: 'completed',
        };
        newTasks.push(updatedTask);
      } else {
        newTasks.push(tasks[i]);
      }
    }
    setTasks(newTasks);
  };

  /**
   * Filter to show only pending tasks.
   */
  const pendingTasks: ActionTask[] = [];
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].status === 'pending') {
      pendingTasks.push(tasks[i]);
    }
  }

  /**
   * Count completed tasks for display.
   */
  let completedCount = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].status === 'completed') {
      completedCount++;
    }
  }

  /**
   * Day 43: Use askPathAdvisor (anchor-first, always opens Focus Mode) for career readiness assessment
   */
  const handleAskPathAdvisor = function () {
    askPathAdvisor({
      source: 'dashboard',
      sourceLabel: 'Career Readiness Assessment',
      summary: 'Completed career readiness assessment',
      contextPayload: {
        source: 'recommendations',
        prompt: 'Assess my career readiness for my target roles. Highlight the top gaps in my resume, the strongest signals, and the 3 highest-impact fixes I should make next.',
      },
      contextFunctions: {
        setContext: setContext,
        setPendingPrompt: setPendingPrompt,
        setShouldOpenFocusMode: setShouldOpenFocusMode,
        setOnPathAdvisorClose: setOnPathAdvisorClose,
      },
    });
  };

  return (
    <Card className="border-border bg-card lg:col-span-2" id="next-actions-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">{title}</CardTitle>
            {completedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount} completed
              </Badge>
            )}
          </div>
          <DashboardCardVisibilityToggle cardKey="career.nextActions" />
        </div>
        {visible && (
          <p className="text-sm text-muted-foreground">
            Prioritized tasks to strengthen your career profile and resume. Complete these to
            improve your match score for target roles.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            {/* Task List */}
            <div className="space-y-3">
              {pendingTasks.length > 0 ? (
                pendingTasks.map(function (task) {
                  const style = priorityStyles[task.priority];
                  return (
                    <div
                      key={task.id}
                      className={'p-4 rounded-lg border ' + style.border + ' bg-card hover:bg-muted/30 transition-colors'}
                    >
                      {/* Task Header: Priority + Title */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className={'text-xs shrink-0 ' + style.badge}>
                            {priorityLabels[task.priority]}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {task.title}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Impact Description */}
                      <p className="text-sm text-muted-foreground mb-2 pl-0 sm:pl-[calc(4rem+0.75rem)]">
                        <SensitiveValue
                          value={task.impact}
                          hide={isSensitiveHidden}
                          masked="Impact details hidden while privacy mode is on"
                        />
                      </p>

                      {/* Time Estimate + Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pl-0 sm:pl-[calc(4rem+0.75rem)]">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{task.timeEstimate}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Snooze Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={function () {
                              handleSnooze(task.id);
                            }}
                          >
                            <BellOff className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Snooze</span>
                          </Button>

                          {/* Dismiss Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={function () {
                              handleDismiss(task.id);
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>

                          {/* Complete Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={function () {
                              handleComplete(task.id);
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Done</span>
                          </Button>

                          {/* Primary CTA: Fix now - deep-links to correct step */}
                          {/* Note: Even inside Link, type="button" prevents form submission if
                              this component ever ends up inside a form context */}
                          <Link href={task.href}>
                            <Button type="button" size="sm" className="h-7 px-3 text-xs gap-1">
                              Fix now
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    All tasks completed!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Great work! Your resume is ready for review.
                  </p>
                </div>
              )}
            </div>

            {/* PathAdvisor Bridge */}
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <p className="text-sm text-muted-foreground mb-3">
                PathAdvisor uses your career and resume details to give tailored advice for
                promotions, lateral moves, and job announcements.
              </p>
              <AskPathAdvisorButton onClick={handleAskPathAdvisor} fullWidth={false} className="text-sm">
                Ask PathAdvisor about my career readiness
              </AskPathAdvisorButton>
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="career.nextActions" />
        )}
      </CardContent>
    </Card>
  );
}
