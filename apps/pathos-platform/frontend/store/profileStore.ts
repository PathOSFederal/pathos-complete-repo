import { create } from 'zustand';
import {
  defaultProfile,
  demoJobSeekerProfile,
  // demoEmployeeProfile removed - unused (lint warning fix)
  defaultEmployeeUser,
  defaultJobSeekerUser,
  type Profile,
  type PersonaType,
  type CurrentEmployeeDetails,
  type JobSeekerDetails,
  type CareerGoals,
  type LocationPreferences,
  type BenefitsPreferences,
  type UserPreferencesProfile,
  type User,
  type EducationLevel,
  type GoalTimeHorizon,
  type RelocationWillingness,
  type WorkArrangement,
  type AdvisorTone,
  type GradeBandKey,
  type PathAdvisorDock,
  type ThemePreference,
} from '@/lib/api/profile';
import { PROFILE_STORAGE_KEY } from '@/lib/storage-keys';

// Helper to merge objects without spread operator
function mergeObject<T extends object>(base: T, updates: Partial<T>): T {
  const result = Object.assign({}, base);
  const keys = Object.keys(updates) as Array<keyof T>;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (updates[key] !== undefined) {
      (result as Record<string, unknown>)[key as string] = updates[key];
    }
  }
  return result;
}

// Store interface
interface ProfileState {
  profile: Profile;
  isLoaded: boolean;
  isOnboardingComplete: boolean;

  // Persona state (merged from persona-context)
  user: User;
}

interface ProfileActions {
  // Profile actions
  updateProfile: (updates: Partial<Profile>) => void;
  updateCurrent: (updates: Partial<CurrentEmployeeDetails>) => void;
  updateJobSeeker: (updates: Partial<JobSeekerDetails>) => void;
  updateGoals: (updates: Partial<CareerGoals>) => void;
  updateLocation: (updates: Partial<LocationPreferences>) => void;
  updateBenefits: (updates: Partial<BenefitsPreferences>) => void;
  updatePreferences: (updates: Partial<UserPreferencesProfile>) => void;
  markProfileComplete: () => void;
  resetProfile: () => void;
  setOnboardingComplete: (value: boolean) => void;
  setAvatarUrl: (url: string | null) => void;
  clearAvatar: () => void;

  // Persona actions
  setUser: (user: User) => void;
  toggleUserType: () => void;

