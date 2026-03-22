/**
 * ============================================================================
 * EMAIL INGESTION STORE (Day 21 - Email Ingestion Inbox v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This Zustand store manages ingested emails for the PathOS application.
 * When a user uploads a .eml file or pastes raw email text, it's parsed
 * and stored here, persisted to localStorage. The user can then view,
 * manage, and delete ingested emails.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │       UI        │ --> │   THIS FILE     │ --> │  localStorage  │
 * │  (Email Inbox   │     │  (Zustand Store)│     │  (persistence) │
 * │   page, ingest) │     │                 │     │                │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *                                │
 *                                ▼
 *                        ┌─────────────────┐
 *                        │  parseEmailText │
 *                        │  (lib/email)    │
 *                        └─────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Store ingested emails - maintains array of parsed email items
 * 2. CRUD operations - ingest from text/file, delete emails
 * 3. Per-item visibility - isHidden flag for privacy controls
 * 4. Persist to localStorage - emails survive page refresh
 * 5. Provide reset action - for "Delete All Local Data" feature
 *
 * HOUSE RULES COMPLIANCE (Day 21):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 21 - Email Ingestion Inbox v1
 * ============================================================================
 */

import { create } from 'zustand';
import { EMAIL_INGESTION_STORAGE_KEY } from '@/lib/storage-keys';
import {
  parseEmailText,
  parseEmlFile,
  type EmailClassification,
  type EmailAttachment,
} from '@/lib/email';

// Re-export for convenience
export { EMAIL_INGESTION_STORAGE_KEY };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Source type for imported emails.
 * 
 * DESIGN RATIONALE (Day 21 - User-friendly Import Paths):
 * - 'pasted': User pasted email content (subject/from/date/body) directly
 * - 'attachments': User uploaded attachments (PDF/DOCX/TXT) without email text
 * - 'eml': User uploaded a saved email file (.eml) - advanced option
 */
export type EmailSourceType = 'pasted' | 'attachments' | 'eml';

/**
 * Represents an imported email item.
 *
 * DESIGN RATIONALE:
 * Each item stores parsed email data plus metadata about when it was
 * imported and its visibility state. The raw email is preserved for
 * potential re-parsing or debugging. The sourceType indicates how the
 * email was imported (pasted, attachments, or .eml file).
 */
export interface EmailIngestedItem {
  /**
   * Unique identifier for the email item.
   * Generated using createEmailId().
   */
  id: string;

  /**
   * ISO 8601 timestamp when the email was ingested.
   */
  createdAt: string;

  /**
   * From header value.
   * Example: "sender@agency.gov"
   */
  from: string;

  /**
   * To header value.
   * Example: "recipient@email.com"
   */
  to: string;

  /**
   * Subject header value.
   * Example: "Your Pay Statement"
   */
  subject: string;

  /**
   * Date header value (as extracted from email).
   * Example: "Mon, 15 Dec 2025 10:30:00 -0500"
   */
  date: string;

  /**
   * Raw email text (stored for v1, may be useful for re-parsing).
   */
  raw: string;

  /**
   * Array of detected attachments.
   */
  attachments: EmailAttachment[];

  /**
   * Classification category.
   */
  classification: EmailClassification;

  /**
   * Whether this item is hidden (privacy toggle).
   * Consistent with existing per-card visibility patterns.
   */
  isHidden: boolean;

  /**
   * How the email was imported into PathOS.
   * 
   * Day 21: Added to support user-friendly import paths:
   * - 'pasted': User pasted email content directly
   * - 'attachments': User uploaded attachments (PDF/DOCX/TXT)
   * - 'eml': User uploaded a saved email file (.eml)
   */
  sourceType: EmailSourceType;
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

/**
 * State shape for the email ingestion store.
 */
interface EmailIngestionState {
  /**
   * Array of ingested email items.
   * Ordered by createdAt (most recent first).
   */
  emails: EmailIngestedItem[];

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
 * Actions available on the email ingestion store.
 * 
 * Day 21: Internal names kept as "ingest" to minimize churn.
 * UI copy uses "import" for user-facing language.
 */
interface EmailIngestionActions {
  /**
   * Imports an email from pasted text.
   * Internal name: ingestFromText (kept for minimal diff)
   * UI label: "Import Email Content"
   *
   * @param raw - Raw email text (headers + body)
   * @returns The created EmailIngestedItem
   */
  ingestFromText: (raw: string) => EmailIngestedItem;

  /**
   * Imports an email from uploaded attachments (PDF/DOCX/TXT).
   * Creates an email item with attachment metadata but minimal raw text.
   * 
   * Day 21: New action for attachment-first import path.
   *
   * @param files - Array of File objects from file input
   * @returns Promise resolving to the created EmailIngestedItem
   */
  importFromAttachments: (files: File[]) => Promise<EmailIngestedItem>;

