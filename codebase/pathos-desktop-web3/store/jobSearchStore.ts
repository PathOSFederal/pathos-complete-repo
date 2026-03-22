/**
 * ============================================================================
 * JOB SEARCH STORE (Day 12 - Canonical Model Refactor)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This Zustand store manages all job search state for the PathOS application.
 * It handles:
 *   - Current filter selections (basic and advanced)
 *   - Saved searches (persist across sessions)
 *   - Job search results (fetched from API layer)
 *   - Loading/error states for async operations
 *   - Job alerts configuration
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │       UI        │ --> │   THIS FILE     │ --> │   API Layer    │
 * │   (Components)  │     │  (Zustand Store)│     │ (lib/api/*.ts) │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *                                │                        │
 *                                ▼                        ▼
 *                        ┌─────────────────┐     ┌────────────────┐
 *                        │  localStorage   │     │  Adapter Layer │
 *                        │  (persistence)  │     │  (lib/jobs/)   │
 *                        └─────────────────┘     └────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Manage filter state - stores all filter selections from UI
 * 2. Trigger searches - calls API layer when filters change or user searches
 * 3. Handle async states - loading, success, error for all async operations
 * 4. Persist preferences - save defaults and saved searches to localStorage
 * 5. Provide selectors - export selector functions for React components
 *
 * DAY 12 CHANGES - CANONICAL MODEL INTEGRATION:
 * ============================================================================
 * This store now uses CANONICAL job models from lib/jobs:
 *
 * BEFORE (Day 11):
 * - jobs: JobResult[] (raw mock format)
 * - selectedJob: JobResult | null
 *
 * AFTER (Day 12):
 * - jobs: JobCardModel[] (canonical format)
 * - selectedJob: JobDetailModel | null (canonical format with detail fields)
 *
 * FIELD MAPPING:
 * - job.role → job.title
 * - job.agency → job.organizationName
 * - job.grade → job.gradeLevel
 * - job.series → job.seriesCode
 * - job.location → job.locationDisplay (display) + job.location (structured)
 * - job.estTotalComp → job.estimatedTotalComp + job.payRange
 * - job.type → job.employmentType
 *
 * WHY THIS MATTERS:
 * 1. UI components now use stable, canonical field names
 * 2. Future data sources (USAJOBS) will map to same canonical format
 * 3. Type safety is improved with explicit optional fields
 * 4. Diagnostics are available for debugging (in development)
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import { create } from 'zustand';

// Import canonical job types from lib/jobs
import type { JobCardModel, JobDetailModel } from '@/lib/jobs';
import { mapToCanonicalJobCards, stripDiagnostics } from '@/lib/jobs';

// Import API layer functions
import {
  mockJobs,
  mockRecommendedRoles,
  fetchJobAlerts as apiFetchJobAlerts,
  fetchJobSearchResults,
  type JobSearchApiResult,
} from '@/lib/api/job-search';

// Import API response types
import type {
  JobAlertsResponse,
  JobAlertItem,
  RecommendedRoleItem,
} from '@/lib/api/types';

import { JOB_SEARCH_STORAGE_KEY } from '@/lib/storage-keys';

// ============================================================================
// LEGACY TYPE ALIASES (For backward compatibility during migration)
// ============================================================================

/**
 * @deprecated Use JobCardModel from @/lib/jobs instead
 * This alias exists for backward compatibility during migration.
 */
export type JobResult = JobCardModel;

/**
 * @deprecated Use RecommendedRoleItem from @/lib/api/types instead
 */
export interface RecommendedRole {
  id: number;
  title: string;
  location: string;
  matchPercent: number;
  tags: string[];
}

/**
 * @deprecated Use JobAlertsResponse from @/lib/api/types instead
 */
export type JobAlerts = JobAlertsResponse;

/**
 * @deprecated Use JobAlertItem from @/lib/api/types instead
 */
export type JobAlertSummaryItem = JobAlertItem;

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Represents the status of an async operation in the store.
 *
 * WHY THIS TYPE:
 * Having explicit status states makes it easy for UI to show:
 * - "idle": Initial state, nothing happening
 * - "loading": Show spinner, disable inputs
 * - "success": Show results
 * - "error": Show error message, offer retry
 *
 * EXAMPLE USAGE IN UI:
 * ```tsx
 * const status = useJobSearchStore(state => state.searchStatus);
 * if (status === "loading") return <Spinner />;
 * if (status === "error") return <ErrorMessage />;
 * return <JobResults />;
 * ```
 */
export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * ============================================================================
 * FILTER TYPE DEFINITIONS
 * ============================================================================
 * These types define the possible values for each filter field.
 * They ensure type safety when setting filters from UI components.
 */

// Types
export type AppointmentType = 'permanent' | 'term' | 'temporary' | 'detail';
export type WorkSchedule = 'full-time' | 'part-time' | 'intermittent' | 'shift';
export type PromotionPotentialFilter = 'none' | 'up-to-current' | 'at-or-above-target';
export type SupervisoryStatus = 'non-supervisory' | 'supervisory' | 'team-lead';
export type TeleworkPreference = 'remote-only' | 'remote-or-telework' | 'on-site-preferred' | 'any';
// TravelFrequency includes 'any' to represent "no preference" in the UI filter
// WHY 'any': The More Filters panel has an "Any" option that means "show all travel levels"
export type TravelFrequency = 'any' | 'none' | 'up-to-25' | 'up-to-50' | 'over-50';
export type ClearanceLevel = 'none' | 'public-trust' | 'secret' | 'ts' | 'ts-sci';
export type PositionSensitivity =
  | 'non-sensitive'
  | 'non-critical-sensitive'
  | 'critical-sensitive'
  | 'special-sensitive';
export type HiringPath = 'status' | 'veterans' | 'recent-graduates' | 'students' | 'public';
export type InternalExternal = 'agency-only' | 'gov-wide' | 'all-sources';
export type QualificationEmphasis = 'technical' | 'leadership' | 'policy-analysis' | 'any';
export type TrajectoryPreference = 'lateral' | 'promotion' | 'senior-track' | 'any';
export type RetirementImpactPreference = 'improve' | 'neutral' | 'avoid-negative' | 'any';
export type CompensationFocus = 'maximize-salary' | 'balance' | 'quality-of-life';

