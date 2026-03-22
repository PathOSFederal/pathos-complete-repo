'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
export type PersonaType = 'job_seeker' | 'federal_employee';
export type EducationLevel =
  | 'high_school'
  | 'associate'
  | 'bachelor'
  | 'master'
  | 'doctorate'
  | 'other';
export type GoalTimeHorizon = '6_12_months' | '1_3_years' | '3_5_years_plus';
export type RelocationWillingness =
  | 'stay_local'
  | 'nearby_regions'
  | 'open_conus'
  | 'open_conus_oconus';
export type WorkArrangement = 'on_site' | 'hybrid' | 'remote_okay';
export type AdvisorTone = 'straight_to_point' | 'more_context';
export type GradeBandKey = 'entry' | 'early' | 'mid' | 'senior' | 'unsure' | 'custom';
export type PathAdvisorDock = 'left' | 'right' | 'bottom';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface CurrentEmployeeDetails {
  agency: string;
  series: string;
  grade: string;
  step: string;
  dutyLocation: string;
}

export interface JobSeekerDetails {
  highestEducation: EducationLevel;
  yearsOfExperience: number;
}

export interface CareerGoals {
  targetSeries: string[];
  targetGradeFrom: string | null;
  targetGradeTo: string | null;
  goalTimeHorizon: GoalTimeHorizon;
  nextCareerMove: string;
  gradeBand: GradeBandKey;
}

export interface LocationPreferences {
  currentMetroArea: string;
  relocationWillingness: RelocationWillingness;
  preferredLocations: string[];
  workArrangement: WorkArrangement;
}

export interface BenefitsPreferences {
  householdCoverage: 'self_only' | 'self_plus_one' | 'family';
  targetTspContribution: number;
  riskComfort: number; // 1-5 scale
}

export interface UserPreferencesProfile {
  priorities: string[];
  advisorTone: AdvisorTone;
  globalPrivacyDefault: boolean;
  pathAdvisorDock?: PathAdvisorDock;
  theme?: ThemePreference;
}

export interface Profile {
  name: string;
  persona: PersonaType;
  isComplete: boolean;
  avatarUrl?: string | null;
  current: CurrentEmployeeDetails | null;
  jobSeeker: JobSeekerDetails | null;
  goals: CareerGoals;
  location: LocationPreferences;
  benefits: BenefitsPreferences;
  preferences: UserPreferencesProfile;
}

