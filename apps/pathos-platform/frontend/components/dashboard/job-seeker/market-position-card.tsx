/**
 * ============================================================================
 * MARKET POSITION CARD (Day 13 - Job Seeker Dashboard First-Principles Refactor)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component displays a "Market Position" summary card for job seekers on
 * the PathOS dashboard. It provides at-a-glance heuristics about the user's
 * readiness and positioning for federal employment.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                           Dashboard Page                                │
 * │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
 * │  │ THIS COMPONENT  │  │ NextBestMoves   │  │ BenefitsSwitching       │ │
 * │  │ (Market Pos.)   │  │    Card         │  │    Card                 │ │
 * │  └────────┬────────┘  └─────────────────┘  └─────────────────────────┘ │
 * └───────────┼──────────────────────────────────────────────────────────────┘
 *             │
 *             ▼
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │                       Zustand Stores                                │
 *   │  profileStore    │  jobSearchStore    │  resumeBuilderStore         │
 *   │  (goals, location) (saved searches)     (resume completeness)       │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * HEURISTICS EXPLAINED:
 * This card calculates three v1 heuristics using LOCAL-ONLY data (no network):
 *
 * 1. FIT (Low / Medium / High):
 *    - High: User has target role set AND resume has content AND has searches
 *    - Medium: Target role OR resume content present, but not both
 *    - Low: Missing both target role and resume content
 *
 * 2. SALARY POSITION (Below / On Target / Above / Unknown):
 *    - Compares user's expected salary (if set) to federal pay scale estimates
 *    - If no data, shows "Unknown" with guidance to unlock
 *
 * 3. MOBILITY (Low / Medium / High):
 *    - High: 2+ saved searches AND multiple preferred locations
 *    - Medium: Some searches OR some location flexibility
 *    - Low: No saved searches, narrow location, little activity
 *
 * PRIVACY INTEGRATION:
 * - Respects global privacy toggle (masks sensitive values)
 * - Has per-card visibility toggle (can hide entire card)
 * - Visibility persists to localStorage via userPreferencesStore
 *
 * MOBILE-FIRST DESIGN:
 * - Compact layout that works on mobile screens
 * - Desktop adds depth via better spacing, not different content
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, MapPin, HelpCircle } from 'lucide-react';
import { useProfileStore } from '@/store/profileStore';
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import { SensitiveValue } from '@/components/sensitive-value';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * HeuristicLevel represents the possible values for our v1 heuristics.
 * We use string literals to ensure type safety and prevent typos.
 */
type HeuristicLevel = 'low' | 'medium' | 'high';

/**
 * SalaryPosition represents the user's estimated salary position relative
 * to typical federal pay scales for their target grade band.
 */
type SalaryPosition = 'below' | 'on-target' | 'above' | 'unknown';

/**
 * MarketPositionData holds all computed heuristic values for display.
 * This is computed fresh on each render from store data.
 */
