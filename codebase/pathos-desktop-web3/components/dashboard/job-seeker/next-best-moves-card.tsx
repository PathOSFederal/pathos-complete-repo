/**
 * ============================================================================
 * NEXT BEST MOVES CARD (Day 13 - Job Seeker Dashboard First-Principles Refactor)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component displays a "Your Next Best Moves" card for job seekers that
 * provides 3-6 actionable recommendations based on the user's current state.
 * Each recommendation has a title, rationale, and CTA button linking to an
 * existing route or action in the application.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * This card is the second section on the Job Seeker dashboard, appearing
 * after MarketPositionCard and before BenefitsSwitchingCard.
 *
 * KEY DESIGN PRINCIPLES:
 * 1. REALISTIC MOVES: Only suggest actions the user can actually take
 * 2. DATA-DRIVEN: Prioritize moves based on what data is missing/present
 * 3. GOOD EMPTY STATE: If no data exists, guide user to get started
 * 4. MOBILE-FIRST: Works well on small screens, desktop adds depth
 *
 * MOVE GENERATION LOGIC:
 * The component analyzes local store data to determine which moves to show.
 * All moves are CONDITIONAL based on user state - no moves are "always included".
 *
 * Move selection criteria:
 * - If no target role set → suggest "Set Your Target Role"
 * - If resume < 40% complete → suggest "Build Your Federal Resume"
 * - If resume 40-80% complete → suggest "Complete Your Resume"
 * - If no saved searches → suggest "Start Your Job Search"
 * - If no saves but has target → suggest "Save Your First Search"
 * - If has resume + target role → suggest "Tailor Your Resume"
 * - If profile incomplete → suggest "Complete Your Profile"
 * - If has 1-2 saved searches → suggest "Diversify Your Searches"
 *
 * The list is sorted by priority and capped at 6 moves max.
 *
 * PRIVACY INTEGRATION:
 * - Respects global privacy toggle (masks rationale text if sensitive)
 * - Has per-card visibility toggle
 * - Visibility persists to localStorage
 */

'use client';

/**
 * TYPE-ONLY IMPORT FOR ComponentType
 * We import ComponentType directly from 'react' using a type-only import.
 * This avoids the "Cannot find namespace 'React'" TypeScript error that
 * occurs when using React.ComponentType without a full React import.
 * Type-only imports are erased at compile time and add no runtime cost.
 */
import type { ComponentType } from 'react';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  Search,
  FileText,
  User,
  Bookmark,
  Target,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { useProfileStore } from '@/store/profileStore';
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * MoveItem represents a single actionable recommendation.
 * Each move has a unique ID, display info, and navigation target.
 */
interface MoveItem {
  /** Unique identifier for React key */
  id: string;
  /** Short action title (e.g., "Set Your Target Role") */
  title: string;
  /** One-sentence rationale explaining why this move matters */
  rationale: string;
  /**
   * Icon component to display (from lucide-react).
   * Uses ComponentType from the type-only import at the top of this file
   * instead of React.ComponentType to avoid namespace resolution issues.
   */
  icon: ComponentType<{ className?: string }>;
  /** Navigation path for the CTA button */
  href: string;
  /** CTA button label */
  ctaLabel: string;
  /** Priority for sorting (lower = higher priority) */
  priority: number;
}

/**
 * ============================================================================
 * MOVE GENERATION FUNCTIONS
 * ============================================================================
 * These functions analyze store data and generate appropriate moves.
 */

/**
 * Generates a list of actionable moves based on the user's current state.
 *
 * HOW IT WORKS:
 * 1. Analyze profile completeness (target role, location, etc.)
 * 2. Analyze resume completeness (content, target roles in resume)
 * 3. Analyze job search activity (saved searches, recent views)
 * 4. Generate moves based on gaps and opportunities
 * 5. Sort by priority and return top 3-6 moves
 *
 * @param profile - User's profile from profileStore
 * @param resumeData - User's resume from resumeBuilderStore
 * @param savedSearchCount - Number of saved job searches
 * @param isTailoringMode - Whether user is in tailoring mode
 * @returns Array of MoveItem objects
 */
