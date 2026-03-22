/**
 * ============================================================================
 * AUDIT LOG STORE TESTS (Day 27 - Audit/Trust UX v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the audit log store.
 * Tests append-only behavior, event filtering, and persistence.
 *
 * TEST COVERAGE:
 * 1. appendAuditEvent creates event with correct fields
 * 2. Audit log is append-only (ordering is stable)
 * 3. Events persist across save/load cycle
 * 4. getAuditEvents filters by importItemId
 * 5. getAuditEvents filters by taskId
 * 6. getAuditEvents respects limit parameter
 * 7. Creating task from import triggers audit event pattern
 * 8. Applying import action triggers audit event pattern
 * 9. Reset clears all events
 *
 * @version Day 27 - Audit/Trust UX v1
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useAuditLogStore,
  AUDIT_LOG_STORAGE_KEY,
  ALL_AUDIT_EVENT_TYPES,
  AUDIT_EVENT_TYPE_LABELS,
} from './auditLogStore';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Audit Log Store (Day 27)', function () {
  // Mock localStorage for persistence tests
  let mockStorage: Record<string, string> = {};

  beforeEach(function () {
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
    useAuditLogStore.setState({
      events: [],
      isLoaded: true,
    });
  });

  afterEach(function () {
    vi.unstubAllGlobals();
  });

  // ==========================================================================
  // CONSTANTS TESTS
  // ==========================================================================

  describe('Audit event constants', function () {
    it('should have all event types defined', function () {
      expect(ALL_AUDIT_EVENT_TYPES).toContain('import_action_created');
      expect(ALL_AUDIT_EVENT_TYPES).toContain('import_action_applied');
      expect(ALL_AUDIT_EVENT_TYPES).toContain('task_created');
      expect(ALL_AUDIT_EVENT_TYPES).toContain('task_completed');
      expect(ALL_AUDIT_EVENT_TYPES).toContain('reminder_enabled');
      expect(ALL_AUDIT_EVENT_TYPES.length).toBe(11);
    });

    it('should have labels for all event types', function () {
      expect(AUDIT_EVENT_TYPE_LABELS['task_created']).toBe('Task Created');
      expect(AUDIT_EVENT_TYPE_LABELS['task_completed']).toBe('Task Completed');
      expect(AUDIT_EVENT_TYPE_LABELS['reminder_enabled']).toBe('Reminder Enabled');
    });
  });

  // ==========================================================================
  // APPEND EVENT TESTS
  // ==========================================================================

  describe('appendAuditEvent', function () {
    it('should create event with correct fields', function () {
      // ACT
      const event = useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Created task "Submit application"',
        importItemId: 'import-123',
        taskId: 'task-456',
        source: 'user',
      });

      // ASSERT
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.type).toBe('task_created');
      expect(event.summary).toBe('Created task "Submit application"');
      expect(event.importItemId).toBe('import-123');
      expect(event.taskId).toBe('task-456');
      expect(event.source).toBe('user');
    });

    it('should default source to user if not provided', function () {
      // ACT
      const event = useAuditLogStore.getState().appendAuditEvent({
        type: 'task_updated',
        summary: 'Updated task',
      });

      // ASSERT
      expect(event.source).toBe('user');
    });

    it('should store metadata correctly', function () {
      // ACT
      const event = useAuditLogStore.getState().appendAuditEvent({
        type: 'deadline_tracked',
        summary: 'Tracked deadline Jan 15, 2025',
        metadata: {
          deadline: '2025-01-15',
          confidence: 0.95,
          fromSignal: true,
        },
      });

      // ASSERT
      expect(event.metadata).not.toBeNull();
      if (event.metadata !== null) {
        expect(event.metadata['deadline']).toBe('2025-01-15');
        expect(event.metadata['confidence']).toBe(0.95);
        expect(event.metadata['fromSignal']).toBe(true);
      }
    });
  });

  // ==========================================================================
  // APPEND-ONLY BEHAVIOR TESTS
  // ==========================================================================

  describe('Append-only behavior', function () {
    it('should maintain stable ordering (most recent first)', function () {
      // ACT: Append multiple events
      const event1 = useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'First event',
      });
      const event2 = useAuditLogStore.getState().appendAuditEvent({
        type: 'task_updated',
        summary: 'Second event',
      });
      const event3 = useAuditLogStore.getState().appendAuditEvent({
        type: 'task_completed',
        summary: 'Third event',
      });

      // ASSERT: Most recent should be first
      const events = useAuditLogStore.getState().getAuditEvents();
      expect(events.length).toBe(3);
      expect(events[0].id).toBe(event3.id);
      expect(events[1].id).toBe(event2.id);
      expect(events[2].id).toBe(event1.id);
    });

    it('should preserve events across multiple appends', function () {
      // ACT: Append several events
      for (let i = 0; i < 5; i++) {
        useAuditLogStore.getState().appendAuditEvent({
          type: 'task_updated',
          summary: 'Event ' + i,
        });
      }

      // ASSERT: All events preserved
      const events = useAuditLogStore.getState().getAuditEvents();
      expect(events.length).toBe(5);
    });
  });

  // ==========================================================================
  // PERSISTENCE TESTS
  // ==========================================================================

  describe('Audit log persistence', function () {
    it('should persist events across save/load cycle', function () {
      // ARRANGE: Create events
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Created task',
        importItemId: 'import-persist',
        taskId: 'task-persist',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'reminder_enabled',
        summary: 'Enabled reminder',
        taskId: 'task-persist',
      });

      // ACT: Save, clear, reload
      useAuditLogStore.getState().saveToStorage();
      useAuditLogStore.setState({ events: [], isLoaded: false });
      useAuditLogStore.getState().loadFromStorage();

      // ASSERT
      const events = useAuditLogStore.getState().getAuditEvents();
      expect(events.length).toBe(2);
      // Most recent first
      expect(events[0].type).toBe('reminder_enabled');
      expect(events[1].type).toBe('task_created');
    });

    it('should persist metadata across save/load cycle', function () {
      // ARRANGE
      useAuditLogStore.getState().appendAuditEvent({
        type: 'deadline_tracked',
        summary: 'Deadline persisted',
        metadata: { deadline: '2025-03-01', urgent: true },
      });

      // ACT: Save, clear, reload
      useAuditLogStore.getState().saveToStorage();
      useAuditLogStore.setState({ events: [], isLoaded: false });
      useAuditLogStore.getState().loadFromStorage();

      // ASSERT
      const events = useAuditLogStore.getState().getAuditEvents();
      expect(events.length).toBe(1);
      expect(events[0].metadata).not.toBeNull();
      if (events[0].metadata !== null) {
        expect(events[0].metadata['deadline']).toBe('2025-03-01');
        expect(events[0].metadata['urgent']).toBe(true);
      }
    });
  });

  // ==========================================================================
  // FILTER TESTS
  // ==========================================================================

  describe('getAuditEvents with filters', function () {
    it('should filter by importItemId', function () {
      // ARRANGE
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Task for import A',
        importItemId: 'import-a',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Task for import B',
        importItemId: 'import-b',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_updated',
        summary: 'Update for import A',
        importItemId: 'import-a',
      });

      // ACT
      const eventsForA = useAuditLogStore.getState().getAuditEvents({ importItemId: 'import-a' });
      const eventsForB = useAuditLogStore.getState().getAuditEvents({ importItemId: 'import-b' });

      // ASSERT
      expect(eventsForA.length).toBe(2);
      expect(eventsForB.length).toBe(1);
    });

    it('should filter by taskId', function () {
      // ARRANGE
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Created task 1',
        taskId: 'task-1',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_completed',
        summary: 'Completed task 1',
        taskId: 'task-1',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Created task 2',
        taskId: 'task-2',
      });

      // ACT
      const eventsForTask1 = useAuditLogStore.getState().getAuditEvents({ taskId: 'task-1' });
      const eventsForTask2 = useAuditLogStore.getState().getAuditEvents({ taskId: 'task-2' });

      // ASSERT
      expect(eventsForTask1.length).toBe(2);
      expect(eventsForTask2.length).toBe(1);
    });

    it('should respect limit parameter', function () {
      // ARRANGE: Create 10 events
      for (let i = 0; i < 10; i++) {
        useAuditLogStore.getState().appendAuditEvent({
          type: 'task_updated',
          summary: 'Event ' + i,
        });
      }

      // ACT
      const limitedEvents = useAuditLogStore.getState().getAuditEvents({ limit: 5 });

      // ASSERT
      expect(limitedEvents.length).toBe(5);
    });

    it('should filter by event type', function () {
      // ARRANGE
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Created',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_completed',
        summary: 'Completed',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Created another',
      });

      // ACT
      const createEvents = useAuditLogStore.getState().getAuditEvents({ type: 'task_created' });
      const completeEvents = useAuditLogStore.getState().getAuditEvents({ type: 'task_completed' });

      // ASSERT
      expect(createEvents.length).toBe(2);
      expect(completeEvents.length).toBe(1);
    });
  });

  // ==========================================================================
  // INTEGRATION PATTERN TESTS
  // ==========================================================================

  describe('Integration patterns', function () {
    it('should support task creation audit pattern', function () {
      // This test validates the pattern used when creating a task
      // In real code, taskStore would call appendAuditEvent

      // ACT: Simulate task creation flow
      const taskId = 'task-new';
      const importId = 'import-source';
      const taskTitle = 'Submit application by Jan 15';

      const event = useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Created task "' + taskTitle + '"',
        importItemId: importId,
        taskId: taskId,
        source: 'user',
        metadata: {
          taskTitle: taskTitle,
        },
      });

      // ASSERT
      expect(event.type).toBe('task_created');
      expect(event.importItemId).toBe(importId);
      expect(event.taskId).toBe(taskId);
      expect(event.source).toBe('user');
    });

    it('should support import action applied audit pattern', function () {
      // This test validates the pattern used when applying an import action
      // In real code, documentImportStore would call appendAuditEvent

      // ACT: Simulate action applied flow
      const importId = 'import-job-posting';
      const actionId = 'action-track-deadline';

      const event = useAuditLogStore.getState().appendAuditEvent({
        type: 'import_action_applied',
        summary: 'Applied "Track Deadline" action',
        importItemId: importId,
        actionId: actionId,
        source: 'user',
        metadata: {
          actionType: 'capture_deadline',
          deadline: '2025-01-15',
        },
      });

      // ASSERT
      expect(event.type).toBe('import_action_applied');
      expect(event.importItemId).toBe(importId);
      expect(event.actionId).toBe(actionId);
    });
  });

  // ==========================================================================
  // RESET TESTS
  // ==========================================================================

  describe('reset', function () {
    it('should clear all events', function () {
      // ARRANGE: Create events
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Task 1',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_completed',
        summary: 'Task 2',
      });
      useAuditLogStore.getState().saveToStorage();

      // Verify events exist
      expect(useAuditLogStore.getState().getEventCount()).toBe(2);

      // ACT
      useAuditLogStore.getState().reset();

      // ASSERT
      expect(useAuditLogStore.getState().getEventCount()).toBe(0);
      expect(mockStorage[AUDIT_LOG_STORAGE_KEY]).toBeUndefined();
    });
  });

  // ==========================================================================
  // EVENT COUNT TESTS
  // ==========================================================================

  describe('getEventCount', function () {
    it('should return correct count', function () {
      // ARRANGE
      expect(useAuditLogStore.getState().getEventCount()).toBe(0);

      // ACT
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_created',
        summary: 'Event 1',
      });
      useAuditLogStore.getState().appendAuditEvent({
        type: 'task_updated',
        summary: 'Event 2',
      });

      // ASSERT
      expect(useAuditLogStore.getState().getEventCount()).toBe(2);
    });
  });
});

