// Mock profile data for Zustand stores

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
  | 'open_conus_oconus'
  | 'no_preference';
export type WorkArrangement = 'on_site' | 'hybrid' | 'remote_okay' | 'no_preference';
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
  riskComfort: number;
}

export interface UserPreferencesProfile {
  priorities: string[];
  advisorTone: AdvisorTone;
  globalPrivacyDefault: boolean;
  pathAdvisorDock: PathAdvisorDock;
  theme: ThemePreference;
}

export interface Profile {
  name: string;
  persona: PersonaType;
  isComplete: boolean;
  avatarUrl: string | null;
  current: CurrentEmployeeDetails | null;
  jobSeeker: JobSeekerDetails | null;
  goals: CareerGoals;
  location: LocationPreferences;
  benefits: BenefitsPreferences;
  preferences: UserPreferencesProfile;
}

export const defaultProfile: Profile = {
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

export const demoJobSeekerProfile: Profile = {
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

export const demoEmployeeProfile: Profile = {
  name: 'Sarah Johnson',
  persona: 'federal_employee',
  isComplete: true,
  avatarUrl: null,
  current: {
    agency: 'USDA',
    series: '2210',
    grade: 'GS-13',
    step: '5',
    dutyLocation: 'Washington, DC',
  },
  jobSeeker: null,
  goals: {
    targetSeries: ['IT Specialist (2210)', 'Supervisory IT Specialist'],
    targetGradeFrom: 'GS-14',
    targetGradeTo: 'GS-15',
    goalTimeHorizon: '1_3_years',
    nextCareerMove: 'I want to move into a supervisory IT role at the GS-14 or GS-15 level.',
    gradeBand: 'custom',
  },
  location: {
    currentMetroArea: 'Washington, DC Metro',
    relocationWillingness: 'stay_local',
    preferredLocations: ['Washington, DC'],
    workArrangement: 'hybrid',
  },
  benefits: {
    householdCoverage: 'family',
    targetTspContribution: 10,
    riskComfort: 2,
  },
  preferences: {
    priorities: ['Higher pay', 'Mission / impact'],
    advisorTone: 'straight_to_point',
    globalPrivacyDefault: true,
    pathAdvisorDock: 'right',
    theme: 'system',
  },
};

// User/Persona types for persona context
export interface User {
  currentEmployee: boolean;
  name: string;
  gradeStep: string;
  agency: string;
  resumeStrength: number;
  targetGrade: string;
  targetLocation: string;
}

export const defaultEmployeeUser: User = {
  currentEmployee: true,
  name: 'Sarah Johnson',
  gradeStep: 'GS-13 Step 5',
  agency: 'USDA',
  resumeStrength: 0,
  targetGrade: '',
  targetLocation: '',
};

export const defaultJobSeekerUser: User = {
  currentEmployee: false,
  name: 'Alex Chen',
  gradeStep: '',
  agency: '',
  resumeStrength: 72,
  targetGrade: 'GS-11/12',
  targetLocation: 'Washington, DC',
};

