/**
 * ============================================================================
 * AUDIT LOG STORE (Day 27 - Audit/Trust UX v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This Zustand store manages an append-only audit log of meaningful actions
 * in PathOS. Every action that modifies state is logged with metadata for
 * transparency and trust.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │    All Stores   │ --> │   THIS FILE     │ --> │  localStorage  │
 * │  (actions call  │     │  (Append-only   │     │  (audit log)   │
 * │   appendEvent)  │     │   Zustand Store)│     └────────────────┘
 * └─────────────────┘     └─────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Append-only log - events can only be added, never modified or deleted
 * 2. Event tracking - captures import actions, task operations, reminder changes
 * 3. Linkages - events can link to importItemId, taskId, actionId
 * 4. Source attribution - distinguishes user vs system-generated events
 * 5. Persistence - survives page refresh via localStorage
 * 6. Query support - filter events by importItemId, taskId, etc.
 *
 * DESIGN RATIONALE (Append-Only):
 * The audit log is intentionally append-only to ensure auditability.
 * Users cannot delete or modify past events, which provides a trustworthy
 * record of all actions taken. This is critical for the "Why am I seeing this?"
 * feature that explains system-generated suggestions.
 *
 * HOUSE RULES COMPLIANCE (Day 27):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 27 - Audit/Trust UX v1
 * ============================================================================
 */

import { create } from 'zustand';
import { AUDIT_LOG_STORAGE_KEY } from '@/lib/storage-keys';

// Re-export for convenience
export { AUDIT_LOG_STORAGE_KEY };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Audit event types (Day 27).
 *
 * DESIGN RATIONALE:
 * Event types map to specific actions in PathOS:
 * - import_action_created: User triggered a suggested action from import
 * - import_action_applied: Action was successfully applied
 * - task_created: New task created from import
 * - task_updated: Task fields were modified
 * - task_completed: Task was marked as done
 * - task_deleted: Task was deleted
 * - reminder_enabled: Reminder was turned on
 * - reminder_changed: Reminder settings were modified
 * - reminder_snoozed: Reminder was snoozed
 * - reminder_disabled: Reminder was turned off
 * - deadline_tracked: Deadline from import was tracked
 */
export type AuditEventType =
  | 'import_action_created'
  | 'import_action_applied'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_deleted'
  | 'reminder_enabled'
  | 'reminder_changed'
  | 'reminder_snoozed'
  | 'reminder_disabled'
  | 'deadline_tracked';

/**
 * All valid audit event types for iteration/validation.
 */
export const ALL_AUDIT_EVENT_TYPES: AuditEventType[] = [
  'import_action_created',
  'import_action_applied',
  'task_created',
  'task_updated',
  'task_completed',
  'task_deleted',
  'reminder_enabled',
  'reminder_changed',
  'reminder_snoozed',
  'reminder_disabled',
  'deadline_tracked',
];

/**
 * Human-readable labels for audit event types.
 */
export const AUDIT_EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  import_action_created: 'Action Created',
  import_action_applied: 'Action Applied',
  task_created: 'Task Created',
  task_updated: 'Task Updated',
  task_completed: 'Task Completed',
  task_deleted: 'Task Deleted',
  reminder_enabled: 'Reminder Enabled',
  reminder_changed: 'Reminder Changed',
  reminder_snoozed: 'Reminder Snoozed',
  reminder_disabled: 'Reminder Disabled',
  deadline_tracked: 'Deadline Tracked',
};

/**
 * Icon colors for audit event types (Tailwind classes).
 */
export const AUDIT_EVENT_TYPE_COLORS: Record<AuditEventType, string> = {
  import_action_created: 'text-blue-400',
  import_action_applied: 'text-green-400',
  task_created: 'text-amber-400',
  task_updated: 'text-slate-400',
  task_completed: 'text-green-400',
  task_deleted: 'text-red-400',
  reminder_enabled: 'text-purple-400',
  reminder_changed: 'text-purple-400',
  reminder_snoozed: 'text-amber-400',
  reminder_disabled: 'text-slate-400',
  deadline_tracked: 'text-red-400',
};

/**
 * Event source type.
 *
 * DESIGN RATIONALE:
 * - 'user': Event was triggered by user action
 * - 'system': Event was triggered by system (e.g., auto-extraction)
 */
export type AuditEventSource = 'user' | 'system';

/**
 * Represents an audit event (Day 27).
 *
 * DESIGN RATIONALE:
 * Each event captures who did what, when, and why, with optional
 * linkages to related entities (imports, tasks, actions).
 */
export interface AuditEvent {
  /**
   * Unique identifier for the event.
   */
  id: string;

  /**
   * ISO 8601 timestamp when the event occurred.
   */
  timestamp: string;

  /**
   * Type of event (determines behavior and display).
   */
  type: AuditEventType;

