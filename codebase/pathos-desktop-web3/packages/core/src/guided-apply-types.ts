/**
 * ============================================================================
 * GUIDED APPLY DATA MODEL -- Local-only application session tracking
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * TRUST-FIRST: No credentials, no scraping, no auto-apply.
 * All data stored locally via packages/core storage utilities.
 */

// ---------------------------------------------------------------------------
// Checklist step IDs (stable enum for storage)
// ---------------------------------------------------------------------------

export type ChecklistStepId =
  | 'confirm-announcement'
  | 'tailor-resume'
  | 'gather-documents'
  | 'submit-usajobs'
  | 'record-confirmation';

export interface ChecklistStep {
  id: ChecklistStepId;
  label: string;
  description: string;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Paste-capture note card IDs
// ---------------------------------------------------------------------------

export type NoteCardId =
  | 'announcement-notes'
  | 'questionnaire-drafts'
  | 'confirmation-tracking';

export interface NoteCard {
  id: NoteCardId;
  label: string;
  placeholder: string;
  content: string;
  /** Per-card visibility toggle (only affects on-screen display, data stays local) */
  isVisible: boolean;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface GuidedApplySession {
  id: string;
  title: string;
  jobLink: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  checklist: ChecklistStep[];
  notes: Record<NoteCardId, NoteCard>;
}

// ---------------------------------------------------------------------------
// Store shape (persisted as JSON)
// ---------------------------------------------------------------------------

/**
 * Current schema version. Bump when the shape of persisted data changes.
 * The loader will reset to defaults if it detects a mismatch.
 */
export const GUIDED_APPLY_SCHEMA_VERSION = 2;

export interface GuidedApplyStore {
  schemaVersion: number;
  sessions: GuidedApplySession[];
  lastOpenedSessionId: string | null;
}

// ---------------------------------------------------------------------------
// Default checklist + note cards factory
// ---------------------------------------------------------------------------

export function createDefaultChecklist(): ChecklistStep[] {
  return [
    {
      id: 'confirm-announcement',
      label: 'Confirm announcement',
      description: 'Review the job announcement and confirm eligibility.',
      completed: false,
    },
    {
      id: 'tailor-resume',
      label: 'Tailor resume',
      description: 'Adjust your federal resume to match the announcement requirements.',
      completed: false,
    },
    {
      id: 'gather-documents',
      label: 'Gather documents',
      description: 'Collect transcripts, DD-214, SF-50, or other required documents.',
      completed: false,
    },
    {
      id: 'submit-usajobs',
      label: 'Submit on USAJOBS',
      description: 'Open USAJOBS in your browser and submit your application.',
      completed: false,
    },
    {
      id: 'record-confirmation',
      label: 'Record confirmation',
      description: 'Paste your confirmation number and any tracking details.',
      completed: false,
    },
  ];
}

export function createDefaultNotes(): Record<NoteCardId, NoteCard> {
  return {
    'announcement-notes': {
      id: 'announcement-notes',
      label: 'Announcement Notes',
      placeholder: 'Paste key requirements, qualifications, or notes from the announcement...',
      content: '',
      isVisible: true,
    },
    'questionnaire-drafts': {
      id: 'questionnaire-drafts',
      label: 'Questionnaire Drafts',
      placeholder: 'Draft your questionnaire answers here before entering them on USAJOBS...',
      content: '',
      isVisible: true,
    },
    'confirmation-tracking': {
      id: 'confirmation-tracking',
      label: 'Submission Confirmation and Tracking',
      placeholder: 'Paste your confirmation number, submission timestamp, and any tracking notes...',
      content: '',
      isVisible: true,
    },
  };
}
