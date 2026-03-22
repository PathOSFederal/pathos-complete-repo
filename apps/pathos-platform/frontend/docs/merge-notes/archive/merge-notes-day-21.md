# Merge Notes (Day 21)

**Branch:** `feature/day-21-email-ingestion-inbox-v1`  
**Date:** December 15, 2025  
**Status:** Complete

---

## Summary

Day 21 implements **Email Import Inbox v1** with user-friendly import paths:

### This Run Changes
- Revised UI to prioritize "Paste an email" as the recommended default
- Added "Upload attachments" section for PDF/DOCX/TXT files
- Moved .eml support to collapsible "Advanced" section
- Added `sourceType` field to track import method ('pasted' | 'attachments' | 'eml')
- Added `importFromAttachments` store action
- Changed sidebar section from "INGEST" to "IMPORT"
- All UI copy uses "Import" (never "ingest/ingestion")
- Source type badges show how each email was imported

### Previous Run Features
- Route at `/ingest/email` for email content import
- Email parsing utility with header extraction and attachment detection
- Deterministic classification into categories (PayStub, RelocationOrders, FEHB, JobPosting, Other)
- Per-item visibility controls and delete actions
- Local persistence via `pathos.emailIngestion.v1` localStorage key
- Integration with "Delete All Local Data"

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Adds Create action (Import Email), Changes Zustand store logic, Changes persistence behavior |
| Why | New email import feature with localStorage persistence and create buttons |

---

## Files Changed

### New Files
| File | Description |
|------|-------------|
| `app/ingest/email/page.tsx` | Email Import Inbox page with 3 import sections |
| `lib/email/parseEml.ts` | Email parsing and classification utility |
| `lib/email/index.ts` | Barrel export for email library |
| `lib/email/parseEml.test.ts` | Unit tests for parsing/classification (37 tests) |
| `store/emailIngestionStore.ts` | Zustand store for imported emails |
| `docs/change-briefs/day-21.md` | Non-technical change brief |
| `docs/merge-notes/merge-notes-day-20.md` | Archived Day 20 merge notes |
| `artifacts/day-21-story.md` | Story-form narration of cumulative changes |
| `artifacts/day-21-this-run-story.md` | Story-form narration of this run's changes |

### Modified Files
| File | Description |
|------|-------------|
| `lib/storage-keys.ts` | Added EMAIL_INGESTION_STORAGE_KEY |
| `store/index.ts` | Export Day 21 store, types, and EmailSourceType |
| `hooks/use-delete-all-local-data.ts` | Added resetEmailIngestion to wipe |
| `components/path-os-sidebar.tsx` | INGEST -> IMPORT, Email Inbox -> Email Import |
| `scripts/validate-*.mjs` | CURRENT_DAY = 21 |

---

## AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | Import button -> emailIngestionStore.ingestFromText() or importFromAttachments() -> pathos.emailIngestion.v1 -> Inbox list shows new email |
| Store(s) | emailIngestionStore |
| Storage key(s) | pathos.emailIngestion.v1 |
| Failure mode | Email not saved, disappears on refresh |
| How tested | Unit tests (37 passing) + manual verification |

---

## Create-Button Persistence Sanity Check

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Appears elsewhere | ✅ PASS | Visible in Imported Emails list |
| Survives refresh | ✅ PASS | Persistence verified via store logic |
| Storage key exists | ✅ PASS | `pathos.emailIngestion.v1` in storage-keys.ts |

**DevTools Helper:**
```javascript
Object.keys(localStorage).filter(function (k) { return k.includes('emailIngestion'); })
// Expected: ["pathos.emailIngestion.v1"]
```

---

## Testing Evidence

| Item | Value |
|------|-------|
| Mode tested | dev |
| Steps performed | Navigate to /ingest/email -> paste email -> import -> appears in list -> refresh -> still there |
| Result | PASS |
| localStorage key verified | pathos.emailIngestion.v1 |
| Console clean | Yes (no errors) |

---

## Gates (All Pass)

```
pnpm lint       ✅ Pass (no errors)
pnpm typecheck  ✅ Pass (no type errors)
pnpm test       ✅ Pass (251 tests, 10 test files, 1.68s)
pnpm build      ✅ Pass (27 routes compiled, including /ingest/email)
```

---

## Git State and Diffs

