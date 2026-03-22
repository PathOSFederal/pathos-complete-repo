/**
 * ============================================================================
 * SAVED JOBS STORE (Day 15 - Saved Jobs Feature)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This Zustand store manages the user's saved jobs collection. When a user
 * clicks "Save job" on a job listing, that job is added to this store and
 * persisted to localStorage. The user can then view their saved jobs in
 * the "Saved" tab of the Job Search page.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │       UI        │ --> │   THIS FILE     │ --> │  localStorage  │
 * │  (Selected Job  │     │  (Zustand Store)│     │  (persistence) │
 * │   Panel, Saved  │     │                 │     │                │
 * │   Jobs Tab)     │     │                 │     │                │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Store saved jobs - maintains array of saved job summaries
 * 2. Toggle saved state - add/remove jobs from saved list
 * 3. Check saved status - determine if a job is already saved
 * 4. Persist to localStorage - saved jobs survive page refresh
 * 5. Provide reset action - for "Delete All Local Data" feature
 *
 * HOUSE RULES COMPLIANCE (Day 15):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 15 - Saved Jobs Feature
 * ============================================================================
 */

import { create } from 'zustand';
import { SAVED_JOBS_STORAGE_KEY } from '@/lib/storage-keys';

// Re-export for convenience
export { SAVED_JOBS_STORAGE_KEY };

// ============================================================================
// SAVED JOB TYPE
// ============================================================================

/**
 * Represents a saved job summary.
 * 
 * DESIGN RATIONALE:
 * We store a subset of job data rather than the full job model because:
 * 1. localStorage has size limits (~5MB) - smaller objects mean more saves
 * 2. We only need display/identification fields for the saved jobs list
 * 3. Full job details can be fetched on demand when user clicks
 * 
 * FIELDS INCLUDED:
 * - id: Unique identifier for lookup and deduplication
 * - title: Display in saved jobs list (was: role)
 * - organizationName: Agency/organization (was: agency)
 * - locationDisplay: Location string for display (was: location)
 * - gradeLevel: Grade level display (was: grade)
 * - seriesCode: Occupational series (was: series)
 * - matchPercent: Match score for sorting/display
 * - estimatedTotalComp: Compensation for display
 * - savedAt: Timestamp for "when saved" display and sorting
 * - postingUrl: Optional URL to original posting
 */
export interface SavedJobSummary {
  /**
   * Unique job identifier.
   * Used for deduplication and lookup.
   */
  id: string;

  /**
   * Job title (canonical field name).
   * Example: "Program Analyst", "IT Specialist"
   */
  title: string;

  /**
   * Organization/agency name (canonical field name).
   * Example: "Department of Defense", "VA"
   */
  organizationName: string;

  /**
   * Display-ready location string.
   * Example: "Washington, DC", "Remote"
   */
  locationDisplay: string;

  /**
   * Grade level display.
   * Example: "GS-13", "GS-14/15"
   */
  gradeLevel: string;

  /**
   * Occupational series code.
   * Example: "0343", "2210"
   */
  seriesCode: string;

  /**
   * Match percentage to user's profile (0-100).
   */
  matchPercent: number;

  /**
   * Estimated total compensation.
   */
  estimatedTotalComp: number;

  /**
   * When the job was saved (ISO 8601 timestamp).
   * Used for sorting by "recently saved" and display.
   */
  savedAt: string;

  /**
   * Optional URL to the original job posting.
   * Example: "https://www.usajobs.gov/job/123456"
   */
  postingUrl?: string;
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

/**
 * State shape for the saved jobs store.
 */
interface SavedJobsState {
  /**
   * Array of saved job summaries.
   * Ordered by savedAt (most recent first).
   */
  savedJobs: SavedJobSummary[];

