# PathOS Owner Map (Human-Maintained)

> **Purpose**: Quick reference for understanding where things live in the PathOS Tier 1 Frontend.
> This file is the human-maintained source of truth. See `docs/owner-map.generated.md` for auto-generated details.

---

## Routes and Entry Points

| Route | Page File | Description |
|-------|-----------|-------------|
| `/` | `app/page.tsx` | Landing/home page |
| `/admin` | `app/admin/page.tsx` | Admin panel |
| `/alerts` | `app/alerts/page.tsx` | Alerts Center (Day 20) |
| `/dashboard` | `app/dashboard/page.tsx` | Main dashboard |
| `/dashboard/benefits` | `app/dashboard/benefits/page.tsx` | Benefits overview |
| `/dashboard/career` | `app/dashboard/career/page.tsx` | Career planning |
| `/dashboard/compensation` | `app/dashboard/compensation/page.tsx` | Compensation details |
| `/dashboard/job-search` | `app/dashboard/job-search/page.tsx` | Job search workspace |
| `/dashboard/resume-builder` | `app/dashboard/resume-builder/page.tsx` | Resume builder |
| `/dashboard/retirement` | `app/dashboard/retirement/page.tsx` | Retirement planning |
| `/documents` | `app/documents/page.tsx` | Documents list |
| `/documents/uploads` | `app/documents/uploads/page.tsx` | Document uploads |
| `/explore/benefits` | `app/explore/benefits/page.tsx` | Benefits explorer |
| `/fedpath` | `app/fedpath/page.tsx` | FedPath hub |
| `/fedpath/fehb-optimizer` | `app/fedpath/fehb-optimizer/page.tsx` | FEHB optimizer |
| `/fedpath/pay-benefits` | `app/fedpath/pay-benefits/page.tsx` | Pay & benefits |
| `/fedpath/pay-benefits/promotion` | `app/fedpath/pay-benefits/promotion/page.tsx` | Promotion calculator |
| `/fedpath/pay-benefits/relocation` | `app/fedpath/pay-benefits/relocation/page.tsx` | Relocation calculator |
| `/fedpath/promotion-relocation` | `app/fedpath/promotion-relocation/page.tsx` | Promotion/relocation combo |
| `/fedpath/recommendations` | `app/fedpath/recommendations/page.tsx` | Recommendations |
| `/fedpath/retirement-tsp` | `app/fedpath/retirement-tsp/page.tsx` | Retirement/TSP planning |
| `/fedpath/scenarios` | `app/fedpath/scenarios/page.tsx` | Scenario comparisons |
| `/settings` | `app/settings/page.tsx` | User settings |
| `/tax-compliance` | `app/tax-compliance/page.tsx` | Tax compliance |

---

## Stores (Zustand) and What Each Owns

| Store File | Storage Key | What It Owns |
|------------|-------------|--------------|
| `store/profileStore.ts` | `pathos-user-profile` | User profile, employment status, grade, location |
| `store/jobSearchStore.ts` | `pathos-job-search-preferences` | Search filters, saved searches, search state |
| `store/savedJobsStore.ts` | `pathos-saved-jobs` | Saved jobs collection |
| `store/jobAlertsStore.ts` | `pathos-job-alerts` | Alert rules, matches |
| `store/jobAlertsStore.ts` | `pathos-email-digest-settings` | Email digest preferences (Day 20) |
| `store/jobAlertsStore.ts` | `pathos-alert-events` | Alert event log (Day 20) |
| `store/jobAlertsStore.ts` | `pathos-alert-seen-jobs` | Seen jobs per alert (Day 20) |
| `store/resumeBuilderStore.ts` | `pathos-resume-builder-v1` | Resume drafts, sections |
| `store/benefitsAssumptionsStore.ts` | `pathos-benefits-assumptions` | Benefits calculation inputs |
| `store/userPreferencesStore.ts` | `pathos-user-preferences` | UI preferences, global privacy toggle |
| `store/dashboardStore.ts` | (none) | Dashboard UI state (not persisted) |

---

## Persistence Keys (localStorage)

All keys are defined in `lib/storage-keys.ts`:

| Key Constant | localStorage Key | Store |
|--------------|------------------|-------|
| `PROFILE_STORAGE_KEY` | `pathos-user-profile` | profileStore |
| `JOB_SEARCH_STORAGE_KEY` | `pathos-job-search-preferences` | jobSearchStore |
| `SAVED_JOBS_STORAGE_KEY` | `pathos-saved-jobs` | savedJobsStore |
| `JOB_ALERTS_STORAGE_KEY` | `pathos-job-alerts` | jobAlertsStore |
| `EMAIL_DIGEST_STORAGE_KEY` | `pathos-email-digest-settings` | jobAlertsStore |
| `ALERT_EVENTS_STORAGE_KEY` | `pathos-alert-events` | jobAlertsStore |
| `ALERT_SEEN_JOBS_STORAGE_KEY` | `pathos-alert-seen-jobs` | jobAlertsStore |
| `RESUME_BUILDER_STORAGE_KEY` | `pathos-resume-builder-v1` | resumeBuilderStore |
| `BENEFITS_ASSUMPTIONS_STORAGE_KEY` | `pathos-benefits-assumptions` | benefitsAssumptionsStore |

