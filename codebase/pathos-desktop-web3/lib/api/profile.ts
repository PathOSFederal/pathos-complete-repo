// Profile API module
// Wraps profile mock data with standardized async access

import { mockGet, mockPost } from './client';
import {
  defaultProfile,
  demoJobSeekerProfile,
  demoEmployeeProfile,
  defaultEmployeeUser,
  defaultJobSeekerUser,
  type Profile,
  type User,
  type PersonaType,
} from '@/lib/mock/profile';

/**
 * Fetches the default profile based on persona type
 */
export function fetchProfile(persona?: PersonaType): Promise<Profile> {
  return mockGet(() => {
    if (persona === 'federal_employee') {
      return { ...demoEmployeeProfile };
    }
    return { ...demoJobSeekerProfile };
  });
}

/**
 * Fetches the default empty profile template
 */
export function fetchDefaultProfile(): Promise<Profile> {
  return mockGet(() => ({ ...defaultProfile }));
}

/**
 * Fetches the demo job seeker profile
 */
export function fetchJobSeekerProfile(): Promise<Profile> {
  return mockGet(() => ({ ...demoJobSeekerProfile }));
}

/**
 * Fetches the demo employee profile
 */
export function fetchEmployeeProfile(): Promise<Profile> {
  return mockGet(() => ({ ...demoEmployeeProfile }));
}

/**
 * Simulates updating a profile and returns the updated version
 */
export function updateProfile(profile: Profile, updates: Partial<Profile>): Promise<Profile> {
  return mockPost(() => ({ ...profile, ...updates }));
}

/**
 * Fetches the default user based on employee status
 */
export function fetchUser(isEmployee: boolean): Promise<User> {
  return mockGet(() => {
    if (isEmployee) {
      return { ...defaultEmployeeUser };
    }
    return { ...defaultJobSeekerUser };
  });
}

/**
 * Fetches the default employee user
 */
export function fetchEmployeeUser(): Promise<User> {
  return mockGet(() => ({ ...defaultEmployeeUser }));
}

/**
 * Fetches the default job seeker user
 */
export function fetchJobSeekerUser(): Promise<User> {
  return mockGet(() => ({ ...defaultJobSeekerUser }));
}

// Re-export types for convenience
export type {
  Profile,
  User,
  PersonaType,
  CurrentEmployeeDetails,
  JobSeekerDetails,
  CareerGoals,
  LocationPreferences,
  BenefitsPreferences,
  UserPreferencesProfile,
  EducationLevel,
  GoalTimeHorizon,
  RelocationWillingness,
  WorkArrangement,
  AdvisorTone,
  GradeBandKey,
  PathAdvisorDock,
  ThemePreference,
} from '@/lib/mock/profile';

// Re-export raw data for stores that need synchronous initial state
export {
  defaultProfile,
  demoJobSeekerProfile,
  demoEmployeeProfile,
  defaultEmployeeUser,
  defaultJobSeekerUser,
} from '@/lib/mock/profile';

