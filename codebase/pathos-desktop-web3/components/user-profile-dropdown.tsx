'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, RefreshCw, LogOut, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProfileStore, type GradeBandKey } from '@/store/profileStore';
import { OnboardingWizard } from '@/components/onboarding-wizard';

// Helper to get grade band label
function getGradeBandLabel(band: GradeBandKey): string {
  switch (band) {
    case 'entry':
      return 'GS-5–GS-7';
    case 'early':
      return 'GS-7–GS-9';
    case 'mid':
      return 'GS-9–GS-11';
    case 'senior':
      return 'GS-12–GS-13';
    case 'unsure':
      return 'Exploring levels';
    case 'custom':
      return '';
    default:
      return '';
  }
}

export function UserProfileDropdown() {
  const router = useRouter();
  const profile = useProfileStore(function (state) {
    return state.profile;
  });
  // NOTE: setOnboardingComplete was removed - unused (lint warning fix)
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Compute initials from profile name
  let initials = 'U';
  if (profile.name) {
    initials = profile.name
      .split(' ')
      .map(function (n) {
        return n[0];
      })
      .join('')
      .toUpperCase();
  }

  // Compute summary line based on persona
  const getSummaryLine = function (): string {
    if (profile.persona === 'job_seeker') {
      if (
        profile.goals.gradeBand === 'unsure' ||
        (!profile.goals.targetGradeFrom && !profile.goals.targetGradeTo)
      ) {
        return 'Exploring starting levels';
      }
      const bandLabel = getGradeBandLabel(profile.goals.gradeBand);
      if (bandLabel) {
        return 'Aspiring ' + bandLabel;
      }
      if (profile.goals.targetGradeFrom && profile.goals.targetGradeTo) {
        return 'Aspiring ' + profile.goals.targetGradeFrom + '–' + profile.goals.targetGradeTo;
      }
      return 'Set your target grades';
    } else {
      // Federal employee
      if (profile.goals.targetGradeFrom && profile.goals.targetGradeTo) {
        return profile.goals.targetGradeFrom + ' → ' + profile.goals.targetGradeTo;
      }
      return 'Set promotion target';
    }
  };

  const handleViewProfile = function () {
    router.push('/settings');
  };

  const handleRerunOnboarding = function () {
    setOnboardingOpen(true);
  };

  const handleSignOut = function () {
    // Placeholder for sign out logic
    console.log('Sign out clicked');
  };

  const avatarUrl = profile.avatarUrl || undefined;
  const profileName = profile.name || 'User';
  const summaryLine = getSummaryLine();
  const currentMetroArea = profile.location.currentMetroArea;
  let locationSuffix = '';
  if (currentMetroArea) {
    locationSuffix = ' · ' + currentMetroArea.split(' ')[0];
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full hover:bg-muted/50 p-1 pr-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={avatarUrl}
                alt={profileName}
                className="object-cover"
              />
              <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Header section */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={avatarUrl}
                  alt={profileName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-accent text-accent-foreground font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile.persona === 'job_seeker' ? 'Job Seeker' : 'Federal Employee'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {summaryLine}{locationSuffix}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <DropdownMenuItem onClick={handleViewProfile} className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              View Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRerunOnboarding} className="cursor-pointer">
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-run onboarding wizard
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator />

          <div className="py-1">
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Onboarding wizard modal */}
      <OnboardingWizard open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </>
  );
}