  /**
   * Whether the store has been hydrated from localStorage.
   * Prevents flash of empty state on initial load.
   */
  isLoaded: boolean;
}

// ============================================================================
// STORE ACTIONS INTERFACE
// ============================================================================

/**
 * Actions available on the saved jobs store.
 */
interface SavedJobsActions {
  /**
   * Checks if a job is currently saved.
   * 
   * @param jobId - The job ID to check
   * @returns true if the job is saved, false otherwise
   */
  isSaved: (jobId: string) => boolean;

  /**
   * Toggles a job's saved state.
   * If saved, removes it. If not saved, adds it.
   * 
   * @param job - The job to toggle (requires all SavedJobSummary fields except savedAt)
   * @returns 'saved' | 'removed' indicating the action taken
   */
  toggleSaved: (job: Omit<SavedJobSummary, 'savedAt'>) => 'saved' | 'removed';

  /**
   * Adds a job to saved jobs (if not already saved).
   * 
   * @param job - The job to save
   * @returns true if added, false if already saved
   */
  saveJob: (job: Omit<SavedJobSummary, 'savedAt'>) => boolean;

  /**
   * Removes a job from saved jobs.
   * 
   * @param jobId - The job ID to remove
   * @returns true if removed, false if not found
   */
  removeSaved: (jobId: string) => boolean;

  /**
   * Gets all saved jobs.
   * 
   * @returns Array of saved job summaries
   */
  getSavedJobs: () => SavedJobSummary[];

  /**
   * Resets the saved jobs store to initial state.
   * Called by "Delete All Local Data" feature.
   */
  resetSavedJobs: () => void;

  /**
   * Loads saved jobs from localStorage.
   * Called on initial client-side mount.
   */
  loadFromStorage: () => void;