  /**
   * Imports an email from a .eml file (advanced).
   * Internal name: ingestFromEmlFile (kept for minimal diff)
   * UI label: "Import Saved Email"
   *
   * @param file - File object from file input
   * @returns Promise resolving to the created EmailIngestedItem
   */
  ingestFromEmlFile: (file: File) => Promise<EmailIngestedItem>;

  /**
   * Deletes an email by ID.
   *
   * @param id - The email ID to delete
   * @returns true if deleted, false if not found
   */
  deleteEmail: (id: string) => boolean;

  /**
   * Toggles an email's hidden state.
   *
   * @param id - The email ID to toggle
   * @returns The new hidden state, or null if not found
   */
  toggleHidden: (id: string) => boolean | null;

  /**
   * Gets an email by ID.
   *
   * @param id - The email ID
   * @returns The email or null if not found
   */
  getEmail: (id: string) => EmailIngestedItem | null;

  /**
   * Gets all emails.
   *
   * @returns Array of all email items
   */
  getAllEmails: () => EmailIngestedItem[];

  /**
   * Resets the store to initial state.
   * Called by "Delete All Local Data" feature.
   */
  reset: () => void;

  /**
   * Loads emails from localStorage.
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

export type EmailIngestionStore = EmailIngestionState & EmailIngestionActions;

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Selector for all emails.
 */
export const selectEmails = function (state: EmailIngestionStore): EmailIngestedItem[] {
  return state.emails;
};

/**
 * Selector for emails count.
 */
export const selectEmailsCount = function (state: EmailIngestionStore): number {
  return state.emails.length;
};

/**
 * Selector for whether store is loaded.
 */
export const selectIsLoaded = function (state: EmailIngestionStore): boolean {
  return state.isLoaded;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a unique ID for a new email item.
 * Uses crypto.randomUUID if available, otherwise falls back to timestamp+random.
 */
function createEmailId(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj !== null && cryptoObj !== undefined && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'email-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Finds the index of an email in the emails array by ID.
 *
 * @param emails - Array of emails
 * @param id - ID to find
 * @returns Index if found, -1 if not found
 */
function findEmailIndex(emails: EmailIngestedItem[], id: string): number {
  for (let i = 0; i < emails.length; i++) {
    if (emails[i].id === id) {
      return i;
    }
  }
  return -1;
}

/**
 * Creates a deep copy of an emails array.
 * Day 21: Also handles sourceType migration for backwards compatibility.
 *
 * @param emails - Array to copy
 * @returns New array with copied email objects
 */
function deepCopyEmails(emails: EmailIngestedItem[]): EmailIngestedItem[] {
  const copy: EmailIngestedItem[] = [];
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    // Copy attachments array explicitly
    const attachmentsCopy: EmailAttachment[] = [];
    for (let j = 0; j < email.attachments.length; j++) {
      const att = email.attachments[j];
      attachmentsCopy.push({
        filename: att.filename,
        contentType: att.contentType,
        sizeBytes: att.sizeBytes,
      });
    }
    // Day 21: Ensure sourceType exists (backwards compatibility)
    const sourceType: EmailSourceType = email.sourceType !== undefined && email.sourceType !== null 
      ? email.sourceType 
      : 'pasted';
    const emailCopy: EmailIngestedItem = Object.assign({}, email, {
      attachments: attachmentsCopy,
      sourceType: sourceType,
    });
    copy.push(emailCopy);
  }
  return copy;
}

/**
 * Validates that a parsed object has required EmailIngestedItem fields.
 *
 * @param obj - Object to validate
 * @returns true if valid EmailIngestedItem, false otherwise
 */
function isValidEmailIngestedItem(obj: unknown): obj is EmailIngestedItem {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof candidate['id'] !== 'string') return false;
  if (typeof candidate['createdAt'] !== 'string') return false;
  if (typeof candidate['raw'] !== 'string') return false;

  // from, to, subject, date can be strings (empty is OK)
  if (typeof candidate['from'] !== 'string') return false;
  if (typeof candidate['to'] !== 'string') return false;
  if (typeof candidate['subject'] !== 'string') return false;
  if (typeof candidate['date'] !== 'string') return false;

  // Check classification is valid
  const validClassifications = ['PayStub', 'RelocationOrders', 'FEHB', 'JobPosting', 'Other'];
  const classification = candidate['classification'];
  let classificationValid = false;
  for (let i = 0; i < validClassifications.length; i++) {
    if (classification === validClassifications[i]) {
      classificationValid = true;
      break;
    }
  }
  if (!classificationValid) return false;

  // Check attachments is array
  if (!Array.isArray(candidate['attachments'])) return false;

  // Check isHidden is boolean
  if (typeof candidate['isHidden'] !== 'boolean') return false;

  // Check sourceType is valid (Day 21)
  // For backwards compatibility, treat missing sourceType as 'pasted'
  const sourceType = candidate['sourceType'];
  if (sourceType !== undefined && sourceType !== null) {
    if (sourceType !== 'pasted' && sourceType !== 'attachments' && sourceType !== 'eml') {
      return false;
    }
  }

  return true;
}

// ============================================================================
// CREATE THE STORE
// ============================================================================

export const useEmailIngestionStore = create<EmailIngestionStore>(function (set, get) {
  return {
    // ========================================================================
    // INITIAL STATE
    // ========================================================================

    /**
     * Start with empty emails.
     * Will be populated from localStorage on client-side mount.
     */
    emails: [],

    /**
     * Not loaded until loadFromStorage is called.
     */
    isLoaded: false,

    // ========================================================================
    // ACTIONS
    // ========================================================================

    /**
     * Imports an email from pasted text.
     *
     * HOW IT WORKS:
     * 1. Parse the raw email text
     * 2. Create new EmailIngestedItem with parsed data
     * 3. Add to beginning of emails array
     * 4. Persist to storage
     * 
     * Day 21: Sets sourceType to 'pasted' for user-friendly display.
     */
    ingestFromText: function (raw: string): EmailIngestedItem {
      const parsed = parseEmailText(raw);
      const now = new Date().toISOString();

      const newEmail: EmailIngestedItem = {
        id: createEmailId(),
        createdAt: now,
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        date: parsed.date,
        raw: raw,
        attachments: parsed.attachments,
        classification: parsed.classification,
        isHidden: false,
        sourceType: 'pasted',
      };

      const state = get();
      const newEmails: EmailIngestedItem[] = [newEmail];
      for (let i = 0; i < state.emails.length; i++) {
        newEmails.push(state.emails[i]);
      }

      set({ emails: newEmails });
      get().saveToStorage();

      return newEmail;
    },

    /**
     * Imports an email from uploaded attachments (PDF/DOCX/TXT).
     * 
     * Day 21: New action for attachment-first import path.
     * Creates an email item with attachment metadata.
     * Classification uses filenames when no email text is available.
     *
     * HOW IT WORKS:
     * 1. Extract filenames from uploaded files
     * 2. Classify based on filenames
     * 3. Create EmailIngestedItem with attachment info
     * 4. Persist to storage
     */
    importFromAttachments: async function (files: File[]): Promise<EmailIngestedItem> {
      const now = new Date().toISOString();
      
      // Build attachments array from files
      const attachments: EmailAttachment[] = [];
      const filenames: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        attachments.push({
          filename: file.name,
          contentType: file.type !== '' ? file.type : undefined,
          sizeBytes: file.size,
        });
        filenames.push(file.name);
      }
      
      // Import the classifyEmail function to classify based on filenames
      // Since we have no email text, subject/body are empty - classification uses filenames
      const { classifyEmail } = await import('@/lib/email');
      const classification = classifyEmail('', '', filenames);
      
      // Build a simple description as the "raw" content
      const rawDescription = 'Imported attachments:\n' + filenames.join('\n');
      
      const newEmail: EmailIngestedItem = {
        id: createEmailId(),
        createdAt: now,
        from: '',
        to: '',
        subject: 'Uploaded Attachments (' + files.length + ' file' + (files.length === 1 ? '' : 's') + ')',
        date: now.substring(0, 10),
        raw: rawDescription,
        attachments: attachments,
        classification: classification,
        isHidden: false,
        sourceType: 'attachments',
      };

      const state = get();
      const newEmails: EmailIngestedItem[] = [newEmail];
      for (let i = 0; i < state.emails.length; i++) {
        newEmails.push(state.emails[i]);
      }

      set({ emails: newEmails });
      get().saveToStorage();

      return newEmail;
    },

    /**
     * Imports an email from a .eml file (advanced option).
     *
     * HOW IT WORKS:
     * 1. Read file contents using FileReader
     * 2. Parse the email text
     * 3. Create new EmailIngestedItem
     * 4. Persist to storage
     * 
     * Day 21: Sets sourceType to 'eml' for user-friendly display.
     */
    ingestFromEmlFile: async function (file: File): Promise<EmailIngestedItem> {
      const parsed = await parseEmlFile(file);
      
      // Read the raw text from file for storage
      const rawText = await new Promise<string>(function (resolve, reject) {
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

      const now = new Date().toISOString();

      const newEmail: EmailIngestedItem = {
        id: createEmailId(),
        createdAt: now,
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        date: parsed.date,
        raw: rawText,
        attachments: parsed.attachments,
        classification: parsed.classification,
        isHidden: false,
        sourceType: 'eml',
      };

      const state = get();
      const newEmails: EmailIngestedItem[] = [newEmail];
      for (let i = 0; i < state.emails.length; i++) {
        newEmails.push(state.emails[i]);
      }

      set({ emails: newEmails });
      get().saveToStorage();

      return newEmail;
    },

    /**
     * Deletes an email by ID.
     */
    deleteEmail: function (id: string): boolean {
      const state = get();
      const index = findEmailIndex(state.emails, id);

      if (index === -1) {
        return false;
      }

      const newEmails: EmailIngestedItem[] = [];
      for (let i = 0; i < state.emails.length; i++) {
        if (i !== index) {
          newEmails.push(state.emails[i]);
        }
      }

      set({ emails: newEmails });
      get().saveToStorage();

      return true;
    },

    /**
     * Toggles an email's hidden state.
     */
    toggleHidden: function (id: string): boolean | null {
      const state = get();
      const index = findEmailIndex(state.emails, id);

      if (index === -1) {
        return null;
      }

      const newEmails = deepCopyEmails(state.emails);
      const email = newEmails[index];
      email.isHidden = !email.isHidden;

      set({ emails: newEmails });
      get().saveToStorage();

      return email.isHidden;
    },

    /**
     * Gets an email by ID.
     * Day 21: Also ensures sourceType is present for backwards compatibility.
     */
    getEmail: function (id: string): EmailIngestedItem | null {
      const state = get();
      const index = findEmailIndex(state.emails, id);

      if (index === -1) {
        return null;
      }

      // Return a copy
      const email = state.emails[index];
      const attachmentsCopy: EmailAttachment[] = [];
      for (let i = 0; i < email.attachments.length; i++) {
        const att = email.attachments[i];
        attachmentsCopy.push({
          filename: att.filename,
          contentType: att.contentType,
          sizeBytes: att.sizeBytes,
        });
      }
      // Day 21: Ensure sourceType exists
      const sourceType: EmailSourceType = email.sourceType !== undefined && email.sourceType !== null 
        ? email.sourceType 
        : 'pasted';
      return Object.assign({}, email, { 
        attachments: attachmentsCopy,
        sourceType: sourceType,
      });
    },

    /**
     * Gets all emails.
     */
    getAllEmails: function (): EmailIngestedItem[] {
      return deepCopyEmails(get().emails);
    },

    /**
     * Resets the store to initial state.
     * Called by "Delete All Local Data" feature.
     */
    reset: function (): void {
      set({
        emails: [],
        isLoaded: true,
      });

      // Clear from localStorage (SSR-safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(EMAIL_INGESTION_STORAGE_KEY);
        } catch (error) {
          console.error('[EmailIngestionStore] Failed to clear storage:', error);
        }
      }
    },

    /**
     * Loads emails from localStorage.
     * Called on initial client-side mount.
     * Day 21: Also migrates old items without sourceType field.
     */
    loadFromStorage: function (): void {
      // SSR guard
      if (typeof window === 'undefined') {
        set({ isLoaded: true });
        return;
      }

      const loadedEmails: EmailIngestedItem[] = [];

      try {
        const stored = localStorage.getItem(EMAIL_INGESTION_STORAGE_KEY);

        if (stored !== null && stored !== '') {
          const parsed = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            for (let i = 0; i < parsed.length; i++) {
              const email = parsed[i];
              if (isValidEmailIngestedItem(email)) {
                // Day 21: Migrate items without sourceType
                const emailWithSource = email as EmailIngestedItem;
                if (emailWithSource.sourceType === undefined || emailWithSource.sourceType === null) {
                  emailWithSource.sourceType = 'pasted';
                }
                loadedEmails.push(emailWithSource);
              } else {
                console.warn('[EmailIngestionStore] Skipping invalid email at index', i);
              }
            }
          } else {
            console.warn('[EmailIngestionStore] Stored data is not an array, resetting');
          }
        }
      } catch (error) {
        console.error('[EmailIngestionStore] Failed to load from storage:', error);
      }

      set({
        emails: loadedEmails,
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
        localStorage.setItem(EMAIL_INGESTION_STORAGE_KEY, JSON.stringify(state.emails));
      } catch (error) {
        console.error('[EmailIngestionStore] Failed to save to storage:', error);
      }
    },
  };
});

