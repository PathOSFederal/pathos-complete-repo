/**
 * ============================================================================
 * JOB ALERTS STORE (Day 20 - Email Digest v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This Zustand store manages job alerts for the PathOS application.
 * When a user creates an alert (from a job or manually), it's stored here
 * and persisted to localStorage. The system can then evaluate matching jobs
 * against alert criteria locally.
 *
 * DAY 20 ADDITIONS:
 * - Email digest settings (consent, frequency, email, privacy toggles)
 * - Event log for tracking alert runs and digest generation
 * - Seen job tracking per alert rule for "new matches" detection
 * - Test match functionality with event logging
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │       UI        │ --> │   THIS FILE     │ --> │  localStorage  │
 * │  (Create Alert  │     │  (Zustand Store)│     │  (persistence) │
 * │   Dialog, Mgmt) │     │                 │     │                │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *                                │
 *                                ▼
 *                        ┌─────────────────┐
 *                        │  matchAlertJobs │
 *                        │  (lib/job-search)│
 *                        └─────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Store job alerts - maintains array of alert configurations
 * 2. CRUD operations - create, update, toggle, delete alerts
 * 3. Run matching - evaluate jobs against alert criteria
 * 4. Track matches - store matching jobIds and counts
 * 5. Persist to localStorage - alerts survive page refresh
 * 6. Provide reset action - for "Delete All Local Data" feature
 * 7. Email digest settings - consent, frequency, email preferences (Day 20)
 * 8. Event logging - track test runs, digest generation (Day 20)
 * 9. Seen job tracking - identify new matches (Day 20)
 *
 * HOUSE RULES COMPLIANCE (Day 20):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 20 - Email Digest v1
 * ============================================================================
 */

import { create } from 'zustand';
import {
  JOB_ALERTS_STORAGE_KEY,
  EMAIL_DIGEST_STORAGE_KEY,
  ALERT_EVENTS_STORAGE_KEY,
  ALERT_SEEN_JOBS_STORAGE_KEY,
} from '@/lib/storage-keys';

// Re-export for convenience
export {
  JOB_ALERTS_STORAGE_KEY,
  EMAIL_DIGEST_STORAGE_KEY,
  ALERT_EVENTS_STORAGE_KEY,
  ALERT_SEEN_JOBS_STORAGE_KEY,
};

// ============================================================================
// JOB ALERT TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a job alert configuration.
 * 
 * DESIGN RATIONALE:
 * Each alert stores criteria that define what jobs to match, plus metadata
 * about when it was created, last run, and current matches. This allows
 * the user to manage multiple alerts for different job searches.
 * 
 * CRITERIA DESIGN:
 * - Keywords are required (search title + summary/snippet)
 * - Other filters are optional (narrow down results)
 * - remoteOnly is a boolean flag (not a TeleworkPreference enum)
 */
export interface JobAlert {
  /**
   * Unique identifier for the alert.
   * Generated using createAlertId().
   */
  id: string;

  /**
   * User-defined name for the alert.
   * Example: "GS-13 Analyst Remote", "IT Specialist DC"
   */
  name: string;

  /**
   * Whether the alert is enabled.
   * Disabled alerts won't be evaluated or show in match counts.
   */
  enabled: boolean;

  /**
   * How often to check for matches (conceptual).
   * In Day 19 (local-only), this is UI only - no actual scheduling.
   * 'daily' | 'weekly'
   */
  frequency: 'daily' | 'weekly';

  /**
   * ISO 8601 timestamp when the alert was created.
   */
  createdAt: string;

  /**
   * ISO 8601 timestamp when the alert was last updated.
   */
  updatedAt: string;

  /**
   * ISO 8601 timestamp when the alert was last run/evaluated.
   * Null if never run.
   */
  lastRunAt: string | null;

  // ========================================================================
  // CRITERIA FIELDS
  // ========================================================================

  /**
   * Keywords to match in job title and summary/snippet.
   * Required - alerts must have at least keywords.
   * Example: "Management Analyst", "IT Specialist data"
   */
  keywords: string;

  /**
   * Optional: Series code to filter by.
   * Example: "0343", "2210"
   */
  series: string | null;

  /**
   * Optional: Grade band to filter by.
   * Example: "gs12", "gs13-gs14"
   */
  gradeBand: string | null;

  /**
   * Optional: Location filter (state code or "dc").
   * Example: "dc", "tx", "remote"
   */
  location: string | null;

  /**
   * Optional: Whether to filter for remote-only jobs.
   */
  remoteOnly: boolean;

  // ========================================================================
  // MATCH TRACKING
  // ========================================================================

  /**
   * Array of job IDs that currently match this alert.
   * Updated when runAlert() is called.
   */
  matches: string[];

  /**
   * Count of matches from the last run.
   * Stored separately for quick access without counting array.
   */
  lastMatchCount: number;
}

/**
 * Draft for creating a new alert.
 * Excludes generated fields (id, createdAt, updatedAt, lastRunAt, matches, lastMatchCount).
 */
export interface JobAlertDraft {
  name: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  keywords: string;
  series: string | null;
  gradeBand: string | null;
  location: string | null;
  remoteOnly: boolean;
}

/**
 * Partial update for an existing alert.
 */
export type JobAlertPatch = Partial<Omit<JobAlert, 'id' | 'createdAt'>>;

// ============================================================================
// EMAIL DIGEST SETTINGS (Day 20)
// ============================================================================

/**
 * Email digest settings for alert notifications.
 *
 * DAY 20 DESIGN:
 * In Tier 1, emails are not actually sent. Instead, we compose the email
 * and hand it off to the user's mail client via mailto: URL. These settings
 * control what goes into that digest.
 */
export interface EmailDigestSettings {
  /**
   * Whether email digest is enabled.
   * Must be true AND consentAt must be set for digest to be generated.
   */
  enabled: boolean;

  /**
   * The email address to send digest to.
   * Used in mailto: URL.
   */
  email: string;

  /**
   * How often to generate digest.
   * 'daily' or 'weekly'
   */
  frequency: 'daily' | 'weekly';

  /**
   * Whether to only generate digest when there are new matches.
   * If true and no new matches, digest generation is skipped.
   */
  onlyWhenNew: boolean;

  /**
   * Whether to include salary information in digest.
   * Respects global privacy hide if disabled.
   */
  includeSalary: boolean;

  /**
   * Whether to include location information in digest.
   * Respects global privacy hide if disabled.
   */
  includeLocation: boolean;

  /**
   * ISO 8601 timestamp when user gave consent.
   * Null if consent not yet given.
   */
  consentAt: string | null;

  /**
   * ISO 8601 timestamp when last digest was generated.
   * Null if never generated.
   */
  lastDigestAt: string | null;
}

/**
 * Default email digest settings.
 */
