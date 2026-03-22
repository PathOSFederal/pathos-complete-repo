'use client';

import { useProfileStore } from '@/store/profileStore';
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useDashboardStore } from '@/store/dashboardStore';
import {
  useUserPreferencesStore,
  USER_PREFERENCES_STORAGE_KEY,
} from '@/store/userPreferencesStore';
import { useSavedJobsStore } from '@/store/savedJobsStore';
import { useBenefitsAssumptionsStore } from '@/store/benefitsAssumptionsStore';
import { useJobAlertsStore } from '@/store/jobAlertsStore';
import { useEmailIngestionStore } from '@/store/emailIngestionStore';
import { useDocumentImportStore } from '@/store/documentImportStore';
import { useGuidedTourStore } from '@/store/guidedTourStore';
import { useBenefitsWorkspaceStore } from '@/store/benefitsWorkspaceStore';
import {
  PROFILE_STORAGE_KEY,
  JOB_SEARCH_STORAGE_KEY,
  SAVED_JOBS_STORAGE_KEY,
  BENEFITS_ASSUMPTIONS_STORAGE_KEY,
  JOB_ALERTS_STORAGE_KEY,
  EMAIL_DIGEST_STORAGE_KEY,
  ALERT_EVENTS_STORAGE_KEY,
  ALERT_SEEN_JOBS_STORAGE_KEY,
  EMAIL_INGESTION_STORAGE_KEY,
  DOCUMENT_IMPORT_STORAGE_KEY,
  GUIDED_TOUR_STORAGE_KEY,
  BENEFITS_WORKSPACE_STORAGE_KEY,
} from '@/lib/storage-keys';
import { deleteDocumentDatabase } from '@/lib/storage/indexeddb';

/**
 * Known localStorage keys used by PathOS Tier 1.
 * 
 * DAY 15 UPDATE:
 * Added SAVED_JOBS_STORAGE_KEY for the new Saved Jobs feature.
 * 
 * DAY 16 UPDATE:
 * Added BENEFITS_ASSUMPTIONS_STORAGE_KEY for benefits personalization.
 *
 * DAY 19 UPDATE:
 * Added JOB_ALERTS_STORAGE_KEY for job alerts.
 *
 * DAY 20 UPDATE:
 * Added EMAIL_DIGEST_STORAGE_KEY, ALERT_EVENTS_STORAGE_KEY, and
 * ALERT_SEEN_JOBS_STORAGE_KEY for email digest and event logging.
 *
 * DAY 21 UPDATE:
 * Added EMAIL_INGESTION_STORAGE_KEY for email ingestion inbox.
 *
 * DAY 22 UPDATE:
 * Added DOCUMENT_IMPORT_STORAGE_KEY for document import metadata.
 * Note: File blobs are stored in IndexedDB and also need to be cleared.
 *
 * DAY 23 UPDATE (Run 2):
 * Removed IMPORT_LINKS_STORAGE_KEY - links are stored on import records directly
 * in the linkedEntities array, not as a separate reverse index.
 *
 * DAY 36 UPDATE:
 * Added GUIDED_TOUR_STORAGE_KEY for guided tour state.
 *
 * DAY 42 UPDATE:
 * Added BENEFITS_WORKSPACE_STORAGE_KEY for benefits comparison workspace.
 */
const STORAGE_KEYS = [
  PROFILE_STORAGE_KEY,
  JOB_SEARCH_STORAGE_KEY,
  USER_PREFERENCES_STORAGE_KEY,
  SAVED_JOBS_STORAGE_KEY,
  BENEFITS_ASSUMPTIONS_STORAGE_KEY,
  JOB_ALERTS_STORAGE_KEY,
  EMAIL_DIGEST_STORAGE_KEY,
  ALERT_EVENTS_STORAGE_KEY,
  ALERT_SEEN_JOBS_STORAGE_KEY,
  EMAIL_INGESTION_STORAGE_KEY,
  DOCUMENT_IMPORT_STORAGE_KEY,
  GUIDED_TOUR_STORAGE_KEY,
  BENEFITS_WORKSPACE_STORAGE_KEY,
];

