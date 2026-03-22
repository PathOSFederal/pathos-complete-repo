/**
 * ============================================================================
 * SETUP CHECKLIST CARD
 * ============================================================================
 *
 * FILE PURPOSE:
 * A card displayed at the top of the Settings page that shows profile setup
 * progress and guides users to complete high-leverage configuration items
 * that unlock better job search results and PathAdvisor recommendations.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * - Component Layer: /components/settings/SetupChecklistCard.tsx
 * - Used by: app/settings/page.tsx
 * - Reads from: profileStore (to derive checklist completion)
 * - Does not write state directly (calls scroll/focus handlers from parent)
 *
 * KEY CONCEPTS:
 * - Derives completion state from existing profile store data
 * - Provides CTA buttons that scroll/focus to the relevant control
 * - Displays progress indicator (X/N completed)
 * - Trust-forward: explains why each item matters
 *
 * WHY THIS DESIGN:
 * - First-principles UX: users know what to do first
 * - No extra state needed (derives from existing profile)
 * - CTA buttons provide direct action, not just information
 *
 * ============================================================================
 */

'use client';

import type React from 'react';
import { Check, Circle, MapPin, Target, Briefcase, Home, Navigation } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useProfileStore } from '@/store/profileStore';

/**
 * Props for the SetupChecklistCard component.
 *
 * scrollToSection: Callback to scroll to and focus a specific section.
 *   Receives the section ID (e.g., 'location', 'goals', 'identity').
 */
interface SetupChecklistCardProps {
  scrollToSection: (sectionId: string) => void;
}

/**
 * Type for a checklist item.
 *
 * id: Unique identifier for the item
 * label: Display text for the item
 * description: Why this item matters
 * isComplete: Whether the item is completed (derived from profile state)
 * sectionId: Which section to scroll to when clicking the CTA
 * icon: Lucide icon component to display
 */
interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  isComplete: boolean;
  sectionId: string;
  icon: React.ElementType;
}

/**
 * SetupChecklistCard - displays profile setup progress and guides users
 * to complete high-leverage configuration items.
 *
 * HOW IT WORKS:
 * 1. Reads profile state from profileStore
 * 2. Derives completion state for each checklist item
 * 3. Renders progress bar and checklist rows
 * 4. Each incomplete item has a "Set up" button that scrolls to the control
 *
 * WHY DERIVE FROM STORE:
 * Instead of maintaining separate state, we compute completion directly
 * from the profile. This ensures the checklist is always accurate and
 * automatically updates when the user makes changes.
 */
export function SetupChecklistCard(props: SetupChecklistCardProps): React.ReactElement {
  const scrollToSection = props.scrollToSection;

  // Read profile state from store
  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  // ============================================================================
  // DERIVE CHECKLIST COMPLETION STATE
  // ============================================================================
  // Each item checks a specific aspect of the profile.
  // We compute this on every render (cheap, no memo needed for 5 items).

  // 1. Metro area set?
  const hasMetroArea = profile.location.currentMetroArea !== null
    && profile.location.currentMetroArea !== undefined
    && profile.location.currentMetroArea.trim().length > 0;

  // 2. At least 1 target series selected?
  const hasTargetSeries = profile.goals.targetSeries.length > 0;

  // 3. Target grade range set?
  // Consider complete if at least one of targetGradeFrom or targetGradeTo is set
  const hasGradeRange = (
    (profile.goals.targetGradeFrom !== null && profile.goals.targetGradeFrom !== undefined && profile.goals.targetGradeFrom.length > 0) ||
    (profile.goals.targetGradeTo !== null && profile.goals.targetGradeTo !== undefined && profile.goals.targetGradeTo.length > 0)
  );

  // 4. Work arrangement selected OR explicitly "no preference"?
  // Check if workArrangement is set to any valid value (including 'no_preference')
  const hasWorkArrangement = profile.location.workArrangement !== null
    && profile.location.workArrangement !== undefined
    && profile.location.workArrangement.length > 0;

  // 5. Preferred location set (only required if willingness-to-relocate is limited)
  // If relocation willingness is 'stay_local' or 'nearby_regions', user should set preferred locations
  // If 'open_conus' or 'open_conus_oconus' or 'no_preference', preferred locations are optional
  const relocWillingness = profile.location.relocationWillingness;
  const needsPreferredLocations = relocWillingness === 'stay_local' || relocWillingness === 'nearby_regions';
  const hasPreferredLocations = profile.location.preferredLocations.length > 0;

  // Build checklist items array
  const checklistItems: ChecklistItem[] = [
    {
      id: 'metro',
      label: 'Set your metro area',
      description: 'Helps us calculate locality pay and filter nearby jobs',
      isComplete: hasMetroArea,
      sectionId: 'location',
      icon: MapPin,
    },
    {
      id: 'series',
      label: 'Select target series or fields',
      description: 'Ensures job matches align with your career goals',
      isComplete: hasTargetSeries,
      sectionId: 'goals',
      icon: Target,
    },
    {
      id: 'grade',
      label: 'Set target grade range',
      description: 'Filters jobs to grades you qualify for and aspire to',
      isComplete: hasGradeRange,
      sectionId: 'goals',
      icon: Briefcase,
    },
    {
      id: 'work',
      label: 'Choose work arrangement preference',
      description: 'Filters for on-site, hybrid, or remote opportunities',
      isComplete: hasWorkArrangement,
      sectionId: 'location',
      icon: Home,
    },
  ];

  // Conditionally add preferred locations item
  if (needsPreferredLocations) {
    checklistItems.push({
      id: 'locations',
      label: 'Add preferred locations',
      description: 'Since you prefer staying local, tell us which areas',
      isComplete: hasPreferredLocations,
      sectionId: 'location',
      icon: Navigation,
    });
  }

  // Calculate completion stats
  const completedCount = checklistItems.filter(function (item) {
    return item.isComplete;
  }).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // If all items complete, show a condensed success state
  const allComplete = completedCount === totalCount;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className={cn(
      'border-accent/30',
      allComplete ? 'bg-accent/5' : 'bg-card'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {allComplete ? 'Profile setup complete!' : 'Setup checklist'}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {allComplete
                ? 'Your profile is ready for personalized job matches and recommendations.'
                : 'Complete these items for better job matches and recommendations.'}
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-accent">{completedCount}/{totalCount}</span>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
        </div>
        {/* Progress bar */}
        <Progress
          value={progressPercent}
          className={cn(
            'h-2 mt-3',
            allComplete ? '[&>div]:bg-accent' : ''
          )}
        />
      </CardHeader>

      {/* Only show checklist items if not all complete */}
      {!allComplete && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {checklistItems.map(function (item) {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    item.isComplete
                      ? 'bg-accent/10'
                      : 'bg-muted/30 hover:bg-muted/50'
                  )}
                >
                  {/* Status icon */}
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    item.isComplete
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  )}>
                    {item.isComplete ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Item icon and text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <IconComponent className={cn(
                        'w-4 h-4 flex-shrink-0',
                        item.isComplete ? 'text-accent' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        item.isComplete ? 'text-muted-foreground line-through' : 'text-foreground'
                      )}>
                        {item.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                      {item.description}
                    </p>
                  </div>

                  {/* CTA button for incomplete items */}
                  {!item.isComplete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs flex-shrink-0"
                      onClick={function () {
                        scrollToSection(item.sectionId);
                      }}
                    >
                      Set up
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