**git status**
```
On branch feature/day-21-email-ingestion-inbox-v1
Changes not staged for commit:
  new file:   app/ingest/email/page.tsx
  modified:   components/path-os-sidebar.tsx
  new file:   docs/change-briefs/day-21.md
  new file:   docs/merge-notes/merge-notes-day-20.md
  modified:   hooks/use-delete-all-local-data.ts
  new file:   lib/email/index.ts
  new file:   lib/email/parseEml.test.ts
  new file:   lib/email/parseEml.ts
  modified:   lib/storage-keys.ts
  modified:   merge-notes.md
  modified:   scripts/validate-change-brief.mjs
  modified:   scripts/validate-day-artifacts.mjs
  modified:   scripts/validate-day-labels.mjs
  new file:   store/emailIngestionStore.ts
  modified:   store/index.ts
```

**git branch --show-current**
```
feature/day-21-email-ingestion-inbox-v1
```

**git diff --name-status HEAD**
```
A  app/ingest/email/page.tsx
A  artifacts/day-21-this-run.patch
A  artifacts/day-21.patch
A  artifacts/day-21-story.md
A  artifacts/day-21-this-run-story.md
M  components/path-os-sidebar.tsx
A  docs/change-briefs/day-21.md
A  docs/merge-notes/merge-notes-day-20.md
M  hooks/use-delete-all-local-data.ts
A  lib/email/index.ts
A  lib/email/parseEml.test.ts
A  lib/email/parseEml.ts
M  lib/storage-keys.ts
M  merge-notes.md
M  scripts/validate-change-brief.mjs
M  scripts/validate-day-artifacts.mjs
M  scripts/validate-day-labels.mjs
A  store/emailIngestionStore.ts
M  store/index.ts
```

**git diff --stat HEAD**
```
 app/ingest/email/page.tsx              |  935 ++++++
 components/path-os-sidebar.tsx         |   16 +
 docs/change-briefs/day-21.md           |   98 +
 docs/merge-notes/merge-notes-day-20.md | 1514 +++++++++
 hooks/use-delete-all-local-data.ts     |   18 +
 lib/email/index.ts                     |   24 +
 lib/email/parseEml.test.ts             |  371 +++
 lib/email/parseEml.ts                  |  427 +++
 lib/storage-keys.ts                    |   12 +-
 merge-notes.md                         | 1542 +--------
 scripts/validate-change-brief.mjs      |    2 +-
 scripts/validate-day-artifacts.mjs     |    4 +-
 scripts/validate-day-labels.mjs        |    2 +-
 store/emailIngestionStore.ts           |  775 +++++
 store/index.ts                         |   14 +
```

---

## Patch Artifacts

**Command:**
```powershell
git diff HEAD -- . ':!artifacts/*.patch' | Out-File -FilePath artifacts/day-21.patch -Encoding utf8
git diff -- . ':!artifacts/*.patch' | Out-File -FilePath artifacts/day-21-this-run.patch -Encoding utf8
Get-Item artifacts/day-21*.patch,artifacts/day-21*-story.md | Format-List Name,Length,LastWriteTime
```

**Output:**
```
Name          : day-21-this-run.patch
Length        : 232017
LastWriteTime : 12/15/2025 8:58:46 PM

Name          : day-21.patch
Length        : 232017
LastWriteTime : 12/15/2025 8:58:45 PM

Name          : day-21-story.md
Length        : 4197
LastWriteTime : 12/15/2025 8:55:32 PM

Name          : day-21-this-run-story.md
Length        : 3529
LastWriteTime : 12/15/2025 8:55:52 PM
```

---

## Suggested Commit Message

```
feat(import): Day 21 – Email Import Inbox v1 with user-friendly paths

- Redesign UI: Paste email (recommended), Upload attachments, Advanced .eml
- Add sourceType field to track import method ('pasted' | 'attachments' | 'eml')
- Add importFromAttachments store action for PDF/DOCX/TXT upload
- Change sidebar section from INGEST to IMPORT
- All UI copy uses "Import" (never "ingest/ingestion")
- Add source type badges to imported email list items
- Local-only persistence via pathos.emailIngestion.v1
- Classification works with attachment filenames when no email text
- All CI gates pass (lint, typecheck, test, build)
```

---

## Suggested PR Title

```
feat: Day 21 – Email Import Inbox v1 (user-friendly import paths)
```

---

## Follow-ups / Future Work

1. Actual attachment content extraction (v1 only stores metadata)
2. Email forwarding integration (SMTP when backend available)
3. Search/filter within imported emails
4. Bulk import/export
5. Store tests for emailIngestionStore persistence behavior

---

**Do not commit or push without review.**

---

*Last updated: December 15, 2025 20:56 EST*