export const DEFAULT_EMAIL_DIGEST_SETTINGS: EmailDigestSettings = {
  enabled: false,
  email: '',
  frequency: 'daily',
  onlyWhenNew: true,
  includeSalary: true,
  includeLocation: true,
  consentAt: null,
  lastDigestAt: null,
};

// ============================================================================
// ALERT EVENT LOG (Day 20)
// ============================================================================

/**
 * Types of events that can be logged.
 */
export type AlertEventType =
  | 'TEST_RUN'
  | 'NEW_MATCHES_FOUND'
  | 'NO_NEW_MATCHES'
  | 'DIGEST_GENERATED'
  | 'DIGEST_SENT'
  | 'SETTINGS_UPDATED'
  | 'ALERT_CREATED'
  | 'ALERT_DELETED';

/**
 * An entry in the alert event log.
 *
 * DAY 20 DESIGN:
 * Events are logged when test matches are run, digests are generated,
 * or settings are changed. This provides an audit trail for the user
 * to see what has happened with their alerts.
 */
export interface AlertEvent {
  /**
   * Unique identifier for the event.
   */
  id: string;

  /**
   * The type of event.
   */
  type: AlertEventType;

  /**
   * ISO 8601 timestamp when the event occurred.
   */
  createdAt: string;

  /**
   * Human-readable message describing the event.
   */
  message: string;

  /**
   * Optional: The alert rule ID this event relates to.
   */
  ruleId: string | null;

  /**
   * Optional: Job IDs involved in this event (e.g., new matches).
   */
  jobIds: string[];
}

/**
 * Maximum number of events to keep in the log.
 * Older events are trimmed when this limit is exceeded.
 */
export const MAX_EVENT_LOG_SIZE = 50;

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

/**
 * State shape for the job alerts store.
 */
interface JobAlertsState {
  /**
   * Array of job alerts.
   * Ordered by createdAt (most recent first).
   */
  alerts: JobAlert[];

  /**
   * Whether the store has been hydrated from localStorage.
   * Prevents flash of empty state on initial load.
   */
  isLoaded: boolean;

  /**
   * Email digest settings (Day 20).
   * Controls how and when email digests are generated.
   */
  emailDigest: EmailDigestSettings;

  /**
   * Event log for alert activities (Day 20).
   * Trimmed to MAX_EVENT_LOG_SIZE entries.
   */
  events: AlertEvent[];

  /**
   * Map of alert rule IDs to arrays of seen job IDs (Day 20).
   * Used to track which jobs have been "seen" for each alert,
   * so we can identify new matches.
   */
  seenByRule: Record<string, string[]>;
}

// ============================================================================
// STORE ACTIONS INTERFACE
// ============================================================================

/**
 * Actions available on the job alerts store.
 */
interface JobAlertsActions {
  /**
   * Creates a new alert from a draft.
   * 
   * @param draft - The alert configuration (without generated fields)
   * @returns The created JobAlert
   */
  createAlert: (draft: JobAlertDraft) => JobAlert;

  /**
   * Updates an existing alert.
   * 
   * @param id - The alert ID to update
   * @param patch - Partial update to apply
   * @returns true if updated, false if not found
   */
  updateAlert: (id: string, patch: JobAlertPatch) => boolean;

  /**
   * Deletes an alert by ID.
   * 
   * @param id - The alert ID to delete
   * @returns true if deleted, false if not found
   */
  deleteAlert: (id: string) => boolean;

  /**
   * Toggles an alert's enabled state.
   * 
   * @param id - The alert ID to toggle
   * @returns The new enabled state, or null if not found
   */
  toggleAlert: (id: string) => boolean | null;

  /**
   * Runs matching for a single alert against provided jobs.
   * Updates the alert's matches array and lastMatchCount.
   * 
   * @param id - The alert ID to run
   * @param jobs - Array of jobs to match against (minimal shape)
   * @returns Number of matches, or -1 if alert not found
   */
  runAlert: (id: string, jobs: MatchableJob[]) => number;

  /**
   * Runs matching for all enabled alerts against provided jobs.
   * 
   * @param jobs - Array of jobs to match against
   * @returns Object mapping alert IDs to match counts
   */
  runAllAlerts: (jobs: MatchableJob[]) => Record<string, number>;

  /**
   * Gets an alert by ID.
   * 
   * @param id - The alert ID
   * @returns The alert or null if not found
   */
  getAlert: (id: string) => JobAlert | null;

  /**
   * Gets all alerts (enabled and disabled).
   * 
   * @returns Array of all alerts
   */
  getAllAlerts: () => JobAlert[];

  /**
   * Gets only enabled alerts.
   * 
   * @returns Array of enabled alerts
   */
  getEnabledAlerts: () => JobAlert[];

  /**
   * Clears all alerts.
   * Called by "Clear all alerts" action.
   */
  clearAlerts: () => void;

  /**
   * Resets the store to initial state.
   * Called by "Delete All Local Data" feature.
   */
  resetAlerts: () => void;

  /**
   * Loads alerts from localStorage.
   * Called on initial client-side mount.
   */
  loadFromStorage: () => void;

  /**
   * Saves current state to localStorage.
   * Called after any state modification.
   */
  saveToStorage: () => void;

  // ==========================================================================
  // DAY 20 ACTIONS: Email Digest Settings
  // ==========================================================================

  /**
   * Updates email digest settings.
   *
   * @param settings - Partial settings to update
   */
  setEmailDigestSettings: (settings: Partial<EmailDigestSettings>) => void;

  /**
   * Sets consent for email digest.
   * Records timestamp when consent is given.
   *
   * @param consented - Whether user consented
   */
  setConsent: (consented: boolean) => void;

  /**
   * Gets current email digest settings.
   *
   * @returns Current EmailDigestSettings
   */
  getEmailDigestSettings: () => EmailDigestSettings;

  // ==========================================================================
  // DAY 20 ACTIONS: Test Match and Event Logging
  // ==========================================================================

  /**
   * Runs a test match for a specific alert rule.
   * Updates seen jobs and logs events.
   *
   * @param ruleId - The alert ID to run test match for
   * @param jobs - Array of jobs to match against
   * @returns Object with newMatches and allMatches counts
   */
  runTestMatch: (ruleId: string, jobs: MatchableJob[]) => { newMatches: number; allMatches: number };

  /**
   * Adds an event to the event log.
   * Automatically trims log to MAX_EVENT_LOG_SIZE.
   *
   * @param type - Event type
   * @param message - Human-readable message
   * @param ruleId - Optional alert rule ID
   * @param jobIds - Optional job IDs involved
   */
  addEvent: (type: AlertEventType, message: string, ruleId?: string, jobIds?: string[]) => void;