interface ProfileContextType {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  updateCurrent: (updates: Partial<CurrentEmployeeDetails>) => void;
  updateJobSeeker: (updates: Partial<JobSeekerDetails>) => void;
  updateGoals: (updates: Partial<CareerGoals>) => void;
  updateLocation: (updates: Partial<LocationPreferences>) => void;
  updateBenefits: (updates: Partial<BenefitsPreferences>) => void;
  updatePreferences: (updates: Partial<UserPreferencesProfile>) => void;
  markProfileComplete: () => void;
  resetProfile: () => void;
  isOnboardingComplete: boolean;
  setOnboardingComplete: (value: boolean) => void;
  setAvatarUrl: (url: string | null) => void;
  clearAvatar: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = 'pathos-user-profile';

const defaultProfile: Profile = {
  name: '',
  persona: 'job_seeker',
  isComplete: false,
  avatarUrl: null,
  current: null,
  jobSeeker: {
    highestEducation: 'bachelor',
    yearsOfExperience: 0,
  },
  goals: {
    targetSeries: [],
    targetGradeFrom: 'GS-9',
    targetGradeTo: 'GS-11',
    goalTimeHorizon: '1_3_years',
    nextCareerMove: '',
    gradeBand: 'early',
  },
  location: {
    currentMetroArea: '',
    relocationWillingness: 'stay_local',
    preferredLocations: [],
    workArrangement: 'hybrid',
  },
  benefits: {
    householdCoverage: 'self_only',
    targetTspContribution: 5,
    riskComfort: 3,
  },
  preferences: {
    priorities: [],
    advisorTone: 'more_context',
    globalPrivacyDefault: false,
    pathAdvisorDock: 'right',
    theme: 'system',
  },
};

const demoJobSeekerProfile: Profile = {
  name: 'Alex Chen',
  persona: 'job_seeker',
  isComplete: true,
  avatarUrl: null,
  current: null,
  jobSeeker: {
    highestEducation: 'bachelor',
    yearsOfExperience: 3,
  },
  goals: {
    targetSeries: ['IT Specialist (2210)', 'Program Analyst (0343)'],
    targetGradeFrom: 'GS-7',
    targetGradeTo: 'GS-9',
    goalTimeHorizon: '1_3_years',
    nextCareerMove:
      'I want to transition from private sector IT into a federal IT Specialist role.',
    gradeBand: 'early',
  },
  location: {
    currentMetroArea: 'Washington, DC Metro',
    relocationWillingness: 'nearby_regions',
    preferredLocations: ['Washington, DC', 'Baltimore, MD', 'Northern Virginia'],
    workArrangement: 'hybrid',
  },
  benefits: {
    householdCoverage: 'self_only',
    targetTspContribution: 5,
    riskComfort: 3,
  },
  preferences: {
    priorities: ['Higher pay', 'Work-life balance', 'Remote / hybrid'],
    advisorTone: 'more_context',
    globalPrivacyDefault: false,
    pathAdvisorDock: 'right',
    theme: 'system',
  },
};

/**
 * Helper: Load and compute initial profile state from localStorage.
 *
 * WHY THIS EXISTS:
 * We use lazy initializers to avoid setState in useEffect.
 * This function is called during the first render to compute initial state.
 */
function loadInitialProfileState(): {
  profile: Profile;
  isOnboardingComplete: boolean;
} {
  // SSR guard: return defaults during server-side rendering
  if (typeof window === 'undefined') {
    return {
      profile: demoJobSeekerProfile,
      isOnboardingComplete: true,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = { ...defaultProfile, ...parsed };

      // Validate theme preference
      const prefTheme = merged.preferences && merged.preferences.theme;
      if (prefTheme !== 'system' && prefTheme !== 'light' && prefTheme !== 'dark') {
        merged.preferences = Object.assign({}, merged.preferences, { theme: 'system' });
      }

      // -----------------------------------------------------------------------
      // Normalize pathAdvisorDock preference
      // -----------------------------------------------------------------------
      // WHY: The 'bottom' dock position was removed in Day 17 because it was
      // not well-supported in the layout. Any prior 'bottom' preference saved
      // in localStorage is auto-normalized to 'right' (the default position).
      // This prevents layout bugs for users who had 'bottom' selected.
      // -----------------------------------------------------------------------
      const prefDock = merged.preferences && merged.preferences.pathAdvisorDock;
      if (prefDock !== 'left' && prefDock !== 'right') {
        // 'bottom', undefined, or any invalid value → default to 'right'
        merged.preferences = Object.assign({}, merged.preferences, { pathAdvisorDock: 'right' });
      }

      // Determine onboarding status
      let onboardingComplete = false;
      if (parsed.isComplete !== undefined && parsed.isComplete !== null) {
        onboardingComplete = parsed.isComplete;
      }

      return {
        profile: merged,
        isOnboardingComplete: onboardingComplete,
      };
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
  }

  // No stored profile: use demo profile
  return {
    profile: demoJobSeekerProfile,
    isOnboardingComplete: true,
  };
}

/**
 * ProfileProvider component
 *
 * WHY THIS EXISTS:
 * Provides user profile context to the app including career details, goals, and preferences.
 *
 * HOW IT WORKS:
 * 1. Uses lazy initializers to load from localStorage on first render (no setState in effect)
 * 2. Uses effect only for WRITING to localStorage (external system sync)
 * 3. Provides callbacks for updating profile sections
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  /**
   * Lazy initializer: compute initial profile state from localStorage synchronously.
   * This avoids the need for useEffect that calls setState.
   */
  const [initialState] = useState(loadInitialProfileState);

  const [profile, setProfile] = useState<Profile>(initialState.profile);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(initialState.isOnboardingComplete);

  /**
   * Track whether initial hydration is complete.
   * If we're in the browser, we're loaded (data was read in lazy initializer).
   * Note: setIsLoaded not needed since we initialize based on window existence.
   */
  const [isLoaded] = useState(function getInitialIsLoaded() {
    return typeof window !== 'undefined';
  });

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch (error) {
        console.error('Failed to save profile:', error);
      }
    }
  }, [profile, isLoaded]);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateCurrent = useCallback((updates: Partial<CurrentEmployeeDetails>) => {
    setProfile((prev) => ({
      ...prev,
      current: prev.current
        ? { ...prev.current, ...updates }
        : { agency: '', series: '', grade: '', step: '', dutyLocation: '', ...updates },
    }));
  }, []);

  const updateJobSeeker = useCallback((updates: Partial<JobSeekerDetails>) => {
    setProfile((prev) => ({
      ...prev,
      jobSeeker: prev.jobSeeker
        ? { ...prev.jobSeeker, ...updates }
        : { highestEducation: 'bachelor', yearsOfExperience: 0, ...updates },
    }));
  }, []);

  const updateGoals = useCallback((updates: Partial<CareerGoals>) => {
    setProfile((prev) => ({
      ...prev,
      goals: { ...prev.goals, ...updates },
    }));
  }, []);

  const updateLocation = useCallback((updates: Partial<LocationPreferences>) => {
    setProfile((prev) => ({
      ...prev,
      location: { ...prev.location, ...updates },
    }));
  }, []);

  const updateBenefits = useCallback((updates: Partial<BenefitsPreferences>) => {
    setProfile((prev) => ({
      ...prev,
      benefits: { ...prev.benefits, ...updates },
    }));
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferencesProfile>) => {
    setProfile((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates },
    }));
  }, []);

  const markProfileComplete = useCallback(() => {
    setProfile((prev) => ({ ...prev, isComplete: true }));
    setIsOnboardingComplete(true);
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(defaultProfile);
    setIsOnboardingComplete(false);
  }, []);

  const setOnboardingComplete = useCallback((value: boolean) => {
    setIsOnboardingComplete(value);
  }, []);

  const setAvatarUrl = useCallback((url: string | null) => {
    setProfile((prev) => ({ ...prev, avatarUrl: url }));
  }, []);

  const clearAvatar = useCallback(() => {
    setProfile((prev) => ({ ...prev, avatarUrl: null }));
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        updateProfile,
        updateCurrent,
        updateJobSeeker,
        updateGoals,
        updateLocation,
        updateBenefits,
        updatePreferences,
        markProfileComplete,
        resetProfile,
        isOnboardingComplete,
        setOnboardingComplete,
        setAvatarUrl,
        clearAvatar,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
}
