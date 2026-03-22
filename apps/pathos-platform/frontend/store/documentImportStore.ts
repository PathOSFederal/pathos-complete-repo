/**
 * ============================================================================
 * DOCUMENT IMPORT STORE (Day 24 - Import Actions & Extraction v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This Zustand store manages imported document metadata for the PathOS application.
 * When a user uploads a file (PDF/DOCX/TXT) or pastes text, the metadata is stored
 * here (persisted to localStorage), while the actual file blob is stored in IndexedDB.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │       UI        │ --> │   THIS FILE     │ --> │  localStorage  │
 * │  (Import Center │     │  (Zustand Store)│     │  (metadata)    │
 * │   Files tab)    │     │                 │     └────────────────┘
 * └─────────────────┘     └────────┬────────┘
 *                                  │
 *                                  ▼
 *                         ┌─────────────────┐     ┌────────────────┐
 *                         │  IndexedDB      │ --> │  IndexedDB     │
 *                         │  Wrapper        │     │  (blobs)       │
 *                         └─────────────────┘     └────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Store document metadata - maintains array of imported document items
 * 2. CRUD operations - import files/text, update, delete documents
 * 3. Per-item visibility - isHidden flag for privacy controls
 * 4. Category/sensitivity - user-editable classification
 * 5. Tags - user-defined labels
 * 6. Persist metadata to localStorage - survives page refresh
 * 7. Coordinate with IndexedDB - for blob storage
 * 8. Provide reset action - for "Delete All Local Data" feature
 *
 * DAY 23 ADDITIONS:
 * 9. Triage status - new/reviewed/pinned/archived workflow states
 * 10. Notes - short text notes per document
 * 11. Linked entities - links to Saved Jobs, Target Roles, Job Alerts
 * 12. Bulk actions - update multiple documents at once
 *
 * DAY 24 ADDITIONS:
 * 13. Extracted signals - dates, URLs, emails, phones, job IDs from content
 * 14. Import actions - queued actions derived from signals
 * 15. Action lifecycle - queue, apply, cancel actions
 * 16. Auto-extraction on import - signals extracted when content is imported
 *
 * HOUSE RULES COMPLIANCE (Day 24):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 24 - Import Actions & Extraction v1
 * ============================================================================
 */

import { create } from 'zustand';
import { DOCUMENT_IMPORT_STORAGE_KEY } from '@/lib/storage-keys';
import {
  putDocumentBlob,
  deleteDocumentBlob,
  clearAllDocumentBlobs,
} from '@/lib/storage/indexeddb';
import {
  classifyDocument,
  extractSignals,
  type DocumentCategory,
  type SensitivityLabel,
  type ExtractedSignal,
} from '@/lib/documents';

// Re-export for convenience
export { DOCUMENT_IMPORT_STORAGE_KEY };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Document type based on how it was imported.
 *
 * DESIGN RATIONALE:
 * - 'pdf': PDF document file
 * - 'docx': Microsoft Word document
 * - 'txt': Plain text file
 * - 'text': Pasted text (not from a file)
 *
 * NOTE (Day 22 Run 2 - Fix 2):
 * We do NOT include 'unknown' here. Instead, getDocumentType() returns
 * null for unsupported file types, and importFile() throws an error.
 * This enforces type safety and provides clear error messages.
 */
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'text';

/**
 * Import status for triage workflow (Day 23).
 *
 * DESIGN RATIONALE:
 * - 'new': Just imported, not yet reviewed
 * - 'reviewed': User has looked at it
 * - 'pinned': Important, should appear at top
 * - 'archived': Done with it, hide from main view
 */
export type ImportStatus = 'new' | 'reviewed' | 'pinned' | 'archived';

/**
 * All valid import statuses for iteration/validation.
 */
export const ALL_IMPORT_STATUSES: ImportStatus[] = ['new', 'reviewed', 'pinned', 'archived'];

/**
 * Human-readable labels for import statuses.
 */
export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  pinned: 'Pinned',
  archived: 'Archived',
};

/**
 * Badge colors for import statuses (Tailwind classes).
 */
export const IMPORT_STATUS_COLORS: Record<ImportStatus, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  reviewed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  pinned: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

/**
 * Entity types that can be linked to imports (Day 23).
 */
export type LinkableEntityType = 'savedJob' | 'targetRole' | 'jobAlert';

/**
 * Represents a link from an import to another entity (Day 23).
 *
 * DESIGN RATIONALE:
 * We store link metadata directly on the import record itself.
 * Backlink queries (entity → linked imports) iterate through documents.
 * This avoids maintaining a separate reverse index.
 */
export interface LinkedEntity {
  /**
   * Type of the linked entity.
   */
  entityType: LinkableEntityType;

  /**
   * ID of the linked entity.
   * For savedJob: the job ID
   * For targetRole: the target role ID from resumeBuilderStore
   * For jobAlert: the alert ID
   */
  entityId: string;

  /**
   * ISO 8601 timestamp when the link was created.
   */
  linkedAt: string;
}

// ============================================================================
// DAY 24: IMPORT ACTION TYPE DEFINITIONS
// ============================================================================

/**
 * Types of actions that can be created from imported content (Day 24).
 *
 * DESIGN RATIONALE:
 * These actions map to workflows in PathOS:
 * - link_to_job: Connect import to an existing saved job
 * - open_job_search: Launch Job Search with seeded query
 * - start_resume_tailoring: Activate target role and open Resume Builder
 * - save_attachment: Mark attachment as retained (visible in item details)
 * - capture_deadline: Store extracted deadline as tracked field
 */
export type ImportActionType =
  | 'link_to_job'
  | 'open_job_search'
  | 'start_resume_tailoring'
  | 'save_attachment'
  | 'capture_deadline';

/**
 * Status of an import action (Day 24).
 *
 * DESIGN RATIONALE:
 * - queued: Action created, waiting for user to apply
 * - applied: User applied the action successfully
 * - failed: Action application failed
 * - canceled: User dismissed/canceled the action
 */
export type ImportActionStatus = 'queued' | 'applied' | 'failed' | 'canceled';

/**
 * All valid action types for iteration/validation.
 */
export const ALL_IMPORT_ACTION_TYPES: ImportActionType[] = [
  'link_to_job',
  'open_job_search',
  'start_resume_tailoring',
  'save_attachment',
  'capture_deadline',
];

/**
 * All valid action statuses for iteration/validation.
 */
export const ALL_IMPORT_ACTION_STATUSES: ImportActionStatus[] = [
  'queued',
  'applied',
  'failed',
  'canceled',
];

/**
 * Human-readable labels for action types.
 */
export const IMPORT_ACTION_TYPE_LABELS: Record<ImportActionType, string> = {
  link_to_job: 'Link to Job',
  open_job_search: 'Open Job Search',
  start_resume_tailoring: 'Start Resume Tailoring',
  save_attachment: 'Save Attachment',
  capture_deadline: 'Track Deadline',
};

/**
 * Human-readable labels for action statuses.
 */
export const IMPORT_ACTION_STATUS_LABELS: Record<ImportActionStatus, string> = {
  queued: 'Queued',
  applied: 'Applied',
  failed: 'Failed',
  canceled: 'Canceled',
};

/**
 * Badge colors for action statuses (Tailwind classes).
 */