  /**
   * Gets recent events from the log.
   *
   * @param limit - Maximum number of events to return
   * @returns Array of recent events
   */
  getEvents: (limit?: number) => AlertEvent[];

  /**
   * Clears all events from the log.
   */
  clearEvents: () => void;

  /**
   * Marks digest as sent (records timestamp).
   */
  markDigestSent: () => void;

  /**
   * Gets new matches count for a specific alert rule.
   * Compares current matches against seen jobs.
   *
   * @param ruleId - The alert rule ID
   * @returns Number of new (unseen) matches
   */
  getNewMatchesCount: (ruleId: string) => number;

  /**
   * Gets total new matches count across all enabled alerts.
   *
   * @returns Total number of new matches
   */
  getTotalNewMatches: () => number;

  /**
   * Marks all current matches as seen for an alert rule.
   *
   * @param ruleId - The alert rule ID
   */
  markMatchesSeen: (ruleId: string) => void;

  /**
   * Resets all alert digest state (Day 20).
   * Called by "Delete All Local Data" feature.
   */
  resetAlertsDigest: () => void;
}

// ============================================================================
// COMBINED STORE TYPE
// ============================================================================

export type JobAlertsStore = JobAlertsState & JobAlertsActions;

// ============================================================================
// MATCHABLE JOB INTERFACE
// ============================================================================

/**
 * Minimal job shape required for alert matching.
 * This allows matching against different job sources/formats.
 */
export interface MatchableJob {
  id: string;
  title: string;
  summary?: string;
  snippet?: string;
  seriesCode?: string;
  gradeLevel?: string;
  locationDisplay?: string;
  teleworkEligibility?: string;
}

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Selector for all alerts.
 */
export const selectAlerts = function (state: JobAlertsStore): JobAlert[] {
  return state.alerts;
};

/**
 * Selector for alerts count.
 */
export const selectAlertsCount = function (state: JobAlertsStore): number {
  return state.alerts.length;
};

/**
 * Selector for enabled alerts count.
 */
export const selectEnabledAlertsCount = function (state: JobAlertsStore): number {
  let count = 0;
  for (let i = 0; i < state.alerts.length; i++) {
    if (state.alerts[i].enabled) {
      count = count + 1;
    }
  }
  return count;
};

/**
 * Selector for total matches across all enabled alerts.
 */
export const selectTotalMatches = function (state: JobAlertsStore): number {
  let total = 0;
  for (let i = 0; i < state.alerts.length; i++) {
    const alert = state.alerts[i];
    if (alert.enabled) {
      total = total + alert.lastMatchCount;
    }
  }
  return total;
};

/**
 * Selector for whether store is loaded.
 */
export const selectIsLoaded = function (state: JobAlertsStore): boolean {
  return state.isLoaded;
};

/**
 * Selector for email digest settings (Day 20).
 */
export const selectEmailDigest = function (state: JobAlertsStore): EmailDigestSettings {
  return state.emailDigest;
};

/**
 * Selector for events log (Day 20).
 */
export const selectEvents = function (state: JobAlertsStore): AlertEvent[] {
  return state.events;
};

/**
 * Selector for total new matches across all enabled alerts (Day 20).
 */
export const selectTotalNewMatches = function (state: JobAlertsStore): number {
  let total = 0;
  for (let i = 0; i < state.alerts.length; i++) {
    const alert = state.alerts[i];
    if (!alert.enabled) {
      continue;
    }
    // Count matches that are not in seenByRule
    const seenJobs = state.seenByRule[alert.id];
    const seenSet: Set<string> = new Set();
    if (seenJobs !== undefined && seenJobs !== null) {
      for (let j = 0; j < seenJobs.length; j++) {
        seenSet.add(seenJobs[j]);
      }
    }
    for (let k = 0; k < alert.matches.length; k++) {
      if (!seenSet.has(alert.matches[k])) {
        total = total + 1;
      }
    }
  }
  return total;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a unique ID for a new alert.
 * Uses crypto.randomUUID if available, otherwise falls back to timestamp+random.
 */
function createAlertId(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'alert-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Creates a unique ID for a new event (Day 20).
 */
function createEventId(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'event-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Finds the index of an alert in the alerts array by ID.
 * 
 * @param alerts - Array of alerts
 * @param id - ID to find
 * @returns Index if found, -1 if not found
 */
function findAlertIndex(alerts: JobAlert[], id: string): number {
  for (let i = 0; i < alerts.length; i++) {
    if (alerts[i].id === id) {
      return i;
    }
  }
  return -1;
}

/**
 * Creates a deep copy of an alerts array.
 * 
 * @param alerts - Array to copy
 * @returns New array with copied alert objects
 */
function deepCopyAlerts(alerts: JobAlert[]): JobAlert[] {
  const copy: JobAlert[] = [];
  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];
    // Copy matches array explicitly
    const matchesCopy: string[] = [];
    for (let j = 0; j < alert.matches.length; j++) {
      matchesCopy.push(alert.matches[j]);
    }
    const alertCopy: JobAlert = Object.assign({}, alert, {
      matches: matchesCopy,
    });
    copy.push(alertCopy);
  }
  return copy;
}

/**
 * Validates that a parsed object has required JobAlert fields.
 * 
 * @param obj - Object to validate
 * @returns true if valid JobAlert, false otherwise
 */
function isValidJobAlert(obj: unknown): obj is JobAlert {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof candidate['id'] !== 'string') return false;
  if (typeof candidate['name'] !== 'string') return false;
  if (typeof candidate['keywords'] !== 'string') return false;
  if (typeof candidate['createdAt'] !== 'string') return false;
  if (typeof candidate['updatedAt'] !== 'string') return false;

  // Check required boolean fields
  if (typeof candidate['enabled'] !== 'boolean') return false;
  if (typeof candidate['remoteOnly'] !== 'boolean') return false;

  // Check frequency enum
  if (candidate['frequency'] !== 'daily' && candidate['frequency'] !== 'weekly') return false;

  // Check matches is array
  if (!Array.isArray(candidate['matches'])) return false;

  // Check lastMatchCount is number
  if (typeof candidate['lastMatchCount'] !== 'number') return false;

  return true;
}

/**
 * Matches a job against alert criteria.
 * 
 * HOW MATCHING WORKS:
 * 1. Keywords: Check if any keyword appears in title OR summary/snippet (case-insensitive)
 * 2. Series: If specified, job must have matching seriesCode
 * 3. GradeBand: If specified, job's gradeLevel must be within range
 * 4. Location: If specified, job's locationDisplay must contain the location string
 * 5. RemoteOnly: If true, job must be remote (locationDisplay contains "remote")
 * 
 * All specified criteria must match (AND logic).
 * 
 * @param job - Job to check
 * @param alert - Alert with criteria
 * @returns true if job matches alert criteria
 */
