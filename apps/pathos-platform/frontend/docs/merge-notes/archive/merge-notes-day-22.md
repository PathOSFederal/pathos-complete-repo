# Day 22 – Universal Document Import v1

**Branch:** `feature/day-22-universal-document-import-v1`  
**Date:** December 16, 2025  
**Status:** Merge-Ready

---

## Summary

Day 22 implements **Universal Document Import v1** that removes the ".eml only" constraint by supporting what users actually recognize:

### Key Features
- **Import Center UI**: Unified area with tabs for Email Import and Files & Text Import
- **Files & Text Import**: Drag/drop area + browse for PDF/DOCX/TXT, plus paste-text input
- **IndexedDB for Blobs**: Binary file content stored in IndexedDB (not localStorage)
- **Rules-based Classification**: Automatic categorization of imported documents
- **Sensitivity Labels**: Per-item privacy controls with Public/Personal/Sensitive/Unknown
- **View Experience**: PDF viewer, text viewer, DOCX download option
- **Per-card Reset**: Clear derived fields without deleting the file
- **Security**: Defense-in-depth file type validation with double-extension attack protection

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Adds Create action (Import Document), Changes Zustand store logic, Changes persistence behavior, New IndexedDB storage |
| Why | New document import feature with IndexedDB + localStorage persistence and create buttons |

---

## Testing Evidence (Human Simulation) – Verified PASS

### 1. Import PDF → appears → refresh → still there

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Navigate to `/import` | Import Center page loads | ✅ PASS |
| 2 | Upload `sample-job-posting.pdf` (42KB) | File appears in "Imported Documents" list | ✅ PASS |
| 3 | Refresh page (F5) | Document still visible with metadata intact | ✅ PASS |

### 2. View it → works

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Click "View" on PDF document | PDF opens in new browser tab | ✅ PASS |

### 3. Delete it → gone → refresh → still gone

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Click "Delete" on document | Document removed from list | ✅ PASS |
| 2 | Refresh page (F5) | Document still gone | ✅ PASS |

### 4. Delete All Local Data → everything wiped (including IndexedDB)

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Import a new PDF | Document appears in list | ✅ PASS |
| 2 | Go to Settings page | Settings page loads | ✅ PASS |
| 3 | Click "Delete All Local Data" | Confirmation dialog appears | ✅ PASS |
| 4 | Confirm deletion | All data cleared | ✅ PASS |
| 5 | Return to `/import` | "Imported Documents" list is empty | ✅ PASS |
| 6 | Open DevTools → Application → IndexedDB | Expand `pathos-documents-db` | ✅ PASS |
| 7 | Check `blobs` object store | Should show 0 entries or empty | ✅ PASS |

### Storage Keys Verified
- localStorage key: `pathos.documentImport.v1` - correctly cleared
- IndexedDB database: `pathos-documents-db` - correctly cleared

---

## Files Changed (High-Level Summary)

### New Files (10)
| File | Purpose |
|------|---------|
| `app/import/page.tsx` | Import Center page with tabs and drag/drop |
| `lib/storage/indexeddb.ts` | IndexedDB wrapper for blob storage |
| `lib/storage/index.ts` | Barrel export for storage library |
| `lib/documents/classifyDocument.ts` | Rules-based document classification |
| `lib/documents/classifyDocument.test.ts` | 42 unit tests for classification heuristics |
| `lib/documents/index.ts` | Barrel export for documents library |
| `store/documentImportStore.ts` | Zustand store for imported documents metadata |
| `store/documentImportStore.test.ts` | 40 unit tests for getDocumentType (including 3 security tests) |
| `docs/change-briefs/day-22.md` | Non-technical change brief |
| `docs/merge-notes/merge-notes-day-21.md` | Archived Day 21 merge notes |

### Modified Files (9)
| File | Changes |
|------|---------|
| `lib/storage-keys.ts` | Added DOCUMENT_IMPORT_STORAGE_KEY |
| `store/index.ts` | Export Day 22 store, types, and helpers |
| `hooks/use-delete-all-local-data.ts` | Added IndexedDB wipe + resetDocumentImport |
| `components/path-os-sidebar.tsx` | Updated Import section with Import Center link |
| `scripts/validate-change-brief.mjs` | CURRENT_DAY = 22 |
| `scripts/validate-day-artifacts.mjs` | CURRENT_DAY = 22 |
| `scripts/validate-day-labels.mjs` | CURRENT_DAY = 22 |
| `docs/owner-map.generated.md` | Regenerated (includes /import, documentImportStore, DOCUMENT_IMPORT key) |
| `merge-notes.md` | This file |

---

## Cursor Run Log

### Run 1 (December 16, 2025)

**Goal:** Implement Universal Document Import v1 foundation

