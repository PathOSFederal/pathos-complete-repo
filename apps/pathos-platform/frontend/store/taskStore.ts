/**
 * ============================================================================
 * TASK STORE (Day 27 - Import Taskboard + Reminders v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This Zustand store manages tasks created from imported documents in PathOS.
 * Tasks are local-only, persisted to localStorage, and linked to import items.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │       UI        │ --> │   THIS FILE     │ --> │  localStorage  │
 * │  (Import Center │     │  (Zustand Store)│     │  (tasks)       │
 * │   Taskboard)    │     │                 │     └────────────────┘
 * └─────────────────┘     └─────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Task CRUD - create, update, complete, delete tasks
 * 2. Import linkage - tasks are linked to import items via importItemId
 * 3. Reminder settings - per-task reminder with remindAt and repeat options
 * 4. Status workflow - todo/doing/done status tracking
 * 5. Persistence - survives page refresh via localStorage
 * 6. Reset action - for "Delete All Local Data" feature
 *
 * HOUSE RULES COMPLIANCE (Day 27):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 27 - Import Taskboard + Reminders v1
 * ============================================================================
 */

import { create } from 'zustand';
import { TASKS_STORAGE_KEY } from '@/lib/storage-keys';

// Re-export for convenience
export { TASKS_STORAGE_KEY };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Task status for workflow tracking.
 *
 * DESIGN RATIONALE:
 * - 'todo': Not yet started
 * - 'doing': Currently in progress
 * - 'done': Completed
 */
export type TaskStatus = 'todo' | 'doing' | 'done';

/**
 * All valid task statuses for iteration/validation.
 */
export const ALL_TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'done'];

/**
 * Human-readable labels for task statuses.
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  doing: 'In Progress',
  done: 'Done',
};

/**
 * Badge colors for task statuses (Tailwind classes).
 */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  doing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  done: 'bg-green-500/20 text-green-400 border-green-500/30',
};

/**
 * Task priority levels.
 *
 * DESIGN RATIONALE:
 * Simple priority system for basic organization.
 */
export type TaskPriority = 'low' | 'medium' | 'high';

/**
 * All valid task priorities for iteration/validation.
 */
export const ALL_TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

/**
 * Human-readable labels for task priorities.
 */
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/**
 * Badge colors for task priorities (Tailwind classes).
 */
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

/**
 * Reminder repeat frequency.
 *
 * DESIGN RATIONALE:
 * - 'none': One-time reminder
 * - 'daily': Repeat every day
 * - 'weekly': Repeat every week
 */
export type ReminderRepeat = 'none' | 'daily' | 'weekly';

/**
 * All valid reminder repeat options for iteration/validation.
 */
export const ALL_REMINDER_REPEATS: ReminderRepeat[] = ['none', 'daily', 'weekly'];

/**
 * Human-readable labels for reminder repeat options.
 */
export const REMINDER_REPEAT_LABELS: Record<ReminderRepeat, string> = {
  none: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
};

/**
 * Reminder settings for a task (Day 27).
 *
 * DESIGN RATIONALE:
 * Reminders are stored per-task, not as separate entities.
 * This keeps the data model simple and co-located.
 */
export interface TaskReminder {
  /**
   * Whether the reminder is enabled.
   */
  enabled: boolean;

  /**
   * ISO 8601 datetime when the reminder should fire.
   * Null if no reminder time is set.
   */
  remindAt: string | null;

  /**
   * Repeat frequency for the reminder.
   */
  repeat: ReminderRepeat;
}

/**
 * Represents a task created from an import item (Day 27).
 *
 * DESIGN RATIONALE:
 * Tasks are always linked to an import item. This enforces the
 * import-driven workflow and enables backlink queries.
 */
export interface Task {
  /**
   * Unique identifier for the task.
   */
  id: string;

  /**
   * Task title (what needs to be done).
   */
  title: string;

  /**
   * Current status of the task.
   */
  status: TaskStatus;

  /**
   * Optional due date (ISO 8601 date string, e.g., "2025-01-15").
   */
  dueDate: string | null;

  /**
   * ISO 8601 timestamp when the task was created.
   */
  createdAt: string;

  /**
   * ISO 8601 timestamp when the task was completed.
   * Null if not completed.
   */
  completedAt: string | null;