export interface JobSearchFilters {
  query: string;
  segment: 'federal' | 'military' | 'civilian';
  location: string | null;
  gradeBand: string | null;
  agency: string | null;
  workType: string | null;
  seriesCode: string | null;
  seriesCodes: string[];
  appointmentTypes: AppointmentType[];
  workSchedules: WorkSchedule[];
  promotionPotential: PromotionPotentialFilter | null;
  supervisoryStatuses: SupervisoryStatus[];
  teleworkPreference: TeleworkPreference | null;
  travelFrequency: TravelFrequency | null;
  clearanceLevels: ClearanceLevel[];
  positionSensitivities: PositionSensitivity[];
  hiringPaths: HiringPath[];
  internalExternal: InternalExternal | null;
  qualificationEmphasis: QualificationEmphasis | null;
  trajectoryPreference: TrajectoryPreference | null;
  retirementImpactPreference: RetirementImpactPreference | null;
  compensationFocus: CompensationFocus | null;
}

export interface JobAlertConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'off';
  minMatch: number;
  channel: 'in-app' | 'email';
}

/**
 * Represents a saved job search configuration.
 * 
 * DAY 15 UPDATE:
 * Added `signature` field for deduplication when creating alerts from jobs.
 * The signature is a unique string that identifies the search criteria.
 */
export interface SavedJobSearch {
  id: string;
  name: string;
  filters: JobSearchFilters;
  createdAt: string;
  isDefault: boolean;
  alerts: JobAlertConfig;
  /**
   * Optional signature for deduplication.
   * Format: "segment|series|title|gradeBand|telework|location|agency"
   * Used when creating alerts from similar jobs to prevent duplicates.
   * Day 15 addition.
   */
  signature?: string;
  /**
   * DAY 15: When alerts for this saved search were last viewed.
   * Used to compute "new" count - items created after this timestamp are new.
   * ISO 8601 timestamp or undefined if never viewed.
   */
  alertsLastSeenAt?: string;
}

// Initial state
const defaultFilters: JobSearchFilters = {
  query: '',
  segment: 'federal',
  location: null,
  gradeBand: null,
  agency: null,
  workType: null,
  seriesCode: null,
  seriesCodes: [],
  appointmentTypes: [],
  workSchedules: [],
  promotionPotential: null,
  supervisoryStatuses: [],
  teleworkPreference: null,
  travelFrequency: null,
  clearanceLevels: [],
  positionSensitivities: [],
  hiringPaths: [],
  internalExternal: null,
  qualificationEmphasis: null,
  trajectoryPreference: null,
  retirementImpactPreference: null,
  compensationFocus: null,
};

const defaultJobAlerts: JobAlertsResponse = {
  totalNew: 0,
  items: [],
};

/**
 * Convert mock jobs to canonical format for initial state.
 * This is done once at module load time.
 *
 * WHY HERE:
 * Zustand initial state must be synchronous, so we can't use async API.
 * We map mock data to canonical format immediately so UI starts with
 * properly typed data.
 */
function getInitialCanonicalJobs(): JobCardModel[] {
  const mapped = mapToCanonicalJobCards(mockJobs, 'mock');
  const canonical: JobCardModel[] = [];
  for (let i = 0; i < mapped.length; i++) {
    canonical.push(stripDiagnostics(mapped[i]));
  }
  return canonical;
}

/**
 * Convert mock recommended roles to canonical format.
 */
function getInitialRecommendedRoles(): RecommendedRoleItem[] {
  const roles: RecommendedRoleItem[] = [];
  for (let i = 0; i < mockRecommendedRoles.length; i++) {
    const raw = mockRecommendedRoles[i];
    roles.push({
      id: raw.id,
      title: raw.title,
      locationDisplay: raw.location,
      matchPercent: raw.matchPercent,
      tags: raw.tags
    });
  }
  return roles;
}

// Pre-compute initial canonical jobs
const initialCanonicalJobs = getInitialCanonicalJobs();
const initialRecommendedRoles = getInitialRecommendedRoles();

const defaultAlertConfig: JobAlertConfig = {
  enabled: false,
  frequency: 'off',
  minMatch: 80,
  channel: 'in-app',
};


// Helper function to create unique IDs
function createSavedSearchId(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// Helper to merge objects without spread operator
function mergeFilters(base: JobSearchFilters, updates: Partial<JobSearchFilters>): JobSearchFilters {
  const result = Object.assign({}, base);
  const keys = Object.keys(updates) as Array<keyof JobSearchFilters>;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (updates[key] !== undefined) {
      (result as unknown as Record<string, unknown>)[key] = updates[key];
    }
  }
  return result;
}

/**
 * ============================================================================
 * STORE STATE INTERFACE
 * ============================================================================
 * Defines all state managed by this store.
 *
 * DESIGN PRINCIPLE:
 * State is organized into logical groups:
 * - Job data: Results from searches
 * - Filters: Current filter selections
 * - Saved searches: Persisted filter configurations
 * - Async status: Loading/error states for async operations
 * - UI state: Component-level state that needs to be shared
 * - Job alerts: Notification configuration
 *
 * DAY 12 CHANGES:
 * - jobs: Now uses JobCardModel[] (canonical)
 * - selectedJob: Now uses JobDetailModel | null (canonical with detail fields)
 * - recommendedRoles: Uses RecommendedRoleItem (canonical)
 * - jobAlerts: Uses JobAlertsResponse (canonical)
 */
interface JobSearchState {
  // ============================================================================
  // JOB DATA (Canonical Models - Day 12)
  // Jobs fetched from API based on current filters
  // These use CANONICAL types from lib/jobs, never raw data
  // ============================================================================

  /**
   * Array of jobs matching current filters.
   * Uses canonical JobCardModel format.
   *
   * CANONICAL FIELDS (vs legacy):
   * - title (was: role)
   * - organizationName (was: agency)
   * - gradeLevel (was: grade)
   * - seriesCode (was: series)
   * - locationDisplay (was: location)
   * - estimatedTotalComp (was: estTotalComp)
   * - employmentType (was: type)
   */
  jobs: JobCardModel[];

  /**
   * Currently selected job for detail view.
   * Uses canonical JobDetailModel format (includes duties, qualifications, etc.)
   * Null when no job is selected.
   */
  selectedJob: JobDetailModel | null;