export const IMPORT_ACTION_STATUS_COLORS: Record<ImportActionStatus, string> = {
  queued: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  applied: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  canceled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

/**
 * Represents an import action (Day 24).
 *
 * DESIGN RATIONALE:
 * Actions are derived from extracted signals and provide one-click workflows.
 * Each action tracks its lifecycle and can be applied/canceled by the user.
 */
export interface ImportAction {
  /**
   * Unique identifier for the action.
   */
  id: string;

  /**
   * Type of action (determines behavior when applied).
   */
  type: ImportActionType;

  /**
   * ISO 8601 timestamp when the action was created.
   */
  createdAt: string;

  /**
   * Current status of the action.
   */
  status: ImportActionStatus;

  /**
   * ID of the signal this action was derived from (if any).
   */
  sourceSignalId: string | null;

  /**
   * Type-specific payload data.
   * For link_to_job: { jobId: string }
   * For open_job_search: { query: string }
   * For start_resume_tailoring: { jobTitle: string, targetRoleId?: string }
   * For capture_deadline: { deadline: string, isoDate?: string }
   */
  payload: Record<string, string>;

  /**
   * Optional notes or reason for the action.
   */
  note: string;

  /**
   * ISO 8601 timestamp when the action was applied/canceled (if applicable).
   */
  completedAt: string | null;
}

/**
 * List of supported MIME types for file import.
 * Exported so UI can use the same list for validation.
 * (Day 22 Run 2 - Fix 2)
 */
export const SUPPORTED_FILE_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

/**
 * List of supported file extensions for file import.
 * Exported so UI can use the same list for validation.
 * (Day 22 Run 2 - Fix 2)
 */
export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.docx', '.txt'];

/**
 * Represents an imported document item (metadata only).
 *
 * DESIGN RATIONALE:
 * We separate metadata from blob content. Metadata lives in localStorage
 * (fast access, survives refresh), while large blobs live in IndexedDB.
 */
export interface ImportedDocument {
  /**
   * Unique identifier for the document.
   * Generated using createDocumentId().
   */
  id: string;

  /**
   * ISO 8601 timestamp when the document was imported.
   */
  createdAt: string;

  /**
   * Display title for the document.
   * For files: original filename.
   * For pasted text: user-provided title or auto-generated.
   */
  title: string;

  /**
   * Document type based on import method.
   */
  type: DocumentType;

  /**
   * MIME type of the document.
   * e.g., 'application/pdf', 'text/plain'
   */
  mimeType: string;

  /**
   * File size in bytes.
   * For pasted text, this is the text length in bytes (UTF-8).
   */
  sizeBytes: number;

  /**
   * Auto-detected or user-selected category.
   */
  category: DocumentCategory;

  /**
   * Sensitivity label for privacy controls.
   */
  sensitivity: SensitivityLabel;

  /**
   * User-defined tags for organization.
   */
  tags: string[];

  /**
   * Whether this item is hidden (privacy toggle).
   */
  isHidden: boolean;

  /**
   * Triage status for workflow management (Day 23).
   * Defaults to 'new' on import.
   */
  status: ImportStatus;

  /**
   * Short text note for the document (Day 23).
   * User can add context, reminders, or observations.
   */
  note: string;

  /**
   * Linked entities array (Day 23).
   * Tracks which Saved Jobs, Target Roles, or Job Alerts this import is linked to.
   */
  linkedEntities: LinkedEntity[];

  /**
   * Extracted signals from the document content (Day 24).
   * Contains dates, URLs, emails, phones, job IDs detected in the content.
   */
  extractedSignals: ExtractedSignal[];

  /**
   * Import actions created for this document (Day 24).
   * These are suggested or created actions derived from extracted signals.
   */
  actions: ImportAction[];

  /**
   * Whether the blob is stored in IndexedDB.
   * false for pasted text where we store the text inline.
   */
  hasBlobStorage: boolean;

  /**
   * For pasted text, we store the content directly (no IndexedDB).
   * This avoids IndexedDB overhead for small text content.
   */
  textContent: string | null;

  /**
   * Keywords matched during classification (for transparency).
   */
  classificationKeywords: string[];

  /**
   * Confidence score of the classification (0-1).
   */
  classificationConfidence: number;

  /**
   * Duplicate status for deduplication (Day 29).
   * - 'none': Not a duplicate
   * - 'possible_duplicate': Marked as potential duplicate
   * - 'overridden': User confirmed it's not a duplicate
   */
  duplicateStatus: 'none' | 'possible_duplicate' | 'overridden';

  /**
   * ID of the original document if this is a duplicate (Day 29).
   * null if not a duplicate or if overridden.
   */
  duplicateOfId: string | null;

  /**
   * Reasons why this document was flagged as a duplicate (Day 29).
   * Array of human-readable reason strings (e.g., "Same filename and size").
   */
  duplicateReasons: string[];

  /**
   * Retention status for document lifecycle management (Day 29).
   * - 'active': Document is active and visible in default view
   * - 'archived': Document is archived but recoverable
   * - 'deleted': Document is soft-deleted (hidden from active view)
   */
  retentionStatus: 'active' | 'archived' | 'deleted';
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

/**
 * State shape for the document import store.
 */
interface DocumentImportState {
  /**
   * Array of imported document items.
   * Ordered by createdAt (most recent first).
   */
  documents: ImportedDocument[];

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
 * Actions available on the document import store.
 */
interface DocumentImportActions {
  /**
   * Imports a file (PDF/DOCX/TXT).
   * Stores metadata in this store, blob in IndexedDB.
   *
   * @param file - The File object to import
   * @returns Promise resolving to the created ImportedDocument
   */
  importFile: (file: File) => Promise<ImportedDocument>;

  /**
   * Imports pasted text.
   * Stores metadata and text content in this store (no IndexedDB needed).
   *
   * @param text - The text content to import
   * @param title - Optional title (defaults to first line or timestamp)
   * @returns The created ImportedDocument
   */
  importText: (text: string, title: string | null) => ImportedDocument;

  /**
   * Updates a document's category.
   *
   * @param id - Document ID
   * @param category - New category
   * @returns true if updated, false if not found
   */
  updateCategory: (id: string, category: DocumentCategory) => boolean;

  /**
   * Updates a document's sensitivity label.
   *
   * @param id - Document ID
   * @param sensitivity - New sensitivity label
   * @returns true if updated, false if not found
   */
  updateSensitivity: (id: string, sensitivity: SensitivityLabel) => boolean;

  /**
   * Updates a document's title.
   *
   * @param id - Document ID
   * @param title - New title
   * @returns true if updated, false if not found
   */
  updateTitle: (id: string, title: string) => boolean;

  /**
   * Adds a tag to a document.
   *
   * @param id - Document ID
   * @param tag - Tag to add
   * @returns true if added, false if not found or already exists
   */
  addTag: (id: string, tag: string) => boolean;

  /**
   * Removes a tag from a document.
   *
   * @param id - Document ID
   * @param tag - Tag to remove
   * @returns true if removed, false if not found
   */
  removeTag: (id: string, tag: string) => boolean;

  /**
   * Resets a document's derived fields to defaults.
   * Clears tags, resets category/sensitivity based on re-classification.
   * Does NOT delete the file.
   *
   * @param id - Document ID
   * @returns true if reset, false if not found
   */
  resetDocumentFields: (id: string) => boolean;

  // ==========================================================================
  // DAY 23 ACTIONS: Triage
  // ==========================================================================

  /**
   * Updates a document's triage status (Day 23).
   *
   * @param id - Document ID
   * @param status - New status
   * @returns true if updated, false if not found
   */
  updateStatus: (id: string, status: ImportStatus) => boolean;

  /**
   * Updates a document's note (Day 23).
   *
   * @param id - Document ID
   * @param note - New note text
   * @returns true if updated, false if not found
   */
  updateNote: (id: string, note: string) => boolean;

  /**
   * Bulk update status for multiple documents (Day 23).
   *
   * @param ids - Array of document IDs
   * @param status - New status to apply
   * @returns Number of documents updated
   */
  bulkUpdateStatus: (ids: string[], status: ImportStatus) => number;

  /**
   * Bulk add tag to multiple documents (Day 23).
   *
   * @param ids - Array of document IDs
   * @param tag - Tag to add
   * @returns Number of documents updated
   */
  bulkAddTag: (ids: string[], tag: string) => number;

  /**
   * Bulk remove tag from multiple documents (Day 23).
   *
   * @param ids - Array of document IDs
   * @param tag - Tag to remove
   * @returns Number of documents updated
   */
  bulkRemoveTag: (ids: string[], tag: string) => number;

  // ==========================================================================
  // DAY 23 ACTIONS: Linking
  // ==========================================================================

  /**
   * Links a document to an entity (Day 23).
   *
   * @param id - Document ID
   * @param entityType - Type of entity to link
   * @param entityId - ID of the entity
   * @returns true if linked, false if not found or already linked
   */
  linkToEntity: (id: string, entityType: LinkableEntityType, entityId: string) => boolean;

  /**
   * Unlinks a document from an entity (Day 23).
   *
   * @param id - Document ID
   * @param entityType - Type of entity to unlink
   * @param entityId - ID of the entity
   * @returns true if unlinked, false if not found or not linked
   */
  unlinkFromEntity: (id: string, entityType: LinkableEntityType, entityId: string) => boolean;

  /**
   * Gets all documents linked to a specific entity (Day 23).
   * Used for backlink queries.
   *
   * @param entityType - Type of entity
   * @param entityId - ID of the entity
   * @returns Array of linked documents
   */
  getLinkedDocuments: (entityType: LinkableEntityType, entityId: string) => ImportedDocument[];

  // ==========================================================================
  // DAY 24 ACTIONS: Signal Extraction
  // ==========================================================================

  /**
   * Re-extracts signals from a document's content (Day 24).
   * Useful if extraction logic improves or if content was updated.
   *
   * @param id - Document ID
   * @returns true if re-extracted, false if not found or no content
   */
  reextractSignals: (id: string) => boolean;

  // ==========================================================================
  // DAY 24 ACTIONS: Import Actions
  // ==========================================================================

  /**
   * Creates an action for a document (Day 24).
   *
   * @param docId - Document ID
   * @param type - Action type
   * @param payload - Action payload data
   * @param sourceSignalId - Optional ID of the signal this action came from
   * @returns The created action, or null if document not found
   */
  createAction: (
    docId: string,
    type: ImportActionType,
    payload: Record<string, string>,
    sourceSignalId?: string
  ) => ImportAction | null;

  /**
   * Updates an action's status (Day 24).
   *
   * @param docId - Document ID
   * @param actionId - Action ID
   * @param status - New status
   * @returns true if updated, false if not found
   */
  updateActionStatus: (docId: string, actionId: string, status: ImportActionStatus) => boolean;

  /**
   * Removes an action from a document (Day 24).
   *
   * @param docId - Document ID
   * @param actionId - Action ID
   * @returns true if removed, false if not found
   */
  removeAction: (docId: string, actionId: string) => boolean;

  /**
   * Gets all queued actions for a document (Day 24).
   *
   * @param docId - Document ID
   * @returns Array of queued actions
   */
  getQueuedActions: (docId: string) => ImportAction[];

  /**
   * Deletes a document by ID.
   * Also deletes the blob from IndexedDB if applicable.
   *
   * @param id - The document ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  deleteDocument: (id: string) => Promise<boolean>;

  // ==========================================================================
  // DAY 29 ACTIONS: Retention Management
  // ==========================================================================

  /**
   * Archives a document (sets retentionStatus to 'archived').
   *
   * @param id - Document ID
   * @returns true if archived, false if not found
   */
  archiveDocument: (id: string) => boolean;

  /**
   * Restores a document from archived/deleted (sets retentionStatus to 'active').
   *
   * @param id - Document ID
   * @returns true if restored, false if not found
   */
  restoreDocument: (id: string) => boolean;

  /**
   * Soft deletes a document (sets retentionStatus to 'deleted').
   *
   * @param id - Document ID
   * @returns true if soft-deleted, false if not found
   */
  softDeleteDocument: (id: string) => boolean;

  /**
   * Toggles a document's hidden state.
   *
   * @param id - The document ID to toggle
   * @returns The new hidden state, or null if not found
   */
  toggleHidden: (id: string) => boolean | null;

  /**
   * Gets a document by ID.
   *
   * @param id - The document ID
   * @returns The document or null if not found
   */
  getDocument: (id: string) => ImportedDocument | null;

  /**
   * Gets all documents.
   *
   * @returns Array of all document items
   */
  getAllDocuments: () => ImportedDocument[];

  /**
   * Resets the store to initial state.
   * Called by "Delete All Local Data" feature.
   * Also clears IndexedDB blobs.
   */
  reset: () => Promise<void>;

  /**
   * Loads documents from localStorage.
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

export type DocumentImportStore = DocumentImportState & DocumentImportActions;

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Selector for all documents.
 */
export const selectDocuments = function (state: DocumentImportStore): ImportedDocument[] {
  return state.documents;
};

/**
 * Selector for documents count.
 */
export const selectDocumentsCount = function (state: DocumentImportStore): number {
  return state.documents.length;
};

/**
 * Selector for whether store is loaded.
 */
export const selectDocumentImportIsLoaded = function (state: DocumentImportStore): boolean {
  return state.isLoaded;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a unique ID for a new document.
 */
function createDocumentId(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj !== null && cryptoObj !== undefined && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Finds the index of a document in the documents array by ID.
 */
function findDocumentIndex(documents: ImportedDocument[], id: string): number {
  for (let i = 0; i < documents.length; i++) {
    if (documents[i].id === id) {
      return i;
    }
  }
  return -1;
}

/**
 * Creates a deep copy of a documents array.
 * Day 23: Also copies linkedEntities array.
 * Day 24: Also copies extractedSignals and actions arrays.
 */
function deepCopyDocuments(documents: ImportedDocument[]): ImportedDocument[] {
  const copy: ImportedDocument[] = [];
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    // Copy tags array explicitly
    const tagsCopy: string[] = [];
    for (let j = 0; j < doc.tags.length; j++) {
      tagsCopy.push(doc.tags[j]);
    }
    // Copy keywords array explicitly
    const keywordsCopy: string[] = [];
    for (let j = 0; j < doc.classificationKeywords.length; j++) {
      keywordsCopy.push(doc.classificationKeywords[j]);
    }
    // Day 23: Copy linkedEntities array explicitly
    const linkedCopy: LinkedEntity[] = [];
    if (doc.linkedEntities !== undefined && doc.linkedEntities !== null) {
      for (let k = 0; k < doc.linkedEntities.length; k++) {
        linkedCopy.push(Object.assign({}, doc.linkedEntities[k]));
      }
    }
    // Day 24: Copy extractedSignals array explicitly
    const signalsCopy: ExtractedSignal[] = [];
    if (doc.extractedSignals !== undefined && doc.extractedSignals !== null) {
      for (let k = 0; k < doc.extractedSignals.length; k++) {
        const sig = doc.extractedSignals[k];
        const metadataCopy = sig.metadata !== null ? Object.assign({}, sig.metadata) : null;
        const rangeCopy: [number, number] | null = sig.sourceRange !== null
          ? [sig.sourceRange[0], sig.sourceRange[1]]
          : null;
        signalsCopy.push(Object.assign({}, sig, {
          metadata: metadataCopy,
          sourceRange: rangeCopy,
        }));
      }
    }
    // Day 24: Copy actions array explicitly
    const actionsCopy: ImportAction[] = [];
    if (doc.actions !== undefined && doc.actions !== null) {
      for (let k = 0; k < doc.actions.length; k++) {
        const action = doc.actions[k];
        actionsCopy.push(Object.assign({}, action, {
          payload: Object.assign({}, action.payload),
        }));
      }
    }
    const docCopy: ImportedDocument = Object.assign({}, doc, {
      tags: tagsCopy,
      classificationKeywords: keywordsCopy,
      linkedEntities: linkedCopy,
      extractedSignals: signalsCopy,
      actions: actionsCopy,
    });
    copy.push(docCopy);
  }
  return copy;
}

/**
 * Determines DocumentType from MIME type or filename.
 *
 * (Day 22 Run 2 - Fix 2):
 * Returns null for unsupported file types instead of defaulting to 'txt'.
 * This is defense-in-depth: the UI validates first, but the store also validates.
 *
 * @param mimeType - The file's MIME type
 * @param filename - The file's name
 * @returns DocumentType if supported, null if unsupported
 */
export function getDocumentType(mimeType: string, filename: string): DocumentType | null {
  // Check MIME type first (most reliable)
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  if (mimeType === 'text/plain') {
    return 'txt';
  }

  // Fall back to filename extension check
  // Must end with the extension (not just contain it)
  const lowerFilename = filename.toLowerCase();

  // Check .pdf extension
  if (lowerFilename.length >= 4) {
    const pdfEnd = lowerFilename.substring(lowerFilename.length - 4);
    if (pdfEnd === '.pdf') {
      return 'pdf';
    }
  }

  // Check .docx extension
  if (lowerFilename.length >= 5) {
    const docxEnd = lowerFilename.substring(lowerFilename.length - 5);
    if (docxEnd === '.docx') {
      return 'docx';
    }
  }

  // Check .txt extension
  if (lowerFilename.length >= 4) {
    const txtEnd = lowerFilename.substring(lowerFilename.length - 4);
    if (txtEnd === '.txt') {
      return 'txt';
    }
  }

  // Unsupported file type - return null (Day 22 Run 2 - Fix 2)
  return null;
}

/**
 * Validates that a parsed object has required ImportedDocument fields.
 * Day 23: Updated to include status, note, and linkedEntities validation.
 */
function isValidImportedDocument(obj: unknown): obj is ImportedDocument {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof candidate['id'] !== 'string') return false;
  if (typeof candidate['createdAt'] !== 'string') return false;
  if (typeof candidate['title'] !== 'string') return false;
  if (typeof candidate['mimeType'] !== 'string') return false;

  // Check type is valid
  const validTypes = ['pdf', 'docx', 'txt', 'text'];
  let typeValid = false;
  for (let i = 0; i < validTypes.length; i++) {
    if (candidate['type'] === validTypes[i]) {
      typeValid = true;
      break;
    }
  }
  if (!typeValid) return false;

  // Check category is valid
  const validCategories = ['JobPosting', 'Resume', 'OfferLetter', 'BenefitsDoc', 'PayStub', 'TaxDoc', 'Other'];
  let categoryValid = false;
  for (let i = 0; i < validCategories.length; i++) {
    if (candidate['category'] === validCategories[i]) {
      categoryValid = true;
      break;
    }
  }
  if (!categoryValid) return false;

  // Check sensitivity is valid
  const validSensitivities = ['Public', 'Personal', 'Sensitive', 'Unknown'];
  let sensitivityValid = false;
  for (let i = 0; i < validSensitivities.length; i++) {
    if (candidate['sensitivity'] === validSensitivities[i]) {
      sensitivityValid = true;
      break;
    }
  }
  if (!sensitivityValid) return false;

  // Check arrays and booleans
  if (!Array.isArray(candidate['tags'])) return false;
  if (typeof candidate['isHidden'] !== 'boolean') return false;
  if (typeof candidate['hasBlobStorage'] !== 'boolean') return false;
  if (typeof candidate['sizeBytes'] !== 'number') return false;

  // Day 23: Check status is valid (with backwards compatibility for old data)
  const validStatuses = ['new', 'reviewed', 'pinned', 'archived'];
  if (candidate['status'] !== undefined) {
    let statusValid = false;
    for (let i = 0; i < validStatuses.length; i++) {
      if (candidate['status'] === validStatuses[i]) {
        statusValid = true;
        break;
      }
    }
    if (!statusValid) return false;
  }

  // Day 23: Check linkedEntities is array (if present)
  if (candidate['linkedEntities'] !== undefined && !Array.isArray(candidate['linkedEntities'])) {
    return false;
  }

  // Day 24: Check extractedSignals is array (if present)
  if (candidate['extractedSignals'] !== undefined && !Array.isArray(candidate['extractedSignals'])) {
    return false;
  }

  // Day 24: Check actions is array (if present)
  if (candidate['actions'] !== undefined && !Array.isArray(candidate['actions'])) {
    return false;
  }

  // Day 29: Check duplicateStatus is valid (with backwards compatibility)
  const validDuplicateStatuses = ['none', 'possible_duplicate', 'overridden'];
  if (candidate['duplicateStatus'] !== undefined) {
    let duplicateStatusValid = false;
    for (let i = 0; i < validDuplicateStatuses.length; i++) {
      if (candidate['duplicateStatus'] === validDuplicateStatuses[i]) {
        duplicateStatusValid = true;
        break;
      }
    }
    if (!duplicateStatusValid) return false;
  }

  // Day 29: Check duplicateOfId is string or null (if present)
  if (candidate['duplicateOfId'] !== undefined && candidate['duplicateOfId'] !== null && typeof candidate['duplicateOfId'] !== 'string') {
    return false;
  }

  // Day 29: Check duplicateReasons is array (if present)
  if (candidate['duplicateReasons'] !== undefined && !Array.isArray(candidate['duplicateReasons'])) {
    return false;
  }

  // Day 29: Check retentionStatus is valid (with backwards compatibility)
  const validRetentionStatuses = ['active', 'archived', 'deleted'];
  if (candidate['retentionStatus'] !== undefined) {
    let retentionStatusValid = false;
    for (let i = 0; i < validRetentionStatuses.length; i++) {
      if (candidate['retentionStatus'] === validRetentionStatuses[i]) {
        retentionStatusValid = true;
        break;
      }
    }
    if (!retentionStatusValid) return false;
  }

  return true;
}

/**
 * ============================================================================
 * DAY 29: DEDUPLICATION FUNCTIONS
 * ============================================================================
 */

/**
 * Computes a fingerprint for an imported document to detect duplicates.
 *
 * HOW IT WORKS:
 * For local file imports, uses stable fields:
 * - Normalized filename (lowercase + trim)
 * - File size in bytes
 * - For small text files (TXT/JSON/CSV up to 256KB), computes SHA-256 hash of content
 *
 * WHY THESE FIELDS:
 * - Filename + size is stable across imports of the same file
 * - Content hash provides stronger matching for text files
 * - Excludes id, createdAt, and UI-only fields (tags, notes, etc.)
 *
 * @param doc - The document to fingerprint
 * @param fileContent - Optional file content for hashing (for text files)
 * @returns A fingerprint string for comparison
 */
function computeImportFingerprint(doc: ImportedDocument, fileContent: string | null): string {
  // Normalize filename: lowercase and trim
  const normalizedFilename = doc.title.toLowerCase().trim();

  // Base fingerprint: filename + size
  let fingerprint = normalizedFilename + '|' + doc.sizeBytes.toString();

  // For small text files, add content hash
  // Threshold: 256KB (262144 bytes)
  if (doc.type === 'txt' || doc.type === 'text') {
    const content = fileContent !== null ? fileContent : (doc.textContent !== null ? doc.textContent : '');
    if (content.length > 0 && doc.sizeBytes <= 262144) {
      // Compute SHA-256 hash of content
      // Note: Using SubtleCrypto API which is async, but we'll compute synchronously
      // for v1, we'll use a simple hash function
      const hash = simpleHash(content);
      fingerprint = fingerprint + '|hash:' + hash;
    }
  }

  return fingerprint;
}

/**
 * Simple hash function for content fingerprinting (Day 29).
 * Uses a basic string hash algorithm since SubtleCrypto is async.
 *
 * WHY THIS APPROACH:
 * For v1, we use a synchronous hash to avoid async complexity.
 * This is sufficient for duplicate detection within a single session.
 *
 * @param content - The content to hash
 * @returns A hash string
 */
function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Deduplication decision result (Day 29).
 */
interface DedupeDecision {
  /**
   * Whether this is a duplicate.
   */
  isDuplicate: boolean;

  /**
   * ID of the original document if duplicate.
   */
  originalId: string | null;

  /**
   * Reasons why this was flagged as duplicate.
   */
  reasons: string[];
}

/**
 * Checks if an incoming import is a duplicate of existing documents.
 *
 * HOW IT WORKS:
 * 1. Computes fingerprint for the new document
 * 2. Compares against fingerprints of existing documents (excluding deleted ones)
 * 3. Returns decision with original ID and reasons if duplicate found
 *
 * @param existingDocs - Array of existing documents to check against
 * @param newDoc - The new document being imported
 * @param newDocContent - Optional content for the new document (for text files)
 * @returns DedupeDecision indicating if duplicate and why
 */
function dedupeIncomingImport(
  existingDocs: ImportedDocument[],
  newDoc: ImportedDocument,
  newDocContent: string | null
): DedupeDecision {
  // Exclude deleted documents from comparison
  const activeDocs: ImportedDocument[] = [];
  for (let i = 0; i < existingDocs.length; i++) {
    const doc = existingDocs[i];
    // Check if document has retentionStatus field and if it's deleted
    const docAsRecord = doc as unknown as Record<string, unknown>;
    const retentionStatus = docAsRecord['retentionStatus'];
    if (retentionStatus === undefined || retentionStatus !== 'deleted') {
      // Also exclude the new doc itself if it's already in the list
      if (doc.id !== newDoc.id) {
        activeDocs.push(doc);
      }
    }
  }

  // Compute fingerprint for new document
  const newFingerprint = computeImportFingerprint(newDoc, newDocContent);

  // Compare against existing documents
  for (let i = 0; i < activeDocs.length; i++) {
    const existingDoc = activeDocs[i];
    const existingContent = existingDoc.textContent !== null ? existingDoc.textContent : null;
    const existingFingerprint = computeImportFingerprint(existingDoc, existingContent);

    if (existingFingerprint === newFingerprint) {
      // Found a match - build reasons
      const reasons: string[] = [];
      const normalizedNewTitle = newDoc.title.toLowerCase().trim();
      const normalizedExistingTitle = existingDoc.title.toLowerCase().trim();
      if (normalizedNewTitle === normalizedExistingTitle) {
        reasons.push('Same filename');
      }
      if (newDoc.sizeBytes === existingDoc.sizeBytes) {
        reasons.push('Same file size');
      }
      if (newDoc.type === 'txt' || newDoc.type === 'text') {
        reasons.push('Same content hash');
      }

      return {
        isDuplicate: true,
        originalId: existingDoc.id,
        reasons: reasons,
      };
    }
  }

  // No duplicate found
  return {
    isDuplicate: false,
    originalId: null,
    reasons: [],
  };
}

/**
 * Marks a document as a duplicate (Day 29).
 *
 * HOW IT WORKS:
 * Updates the document's duplicateStatus, duplicateOfId, and duplicateReasons fields.
 *
 * @param doc - The document to mark (will be modified in place)
 * @param originalId - ID of the original document
 * @param reasons - Array of reason strings
 * @param status - Duplicate status ('possible_duplicate' or 'overridden')
 */
function markAsDuplicate(
  doc: ImportedDocument,
  originalId: string,
  reasons: string[],
  status: 'possible_duplicate' | 'overridden'
): void {
  doc.duplicateStatus = status;
  doc.duplicateOfId = originalId;
  doc.duplicateReasons = reasons.slice(); // Copy array
}

/**
 * Migrates a document from older formats to Day 24 format.
 * Adds default values for new fields if not present.
 * Day 24: Added extractedSignals and actions fields.
 * Day 29: Added duplicateStatus, duplicateOfId, duplicateReasons fields.
 */
function migrateDocument(doc: ImportedDocument): ImportedDocument {
  // Create a copy with defaults if fields are missing
  const migrated: ImportedDocument = Object.assign({}, doc);

  // Cast to unknown first, then to Record for checking undefined fields
  // This is needed for backwards compatibility with older data
  const docAsRecord = doc as unknown as Record<string, unknown>;

  // Day 23: Add status if missing (default to 'new')
  if (docAsRecord['status'] === undefined) {
    migrated.status = 'new';
  }

  // Day 23: Add note if missing (default to empty string)
  if (docAsRecord['note'] === undefined) {
    migrated.note = '';
  }

  // Day 23: Add linkedEntities if missing (default to empty array)
  if (docAsRecord['linkedEntities'] === undefined) {
    migrated.linkedEntities = [];
  }

  // Day 24: Add extractedSignals if missing (default to empty array)
  // NOTE: We don't auto-extract on migration to avoid performance issues
  // User can trigger re-extraction via UI if needed
  if (docAsRecord['extractedSignals'] === undefined) {
    migrated.extractedSignals = [];
  }

  // Day 24: Add actions if missing (default to empty array)
  if (docAsRecord['actions'] === undefined) {
    migrated.actions = [];
  }

  // Day 29: Add duplicateStatus if missing (default to 'none')
  if (docAsRecord['duplicateStatus'] === undefined) {
    migrated.duplicateStatus = 'none';
  }

  // Day 29: Add duplicateOfId if missing (default to null)
  if (docAsRecord['duplicateOfId'] === undefined) {
    migrated.duplicateOfId = null;
  }

  // Day 29: Add duplicateReasons if missing (default to empty array)
  if (docAsRecord['duplicateReasons'] === undefined) {
    migrated.duplicateReasons = [];
  }

  // Day 29: Add retentionStatus if missing (default to 'active')
  if (docAsRecord['retentionStatus'] === undefined) {
    migrated.retentionStatus = 'active';
  }

  return migrated;
}

// ============================================================================
// CREATE THE STORE
// ============================================================================

export const useDocumentImportStore = create<DocumentImportStore>(function (set, get) {
  return {
    // ========================================================================
    // INITIAL STATE
    // ========================================================================

    /**
     * Start with empty documents.
     * Will be populated from localStorage on client-side mount.
     */
    documents: [],

    /**
     * Not loaded until loadFromStorage is called.
     */
    isLoaded: false,

    // ========================================================================
    // ACTIONS
    // ========================================================================

    /**
     * Imports a file (PDF/DOCX/TXT).
     *
     * (Day 22 Run 2 - Fix 2):
     * Throws an error for unsupported file types. This is defense-in-depth
     * since the UI also validates, but we want clear errors if somehow
     * an unsupported file gets through.
     */
    importFile: async function (file: File): Promise<ImportedDocument> {
      const id = createDocumentId();
      const now = new Date().toISOString();
      const docType = getDocumentType(file.type, file.name);

      // Day 22 Run 2 - Fix 2: Reject unsupported file types
      if (docType === null) {
        throw new Error(
          'Unsupported file type: "' + file.name + '". ' +
          'Supported types are PDF, DOCX, and TXT files.'
        );
      }

      const mimeType = file.type !== '' ? file.type : 'application/octet-stream';

      // For text files, read content for classification
      let textContent: string | null = null;
      if (docType === 'txt') {
        textContent = await new Promise<string>(function (resolve, reject) {
          const reader = new FileReader();
          reader.onload = function (event) {
            const result = event.target;
            if (result === null || result === undefined) {
              reject(new Error('Failed to read file'));
              return;
            }
            const text = result.result;
            if (typeof text !== 'string') {
              reject(new Error('File content is not text'));
              return;
            }
            resolve(text);
          };
          reader.onerror = function () {
            reject(new Error('Error reading file'));
          };
          reader.readAsText(file);
        });
      }

      // Classify the document
      const classification = classifyDocument(file.name, textContent);

      // Store blob in IndexedDB
      const blobStored = await putDocumentBlob(id, file, file.name, mimeType);
      if (!blobStored) {
        console.warn('[DocumentImportStore] Failed to store blob in IndexedDB');
      }

      // Day 24: Extract signals from text content (if available)
      const contentForExtraction = docType === 'txt' && textContent !== null ? textContent : '';
      const extraction = extractSignals(contentForExtraction, file.name);

      // Create the document metadata (Day 24: includes extractedSignals, actions)
      // Day 29: includes duplicateStatus, duplicateOfId, duplicateReasons, retentionStatus
      const newDoc: ImportedDocument = {
        id: id,
        createdAt: now,
        title: file.name,
        type: docType,
        mimeType: mimeType,
        sizeBytes: file.size,
        category: classification.category,
        sensitivity: classification.sensitivity,
        tags: [],
        isHidden: false,
        status: 'new',
        note: '',
        linkedEntities: [],
        extractedSignals: extraction.signals,
        actions: [],
        hasBlobStorage: blobStored,
        textContent: docType === 'txt' ? textContent : null,
        classificationKeywords: classification.matchedKeywords,
        classificationConfidence: classification.confidence,
        duplicateStatus: 'none',
        duplicateOfId: null,
        duplicateReasons: [],
        retentionStatus: 'active',
      };

      // Day 29: Run dedupe check before saving
      const state = get();
      const dedupeContent = docType === 'txt' && textContent !== null ? textContent : null;
      const dedupeDecision = dedupeIncomingImport(state.documents, newDoc, dedupeContent);

      if (dedupeDecision.isDuplicate && dedupeDecision.originalId !== null) {
        // Mark as duplicate
        markAsDuplicate(newDoc, dedupeDecision.originalId, dedupeDecision.reasons, 'possible_duplicate');
      } else {
        // Ensure duplicateStatus remains 'none' (already set above)
        newDoc.duplicateStatus = 'none';
        newDoc.duplicateOfId = null;
        newDoc.duplicateReasons = [];
      }

      // Add to documents array
      const newDocuments: ImportedDocument[] = [newDoc];
      for (let i = 0; i < state.documents.length; i++) {
        newDocuments.push(state.documents[i]);
      }

      set({ documents: newDocuments });
      get().saveToStorage();

      return newDoc;
    },

    /**
     * Imports pasted text.
     */
    importText: function (text: string, title: string | null): ImportedDocument {
      const id = createDocumentId();
      const now = new Date().toISOString();

      // Generate title if not provided
      let docTitle = title;
      if (docTitle === null || docTitle.trim() === '') {
        // Use first line or first 50 chars
        const firstLine = text.split('\n')[0];
        if (firstLine.length > 50) {
          docTitle = firstLine.substring(0, 50) + '...';
        } else if (firstLine.length > 0) {
          docTitle = firstLine;
        } else {
          docTitle = 'Pasted Text - ' + now.substring(0, 10);
        }
      }

      // Calculate size in bytes (UTF-8)
      const encoder = new TextEncoder();
      const sizeBytes = encoder.encode(text).length;

      // Classify the document
      const classification = classifyDocument(docTitle, text);

      // Day 24: Extract signals from pasted text
      const extraction = extractSignals(text, docTitle);

      // Day 24: includes extractedSignals, actions
      // Day 29: includes duplicateStatus, duplicateOfId, duplicateReasons, retentionStatus
      const newDoc: ImportedDocument = {
        id: id,
        createdAt: now,
        title: docTitle,
        type: 'text',
        mimeType: 'text/plain',
        sizeBytes: sizeBytes,
        category: classification.category,
        sensitivity: classification.sensitivity,
        tags: [],
        isHidden: false,
        status: 'new',
        note: '',
        linkedEntities: [],
        extractedSignals: extraction.signals,
        actions: [],
        hasBlobStorage: false, // Pasted text stored inline
        textContent: text,
        classificationKeywords: classification.matchedKeywords,
        classificationConfidence: classification.confidence,
        duplicateStatus: 'none',
        duplicateOfId: null,
        duplicateReasons: [],
        retentionStatus: 'active',
      };

      // Day 29: Run dedupe check before saving
      const state = get();
      const dedupeDecision = dedupeIncomingImport(state.documents, newDoc, text);

      if (dedupeDecision.isDuplicate && dedupeDecision.originalId !== null) {
        // Mark as duplicate
        markAsDuplicate(newDoc, dedupeDecision.originalId, dedupeDecision.reasons, 'possible_duplicate');
      } else {
        // Ensure duplicateStatus remains 'none' (already set above)
        newDoc.duplicateStatus = 'none';
        newDoc.duplicateOfId = null;
        newDoc.duplicateReasons = [];
      }

      const newDocuments: ImportedDocument[] = [newDoc];
      for (let i = 0; i < state.documents.length; i++) {
        newDocuments.push(state.documents[i]);
      }

      set({ documents: newDocuments });
      get().saveToStorage();

      return newDoc;
    },

    /**
     * Updates a document's category.
     */
    updateCategory: function (id: string, category: DocumentCategory): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].category = category;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Updates a document's sensitivity label.
     */
    updateSensitivity: function (id: string, sensitivity: SensitivityLabel): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].sensitivity = sensitivity;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Updates a document's title.
     */
    updateTitle: function (id: string, title: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].title = title;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Adds a tag to a document.
     */
    addTag: function (id: string, tag: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      // Check if tag already exists
      const doc = state.documents[index];
      for (let i = 0; i < doc.tags.length; i++) {
        if (doc.tags[i] === tag) {
          return false; // Already exists
        }
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].tags.push(tag);

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Removes a tag from a document.
     */
    removeTag: function (id: string, tag: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      const newTags: string[] = [];
      let found = false;

      for (let i = 0; i < newDocuments[index].tags.length; i++) {
        if (newDocuments[index].tags[i] !== tag) {
          newTags.push(newDocuments[index].tags[i]);
        } else {
          found = true;
        }
      }

      if (!found) {
        return false;
      }

      newDocuments[index].tags = newTags;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Resets a document's derived fields to defaults.
     */
    resetDocumentFields: function (id: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const doc = state.documents[index];

      // Re-classify based on title and text content
      const classification = classifyDocument(doc.title, doc.textContent);

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].category = classification.category;
      newDocuments[index].sensitivity = classification.sensitivity;
      newDocuments[index].tags = [];
      newDocuments[index].classificationKeywords = classification.matchedKeywords;
      newDocuments[index].classificationConfidence = classification.confidence;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    // ========================================================================
    // DAY 23 ACTIONS: Triage
    // ========================================================================

    /**
     * Updates a document's triage status (Day 23).
     */
    updateStatus: function (id: string, status: ImportStatus): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].status = status;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Updates a document's note (Day 23).
     */
    updateNote: function (id: string, note: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].note = note;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Bulk update status for multiple documents (Day 23).
     */
    bulkUpdateStatus: function (ids: string[], status: ImportStatus): number {
      const state = get();
      const newDocuments = deepCopyDocuments(state.documents);
      let updateCount = 0;

      for (let i = 0; i < ids.length; i++) {
        const docId = ids[i];
        const docIndex = findDocumentIndex(newDocuments, docId);
        if (docIndex !== -1) {
          newDocuments[docIndex].status = status;
          updateCount = updateCount + 1;
        }
      }

      if (updateCount > 0) {
        set({ documents: newDocuments });
        get().saveToStorage();
      }

      return updateCount;
    },

    /**
     * Bulk add tag to multiple documents (Day 23).
     */
    bulkAddTag: function (ids: string[], tag: string): number {
      const state = get();
      const newDocuments = deepCopyDocuments(state.documents);
      let updateCount = 0;

      for (let i = 0; i < ids.length; i++) {
        const docId = ids[i];
        const docIndex = findDocumentIndex(newDocuments, docId);
        if (docIndex !== -1) {
          // Check if tag already exists
          let tagExists = false;
          for (let j = 0; j < newDocuments[docIndex].tags.length; j++) {
            if (newDocuments[docIndex].tags[j] === tag) {
              tagExists = true;
              break;
            }
          }
          if (!tagExists) {
            newDocuments[docIndex].tags.push(tag);
            updateCount = updateCount + 1;
          }
        }
      }

      if (updateCount > 0) {
        set({ documents: newDocuments });
        get().saveToStorage();
      }

      return updateCount;
    },

    /**
     * Bulk remove tag from multiple documents (Day 23).
     */
    bulkRemoveTag: function (ids: string[], tag: string): number {
      const state = get();
      const newDocuments = deepCopyDocuments(state.documents);
      let updateCount = 0;

      for (let i = 0; i < ids.length; i++) {
        const docId = ids[i];
        const docIndex = findDocumentIndex(newDocuments, docId);
        if (docIndex !== -1) {
          const filteredTags: string[] = [];
          let found = false;
          for (let j = 0; j < newDocuments[docIndex].tags.length; j++) {
            if (newDocuments[docIndex].tags[j] !== tag) {
              filteredTags.push(newDocuments[docIndex].tags[j]);
            } else {
              found = true;
            }
          }
          if (found) {
            newDocuments[docIndex].tags = filteredTags;
            updateCount = updateCount + 1;
          }
        }
      }

      if (updateCount > 0) {
        set({ documents: newDocuments });
        get().saveToStorage();
      }

      return updateCount;
    },

    // ========================================================================
    // DAY 23 ACTIONS: Linking
    // ========================================================================

    /**
     * Links a document to an entity (Day 23).
     */
    linkToEntity: function (id: string, entityType: LinkableEntityType, entityId: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const doc = state.documents[index];

      // Check if already linked
      for (let i = 0; i < doc.linkedEntities.length; i++) {
        const link = doc.linkedEntities[i];
        if (link.entityType === entityType && link.entityId === entityId) {
          return false; // Already linked
        }
      }

      // Create new link
      const newLink: LinkedEntity = {
        entityType: entityType,
        entityId: entityId,
        linkedAt: new Date().toISOString(),
      };

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].linkedEntities.push(newLink);

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Unlinks a document from an entity (Day 23).
     */
    unlinkFromEntity: function (id: string, entityType: LinkableEntityType, entityId: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const doc = state.documents[index];

      // Find and remove the link
      const newLinks: LinkedEntity[] = [];
      let found = false;
      for (let i = 0; i < doc.linkedEntities.length; i++) {
        const link = doc.linkedEntities[i];
        if (link.entityType === entityType && link.entityId === entityId) {
          found = true;
        } else {
          newLinks.push(Object.assign({}, link));
        }
      }

      if (!found) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].linkedEntities = newLinks;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Gets all documents linked to a specific entity (Day 23).
     * Used for backlink queries.
     */
    getLinkedDocuments: function (entityType: LinkableEntityType, entityId: string): ImportedDocument[] {
      const state = get();
      const result: ImportedDocument[] = [];

      for (let i = 0; i < state.documents.length; i++) {
        const doc = state.documents[i];
        for (let j = 0; j < doc.linkedEntities.length; j++) {
          const link = doc.linkedEntities[j];
          if (link.entityType === entityType && link.entityId === entityId) {
            // Return a copy of the document
            const tagsCopy: string[] = [];
            for (let k = 0; k < doc.tags.length; k++) {
              tagsCopy.push(doc.tags[k]);
            }
            const keywordsCopy: string[] = [];
            for (let k = 0; k < doc.classificationKeywords.length; k++) {
              keywordsCopy.push(doc.classificationKeywords[k]);
            }
            const linkedCopy: LinkedEntity[] = [];
            for (let k = 0; k < doc.linkedEntities.length; k++) {
              linkedCopy.push(Object.assign({}, doc.linkedEntities[k]));
            }
            const docCopy: ImportedDocument = Object.assign({}, doc, {
              tags: tagsCopy,
              classificationKeywords: keywordsCopy,
              linkedEntities: linkedCopy,
            });
            result.push(docCopy);
            break; // Only add once per document
          }
        }
      }

      return result;
    },

    // ========================================================================
    // DAY 24 ACTIONS: Signal Extraction
    // ========================================================================

    /**
     * Re-extracts signals from a document's content (Day 24).
     */
    reextractSignals: function (id: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const doc = state.documents[index];

      // Only extract from text content (not binary files)
      if (doc.textContent === null || doc.textContent === '') {
        return false;
      }

      const extraction = extractSignals(doc.textContent, doc.title);

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].extractedSignals = extraction.signals;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    // ========================================================================
    // DAY 24 ACTIONS: Import Actions
    // ========================================================================

    /**
     * Creates an action for a document (Day 24).
     */
    createAction: function (
      docId: string,
      type: ImportActionType,
      payload: Record<string, string>,
      sourceSignalId?: string
    ): ImportAction | null {
      const state = get();
      const index = findDocumentIndex(state.documents, docId);

      if (index === -1) {
        return null;
      }

      const actionId = createDocumentId();
      const now = new Date().toISOString();

      const newAction: ImportAction = {
        id: actionId,
        type: type,
        createdAt: now,
        status: 'queued',
        sourceSignalId: sourceSignalId !== undefined ? sourceSignalId : null,
        payload: Object.assign({}, payload),
        note: '',
        completedAt: null,
      };

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].actions.push(newAction);

      set({ documents: newDocuments });
      get().saveToStorage();

      return newAction;
    },

    /**
     * Updates an action's status (Day 24).
     */
    updateActionStatus: function (docId: string, actionId: string, status: ImportActionStatus): boolean {
      const state = get();
      const docIndex = findDocumentIndex(state.documents, docId);

      if (docIndex === -1) {
        return false;
      }

      const doc = state.documents[docIndex];
      let actionIndex = -1;
      for (let i = 0; i < doc.actions.length; i++) {
        if (doc.actions[i].id === actionId) {
          actionIndex = i;
          break;
        }
      }

      if (actionIndex === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[docIndex].actions[actionIndex].status = status;

      // Set completedAt if status is terminal
      if (status === 'applied' || status === 'failed' || status === 'canceled') {
        newDocuments[docIndex].actions[actionIndex].completedAt = new Date().toISOString();
      }

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Removes an action from a document (Day 24).
     */
    removeAction: function (docId: string, actionId: string): boolean {
      const state = get();
      const docIndex = findDocumentIndex(state.documents, docId);

      if (docIndex === -1) {
        return false;
      }

      const doc = state.documents[docIndex];
      const newActions: ImportAction[] = [];
      let found = false;

      for (let i = 0; i < doc.actions.length; i++) {
        if (doc.actions[i].id === actionId) {
          found = true;
        } else {
          newActions.push(Object.assign({}, doc.actions[i], {
            payload: Object.assign({}, doc.actions[i].payload),
          }));
        }
      }

      if (!found) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[docIndex].actions = newActions;

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Gets all queued actions for a document (Day 24).
     */
    getQueuedActions: function (docId: string): ImportAction[] {
      const state = get();
      const docIndex = findDocumentIndex(state.documents, docId);

      if (docIndex === -1) {
        return [];
      }

      const doc = state.documents[docIndex];
      const queued: ImportAction[] = [];

      for (let i = 0; i < doc.actions.length; i++) {
        const action = doc.actions[i];
        if (action.status === 'queued') {
          queued.push(Object.assign({}, action, {
            payload: Object.assign({}, action.payload),
          }));
        }
      }

      return queued;
    },

    /**
     * Deletes a document by ID.
     */
    deleteDocument: async function (id: string): Promise<boolean> {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const doc = state.documents[index];

      // Delete blob from IndexedDB if it exists
      if (doc.hasBlobStorage) {
        await deleteDocumentBlob(id);
      }

      // Remove from documents array
      const newDocuments: ImportedDocument[] = [];
      for (let i = 0; i < state.documents.length; i++) {
        if (i !== index) {
          newDocuments.push(state.documents[i]);
        }
      }

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Toggles a document's hidden state.
     */
    toggleHidden: function (id: string): boolean | null {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return null;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].isHidden = !newDocuments[index].isHidden;

      set({ documents: newDocuments });
      get().saveToStorage();

      return newDocuments[index].isHidden;
    },

    // ========================================================================
    // DAY 29 ACTIONS: Retention Management
    // ========================================================================

    /**
     * Archives a document (sets retentionStatus to 'archived').
     */
    archiveDocument: function (id: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].retentionStatus = 'archived';

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Restores a document from archived/deleted (sets retentionStatus to 'active').
     */
    restoreDocument: function (id: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].retentionStatus = 'active';

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Soft deletes a document (sets retentionStatus to 'deleted').
     */
    softDeleteDocument: function (id: string): boolean {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return false;
      }

      const newDocuments = deepCopyDocuments(state.documents);
      newDocuments[index].retentionStatus = 'deleted';

      set({ documents: newDocuments });
      get().saveToStorage();

      return true;
    },

    /**
     * Gets a document by ID.
     * Day 23: Also copies linkedEntities array.
     * Day 24: Also copies extractedSignals and actions arrays.
     */
    getDocument: function (id: string): ImportedDocument | null {
      const state = get();
      const index = findDocumentIndex(state.documents, id);

      if (index === -1) {
        return null;
      }

      // Return a copy
      const doc = state.documents[index];
      const tagsCopy: string[] = [];
      for (let i = 0; i < doc.tags.length; i++) {
        tagsCopy.push(doc.tags[i]);
      }
      const keywordsCopy: string[] = [];
      for (let i = 0; i < doc.classificationKeywords.length; i++) {
        keywordsCopy.push(doc.classificationKeywords[i]);
      }
      // Day 23: Copy linkedEntities
      const linkedCopy: LinkedEntity[] = [];
      if (doc.linkedEntities !== undefined && doc.linkedEntities !== null) {
        for (let i = 0; i < doc.linkedEntities.length; i++) {
          linkedCopy.push(Object.assign({}, doc.linkedEntities[i]));
        }
      }
      // Day 24: Copy extractedSignals
      const signalsCopy: ExtractedSignal[] = [];
      if (doc.extractedSignals !== undefined && doc.extractedSignals !== null) {
        for (let i = 0; i < doc.extractedSignals.length; i++) {
          const sig = doc.extractedSignals[i];
          const metadataCopy = sig.metadata !== null ? Object.assign({}, sig.metadata) : null;
          const rangeCopy: [number, number] | null = sig.sourceRange !== null
            ? [sig.sourceRange[0], sig.sourceRange[1]]
            : null;
          signalsCopy.push(Object.assign({}, sig, {
            metadata: metadataCopy,
            sourceRange: rangeCopy,
          }));
        }
      }
      // Day 24: Copy actions
      const actionsCopy: ImportAction[] = [];
      if (doc.actions !== undefined && doc.actions !== null) {
        for (let i = 0; i < doc.actions.length; i++) {
          const action = doc.actions[i];
          actionsCopy.push(Object.assign({}, action, {
            payload: Object.assign({}, action.payload),
          }));
        }
      }
      return Object.assign({}, doc, {
        tags: tagsCopy,
        classificationKeywords: keywordsCopy,
        linkedEntities: linkedCopy,
        extractedSignals: signalsCopy,
        actions: actionsCopy,
      });
    },

    /**
     * Gets all documents.
     */
    getAllDocuments: function (): ImportedDocument[] {
      return deepCopyDocuments(get().documents);
    },

    /**
     * Resets the store to initial state.
     * Day 23: Links are stored on import records (linkedEntities array),
     * so clearing documents also clears all link data.
     */
    reset: async function (): Promise<void> {
      // Clear IndexedDB blobs
      await clearAllDocumentBlobs();

      set({
        documents: [],
        isLoaded: true,
      });

      // Clear from localStorage (SSR-safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(DOCUMENT_IMPORT_STORAGE_KEY);
        } catch (error) {
          console.error('[DocumentImportStore] Failed to clear storage:', error);
        }
      }
    },

    /**
     * Loads documents from localStorage.
     */
    loadFromStorage: function (): void {
      // SSR guard
      if (typeof window === 'undefined') {
        set({ isLoaded: true });
        return;
      }

      const loadedDocuments: ImportedDocument[] = [];

      try {
        const stored = localStorage.getItem(DOCUMENT_IMPORT_STORAGE_KEY);

        if (stored !== null && stored !== '') {
          const parsed = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            for (let i = 0; i < parsed.length; i++) {
              const doc = parsed[i];
              if (isValidImportedDocument(doc)) {
                // Day 23: Migrate document to add new fields if missing
                const migratedDoc = migrateDocument(doc);
                loadedDocuments.push(migratedDoc);
              } else {
                console.warn('[DocumentImportStore] Skipping invalid document at index', i);
              }
            }
          } else {
            console.warn('[DocumentImportStore] Stored data is not an array, resetting');
          }
        }
      } catch (error) {
        console.error('[DocumentImportStore] Failed to load from storage:', error);
      }

      set({
        documents: loadedDocuments,
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
        localStorage.setItem(DOCUMENT_IMPORT_STORAGE_KEY, JSON.stringify(state.documents));
      } catch (error) {
        console.error('[DocumentImportStore] Failed to save to storage:', error);
      }
    },
  };
});
