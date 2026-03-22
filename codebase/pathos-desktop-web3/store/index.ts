// Export all stores from a single entry point

export {
  useJobSearchStore,
  selectJobs,
  selectRecommendedRoles,
  selectJobSearchFilters,
  selectSavedJobSearches,
  selectActiveSavedSearchId,
  selectSeriesGuideOpen,
  selectJobAlerts,
  selectIsLoaded as selectJobSearchIsLoaded,
  selectIsJobSearchLoading,
} from './jobSearchStore';

export type {
  JobSearchStore,
  JobSearchFilters,
  SavedJobSearch,
  JobAlertConfig,
  JobResult,
  RecommendedRole,
  JobAlerts,
  JobAlertSummaryItem,
  AppointmentType,
  WorkSchedule,
  PromotionPotentialFilter,
  SupervisoryStatus,
  TeleworkPreference,
  TravelFrequency,
  ClearanceLevel,
  PositionSensitivity,
  HiringPath,
  InternalExternal,
  QualificationEmphasis,
  TrajectoryPreference,
  RetirementImpactPreference,
  CompensationFocus,
} from './jobSearchStore';

export {
  useProfileStore,
  selectProfile,
  selectIsOnboardingComplete,
  selectIsLoaded as selectProfileIsLoaded,
  selectUser,
  selectPersona,
  selectProfileName,
  selectGoals,
  selectLocationPrefs,
  selectBenefitsPrefs,
  selectUserPreferences,
  selectPathAdvisorDock,
  selectTheme,
} from './profileStore';

export type {
  ProfileStore,
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
} from './profileStore';

export {
  useUserPreferencesStore,
  selectHasAcceptedGlobalDisclaimer,
  selectHasSeenRetirementDisclaimer,
  selectHasSeenFehbDisclaimer,
  selectIsLoaded as selectPreferencesIsLoaded,
  selectIsSensitiveHidden,
  selectGlobalHide,
} from './userPreferencesStore';

export type { UserPreferencesStore } from './userPreferencesStore';

export {
  useResumeBuilderStore,
  selectResumeData,
  selectCurrentStep,
  selectSectionVisibility,
  selectActiveTargetJob,
  selectSavedTargetJobs,
  selectIsTailoringMode,
} from './resumeBuilderStore';

export type {
  ResumeBuilderStore,
  ResumeData,
  ResumeProfile,
  TargetRole,
  WorkExperience,
  Education,
  Skills,
  TargetJob,
} from './resumeBuilderStore';

// AdvisorContextData is now exported from advisor-context
export type { AdvisorContextData } from '@/contexts/advisor-context';

export {
  useDashboardStore,
  selectCompensation,
  selectRetirement,
  selectLeave,
  selectFehb,
  selectTax,
  selectPcs,
  selectIsLoading,
  selectLastUpdated,
  selectTotalCompensation,
  selectBasePay,
  selectTspBalance,
  selectAnnualLeaveBalance,
  selectSickLeaveBalance,
} from './dashboardStore';

export type {
  DashboardStore,
  CompensationData,
  RetirementData,
  LeaveData,
  FehbData,
  TaxData,
  PcsData,
} from './dashboardStore';

export {
  useJobAlertsStore,
  selectAlerts,
  selectAlertsCount,
  selectEnabledAlertsCount,
  selectTotalMatches,
  selectIsLoaded as selectAlertsIsLoaded,
  // Day 20 exports
  selectEmailDigest,
  selectEvents,
  selectTotalNewMatches,
  DEFAULT_EMAIL_DIGEST_SETTINGS,
  MAX_EVENT_LOG_SIZE,
} from './jobAlertsStore';

export type {
  JobAlertsStore,
  JobAlert,
  JobAlertDraft,
  JobAlertPatch,
  MatchableJob,
  // Day 20 types
  EmailDigestSettings,
  AlertEvent,
  AlertEventType,
} from './jobAlertsStore';

// Day 21: Email Ingestion Store (Email Import Inbox)
export {
  useEmailIngestionStore,
  selectEmails,
  selectEmailsCount,
  selectIsLoaded as selectEmailIngestionIsLoaded,
} from './emailIngestionStore';

export type {
  EmailIngestionStore,
  EmailIngestedItem,
  EmailSourceType,
} from './emailIngestionStore';

// Day 22: Document Import Store (Universal Document Import)
// Day 23: Extended with triage, search, and workflow linking
// Day 24: Extended with signal extraction and import actions
export {
  useDocumentImportStore,
  selectDocuments,
  selectDocumentsCount,
  selectDocumentImportIsLoaded,
  // Day 22 Run 2: Export helper function and constants for file type validation
  getDocumentType,
  SUPPORTED_FILE_MIME_TYPES,
  SUPPORTED_FILE_EXTENSIONS,
  // Day 23: Export status constants
  ALL_IMPORT_STATUSES,
  IMPORT_STATUS_LABELS,
  IMPORT_STATUS_COLORS,
  // Day 24: Export action constants
  ALL_IMPORT_ACTION_TYPES,
  ALL_IMPORT_ACTION_STATUSES,
  IMPORT_ACTION_TYPE_LABELS,
  IMPORT_ACTION_STATUS_LABELS,
  IMPORT_ACTION_STATUS_COLORS,
} from './documentImportStore';

export type {
  DocumentImportStore,
  ImportedDocument,
  DocumentType,
  // Day 23: Export triage and linking types
  ImportStatus,
  LinkableEntityType,
  LinkedEntity,
  // Day 24: Export action types
  ImportActionType,
  ImportActionStatus,
  ImportAction,
} from './documentImportStore';

// Day 27: Task Store (Taskboard + Reminders)
export {
  useTaskStore,
  selectTasks,
  selectTasksCount,
  selectTasksIsLoaded,
  // Task status constants
  ALL_TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  // Task priority constants
  ALL_TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  // Reminder repeat constants
  ALL_REMINDER_REPEATS,
  REMINDER_REPEAT_LABELS,
} from './taskStore';

export type {
  TaskStore,
  Task,
  TaskStatus,
  TaskPriority,
  TaskReminder,
  ReminderRepeat,
  CreateTaskData,
  UpdateTaskData,
  TaskFilter,
} from './taskStore';

// Day 27: Audit Log Store (Audit/Trust UX)
export {
  useAuditLogStore,
  selectAuditEvents,
  selectAuditEventsCount,
  selectAuditLogIsLoaded,
  // Audit event type constants
  ALL_AUDIT_EVENT_TYPES,
  AUDIT_EVENT_TYPE_LABELS,
  AUDIT_EVENT_TYPE_COLORS,
} from './auditLogStore';

export type {
  AuditLogStore,
  AuditEvent,
  AuditEventType,
  AuditEventSource,
  CreateAuditEventData,
  AuditEventFilter,
} from './auditLogStore';