  /**
   * Recommended roles/career suggestions.
   * Uses canonical RecommendedRoleItem format.
   */
  recommendedRoles: RecommendedRoleItem[];

  // ============================================================================
  // FILTERS
  // Current filter state - all filters that affect search results
  // ============================================================================
  jobSearchFilters: JobSearchFilters;
  jobSearchDefaults: JobSearchFilters | null;

  // ============================================================================
  // SAVED SEARCHES
  // User-saved filter configurations that persist across sessions
  // ============================================================================
  savedJobSearches: SavedJobSearch[];
  activeSavedSearchId: string | null;

  // ============================================================================
  // ASYNC STATUS
  // Status and error tracking for async operations
  // ============================================================================

  /**
   * Overall search status for the main job search operation.
   * - "idle": No search has been performed yet
   * - "loading": Search is in progress
   * - "success": Search completed successfully
   * - "error": Search failed with an error
   */
  searchStatus: SearchStatus;

  /**
   * Error message when searchStatus is "error".
   * Null when there's no error.
   * Contains user-friendly error message to display in UI.
   */
  searchError: string | null;

  /**
   * Count of warnings returned from the last search.
   * Warnings indicate partial filter support or data quality issues.
   * Example: "Some jobs may not have clearance information"
   */
  searchWarnings: string[];

  /**
   * Total count of matching jobs from the last search.
   * Useful for pagination and "X results found" display.
   */
  searchTotal: number;

  // ============================================================================
  // UI STATE
  // Shared UI state that multiple components may need
  // ============================================================================
  seriesGuideOpen: boolean;
  isLoaded: boolean;
  /** @deprecated Use searchStatus instead. Kept for backward compatibility. */
  isJobSearchLoading: boolean;

  // ============================================================================
  // JOB ALERTS
  // Configuration for job alert notifications
  // Uses canonical JobAlertsResponse format (Day 12)
  // ============================================================================
  jobAlerts: JobAlertsResponse;
}

/**
 * ============================================================================
 * STORE ACTIONS INTERFACE
 * ============================================================================
 * Defines all actions that can modify the store state.
 *
 * ACTION NAMING CONVENTIONS:
 * - set*: Directly sets a value
 * - reset*: Restores to default values
 * - clear*: Removes/nullifies a value
 * - add*: Adds to a collection
 * - update*: Modifies an existing item
 * - delete*: Removes from a collection
 * - fetch*: Async operation that retrieves data
 * - search*: Triggers a search operation
 */
interface JobSearchActions {
  // ============================================================================
  // FILTER ACTIONS
  // Methods for updating the current filter state
  // ============================================================================

  /**
   * Merges partial filter updates into current filters.
   * Only updates the fields provided, leaving others unchanged.
   *
   * EXAMPLE:
   * setJobSearchFilters({ location: 'dc' }); // Only updates location
   * setJobSearchFilters({ query: 'analyst', gradeBand: 'gs14' }); // Updates both
   */
  setJobSearchFilters: (filters: Partial<JobSearchFilters>) => void;

  /**
   * Resets all filters to defaults (or saved defaults if set).
   * Clears activeSavedSearchId since we're no longer using a saved search.
   */
  resetJobSearchFilters: () => void;

  /**
   * Sets the default filters that will be used on reset/load.
   */
  setJobSearchDefaults: (filters: JobSearchFilters) => void;

  /**
   * Clears saved defaults, reverting to built-in defaults.
   */
  clearJobSearchDefaults: () => void;

  // ============================================================================
  // SAVED SEARCH ACTIONS
  // Methods for managing saved search configurations
  // ============================================================================

  /**
   * Saves the current filter configuration as a saved search.
   * If a search with the same name exists, it will be updated.
   *
   * @param name - Optional name for the saved search
   * @returns The created/updated SavedJobSearch or null on failure
   */
  saveCurrentSearch: (name?: string) => SavedJobSearch | null;

  /**
   * Adds a new saved search with specified configuration.
   */
  addSavedJobSearch: (search: Omit<SavedJobSearch, 'id' | 'createdAt'>) => void;

  /**
   * Updates an existing saved search.
   */
  updateSavedJobSearch: (id: string, updates: Partial<SavedJobSearch>) => void;

  /**
   * Deletes a saved search by ID.
   * If the deleted search was active, clears activeSavedSearchId.
   *
   * @returns The name of the deleted search (for toast notification)
   */
  deleteSavedJobSearch: (id: string) => string | null;

  /**
   * Sets a saved search as the default (used on load).
   */
  setDefaultSavedJobSearch: (id: string | null) => void;

  /**
   * Creates a saved search with alerts enabled.
   * Used by "Save this search & enable alerts" flow.
   * 
   * DAY 15 ADDITION:
   * This action combines saving a search and enabling alerts in one step,
   * providing a smoother UX for users who want immediate notifications.
   * 
   * @param name - Name for the saved search
   * @param frequency - Alert frequency ('daily' | 'weekly')
   * @param signature - Optional signature for deduplication
   * @returns The created SavedJobSearch or null if duplicate signature exists
   */
  saveSearchWithAlerts: (
    name: string,
    frequency: 'daily' | 'weekly',
    signature?: string
  ) => SavedJobSearch | null;

  /**
   * Checks if a saved search with the given signature already exists.
   * Used to prevent duplicate "similar jobs" alerts.
   * 
   * DAY 15 ADDITION.
   * 
   * @param signature - Signature string to check
   * @returns true if a saved search with this signature exists
   */
  hasSignature: (signature: string) => boolean;

  /**
   * Gets all signatures from existing saved searches.
   * Used for bulk duplicate checking.
   * 
   * DAY 15 ADDITION.
   * 
   * @returns Array of signature strings
   */
  getAllSignatures: () => string[];

  /**
   * DAY 15: Marks alerts as seen for a saved search.
   * Sets alertsLastSeenAt to current timestamp.
   * Used to compute "new" badge count.
   * 
   * @param searchId - ID of the saved search to mark as seen
   */
  markAlertsAsSeen: (searchId: string) => void;

  /**
   * DAY 15: Marks alerts as seen for all saved searches.
   * Called when the Job Alerts widget is viewed.
   */
  markAllAlertsAsSeen: () => void;