  /**
   * ID of the import item this task is linked to.
   * Required - all tasks must be linked to an import.
   */
  importItemId: string;

  /**
   * Optional notes for the task.
   */
  notes: string;

  /**
   * Priority level for the task.
   */
  priority: TaskPriority;

  /**
   * Reminder settings for this task.
   */
  reminder: TaskReminder;
}

/**
 * Data required to create a new task.
 */
export interface CreateTaskData {
  title: string;
  dueDate?: string | null;
  notes?: string;
  priority?: TaskPriority;
}

/**
 * Data for updating an existing task.
 */
export interface UpdateTaskData {
  title?: string;
  status?: TaskStatus;
  dueDate?: string | null;
  notes?: string;
  priority?: TaskPriority;
}

/**
 * Filter options for listing tasks.
 */
export interface TaskFilter {
  status?: TaskStatus | 'all';
  importItemId?: string;
  dueSoon?: boolean; // Tasks due within 7 days
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

/**
 * State shape for the task store.
 */
interface TaskState {
  /**
   * Array of all tasks.
   * Ordered by createdAt (most recent first).
   */
  tasks: Task[];

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
 * Actions available on the task store.
 */
interface TaskActions {
  /**
   * Creates a new task from an import item.
   *
   * @param importItemId - ID of the import item to link to
   * @param taskData - Task data (title, optional dueDate, notes, priority)
   * @returns The created Task
   */
  createTaskFromImport: (importItemId: string, taskData: CreateTaskData) => Task;

  /**
   * Updates an existing task.
   *
   * @param taskId - ID of the task to update
   * @param changes - Fields to update
   * @returns true if updated, false if not found
   */
  updateTask: (taskId: string, changes: UpdateTaskData) => boolean;

  /**
   * Marks a task as complete (sets status to 'done' and completedAt).
   *
   * @param taskId - ID of the task to complete
   * @returns true if completed, false if not found
   */
  completeTask: (taskId: string) => boolean;

  /**
   * Deletes a task.
   *
   * @param taskId - ID of the task to delete
   * @returns true if deleted, false if not found
   */
  deleteTask: (taskId: string) => boolean;

  /**
   * Lists tasks with optional filtering.
   *
   * @param filter - Optional filter criteria
   * @returns Array of tasks matching the filter
   */
  listTasks: (filter?: TaskFilter) => Task[];

  /**
   * Gets a task by ID.
   *
   * @param taskId - ID of the task
   * @returns The task or null if not found
   */
  getTask: (taskId: string) => Task | null;

  /**
   * Gets all tasks linked to an import item.
   *
   * @param importItemId - ID of the import item
   * @returns Array of linked tasks
   */
  getTasksForImport: (importItemId: string) => Task[];

  /**
   * Updates reminder settings for a task.
   *
   * @param taskId - ID of the task
   * @param reminder - Partial reminder settings to update
   * @returns true if updated, false if not found
   */
  updateReminder: (taskId: string, reminder: Partial<TaskReminder>) => boolean;

  /**
   * Snoozes a reminder by adding time to remindAt.
   *
   * @param taskId - ID of the task
   * @param minutes - Number of minutes to snooze (default 1440 = 1 day)
   * @returns true if snoozed, false if not found or no reminder
   */
  snoozeReminder: (taskId: string, minutes?: number) => boolean;

  /**
   * Gets all tasks with reminders due soon (within the next hour).
   *
   * @returns Array of tasks with upcoming reminders
   */
  getUpcomingReminders: () => Task[];

  /**
   * Resets the store to initial state.
   * Called by "Delete All Local Data" feature.
   */
  reset: () => void;