  /**
   * Human-readable summary of what happened.
   * e.g., "Created task 'Submit application'"
   */
  summary: string;

  /**
   * ID of the linked import item (if any).
   */
  importItemId: string | null;

  /**
   * ID of the linked task (if any).
   */
  taskId: string | null;

  /**
   * ID of the linked import action (if any).
   */
  actionId: string | null;

  /**
   * Small metadata object for additional context.
   * Keep this small and safe (no sensitive data).
   */
  metadata: Record<string, string | number | boolean> | null;

  /**
   * Source of the event (user or system).
   */
  source: AuditEventSource;
}

/**
 * Data required to create a new audit event.
 */
export interface CreateAuditEventData {
  type: AuditEventType;
  summary: string;
  importItemId?: string | null;
  taskId?: string | null;
  actionId?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
  source?: AuditEventSource;
}

/**
 * Filter options for querying audit events.
 */
export interface AuditEventFilter {
  importItemId?: string;
  taskId?: string;
  type?: AuditEventType;
  limit?: number;
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

/**
 * State shape for the audit log store.
 */
interface AuditLogState {
  /**
   * Array of all audit events.
   * Ordered by timestamp (most recent first).
   * This is append-only - events cannot be modified or deleted.
   */
  events: AuditEvent[];

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
 * Actions available on the audit log store.
 *
 * NOTE: There is intentionally no "updateEvent" or "deleteEvent" action.
 * The audit log is append-only for auditability.
 */
interface AuditLogActions {
  /**
   * Appends a new audit event to the log.
   * This is the only way to add events - they cannot be modified after creation.
   *
   * @param eventData - Data for the new event
   * @returns The created AuditEvent
   */
  appendAuditEvent: (eventData: CreateAuditEventData) => AuditEvent;

  /**
   * Gets audit events with optional filtering.
   *
   * @param filter - Optional filter criteria
   * @returns Array of events matching the filter
   */
  getAuditEvents: (filter?: AuditEventFilter) => AuditEvent[];

  /**
   * Gets the total count of audit events.
   *
   * @returns Total number of events in the log
   */
  getEventCount: () => number;

  /**
   * Resets the store to initial state.
   * Called by "Delete All Local Data" feature.
   *
   * NOTE: This is the ONLY way to clear the audit log, and it requires
   * explicit user action via the Delete All Local Data feature.
   */
  reset: () => void;

  /**
   * Loads events from localStorage.
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

export type AuditLogStore = AuditLogState & AuditLogActions;

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Selector for all events.
 */
export const selectAuditEvents = function (state: AuditLogStore): AuditEvent[] {
  return state.events;
};

/**
 * Selector for events count.
 */
export const selectAuditEventsCount = function (state: AuditLogStore): number {
  return state.events.length;
};

/**
 * Selector for whether store is loaded.
 */
export const selectAuditLogIsLoaded = function (state: AuditLogStore): boolean {
  return state.isLoaded;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a unique ID for a new audit event.
 */
function createEventId(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj !== null && cryptoObj !== undefined && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'audit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Creates a deep copy of an events array.
 * NOTE: Currently unused but kept for future bulk operations.
 * Prefixed with underscore to indicate intentionally unused.
 */
function _deepCopyEvents(events: AuditEvent[]): AuditEvent[] {
  const copy: AuditEvent[] = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    // Copy metadata object explicitly
    let metadataCopy: Record<string, string | number | boolean> | null = null;
    if (event.metadata !== null) {
      metadataCopy = {};
      const keys = Object.keys(event.metadata);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        metadataCopy[key] = event.metadata[key];
      }
    }
    const eventCopy: AuditEvent = Object.assign({}, event, {
      metadata: metadataCopy,
    });
    copy.push(eventCopy);
  }
  return copy;
}

// Suppress unused warning for future-reserved function
void _deepCopyEvents;

/**
 * Validates that a parsed object has required AuditEvent fields.
 */
function isValidAuditEvent(obj: unknown): obj is AuditEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof candidate['id'] !== 'string') return false;
  if (typeof candidate['timestamp'] !== 'string') return false;
  if (typeof candidate['summary'] !== 'string') return false;

  // Check type is valid
  let typeValid = false;
  for (let i = 0; i < ALL_AUDIT_EVENT_TYPES.length; i++) {
    if (candidate['type'] === ALL_AUDIT_EVENT_TYPES[i]) {
      typeValid = true;
      break;
    }
  }
  if (!typeValid) return false;

  // Check source is valid
  const validSources = ['user', 'system'];
  let sourceValid = false;
  for (let i = 0; i < validSources.length; i++) {
    if (candidate['source'] === validSources[i]) {
      sourceValid = true;
      break;
    }
  }
  if (!sourceValid) return false;

