# Day 27 – Import Taskboard + Reminders + Audit/Trust UX v1

## What Changed

- **Taskboard v1**: Users can now create tasks directly from imported documents. Each task includes a title, due date, and priority level. Tasks are organized by status (To Do, In Progress, Done) and linked to the original import item.

- **Reminders v1**: Tasks can have reminders set with a specific date and time. Reminders support optional repeat settings (once, daily, weekly). Overdue reminders show a clear indicator and can be snoozed by one day.

- **Activity Log**: Every meaningful action is now recorded in an append-only activity log. Users can see what happened to their import items over time, including when actions were triggered, tasks were created, and reminders were changed.

## Why It Matters

- **Better Task Tracking**: When you import a job posting with a deadline, you can immediately create a task to track your application progress. No need to remember to come back later.

- **Never Miss a Deadline**: Set reminders on tasks to get notified before important dates. The snooze feature helps when you need a bit more time.

- **Trust and Transparency**: The activity log shows exactly what PathOS has done with your imported content. The "Why am I seeing this?" indicators help explain system-generated suggestions.

## What Users Can Do Now

1. **Create tasks from imports**: Expand any imported document, click "Add Task" to create a task linked to that import
2. **Set task reminders**: Click the bell icon on any task to set a reminder with date, time, and repeat options
3. **Track task progress**: Mark tasks as complete, view task status badges, and see overdue indicators
4. **View activity history**: See a timeline of all actions taken on each import, including task operations and applied actions
5. **Snooze overdue reminders**: Push reminders forward by one day when you need more time

## What is Still Coming Next

- Push notifications for reminders (browser notifications)
- More snooze options (1 hour, 4 hours, tomorrow morning)
- Export audit history as JSON or CSV
- Search and filter audit events
- Task templates for common workflows (e.g., "Apply to job" checklist)

---

*December 2025 – PathOS Tier 1 Frontend*

