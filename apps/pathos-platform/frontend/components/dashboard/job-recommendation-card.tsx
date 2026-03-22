/**
 * ============================================================================
 * JOB RECOMMENDATION CARD (Day 33 - PathAdvisor Recommendation v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays a PathAdvisor recommendation card for Job Seeker mode.
 * Shows actionable guidance based on the currently selected job and
 * user profile signals.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Consumed by: app/dashboard/page.tsx (Job Seeker mode)
 * - Uses: lib/recommendations/jobRecommendation.ts (recommendation engine)
 * - Reads from: jobSearchStore (selected job), profileStore (profile signals)
 *
 * DESIGN PRINCIPLES:
 * - Follows established PathOS card styling and spacing
 * - Respects per-card visibility toggles
 * - Shows confidence indicator (simple, not flashy)
 * - Displays rationale bullets (2-4 items)
 * - Provides action buttons (1-3 items)
 *
 * HOW IT WORKS:
 * 1. Reads selected job from jobSearchStore
 * 2. Reads profile signals from profileStore
 * 3. Gathers context signals (job search results count, etc.)
 * 4. Calls generateJobRecommendation() to get recommendation
 * 5. Renders card with headline, bullets, confidence, actions
 *
 * @version Day 33 - PathAdvisor Recommendation v1
 * ============================================================================
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { generateJobRecommendation, type RecommendationInput } from '@/lib/recommendations/jobRecommendation';
import { useJobSearchStore, selectSelectedJob, selectJobs } from '@/store/jobSearchStore';
import { useProfileStore } from '@/store/profileStore';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

/**
 * ============================================================================
 * COMPONENT PROPS
 * ============================================================================
 */

interface JobRecommendationCardProps {
  /**
   * Display variant for the recommendation card.
   * - "full": Shows complete recommendation with all rationale bullets and multiple actions (default)
   * - "preview": Shows lightweight preview with max 2 bullets and single CTA to Job Search
   */
  variant?: 'full' | 'preview';
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */
export function JobRecommendationCard(props: JobRecommendationCardProps = {}) {
  const variant = props.variant !== undefined ? props.variant : 'full';
  const router = useRouter();

  // ============================================================================
  // STORE SUBSCRIPTIONS
  // Read selected job, jobs list, and profile signals for recommendation logic.
  // ============================================================================

  const selectedJob = useJobSearchStore(selectSelectedJob);
  const jobs = useJobSearchStore(selectJobs);
  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  // ============================================================================
  // CARD VISIBILITY
  // Respect per-card visibility toggles and global privacy settings.
  // ============================================================================

  const { visible } = useDashboardCardVisibility('jobSearch.recommendations');

  // ============================================================================
  // RECOMMENDATION GENERATION
  // Generate recommendation based on current state.
  // Memoized to avoid recalculating on every render.
  // ============================================================================

  const recommendation = useMemo(function () {
    const input: RecommendationInput = {
      selectedJob: selectedJob,
      profileSignals: {
        gradeBand: profile.goals.gradeBand,
        targetGradeFrom: profile.goals.targetGradeFrom,
        targetGradeTo: profile.goals.targetGradeTo,
        locationPreference: profile.location.currentMetroArea,
        relocationWillingness: profile.location.relocationWillingness,
        workArrangement: profile.location.workArrangement,
      },
      context: {
        jobSearchResultsCount: jobs.length,
        hasResume: false, // TODO: Wire to resume store when available
        hasSavedJob: false, // TODO: Wire to saved jobs when available
      },
    };
    return generateJobRecommendation(input);
  }, [selectedJob, jobs.length, profile.goals.gradeBand, profile.goals.targetGradeFrom, profile.goals.targetGradeTo, profile.location.currentMetroArea, profile.location.relocationWillingness, profile.location.workArrangement]);

  // ============================================================================
  // ACTION HANDLERS
  // Handle clicks on recommendation action buttons.
  // ============================================================================

  function handleActionClick(intent: string) {
    // Route to the intent path
    if (intent.startsWith('/')) {
      router.push(intent);
    } else {
      // For non-route intents (e.g., "resume-builder"), fall back to job search
      router.push('/dashboard/job-search');
    }
  }

  // ============================================================================
  // CONFIDENCE INDICATOR
  // Get icon and color for confidence level.
  // ============================================================================

  function getConfidenceDisplay(confidence: 'Low' | 'Medium' | 'High') {
    if (confidence === 'High') {
      return {
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        label: 'High confidence',
      };
    }
    if (confidence === 'Medium') {
      return {
        icon: Info,
        color: 'text-accent',
        bgColor: 'bg-accent/10',
        label: 'Medium confidence',
      };
    }
    return {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      label: 'Low confidence',
    };
  }

  const confidenceDisplay = getConfidenceDisplay(recommendation.confidence);
  const ConfidenceIcon = confidenceDisplay.icon;

  // ============================================================================
  // PREVIEW VARIANT LOGIC
  // Preview variant shows only first 2 rationale bullets and single CTA to Job Search.
  // ============================================================================

  const isPreview = variant === 'preview';
  const displayBullets = isPreview
    ? recommendation.rationaleBullets.slice(0, 2)
    : recommendation.rationaleBullets;

  // ============================================================================
  // RENDER
  // ============================================================================

  const title = 'PathAdvisor Recommendation';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            {title}
          </CardTitle>
          <DashboardCardVisibilityToggle cardKey="jobSearch.recommendations" />
        </div>
        {!isPreview && (
          <CardDescription>
            Personalized guidance for your job search
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {!visible ? (
          <CardHiddenPlaceholder title={title} cardKey="jobSearch.recommendations" />
        ) : (
          <div className="space-y-4">
            {/* Headline */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {recommendation.headline}
                </h3>
                {/* Confidence indicator - only show in full variant */}
                {!isPreview && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={confidenceDisplay.bgColor + ' ' + confidenceDisplay.color + ' border-0'}
                    >
                      <ConfidenceIcon className="w-3 h-3 mr-1" />
                      {confidenceDisplay.label}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Rationale bullets - capped at 2 for preview */}
            {displayBullets.length > 0 && (
              <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
                {displayBullets.map(function (bullet, index) {
                  return (
                    <li key={index} className="pl-2">
                      {bullet}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-2 border-t border-border">
              {isPreview ? (
                /* Preview variant: Single CTA button that routes to Job Search */
                <div className="space-y-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={function () {
                      router.push('/dashboard/job-search');
                    }}
                    className="w-full"
                  >
                    Open Job Search
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    See full recommendations and actions
                  </p>
                </div>
              ) : (
                /* Full variant: Show all actions */
                recommendation.nextActions.map(function (action) {
                  return (
                    <div key={action.id} className="space-y-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={function () {
                          handleActionClick(action.intent);
                        }}
                        className="w-full"
                      >
                        {action.label}
                      </Button>
                      {action.helperText && (
                        <p className="text-xs text-muted-foreground text-center">
                          {action.helperText}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

