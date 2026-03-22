/**
 * Centralized localStorage key names for PathOS.
 * This file MUST NOT import from next/* or electron/*.
 */

export const PROFILE_STORAGE_KEY = 'pathos-user-profile';
export const JOB_SEARCH_STORAGE_KEY = 'pathos-job-search-preferences';
export const RESUME_BUILDER_STORAGE_KEY = 'pathos-resume-builder-v1';
export const SAVED_JOBS_STORAGE_KEY = 'pathos-saved-jobs';
export const BENEFITS_ASSUMPTIONS_STORAGE_KEY = 'pathos-benefits-assumptions';
export const JOB_ALERTS_STORAGE_KEY = 'pathos-job-alerts';
export const EMAIL_DIGEST_STORAGE_KEY = 'pathos-email-digest-settings';
export const ALERT_EVENTS_STORAGE_KEY = 'pathos-alert-events';
export const ALERT_SEEN_JOBS_STORAGE_KEY = 'pathos-alert-seen-jobs';
export const EMAIL_INGESTION_STORAGE_KEY = 'pathos.emailIngestion.v1';
export const DOCUMENT_IMPORT_STORAGE_KEY = 'pathos.documentImport.v1';
export const TASKS_STORAGE_KEY = 'pathos.tasks.v1';
export const AUDIT_LOG_STORAGE_KEY = 'pathos.auditLog.v1';
export const ONBOARDING_STORAGE_KEY = 'pathos-onboarding-state';
export const GUIDED_TOUR_STORAGE_KEY = 'pathos-guided-tour-state';
export const BENEFITS_WORKSPACE_STORAGE_KEY = 'pathos-benefits-workspace-v1';
export const GUIDED_USAJOBS_GOALS_STORAGE_KEY = 'pathos-guided-usajobs-goals-v1';
export const THEME_VARIANT_STORAGE_KEY = 'pathos.themeVariant';

export const STORAGE_KEYS = {
  PROFILE: PROFILE_STORAGE_KEY,
  JOB_SEARCH: JOB_SEARCH_STORAGE_KEY,
  RESUME_BUILDER: RESUME_BUILDER_STORAGE_KEY,
  SAVED_JOBS: SAVED_JOBS_STORAGE_KEY,
  BENEFITS_ASSUMPTIONS: BENEFITS_ASSUMPTIONS_STORAGE_KEY,
  JOB_ALERTS: JOB_ALERTS_STORAGE_KEY,
  EMAIL_DIGEST: EMAIL_DIGEST_STORAGE_KEY,
  ALERT_EVENTS: ALERT_EVENTS_STORAGE_KEY,
  ALERT_SEEN_JOBS: ALERT_SEEN_JOBS_STORAGE_KEY,
  EMAIL_INGESTION: EMAIL_INGESTION_STORAGE_KEY,
  DOCUMENT_IMPORT: DOCUMENT_IMPORT_STORAGE_KEY,
  TASKS: TASKS_STORAGE_KEY,
  AUDIT_LOG: AUDIT_LOG_STORAGE_KEY,
  ONBOARDING: ONBOARDING_STORAGE_KEY,
  GUIDED_TOUR: GUIDED_TOUR_STORAGE_KEY,
  BENEFITS_WORKSPACE: BENEFITS_WORKSPACE_STORAGE_KEY,
  GUIDED_USAJOBS_GOALS: GUIDED_USAJOBS_GOALS_STORAGE_KEY,
  THEME_VARIANT: THEME_VARIANT_STORAGE_KEY,
} as const;