interface MarketPositionData {
  fit: HeuristicLevel;
  fitReason: string;
  salaryPosition: SalaryPosition;
  salaryReason: string;
  mobility: HeuristicLevel;
  mobilityReason: string;
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 * These functions compute heuristics from local store data.
 * They use explicit null/undefined checks (no optional chaining).
 */

/**
 * Computes the "Fit" heuristic based on profile and resume completeness.
 *
 * HOW IT WORKS:
 * 1. Check if user has set a target role (via profile.goals.targetSeries)
 * 2. Check if resume has meaningful content (work experience or skills)
 * 3. Check if user has any saved searches or job activity
 * 4. Combine these signals to determine fit level
 *
 * @param profile - User's profile from profileStore
 * @param resumeData - User's resume data from resumeBuilderStore
 * @param savedSearchCount - Number of saved job searches
 * @returns Object with fit level and reason string
 */
function computeFit(
  profile: ReturnType<typeof useProfileStore.getState>['profile'],
  resumeData: ReturnType<typeof useResumeBuilderStore.getState>['resumeData'],
  savedSearchCount: number
): { level: HeuristicLevel; reason: string } {
  // Step 1: Check if target role is set
  // We consider it "set" if targetSeries has at least one entry OR
  // if targetGradeFrom and targetGradeTo are both set
  let hasTargetRole = false;
  if (profile && profile.goals) {
    const hasTargetSeries = profile.goals.targetSeries && profile.goals.targetSeries.length > 0;
    const hasTargetGrades = profile.goals.targetGradeFrom && profile.goals.targetGradeTo;
    if (hasTargetSeries || hasTargetGrades) {
      hasTargetRole = true;
    }
  }

  // Step 2: Check if resume has content
  // We consider it "has content" if there's at least one work experience
  // OR if there are technical skills listed
  let hasResumeContent = false;
  if (resumeData) {
    const hasWorkExperience = resumeData.workExperience && resumeData.workExperience.length > 0;
    const hasSkills =
      resumeData.skills &&
      resumeData.skills.technicalSkills &&
      resumeData.skills.technicalSkills.length > 0;
    if (hasWorkExperience || hasSkills) {
      hasResumeContent = true;
    }
  }

  // Step 3: Check for job search activity
  const hasSearchActivity = savedSearchCount > 0;

  // Step 4: Compute fit level based on signals
  // HIGH: All three signals present
  if (hasTargetRole && hasResumeContent && hasSearchActivity) {
    return {
      level: 'high',
      reason: 'Target role set, resume built, actively searching',
    };
  }

  // HIGH: Target role AND resume content (even without search activity)
  if (hasTargetRole && hasResumeContent) {
    return {
      level: 'high',
      reason: 'Target role defined and resume content ready',
    };
  }

  // MEDIUM: Has target role OR resume content, but not both
  if (hasTargetRole) {
    return {
      level: 'medium',
      reason: 'Target role set. Add resume content to improve fit.',
    };
  }
  if (hasResumeContent) {
    return {
      level: 'medium',
      reason: 'Resume content exists. Set your target role to improve fit.',
    };
  }
  if (hasSearchActivity) {
    return {
      level: 'medium',
      reason: 'Active searching. Set target role and build resume.',
    };
  }

  // LOW: None of the signals present
  return {
    level: 'low',
    reason: 'Set your target role and add resume content to get started.',
  };
}

/**
 * Computes the "Salary Position" heuristic.
 *
 * HOW IT WORKS:
 * 1. Look at user's target grade band (entry, early, mid, senior)
 * 2. Compare to typical federal salary ranges for that band
 * 3. If user has indicated expected salary, compare to range
 * 4. Return position relative to typical federal pay
 *
 * NOTE: In Tier 1, we don't have actual user salary data, so we use
 * grade band as a proxy and provide general guidance.
 *
 * @param profile - User's profile from profileStore
 * @returns Object with salary position and reason string
 */
function computeSalaryPosition(
  profile: ReturnType<typeof useProfileStore.getState>['profile']
): { position: SalaryPosition; reason: string } {
  // Check if we have grade band information
  if (!profile || !profile.goals) {
    return {
      position: 'unknown',
      reason: 'Set your target grade to see salary positioning.',
    };
  }

  const gradeBand = profile.goals.gradeBand;
  const hasTargetGrades = profile.goals.targetGradeFrom && profile.goals.targetGradeTo;

  // If no grade band or unsure, we can't compute salary position
  if (!gradeBand || gradeBand === 'unsure') {
    if (!hasTargetGrades) {
      return {
        position: 'unknown',
        reason: 'Select a target grade band in Profile settings.',
      };
    }
  }

  // For v1, we assume user is "on target" if they've selected a grade band
  // because federal pay scales are standardized and locality-adjusted.
  // In future versions, we could compare to private sector data.

  // Provide grade-band-specific messaging
  if (gradeBand === 'entry') {
    return {
      position: 'on-target',
      reason: 'Entry-level GS-5 to GS-7 typically offers $39K-$58K base.',
    };
  }
  if (gradeBand === 'early') {
    return {
      position: 'on-target',
      reason: 'Early-career GS-7 to GS-9 typically offers $48K-$72K base.',
    };
  }
  if (gradeBand === 'mid') {
    return {
      position: 'on-target',
      reason: 'Mid-career GS-9 to GS-11 typically offers $59K-$88K base.',
    };
  }
  if (gradeBand === 'senior') {
    return {
      position: 'on-target',
      reason: 'Senior GS-12 to GS-13 typically offers $78K-$120K base.',
    };
  }

  // Custom or other
  if (hasTargetGrades) {
    return {
      position: 'on-target',
      reason: 'Custom range ' + profile.goals.targetGradeFrom + ' to ' + profile.goals.targetGradeTo + ' selected.',
    };
  }

  return {
    position: 'unknown',
    reason: 'Set your target grade to see salary positioning.',
  };
}

/**
 * Computes the "Mobility" heuristic based on search activity and location flexibility.
 *
 * HOW IT WORKS:
 * 1. Count saved job searches (more = higher mobility signal)
 * 2. Check location flexibility from profile.location
 * 3. Check preferred locations count
 * 4. Combine signals to determine mobility level
 *
 * @param profile - User's profile from profileStore
 * @param savedSearchCount - Number of saved job searches
 * @returns Object with mobility level and reason string
 */
function computeMobility(
  profile: ReturnType<typeof useProfileStore.getState>['profile'],
  savedSearchCount: number
): { level: HeuristicLevel; reason: string } {
  // Step 1: Assess search activity level
  const hasMultipleSearches = savedSearchCount >= 2;
  const hasSomeSearches = savedSearchCount >= 1;

  // Step 2: Assess location flexibility
  let locationFlexibility: 'narrow' | 'moderate' | 'wide' = 'narrow';
  let preferredLocationCount = 0;

  if (profile && profile.location) {
    preferredLocationCount = profile.location.preferredLocations
      ? profile.location.preferredLocations.length
      : 0;

    const willingness = profile.location.relocationWillingness;
    if (willingness === 'open_conus' || willingness === 'open_conus_oconus') {
      locationFlexibility = 'wide';
    } else if (willingness === 'nearby_regions') {
      locationFlexibility = 'moderate';
    }
    // 'stay_local' = narrow (default)

    // Also consider multiple preferred locations as flexibility signal
    if (preferredLocationCount >= 3) {
      locationFlexibility = locationFlexibility === 'narrow' ? 'moderate' : locationFlexibility;
    }
  }

  // Step 3: Combine signals to determine mobility
  // HIGH: Multiple searches AND wide/moderate location flexibility
  if (hasMultipleSearches && (locationFlexibility === 'wide' || locationFlexibility === 'moderate')) {
    return {
      level: 'high',
      reason: 'Active searching with geographic flexibility.',
    };
  }

  // HIGH: Wide location flexibility even with fewer searches
  if (locationFlexibility === 'wide' && hasSomeSearches) {
    return {
      level: 'high',
      reason: 'Open to relocation across the country.',
    };
  }

  // MEDIUM: Some activity OR some flexibility
  if (hasMultipleSearches) {
    return {
      level: 'medium',
      reason: 'Multiple saved searches. Consider expanding locations.',
    };
  }
  if (locationFlexibility === 'moderate') {
    return {
      level: 'medium',
      reason: 'Open to nearby regions. Save more searches to increase mobility.',
    };
  }
  if (hasSomeSearches) {
    return {
      level: 'medium',
      reason: 'Search activity started. Add more searches for variety.',
    };
  }
  if (preferredLocationCount > 0) {
    return {
      level: 'medium',
      reason: 'Preferred locations set. Start saving searches.',
    };
  }

  // LOW: Minimal activity and narrow location
  return {
    level: 'low',
    reason: 'Save job searches and consider location flexibility.',
  };
}

/**
 * ============================================================================
 * STYLING HELPER FUNCTIONS
 * ============================================================================
 * These functions return CSS classes based on heuristic values.
 */

/**
 * Returns badge variant and text color classes for a heuristic level.
 */
function getHeuristicStyles(level: HeuristicLevel): { badgeClass: string; textClass: string } {
  if (level === 'high') {
    return {
      badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
      textClass: 'text-green-400',
    };
  }
  if (level === 'medium') {
    return {
      badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      textClass: 'text-yellow-400',
    };
  }
  // low
  return {
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    textClass: 'text-red-400',
  };
}

/**
 * Returns badge variant and text color classes for salary position.
 */
function getSalaryPositionStyles(position: SalaryPosition): { badgeClass: string; textClass: string } {
  if (position === 'on-target') {
    return {
      badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
      textClass: 'text-green-400',
    };
  }
  if (position === 'above') {
    return {
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      textClass: 'text-blue-400',
    };
  }
  if (position === 'below') {
    return {
      badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      textClass: 'text-yellow-400',
    };
  }
  // unknown
  return {
    badgeClass: 'bg-muted text-muted-foreground border-border',
    textClass: 'text-muted-foreground',
  };
}

/**
 * Capitalizes the first letter of a string (for display).
 */
function capitalize(str: string): string {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function MarketPositionCard() {
  // ============================================================================
  // STORE SUBSCRIPTIONS
  // Read from multiple stores to compute heuristics. We use individual
  // selectors to minimize re-renders.
  // ============================================================================

  // Profile data for goals and location
  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  // Saved searches count for mobility and fit heuristics
  const savedJobSearches = useJobSearchStore(function (state) {
    return state.savedJobSearches;
  });
  const savedSearchCount = savedJobSearches ? savedJobSearches.length : 0;

  // Resume data for fit heuristic
  const resumeData = useResumeBuilderStore(function (state) {
    return state.resumeData;
  });

  // Per-card visibility and global privacy state
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('jobseeker.marketPosition');

  // ============================================================================
  // COMPUTE HEURISTICS
  // These are computed fresh on each render from store data.
  // ============================================================================

  const fitResult = computeFit(profile, resumeData, savedSearchCount);
  const salaryResult = computeSalaryPosition(profile);
  const mobilityResult = computeMobility(profile, savedSearchCount);

  const marketData: MarketPositionData = {
    fit: fitResult.level,
    fitReason: fitResult.reason,
    salaryPosition: salaryResult.position,
    salaryReason: salaryResult.reason,
    mobility: mobilityResult.level,
    mobilityReason: mobilityResult.reason,
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const cardTitle = 'Market Position';

  // If card is hidden via per-card visibility toggle, show placeholder
  if (!visible) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              {cardTitle}
            </CardTitle>
            <DashboardCardVisibilityToggle cardKey="jobseeker.marketPosition" />
          </div>
        </CardHeader>
        <CardContent>
          <CardHiddenPlaceholder title={cardTitle} cardKey="jobseeker.marketPosition" />
        </CardContent>
      </Card>
    );
  }

  // Get styling for each heuristic
  const fitStyles = getHeuristicStyles(marketData.fit);
  const salaryStyles = getSalaryPositionStyles(marketData.salaryPosition);
  const mobilityStyles = getHeuristicStyles(marketData.mobility);

  return (
    <Card className="border-border bg-card">
      {/* Card Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            {cardTitle}
          </CardTitle>
          <DashboardCardVisibilityToggle cardKey="jobseeker.marketPosition" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Your readiness for federal employment based on local data
        </p>
      </CardHeader>

      {/* Card Content - Three Heuristic Rows */}
      <CardContent className="space-y-4">
        {/* Fit Heuristic */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Fit</span>
            </div>
            <Badge variant="outline" className={'text-xs ' + fitStyles.badgeClass}>
              <SensitiveValue
                value={capitalize(marketData.fit)}
                hide={isSensitiveHidden}
                masked="•••"
              />
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {isSensitiveHidden ? '••••••••••••' : marketData.fitReason}
          </p>
        </div>

        {/* Salary Position Heuristic */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Salary Position</span>
            </div>
            <Badge variant="outline" className={'text-xs ' + salaryStyles.badgeClass}>
              <SensitiveValue
                value={marketData.salaryPosition === 'on-target' ? 'On Target' : capitalize(marketData.salaryPosition)}
                hide={isSensitiveHidden}
                masked="•••"
              />
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {isSensitiveHidden ? '••••••••••••' : marketData.salaryReason}
          </p>
        </div>

        {/* Mobility Heuristic */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Mobility</span>
            </div>
            <Badge variant="outline" className={'text-xs ' + mobilityStyles.badgeClass}>
              <SensitiveValue
                value={capitalize(marketData.mobility)}
                hide={isSensitiveHidden}
                masked="•••"
              />
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {isSensitiveHidden ? '••••••••••••' : marketData.mobilityReason}
          </p>
        </div>

        {/* Footer Note */}
        <div className="flex items-start gap-2 pt-2 border-t border-border">
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Heuristics based on your profile, resume, and search activity. All data is local.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