**Changes made:**
1. Archived merge-notes.md to docs/merge-notes/merge-notes-day-21.md
2. Created fresh merge-notes.md with Day 22 header
3. Created docs/change-briefs/day-22.md (non-technical)
4. Created lib/storage/indexeddb.ts (IndexedDB wrapper for blob storage)
5. Created lib/storage/index.ts (barrel export)
6. Created lib/documents/classifyDocument.ts (rules-based classification)
7. Created lib/documents/classifyDocument.test.ts (42 tests)
8. Created lib/documents/index.ts (barrel export)
9. Created store/documentImportStore.ts (Zustand store)
10. Created app/import/page.tsx (Import Center with tabs)
11. Updated lib/storage-keys.ts (added DOCUMENT_IMPORT_STORAGE_KEY)
12. Updated store/index.ts (export Day 22 store)
13. Updated hooks/use-delete-all-local-data.ts (added IndexedDB wipe)
14. Updated components/path-os-sidebar.tsx (Import Center link)
15. Updated scripts/validate-*.mjs (CURRENT_DAY = 22)

**Test count:** 293 tests (11 test files)

---

### Run 2 (December 16, 2025)

**Goal:** Fix 1 (real drag & drop), Fix 2 (reject unsupported file types), Fix 3 (human simulation gate)

**Changes made:**

1. **Implemented real drag & drop in app/import/page.tsx:**
   - Added drag event handlers: `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop`
   - Added visual feedback when dragging over dropzone (amber border/background)
   - Added `isFileSupported()` function to filter dropped files
   - Unsupported files show error message with supported types list
   - Uses shared constants (`SUPPORTED_FILE_EXTENSIONS`, `SUPPORTED_FILE_MIME_TYPES`) from store

2. **Defense-in-depth file type validation in documentImportStore.ts:**
   - Updated `getDocumentType()` to return `DocumentType | null` (not default to 'txt')
   - Updated `importFile()` to throw clear error for unsupported file types
   - Exported `SUPPORTED_FILE_EXTENSIONS` and `SUPPORTED_FILE_MIME_TYPES` constants
   - Both UI and store now enforce the same supported file list
   - Created `store/documentImportStore.test.ts` with 37 unit tests for `getDocumentType()`

3. **Human simulation gate verified (all steps passed)**

**Test count:** 330 tests (12 test files)

---

### Run 3 (December 16, 2025)

**Goal:** Add security tests for double-extension attack patterns

**Context:**
Run 3 verified that Run 2's implementation is correct and complete. The only gap was explicit security tests for double-extension attack patterns (e.g., `.pdf.exe`), which could trick users into opening malicious files.

**Changes made:**
1. **Added 3 security-focused tests to store/documentImportStore.test.ts:**
   - `should not match .pdf.exe as PDF (double-extension security case)`
   - `should not match .docx.exe as DOCX (double-extension security case)`
   - `should not match .txt.bat as TXT (double-extension security case)`

**Why it matters:**
A file named `resume.pdf.exe` should NOT be recognized as a PDF. Windows hides known extensions by default, so a user might see "resume.pdf" and trust it. Our code correctly rejects this because `getDocumentType()` only matches extensions at the END of the filename.

**Test count:** 333 tests (12 test files)

---

### Run 4 (December 16, 2025)

**Goal:** Make Day 22 merge-ready by normalizing merge-notes and verifying all artifacts

**Changes made:**
1. Normalized merge-notes.md (removed duplicate Run 2 sections, fixed contradictions)
2. Verified security tests exist (3 double-extension tests confirmed in documentImportStore.test.ts)
3. Verified "Delete All Local Data" code path clears both localStorage and IndexedDB
4. Ran all gates (lint, typecheck, test) - all pass
5. Regenerated `docs/owner-map.generated.md` via `pnpm docs:owner-map` (now includes /import route, documentImportStore, DOCUMENT_IMPORT key)
6. Regenerated patch artifacts with current state

**Commands run:**
```
pnpm lint       → Pass (no errors)
pnpm typecheck  → Pass (no type errors)
pnpm test       → Pass (333 tests, 12 test files, 2.60s)
```

**Test count:** 333 tests (12 test files)

---

## AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | Import button → documentImportStore.importFile() → IndexedDB (blob) + localStorage (metadata) → Import Center list shows new document |
| Store(s) | documentImportStore |
| Storage key(s) | pathos.documentImport.v1 (localStorage), pathos-documents-db (IndexedDB) |
| Failure mode | Document not saved, disappears on refresh |
| How tested | 42 classification tests + 40 getDocumentType tests (including 3 security tests) + manual human simulation verified |

---

## Gates (Final Results)

```
pnpm lint       ✅ Pass (no errors)
pnpm typecheck  ✅ Pass (no type errors)
pnpm test       ✅ Pass (333 tests, 12 test files, 2.60s)
```

---

## Git State

**Branch:** `feature/day-22-universal-document-import-v1`