function matchesAlertCriteria(job: MatchableJob, alert: JobAlert): boolean {
  // ========================================================================
  // KEYWORDS MATCHING (Required)
  // ========================================================================
  const keywordsLower = alert.keywords.toLowerCase().trim();
  if (keywordsLower === '') {
    // No keywords = match all (shouldn't happen but handle gracefully)
    return true;
  }

  // Split keywords by spaces and check if any appear in title or summary
  const keywordParts = keywordsLower.split(' ');
  let keywordMatch = false;

  const titleLower = job.title.toLowerCase();
  let summaryLower = '';
  if (job.summary !== undefined && job.summary !== null) {
    summaryLower = job.summary.toLowerCase();
  }
  if (job.snippet !== undefined && job.snippet !== null) {
    if (summaryLower === '') {
      summaryLower = job.snippet.toLowerCase();
    } else {
      summaryLower = summaryLower + ' ' + job.snippet.toLowerCase();
    }
  }

  for (let i = 0; i < keywordParts.length; i++) {
    const keyword = keywordParts[i];
    if (keyword.length > 0) {
      if (titleLower.indexOf(keyword) !== -1 || summaryLower.indexOf(keyword) !== -1) {
        keywordMatch = true;
        break;
      }
    }
  }

  if (!keywordMatch) {
    return false;
  }

  // ========================================================================
  // SERIES MATCHING (Optional)
  // ========================================================================
  if (alert.series !== null && alert.series !== '') {
    const jobSeries = job.seriesCode;
    if (jobSeries === undefined || jobSeries === null || jobSeries === '') {
      return false;
    }
    if (jobSeries !== alert.series) {
      return false;
    }
  }

  // ========================================================================
  // GRADE BAND MATCHING (Optional)
  // ========================================================================
  if (alert.gradeBand !== null && alert.gradeBand !== '') {
    const jobGrade = job.gradeLevel;
    if (jobGrade === undefined || jobGrade === null || jobGrade === '') {
      return false;
    }

    // Parse job grade number
    const jobGradeNum = parseGradeNumber(jobGrade);
    if (jobGradeNum === null) {
      return false;
    }

    // Parse alert grade band (format: "gsXX" or "gsXX-gsYY")
    const gradeBandLower = alert.gradeBand.toLowerCase();
    const rangeMatch = gradeBandLower.match(/gs(\d+)-gs(\d+)/);
    
    if (rangeMatch !== null && rangeMatch.length === 3) {
      // Range format: gs12-gs14
      const min = parseInt(rangeMatch[1], 10);
      const max = parseInt(rangeMatch[2], 10);
      if (jobGradeNum < min || jobGradeNum > max) {
        return false;
      }
    } else {
      // Single grade format: gs13
      const singleMatch = gradeBandLower.match(/gs(\d+)/);
      if (singleMatch !== null && singleMatch.length === 2) {
        const targetGrade = parseInt(singleMatch[1], 10);
        if (jobGradeNum !== targetGrade) {
          return false;
        }
      }
    }
  }

  // ========================================================================
  // LOCATION MATCHING (Optional)
  // ========================================================================
  if (alert.location !== null && alert.location !== '') {
    const jobLocation = job.locationDisplay;
    if (jobLocation === undefined || jobLocation === null || jobLocation === '') {
      return false;
    }

    const locationLower = alert.location.toLowerCase();
    const jobLocationLower = jobLocation.toLowerCase();

    if (jobLocationLower.indexOf(locationLower) === -1) {
      return false;
    }
  }

  // ========================================================================
  // REMOTE ONLY MATCHING (Optional)
  // ========================================================================
  if (alert.remoteOnly === true) {
    // Check locationDisplay for "remote"
    let isRemote = false;

    const jobLocation = job.locationDisplay;
    if (jobLocation !== undefined && jobLocation !== null) {
      if (jobLocation.toLowerCase().indexOf('remote') !== -1) {
        isRemote = true;
      }
    }

    // Also check teleworkEligibility
    const telework = job.teleworkEligibility;
    if (telework !== undefined && telework !== null) {
      if (telework.toLowerCase().indexOf('remote') !== -1) {
        isRemote = true;
      }
    }

    if (!isRemote) {
      return false;
    }
  }

  // All criteria matched
  return true;
}

/**
 * Parses a grade level string and returns the numeric grade.
 * 
 * @param gradeLevel - Grade level string (e.g., "GS-13", "GS-14/15")
 * @returns Numeric grade or null if cannot parse
 */
function parseGradeNumber(gradeLevel: string): number | null {
  if (gradeLevel === null || gradeLevel === undefined || gradeLevel === '') {
    return null;
  }

  const upperGrade = gradeLevel.toUpperCase();

  // Handle GS-XX format
  if (upperGrade.indexOf('GS-') === 0) {
    const afterPrefix = upperGrade.substring(3);
    let numStr = '';
    for (let i = 0; i < afterPrefix.length; i++) {
      const char = afterPrefix.charAt(i);
      if (char >= '0' && char <= '9') {
        numStr = numStr + char;
      } else {
        break;
      }
    }
    if (numStr.length > 0) {
      return parseInt(numStr, 10);
    }
  }

  // Handle plain number
  let plainNum = '';
  for (let i = 0; i < gradeLevel.length; i++) {
    const char = gradeLevel.charAt(i);
    if (char >= '0' && char <= '9') {
      plainNum = plainNum + char;
    } else if (plainNum.length > 0) {
      break;
    }
  }

  if (plainNum.length > 0) {
    return parseInt(plainNum, 10);
  }

  return null;
}

// ============================================================================
// CREATE THE STORE
// ============================================================================

