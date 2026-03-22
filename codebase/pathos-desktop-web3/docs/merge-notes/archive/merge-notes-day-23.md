# Day 23 – Import Center: Triage, Search, and Workflow Linking v1

**Branch:** `feature/day-23-import-triage-search-linking-v1`  
**Date:** December 16–17, 2025  
**Status:** In Progress (Run 2)

---

## Summary

Day 23 implements **Import Center: Triage, Search, and Workflow Linking v1** that makes imported items actionable:

### Key Features
- **Triage Controls**: Per-item status (New/Reviewed/Pinned/Archived), tags editor, note field
- **Bulk Actions**: Mark reviewed, archive, apply tags for multiple items
- **Search + Filters v1**: Search by filename/title/tags/notes/content, filter by type/status
- **Workflow Linking v1**: Link imports to Saved Jobs, Target Role/Resume, Job Alerts
- **Persistence**: All triage/linking state persists across refresh
- **Delete All Local Data**: Wipes all Day 23 storage keys and link metadata

### Deferred to Follow-up
- **Backlinks Rendering**: "Related Imports" sections in Saved Jobs, Resume, Alerts UI (linking works, backlink display deferred)

---

## Human Simulation Gate

| Item | Value |
|------|-------|
| Required | Yes |
| Triggers hit | Adds Create action (Link to entity), Changes Zustand store logic, Changes persistence behavior, Affects UI in multiple places |
| Why | New triage/linking features modify documentImportStore and add link functionality |

---

## Testing Evidence (Human Simulation)

### Canonical Day 23 Human Simulation Steps

These steps must be performed manually before merge to verify end-to-end functionality:

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | **Create**: Import a document (paste text or upload PDF) | Document appears in Import Center list with "New" status | Pending |
| 2 | **Persists**: Refresh page (F5) | Document still visible in list | Pending |
| 3 | **Status**: Set status to "Pinned" via dropdown | Status badge updates to "Pinned", doc moves to top | Pending |
| 4 | **Persists**: Refresh page | Pinned status persists | Pending |
| 5 | **Search**: Type in search box for document title | Document appears in filtered results | Pending |
| 6 | **Tags**: Add a tag to document | Tag badge appears | Pending |
| 7 | **Persists**: Refresh page | Tag persists | Pending |
| 8 | **Notes**: Add a note to document | Note preview shows in collapsed view | Pending |
| 9 | **Persists**: Refresh page | Note persists | Pending |
| 10 | **Search by tag**: Search for the tag text | Document found in results | Pending |
| 11 | **Link**: Click "Link" button, link to a Saved Job | Link badge shows count, linked entity shows in modal | Pending |
| 12 | **Unlink**: In modal, click Unlink | Link removed, badge count decreases | Pending |
| 13 | **Delete All**: Go to Settings, click "Delete All Local Data" | All imports and links cleared, Import Center shows empty | Pending |

### Console Check
- [ ] No hydration errors/warnings in console during flow
- [ ] No React errors in console

### localStorage Key Check
```javascript
// After step 1-11, before Delete All:
Object.keys(localStorage).filter(function(k) { return k.indexOf('pathos') !== -1; })
// Expected to include: pathos.documentImport.v1

// After Delete All (step 13):
Object.keys(localStorage).filter(function(k) { return k.indexOf('pathos') !== -1; })
// pathos.documentImport.v1 should be removed
```

### Storage keys to verify:
```javascript
Object.keys(localStorage).filter(function(k) { return k.indexOf('pathos') !== -1; })
// Expected: pathos.documentImport.v1
// Note (Run 2): Removed pathos-import-links.v1 - links stored on import records directly
```

---

## AI Acceptance Checklist

| Item | Value |
|------|-------|
| Flow | Import → triage controls → status/tags/notes persist → search finds → link to Saved Job → link stored in import |
| Store(s) | documentImportStore |
| Storage key(s) | pathos.documentImport.v1 (localStorage), pathos-documents-db (IndexedDB) |
| Failure mode | Triage state not saved, links lost on refresh |
| How tested | 9 new unit tests + manual human simulation |

---

## Files Changed

### New Files (5)
| File | Purpose |
|------|---------|
| `docs/change-briefs/day-23.md` | Non-technical change brief for Day 23 |
| `docs/merge-notes/merge-notes-day-22.md` | Archived Day 22 merge notes |
| `docs/patch-stories/day-23-this-run.md` | Patch story explaining changes |
| `lib/linking/importLinking.ts` | Linking helper functions (link/unlink imports to entities) |
| `lib/linking/index.ts` | Barrel export for linking library |

