/**
 * ============================================================================
 * CENTRALIZED STORAGE KEYS (Day 22 Update)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Defines all localStorage key names used by PathOS Tier 1 in one place.
 * This ensures consistency and prevents key name drift across the codebase.
 *
 * USAGE:
 * Import keys from this file rather than hardcoding strings.
 * For SSR-safe access, use helpers from lib/storage.ts.
 *
 * @version Day 22 - Added DOCUMENT_IMPORT_STORAGE_KEY
 * ============================================================================
 */

export const PROFILE_STORAGE_KEY = 'pathos-user-profile';
export const JOB_SEARCH_STORAGE_KEY = 'pathos-job-search-preferences';
export const RESUME_BUILDER_STORAGE_KEY = 'pathos-resume-builder-v1';

/**
 * Storage key for saved jobs collection.
 * Day 15: Used by savedJobsStore to persist user's saved jobs.
 */
export const SAVED_JOBS_STORAGE_KEY = 'pathos-saved-jobs';

/**
 * Storage key for benefits assumptions.
 * Day 16: Used by benefitsAssumptionsStore to persist user's benefit calculation inputs.
 */
export const BENEFITS_ASSUMPTIONS_STORAGE_KEY = 'pathos-benefits-assumptions';

/**
 * Storage key for job alerts.
 * Day 19: Used by jobAlertsStore to persist user's job alerts configuration.
 */
export const JOB_ALERTS_STORAGE_KEY = 'pathos-job-alerts';

/**
 * Storage key for email digest settings.
 * Day 20: Used by jobAlertsStore to persist email digest preferences.
 */
export const EMAIL_DIGEST_STORAGE_KEY = 'pathos-email-digest-settings';

/**
 * Storage key for alert event log.
 * Day 20: Used by jobAlertsStore to persist alert event history.
 */
export const ALERT_EVENTS_STORAGE_KEY = 'pathos-alert-events';

/**
 * Storage key for seen job IDs per alert rule.
 * Day 20: Tracks which jobs have been "seen" for each alert rule to identify new matches.
 */
export const ALERT_SEEN_JOBS_STORAGE_KEY = 'pathos-alert-seen-jobs';

/**
 * Storage key for email ingestion inbox.
 * Day 21: Used by emailIngestionStore to persist ingested emails locally.
 */
export const EMAIL_INGESTION_STORAGE_KEY = 'pathos.emailIngestion.v1';

/**
 * Storage key for document import metadata.
 * Day 22: Used by documentImportStore to persist imported document metadata.
 * Note: File blobs are stored in IndexedDB (pathos-documents-db), not localStorage.
 */
export const DOCUMENT_IMPORT_STORAGE_KEY = 'pathos.documentImport.v1';

/**
 * Storage key for tasks.
 * Day 27: Used by taskStore to persist tasks created from import items.
 */
export const TASKS_STORAGE_KEY = 'pathos.tasks.v1';

/**
 * Storage key for audit log.
 * Day 27: Used by auditLogStore to persist append-only audit events.
 */
export const AUDIT_LOG_STORAGE_KEY = 'pathos.auditLog.v1';

/**
 * Storage key for onboarding state.
 * Day 36: Used by onboardingStore to persist onboarding mode state and progress.
 */
export const ONBOARDING_STORAGE_KEY = 'pathos-onboarding-state';

/**
 * Storage key for guided tour state.
 * Day 36: Used by guidedTourStore to persist guided tour completion status.
 */
export const GUIDED_TOUR_STORAGE_KEY = 'pathos-guided-tour-state';

/**
 * Storage key for benefits workspace.
 * Day 42: Used by benefitsWorkspaceStore to persist benefits comparison scenarios.
 */
export const BENEFITS_WORKSPACE_STORAGE_KEY = 'pathos-benefits-workspace-v1';

/**
 * Storage key for Guided USAJOBS goals.
 * Day 44: Used by guidedUsaJobsStore to persist local-only goal context.
 */
export const GUIDED_USAJOBS_GOALS_STORAGE_KEY = 'pathos-guided-usajobs-goals-v1';

/**
 * ============================================================================
 * STORAGE_KEYS OBJECT (Day 23)
 * ============================================================================
 *
 * PURPOSE:
 * Aggregated object of all storage keys for auto-generation scripts.
 * Used by scripts/generate-owner-map.mjs to list all localStorage keys.
 *
 * NOTE:
 * When adding a new storage key constant above, also add it here.
 * ============================================================================
 */
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
} as const;