  /**
   * Loads tasks from localStorage.
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

export type TaskStore = TaskState & TaskActions;

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Selector for all tasks.
 */
export const selectTasks = function (state: TaskStore): Task[] {
  return state.tasks;
};

/**
 * Selector for tasks count.
 */
export const selectTasksCount = function (state: TaskStore): number {
  return state.tasks.length;
};

/**
 * Selector for whether store is loaded.
 */
export const selectTasksIsLoaded = function (state: TaskStore): boolean {
  return state.isLoaded;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a unique ID for a new task.
 */
function createTaskId(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj !== null && cryptoObj !== undefined && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Finds the index of a task in the tasks array by ID.
 */
function findTaskIndex(tasks: Task[], id: string): number {
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) {
      return i;
    }
  }
  return -1;
}

/**
 * Creates a deep copy of a tasks array.
 */
function deepCopyTasks(tasks: Task[]): Task[] {
  const copy: Task[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    // Copy reminder object explicitly
    const reminderCopy: TaskReminder = {
      enabled: task.reminder.enabled,
      remindAt: task.reminder.remindAt,
      repeat: task.reminder.repeat,
    };
    const taskCopy: Task = Object.assign({}, task, {
      reminder: reminderCopy,
    });
    copy.push(taskCopy);
  }
  return copy;
}

/**
 * Creates a default TaskReminder object.
 */
function createDefaultReminder(): TaskReminder {
  return {
    enabled: false,
    remindAt: null,
    repeat: 'none',
  };
}

/**
 * Validates that a parsed object has required Task fields.
 */
function isValidTask(obj: unknown): obj is Task {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof candidate['id'] !== 'string') return false;
  if (typeof candidate['title'] !== 'string') return false;
  if (typeof candidate['createdAt'] !== 'string') return false;
  if (typeof candidate['importItemId'] !== 'string') return false;

  // Check status is valid
  const validStatuses = ['todo', 'doing', 'done'];
  let statusValid = false;
  for (let i = 0; i < validStatuses.length; i++) {
    if (candidate['status'] === validStatuses[i]) {
      statusValid = true;
      break;
    }
  }
  if (!statusValid) return false;

  // Check priority is valid
  const validPriorities = ['low', 'medium', 'high'];
  let priorityValid = false;
  for (let i = 0; i < validPriorities.length; i++) {
    if (candidate['priority'] === validPriorities[i]) {
      priorityValid = true;
      break;
    }
  }
  if (!priorityValid) return false;

  // Check reminder object exists
  if (typeof candidate['reminder'] !== 'object' || candidate['reminder'] === null) {
    return false;
  }

