# Day 23 Change Brief: Import Center Triage, Search & Workflow Linking

**Date:** December 16, 2025  
**Branch:** `feature/day-23-import-triage-search-linking-v1`

---

## What Changed

Day 23 makes your imported items (documents and emails) **actionable** by adding:

1. **Triage Controls** - Mark items as New, Reviewed, Pinned, or Archived
2. **Tags & Notes** - Add custom tags and notes to organize your imports
3. **Search & Filters** - Find imports by name, tags, notes, or content
4. **Workflow Linking** - Connect imports to your Saved Jobs, Resume, or Job Alerts
5. **Backlinks** - See related imports when viewing Saved Jobs, Resume, or Alerts

---

## Why It Matters

Before Day 23, imported documents just sat in a list. Now you can:

- **Stay organized**: Pin important items, archive old ones, add notes
- **Find things fast**: Search across all your imports instantly
- **Connect the dots**: Link a job posting PDF to the job you saved
- **See context**: When viewing a saved job, see all related imports

---

## How Users Benefit

### Better Organization
- Mark items as "Reviewed" after you've looked at them
- Pin important documents to keep them at the top
- Archive old items without deleting them
- Add tags like "Applied", "Interview", "Offer" to track progress

### Faster Searching
- Search finds matches in filename, tags, notes, and content
- Filter by document type (PDF, DOCX, Text, Email)
- Filter by status (New, Reviewed, Pinned, Archived)
- Sort by date with pinned items always first

### Workflow Integration
- Link a job posting to your Saved Job
- Link reference documents to your Resume/Target Role
- Link email confirmations to your Job Alerts
- See all related imports when viewing any linked item

---

## What to Test

1. **Triage Flow**
   - Import a document → set status to "Pinned" → refresh → still pinned
   - Add a tag → refresh → tag persists
   - Add a note → refresh → note persists

2. **Search & Filters**
   - Search by filename → finds the item
   - Search by tag → finds the item
   - Filter by status → shows correct items

3. **Linking Flow**
   - Link an import to a Saved Job → open Saved Job → "Related Imports" shows
   - Unlink → backlink disappears
   - Link to Resume → open Resume Builder → "Related Imports" shows

4. **Delete All Local Data**
   - Run "Delete All Local Data" in Settings
   - Refresh → all imports and links are gone

---

## Privacy Note

All data stays in your browser. PathOS does not access your mailbox or upload your documents anywhere. When you use "Delete All Local Data", everything is permanently erased from your device.

---

*This change brief is for non-technical stakeholders. See merge-notes.md for technical details.*