  /**
   * DAY 15: Gets the computed "new" count for job alerts.
   * Compares alert item createdAt to alertsLastSeenAt for each saved search.
   * 
   * @returns Number of new alert items
   */
  getNewAlertsCount: () => number;

  /**
   * Applies a saved search's filters and triggers a search.
   * Sets activeSavedSearchId to track which saved search is active.
   */
  applySavedJobSearch: (id: string) => void;

  /**
   * Sets the active saved search ID (for UI tracking).
   */
  setActiveSavedSearchId: (id: string | null) => void;

  // ============================================================================
  // UI ACTIONS
  // Methods for managing shared UI state
  // ============================================================================

  /**
   * Opens/closes the series guide modal.
   */
  setSeriesGuideOpen: (open: boolean) => void;

  // ============================================================================
  // JOB SEARCH ACTIONS
  // Methods for executing searches and handling results
  // ============================================================================

  /**
   * Executes a job search with current filters.
   *
   * HOW IT WORKS:
   * 1. Sets searchStatus to "loading"
   * 2. Clears any previous error
   * 3. Calls API with ALL current filters
   * 4. On success: Updates jobs, status="success", stores total and warnings
   * 5. On error: Sets status="error" and stores error message
   *
   * DEV-ONLY ERROR TESTING:
   * Include "__FAIL__" in query to simulate an error:
   * setJobSearchFilters({ query: "__FAIL__ analyst" });
   * searchJobs(); // Will trigger error state
   */
  searchJobs: () => Promise<void>;

  /**
   * Clears the current error state.
   * Useful when user dismisses an error message.
   */
  clearSearchError: () => void;

  // ============================================================================
  // JOB ALERTS ACTIONS
  // Methods for managing job alert notifications
  // ============================================================================

  /**
   * Directly sets job alerts state.
   */
  setJobAlerts: (alerts: JobAlertsResponse) => void;

  /**
   * Sets the currently selected job for detail view.
   * Pass null to deselect.
   */
  setSelectedJob: (job: JobDetailModel | null) => void;

  /**
   * Fetches job alerts from API.
   */
  fetchJobAlerts: () => Promise<void>;

  // ============================================================================
  // INITIALIZATION ACTIONS
  // Methods for store setup and persistence
  // ============================================================================

  /**
   * Loads saved state from localStorage (SSR-safe).
   * Called on initial client-side mount.
   */
  loadFromStorage: () => void;

  /**
   * Persists current state to localStorage (SSR-safe).
   * Called after state changes that should persist.
   */
  saveToStorage: () => void;

  // ============================================================================
  // RESET ACTIONS
  // Methods for clearing state (used by "Delete All Local Data")
  // ============================================================================

  /**
   * Resets all job search state to initial defaults.
   * Clears localStorage, resets filters, saved searches, and alerts.
   */
  resetJobSearch: () => void;
}

export type JobSearchStore = JobSearchState & JobSearchActions;

/**
 * ============================================================================
 * SELECTORS
 * ============================================================================
 * Selector functions for reading state from the store.
 *
 * WHY USE SELECTORS:
 * 1. Encapsulation: UI doesn't need to know state structure
 * 2. Optimization: Zustand only re-renders when selected value changes
 * 3. Consistency: Single source of truth for state access patterns
 *
 * EXAMPLE USAGE:
 * ```tsx
 * const jobs = useJobSearchStore(selectJobs);
 * const status = useJobSearchStore(selectSearchStatus);
 * ```
 */

// ============================================================================
// JOB DATA SELECTORS (Canonical Models - Day 12)
// ============================================================================

/**
 * Selector for job search results.
 * Returns canonical JobCardModel[] array.
 */
export const selectJobs = function (state: JobSearchStore): JobCardModel[] {
  return state.jobs;
};

/**
 * Selector for currently selected job.
 * Returns canonical JobDetailModel or null.
 */
export const selectSelectedJob = function (state: JobSearchStore): JobDetailModel | null {
  return state.selectedJob;
};

/**
 * Selector for recommended roles.
 * Returns canonical RecommendedRoleItem[] array.
 */
export const selectRecommendedRoles = function (state: JobSearchStore): RecommendedRoleItem[] {
  return state.recommendedRoles;
};

// ============================================================================
// FILTER SELECTORS
// ============================================================================

export const selectJobSearchFilters = function (state: JobSearchStore): JobSearchFilters {
  return state.jobSearchFilters;
};

// ============================================================================
// SAVED SEARCH SELECTORS
// ============================================================================

export const selectSavedJobSearches = function (state: JobSearchStore): SavedJobSearch[] {
  return state.savedJobSearches;
};

export const selectActiveSavedSearchId = function (state: JobSearchStore): string | null {
  return state.activeSavedSearchId;
};

// ============================================================================
// ASYNC STATUS SELECTORS
// ============================================================================

/**
 * Selector for the current search status.
 * Use this to determine what UI state to show (loading, error, results).
 */
export const selectSearchStatus = function (state: JobSearchStore): SearchStatus {
  return state.searchStatus;
};

/**
 * Selector for the current search error message.
 * Only relevant when searchStatus is "error".
 */
export const selectSearchError = function (state: JobSearchStore): string | null {
  return state.searchError;
};

/**
 * Selector for any warnings from the last search.
 * Warnings don't prevent results but indicate limitations.
 */
export const selectSearchWarnings = function (state: JobSearchStore): string[] {
  return state.searchWarnings;
};

/**
 * Selector for total results count.
 */
export const selectSearchTotal = function (state: JobSearchStore): number {
  return state.searchTotal;
};

// ============================================================================
// UI STATE SELECTORS
// ============================================================================

export const selectSeriesGuideOpen = function (state: JobSearchStore): boolean {
  return state.seriesGuideOpen;
};

export const selectIsLoaded = function (state: JobSearchStore): boolean {
  return state.isLoaded;
};

/** @deprecated Use selectSearchStatus instead */
export const selectIsJobSearchLoading = function (state: JobSearchStore): boolean {
  return state.isJobSearchLoading;
};

// ============================================================================
// JOB ALERTS SELECTORS
// ============================================================================

export const selectJobAlerts = function (state: JobSearchStore): JobAlertsResponse {
  return state.jobAlerts;
};