function generateMoves(
  profile: ReturnType<typeof useProfileStore.getState>['profile'],
  resumeData: ReturnType<typeof useResumeBuilderStore.getState>['resumeData'],
  savedSearchCount: number,
  isTailoringMode: boolean
): MoveItem[] {
  const moves: MoveItem[] = [];

  // ============================================================================
  // STEP 1: Check profile completeness
  // ============================================================================

  // Check if target role is set
  let hasTargetRole = false;
  if (profile && profile.goals) {
    const hasTargetSeries = profile.goals.targetSeries && profile.goals.targetSeries.length > 0;
    const hasTargetGrades = profile.goals.targetGradeFrom && profile.goals.targetGradeTo;
    if (hasTargetSeries || hasTargetGrades) {
      hasTargetRole = true;
    }
  }

  // Check if location preferences are set
  let hasLocationPrefs = false;
  if (profile && profile.location) {
    if (profile.location.currentMetroArea || (profile.location.preferredLocations && profile.location.preferredLocations.length > 0)) {
      hasLocationPrefs = true;
    }
  }

  // Check if profile name is set (basic profile completion signal)
  let hasProfileName = false;
  if (profile && profile.name && profile.name.trim().length > 0) {
    hasProfileName = true;
  }

  // ============================================================================
  // STEP 2: Check resume completeness
  // ============================================================================

  let hasWorkExperience = false;
  let hasEducation = false;
  let hasSkills = false;
  let hasTargetRolesInResume = false;

  if (resumeData) {
    hasWorkExperience = resumeData.workExperience && resumeData.workExperience.length > 0;
    hasEducation = resumeData.education && resumeData.education.length > 0;
    hasSkills =
      resumeData.skills &&
      resumeData.skills.technicalSkills &&
      resumeData.skills.technicalSkills.length > 0;
    hasTargetRolesInResume = resumeData.targetRoles && resumeData.targetRoles.length > 0;
  }

  // Calculate resume completeness percentage (rough estimate)
  let resumeCompleteness = 0;
  if (hasWorkExperience) {
    resumeCompleteness = resumeCompleteness + 40;
  }
  if (hasEducation) {
    resumeCompleteness = resumeCompleteness + 20;
  }
  if (hasSkills) {
    resumeCompleteness = resumeCompleteness + 20;
  }
  if (hasTargetRolesInResume) {
    resumeCompleteness = resumeCompleteness + 20;
  }

  // ============================================================================
  // STEP 3: Generate moves based on gaps
  // ============================================================================

  // Move 1: Set Target Role (highest priority if missing)
  if (!hasTargetRole) {
    moves.push({
      id: 'set-target-role',
      title: 'Set Your Target Role',
      rationale: 'Define the federal position you want. This focuses your job search and resume.',
      icon: Target,
      href: '/settings',
      ctaLabel: 'Set Target',
      priority: 1,
    });
  }

  // Move 2: Build Resume (high priority if minimal content)
  if (resumeCompleteness < 40) {
    moves.push({
      id: 'build-resume',
      title: 'Build Your Federal Resume',
      rationale: 'Federal resumes require specific details. Start building yours now.',
      icon: FileText,
      href: '/dashboard/resume-builder',
      ctaLabel: 'Start Resume',
      priority: 2,
    });
  } else if (resumeCompleteness < 80) {
    moves.push({
      id: 'complete-resume',
      title: 'Complete Your Resume',
      rationale: 'Your resume is ' + resumeCompleteness + '% complete. Add more details to stand out.',
      icon: FileText,
      href: '/dashboard/resume-builder',
      ctaLabel: 'Continue',
      priority: 4,
    });
  }

  // Move 3: Start Job Search (if no saved searches)
  if (savedSearchCount === 0) {
    moves.push({
      id: 'start-search',
      title: 'Start Your Job Search',
      rationale: 'Browse federal positions that match your skills and goals.',
      icon: Search,
      href: '/dashboard/job-search',
      ctaLabel: 'Search Jobs',
      priority: 3,
    });
  }

  // Move 4: Save a Search (if searching but no saves)
  if (savedSearchCount === 0 && hasTargetRole) {
    moves.push({
      id: 'save-search',
      title: 'Save Your First Search',
      rationale: 'Save searches to track new openings and get alerts.',
      icon: Bookmark,
      href: '/dashboard/job-search',
      ctaLabel: 'Save Search',
      priority: 5,
    });
  }

  // Move 5: Tailor Resume (if user has target job)
  if (isTailoringMode || (hasWorkExperience && hasTargetRole)) {
    moves.push({
      id: 'tailor-resume',
      title: 'Tailor Your Resume',
      rationale: 'Customize your resume for specific job announcements to increase match.',
      icon: Sparkles,
      href: '/dashboard/resume-builder',
      ctaLabel: 'Tailor',
      priority: 6,
    });
  }

  // Move 6: Complete Profile (if basic info missing)
  if (!hasProfileName || !hasLocationPrefs) {
    moves.push({
      id: 'complete-profile',
      title: 'Complete Your Profile',
      rationale: 'Add your name and location preferences for personalized results.',
      icon: User,
      href: '/settings',
      ctaLabel: 'Edit Profile',
      priority: 7,
    });
  }

  // Move 7: Explore More Searches (if user has some activity)
  if (savedSearchCount > 0 && savedSearchCount < 3) {
    moves.push({
      id: 'explore-searches',
      title: 'Diversify Your Searches',
      rationale: 'Save more searches with different criteria to expand your options.',
      icon: Search,
      href: '/dashboard/job-search',
      ctaLabel: 'Explore',
      priority: 8,
    });
  }

  // ============================================================================
  // STEP 4: Sort by priority and limit to 6 moves
  // ============================================================================

  moves.sort(function (a, b) {
    return a.priority - b.priority;
  });

  // Return top 6 moves (or fewer if not enough)
  const result: MoveItem[] = [];
  const maxMoves = 6;
  for (let i = 0; i < moves.length && i < maxMoves; i++) {
    result.push(moves[i]);
  }

  return result;
}

