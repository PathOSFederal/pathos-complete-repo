'use client';

/**
 * ============================================================================
 * REMINDER EDITOR COMPONENT (Day 27 - Extracted from Import Page)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Inline editor for editing a task reminder (datetime and repeat settings).
 * Used within TaskList component when a user clicks to edit a reminder.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * Used within TaskList component in the Import Center page.
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

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ALL_REMINDER_REPEATS,
  REMINDER_REPEAT_LABELS,
} from '@/store/taskStore';
import type { ReminderRepeat, TaskReminder } from '@/store/taskStore';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

interface ReminderEditorProps {
  /**
   * Current reminder state (for initializing form).
   */
  reminder: TaskReminder;
  /**
   * Callback when reminder is saved.
   * Passes the updated reminder data (partial).
   */
  onSave: (reminder: Partial<TaskReminder>) => void;
  /**
   * Callback when editing is cancelled.
   */
  onCancel: () => void;
  /**
   * Callback when reminder is disabled.
   */
  onDisable: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Renders an inline reminder editor form.
 */
export function ReminderEditor(props: ReminderEditorProps) {
  const reminder = props.reminder;
  const onSave = props.onSave;
  const onCancel = props.onCancel;
  const onDisable = props.onDisable;

  // Initialize form state from current reminder
  const [reminderDate, setReminderDate] = useState(function () {
    if (reminder.remindAt !== null) {
      // Format for datetime-local input
      const d = new Date(reminder.remindAt);
      return d.toISOString().slice(0, 16);
    }
    return '';
  });
  const [reminderRepeat, setReminderRepeat] = useState<ReminderRepeat>(reminder.repeat);

  /**
   * Handle save button click.
   */
  const handleSave = function () {
    if (reminderDate === '') {
      onSave({ enabled: false, remindAt: null });
    } else {
      onSave({
        enabled: true,
        remindAt: new Date(reminderDate).toISOString(),
        repeat: reminderRepeat,
      });
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
      <div className="flex gap-2">
        <Input
          type="datetime-local"
          value={reminderDate}
          onChange={function (e) { setReminderDate(e.target.value); }}
          className="h-7 text-xs flex-1"
        />
        <Select
          value={reminderRepeat}
          onValueChange={function (val) { setReminderRepeat(val as ReminderRepeat); }}
        >
          <SelectTrigger className="h-7 text-xs w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_REMINDER_REPEATS.map(function (r) {
              return (
                <SelectItem key={r} value={r}>{REMINDER_REPEAT_LABELS[r]}</SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          className="text-xs h-6"
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="text-xs h-6"
        >
          Cancel
        </Button>
        {reminder.enabled && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDisable}
            className="text-xs h-6 text-red-400"
          >
            Disable
          </Button>
        )}
      </div>
    </div>
  );
}