// ============================================================================
// CREATE THE STORE
// ============================================================================
export const useJobSearchStore = create<JobSearchStore>(function (set, get) {
  return {
    // ========================================================================
    // INITIAL STATE (Canonical Models - Day 12)
    // ========================================================================

    // Job data - start with canonical mock data for immediate display
    // Will be replaced when searchJobs() is called
    // Note: Uses pre-computed canonical jobs (not raw mockJobs)
    jobs: initialCanonicalJobs,
    selectedJob: null,
    recommendedRoles: initialRecommendedRoles,

    // Filters - start with defaults
    jobSearchFilters: Object.assign({}, defaultFilters),
    jobSearchDefaults: null,

    // Saved searches - empty until loaded from storage
    savedJobSearches: [],
    activeSavedSearchId: null,

    // Async status - start idle with no errors
    searchStatus: 'idle',
    searchError: null,
    searchWarnings: [],
    searchTotal: initialCanonicalJobs.length,

    // UI state
    seriesGuideOpen: false,
    isLoaded: false,
    /** @deprecated Use searchStatus instead */
    isJobSearchLoading: false,

    // Job alerts - empty until fetched
    jobAlerts: Object.assign({}, defaultJobAlerts),

    // ========================================================================
    // FILTER ACTIONS
    // ========================================================================

    /**
     * Merges partial filter updates into current filters.
     *
     * HOW IT WORKS:
     * 1. Get current filter state
     * 2. Merge provided updates (only updates specified fields)
     * 3. Clear activeSavedSearchId (we're no longer using a saved search)
     * 4. Persist to storage
     *
     * NOTE: This does NOT trigger a search automatically.
     * UI should call searchJobs() after setting filters if immediate
     * search is desired.
     */
    setJobSearchFilters: function (filters) {
      const state = get();
      set({
        jobSearchFilters: mergeFilters(state.jobSearchFilters, filters),
        activeSavedSearchId: null,
      });
      get().saveToStorage();
    },

    /**
     * Resets filters to defaults (or saved defaults if set).
     * Clears activeSavedSearchId since we're not using a saved search.
     */
    resetJobSearchFilters: function () {
      const state = get();
      const newFilters = state.jobSearchDefaults
        ? mergeFilters(Object.assign({}, defaultFilters), state.jobSearchDefaults)
        : Object.assign({}, defaultFilters);
      set({
        jobSearchFilters: newFilters,
        activeSavedSearchId: null,
      });
    },

    /**
     * Sets the default filters used on reset/load.
     */
    setJobSearchDefaults: function (filters) {
      set({ jobSearchDefaults: Object.assign({}, filters) });
      get().saveToStorage();
    },

    /**
     * Clears saved defaults, reverting to built-in defaults.
     */
    clearJobSearchDefaults: function () {
      set({ jobSearchDefaults: null });
      get().saveToStorage();
    },

    // ========================================================================
    // SAVED SEARCH ACTIONS
    // ========================================================================

    /**
     * Saves the current filter configuration as a saved search.
     *
     * HOW IT WORKS:
     * 1. Generate a name if not provided (uses segment + query)
     * 2. Check if a search with this name already exists
     * 3. If exists: update the existing search's filters
     * 4. If new: create a new saved search entry
     * 5. Persist to storage
     *
     * @param name - Optional name for the saved search
     * @returns The created/updated SavedJobSearch or null on failure
     */
    saveCurrentSearch: function (name) {
      const state = get();

      // Generate a default name if not provided
      const searchName =
        name ||
        'Search – ' + state.jobSearchFilters.segment + ' – ' + (state.jobSearchFilters.query || 'All');

      // Check if a search with this name already exists
      let existing: SavedJobSearch | undefined;
      for (let i = 0; i < state.savedJobSearches.length; i++) {
        if (state.savedJobSearches[i].name === searchName) {
          existing = state.savedJobSearches[i];
          break;
        }
      }

      // If exists, update the existing search
      if (existing) {
        const updatedSearches: SavedJobSearch[] = [];
        for (let j = 0; j < state.savedJobSearches.length; j++) {
          const s = state.savedJobSearches[j];
          if (s.id === existing.id) {
            updatedSearches.push(
              Object.assign({}, s, { filters: Object.assign({}, state.jobSearchFilters) }),
            );
          } else {
            updatedSearches.push(s);
          }
        }
        set({ savedJobSearches: updatedSearches });
        get().saveToStorage();
        return Object.assign({}, existing, { filters: Object.assign({}, state.jobSearchFilters) });
      }

      // Create a new saved search
      const newSearch: SavedJobSearch = {
        id: createSavedSearchId(),
        name: searchName,
        filters: Object.assign({}, state.jobSearchFilters),
        createdAt: new Date().toISOString(),
        isDefault: false,
        alerts: Object.assign({}, defaultAlertConfig),
      };

      const newSearches: SavedJobSearch[] = [];
      for (let k = 0; k < state.savedJobSearches.length; k++) {
        newSearches.push(state.savedJobSearches[k]);
      }
      newSearches.push(newSearch);

      set({ savedJobSearches: newSearches });
      get().saveToStorage();
      return newSearch;
    },

    addSavedJobSearch: function (search) {
      const state = get();
      const newSearch: SavedJobSearch = Object.assign({}, search, {
        id: createSavedSearchId(),
        createdAt: new Date().toISOString(),
      }) as SavedJobSearch;

      const newSearches: SavedJobSearch[] = [];
      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const s = state.savedJobSearches[i];
        if (search.isDefault) {
          newSearches.push(Object.assign({}, s, { isDefault: false }));
        } else {
          newSearches.push(s);
        }
      }
      newSearches.push(newSearch);

      set({ savedJobSearches: newSearches });

      if (search.isDefault) {
        set({ jobSearchDefaults: Object.assign({}, search.filters) });
      }
      get().saveToStorage();
    },

    updateSavedJobSearch: function (id, updates) {
      const state = get();
      const newSearches: SavedJobSearch[] = [];
      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const s = state.savedJobSearches[i];
        if (s.id === id) {
          newSearches.push(Object.assign({}, s, updates));
        } else if (updates.isDefault) {
          newSearches.push(Object.assign({}, s, { isDefault: false }));
        } else {
          newSearches.push(s);
        }
      }
      set({ savedJobSearches: newSearches });
      get().saveToStorage();
    },

    /**
     * Deletes a saved search by ID.
     *
     * HOW IT WORKS:
     * 1. Find the search to delete (to get its name for toast)
     * 2. Filter it out of the savedJobSearches array
     * 3. If deleted search was active, clear activeSavedSearchId
     * 4. Persist changes to storage
     * 5. Return the deleted search name for UI feedback
     *
     * @returns The name of the deleted search, or null if not found
     */
    deleteSavedJobSearch: function (id) {
      const state = get();
      let deletedSearchName: string | null = null;
      const newSearches: SavedJobSearch[] = [];

      // Find and remove the search, capturing its name
      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const search = state.savedJobSearches[i];
        if (search.id === id) {
          deletedSearchName = search.name;
        } else {
          newSearches.push(search);
        }
      }

      // Clear active ID if we deleted the active search
      const newActiveId = state.activeSavedSearchId === id ? null : state.activeSavedSearchId;

      set({
        savedJobSearches: newSearches,
        activeSavedSearchId: newActiveId,
      });

      get().saveToStorage();

      // Return the deleted name so UI can show confirmation toast
      return deletedSearchName;
    },

    setDefaultSavedJobSearch: function (id) {
      const state = get();
      const newSearches: SavedJobSearch[] = [];
      let newDefaults: JobSearchFilters | null = null;

      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const s = state.savedJobSearches[i];
        const isDefault = s.id === id;
        newSearches.push(Object.assign({}, s, { isDefault: isDefault }));
        if (isDefault) {
          newDefaults = Object.assign({}, s.filters);
        }
      }

      set({ savedJobSearches: newSearches, jobSearchDefaults: newDefaults });
      get().saveToStorage();
    },

    /**
     * Creates a saved search with alerts enabled.
     * 
     * DAY 15 ADDITION:
     * Combined action for "Save this search & enable alerts" flow.
     * 
     * HOW IT WORKS:
     * 1. Check for duplicate signature (if provided)
     * 2. Create saved search with current filters
     * 3. Enable alerts with specified frequency
     * 4. Persist to storage
     * 
     * @param name - Name for the saved search
     * @param frequency - Alert frequency
     * @param signature - Optional signature for deduplication
     * @returns Created SavedJobSearch or null if duplicate
     */
    saveSearchWithAlerts: function (name, frequency, signature) {
      const state = get();

      // Check for duplicate signature
      if (signature !== undefined && signature !== null && signature !== '') {
        for (let i = 0; i < state.savedJobSearches.length; i++) {
          const existing = state.savedJobSearches[i];
          if (existing.signature === signature) {
            // Duplicate found
            return null;
          }
        }
      }

      // Create new saved search with alerts enabled
      const newSearch: SavedJobSearch = {
        id: createSavedSearchId(),
        name: name,
        filters: Object.assign({}, state.jobSearchFilters),
        createdAt: new Date().toISOString(),
        isDefault: false,
        alerts: {
          enabled: true,
          frequency: frequency,
          minMatch: 80,
          channel: 'email', // Day 15: Tier 1 = email digests
        },
        signature: signature,
      };

      // Add to saved searches
      const newSearches: SavedJobSearch[] = [];
      for (let i = 0; i < state.savedJobSearches.length; i++) {
        newSearches.push(state.savedJobSearches[i]);
      }
      newSearches.push(newSearch);

      set({ savedJobSearches: newSearches });
      get().saveToStorage();

      return newSearch;
    },

    /**
     * Checks if a saved search with the given signature exists.
     * 
     * DAY 15 ADDITION:
     * Used to prevent duplicate "similar jobs" alerts.
     */
    hasSignature: function (signature) {
      const state = get();

      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const search = state.savedJobSearches[i];
        if (search.signature !== undefined && search.signature !== null) {
          if (search.signature === signature) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Gets all signatures from existing saved searches.
     * 
     * DAY 15 ADDITION:
     * Used for bulk duplicate checking.
     */
    getAllSignatures: function () {
      const state = get();
      const signatures: string[] = [];

      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const search = state.savedJobSearches[i];
        if (search.signature !== undefined && search.signature !== null && search.signature !== '') {
          signatures.push(search.signature);
        }
      }

      return signatures;
    },

    /**
     * DAY 15: Marks alerts as seen for a saved search.
     * 
     * HOW IT WORKS:
     * 1. Find the saved search by ID
     * 2. Set alertsLastSeenAt to current timestamp
     * 3. Persist to storage
     * 
     * WHY THIS MATTERS:
     * The "new" badge should only show items that appeared since
     * the user last viewed the alerts. This provides the timestamp.
     */
    markAlertsAsSeen: function (searchId: string) {
      const state = get();
      const newSearches: SavedJobSearch[] = [];
      const now = new Date().toISOString();

      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const search = state.savedJobSearches[i];
        if (search.id === searchId) {
          newSearches.push(Object.assign({}, search, {
            alertsLastSeenAt: now,
          }));
        } else {
          newSearches.push(search);
        }
      }

      set({ savedJobSearches: newSearches });
      get().saveToStorage();
    },

    /**
     * DAY 15: Marks alerts as seen for all saved searches.
     * 
     * HOW IT WORKS:
     * Updates alertsLastSeenAt for all saved searches at once.
     * Called when the Job Alerts widget is expanded/viewed.
     */
    markAllAlertsAsSeen: function () {
      const state = get();
      const newSearches: SavedJobSearch[] = [];
      const now = new Date().toISOString();

      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const search = state.savedJobSearches[i];
        // Only update searches that have alerts enabled
        if (search.alerts && search.alerts.enabled) {
          newSearches.push(Object.assign({}, search, {
            alertsLastSeenAt: now,
          }));
        } else {
          newSearches.push(search);
        }
      }

      set({ savedJobSearches: newSearches });
      get().saveToStorage();
    },

    /**
     * DAY 15: Gets the computed "new" count for job alerts.
     * 
     * HOW IT WORKS:
     * 1. Get all saved searches with alerts enabled
     * 2. For each, compare alert item createdAt to alertsLastSeenAt
     * 3. Count items where createdAt > alertsLastSeenAt
     * 4. If alertsLastSeenAt is null, all items are "new"
     * 
     * DESIGN DECISION:
     * We compute this on the fly rather than storing it because:
     * - It's derived state (can always be recomputed)
     * - Avoids stale count issues
     * - jobAlerts.items has the createdAt we need
     * 
     * @returns Number of new alert items
     */
    getNewAlertsCount: function (): number {
      const state = get();
      let newCount = 0;

      // Build a map of searchId -> lastSeenAt
      const lastSeenMap: Record<string, string | undefined> = {};
      for (let i = 0; i < state.savedJobSearches.length; i++) {
        const search = state.savedJobSearches[i];
        if (search.alerts && search.alerts.enabled) {
          lastSeenMap[search.id] = search.alertsLastSeenAt;
        }
      }

      // Count new items
      for (let j = 0; j < state.jobAlerts.items.length; j++) {
        const item = state.jobAlerts.items[j];
        const searchId = item.savedSearchId;
        
        // Skip items without a saved search ID
        if (searchId === undefined || searchId === null || searchId === '') {
          continue;
        }

        // Check if this saved search has alerts enabled
        if (lastSeenMap[searchId] === undefined) {
          // Search not in map = alerts not enabled or search doesn't exist
          continue;
        }

        const lastSeen = lastSeenMap[searchId];
        
        // Get the item's created timestamp
        const itemCreated = item.createdAtISO;
        if (itemCreated === undefined || itemCreated === null || itemCreated === '') {
          // No created timestamp, count as new
          newCount = newCount + 1;
          continue;
        }

        if (lastSeen === undefined || lastSeen === null || lastSeen === '') {
          // Never seen, all items are new
          newCount = newCount + 1;
          continue;
        }

        // Compare timestamps
        if (itemCreated > lastSeen) {
          newCount = newCount + 1;
        }
      }

      return newCount;
    },

    /**
     * Applies a saved search's filters and triggers a search.
     *
     * HOW IT WORKS:
     * 1. Find the saved search by ID
     * 2. Apply its filters to jobSearchFilters
     * 3. Set activeSavedSearchId to track which saved search is active
     * 4. Trigger a search with the new filters
     *
     * This ensures that when user selects a saved search from dropdown,
     * the results are immediately updated to match those filters.
     */
    applySavedJobSearch: function (id) {
      const state = get();
      let search: SavedJobSearch | undefined;

      // Find the saved search by ID
      for (let i = 0; i < state.savedJobSearches.length; i++) {
        if (state.savedJobSearches[i].id === id) {
          search = state.savedJobSearches[i];
          break;
        }
      }

      if (search) {
        // Apply the saved search's filters
        set({
          jobSearchFilters: mergeFilters(Object.assign({}, defaultFilters), search.filters),
          activeSavedSearchId: id,
        });

        // Trigger a search with the new filters
        // This ensures results are immediately updated
        get().searchJobs();
      }
    },

    setActiveSavedSearchId: function (id) {
      set({ activeSavedSearchId: id });
    },

    // UI actions
    setSeriesGuideOpen: function (open) {
      set({ seriesGuideOpen: open });
    },

    // ========================================================================
    // JOB SEARCH ACTIONS
    // ========================================================================

    /**
     * Executes a job search with ALL current filters.
     *
     * HOW IT WORKS:
     * 1. Set status to "loading" and clear previous error
     * 2. Get all current filters from state
     * 3. Call API with complete filter object (not just basic filters!)
     * 4. On success:
     *    - Update jobs array with results
     *    - Store total count and any warnings
     *    - Set status to "success"
     * 5. On error:
     *    - Set status to "error"
     *    - Store error message for UI display
     *
     * IMPORTANT:
     * We pass ALL filters to the API, not just basic ones.
     * This ensures advanced filters (appointment types, clearance, etc.)
     * actually affect the search results.
     *
     * DEV-ONLY ERROR TESTING:
     * Include "__FAIL__" in query to trigger an error.
     * This is useful for testing the error UI state.
     */
    searchJobs: function () {
      const state = get();
      const filters = state.jobSearchFilters;

      // ======================================================================
      // STEP 1: Set loading state
      // Clear any previous error before starting new search
      // ======================================================================
      set({
        searchStatus: 'loading',
        searchError: null,
        isJobSearchLoading: true, // Backward compatibility
      });

      // ======================================================================
      // STEP 2: Call API with ALL filters
      // The API layer handles filtering with the pure filter function
      // We pass the complete filter object so all advanced filters work
      // ======================================================================
      return fetchJobSearchResults(filters)
        .then(function (result: JobSearchApiResult) {
          // ==================================================================
          // STEP 3: Handle success
          // Update jobs with results and store metadata
          // ==================================================================
          set({
            jobs: result.jobs,
            searchTotal: result.total,
            searchWarnings: result.warnings,
            searchStatus: 'success',
            searchError: null,
            isJobSearchLoading: false, // Backward compatibility
          });
        })
        .catch(function (error: Error) {
          // ==================================================================
          // STEP 4: Handle error
          // Store error message and set error status
          // Jobs array is NOT cleared - keep showing previous results
          // ==================================================================
          let errorMessage = 'An error occurred while searching for jobs.';
          if (error && error.message) {
            errorMessage = error.message;
          }

          set({
            searchStatus: 'error',
            searchError: errorMessage,
            isJobSearchLoading: false, // Backward compatibility
          });

          // Log error for debugging (but don't throw - we've handled it)
          console.error('[JobSearchStore] Search error:', error);
        });
    },

    /**
     * Clears the current search error.
     * Use this when user dismisses an error notification.
     */
    clearSearchError: function () {
      set({
        searchError: null,
        // If there was an error but user dismissed it, go back to idle
        // (or success if we have results)
        searchStatus: get().jobs.length > 0 ? 'success' : 'idle',
      });
    },

    // Job alerts actions
    setJobAlerts: function (alerts) {
      set({ jobAlerts: alerts });
    },

    /**
     * Sets the currently selected job for detail view.
     * Day 12: Uses canonical JobDetailModel.
     */
    setSelectedJob: function (job) {
      set({ selectedJob: job });
    },

    fetchJobAlerts: function () {
      const state = get();
      return apiFetchJobAlerts().then(function (alertsResponse) {
        if (state.savedJobSearches.length === 0) {
          set({ jobAlerts: alertsResponse });
          return;
        }

        // Link alerts to saved searches
        const items: JobAlertItem[] = [];
        for (let i = 0; i < alertsResponse.items.length; i++) {
          const item = alertsResponse.items[i];
          const searchIndex = i % state.savedJobSearches.length;
          const search = state.savedJobSearches[searchIndex];
          items.push(
            Object.assign({}, item, {
              savedSearchId: search ? search.id : '',
              savedSearchName: search ? search.name : item.savedSearchName,
            }),
          );
        }

        set({
          jobAlerts: {
            totalNew: alertsResponse.totalNew,
            items: items,
          },
        });
      });
    },

    // Storage (SSR-safe)
    loadFromStorage: function () {
      // Guard against SSR - localStorage is not available on the server
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const stored = localStorage.getItem(JOB_SEARCH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const newState: Partial<JobSearchState> = {};

          if (parsed.jobSearchDefaults) {
            newState.jobSearchDefaults = parsed.jobSearchDefaults;
            newState.jobSearchFilters = mergeFilters(
              Object.assign({}, defaultFilters),
              parsed.jobSearchDefaults,
            );
          }

          if (parsed.savedJobSearches) {
            newState.savedJobSearches = parsed.savedJobSearches;

            let defaultSearch: SavedJobSearch | undefined;
            for (let i = 0; i < parsed.savedJobSearches.length; i++) {
              if (parsed.savedJobSearches[i].isDefault) {
                defaultSearch = parsed.savedJobSearches[i];
                break;
              }
            }

            if (defaultSearch) {
              newState.jobSearchFilters = mergeFilters(
                Object.assign({}, defaultFilters),
                defaultSearch.filters,
              );
              newState.activeSavedSearchId = defaultSearch.id;
            }
          }

          newState.isLoaded = true;
          set(newState);
        } else {
          set({ isLoaded: true });
        }

        // Load jobs via API after storage is loaded
        get().searchJobs();
      } catch (error) {
        console.error('Failed to load job search preferences:', error);
        set({ isLoaded: true });
        // Still attempt to load jobs even on storage error
        get().searchJobs();
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
          localStorage.setItem(
            JOB_SEARCH_STORAGE_KEY,
            JSON.stringify({
              jobSearchDefaults: state.jobSearchDefaults,
              savedJobSearches: state.savedJobSearches,
            }),
          );
        } catch (error) {
          console.error('Failed to save job search preferences:', error);
        }
      }
    },

    // ========================================================================
    // RESET ACTIONS
    // ========================================================================

    /**
     * Resets all job search state to initial defaults.
     *
     * WHEN TO USE:
     * - "Delete All Local Data" feature
     * - Logging out (if implemented)
     * - Factory reset scenarios
     *
     * HOW IT WORKS:
     * 1. Reset all state to initial values
     * 2. Clear localStorage for this store
     * 3. Trigger a fresh search with default filters
     */
    resetJobSearch: function () {
      set({
        // Job data - reset to canonical mock data (Day 12)
        jobs: initialCanonicalJobs,
        selectedJob: null,
        recommendedRoles: initialRecommendedRoles,

        // Filters - reset to defaults
        jobSearchFilters: Object.assign({}, defaultFilters),
        jobSearchDefaults: null,

        // Saved searches - clear all
        savedJobSearches: [],
        activeSavedSearchId: null,

        // Async status - reset to idle
        searchStatus: 'idle',
        searchError: null,
        searchWarnings: [],
        searchTotal: initialCanonicalJobs.length,

        // UI state
        seriesGuideOpen: false,
        isJobSearchLoading: false,

        // Job alerts - reset to defaults
        jobAlerts: Object.assign({}, defaultJobAlerts),
      });

      // Clear persisted storage
      get().saveToStorage();

      // Trigger a fresh search with default filters
      get().searchJobs();
    },
  };
});

