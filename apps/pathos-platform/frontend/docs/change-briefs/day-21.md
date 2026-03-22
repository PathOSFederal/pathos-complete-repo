# Day 21 Change Brief - Email Import Inbox v1

**Date:** December 15, 2025  
**Status:** Complete

---

## What Changed

A new **Email Import Inbox** feature was added to PathOS. Users can now import email content into the application through three user-friendly paths:

1. **Paste an email (recommended)** - Copy/paste email content directly into a textarea
2. **Upload attachments** - Upload PDF, DOCX, or TXT files (multi-file supported)
3. **Advanced: Import a saved email file (.eml)** - Collapsible option for users who save emails as .eml files

The system automatically:
- **Parses email headers** (From, To, Subject, Date)
- **Detects attachments** (filename and content type)
- **Classifies emails** into categories: Pay Stub, Relocation Orders, FEHB, Job Posting, or Other
- **Shows source type badges** indicating how content was imported

---

## Why It Matters

Federal employees and job seekers often receive important documents via email (pay stubs, PCS orders, benefits info, job announcements). This feature provides a way to organize and categorize that content locally within PathOS.

Key benefits:
- **No server uploads** - All data stays in the browser's localStorage
- **User-friendly import paths** - Paste is recommended, .eml is tucked away
- **Automatic classification** - Saves time organizing documents
- **Privacy controls** - Per-item visibility toggles
- **Persistence** - Survives page refresh
- **Wipe support** - Cleared by "Delete All Local Data"

---

## What Users Will Notice

1. **New "Email Import" menu item** - Appears in the sidebar under "IMPORT"

2. **Email Import Inbox page** at `/ingest/email` with:
   - Friendly callout explaining the feature
   - Section 1: Paste an email (recommended) with textarea and Import button
   - Section 2: Upload attachments with file picker and chip/remove UI
   - Section 3: Advanced .eml upload (collapsible)
   - List of imported emails with classification and source type badges
   - Expand/collapse to view details
   - Hide and Delete buttons per item

3. **Source type badges** on imported emails:
   - Pasted Email (cyan)
   - Attachments (orange)
   - Saved Email (.eml) (gray)

4. **Classification badges** on imported emails:
   - Pay Stub (green)
   - Relocation Orders (blue)
   - FEHB (purple)
   - Job Posting (amber)
   - Other (gray)

---

## Technical Notes

- **Storage key:** `pathos.emailIngestion.v1`
- **Store:** `emailIngestionStore` (Zustand)
- **Route:** `/ingest/email`
- **Classification:** Deterministic keyword matching (no ML) - works on subject, body, and attachment filenames
- **Attachments:** Best-effort detection from Content-Disposition headers (for .eml) or direct upload (for attachments path)
- **Source types:** `'pasted' | 'attachments' | 'eml'`

---

## Import Options Explained

### 1. Paste an email (recommended)
Users copy email content from their email client and paste it directly. The system parses headers and body text. This is the simplest and most reliable method.

### 2. Upload attachments
Users can upload PDF, DOCX, or TXT files directly. The system creates an import record with the attachment metadata. Classification uses filenames when no email text is available.

### 3. Advanced: Import saved email file (.eml)
For users who save emails as .eml files (from Outlook, Thunderbird, etc.). This option is in a collapsible section to keep the UI simple for most users.

---

## Follow-ups / Future Work

1. Actual attachment content extraction (v1 only stores metadata)
2. Email forwarding integration (SMTP when backend available)
3. Search/filter within imported emails
4. Bulk import/export

---

*This is a local-only, frontend-first simulation. No backend or real email servers are involved.*