  return true;
}

/**
 * Migrates a task from older formats to Day 27 format.
 * Adds default values for new fields if not present.
 */
function migrateTask(task: Task): Task {
  const migrated: Task = Object.assign({}, task);
  const taskAsRecord = task as unknown as Record<string, unknown>;

  // Add reminder if missing
  if (taskAsRecord['reminder'] === undefined || taskAsRecord['reminder'] === null) {
    migrated.reminder = createDefaultReminder();
  }

  // Add notes if missing
  if (taskAsRecord['notes'] === undefined) {
    migrated.notes = '';
  }

  return migrated;
}

// ============================================================================
// CREATE THE STORE
// ============================================================================

export const useTaskStore = create<TaskStore>(function (set, get) {
  return {
    // ========================================================================
    // INITIAL STATE
    // ========================================================================

    /**
     * Start with empty tasks.
     * Will be populated from localStorage on client-side mount.
     */
    tasks: [],

    /**
     * Not loaded until loadFromStorage is called.
     */
    isLoaded: false,

    // ========================================================================
    // ACTIONS
    // ========================================================================

    /**
     * Creates a new task from an import item.
     */
    createTaskFromImport: function (importItemId: string, taskData: CreateTaskData): Task {
      const id = createTaskId();
      const now = new Date().toISOString();

      // Build the new task object
      const newTask: Task = {
        id: id,
        title: taskData.title,
        status: 'todo',
        dueDate: taskData.dueDate !== undefined ? taskData.dueDate : null,
        createdAt: now,
        completedAt: null,
        importItemId: importItemId,
        notes: taskData.notes !== undefined ? taskData.notes : '',
        priority: taskData.priority !== undefined ? taskData.priority : 'medium',
        reminder: createDefaultReminder(),
      };

      // Add to tasks array (most recent first)
      const state = get();
      const newTasks: Task[] = [newTask];
      for (let i = 0; i < state.tasks.length; i++) {
        newTasks.push(state.tasks[i]);
      }

      set({ tasks: newTasks });
      get().saveToStorage();

      return newTask;
    },

    /**
     * Updates an existing task.
     */
    updateTask: function (taskId: string, changes: UpdateTaskData): boolean {
      const state = get();
      const index = findTaskIndex(state.tasks, taskId);

      if (index === -1) {
        return false;
      }

      const newTasks = deepCopyTasks(state.tasks);
      const task = newTasks[index];

      // Apply changes explicitly (no spread)
      if (changes.title !== undefined) {
        task.title = changes.title;
      }
      if (changes.status !== undefined) {
        task.status = changes.status;
        // Set completedAt if status becomes done
        if (changes.status === 'done' && task.completedAt === null) {
          task.completedAt = new Date().toISOString();
        }
        // Clear completedAt if status is not done
        if (changes.status !== 'done') {
          task.completedAt = null;
        }
      }
      if (changes.dueDate !== undefined) {
        task.dueDate = changes.dueDate;
      }
      if (changes.notes !== undefined) {
        task.notes = changes.notes;
      }
      if (changes.priority !== undefined) {
        task.priority = changes.priority;
      }

      set({ tasks: newTasks });
      get().saveToStorage();

      return true;
    },

    /**
     * Marks a task as complete.
     */
    completeTask: function (taskId: string): boolean {
      const state = get();
      const index = findTaskIndex(state.tasks, taskId);

      if (index === -1) {
        return false;
      }

      const newTasks = deepCopyTasks(state.tasks);
      newTasks[index].status = 'done';
      newTasks[index].completedAt = new Date().toISOString();

      set({ tasks: newTasks });
      get().saveToStorage();

      return true;
    },

    /**
     * Deletes a task.
     */
    deleteTask: function (taskId: string): boolean {
      const state = get();
      const index = findTaskIndex(state.tasks, taskId);

      if (index === -1) {
        return false;
      }

      const newTasks: Task[] = [];
      for (let i = 0; i < state.tasks.length; i++) {
        if (i !== index) {
          newTasks.push(state.tasks[i]);
        }
      }

      set({ tasks: newTasks });
      get().saveToStorage();

      return true;
    },

    /**
     * Lists tasks with optional filtering.
     */
    listTasks: function (filter?: TaskFilter): Task[] {
      const state = get();
      const result: Task[] = [];

      // Calculate "due soon" threshold (7 days from now)
      const now = new Date();
      const dueSoonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      for (let i = 0; i < state.tasks.length; i++) {
        const task = state.tasks[i];
        let include = true;

        // Apply status filter
        if (filter !== undefined && filter.status !== undefined && filter.status !== 'all') {
          if (task.status !== filter.status) {
            include = false;
          }
        }

        // Apply importItemId filter
        if (filter !== undefined && filter.importItemId !== undefined) {
          if (task.importItemId !== filter.importItemId) {
            include = false;
          }
        }

        // Apply dueSoon filter
        if (filter !== undefined && filter.dueSoon === true) {
          if (task.dueDate === null) {
            include = false;
          } else {
            const dueDate = new Date(task.dueDate);
            if (dueDate > dueSoonThreshold || task.status === 'done') {
              include = false;
            }
          }
        }

        if (include) {
          // Return a copy
          const reminderCopy: TaskReminder = {
            enabled: task.reminder.enabled,
            remindAt: task.reminder.remindAt,
            repeat: task.reminder.repeat,
          };
          result.push(Object.assign({}, task, { reminder: reminderCopy }));
        }
      }

      return result;
    },

    /**
     * Gets a task by ID.
     */
    getTask: function (taskId: string): Task | null {
      const state = get();
      const index = findTaskIndex(state.tasks, taskId);

      if (index === -1) {
        return null;
      }

      // Return a copy
      const task = state.tasks[index];
      const reminderCopy: TaskReminder = {
        enabled: task.reminder.enabled,
        remindAt: task.reminder.remindAt,
        repeat: task.reminder.repeat,
      };
      return Object.assign({}, task, { reminder: reminderCopy });
    },

    /**
     * Gets all tasks linked to an import item.
     */
    getTasksForImport: function (importItemId: string): Task[] {
      const state = get();
      const result: Task[] = [];

      for (let i = 0; i < state.tasks.length; i++) {
        const task = state.tasks[i];
        if (task.importItemId === importItemId) {
          const reminderCopy: TaskReminder = {
            enabled: task.reminder.enabled,
            remindAt: task.reminder.remindAt,
            repeat: task.reminder.repeat,
          };
          result.push(Object.assign({}, task, { reminder: reminderCopy }));
        }
      }

      return result;
    },

    /**
     * Updates reminder settings for a task.
     */
    updateReminder: function (taskId: string, reminder: Partial<TaskReminder>): boolean {
      const state = get();
      const index = findTaskIndex(state.tasks, taskId);

      if (index === -1) {
        return false;
      }

      const newTasks = deepCopyTasks(state.tasks);
      const taskReminder = newTasks[index].reminder;

      // Apply changes explicitly (no spread)
      if (reminder.enabled !== undefined) {
        taskReminder.enabled = reminder.enabled;
      }
      if (reminder.remindAt !== undefined) {
        taskReminder.remindAt = reminder.remindAt;
      }
      if (reminder.repeat !== undefined) {
        taskReminder.repeat = reminder.repeat;
      }

      set({ tasks: newTasks });
      get().saveToStorage();

      return true;
    },

    /**
     * Snoozes a reminder by adding time to remindAt.
     * Default snooze is 1 day (1440 minutes).
     */
    snoozeReminder: function (taskId: string, minutes?: number): boolean {
      const state = get();
      const index = findTaskIndex(state.tasks, taskId);

      if (index === -1) {
        return false;
      }

      const task = state.tasks[index];
      if (!task.reminder.enabled || task.reminder.remindAt === null) {
        return false;
      }

      const snoozeMinutes = minutes !== undefined ? minutes : 1440; // Default 1 day
      const currentRemindAt = new Date(task.reminder.remindAt);
      const newRemindAt = new Date(currentRemindAt.getTime() + snoozeMinutes * 60 * 1000);

      const newTasks = deepCopyTasks(state.tasks);
      newTasks[index].reminder.remindAt = newRemindAt.toISOString();

      set({ tasks: newTasks });
      get().saveToStorage();

      return true;
    },

    /**
     * Gets all tasks with reminders due soon (within the next hour).
     */
    getUpcomingReminders: function (): Task[] {
      const state = get();
      const result: Task[] = [];
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      for (let i = 0; i < state.tasks.length; i++) {
        const task = state.tasks[i];

        // Skip if reminder not enabled or no remindAt
        if (!task.reminder.enabled || task.reminder.remindAt === null) {
          continue;
        }

        // Skip completed tasks
        if (task.status === 'done') {
          continue;
        }

        const remindAt = new Date(task.reminder.remindAt);

        // Include if reminder is due now or within the next hour
        if (remindAt <= oneHourFromNow) {
          const reminderCopy: TaskReminder = {
            enabled: task.reminder.enabled,
            remindAt: task.reminder.remindAt,
            repeat: task.reminder.repeat,
          };
          result.push(Object.assign({}, task, { reminder: reminderCopy }));
        }
      }

      return result;
    },

    /**
     * Resets the store to initial state.
     */
    reset: function (): void {
      set({
        tasks: [],
        isLoaded: true,
      });

      // Clear from localStorage (SSR-safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(TASKS_STORAGE_KEY);
        } catch (error) {
          console.error('[TaskStore] Failed to clear storage:', error);
        }
      }
    },

    /**
     * Loads tasks from localStorage.
     */
    loadFromStorage: function (): void {
      // SSR guard
      if (typeof window === 'undefined') {
        set({ isLoaded: true });
        return;
      }

      const loadedTasks: Task[] = [];

      try {
        const stored = localStorage.getItem(TASKS_STORAGE_KEY);

        if (stored !== null && stored !== '') {
          const parsed = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            for (let i = 0; i < parsed.length; i++) {
              const task = parsed[i];
              if (isValidTask(task)) {
                // Migrate task to add new fields if missing
                const migratedTask = migrateTask(task);
                loadedTasks.push(migratedTask);
              } else {
                console.warn('[TaskStore] Skipping invalid task at index', i);
              }
            }
          } else {
            console.warn('[TaskStore] Stored data is not an array, resetting');
          }
        }
      } catch (error) {
        console.error('[TaskStore] Failed to load from storage:', error);
      }

      set({
        tasks: loadedTasks,
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
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(state.tasks));
      } catch (error) {
        console.error('[TaskStore] Failed to save to storage:', error);
      }
    },
  };
});