/**
 * ============================================================================
 * RE-EXPORTS (Day 12 - Canonical Types)
 * ============================================================================
 * Export canonical types for convenience.
 * Consumers can import everything from this store file.
 *
 * DAY 12 MIGRATION:
 * - Use JobCardModel instead of JobResult for job cards
 * - Use JobDetailModel for job details (selected job)
 * - Use JobAlertsResponse instead of JobAlerts
 * - Use JobAlertItem instead of JobAlertSummaryItem
 * - Use RecommendedRoleItem instead of RecommendedRole
 */

// Re-export canonical types from lib/jobs
export type { JobCardModel, JobDetailModel } from '@/lib/jobs';

// Re-export API types
export type { JobAlertsResponse, JobAlertItem, RecommendedRoleItem } from '@/lib/api/types';

/**
 * ============================================================================
 * LEGACY FORMAT HELPER (Day 12 - Backward Compatibility)
 * ============================================================================
 * Helper function to convert canonical JobCardModel to legacy field names.
 * Use this in pages/components that haven't been updated to canonical names yet.
 *
 * USAGE:
 * ```typescript
 * const jobs = useJobSearchStore(state => state.jobs);
 * const legacyJobs = jobs.map(toLegacyJobFormat);
 * // Now legacyJobs has .role, .agency, .grade, etc.
 * ```
 *
 * @deprecated Update components to use canonical field names instead
 */
