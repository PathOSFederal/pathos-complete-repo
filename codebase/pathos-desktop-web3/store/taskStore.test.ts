/**
 * ============================================================================
 * TASK STORE TESTS (Day 27 - Import Taskboard + Reminders v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the task store.
 * Tests task CRUD operations, reminder functionality, and persistence.
 *
 * TEST COVERAGE:
 * 1. createTaskFromImport creates task with correct fields
 * 2. Task persists across save/load cycle
 * 3. completeTask sets status to done and completedAt
 * 4. updateTask updates fields correctly
 * 5. deleteTask removes task
 * 6. getTasksForImport returns linked tasks
 * 7. updateReminder sets reminder fields
 * 8. snoozeReminder moves remindAt forward
 * 9. listTasks with filters works correctly
 * 10. Reset clears all tasks
 *
 * @version Day 27 - Import Taskboard + Reminders v1
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useTaskStore,
  TASKS_STORAGE_KEY,
  ALL_TASK_STATUSES,
  TASK_STATUS_LABELS,
  ALL_TASK_PRIORITIES,
  ALL_REMINDER_REPEATS,
} from './taskStore';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Task Store (Day 27)', function () {
  // Mock localStorage for persistence tests
  let mockStorage: Record<string, string> = {};

  beforeEach(function () {
    // Set fixed system time for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));

    // Reset mock storage before each test
    mockStorage = {};

    // Mock window to pass SSR guards
    vi.stubGlobal('window', {});

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: function (key: string): string | null {
        const value = mockStorage[key];
        return value !== undefined ? value : null;
      },
      setItem: function (key: string, value: string): void {
        mockStorage[key] = value;
      },
      removeItem: function (key: string): void {
        delete mockStorage[key];
      },
      clear: function (): void {
        mockStorage = {};
      },
    });

    // Reset the store to initial state
    useTaskStore.setState({
      tasks: [],
      isLoaded: true,
    });
  });

  afterEach(function () {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ==========================================================================
  // CONSTANTS TESTS
  // ==========================================================================

  describe('Task constants', function () {
    it('should have all task statuses defined', function () {
      expect(ALL_TASK_STATUSES).toContain('todo');
      expect(ALL_TASK_STATUSES).toContain('doing');
      expect(ALL_TASK_STATUSES).toContain('done');
      expect(ALL_TASK_STATUSES.length).toBe(3);
    });

    it('should have labels for all statuses', function () {
      expect(TASK_STATUS_LABELS['todo']).toBe('To Do');
      expect(TASK_STATUS_LABELS['doing']).toBe('In Progress');
      expect(TASK_STATUS_LABELS['done']).toBe('Done');
    });

    it('should have all task priorities defined', function () {
      expect(ALL_TASK_PRIORITIES).toContain('low');
      expect(ALL_TASK_PRIORITIES).toContain('medium');
      expect(ALL_TASK_PRIORITIES).toContain('high');
      expect(ALL_TASK_PRIORITIES.length).toBe(3);
    });

    it('should have all reminder repeat options defined', function () {
      expect(ALL_REMINDER_REPEATS).toContain('none');
      expect(ALL_REMINDER_REPEATS).toContain('daily');
      expect(ALL_REMINDER_REPEATS).toContain('weekly');
      expect(ALL_REMINDER_REPEATS.length).toBe(3);
    });
  });

  // ==========================================================================
  // CREATE TASK TESTS
  // ==========================================================================

  describe('createTaskFromImport', function () {
    it('should create a task with correct fields', function () {
      // ACT
      const task = useTaskStore.getState().createTaskFromImport('import-123', {
        title: 'Submit application',
        dueDate: '2025-01-15',
        priority: 'high',
      });

      // ASSERT
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Submit application');
      expect(task.status).toBe('todo');
      expect(task.dueDate).toBe('2025-01-15');
      expect(task.priority).toBe('high');
      expect(task.importItemId).toBe('import-123');
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(task.reminder.enabled).toBe(false);
      expect(task.reminder.remindAt).toBeNull();
      expect(task.reminder.repeat).toBe('none');
    });

    it('should use default priority if not provided', function () {
      // ACT
      const task = useTaskStore.getState().createTaskFromImport('import-456', {
        title: 'Review posting',
      });

      // ASSERT
      expect(task.priority).toBe('medium');
    });

    it('should persist task after creation', function () {
      // ACT
      useTaskStore.getState().createTaskFromImport('import-789', {
        title: 'Follow up',
      });

      // Verify in store
      const tasks = useTaskStore.getState().listTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('Follow up');
    });
  });

  // ==========================================================================
  // PERSISTENCE TESTS
  // ==========================================================================

  describe('Task persistence', function () {
    it('should persist task across save/load cycle', function () {
      // ARRANGE: Create a task
      useTaskStore.getState().createTaskFromImport('import-persist', {
        title: 'Persist test',
        dueDate: '2025-02-01',
        priority: 'low',
      });

      // ACT: Save, clear state, reload
      useTaskStore.getState().saveToStorage();
      useTaskStore.setState({ tasks: [], isLoaded: false });
      useTaskStore.getState().loadFromStorage();

      // ASSERT
      const tasks = useTaskStore.getState().listTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('Persist test');
      expect(tasks[0].dueDate).toBe('2025-02-01');
      expect(tasks[0].priority).toBe('low');
    });

    it('should persist completed task with completedAt', function () {
      // ARRANGE: Create and complete a task
      const task = useTaskStore.getState().createTaskFromImport('import-complete', {
        title: 'Complete me',
      });
      useTaskStore.getState().completeTask(task.id);

      // ACT: Save, clear, reload
      useTaskStore.getState().saveToStorage();
      useTaskStore.setState({ tasks: [], isLoaded: false });
      useTaskStore.getState().loadFromStorage();

      // ASSERT
      const reloaded = useTaskStore.getState().getTask(task.id);
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.status).toBe('done');
        expect(reloaded.completedAt).not.toBeNull();
      }
    });
  });

  // ==========================================================================
  // COMPLETE TASK TESTS
  // ==========================================================================

  describe('completeTask', function () {
    it('should set status to done and completedAt', function () {
      // ARRANGE
      const task = useTaskStore.getState().createTaskFromImport('import-done', {
        title: 'Mark done',
      });

      // ACT
      const result = useTaskStore.getState().completeTask(task.id);

      // ASSERT
      expect(result).toBe(true);
      const updated = useTaskStore.getState().getTask(task.id);
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.status).toBe('done');
        expect(updated.completedAt).not.toBeNull();
      }
    });

    it('should return false for non-existent task', function () {
      // ACT
      const result = useTaskStore.getState().completeTask('non-existent');

      // ASSERT
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // UPDATE TASK TESTS
  // ==========================================================================

  describe('updateTask', function () {
    it('should update task fields correctly', function () {
      // ARRANGE
      const task = useTaskStore.getState().createTaskFromImport('import-update', {
        title: 'Original title',
      });

      // ACT
      const result = useTaskStore.getState().updateTask(task.id, {
        title: 'Updated title',
        status: 'doing',
        priority: 'high',
        notes: 'Some notes here',
      });

      // ASSERT
      expect(result).toBe(true);
      const updated = useTaskStore.getState().getTask(task.id);
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.title).toBe('Updated title');
        expect(updated.status).toBe('doing');
        expect(updated.priority).toBe('high');
        expect(updated.notes).toBe('Some notes here');
      }
    });

    it('should clear completedAt when status changes from done', function () {
      // ARRANGE: Create and complete a task
      const task = useTaskStore.getState().createTaskFromImport('import-reopen', {
        title: 'Reopen me',
      });
      useTaskStore.getState().completeTask(task.id);

      // Verify completedAt is set
      const completed = useTaskStore.getState().getTask(task.id);
      expect(completed).not.toBeNull();
      if (completed !== null) {
        expect(completed.completedAt).not.toBeNull();
      }

      // ACT: Change status back to doing
      useTaskStore.getState().updateTask(task.id, { status: 'doing' });

      // ASSERT
      const reopened = useTaskStore.getState().getTask(task.id);
      expect(reopened).not.toBeNull();
      if (reopened !== null) {
        expect(reopened.status).toBe('doing');
        expect(reopened.completedAt).toBeNull();
      }
    });
  });

  // ==========================================================================
  // DELETE TASK TESTS
  // ==========================================================================

  describe('deleteTask', function () {
    it('should remove task from store', function () {
      // ARRANGE
      const task = useTaskStore.getState().createTaskFromImport('import-delete', {
        title: 'Delete me',
      });

      // ACT
      const result = useTaskStore.getState().deleteTask(task.id);

      // ASSERT
      expect(result).toBe(true);
      const deleted = useTaskStore.getState().getTask(task.id);
      expect(deleted).toBeNull();
    });

    it('should return false for non-existent task', function () {
      // ACT
      const result = useTaskStore.getState().deleteTask('non-existent');

      // ASSERT
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // GET TASKS FOR IMPORT TESTS
  // ==========================================================================

  describe('getTasksForImport', function () {
    it('should return tasks linked to specific import', function () {
      // ARRANGE: Create tasks for different imports
      useTaskStore.getState().createTaskFromImport('import-a', { title: 'Task A1' });
      useTaskStore.getState().createTaskFromImport('import-a', { title: 'Task A2' });
      useTaskStore.getState().createTaskFromImport('import-b', { title: 'Task B1' });

      // ACT
      const tasksForA = useTaskStore.getState().getTasksForImport('import-a');
      const tasksForB = useTaskStore.getState().getTasksForImport('import-b');
      const tasksForC = useTaskStore.getState().getTasksForImport('import-c');

      // ASSERT
      expect(tasksForA.length).toBe(2);
      expect(tasksForB.length).toBe(1);
      expect(tasksForC.length).toBe(0);
    });
  });

  // ==========================================================================
  // REMINDER TESTS
  // ==========================================================================

  describe('updateReminder', function () {
    it('should enable reminder with remindAt', function () {
      // ARRANGE
      const task = useTaskStore.getState().createTaskFromImport('import-remind', {
        title: 'Remind me',
      });

      // ACT
      const result = useTaskStore.getState().updateReminder(task.id, {
        enabled: true,
        remindAt: '2025-01-15T09:00:00Z',
        repeat: 'daily',
      });

      // ASSERT
      expect(result).toBe(true);
      const updated = useTaskStore.getState().getTask(task.id);
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.reminder.enabled).toBe(true);
        expect(updated.reminder.remindAt).toBe('2025-01-15T09:00:00Z');
        expect(updated.reminder.repeat).toBe('daily');
      }
    });

    it('should persist reminder after save/load cycle', function () {
      // ARRANGE
      const task = useTaskStore.getState().createTaskFromImport('import-remind-persist', {
        title: 'Reminder persist',
      });
      useTaskStore.getState().updateReminder(task.id, {
        enabled: true,
        remindAt: '2025-02-01T10:00:00Z',
        repeat: 'weekly',
      });

      // ACT: Save, clear, reload
      useTaskStore.getState().saveToStorage();
      useTaskStore.setState({ tasks: [], isLoaded: false });
      useTaskStore.getState().loadFromStorage();

      // ASSERT
      const reloaded = useTaskStore.getState().getTask(task.id);
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.reminder.enabled).toBe(true);
        expect(reloaded.reminder.remindAt).toBe('2025-02-01T10:00:00Z');
        expect(reloaded.reminder.repeat).toBe('weekly');
      }
    });
  });

  describe('snoozeReminder', function () {
    it('should move remindAt forward by specified minutes', function () {
      // ARRANGE
      const task = useTaskStore.getState().createTaskFromImport('import-snooze', {
        title: 'Snooze me',
      });
      const originalRemindAt = '2025-01-15T09:00:00.000Z';
      useTaskStore.getState().updateReminder(task.id, {
        enabled: true,
        remindAt: originalRemindAt,
      });

      // ACT: Snooze by 60 minutes
      const result = useTaskStore.getState().snoozeReminder(task.id, 60);

      // ASSERT
      expect(result).toBe(true);
      const updated = useTaskStore.getState().getTask(task.id);
      expect(updated).not.toBeNull();
      if (updated !== null) {
        // 60 minutes = 3600000 ms
        const originalDate = new Date(originalRemindAt);
        const expectedDate = new Date(originalDate.getTime() + 60 * 60 * 1000);
        expect(updated.reminder.remindAt).toBe(expectedDate.toISOString());
      }
    });

    it('should default to 1 day snooze (1440 minutes)', function () {
      // ARRANGE
      const task = useTaskStore.getState().createTaskFromImport('import-snooze-default', {
        title: 'Default snooze',
      });
      const originalRemindAt = '2025-01-15T09:00:00.000Z';
      useTaskStore.getState().updateReminder(task.id, {
        enabled: true,
        remindAt: originalRemindAt,
      });

      // ACT: Snooze without specifying minutes
      useTaskStore.getState().snoozeReminder(task.id);

      // ASSERT
      const updated = useTaskStore.getState().getTask(task.id);
      expect(updated).not.toBeNull();
      if (updated !== null) {
        const originalDate = new Date(originalRemindAt);
        const expectedDate = new Date(originalDate.getTime() + 1440 * 60 * 1000);
        expect(updated.reminder.remindAt).toBe(expectedDate.toISOString());
      }
    });

    it('should return false if reminder not enabled', function () {
      // ARRANGE
      const task = useTaskStore.getState().createTaskFromImport('import-no-remind', {
        title: 'No reminder',
      });

      // ACT
      const result = useTaskStore.getState().snoozeReminder(task.id, 60);

      // ASSERT
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // LIST TASKS WITH FILTERS TESTS
  // ==========================================================================

  describe('listTasks with filters', function () {
    it('should filter by status', function () {
      // ARRANGE
      const task1 = useTaskStore.getState().createTaskFromImport('import-f1', { title: 'Task 1' });
      useTaskStore.getState().createTaskFromImport('import-f2', { title: 'Task 2' });
      useTaskStore.getState().completeTask(task1.id);

      // ACT
      const todoTasks = useTaskStore.getState().listTasks({ status: 'todo' });
      const doneTasks = useTaskStore.getState().listTasks({ status: 'done' });

      // ASSERT
      expect(todoTasks.length).toBe(1);
      expect(doneTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Task 2');
      expect(doneTasks[0].title).toBe('Task 1');
    });

    it('should filter by importItemId', function () {
      // ARRANGE
      useTaskStore.getState().createTaskFromImport('import-x', { title: 'Task X' });
      useTaskStore.getState().createTaskFromImport('import-y', { title: 'Task Y' });

      // ACT
      const xTasks = useTaskStore.getState().listTasks({ importItemId: 'import-x' });

      // ASSERT
      expect(xTasks.length).toBe(1);
      expect(xTasks[0].title).toBe('Task X');
    });
  });

  // ==========================================================================
  // RESET TESTS
  // ==========================================================================

  describe('reset', function () {
    it('should clear all tasks', function () {
      // ARRANGE
      useTaskStore.getState().createTaskFromImport('import-r1', { title: 'Task 1' });
      useTaskStore.getState().createTaskFromImport('import-r2', { title: 'Task 2' });
      useTaskStore.getState().saveToStorage();

      // Verify tasks exist
      expect(useTaskStore.getState().listTasks().length).toBe(2);

      // ACT
      useTaskStore.getState().reset();

      // ASSERT
      expect(useTaskStore.getState().listTasks().length).toBe(0);
      expect(mockStorage[TASKS_STORAGE_KEY]).toBeUndefined();
    });
  });
});