### Modified Files (12)
| File | Changes |
|------|---------|
| `app/import/page.tsx` | Day 23 triage UI, search/filters, bulk actions, link modal |
| `docs/owner-map.md` | Day 23 ownership boundaries section |
| `docs/owner-map.generated.md` | Regenerated (includes new storage key) |
| `hooks/use-delete-all-local-data.ts` | Added IMPORT_LINKS_STORAGE_KEY |
| `lib/storage-keys.ts` | Added IMPORT_LINKS_STORAGE_KEY |
| `merge-notes.md` | This file |
| `scripts/validate-change-brief.mjs` | CURRENT_DAY = 23 |
| `scripts/validate-day-artifacts.mjs` | CURRENT_DAY = 23 |
| `scripts/validate-day-labels.mjs` | CURRENT_DAY = 23 |
| `store/documentImportStore.test.ts` | 9 new Day 23 tests |
| `store/documentImportStore.ts` | Day 23: status, note, linkedEntities, bulk actions, linking |
| `store/index.ts` | Export Day 23 types and constants |

---

## Cursor Run Log

### Run 1 (December 16, 2025)

**Goal:** Implement Import Center: Triage, Search, and Workflow Linking v1

**Changes made:**
1. Archived merge-notes.md to docs/merge-notes/merge-notes-day-22.md
2. Created fresh merge-notes.md with Day 23 header
3. Created docs/change-briefs/day-23.md (non-technical)
4. Updated docs/owner-map.md with Day 23 ownership boundaries
5. Added IMPORT_LINKS_STORAGE_KEY to lib/storage-keys.ts
6. Extended documentImportStore with Day 23 features:
   - ImportStatus type (new/reviewed/pinned/archived)
   - LinkedEntity type for workflow linking
   - status, note, linkedEntities fields on ImportedDocument
   - updateStatus, updateNote actions
   - bulkUpdateStatus, bulkAddTag, bulkRemoveTag actions
   - linkToEntity, unlinkFromEntity, getLinkedDocuments actions
   - Migration function for Day 22 → Day 23 data
7. Created lib/linking/importLinking.ts with helper functions
8. Created lib/linking/index.ts barrel export
9. Updated hooks/use-delete-all-local-data.ts for Day 23 keys
10. Updated app/import/page.tsx with:
    - Search box and filter controls
    - Bulk selection checkboxes and action bar
    - Status/note editing in DocumentItem
    - Link to Workflow modal
    - Updated OPSEC callout with friendly microcopy
11. Updated store/index.ts to export Day 23 types
12. Updated validation scripts (CURRENT_DAY = 23)
13. Added 9 new tests for Day 23 constants
14. Regenerated docs/owner-map.generated.md

**Test count:** 342 tests (12 test files)

### Run 2 (December 17, 2025)

**Goal:** Fix branch/process state, lint warning, storage key mismatch, add real tests

**Branch Process Fix:**

Pre-fix state:
```
git status:
On branch develop
Your branch is up to date with 'origin/develop'.
(19 modified/new files - Day 23 work uncommitted on develop)

git branch --show-current:
develop

git log --oneline -10:
7c5d1bd Merge pull request #52 from PathOSFederal/feature/day-22-universal-document-import-v1
1407110 feature/day-22-universal-document-import-v1 adding owner map
de86094 #feature/day-22-universal-document-import-v1 Day 22 – Universal Document Import v1
f2769ea #feature/day-21-email-ingestion-inbox-v1 Day 21 – Email Import Inbox UX
df8dac7 Merge pull request #51 from PathOSFederal/feature/day-20-job-alerts-email-digest-v1
95005e1 #feature/day-20-job-alerts-email-digest-v1 Day 20 – Job alerts email digest v1
72670fd Merge pull request #50 from PathOSFederal/feature/day-19-saved-jobs-alerts-v1
3267e37 #feature/day-19-saved-jobs-alerts-v1 Day 19 – Saved jobs + alerts v1
f748a1f Merge pull request #49 from PathOSFederal/feature/day-18-ci-gates-dod-enforcement
f9a4211 #feature/day-18-ci-gates-dod-enforcement Day 18 – CI gates + DoD enforcement
```

Fix steps taken:
1. Created feature branch at current HEAD: `git checkout -b feature/day-23-import-triage-search-linking-v1`
2. Stashed Day 23 changes: `git add -A; git stash push -m "Day 23 work in progress"`
3. Restored develop to origin: `git checkout develop; git fetch; git reset --hard origin/develop`
4. Returned to feature branch: `git checkout feature/day-23-import-triage-search-linking-v1`
5. Restored Day 23 work: `git stash pop`
6. Updated merge-notes.md header to reflect feature branch

Post-fix state:
- Day 23 work is now on `feature/day-23-import-triage-search-linking-v1`
- `develop` is reset to match `origin/develop` (at commit 7c5d1bd)

**Run 2 changes made:**
1. Fixed branch process (created feature branch, restored develop)
2. Removed unused SENSITIVITY_COLORS import (lint warning fix)
3. Removed IMPORT_LINKS_STORAGE_KEY (storage key mismatch fix - Option A)
   - Updated lib/storage-keys.ts
   - Updated hooks/use-delete-all-local-data.ts
   - Updated store/documentImportStore.ts
   - Updated docs/owner-map.md
   - Regenerated docs/owner-map.generated.md