(userPreferencesStore uses a local constant `STORAGE_KEY = 'pathos-user-preferences'`)

---

## Critical Flows

### "Create Alert"
1. **UI**: Click bell icon on job card OR "Save this search & enable alerts" in job-alerts-widget
2. **Store**: `jobAlertsStore.createAlert()` creates alert rule
3. **Persistence**: Writes to `pathos-job-alerts` localStorage
4. **UI**: Alert appears in Alerts tab, badge shows on sidebar nav, `/alerts` page lists it

### "Save Job"
1. **UI**: Click bookmark icon on job card
2. **Store**: `savedJobsStore.saveJob()` adds job to collection
3. **Persistence**: Writes to `pathos-saved-jobs` localStorage
4. **UI**: Job appears in Saved Jobs tab, bookmark icon fills in

### "Resume Tailoring"
1. **UI**: Click "Tailor Resume" from job details or resume builder
2. **Store**: `resumeBuilderStore` manages resume sections
3. **Persistence**: Writes to `pathos-resume-builder-v1` localStorage
4. **UI**: Tailored resume appears in resume builder with suggestions

---

## "Where Do I Change X?" Cheat Sheet

| I want to... | Look in... |
|--------------|------------|
| Add a new route | `app/<route-path>/page.tsx` |
| Add a new store | `store/<storeName>Store.ts`, export from `store/index.ts` |
| Add a localStorage key | `lib/storage-keys.ts` |
| Modify sidebar navigation | `components/path-os-sidebar.tsx` |
| Add dashboard widget | `components/dashboard/` |
| Change job card behavior | `components/dashboard/job-card*.tsx` |
| Modify alerts logic | `store/jobAlertsStore.ts`, `app/alerts/page.tsx` |
| Change job search filters | `store/jobSearchStore.ts`, `app/dashboard/job-search/page.tsx` |
| Add API endpoint | `app/api/<endpoint>/route.ts` |
| Modify user profile | `store/profileStore.ts` |

---

## Day 21 Additions: Email Import Inbox

| Component | Owner | What It Owns | What It Does NOT Own |
|-----------|-------|--------------|----------------------|
| `/import` (Email tab) | app/import/page.tsx | Email paste/upload UI, imported emails list | Document classification |
| emailIngestionStore | store/emailIngestionStore.ts | Email metadata, parsed headers, raw content | File blobs, IndexedDB |
| parseEml | lib/email/parseEml.ts | .eml file parsing, header extraction | Email sending |

---

## Day 22 Additions: Universal Document Import v1

| Component | Owner | What It Owns | What It Does NOT Own |
|-----------|-------|--------------|----------------------|
| `/import` (Files tab) | app/import/page.tsx | File upload UI, paste text UI, document list | Email parsing |
| documentImportStore | store/documentImportStore.ts | Document metadata, classification, tags, visibility | Actual file blobs |
| IndexedDB (blobs) | lib/storage/indexeddb.ts | File blob storage, blob URLs | Document metadata |
| classifyDocument | lib/documents/classifyDocument.ts | Rules-based document classification | ML classification |

---

## Day 23 Additions: Import Center Triage, Search & Workflow Linking v1

| Component | Owner | What It Owns | What It Does NOT Own |
|-----------|-------|--------------|----------------------|
| Import Center UI | app/import/page.tsx | Search/filter UI, triage controls, bulk actions, "Link to…" modal (UI wiring only) | Link resolution logic |
| Import store (extended) | store/documentImportStore.ts | Import record state, status/tags/notes, link metadata, persistence keys, reset/wipe hooks | Entity data (jobs, alerts, resume) |
| Linking helpers | lib/linking/importLinking.ts | Functions to link/unlink imports ↔ entities (Saved Job / Target Role / Job Alert), link queries | UI rendering, entity CRUD |
| Backlinks (Saved Jobs) | Saved Jobs UI components | Rendering "Related Imports" section | Import CRUD |
| Backlinks (Resume) | Resume Builder UI components | Rendering "Related Imports" section | Import CRUD |
| Backlinks (Alerts) | Alerts UI components | Rendering "Related Imports" section | Import CRUD |
| Privacy / Delete All | hooks/use-delete-all-local-data.ts | Wiping all Day 23 storage keys + link metadata | Individual item deletion |

### Day 23 Storage Keys

