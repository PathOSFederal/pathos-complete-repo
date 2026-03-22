# Day 29 – Import Dedupe, Retention, Export, Insights, Explainability v1

**Date:** December 29, 2025  
**Status:** In Progress

---

## What This Does

Day 29 adds four major features to the Import Center to help you manage imported items more effectively:

### 1. Deduplication (Preventing Accidental Duplicates)

**What it does:**
- Automatically detects when you import the same item twice
- Compares items based on filename, size, deadlines, and dates
- Shows you why something was flagged as a duplicate (e.g., "Same filename and size")

**What it does NOT do:**
- Does not silently delete duplicates
- Does not access your mailbox or external systems
- All detection happens locally on your device

**How to use it:**
- When you import an item, if it's similar to something you already have, you'll see a "Possible duplicate" badge
- Click "Keep anyway" if you want to keep both items
- The duplicate flag stays visible so you know why it was flagged

### 2. Retention Controls (Managing Item Lifecycle)

**What it does:**
- Lets you archive items you're done with (they move out of the main view but aren't deleted)
- Lets you restore archived items back to active
- Lets you soft-delete items (they're marked as deleted but metadata is kept)
- Lets you permanently delete items (complete removal, cannot be undone)

**What it does NOT do:**
- Does not delete items from your original source (email, file system)
- Does not sync with external systems
- All retention actions are local-only

**How to use it:**
- Use "Archive" for items you want to keep but don't need to see regularly
- Use "Restore" to bring archived items back
- Use "Delete" for soft deletion (can be restored)
- Use "Delete Permanently" only when you're absolutely sure (this cannot be undone)

### 3. Export (Downloading Your Data)

**What it does:**
- Lets you export selected items as a JSON file
- Optionally includes "sources" - the extracted signals and links that show where information came from
- Respects your privacy settings (hidden items are excluded unless you explicitly include them)
- Downloads happen locally in your browser (no external calls)

**What it does NOT do:**
- Does not upload your data anywhere
- Does not send exports to external services
- Does not include file blobs (only metadata and extracted information)

**How to use it:**
- Select items you want to export
- Click "Export" and choose JSON format
- Enable "With sources" if you want to see where extracted information came from
- File downloads to your default download folder

### 4. Insights & Explainability (Understanding Your Imports)

**What it does:**
- Shows you useful summaries about your imported items
- Highlights deadlines coming up
- Shows links to workflow items (saved jobs, alerts, etc.)
- Points out missing information (e.g., no deadline found)
- Always shows "How this was derived" so you can see exactly where each insight came from

**What it does NOT do:**
- Does not use AI or machine learning (all insights are deterministic)
- Does not make up information (if there's no source, the insight won't show)
- Does not access external data sources

**How to use it:**
- Open an imported item's details view
- Scroll to the "Insights" section
- Click "How this was derived" on any insight to see the source snippet
- Insights are based on extracted fields (dates, URLs, etc.) and linked sources

---

## Why This Matters

These features help you:
- **Avoid clutter**: Deduplication prevents accidentally importing the same thing twice
- **Stay organized**: Retention controls let you manage items without losing them
- **Keep backups**: Export lets you save your data locally
- **Understand your data**: Insights show you what's important and where it came from

All features work entirely locally on your device - no data leaves your browser.

---

## Technical Notes

- Deduplication uses deterministic fingerprinting (no randomness)
- Retention states persist across page refreshes
- Exports are generated client-side (no server calls)
- Insights are generated from extracted signals only (no LLM)

---

*Last updated: December 29, 2025*