  /**
   * Saves current state to localStorage.
   * Called after any state modification.
   */
  saveToStorage: () => void;
}

// ============================================================================
// COMBINED STORE TYPE
// ============================================================================

export type SavedJobsStore = SavedJobsState & SavedJobsActions;

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Selector for all saved jobs.
 */
export const selectSavedJobs = function (state: SavedJobsStore): SavedJobSummary[] {
  return state.savedJobs;
};

/**
 * Selector for saved jobs count.
 */
export const selectSavedJobsCount = function (state: SavedJobsStore): number {
  return state.savedJobs.length;
};

/**
 * Selector for whether store is loaded.
 */
export const selectIsLoaded = function (state: SavedJobsStore): boolean {
  return state.isLoaded;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Finds the index of a job in the saved jobs array by ID.
 * 
 * WHY NOT Array.findIndex:
 * Using explicit loop for consistency with house rules
 * (avoiding modern methods that might not be available in all environments).
 * 
 * @param savedJobs - Array of saved jobs
 * @param jobId - ID to find
 * @returns Index if found, -1 if not found
 */
function findJobIndex(savedJobs: SavedJobSummary[], jobId: string): number {
  for (let i = 0; i < savedJobs.length; i++) {
    if (savedJobs[i].id === jobId) {
      return i;
    }
  }
  return -1;
}

/**
 * Creates a deep copy of a SavedJobSummary array.
 * 
 * WHY DEEP COPY:
 * React/Zustand needs new array references to detect changes.
 * We also want to avoid mutations affecting the original array.
 * 
 * @param jobs - Array to copy
 * @returns New array with copied job objects
 */
function deepCopySavedJobs(jobs: SavedJobSummary[]): SavedJobSummary[] {
  const copy: SavedJobSummary[] = [];
  for (let i = 0; i < jobs.length; i++) {
    // Create new object for each job using Object.assign
    const jobCopy: SavedJobSummary = Object.assign({}, jobs[i]);
    copy.push(jobCopy);
  }
  return copy;
}

/**
 * Validates that a parsed object has required SavedJobSummary fields.
 * 
 * WHY VALIDATION:
 * localStorage data could be corrupted, outdated, or tampered with.
 * We validate before using to prevent runtime errors.
 * 
 * @param obj - Object to validate
 * @returns true if valid SavedJobSummary, false otherwise
 */
function isValidSavedJobSummary(obj: unknown): obj is SavedJobSummary {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof candidate['id'] !== 'string') return false;
  if (typeof candidate['title'] !== 'string') return false;
  if (typeof candidate['organizationName'] !== 'string') return false;
  if (typeof candidate['locationDisplay'] !== 'string') return false;
  if (typeof candidate['gradeLevel'] !== 'string') return false;
  if (typeof candidate['seriesCode'] !== 'string') return false;
  if (typeof candidate['savedAt'] !== 'string') return false;

  // Check required number fields
  if (typeof candidate['matchPercent'] !== 'number') return false;
  if (typeof candidate['estimatedTotalComp'] !== 'number') return false;

  return true;
}

// ============================================================================
// CREATE THE STORE
// ============================================================================

export const useSavedJobsStore = create<SavedJobsStore>(function (set, get) {
  return {
    // ========================================================================
    // INITIAL STATE
    // ========================================================================

    /**
     * Start with empty saved jobs.
     * Will be populated from localStorage on client-side mount.
     */
    savedJobs: [],

    /**
     * Not loaded until loadFromStorage is called.
     */
    isLoaded: false,

    // ========================================================================
    // ACTIONS
    // ========================================================================

    /**
     * Checks if a job is currently saved.
     * 
     * HOW IT WORKS:
     * 1. Get current saved jobs array
     * 2. Search for matching ID
     * 3. Return true if found
     */
    isSaved: function (jobId: string): boolean {
      const state = get();
      const index = findJobIndex(state.savedJobs, jobId);
      return index !== -1;
    },

    /**
     * Toggles a job's saved state.
     * 
     * HOW IT WORKS:
     * 1. Check if job is currently saved
     * 2. If saved: remove it
     * 3. If not saved: add it with current timestamp
     * 4. Persist to storage
     */
    toggleSaved: function (job: Omit<SavedJobSummary, 'savedAt'>): 'saved' | 'removed' {
      const state = get();
      const index = findJobIndex(state.savedJobs, job.id);

      if (index !== -1) {
        // Job is saved, remove it
        const newSavedJobs = deepCopySavedJobs(state.savedJobs);
        // Remove the job at index
        const afterRemoval: SavedJobSummary[] = [];
        for (let i = 0; i < newSavedJobs.length; i++) {
          if (i !== index) {
            afterRemoval.push(newSavedJobs[i]);
          }
        }
        set({ savedJobs: afterRemoval });
        get().saveToStorage();
        return 'removed';
      } else {
        // Job is not saved, add it
        const newJob: SavedJobSummary = Object.assign({}, job, {
          savedAt: new Date().toISOString(),
        }) as SavedJobSummary;

        // Add to beginning of array (most recent first)
        const newSavedJobs: SavedJobSummary[] = [newJob];
        for (let i = 0; i < state.savedJobs.length; i++) {
          newSavedJobs.push(state.savedJobs[i]);
        }

        set({ savedJobs: newSavedJobs });
        get().saveToStorage();
        return 'saved';
      }
    },

    /**
     * Adds a job to saved jobs (if not already saved).
     * 
     * HOW IT WORKS:
     * 1. Check if already saved (by ID)
     * 2. If not saved, create SavedJobSummary with timestamp
     * 3. Add to beginning of array
     * 4. Persist to storage
     */
    saveJob: function (job: Omit<SavedJobSummary, 'savedAt'>): boolean {
      const state = get();
      const index = findJobIndex(state.savedJobs, job.id);

      if (index !== -1) {
        // Already saved
        return false;
      }

      // Create new saved job with timestamp
      const newJob: SavedJobSummary = Object.assign({}, job, {
        savedAt: new Date().toISOString(),
      }) as SavedJobSummary;

      // Add to beginning of array (most recent first)
      const newSavedJobs: SavedJobSummary[] = [newJob];
      for (let i = 0; i < state.savedJobs.length; i++) {
        newSavedJobs.push(state.savedJobs[i]);
      }

      set({ savedJobs: newSavedJobs });
      get().saveToStorage();
      return true;
    },

    /**
     * Removes a job from saved jobs.
     * 
     * HOW IT WORKS:
     * 1. Find job index by ID
     * 2. If found, create new array without that job
     * 3. Persist to storage
     */
    removeSaved: function (jobId: string): boolean {
      const state = get();
      const index = findJobIndex(state.savedJobs, jobId);

      if (index === -1) {
        // Not found
        return false;
      }

      // Create new array without the removed job
      const newSavedJobs: SavedJobSummary[] = [];
      for (let i = 0; i < state.savedJobs.length; i++) {
        if (i !== index) {
          newSavedJobs.push(state.savedJobs[i]);
        }
      }

      set({ savedJobs: newSavedJobs });
      get().saveToStorage();
      return true;
    },

    /**
     * Gets all saved jobs.
     * Returns a copy to prevent external mutation.
     */
    getSavedJobs: function (): SavedJobSummary[] {
      const state = get();
      return deepCopySavedJobs(state.savedJobs);
    },

    /**
     * Resets the saved jobs store to initial state.
     * 
     * WHEN USED:
     * Called by "Delete All Local Data" feature to clear all user data.
     */
    resetSavedJobs: function (): void {
      set({
        savedJobs: [],
        isLoaded: true,
      });

      // Clear from localStorage (SSR-safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(SAVED_JOBS_STORAGE_KEY);
        } catch (error) {
          console.error('[SavedJobsStore] Failed to clear storage:', error);
        }
      }
    },

    /**
     * Loads saved jobs from localStorage.
     * 
     * HOW IT WORKS:
     * 1. Guard against SSR (no window)
     * 2. Read from localStorage
     * 3. Parse and validate each saved job
     * 4. Update state with valid jobs only
     */
    loadFromStorage: function (): void {
      // SSR guard
      if (typeof window === 'undefined') {
        set({ isLoaded: true });
        return;
      }

      try {
        const stored = localStorage.getItem(SAVED_JOBS_STORAGE_KEY);

        if (stored !== null && stored !== '') {
          const parsed = JSON.parse(stored);

          // Validate that parsed is an array
          if (Array.isArray(parsed)) {
            const validJobs: SavedJobSummary[] = [];

            // Validate each job in the array
            for (let i = 0; i < parsed.length; i++) {
              const job = parsed[i];
              if (isValidSavedJobSummary(job)) {
                validJobs.push(job);
              } else {
                console.warn('[SavedJobsStore] Skipping invalid saved job at index', i);
              }
            }

            set({
              savedJobs: validJobs,
              isLoaded: true,
            });
          } else {
            // Not an array, reset to empty
            console.warn('[SavedJobsStore] Stored data is not an array, resetting');
            set({ savedJobs: [], isLoaded: true });
          }
        } else {
          // No stored data
          set({ savedJobs: [], isLoaded: true });
        }
      } catch (error) {
        console.error('[SavedJobsStore] Failed to load from storage:', error);
        set({ savedJobs: [], isLoaded: true });
      }
    },

    /**
     * Saves current state to localStorage.
     * 
     * HOW IT WORKS:
     * 1. Guard against SSR
     * 2. Serialize saved jobs array to JSON
     * 3. Write to localStorage
     */
    saveToStorage: function (): void {
      // SSR guard
      if (typeof window === 'undefined') {
        return;
      }

      const state = get();

      try {
        localStorage.setItem(
          SAVED_JOBS_STORAGE_KEY,
          JSON.stringify(state.savedJobs)
        );
      } catch (error) {
        console.error('[SavedJobsStore] Failed to save to storage:', error);
      }
    },
  };
});