export const useJobAlertsStore = create<JobAlertsStore>(function (set, get) {
  return {
    // ========================================================================
    // INITIAL STATE
    // ========================================================================

    /**
     * Start with empty alerts.
     * Will be populated from localStorage on client-side mount.
     */
    alerts: [],

    /**
     * Not loaded until loadFromStorage is called.
     */
    isLoaded: false,

    /**
     * Email digest settings (Day 20).
     * Start with defaults, loaded from localStorage on mount.
     */
    emailDigest: Object.assign({}, DEFAULT_EMAIL_DIGEST_SETTINGS),

    /**
     * Event log (Day 20).
     * Start empty, loaded from localStorage on mount.
     */
    events: [],

    /**
     * Seen job IDs per alert rule (Day 20).
     * Start empty, loaded from localStorage on mount.
     */
    seenByRule: {},

    // ========================================================================
    // ACTIONS
    // ========================================================================

    /**
     * Creates a new alert from a draft.
     * 
     * HOW IT WORKS:
     * 1. Generate unique ID
     * 2. Set timestamps
     * 3. Initialize matches as empty
     * 4. Add to beginning of alerts array
     * 5. Persist to storage
     */
    createAlert: function (draft: JobAlertDraft): JobAlert {
      const now = new Date().toISOString();

      const newAlert: JobAlert = {
        id: createAlertId(),
        name: draft.name,
        enabled: draft.enabled,
        frequency: draft.frequency,
        createdAt: now,
        updatedAt: now,
        lastRunAt: null,
        keywords: draft.keywords,
        series: draft.series,
        gradeBand: draft.gradeBand,
        location: draft.location,
        remoteOnly: draft.remoteOnly,
        matches: [],
        lastMatchCount: 0,
      };

      const state = get();
      const newAlerts: JobAlert[] = [newAlert];
      for (let i = 0; i < state.alerts.length; i++) {
        newAlerts.push(state.alerts[i]);
      }

      set({ alerts: newAlerts });
      get().saveToStorage();

      return newAlert;
    },

    /**
     * Updates an existing alert.
     */
    updateAlert: function (id: string, patch: JobAlertPatch): boolean {
      const state = get();
      const index = findAlertIndex(state.alerts, id);

      if (index === -1) {
        return false;
      }

      const now = new Date().toISOString();
      const newAlerts = deepCopyAlerts(state.alerts);
      const existingAlert = newAlerts[index];

      // Apply patch (explicit field-by-field to avoid spread)
      if (patch.name !== undefined) existingAlert.name = patch.name;
      if (patch.enabled !== undefined) existingAlert.enabled = patch.enabled;
      if (patch.frequency !== undefined) existingAlert.frequency = patch.frequency;
      if (patch.keywords !== undefined) existingAlert.keywords = patch.keywords;
      if (patch.series !== undefined) existingAlert.series = patch.series;
      if (patch.gradeBand !== undefined) existingAlert.gradeBand = patch.gradeBand;
      if (patch.location !== undefined) existingAlert.location = patch.location;
      if (patch.remoteOnly !== undefined) existingAlert.remoteOnly = patch.remoteOnly;
      if (patch.lastRunAt !== undefined) existingAlert.lastRunAt = patch.lastRunAt;
      if (patch.matches !== undefined) {
        existingAlert.matches = [];
        for (let i = 0; i < patch.matches.length; i++) {
          existingAlert.matches.push(patch.matches[i]);
        }
      }
      if (patch.lastMatchCount !== undefined) existingAlert.lastMatchCount = patch.lastMatchCount;

      existingAlert.updatedAt = now;

      set({ alerts: newAlerts });
      get().saveToStorage();

      return true;
    },

    /**
     * Deletes an alert by ID.
     */
    deleteAlert: function (id: string): boolean {
      const state = get();
      const index = findAlertIndex(state.alerts, id);

      if (index === -1) {
        return false;
      }

      const newAlerts: JobAlert[] = [];
      for (let i = 0; i < state.alerts.length; i++) {
        if (i !== index) {
          newAlerts.push(state.alerts[i]);
        }
      }

      set({ alerts: newAlerts });
      get().saveToStorage();

      return true;
    },

    /**
     * Toggles an alert's enabled state.
     */
    toggleAlert: function (id: string): boolean | null {
      const state = get();
      const index = findAlertIndex(state.alerts, id);

      if (index === -1) {
        return null;
      }

      const newAlerts = deepCopyAlerts(state.alerts);
      const alert = newAlerts[index];
      alert.enabled = !alert.enabled;
      alert.updatedAt = new Date().toISOString();

      set({ alerts: newAlerts });
      get().saveToStorage();

      return alert.enabled;
    },

    /**
     * Runs matching for a single alert against provided jobs.
     */
    runAlert: function (id: string, jobs: MatchableJob[]): number {
      const state = get();
      const index = findAlertIndex(state.alerts, id);

      if (index === -1) {
        return -1;
      }

      const alert = state.alerts[index];
      const matchedIds: string[] = [];
      const seenIds: Set<string> = new Set();

      // Match jobs against alert criteria
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        
        // Deduplicate by jobId
        if (seenIds.has(job.id)) {
          continue;
        }

        if (matchesAlertCriteria(job, alert)) {
          matchedIds.push(job.id);
          seenIds.add(job.id);
        }
      }

      // Update alert with matches
      const newAlerts = deepCopyAlerts(state.alerts);
      const updatedAlert = newAlerts[index];
      updatedAlert.matches = matchedIds;
      updatedAlert.lastMatchCount = matchedIds.length;
      updatedAlert.lastRunAt = new Date().toISOString();
      updatedAlert.updatedAt = new Date().toISOString();

      set({ alerts: newAlerts });
      get().saveToStorage();

      return matchedIds.length;
    },

    /**
     * Runs matching for all enabled alerts against provided jobs.
     */
    runAllAlerts: function (jobs: MatchableJob[]): Record<string, number> {
      const state = get();
      const results: Record<string, number> = {};
      const now = new Date().toISOString();
      const newAlerts = deepCopyAlerts(state.alerts);

      for (let i = 0; i < newAlerts.length; i++) {
        const alert = newAlerts[i];

        if (!alert.enabled) {
          results[alert.id] = 0;
          continue;
        }

        const matchedIds: string[] = [];
        const seenIds: Set<string> = new Set();

        for (let j = 0; j < jobs.length; j++) {
          const job = jobs[j];

          if (seenIds.has(job.id)) {
            continue;
          }

          if (matchesAlertCriteria(job, alert)) {
            matchedIds.push(job.id);
            seenIds.add(job.id);
          }
        }

        alert.matches = matchedIds;
        alert.lastMatchCount = matchedIds.length;
        alert.lastRunAt = now;
        alert.updatedAt = now;

        results[alert.id] = matchedIds.length;
      }

      set({ alerts: newAlerts });
      get().saveToStorage();

      return results;
    },

    /**
     * Gets an alert by ID.
     */
    getAlert: function (id: string): JobAlert | null {
      const state = get();
      const index = findAlertIndex(state.alerts, id);

      if (index === -1) {
        return null;
      }

      // Return a copy
      const alert = state.alerts[index];
      const matchesCopy: string[] = [];
      for (let i = 0; i < alert.matches.length; i++) {
        matchesCopy.push(alert.matches[i]);
      }
      return Object.assign({}, alert, { matches: matchesCopy });
    },

    /**
     * Gets all alerts.
     */
    getAllAlerts: function (): JobAlert[] {
      return deepCopyAlerts(get().alerts);
    },

    /**
     * Gets only enabled alerts.
     */
    getEnabledAlerts: function (): JobAlert[] {
      const state = get();
      const enabled: JobAlert[] = [];

      for (let i = 0; i < state.alerts.length; i++) {
        const alert = state.alerts[i];
        if (alert.enabled) {
          const matchesCopy: string[] = [];
          for (let j = 0; j < alert.matches.length; j++) {
            matchesCopy.push(alert.matches[j]);
          }
          enabled.push(Object.assign({}, alert, { matches: matchesCopy }));
        }
      }

      return enabled;
    },

    /**
     * Clears all alerts.
     */
    clearAlerts: function (): void {
      set({ alerts: [] });
      get().saveToStorage();
    },

    /**
     * Resets the store to initial state.
     *
     * DAY 20 UPDATE:
     * Also resets email digest settings, events, and seen jobs.
     */
    resetAlerts: function (): void {
      set({
        alerts: [],
        emailDigest: Object.assign({}, DEFAULT_EMAIL_DIGEST_SETTINGS),
        events: [],
        seenByRule: {},
        isLoaded: true,
      });

      // Clear from localStorage (SSR-safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(JOB_ALERTS_STORAGE_KEY);
          localStorage.removeItem(EMAIL_DIGEST_STORAGE_KEY);
          localStorage.removeItem(ALERT_EVENTS_STORAGE_KEY);
          localStorage.removeItem(ALERT_SEEN_JOBS_STORAGE_KEY);
        } catch (error) {
          console.error('[JobAlertsStore] Failed to clear storage:', error);
        }
      }
    },

    /**
     * Loads alerts from localStorage.
     *
     * DAY 20 UPDATE:
     * Also loads email digest settings, events, and seen jobs.
     */
    loadFromStorage: function (): void {
      // SSR guard
      if (typeof window === 'undefined') {
        set({ isLoaded: true });
        return;
      }

      const loadedAlerts: JobAlert[] = [];
      let loadedEmailDigest: EmailDigestSettings = Object.assign({}, DEFAULT_EMAIL_DIGEST_SETTINGS);
      const loadedEvents: AlertEvent[] = [];
      const loadedSeenByRule: Record<string, string[]> = {};

      // Load alerts
      try {
        const stored = localStorage.getItem(JOB_ALERTS_STORAGE_KEY);

        if (stored !== null && stored !== '') {
          const parsed = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            for (let i = 0; i < parsed.length; i++) {
              const alert = parsed[i];
              if (isValidJobAlert(alert)) {
                loadedAlerts.push(alert);
              } else {
                console.warn('[JobAlertsStore] Skipping invalid alert at index', i);
              }
            }
          } else {
            console.warn('[JobAlertsStore] Stored alerts data is not an array, resetting');
          }
        }
      } catch (error) {
        console.error('[JobAlertsStore] Failed to load alerts from storage:', error);
      }

      // Load email digest settings (Day 20)
      try {
        const digestStored = localStorage.getItem(EMAIL_DIGEST_STORAGE_KEY);
        if (digestStored !== null && digestStored !== '') {
          const parsed = JSON.parse(digestStored);
          if (typeof parsed === 'object' && parsed !== null) {
            // Validate and merge with defaults (field by field, no spread)
            loadedEmailDigest = {
              enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_EMAIL_DIGEST_SETTINGS.enabled,
              email: typeof parsed.email === 'string' ? parsed.email : DEFAULT_EMAIL_DIGEST_SETTINGS.email,
              frequency: parsed.frequency === 'daily' || parsed.frequency === 'weekly' ? parsed.frequency : DEFAULT_EMAIL_DIGEST_SETTINGS.frequency,
              onlyWhenNew: typeof parsed.onlyWhenNew === 'boolean' ? parsed.onlyWhenNew : DEFAULT_EMAIL_DIGEST_SETTINGS.onlyWhenNew,
              includeSalary: typeof parsed.includeSalary === 'boolean' ? parsed.includeSalary : DEFAULT_EMAIL_DIGEST_SETTINGS.includeSalary,
              includeLocation: typeof parsed.includeLocation === 'boolean' ? parsed.includeLocation : DEFAULT_EMAIL_DIGEST_SETTINGS.includeLocation,
              consentAt: typeof parsed.consentAt === 'string' ? parsed.consentAt : null,
              lastDigestAt: typeof parsed.lastDigestAt === 'string' ? parsed.lastDigestAt : null,
            };
          }
        }
      } catch (error) {
        console.error('[JobAlertsStore] Failed to load email digest settings from storage:', error);
      }

      // Load events (Day 20)
      try {
        const eventsStored = localStorage.getItem(ALERT_EVENTS_STORAGE_KEY);
        if (eventsStored !== null && eventsStored !== '') {
          const parsed = JSON.parse(eventsStored);
          if (Array.isArray(parsed)) {
            for (let j = 0; j < parsed.length; j++) {
              const evt = parsed[j];
              // Basic validation
              if (
                typeof evt === 'object' &&
                evt !== null &&
                typeof evt.id === 'string' &&
                typeof evt.type === 'string' &&
                typeof evt.createdAt === 'string' &&
                typeof evt.message === 'string'
              ) {
                loadedEvents.push({
                  id: evt.id,
                  type: evt.type as AlertEventType,
                  createdAt: evt.createdAt,
                  message: evt.message,
                  ruleId: typeof evt.ruleId === 'string' ? evt.ruleId : null,
                  jobIds: Array.isArray(evt.jobIds) ? evt.jobIds : [],
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('[JobAlertsStore] Failed to load events from storage:', error);
      }

      // Load seen jobs per rule (Day 20)
      try {
        const seenStored = localStorage.getItem(ALERT_SEEN_JOBS_STORAGE_KEY);
        if (seenStored !== null && seenStored !== '') {
          const parsed = JSON.parse(seenStored);
          if (typeof parsed === 'object' && parsed !== null) {
            const keys = Object.keys(parsed);
            for (let k = 0; k < keys.length; k++) {
              const ruleId = keys[k];
              const jobIds = parsed[ruleId];
              if (Array.isArray(jobIds)) {
                const validIds: string[] = [];
                for (let m = 0; m < jobIds.length; m++) {
                  if (typeof jobIds[m] === 'string') {
                    validIds.push(jobIds[m]);
                  }
                }
                loadedSeenByRule[ruleId] = validIds;
              }
            }
          }
        }
      } catch (error) {
        console.error('[JobAlertsStore] Failed to load seen jobs from storage:', error);
      }

      set({
        alerts: loadedAlerts,
        emailDigest: loadedEmailDigest,
        events: loadedEvents,
        seenByRule: loadedSeenByRule,
        isLoaded: true,
      });
    },

    /**
     * Saves current state to localStorage.
     */
    saveToStorage: function (): void {
      // SSR guard
      if (typeof window === 'undefined') {
        return;
      }

      const state = get();

      try {
        // Save alerts
        localStorage.setItem(
          JOB_ALERTS_STORAGE_KEY,
          JSON.stringify(state.alerts)
        );

        // Save email digest settings (Day 20)
        localStorage.setItem(
          EMAIL_DIGEST_STORAGE_KEY,
          JSON.stringify(state.emailDigest)
        );

        // Save events (Day 20)
        localStorage.setItem(
          ALERT_EVENTS_STORAGE_KEY,
          JSON.stringify(state.events)
        );

        // Save seen jobs per rule (Day 20)
        localStorage.setItem(
          ALERT_SEEN_JOBS_STORAGE_KEY,
          JSON.stringify(state.seenByRule)
        );
      } catch (error) {
        console.error('[JobAlertsStore] Failed to save to storage:', error);
      }
    },

    // ========================================================================
    // DAY 20 ACTIONS: Email Digest Settings
    // ========================================================================

    /**
     * Updates email digest settings.
     *
     * HOW IT WORKS:
     * 1. Get current settings
     * 2. Apply partial update (field by field, no spread)
     * 3. Set new state
     * 4. Persist to storage
     */
    setEmailDigestSettings: function (settings: Partial<EmailDigestSettings>): void {
      const state = get();
      const current = state.emailDigest;

      // Create new settings object with explicit field updates (no spread)
      const updated: EmailDigestSettings = {
        enabled: settings.enabled !== undefined ? settings.enabled : current.enabled,
        email: settings.email !== undefined ? settings.email : current.email,
        frequency: settings.frequency !== undefined ? settings.frequency : current.frequency,
        onlyWhenNew: settings.onlyWhenNew !== undefined ? settings.onlyWhenNew : current.onlyWhenNew,
        includeSalary: settings.includeSalary !== undefined ? settings.includeSalary : current.includeSalary,
        includeLocation: settings.includeLocation !== undefined ? settings.includeLocation : current.includeLocation,
        consentAt: settings.consentAt !== undefined ? settings.consentAt : current.consentAt,
        lastDigestAt: settings.lastDigestAt !== undefined ? settings.lastDigestAt : current.lastDigestAt,
      };

      set({ emailDigest: updated });
      get().saveToStorage();

      // Log settings update event
      get().addEvent('SETTINGS_UPDATED', 'Email digest settings updated');
    },

    /**
     * Sets consent for email digest.
     *
     * HOW IT WORKS:
     * 1. If consenting, record current timestamp
     * 2. If revoking consent, clear timestamp
     * 3. Persist to storage
     */
    setConsent: function (consented: boolean): void {
      const state = get();
      const current = state.emailDigest;

      const updated: EmailDigestSettings = {
        enabled: current.enabled,
        email: current.email,
        frequency: current.frequency,
        onlyWhenNew: current.onlyWhenNew,
        includeSalary: current.includeSalary,
        includeLocation: current.includeLocation,
        consentAt: consented ? new Date().toISOString() : null,
        lastDigestAt: current.lastDigestAt,
      };

      set({ emailDigest: updated });
      get().saveToStorage();
    },

    /**
     * Gets current email digest settings.
     */
    getEmailDigestSettings: function (): EmailDigestSettings {
      const state = get();
      // Return a copy (no spread, use Object.assign)
      return Object.assign({}, state.emailDigest);
    },

    // ========================================================================
    // DAY 20 ACTIONS: Test Match and Event Logging
    // ========================================================================

    /**
     * Runs a test match for a specific alert rule.
     *
     * HOW IT WORKS:
     * 1. Find the alert by ID
     * 2. Run matching against provided jobs
     * 3. Compare matches against seenByRule to find new matches
     * 4. Update seen jobs with current matches
     * 5. Log appropriate events
     * 6. Return new and all match counts
     */
    runTestMatch: function (ruleId: string, jobs: MatchableJob[]): { newMatches: number; allMatches: number } {
      const state = get();
      const alertIndex = findAlertIndex(state.alerts, ruleId);

      if (alertIndex === -1) {
        return { newMatches: 0, allMatches: 0 };
      }

      const alert = state.alerts[alertIndex];

      // Run matching (reuse existing logic)
      const matchedIds: string[] = [];
      const matchedIdSet: Set<string> = new Set();

      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        if (matchedIdSet.has(job.id)) {
          continue;
        }
        if (matchesAlertCriteria(job, alert)) {
          matchedIds.push(job.id);
          matchedIdSet.add(job.id);
        }
      }

      // Get previously seen jobs for this rule
      const previouslySeen = state.seenByRule[ruleId];
      const seenSet: Set<string> = new Set();
      if (previouslySeen !== undefined && previouslySeen !== null) {
        for (let j = 0; j < previouslySeen.length; j++) {
          seenSet.add(previouslySeen[j]);
        }
      }

      // Count new matches (not in seen set)
      const newMatchIds: string[] = [];
      for (let k = 0; k < matchedIds.length; k++) {
        if (!seenSet.has(matchedIds[k])) {
          newMatchIds.push(matchedIds[k]);
        }
      }

      // Update alert with matches
      const newAlerts = deepCopyAlerts(state.alerts);
      const updatedAlert = newAlerts[alertIndex];
      updatedAlert.matches = matchedIds;
      updatedAlert.lastMatchCount = matchedIds.length;
      updatedAlert.lastRunAt = new Date().toISOString();
      updatedAlert.updatedAt = new Date().toISOString();

      // Update seenByRule to include all current matches
      const newSeenByRule: Record<string, string[]> = {};
      const ruleIds = Object.keys(state.seenByRule);
      for (let m = 0; m < ruleIds.length; m++) {
        const key = ruleIds[m];
        const arr = state.seenByRule[key];
        const copy: string[] = [];
        for (let n = 0; n < arr.length; n++) {
          copy.push(arr[n]);
        }
        newSeenByRule[key] = copy;
      }
      // Add all current matches to seen (no duplicates)
      const newSeenForRule: string[] = [];
      const combinedSet: Set<string> = new Set();
      // Add previously seen
      if (previouslySeen !== undefined && previouslySeen !== null) {
        for (let p = 0; p < previouslySeen.length; p++) {
          if (!combinedSet.has(previouslySeen[p])) {
            newSeenForRule.push(previouslySeen[p]);
            combinedSet.add(previouslySeen[p]);
          }
        }
      }
      // Add new matches
      for (let q = 0; q < matchedIds.length; q++) {
        if (!combinedSet.has(matchedIds[q])) {
          newSeenForRule.push(matchedIds[q]);
          combinedSet.add(matchedIds[q]);
        }
      }
      newSeenByRule[ruleId] = newSeenForRule;

      set({ alerts: newAlerts, seenByRule: newSeenByRule });
      get().saveToStorage();

      // Log events
      get().addEvent('TEST_RUN', 'Test match run for "' + alert.name + '"', ruleId);
      if (newMatchIds.length > 0) {
        get().addEvent(
          'NEW_MATCHES_FOUND',
          newMatchIds.length + ' new match(es) found for "' + alert.name + '"',
          ruleId,
          newMatchIds
        );
      } else if (matchedIds.length > 0) {
        get().addEvent('NO_NEW_MATCHES', 'No new matches (all ' + matchedIds.length + ' already seen)', ruleId);
      } else {
        get().addEvent('NO_NEW_MATCHES', 'No matches found for "' + alert.name + '"', ruleId);
      }

      return { newMatches: newMatchIds.length, allMatches: matchedIds.length };
    },

    /**
     * Adds an event to the event log.
     *
     * HOW IT WORKS:
     * 1. Create new event with ID and timestamp
     * 2. Prepend to events array (most recent first)
     * 3. Trim to MAX_EVENT_LOG_SIZE
     * 4. Persist to storage
     */
    addEvent: function (
      type: AlertEventType,
      message: string,
      ruleId?: string,
      jobIds?: string[]
    ): void {
      const state = get();

      const newEvent: AlertEvent = {
        id: createEventId(),
        type: type,
        createdAt: new Date().toISOString(),
        message: message,
        ruleId: ruleId !== undefined ? ruleId : null,
        jobIds: jobIds !== undefined ? jobIds : [],
      };

      // Prepend new event and trim to max size
      const newEvents: AlertEvent[] = [newEvent];
      const maxToKeep = MAX_EVENT_LOG_SIZE - 1;
      for (let i = 0; i < state.events.length && i < maxToKeep; i++) {
        newEvents.push(state.events[i]);
      }

      set({ events: newEvents });
      get().saveToStorage();
    },

    /**
     * Gets recent events from the log.
     */
    getEvents: function (limit?: number): AlertEvent[] {
      const state = get();
      const maxEvents = limit !== undefined && limit !== null ? limit : MAX_EVENT_LOG_SIZE;

      const result: AlertEvent[] = [];
      for (let i = 0; i < state.events.length && i < maxEvents; i++) {
        result.push(state.events[i]);
      }
      return result;
    },

    /**
     * Clears all events from the log.
     */
    clearEvents: function (): void {
      set({ events: [] });
      get().saveToStorage();
    },

    /**
     * Marks digest as sent (records timestamp).
     */
    markDigestSent: function (): void {
      const state = get();
      const current = state.emailDigest;

      const updated: EmailDigestSettings = {
        enabled: current.enabled,
        email: current.email,
        frequency: current.frequency,
        onlyWhenNew: current.onlyWhenNew,
        includeSalary: current.includeSalary,
        includeLocation: current.includeLocation,
        consentAt: current.consentAt,
        lastDigestAt: new Date().toISOString(),
      };

      set({ emailDigest: updated });
      get().saveToStorage();

      get().addEvent('DIGEST_SENT', 'Email digest sent');
    },

    /**
     * Gets new matches count for a specific alert rule.
     */
    getNewMatchesCount: function (ruleId: string): number {
      const state = get();
      const alertIndex = findAlertIndex(state.alerts, ruleId);

      if (alertIndex === -1) {
        return 0;
      }

      const alert = state.alerts[alertIndex];
      const seenJobs = state.seenByRule[ruleId];
      const seenSet: Set<string> = new Set();

      if (seenJobs !== undefined && seenJobs !== null) {
        for (let i = 0; i < seenJobs.length; i++) {
          seenSet.add(seenJobs[i]);
        }
      }

      let count = 0;
      for (let j = 0; j < alert.matches.length; j++) {
        if (!seenSet.has(alert.matches[j])) {
          count = count + 1;
        }
      }

      return count;
    },

    /**
     * Gets total new matches count across all enabled alerts.
     */
    getTotalNewMatches: function (): number {
      const state = get();
      let total = 0;

      for (let i = 0; i < state.alerts.length; i++) {
        const alert = state.alerts[i];
        if (!alert.enabled) {
          continue;
        }

        const seenJobs = state.seenByRule[alert.id];
        const seenSet: Set<string> = new Set();

        if (seenJobs !== undefined && seenJobs !== null) {
          for (let j = 0; j < seenJobs.length; j++) {
            seenSet.add(seenJobs[j]);
          }
        }

        for (let k = 0; k < alert.matches.length; k++) {
          if (!seenSet.has(alert.matches[k])) {
            total = total + 1;
          }
        }
      }

      return total;
    },

    /**
     * Marks all current matches as seen for an alert rule.
     */
    markMatchesSeen: function (ruleId: string): void {
      const state = get();
      const alertIndex = findAlertIndex(state.alerts, ruleId);

      if (alertIndex === -1) {
        return;
      }

      const alert = state.alerts[alertIndex];

      // Copy seenByRule and add all matches
      const newSeenByRule: Record<string, string[]> = {};
      const ruleIds = Object.keys(state.seenByRule);
      for (let i = 0; i < ruleIds.length; i++) {
        const key = ruleIds[i];
        const arr = state.seenByRule[key];
        const copy: string[] = [];
        for (let j = 0; j < arr.length; j++) {
          copy.push(arr[j]);
        }
        newSeenByRule[key] = copy;
      }

      // Merge matches into seen
      const existingSeen = newSeenByRule[ruleId];
      const seenSet: Set<string> = new Set();
      const merged: string[] = [];

      if (existingSeen !== undefined && existingSeen !== null) {
        for (let k = 0; k < existingSeen.length; k++) {
          if (!seenSet.has(existingSeen[k])) {
            merged.push(existingSeen[k]);
            seenSet.add(existingSeen[k]);
          }
        }
      }

      for (let m = 0; m < alert.matches.length; m++) {
        if (!seenSet.has(alert.matches[m])) {
          merged.push(alert.matches[m]);
          seenSet.add(alert.matches[m]);
        }
      }

      newSeenByRule[ruleId] = merged;

      set({ seenByRule: newSeenByRule });
      get().saveToStorage();
    },

    /**
     * Resets all alert digest state (Day 20).
     *
     * HOW IT WORKS:
     * 1. Reset email digest settings to defaults
     * 2. Clear events log
     * 3. Clear seen jobs
     * 4. Clear localStorage keys
     */
    resetAlertsDigest: function (): void {
      set({
        emailDigest: Object.assign({}, DEFAULT_EMAIL_DIGEST_SETTINGS),
        events: [],
        seenByRule: {},
      });

      // SSR guard
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(EMAIL_DIGEST_STORAGE_KEY);
          localStorage.removeItem(ALERT_EVENTS_STORAGE_KEY);
          localStorage.removeItem(ALERT_SEEN_JOBS_STORAGE_KEY);
        } catch (error) {
          console.error('[JobAlertsStore] Failed to clear digest storage:', error);
        }
      }
    },
  };
});
