/**
 * ============================================================================
 * SAVED JOBS DATA MODEL -- Local-only saved job tracking
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * Saved Jobs are separate from the job search results list. When a user
 * "saves" a job from search, a copy is placed here for long-term tracking.
 */

import type { Job } from './job-types';

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export const SAVED_JOBS_SCHEMA_VERSION = 1;

export interface SavedJobsStore {
  schemaVersion: number;
  jobs: Job[];
  selectedJobId: string | null;
}