  return true;
}

/**
 * Maximum number of events to keep in storage.
 * Older events are trimmed to prevent unbounded growth.
 */
const MAX_AUDIT_EVENTS = 1000;

// ============================================================================
// CREATE THE STORE
// ============================================================================

export const useAuditLogStore = create<AuditLogStore>(function (set, get) {
  return {
    // ========================================================================
    // INITIAL STATE
    // ========================================================================

    /**
     * Start with empty events.
     * Will be populated from localStorage on client-side mount.
     */
    events: [],

    /**
     * Not loaded until loadFromStorage is called.
     */
    isLoaded: false,

    // ========================================================================
    // ACTIONS
    // ========================================================================

    /**
     * Appends a new audit event to the log.
     */
    appendAuditEvent: function (eventData: CreateAuditEventData): AuditEvent {
      const id = createEventId();
      const now = new Date().toISOString();

      // Build the new event object
      const newEvent: AuditEvent = {
        id: id,
        timestamp: now,
        type: eventData.type,
        summary: eventData.summary,
        importItemId: eventData.importItemId !== undefined ? eventData.importItemId : null,
        taskId: eventData.taskId !== undefined ? eventData.taskId : null,
        actionId: eventData.actionId !== undefined ? eventData.actionId : null,
        metadata: eventData.metadata !== undefined ? eventData.metadata : null,
        source: eventData.source !== undefined ? eventData.source : 'user',
      };

      // Add to events array (most recent first)
      const state = get();
      const newEvents: AuditEvent[] = [newEvent];
      
      // Copy existing events, but cap at MAX_AUDIT_EVENTS - 1 to make room for new one
      const maxToCopy = MAX_AUDIT_EVENTS - 1;
      const copyCount = Math.min(state.events.length, maxToCopy);
      for (let i = 0; i < copyCount; i++) {
        newEvents.push(state.events[i]);
      }

      set({ events: newEvents });
      get().saveToStorage();

      return newEvent;
    },

    /**
     * Gets audit events with optional filtering.
     */
    getAuditEvents: function (filter?: AuditEventFilter): AuditEvent[] {
      const state = get();
      const result: AuditEvent[] = [];

      // Determine limit (default to all)
      const limit = filter !== undefined && filter.limit !== undefined
        ? filter.limit
        : state.events.length;

      for (let i = 0; i < state.events.length && result.length < limit; i++) {
        const event = state.events[i];
        let include = true;

        // Apply importItemId filter
        if (filter !== undefined && filter.importItemId !== undefined) {
          if (event.importItemId !== filter.importItemId) {
            include = false;
          }
        }

        // Apply taskId filter
        if (filter !== undefined && filter.taskId !== undefined) {
          if (event.taskId !== filter.taskId) {
            include = false;
          }
        }

        // Apply type filter
        if (filter !== undefined && filter.type !== undefined) {
          if (event.type !== filter.type) {
            include = false;
          }
        }

        if (include) {
          // Return a copy
          let metadataCopy: Record<string, string | number | boolean> | null = null;
          if (event.metadata !== null) {
            metadataCopy = {};
            const keys = Object.keys(event.metadata);
            for (let j = 0; j < keys.length; j++) {
              const key = keys[j];
              metadataCopy[key] = event.metadata[key];
            }
          }
          result.push(Object.assign({}, event, { metadata: metadataCopy }));
        }
      }

      return result;
    },

    /**
     * Gets the total count of audit events.
     */
    getEventCount: function (): number {
      return get().events.length;
    },

    /**
     * Resets the store to initial state.
     */
    reset: function (): void {
      set({
        events: [],
        isLoaded: true,
      });

      // Clear from localStorage (SSR-safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
        } catch (error) {
          console.error('[AuditLogStore] Failed to clear storage:', error);
        }
      }
    },

    /**
     * Loads events from localStorage.
     */
    loadFromStorage: function (): void {
      // SSR guard
      if (typeof window === 'undefined') {
        set({ isLoaded: true });
        return;
      }

      const loadedEvents: AuditEvent[] = [];

      try {
        const stored = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);

        if (stored !== null && stored !== '') {
          const parsed = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            for (let i = 0; i < parsed.length; i++) {
              const event = parsed[i];
              if (isValidAuditEvent(event)) {
                loadedEvents.push(event);
              } else {
                console.warn('[AuditLogStore] Skipping invalid event at index', i);
              }
            }
          } else {
            console.warn('[AuditLogStore] Stored data is not an array, resetting');
          }
        }
      } catch (error) {
        console.error('[AuditLogStore] Failed to load from storage:', error);
      }

      set({
        events: loadedEvents,
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
        localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(state.events));
      } catch (error) {
        console.error('[AuditLogStore] Failed to save to storage:', error);
      }
    },
  };
});

