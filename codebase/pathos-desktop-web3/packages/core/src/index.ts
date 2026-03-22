/**
 * @pathos/core — Shared types, utilities, and storage keys.
 *
 * BOUNDARY RULE: This package MUST NOT import from next/* or electron/*.
 * Run `pnpm check:boundaries` to verify.
 */

// Utilities
export { cn } from './utils';

// Storage helpers
export {
  isBrowser,
  storageGet,
  storageSet,
  storageRemove,
  storageGetJSON,
  storageSetJSON,
} from './storage';

// Storage keys
export {
  PROFILE_STORAGE_KEY,
  JOB_SEARCH_STORAGE_KEY,
  RESUME_BUILDER_STORAGE_KEY,
  SAVED_JOBS_STORAGE_KEY,
  BENEFITS_ASSUMPTIONS_STORAGE_KEY,
  JOB_ALERTS_STORAGE_KEY,
  EMAIL_DIGEST_STORAGE_KEY,
  ALERT_EVENTS_STORAGE_KEY,
  ALERT_SEEN_JOBS_STORAGE_KEY,
  EMAIL_INGESTION_STORAGE_KEY,
  DOCUMENT_IMPORT_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  AUDIT_LOG_STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
  GUIDED_TOUR_STORAGE_KEY,
  BENEFITS_WORKSPACE_STORAGE_KEY,
  GUIDED_USAJOBS_GOALS_STORAGE_KEY,
  THEME_VARIANT_STORAGE_KEY,
  STORAGE_KEYS,
} from './storage-keys';

// Theme variant helpers
export type { ThemeVariant } from './theme-variant';
export {
  DEFAULT_THEME_VARIANT,
  THEME_VARIANTS,
  THEME_VARIANT_CHANGED_EVENT,
  isThemeVariant,
  parseThemeVariant,
  loadThemeVariantPreference,
  saveThemeVariantPreference,
  clearThemeVariantPreference,
  resolveThemeVariant,
} from './theme-variant';

// Guided Apply types
export type {
  ChecklistStepId,
  ChecklistStep,
  NoteCardId,
  NoteCard,
  GuidedApplySession,
  GuidedApplyStore,
} from './guided-apply-types';
export {
  createDefaultChecklist,
  createDefaultNotes,
  GUIDED_APPLY_SCHEMA_VERSION,
} from './guided-apply-types';

// Guided Apply storage helpers
export {
  GUIDED_APPLY_STORAGE_KEY,
  loadGuidedApplyStore,
  saveGuidedApplyStore,
  createSession,
  addSession,
  getSessionById,
  updateSession,
  toggleChecklistStep,
  updateNoteContent,
  toggleNoteVisibility,
  deleteSession,
  exportGuidedApplyJSON,
  clearGuidedApplyData,
} from './guided-apply-storage';

// Job types
export type { Job, JobSearchStore } from './job-types';
export { JOB_SEARCH_SCHEMA_VERSION, createMockJobs } from './job-types';

// Job storage helpers
export {
  JOB_SEARCH_STORE_KEY,
  loadJobSearchStore,
  saveJobSearchStore,
  loadMockResultsIfEmpty,
  ensureValidSelection,
  selectJob,
  getSelectedJob,
  saveJob,
  removeJob,
  isJobSaved,
  updateSearchQuery,
  exportJobSearchJSON,
  clearJobSearchData,
} from './job-storage';

// Saved Jobs types
export type { SavedJobsStore } from './saved-jobs-types';
export { SAVED_JOBS_SCHEMA_VERSION } from './saved-jobs-types';

// Saved Jobs storage helpers
export {
  SAVED_JOBS_STORE_KEY,
  loadSavedJobsStore,
  saveSavedJobsStore,
  addSavedJob,
  addSavedJobDirect,
  removeSavedJob,
  toggleSavedJob,
  isJobInSaved,
  selectSavedJob,
  getSelectedSavedJob,
  listSavedJobs,
  clearSavedJobs,
  exportSavedJobsJSON,
} from './saved-jobs-storage';

// Today types
export type { TodayItem, TodayStore } from './today-types';
export { TODAY_SCHEMA_VERSION, createDefaultTodayItems } from './today-types';

// Today storage helpers
export {
  TODAY_STORE_KEY,
  loadTodayStore,
  saveTodayStore,
  seedTodayIfEmpty,
  addTodayItem,
  toggleTodayItem,
  removeTodayItem,
  clearCompletedItems,
  setLastViewedJob,
  clearTodayData,
  exportTodayJSON,
} from './today-storage';

// Resume types
export type {
  ResumeContact,
  ResumeExperience,
  ResumeEducation,
  ResumeSkill,
  ResumeDraft,
  ResumeVersion,
  ResumeStore,
} from './resume-types';
export {
  RESUME_SCHEMA_VERSION,
  createDefaultContact,
  createDefaultDraft,
} from './resume-types';

// Resume storage helpers
export {
  RESUME_STORE_KEY,
  loadResumeStore,
  saveResumeStore,
  updateDraft,
  createVersion,
  restoreVersion,
  deleteVersion,
  listVersions,
  exportResumeJSON,
  clearResumeData,
} from './resume-storage';
