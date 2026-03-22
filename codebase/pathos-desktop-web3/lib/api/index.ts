// API module index
// Re-exports all API functions and types for convenient imports

export { mockGet, mockPost } from './client';

export {
  fetchProfile,
  fetchDefaultProfile,
  fetchJobSeekerProfile,
  fetchEmployeeProfile,
  updateProfile,
  fetchUser,
  fetchEmployeeUser,
  fetchJobSeekerUser,
} from './profile';

export {
  fetchJobs,
  fetchJobSearchResults,
  fetchRecommendedRoles,
  fetchJobAlerts,
  fetchJobById,
} from './job-search';

export {
  fetchRetirementSnapshot,
  fetchJobSeekerRetirementSnapshot,
  fetchCompensationData,
  fetchEmployeeCompensation,
  fetchJobSeekerCompensation,
  fetchLeaveData,
  fetchJobSeekerLeaveData,
  fetchFehbData,
  fetchTaxData,
  fetchPcsData,
  fetchJobSeekerPcsData,
  fetchAllDashboardData,
} from './retirement';

export {
  fetchAdvisorInsights,
  buildAdvisorRequest,
  PathAdvisorError,
} from './pathadvisor-client';

// Re-export types from all modules
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
} from './profile';

export type {
  JobResult,
  RecommendedRole,
  JobAlerts,
  JobAlertSummaryItem,
} from './job-search';

export type {
  CompensationData,
  RetirementData,
  LeaveData,
  FehbData,
  TaxData,
  PcsData,
  DashboardData,
} from './retirement';

// Re-export PathAdvisor types
export type {
  PathAdvisorRequest,
  PathAdvisorResponse,
  PathAdvisorUserProfile,
  PathScenario,
  SalaryProjectionResult,
  RetirementImpactResult,
  RelocationInsights,
  PathAdvisorInsightsState,
} from '@/types/pathadvisor';