  // Storage actions
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export type ProfileStore = ProfileState & ProfileActions;

// Selectors
export const selectProfile = function (state: ProfileStore): Profile {
  return state.profile;
};

export const selectIsOnboardingComplete = function (state: ProfileStore): boolean {
  return state.isOnboardingComplete;
};

export const selectIsLoaded = function (state: ProfileStore): boolean {
  return state.isLoaded;
};

export const selectUser = function (state: ProfileStore): User {
  return state.user;
};

export const selectPersona = function (state: ProfileStore): PersonaType {
  return state.profile.persona;
};

export const selectProfileName = function (state: ProfileStore): string {
  return state.profile.name;
};

export const selectGoals = function (state: ProfileStore): CareerGoals {
  return state.profile.goals;
};

export const selectLocationPrefs = function (state: ProfileStore): LocationPreferences {
  return state.profile.location;
};

export const selectBenefitsPrefs = function (state: ProfileStore): BenefitsPreferences {
  return state.profile.benefits;
};

export const selectUserPreferences = function (state: ProfileStore): UserPreferencesProfile {
  return state.profile.preferences;
};

export const selectPathAdvisorDock = function (state: ProfileStore): PathAdvisorDock {
  const dock = state.profile.preferences.pathAdvisorDock;
  if (dock) {
    return dock;
  }
  return 'right';
};

export const selectTheme = function (state: ProfileStore): ThemePreference {
  const theme = state.profile.preferences.theme;
  if (theme) {
    return theme;
  }
  return 'system';
};

// Create the store
export const useProfileStore = create<ProfileStore>(function (set, get) {
  return {
    // Initial state - both profile and user should represent the same persona
    profile: Object.assign({}, demoJobSeekerProfile),
    isLoaded: false,
    isOnboardingComplete: true,
    user: Object.assign({}, defaultJobSeekerUser),

    // Profile actions
    updateProfile: function (updates) {
      const state = get();
      set({ profile: mergeObject(state.profile, updates) });
      get().saveToStorage();
    },

    updateCurrent: function (updates) {
      const state = get();
      let currentDetails: CurrentEmployeeDetails;

      if (state.profile.current) {
        currentDetails = mergeObject(state.profile.current, updates);
      } else {
        currentDetails = Object.assign(
          { agency: '', series: '', grade: '', step: '', dutyLocation: '' },
          updates,
        );
      }

      set({
        profile: Object.assign({}, state.profile, { current: currentDetails }),
      });
      get().saveToStorage();
    },

    updateJobSeeker: function (updates) {
      const state = get();
      let jobSeekerDetails: JobSeekerDetails;

      if (state.profile.jobSeeker) {
        jobSeekerDetails = mergeObject(state.profile.jobSeeker, updates);
      } else {
        jobSeekerDetails = Object.assign(
          { highestEducation: 'bachelor' as EducationLevel, yearsOfExperience: 0 },
          updates,
        );
      }

      set({
        profile: Object.assign({}, state.profile, { jobSeeker: jobSeekerDetails }),
      });
      get().saveToStorage();
    },

    updateGoals: function (updates) {
      const state = get();
      set({
        profile: Object.assign({}, state.profile, {
          goals: mergeObject(state.profile.goals, updates),
        }),
      });
      get().saveToStorage();
    },

    updateLocation: function (updates) {
      const state = get();
      set({
        profile: Object.assign({}, state.profile, {
          location: mergeObject(state.profile.location, updates),
        }),
      });
      get().saveToStorage();
    },

    updateBenefits: function (updates) {
      const state = get();
      set({
        profile: Object.assign({}, state.profile, {
          benefits: mergeObject(state.profile.benefits, updates),
        }),
      });
      get().saveToStorage();
    },

    updatePreferences: function (updates) {
      const state = get();
      set({
        profile: Object.assign({}, state.profile, {
          preferences: mergeObject(state.profile.preferences, updates),
        }),
      });
      get().saveToStorage();
    },

    markProfileComplete: function () {
      // Delegate to setOnboardingComplete to avoid divergent code paths
      get().setOnboardingComplete(true);
    },

    resetProfile: function () {
      // Reset profile to default template
      const resetProfileData = Object.assign({}, defaultProfile);

      // Determine user based on default profile persona
      let resetUser: User;
      if (resetProfileData.persona === 'federal_employee') {
        resetUser = Object.assign({}, defaultEmployeeUser);
      } else {
        resetUser = Object.assign({}, defaultJobSeekerUser);
      }

      set({
        profile: resetProfileData,
        user: resetUser,
        isOnboardingComplete: false,
        isLoaded: true,
      });
      get().saveToStorage();
    },

    setOnboardingComplete: function (value) {
      const state = get();
      // Update both the store flag and profile.isComplete to stay in sync
      set({
        profile: Object.assign({}, state.profile, { isComplete: value }),
        isOnboardingComplete: value,
      });
      get().saveToStorage();
    },

    setAvatarUrl: function (url) {
      const state = get();
      set({
        profile: Object.assign({}, state.profile, { avatarUrl: url }),
      });
      get().saveToStorage();
    },

    clearAvatar: function () {
      const state = get();
      set({
        profile: Object.assign({}, state.profile, { avatarUrl: null }),
      });
      get().saveToStorage();
    },

    // Persona actions
    setUser: function (user) {
      set({ user: Object.assign({}, user) });
    },

    toggleUserType: function () {
      const state = get();
      if (state.user.currentEmployee) {
        set({ user: Object.assign({}, defaultJobSeekerUser) });
      } else {
        set({ user: Object.assign({}, defaultEmployeeUser) });
      }
    },

    // Storage actions (SSR-safe)
    loadFromStorage: function () {
      // Guard against SSR - localStorage is not available on the server
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const merged = mergeObject(Object.assign({}, defaultProfile), parsed);

          // Validate theme preference
          const prefTheme = merged.preferences ? merged.preferences.theme : undefined;
          if (prefTheme !== 'system' && prefTheme !== 'light' && prefTheme !== 'dark') {
            merged.preferences = Object.assign({}, merged.preferences, { theme: 'system' as ThemePreference });
          }

          set({
            profile: merged,
            isOnboardingComplete: parsed.isComplete === true,
            isLoaded: true,
          });

          // Update user based on profile persona
          if (merged.persona === 'federal_employee') {
            set({ user: Object.assign({}, defaultEmployeeUser, { name: merged.name }) });
          } else {
            set({ user: Object.assign({}, defaultJobSeekerUser, { name: merged.name }) });
          }
        } else {
          // No stored data - use demo job seeker profile with matching user
          set({
            profile: Object.assign({}, demoJobSeekerProfile),
            user: Object.assign({}, defaultJobSeekerUser),
            isOnboardingComplete: true,
            isLoaded: true,
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        set({ isLoaded: true });
      }
    },

    saveToStorage: function () {
      // Guard against SSR - localStorage is not available on the server
      if (typeof window === 'undefined') {
        return;
      }

      const state = get();
      if (state.isLoaded) {
        try {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state.profile));
        } catch (error) {
          console.error('Failed to save profile:', error);
        }
      }
    },
  };
});

// Re-export types for convenience
export type {
  Profile,
  PersonaType,
  CurrentEmployeeDetails,
  JobSeekerDetails,
  CareerGoals,
  LocationPreferences,
  BenefitsPreferences,
  UserPreferencesProfile,
  User,
  EducationLevel,
  GoalTimeHorizon,
  RelocationWillingness,
  WorkArrangement,
  AdvisorTone,
  GradeBandKey,
  PathAdvisorDock,
  ThemePreference,
};
