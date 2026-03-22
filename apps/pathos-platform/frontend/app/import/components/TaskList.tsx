'use client';

/**
 * ============================================================================
 * TASK LIST COMPONENT (Day 27 - Extracted from Import Page)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays and manages tasks for an import item.
 * Includes task creation form, task list display, and reminder management.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * Used within DocumentItem in the Import Center page to show tasks linked to an import.
 *
 * HOUSE RULES COMPLIANCE:
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 27 - Extracted from Import Page
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import {
  ListTodo,
  Plus,
  Check,
  Clock,
  Bell,
  Trash2,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ALL_TASK_PRIORITIES,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/store/taskStore';
import type { Task, TaskPriority, CreateTaskData, TaskReminder } from '@/store/taskStore';
import { ReminderEditor } from './ReminderEditor';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

interface TaskListProps {
  /**
   * Tasks linked to this import item.
   */
  tasks: Task[];
  /**
   * Callback to create a new task.
   */
  onCreateTask: (taskData: CreateTaskData) => void;
  /**
   * Callback to complete a task.
   */
  onCompleteTask: (taskId: string) => void;
  /**
   * Callback to delete a task.
   */
  onDeleteTask: (taskId: string) => void;
  /**
   * Callback to update a task reminder.
   */
  onUpdateTaskReminder: (taskId: string, reminder: Partial<TaskReminder>) => void;
  /**
   * Callback to snooze a reminder.
   */
  onSnoozeReminder: (taskId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Renders the task list with creation form and task items.
 */
export function TaskList(props: TaskListProps) {
  const tasksForImport = props.tasks;
  const onCreateTask = props.onCreateTask;
  const onCompleteTask = props.onCompleteTask;
  const onDeleteTask = props.onDeleteTask;
  const onUpdateTaskReminder = props.onUpdateTaskReminder;
  const onSnoozeReminder = props.onSnoozeReminder;

  // Task creation state
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');

  // Reminder editing state (task ID being edited)
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  /**
   * Handle task creation.
   */
  const handleCreateTask = useCallback(function () {
    if (newTaskTitle.trim() === '') return;

    const taskData: CreateTaskData = {
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate !== '' ? newTaskDueDate : null,
      priority: newTaskPriority,
    };

    onCreateTask(taskData);
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskPriority('medium');
    setIsCreatingTask(false);
  }, [newTaskTitle, newTaskDueDate, newTaskPriority, onCreateTask]);

  /**
   * Format reminder time for display.
   */
  const formatReminderTime = function (remindAt: string | null): string {
    if (remindAt === null) return 'Not set';
    const date = new Date(remindAt);
    const now = new Date();
    if (date < now) {
      return 'Overdue';
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <ListTodo className="w-3 h-3" />
          Tasks from this Import
        </Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={function () { setIsCreatingTask(!isCreatingTask); }}
          className="text-xs h-6 px-2"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Task creation form */}
      {isCreatingTask && (
        <div className="bg-secondary/20 p-3 rounded mb-2 space-y-2">
          <Input
            value={newTaskTitle}
            onChange={function (e) { setNewTaskTitle(e.target.value); }}
            placeholder="Task title (e.g., Submit application)"
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={newTaskDueDate}
              onChange={function (e) { setNewTaskDueDate(e.target.value); }}
              className="h-8 text-xs flex-1"
            />
            <Select
              value={newTaskPriority}
              onValueChange={function (val) { setNewTaskPriority(val as TaskPriority); }}
            >
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_TASK_PRIORITIES.map(function (p) {
                  return (
                    <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleCreateTask} className="text-xs">
              Create Task
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={function () {
                setIsCreatingTask(false);
                setNewTaskTitle('');
                setNewTaskDueDate('');
              }}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tasks list */}
      {tasksForImport.length > 0 ? (
        <div className="space-y-2">
          {tasksForImport.map(function (task) {
            const isOverdue = task.dueDate !== null && new Date(task.dueDate) < new Date() && task.status !== 'done';
            const reminderOverdue = task.reminder.enabled && task.reminder.remindAt !== null && new Date(task.reminder.remindAt) < new Date();

            return (
              <div
                key={task.id}
                className={
                  'bg-secondary/20 p-3 rounded border-l-2 ' +
                  (task.status === 'done' ? 'border-green-500 opacity-60' : '') +
                  (isOverdue && task.status !== 'done' ? 'border-red-500' : '') +
                  (task.status === 'doing' ? 'border-blue-500' : '') +
                  (task.status === 'todo' && !isOverdue ? 'border-slate-500' : '')
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={'text-xs font-medium ' + (task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground')}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={TASK_STATUS_COLORS[task.status] + ' text-[10px] px-1.5 py-0'}>
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                      <Badge className={TASK_PRIORITY_COLORS[task.priority] + ' text-[10px] px-1.5 py-0'}>
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                      {task.dueDate !== null && (
                        <span className={'text-[10px] ' + (isOverdue ? 'text-red-400' : 'text-muted-foreground')}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* Reminder indicator */}
                    {task.reminder.enabled && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className={'w-3 h-3 ' + (reminderOverdue ? 'text-amber-400' : 'text-purple-400')} />
                        <span className={'text-[10px] ' + (reminderOverdue ? 'text-amber-400' : 'text-purple-400')}>
                          {formatReminderTime(task.reminder.remindAt)}
                          {reminderOverdue && ' (Overdue)'}
                        </span>
                        {reminderOverdue && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={function () { onSnoozeReminder(task.id); }}
                            className="text-[10px] h-5 px-1 text-amber-400"
                          >
                            Snooze +1 day
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {task.status !== 'done' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={function () { onCompleteTask(task.id); }}
                        className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                        title="Mark complete"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={function () {
                        if (editingReminderId === task.id) {
                          setEditingReminderId(null);
                        } else {
                          setEditingReminderId(task.id);
                        }
                      }}
                      className={'h-6 w-6 p-0 ' + (task.reminder.enabled ? 'text-purple-400' : 'text-muted-foreground')}
                      title="Set reminder"
                    >
                      <Bell className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={function () { onDeleteTask(task.id); }}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                      title="Delete task"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {/* Reminder editing */}
                {editingReminderId === task.id && (
                  <ReminderEditor
                    reminder={task.reminder}
                    onSave={function (reminder) {
                      onUpdateTaskReminder(task.id, reminder);
                      setEditingReminderId(null);
                    }}
                    onCancel={function () {
                      setEditingReminderId(null);
                    }}
                    onDisable={function () {
                      onUpdateTaskReminder(task.id, { enabled: false, remindAt: null });
                      setEditingReminderId(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-secondary/20 p-3 rounded text-xs text-muted-foreground italic">
          No tasks yet. Click &quot;Add Task&quot; to create one.
        </div>
      )}
    </div>
  );
}









