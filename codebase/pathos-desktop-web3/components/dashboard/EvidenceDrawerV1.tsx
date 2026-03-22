/**
 * ============================================================================
 * COACH NOTES DRAWER V1 (Day 35 - Hybrid Advisor + Mission Board Dashboard)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component renders a collapsible drawer that shows compact evidence
 * cards when PathAdvisor references proof (via evidence chips).
 * The drawer stays collapsed by default and only opens when an evidence chip
 * is clicked.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * This is the SECONDARY panel in the new Job Seeker dashboard layout:
 * - Right column (desktop): MissionBoardV1 + CoachNotesDrawerV1
 * - Inline expandable area (mobile): Coach Notes Drawer becomes inline
 *
 * KEY FEATURES:
 * - Collapsed by default
 * - Opens when an evidence chip is clicked
 * - Shows ONE compact evidence card at a time
 * - Evidence cards:
 *   A) Market Snapshot (compact version of Market Position)
 *   B) Eligibility Blockers
 *   C) Today's Focus (replaces noisy Next Best Moves)
 *   D) Next Best Move (optional)
 * - Close control
 *
 * DAY 35 UPDATES:
 * - Renamed from "Evidence" to "Coach Notes" for clearer user understanding
 * - The drawer label now says "Coach Notes" instead of "Evidence"
 * - Defaults to Priority Alerts content when no evidence card is selected
 * - Priority Alerts derived from stores: profile completeness, target role,
 *   saved searches, alerts configured
 *
 * DESIGN PRINCIPLES:
 * - Compact and minimal text
 * - One action per card
 * - Subtle badges for status indicators
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, X, AlertCircle, Lightbulb, TrendingUp, Target, Search, Bell } from 'lucide-react';
import { useProfileStore } from '@/store/profileStore';
import { useJobSearchStore, selectJobs, selectSelectedJob } from '@/store/jobSearchStore';
import { useJobAlertsStore } from '@/store/jobAlertsStore';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * EvidenceCardType represents the different evidence cards that can be shown.
 */
export type EvidenceCardType = 'snapshot' | 'blockers' | 'focus' | 'moves';

/**
 * ============================================================================
 * PROPS INTERFACE
 * ============================================================================
 */

interface EvidenceDrawerV1Props {
  /**
   * Whether the drawer is currently open.
   */
  open: boolean;
  /**
   * The currently selected evidence card type.
   */
  cardType: EvidenceCardType | null;
  /**
   * Callback when the drawer should be closed.
   */
  onClose: () => void;
}

/**
 * ============================================================================
 * EVIDENCE CARD COMPONENTS
 * ============================================================================
 */

/**
 * Market Snapshot Card
 * Compact version of Market Position showing fit, salary position, and mobility.
 */
function MarketSnapshotCard() {
  return (
    // data-tour anchors are used by GuidedTourOverlay for stable spotlight targeting
    <div data-tour="high-signal-card" className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Fit</span>
        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
          High
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Salary Position</span>
        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
          On target
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Mobility</span>
        <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-500/30">
          Low
        </Badge>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-4">
        Fix mobility
      </Button>
    </div>
  );
}

/**
 * Eligibility Blockers Card
 * Shows placeholder blockers that could prevent eligibility.
 */
function EligibilityBlockersCard() {
  const blockers = [
    'Location preference limits announcements',
    'Series mismatch for some targets',
    'Missing specialized experience phrasing',
  ];

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {blockers.map(function (blocker, index) {
          return (
            <li key={index} className="flex items-start gap-2 text-xs text-foreground">
              <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
              <span>{blocker}</span>
            </li>
          );
        })}
      </ul>
      <Button variant="outline" size="sm" className="w-full mt-4">
        Address blockers
      </Button>
    </div>
  );
}

/**
 * Today's Focus Card
 * Replaces noisy Next Best Moves on Home with a single focused item.
 */