export interface LegacyJobFormat {
  id: number;
  role: string;
  series: string;
  grade: string;
  location: string;
  agency: string;
  type: string;
  estTotalComp: number;
  retirementImpact: string;
  matchPercent: number;
}

/**
 * Converts a canonical JobCardModel to legacy field format.
 * @deprecated Update components to use canonical field names instead
 */
export function toLegacyJobFormat(job: JobCardModel): LegacyJobFormat {
  return {
    id: typeof job.id === 'string' ? parseInt(job.id, 10) || 0 : 0,
    role: job.title,
    series: job.seriesCode || '',
    grade: job.gradeLevel || '',
    location: job.locationDisplay || '',
    agency: job.organizationName || '',
    type: job.employmentType || '',
    estTotalComp: job.estimatedTotalComp || 0,
    retirementImpact: job.retirementImpact || 'No change',
    matchPercent: job.matchPercent || 0,
  };
}

/**
 * Converts an array of canonical jobs to legacy format.
 * @deprecated Update components to use canonical field names instead
 */
export function toLegacyJobsFormat(jobs: JobCardModel[]): LegacyJobFormat[] {
  const result: LegacyJobFormat[] = [];
  for (let i = 0; i < jobs.length; i++) {
    result.push(toLegacyJobFormat(jobs[i]));
  }
  return result;
}