/**
 * Hook that provides a function to delete all local PathOS data.
 * This clears localStorage keys, IndexedDB databases, and resets all Zustand stores.
 * 
 * After deletion:
 * - Profile is reset to default job seeker state
 * - Job search filters and saved searches are cleared
 * - Dashboard state is reset
 * - User preferences (including cardVisibility) are reset to defaults
 * - All cards become visible again
 * - Global privacy mode is turned off
 * - Saved jobs are cleared (Day 15)
 * - Benefits assumptions are cleared (Day 16)
 * - Job alerts are cleared (Day 19)
 * - Email digest settings, events, and seen jobs are cleared (Day 20)
 * - Email ingestion inbox is cleared (Day 21)
 * - Document import metadata and IndexedDB blobs are cleared (Day 22)
 * - Import links are cleared with import records (Day 23 - stored on linkedEntities array)
 * - Benefits workspace scenarios are cleared (Day 42)
 * 
 * DAY 15 UPDATE:
 * Added resetSavedJobs to clear the new Saved Jobs store.
 * 
 * DAY 16 UPDATE:
 * Added resetBenefitsAssumptions to clear benefits personalization.
 *
 * DAY 19 UPDATE:
 * Added resetAlerts to clear job alerts.
 *
 * DAY 20 UPDATE:
 * The resetAlerts action also clears email digest settings, events, and seen jobs.
 *
 * DAY 21 UPDATE:
 * Added resetEmailIngestion to clear email ingestion inbox.
 *
 * DAY 22 UPDATE:
 * Added resetDocumentImport to clear document import store.
 * Added deleteDocumentDatabase to clear IndexedDB blobs.
 *
 * DAY 42 UPDATE:
 * Added resetBenefitsWorkspace to clear benefits comparison workspace.
 */
export function useDeleteAllLocalData() {
  const resetProfile = useProfileStore(function (state) {
    return state.resetProfile;
  });
  const resetJobSearch = useJobSearchStore(function (state) {
    return state.resetJobSearch;
  });
  const resetDashboard = useDashboardStore(function (state) {
    return state.resetDashboard;
  });
  const resetUserPreferences = useUserPreferencesStore(function (state) {
    return state.resetUserPreferences;
  });
  const resetSavedJobs = useSavedJobsStore(function (state) {
    return state.resetSavedJobs;
  });
  const resetBenefitsAssumptions = useBenefitsAssumptionsStore(function (state) {
    return state.resetAssumptions;
  });
  /**
   * Day 19/20: Reset job alerts, email digest settings, events, and seen jobs.
   */
  const resetAlerts = useJobAlertsStore(function (state) {
    return state.resetAlerts;
  });

  /**
   * Day 21: Reset email ingestion inbox.
   */
  const resetEmailIngestion = useEmailIngestionStore(function (state) {
    return state.reset;
  });

  /**
   * Day 22: Reset document import store.
   * Note: This also clears IndexedDB blobs via the store's reset action.
   */
  const resetDocumentImport = useDocumentImportStore(function (state) {
    return state.reset;
  });

  /**
   * Day 36: Reset guided tour store.
   */
  const resetGuidedTour = useGuidedTourStore(function (state) {
    return state.reset;
  });

  /**
   * Day 42: Reset benefits workspace store.
   */
  const resetBenefitsWorkspace = useBenefitsWorkspaceStore(function (state) {
    return state.resetWorkspace;
  });

  const deleteAllLocalData = async function () {
    // Guard against SSR - localStorage is not available on the server
    if (typeof window === 'undefined') {
      return;
    }

    // Clear known localStorage keys
    try {
      for (let i = 0; i < STORAGE_KEYS.length; i++) {
        const key = STORAGE_KEYS[i];
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }

    // Reset all stores to their initial state
    resetProfile();
    resetJobSearch();
    resetDashboard();
    resetUserPreferences();
    resetSavedJobs();
    resetBenefitsAssumptions();
    resetAlerts(); // Day 19/20: Clears alerts, digest settings, events, seen jobs
    resetEmailIngestion(); // Day 21: Clears email ingestion inbox
    await resetDocumentImport(); // Day 22: Clears document import (async for IndexedDB)
    resetGuidedTour(); // Day 36: Clears guided tour state
    resetBenefitsWorkspace(); // Day 42: Clears benefits workspace scenarios

    // Day 22: Also delete the IndexedDB database directly for complete cleanup
    // The store's reset() already clears blobs, but this ensures database is fully removed
    try {
      await deleteDocumentDatabase();
    } catch (error) {
      console.error('Failed to delete IndexedDB database:', error);
    }
  };

  return { deleteAllLocalData };
}