| Key | Purpose |
|-----|---------|
| `pathos.documentImport.v1` | Import metadata including status, tags, notes, linkedEntities array |
| `pathos-documents-db` (IndexedDB) | File blob storage |

**Note (Day 23 Run 2):** Links are stored directly on each import record's `linkedEntities` array, NOT as a separate reverse index. Backlink queries iterate through all documents.

### Day 23 Ownership Boundaries

**Import Center UI owns:**
- Search box and filter controls
- Triage UI (status toggles, tag editor, note editor)
- Bulk action checkboxes and action buttons
- "Link to…" modal/selector UI
- Displaying backlinks count/badge

**Import store owns:**
- Import record state (documents array)
- Status field (`new` | `reviewed` | `pinned` | `archived`)
- Tags array
- Note field
- LinkedEntities object (with entity type, ID, linked timestamp)
- Persistence to localStorage
- Reset hooks for Delete All Local Data

**Linking helpers own:**
- `linkImportToEntity(importId, entityType, entityId)` function
- `unlinkImportFromEntity(importId, entityType, entityId)` function
- `getLinkedImports(entityType, entityId)` query function
- `getLinkedEntities(importId)` query function
- Link validation and cleanup

**Backlinks renderers own:**
- Saved Jobs: rendering "Related Imports" section on job detail
- Resume/Target Role: rendering "Related Imports" section
- Job Alerts: rendering "Related Imports" section on alert detail
- Fetching linked imports via linking helpers

---

## Day 24 Additions: Import Actions & Extraction v1

| Component | Owner | What It Owns | What It Does NOT Own |
|-----------|-------|--------------|----------------------|
| Signal extraction | lib/documents/extractSignals.ts | Deterministic extraction of dates, URLs, emails, phones, job IDs, agencies from text | ML/LLM extraction, attachment parsing |
| Import Actions model | store/documentImportStore.ts | Action types, status lifecycle, action CRUD, persistence | Action execution (handoff to routes) |
| Extracted Signals UI | app/import/page.tsx | Display of signals, action suggestion buttons | Signal extraction logic |
| Handoff routing | app/import/page.tsx (handlers) | Navigation to Job Search (seeded), Resume Builder (tailoring mode) | Target page behavior |

### Day 24 Types & Constants

| Export | Purpose |
|--------|---------|
| `ImportActionType` | Action types: link_to_job, open_job_search, start_resume_tailoring, save_attachment, capture_deadline |
| `ImportActionStatus` | Status lifecycle: queued, applied, failed, canceled |
| `ImportAction` | Full action record with id, type, payload, status, timestamps |
| `ExtractedSignal` | Signal with type, value, confidence, source snippet |
| `SignalType` | Signal types: date, deadline, url, email, phone, jobId, announcementNumber, agency |

### Day 24 Storage

All Day 24 data is stored on the `ImportedDocument` record itself:
- `extractedSignals: ExtractedSignal[]` - signals extracted on import
- `actions: ImportAction[]` - actions created for this import

No new storage keys added (uses existing `pathos.documentImport.v1`).

### Day 24 Ownership Boundaries

**Signal extraction owns:**
- Deterministic regex-based pattern matching
- Signal deduplication
- Confidence scoring
- Source snippet extraction

**Import store (Day 24 additions) owns:**
- Auto-extraction on `importFile()` and `importText()`
- `reextractSignals(id)` to re-run extraction
- `createAction(docId, type, payload, sourceSignalId)`
- `updateActionStatus(docId, actionId, status)`
- `removeAction(docId, actionId)`
- `getQueuedActions(docId)`

**UI (Day 24 additions) owns:**
- "Extracted from this Import" section
- Suggested action buttons
- Handoff navigation (open Job Search, start tailoring)
- Empty state when no signals detected

---

## Day 27 Additions: Import Taskboard + Reminders + Audit/Trust UX v1

| Component | Owner | What It Owns | What It Does NOT Own |
|-----------|-------|--------------|----------------------|
| Task Store | store/taskStore.ts | Task model, CRUD, reminder settings, persistence | UI rendering, audit events |
| Audit Log Store | store/auditLogStore.ts | Append-only event log, event filtering, persistence | Task CRUD, import actions |
| Tasks UI | app/import/page.tsx (DocumentItem) | Task creation form, task list, reminder controls | Task business logic |
| Activity UI | app/import/page.tsx (DocumentItem) | Activity timeline display, "Why" microcopy | Audit event creation |

### Day 27 Types & Constants

| Export | Purpose |
|--------|---------|
| `Task` | Task record with id, title, status, dueDate, priority, importItemId, reminder |
| `TaskStatus` | Task status: todo, doing, done |
| `TaskPriority` | Task priority: low, medium, high |
| `TaskReminder` | Reminder settings: enabled, remindAt, repeat |
| `ReminderRepeat` | Repeat frequency: none, daily, weekly |
| `AuditEvent` | Audit record with id, timestamp, type, summary, linkages, source |
| `AuditEventType` | Event types for import actions, task operations, reminder changes |