4. Added 14 new behavioral tests in documentImportStore.test.ts:
   - Status persistence after save/load
   - Note persistence after save/load
   - linkToEntity correctness
   - unlinkFromEntity correctness
   - getLinkedDocuments correctness
   - Reset clears documents and links
5. Updated Human Simulation Gate steps in merge-notes.md
6. Updated patch story with Run 2 changes

---

## Gates (Final Results - Run 2)

```
pnpm lint       ✅ Pass (0 errors, 0 warnings)
pnpm typecheck  ✅ Pass (no type errors)
pnpm test       ✅ Pass (357 tests, 12 test files, 2.40s)
```

---

## Git State (Run 2)

**Branch:** `feature/day-23-import-triage-search-linking-v1`

**git diff --name-status** (16 files, excluding artifacts/):
```
M  app/import/page.tsx
A  docs/change-briefs/day-23.md
A  docs/merge-notes/merge-notes-day-22.md
M  docs/owner-map.md
A  docs/patch-stories/day-23-this-run.md
M  hooks/use-delete-all-local-data.ts
A  lib/linking/importLinking.ts
A  lib/linking/index.ts
M  lib/storage-keys.ts
M  merge-notes.md
M  scripts/validate-change-brief.mjs
M  scripts/validate-day-artifacts.mjs
M  scripts/validate-day-labels.mjs
M  store/documentImportStore.test.ts
M  store/documentImportStore.ts
M  store/index.ts
```

**git diff --stat** (excluding artifacts/):
```
 app/import/page.tsx                   | 753 ++++++++++++++++++++++++++++++--
 docs/change-briefs/day-23.md          |  82 +
 docs/merge-notes/merge-notes-day-22.md| 354 +
 docs/owner-map.md                     |  77 +-
 docs/patch-stories/day-23-this-run.md | 118 +
 hooks/use-delete-all-local-data.ts    |   5 +
 lib/linking/importLinking.ts          | 207 +
 lib/linking/index.ts                  |  27 +
 lib/storage-keys.ts                   |   2 +-
 merge-notes.md                        | 430 +-
 scripts/validate-change-brief.mjs     |   2 +-
 scripts/validate-day-artifacts.mjs    |   2 +-
 scripts/validate-day-labels.mjs       |   2 +-
 store/documentImportStore.test.ts     | 550 ++++++++++++++++++++++-
 store/documentImportStore.ts          | 523 ++++++++++++++++++++++-
 store/index.ts                        |   9 +
 16 files changed, ~2100 insertions, ~280 deletions
```

---

## Patch Artifacts (Run 2)

**Command:**
```powershell
New-Item -ItemType Directory -Force artifacts | Out-Null
git diff -- . ":(exclude)artifacts" | Out-File -FilePath artifacts/day-23.patch -Encoding utf8
git diff -- . ":(exclude)artifacts" | Out-File -FilePath artifacts/day-23-this-run.patch -Encoding utf8
Get-Item artifacts/day-23*.patch | Format-List Name,Length,LastWriteTime
```

**Output:**
```
Name          : day-23.patch
Length        : 156254
LastWriteTime : 12/17/2025 5:29:35 PM

Name          : day-23-this-run.patch
Length        : 156254
LastWriteTime : 12/17/2025 5:29:35 PM
```

**Note:** Artifacts folder excluded from diff to prevent recursion.

---

## Suggested Commit Message

```
feat(import): Day 23 – Import Center Triage, Search & Linking v1

- Add triage controls: status (New/Reviewed/Pinned/Archived), notes
- Add search/filter UI: search by title/tags/notes/content
- Add bulk actions: select multiple, mark reviewed, archive, apply tag
- Add workflow linking: link imports to Saved Jobs, Target Roles, Alerts
- Add lib/linking module for link helper functions
- Extend documentImportStore with status, note, linkedEntities fields
- Update Delete All Local Data to wipe import storage
- Add friendly privacy microcopy in Import Center
- 15 new behavioral tests (357 total), all CI gates pass
- Remove unused IMPORT_LINKS_STORAGE_KEY (links stored on import records)
```

---

## Suggested PR Title

```
feat: Day 23 – Import Center Triage, Search & Workflow Linking v1
```

---

## Follow-ups / Future Work

1. **Backlinks UI**: Add "Related Imports" sections to Saved Jobs, Resume Builder, and Alerts pages
2. **Advanced search**: Full-text search within document content
3. **Smart auto-linking**: Suggest links based on content analysis
4. **Link integrity validation**: Validate links on load, clean up orphans
5. **Export linked imports**: Include link metadata in export

---

**Do not commit or push without review.**

---

*Last updated: December 17, 2025 17:30 EST (Run 2 - Branch fix, lint fix, storage key fix, behavioral tests)*