**git diff --name-status develop** (excluding artifacts/):
```
A  app/import/page.tsx
M  components/path-os-sidebar.tsx
A  docs/change-briefs/day-22.md
A  docs/merge-notes/merge-notes-day-21.md
M  docs/owner-map.generated.md
M  hooks/use-delete-all-local-data.ts
A  lib/documents/classifyDocument.test.ts
A  lib/documents/classifyDocument.ts
A  lib/documents/index.ts
M  lib/storage-keys.ts
A  lib/storage/index.ts
A  lib/storage/indexeddb.ts
M  merge-notes.md
M  scripts/validate-change-brief.mjs
M  scripts/validate-day-artifacts.mjs
M  scripts/validate-day-labels.mjs
A  store/documentImportStore.test.ts
A  store/documentImportStore.ts
M  store/index.ts
```

**Files:** 19 files changed (10 new, 9 modified)

---

## Patch Artifacts

**Command:**
```powershell
git diff -- . ':!artifacts/' | Out-File -FilePath artifacts/day-22.patch -Encoding utf8
git diff -- . ':!artifacts/' | Out-File -FilePath artifacts/day-22-this-run.patch -Encoding utf8
Get-Item artifacts/day-22*.patch | Format-List Name,Length,LastWriteTime
```

**Output:**
```
Name          : day-22-this-run.patch
Length        : 4911
LastWriteTime : 12/16/2025 8:45:07 PM

Name          : day-22.patch
Length        : 194427
LastWriteTime : 12/16/2025 8:45:07 PM
```

**Note:** 
- `day-22.patch` (~194 KB): Cumulative diff from develop (all Day 22 changes)
- `day-22-this-run.patch` (~5 KB): This session only (merge-notes normalization + owner-map regen)
- Artifacts folder excluded from diffs to prevent recursion

---

## Patch Story (Teaching Narration)

Imagine you're building a document import feature for a career management app. Users want to upload job postings, resumes, and offer letters—not just emails. Day 22 delivers this.

**Storage Architecture:** We use a two-tier approach:
- **localStorage** holds metadata (title, category, timestamps, tags) for fast access
- **IndexedDB** holds the actual file blobs, which can be much larger than localStorage's 5MB limit

The `documentImportStore` orchestrates both. When you call `importFile()`, it saves the blob to IndexedDB, then saves the metadata to the Zustand store (which persists to localStorage).

**Classification Engine:** When a file arrives, `classifyDocument()` analyzes the filename and content. It looks for patterns like "resume", "offer letter", "job posting" and assigns a category with a confidence score. It also suggests a sensitivity label (Public/Personal/Sensitive).

**Security:** Here's where defense-in-depth matters. What happens if someone uploads `resume.pdf.exe`? Windows often hides extensions, so it might look like "resume.pdf" to a user. Our `getDocumentType()` function only matches extensions at the END of the filename. The tests prove this:

```typescript
it('should not match .pdf.exe as PDF', function () {
  expect(getDocumentType('', 'resume.pdf.exe')).toBeNull();
});
```

**Delete All Local Data:** When users want a fresh start, we clear both storage tiers. The `useDeleteAllLocalData` hook calls `resetDocumentImport()` (clears the store and IndexedDB blobs) plus `deleteDocumentDatabase()` (removes the IndexedDB database entirely).

**Test Coverage:** 82 new tests cover classification heuristics (42) and file type validation (40, including 3 security tests). Total: 333 tests passing.

---

## Suggested Commit Message

```
feat(import): Day 22 – Universal Document Import v1

- Add Import Center with tabs for Email Import and Files & Text Import
- Support PDF/DOCX/TXT file uploads with real drag/drop
- Add paste-text import with optional title field
- Store file blobs in IndexedDB, metadata in localStorage
- Add rules-based document classification (Job Posting, Resume, etc.)
- Add sensitivity labels (Public/Personal/Sensitive/Unknown)
- Add per-card Reset control to clear derived fields
- Add PDF/text viewers (DOCX is download-only for v1)
- Update Delete All Local Data to wipe IndexedDB
- Defense-in-depth: reject unsupported file types in UI and store
- Add security tests for double-extension attack patterns
- 82 new tests (42 classification + 40 getDocumentType), 333 total passing
- Human simulation gate verified
- All CI gates pass (lint, typecheck, test)
```

---

## Suggested PR Title

```
feat: Day 22 – Universal Document Import v1 (PDF/DOCX/TXT + paste text)
```

---

## Follow-ups / Future Work

1. DOCX preview (requires library)
2. Full-text search within imported documents
3. Document sharing between features
4. OCR for scanned PDFs
5. Batch import/export

---

**Do not commit or push without review.**

---

*Last updated: December 16, 2025 20:44 EST (Run 4 - merge-ready normalization + owner-map regen)*