### Day 27 Storage Keys

| Key | Purpose |
|-----|---------|
| `pathos.tasks.v1` | Task records with reminder settings |
| `pathos.auditLog.v1` | Append-only audit event log |

### Day 27 Ownership Boundaries

**Task Store owns:**
- Task CRUD operations (create, update, complete, delete)
- Reminder settings per task
- Task filtering by status, import, due date
- Snooze reminder functionality
- Persistence to localStorage

**Audit Log Store owns:**
- Append-only event creation (cannot modify or delete events)
- Event filtering by importItemId, taskId, type
- Event count limiting (max 1000 events)
- Persistence to localStorage

**Import Page (Day 27 additions) owns:**
- "Tasks from this Import" section in document details
- Task creation form with title, due date, priority
- Task list with status badges, complete/delete actions
- Reminder editing UI (datetime picker, repeat selector)
- "Activity" section showing audit events timeline
- Wiring audit events to import actions and task operations

---

## Day 29 Additions: Import Dedupe, Retention, Export, Insights, Explainability v1

| Component | Owner | What It Owns | What It Does NOT Own |
|-----------|-------|--------------|----------------------|
| Dedupe Module | lib/import/dedupe.ts | Fingerprint computation, duplicate detection, dedupe decision logic | UI rendering, store persistence |
| Retention Controls | store/documentImportStore.ts | Retention status (active/archived/deleted), retention actions (archive, restore, softDelete, deletePermanently) | UI rendering |
| Export Module | lib/import/export.ts | JSON export generation, with-sources option, privacy filtering, browser download | UI rendering, audit log access |
| Insights Module | lib/importInsights.ts | Deterministic insights generation, explainability data, source linking | UI rendering, store access |

### Day 29 Types & Constants

| Export | Purpose |
|--------|---------|
| `DedupeResult` | Deduplication decision with duplicateOfId and reasons array |
| `DuplicateStatus` | Status: none, possible_duplicate, confirmed_duplicate, overridden |
| `ExportOptions` | Export configuration: withSources, includeHidden, includeAuditEvents |
| `ExportedItem` | Exported item structure with optional sources and audit events |
| `Insight` | Insight record with type, title, description, priority, sourceSignalId, sourceSnippet |
| `InsightType` | Insight types: deadline_coming_up, top_links, next_actions, missing_deadline, missing_job_link, missing_info |
| `InsightsResult` | Result with insights array and hasInsights flag |

### Day 29 Storage

All Day 29 data is stored on the `ImportedDocument` record itself:
- `duplicateOfId: string | null` - ID of original item if duplicate
- `duplicateReasons: string[]` - Array of reasons why flagged as duplicate
- `duplicateStatus: DuplicateStatus` - Current duplicate status
- `retentionStatus: 'active' | 'archived' | 'deleted'` - Lifecycle status
- `retentionUpdatedAt: string | null` - Timestamp of last retention change

No new storage keys added (uses existing `pathos.documentImport.v1`).

### Day 29 Ownership Boundaries

**Dedupe Module owns:**
- `computeImportFingerprint(item)` - Generate stable fingerprint
- `isProbableDuplicate(a, b)` - Check if two items are duplicates
- `dedupeIncomingImport(existingItems, incomingItem)` - Check incoming against existing

**Import Store (Day 29 additions) owns:**
- `markAsDuplicate(id, duplicateOfId, reasons, status)` - Mark item as duplicate
- `overrideDuplicate(id)` - Override duplicate flag
- `archiveDocument(id)` - Move to archived state
- `restoreDocument(id)` - Move back to active state
- `softDeleteDocument(id)` - Move to deleted state
- `deletePermanently(id)` - Permanently delete (removes blob)

**Export Module owns:**
- `exportItemsAsJson(items, options)` - Generate JSON export with optional sources
- Privacy-aware filtering (exclude hidden items unless overridden)
- Browser download trigger (local-only)

**Insights Module owns:**
- `generateInsights(item, linkedTasksCount?)` - Generate deterministic insights
- Deadline insights (based on deadline signals)
- Link insights (based on linked entities)
- Action insights (based on queued actions)
- Missing info insights (when critical info not found)
- All insights must have sources (no source-less insights)

**UI (Day 29 additions) owns:**
- Dedupe badge display ("Possible duplicate" with link to original)
- "Keep anyway" override button
- Retention controls (Archive, Restore, Delete buttons)
- Export button with "With sources" option
- Insights section with "How this was derived" panels
- Explainability UI (showing source snippets for each insight)

---

*Last updated: December 2025 (Day 29)*