function TodaysFocusCard() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Save your first search</p>
          <p className="text-xs text-muted-foreground mt-1">
            This helps you track roles that match your criteria.
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-4">
        Save search
      </Button>
      <a
        href="/dashboard"
        className="text-xs text-accent hover:text-accent/80 text-center block"
      >
        Show other moves
      </a>
    </div>
  );
}

/**
 * Next Best Move Card
 * Optional evidence card showing a single recommended move.
 */
function NextBestMoveCard() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <TrendingUp className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Complete your resume</p>
          <p className="text-xs text-muted-foreground mt-1">
            A complete resume increases your chances of passing initial screening.
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-4">
        Complete resume
      </Button>
    </div>
  );
}

/**
 * ============================================================================
 * PRIORITY ALERTS CARD (Day 35)
 * ============================================================================
 *
 * PURPOSE:
 * Shows meaningful local-only alerts derived from existing stores:
 * - Profile completeness
 * - Target role configuration
 * - Saved searches
 * - Alerts configured
 *
 * Each alert has a clear CTA button that navigates to the right page or
 * opens the right action.
 *
 * DESIGN:
 * - Local-only (no API calls)
 * - Derived from store state
 * - Clear, actionable CTAs
 * - Priority-ordered (most important first)
 */
function PriorityAlertsCard() {
  const router = useRouter();

  // ============================================================================
  // STORE SUBSCRIPTIONS
  // Read data from stores to derive priority alerts.
  // ============================================================================

  const profile = useProfileStore(function (state) {
    return state.profile;
  });
  const savedJobSearches = useJobSearchStore(function (state) {
    return state.savedJobSearches;
  });
  const jobs = useJobSearchStore(selectJobs);
  const selectedJob = useJobSearchStore(selectSelectedJob);
  const alerts = useJobAlertsStore(function (state) {
    return state.alerts;
  });

  // ============================================================================
  // DERIVE PRIORITY ALERTS
  // Build list of alerts based on store state.
  // ============================================================================

  /**
   * Priority alert type definition.
   * Day 33: Added optional badgeCount for showing job count badges.
   */
  interface PriorityAlert {
    id: string;
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    ctaLabel: string;
    ctaAction: () => void;
    icon: React.ElementType;
    badgeCount?: number;
  }

  const priorityAlerts: PriorityAlert[] = [];

  // Alert 1: Profile incomplete
  if (!profile.isComplete) {
    priorityAlerts.push({
      id: 'profile-incomplete',
      title: 'Complete your profile',
      description: 'Finish setting up your profile to get personalized recommendations.',
      severity: 'high',
      ctaLabel: 'Complete profile',
      ctaAction: function () {
        router.push('/settings');
      },
      icon: Target,
    });
  }

  // Alert 2: No target role set
  if (!profile.goals.targetSeries || profile.goals.targetSeries.length === 0) {
    priorityAlerts.push({
      id: 'no-target-role',
      title: 'Set your target role',
      description: 'Choose target job series to see relevant opportunities.',
      severity: 'high',
      ctaLabel: 'Set target role',
      ctaAction: function () {
        router.push('/settings');
      },
      icon: Target,
    });
  }

  // Alert 3: No saved searches
  // Day 33: Enhanced to show job count badge when there are search results
  if (savedJobSearches.length === 0) {
    const hasSearchResults = jobs.length > 0;
    const hasNoSelectedJob = selectedJob === null;
    
    // If there are search results but no selected job, enhance the alert with count
    if (hasSearchResults && hasNoSelectedJob) {
      priorityAlerts.push({
        id: 'no-saved-searches',
        title: 'Save your first search',
        description: 'You have ' + jobs.length + ' jobs ready to review. Save a search to track roles that match your criteria.',
        severity: 'medium',
        ctaLabel: 'Go to Job Search',
        ctaAction: function () {
          router.push('/dashboard/job-search');
        },
        icon: Search,
        badgeCount: jobs.length,
      });
    } else {
      // Standard alert when no search results yet
      priorityAlerts.push({
        id: 'no-saved-searches',
        title: 'Save your first search',
        description: 'Save a job search to track roles that match your criteria.',
        severity: 'medium',
        ctaLabel: 'Go to Job Search',
        ctaAction: function () {
          router.push('/dashboard/job-search');
        },
        icon: Search,
      });
    }
  } else {
    // Day 33: If user has saved searches but has search results with no selected job,
    // show a separate "Review your search results" alert
    const hasSearchResults = jobs.length > 0;
    const hasNoSelectedJob = selectedJob === null;
    
    if (hasSearchResults && hasNoSelectedJob) {
      priorityAlerts.push({
        id: 'review-search-results',
        title: 'Review your search results',
        description: 'You have ' + jobs.length + ' jobs ready to review.',
        severity: 'medium',
        ctaLabel: 'Go to Job Search',
        ctaAction: function () {
          router.push('/dashboard/job-search');
        },
        icon: Search,
        badgeCount: jobs.length,
      });
    }
  }

  // Alert 4: No alerts configured
  if (alerts.length === 0) {
    priorityAlerts.push({
      id: 'no-alerts',
      title: 'Set up job alerts',
      description: 'Get notified when new roles match your saved searches.',
      severity: 'medium',
      ctaLabel: 'Create alert',
      ctaAction: function () {
        router.push('/dashboard/job-search');
      },
      icon: Bell,
    });
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (priorityAlerts.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center py-4">
          No priority alerts at this time. You&apos;re all set!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {priorityAlerts.map(function (alert) {
          const Icon = alert.icon;
          const severityColors = {
            high: 'text-red-500',
            medium: 'text-yellow-500',
            low: 'text-blue-500',
          };
          const severityColor = severityColors[alert.severity];

          return (
            <li key={alert.id} className="flex items-start gap-3">
              <div className={cn('mt-0.5 shrink-0', severityColor)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  {/* Day 33: Show badge count if available */}
                  {alert.badgeCount !== undefined && alert.badgeCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {alert.badgeCount}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={alert.ctaAction}
                >
                  {alert.ctaLabel}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function EvidenceDrawerV1(props: EvidenceDrawerV1Props) {
  const open = props.open;
  const cardType = props.cardType;
  const onClose = props.onClose;

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Gets the title for the evidence drawer based on the card type.
   */
  function getTitle(): string {
    if (cardType === 'snapshot') {
      return 'Market Snapshot';
    }
    if (cardType === 'blockers') {
      return 'Eligibility Blockers';
    }
    if (cardType === 'focus') {
      return 'Today&apos;s Focus';
    }
    if (cardType === 'moves') {
      return 'Next Best Move';
    }
    return 'Coach Notes';
  }

  /**
   * Renders the appropriate evidence card based on the card type.
   * Day 35: When no cardType is selected, shows Priority Alerts by default.
   */
  function renderEvidenceCard() {
    if (cardType === 'snapshot') {
      return <MarketSnapshotCard />;
    }
    if (cardType === 'blockers') {
      return <EligibilityBlockersCard />;
    }
    if (cardType === 'focus') {
      return <TodaysFocusCard />;
    }
    if (cardType === 'moves') {
      return <NextBestMoveCard />;
    }
    // Day 35: Default to Priority Alerts when no cardType selected
    return <PriorityAlertsCard />;
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Collapsible open={open} onOpenChange={function (isOpen) {
      if (!isOpen) {
        onClose();
      }
    }}>
      <Card className="border-border bg-card" data-handoff-target="coach-notes">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Coach Notes</CardTitle>
              <div className="flex items-center gap-2">
                {open ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {/* ================================================================== */}
            {/* DAY 35: Always show content - Priority Alerts by default          */}
            {/* When cardType is null, shows Priority Alerts.                     */}
            {/* When cardType is set, shows the specific evidence card.            */}
            {/* ================================================================== */}
            <div>
              {cardType && (
                <div className="mb-4 pb-4 border-b border-border">
                  <h3 className="text-sm font-medium text-foreground">{getTitle()}</h3>
                </div>
              )}
              {renderEvidenceCard()}
              {cardType && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-4"
                  onClick={onClose}
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