/**
 * ============================================================================
 * EMPTY STATE COMPONENT
 * ============================================================================
 * Shown when the system can't determine any actionable moves (unlikely but
 * possible if all data is complete).
 *
 * BUTTON + LINK PATTERN:
 * We use Button with asChild prop and wrap a Link inside. This is the correct
 * shadcn/ui pattern for navigation buttons. It avoids invalid DOM nesting
 * (button inside anchor or vice versa) and ensures proper keyboard navigation.
 */
function EmptyStateMoves() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Lightbulb className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
      <p className="text-sm text-muted-foreground mb-3">
        Great job! You are all set.
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Continue browsing jobs and saving searches.
      </p>
      {/* Button with asChild delegates rendering to the Link child,
          giving us button styling with proper anchor semantics */}
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/job-search">
          <Search className="w-4 h-4 mr-1.5" />
          Browse Jobs
        </Link>
      </Button>
    </div>
  );
}

/**
 * ============================================================================
 * MOVE ITEM COMPONENT
 * ============================================================================
 * Renders a single move recommendation.
 *
 * BUTTON + LINK PATTERN:
 * The CTA uses Button with asChild and wraps a Link inside. This is the
 * correct shadcn/ui pattern that avoids invalid DOM nesting and ensures
 * proper keyboard navigation and accessibility.
 */
interface MoveItemRowProps {
  move: MoveItem;
  isHidden: boolean;
}

function MoveItemRow(props: MoveItemRowProps) {
  const move = props.move;
  const isHidden = props.isHidden;
  const IconComponent = move.icon;

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Icon */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
        <IconComponent className="w-4 h-4 text-accent" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{move.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {isHidden ? '•••••••••••••••••••••' : move.rationale}
        </p>
      </div>

      {/* CTA Button - uses asChild to delegate rendering to the Link child */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="shrink-0 h-8 px-2 text-xs text-accent hover:text-accent-foreground hover:bg-accent/20"
      >
        <Link href={move.href}>
          {move.ctaLabel}
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </Button>
    </div>
  );
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function NextBestMovesCard() {
  // ============================================================================
  // STORE SUBSCRIPTIONS
  // ============================================================================

  // Profile data for determining what's set up
  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  // Saved searches for activity signal
  const savedJobSearches = useJobSearchStore(function (state) {
    return state.savedJobSearches;
  });
  const savedSearchCount = savedJobSearches ? savedJobSearches.length : 0;

  // Resume data for completeness check
  const resumeData = useResumeBuilderStore(function (state) {
    return state.resumeData;
  });

  // Tailoring mode flag
  const isTailoringMode = useResumeBuilderStore(function (state) {
    return state.isTailoringMode;
  });

  // Per-card visibility and global privacy state
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('jobseeker.nextBestMoves');

  // ============================================================================
  // COMPUTE MOVES
  // ============================================================================

  const moves = generateMoves(profile, resumeData, savedSearchCount, isTailoringMode);

  // ============================================================================
  // RENDER
  // ============================================================================

  const cardTitle = 'Your Next Best Moves';

  // If card is hidden via per-card visibility toggle, show placeholder
  if (!visible) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-accent" />
              {cardTitle}
            </CardTitle>
            <DashboardCardVisibilityToggle cardKey="jobseeker.nextBestMoves" />
          </div>
        </CardHeader>
        <CardContent>
          <CardHiddenPlaceholder title={cardTitle} cardKey="jobseeker.nextBestMoves" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      {/* Card Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            {cardTitle}
          </CardTitle>
          <DashboardCardVisibilityToggle cardKey="jobseeker.nextBestMoves" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Personalized actions to strengthen your federal job application
        </p>
      </CardHeader>

      {/* Card Content */}
      <CardContent>
        {moves.length === 0 ? (
          <EmptyStateMoves />
        ) : (
          <div className="space-y-2">
            {moves.map(function (move) {
              return (
                <MoveItemRow key={move.id} move={move} isHidden={isSensitiveHidden} />
              );
            })}

            {/* Footer Note */}
            <div className="flex items-start gap-2 pt-3 border-t border-border mt-3">
              <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Moves are prioritized based on your profile and activity. All data is local.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

