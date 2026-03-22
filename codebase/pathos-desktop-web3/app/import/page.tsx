'use client';

/**
 * ============================================================================
 * IMPORT CENTER PAGE (Day 23 - Triage, Search & Workflow Linking v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unified Import Center with tabs for:
 * 1. Email Import Inbox (existing Day 21 functionality, embedded)
 * 2. Files & Text Import (Day 22 + Day 23 triage/search/linking)
 *
 * KEY FEATURES (Day 22):
 * - Tab-based navigation between import types
 * - Email Import: paste email content, upload .eml, or upload attachments
 * - Files & Text: drag/drop PDF/DOCX/TXT, paste text with optional title
 * - Imported items appear in a list with badges and actions
 *
 * KEY FEATURES (Day 23):
 * - Triage controls: status toggle (New/Reviewed/Pinned/Archived), notes
 * - Search: find by filename, tags, notes, content
 * - Filters: type, status
 * - Bulk actions: select multiple, mark reviewed, archive, apply tag
 * - Workflow linking: link imports to Saved Jobs, Target Roles, Job Alerts
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * Route: /import
 * Stores: emailIngestionStore, documentImportStore
 * IndexedDB: pathos-documents-db (for file blobs)
 *
 * HOUSE RULES COMPLIANCE (Day 23):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 * - UI copy uses "Import Center" (never "ingest/ingestion")
 *
 * @version Day 23 - Triage, Search & Workflow Linking v1
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  FileText,
  ClipboardPaste,
  X,
  AlertCircle,
  File,
  FileType,
  Edit2,
  Tag,
  RotateCcw,
  AlertTriangle,
  Inbox,
  Search,
  Filter,
  Link2,
  Pin,
  CheckSquare,
  Square,
  StickyNote,
  Briefcase,
  Target,
  Bell,
  // Day 24: Icons for extracted signals
  Zap,
  CalendarClock,
  Phone,
  Hash,
  Building,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

// Email ingestion store (Day 21)
import {
  useEmailIngestionStore,
  selectEmails,
  selectIsLoaded as selectEmailIsLoaded,
} from '@/store/emailIngestionStore';
import type { EmailIngestedItem, EmailSourceType } from '@/store/emailIngestionStore';
import type { EmailClassification } from '@/lib/email';

// Document import store (Day 22 + Day 23)
import {
  useDocumentImportStore,
  selectDocuments,
  selectDocumentImportIsLoaded,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_FILE_MIME_TYPES,
  // Day 23: Status constants
  ALL_IMPORT_STATUSES,
  IMPORT_STATUS_LABELS,
  IMPORT_STATUS_COLORS,
} from '@/store/documentImportStore';
import type {
  ImportedDocument,
  DocumentType,
  // Day 23: Triage and linking types
  ImportStatus,
  LinkableEntityType,
} from '@/store/documentImportStore';

// Day 23: Saved Jobs store for linking
import {
  useSavedJobsStore,
  selectSavedJobs,
  selectIsLoaded as selectSavedJobsIsLoaded,
} from '@/store/savedJobsStore';

// Day 23: Job Alerts store for linking
import {
  useJobAlertsStore,
  selectAlerts,
  selectIsLoaded as selectAlertsIsLoaded,
} from '@/store/jobAlertsStore';

// Day 23: Resume Builder store for linking
import {
  useResumeBuilderStore,
  selectSavedTargetJobs,
} from '@/store/resumeBuilderStore';

// Classification types and helpers (Day 22)
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  SENSITIVITY_LABELS,
  ALL_CATEGORIES,
  ALL_SENSITIVITY_LABELS,
} from '@/lib/documents';
import type { DocumentCategory, SensitivityLabel } from '@/lib/documents';

// IndexedDB helpers for viewing (Day 22)
import { createDocumentBlobUrl } from '@/lib/storage/indexeddb';

// Day 27: Task store for taskboard
import {
  useTaskStore,
  selectTasks,
  selectTasksIsLoaded,
} from '@/store/taskStore';
import type { Task, CreateTaskData, TaskReminder } from '@/store/taskStore';

// Day 27: Audit log store for activity tracking
import {
  useAuditLogStore,
  selectAuditLogIsLoaded,
} from '@/store/auditLogStore';
import type { AuditEvent, AuditEventType } from '@/store/auditLogStore';

// Day 27: Extracted components
import { TaskList } from './components/TaskList';
import { ActivityFeed } from './components/ActivityFeed';

// ============================================================================
// EMAIL CLASSIFICATION DISPLAY HELPERS (from Day 21)
// ============================================================================

/**
 * Maps email classification categories to display colors.
 */
const EMAIL_CLASSIFICATION_COLORS: Record<EmailClassification, string> = {
  PayStub: 'bg-green-500/20 text-green-400 border-green-500/30',
  RelocationOrders: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FEHB: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  JobPosting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

/**
 * Maps email classification categories to human-readable labels.
 */
const EMAIL_CLASSIFICATION_LABELS: Record<EmailClassification, string> = {
  PayStub: 'Pay Stub',
  RelocationOrders: 'Relocation Orders',
  FEHB: 'FEHB',
  JobPosting: 'Job Posting',
  Other: 'Other',
};

/**
 * Maps email source types to display labels.
 */
const EMAIL_SOURCE_LABELS: Record<EmailSourceType, string> = {
  pasted: 'Pasted Email',
  attachments: 'Attachments',
  eml: 'Saved Email (.eml)',
};

/**
 * Maps email source types to badge colors.
 */
const EMAIL_SOURCE_COLORS: Record<EmailSourceType, string> = {
  pasted: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  attachments: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  eml: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

// ============================================================================
// DOCUMENT TYPE DISPLAY HELPERS
// ============================================================================

/**
 * Maps document types to display labels.
 */
const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  txt: 'TXT',
  text: 'Text',
};

/**
 * Maps document types to badge colors.
 */
const DOC_TYPE_COLORS: Record<DocumentType, string> = {
  pdf: 'bg-red-500/20 text-red-400 border-red-500/30',
  docx: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  txt: 'bg-green-500/20 text-green-400 border-green-500/30',
  text: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

// ============================================================================
// DOCUMENT ITEM COMPONENT
// ============================================================================

interface DocumentItemProps {
  doc: ImportedDocument;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateCategory: (id: string, category: DocumentCategory) => void;
  onUpdateSensitivity: (id: string, sensitivity: SensitivityLabel) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onResetFields: (id: string) => void;
  onView: (id: string) => void;
  // Day 23: Triage and linking props
  onUpdateStatus: (id: string, status: ImportStatus) => void;
  onUpdateNote: (id: string, note: string) => void;
  onOpenLinkModal: (id: string) => void;
  // Day 23: Bulk selection
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  // Day 24: Action handoff props
  onOpenJobSearch: (doc: ImportedDocument) => void;
  onStartTailoring: (doc: ImportedDocument) => void;
  onCaptureDeadline: (doc: ImportedDocument) => void;
  // Day 24 Fix: Re-extract signals
  onReextractSignals: (docId: string) => void;
  // Day 27: Task and activity props
  tasksForImport: Task[];
  auditEventsForImport: AuditEvent[];
  onCreateTask: (importItemId: string, taskData: CreateTaskData) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskReminder: (taskId: string, reminder: Partial<TaskReminder>) => void;
  onSnoozeReminder: (taskId: string) => void;
  // Day 29: Retention actions
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onSoftDelete: (id: string) => void;
}

/**
 * Renders a single document item in the import list.
 * Day 23: Enhanced with status toggle, note editor, and link action.
 */
function DocumentItem(props: DocumentItemProps) {
  const doc = props.doc;
  const onDelete = props.onDelete;
  const onToggleHidden = props.onToggleHidden;
  const onUpdateTitle = props.onUpdateTitle;
  const onUpdateCategory = props.onUpdateCategory;
  const onUpdateSensitivity = props.onUpdateSensitivity;
  const onAddTag = props.onAddTag;
  const onRemoveTag = props.onRemoveTag;
  const onResetFields = props.onResetFields;
  const onView = props.onView;
  // Day 23 props
  const onUpdateStatus = props.onUpdateStatus;
  const onUpdateNote = props.onUpdateNote;
  const onOpenLinkModal = props.onOpenLinkModal;
  const isSelected = props.isSelected;
  const onToggleSelect = props.onToggleSelect;
  // Day 24 props
  const onOpenJobSearch = props.onOpenJobSearch;
  const onStartTailoring = props.onStartTailoring;
  const onCaptureDeadline = props.onCaptureDeadline;
  // Day 24 Fix: Re-extract signals
  const onReextractSignals = props.onReextractSignals;
  // Day 27 props
  const tasksForImport = props.tasksForImport;
  const auditEventsForImport = props.auditEventsForImport;
  const onCreateTask = props.onCreateTask;
  const onCompleteTask = props.onCompleteTask;
  const onDeleteTask = props.onDeleteTask;
  const onUpdateTaskReminder = props.onUpdateTaskReminder;
  const onSnoozeReminder = props.onSnoozeReminder;
  // Day 29: Retention actions
  const onArchive = props.onArchive;
  const onRestore = props.onRestore;
  const onSoftDelete = props.onSoftDelete;

  // Day 29: Get retention status (with fallback for backwards compatibility)
  const effectiveRetentionStatus = doc.retentionStatus !== undefined ? doc.retentionStatus : 'active';

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(doc.title);
  const [newTag, setNewTag] = useState('');
  // Day 23: Note editing state
  const [editNote, setEditNote] = useState(doc.note);
  const [isEditingNote, setIsEditingNote] = useState(false);

  /**
   * Handle title edit save.
   */
  const handleSaveTitle = useCallback(function () {
    if (editTitle.trim() !== '') {
      onUpdateTitle(doc.id, editTitle.trim());
    }
    setIsEditing(false);
  }, [doc.id, editTitle, onUpdateTitle]);

  /**
   * Handle add tag.
   */
  const handleAddTag = useCallback(function () {
    if (newTag.trim() !== '') {
      onAddTag(doc.id, newTag.trim());
      setNewTag('');
    }
  }, [doc.id, newTag, onAddTag]);

  /**
   * Day 23: Handle note save.
   */
  const handleSaveNote = useCallback(function () {
    onUpdateNote(doc.id, editNote);
    setIsEditingNote(false);
  }, [doc.id, editNote, onUpdateNote]);


  // Format date for display
  const displayDate = new Date(doc.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format file size
  const formatSize = function (bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      className={
        'rounded-lg border transition-colors ' +
        (doc.isHidden ? 'opacity-50 ' : '') +
        (isSelected ? 'border-amber-500 bg-amber-500/5 ' : 'border-border bg-card/50 ') +
        (doc.status === 'pinned' ? 'ring-1 ring-amber-500/30 ' : '')
      }
    >
      {/* Header row */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Day 23: Checkbox for bulk selection */}
          <button
            type="button"
            onClick={function () { onToggleSelect(doc.id); }}
            className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-amber-500" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
          {/* Day 23: Pin icon for pinned status */}
          {doc.status === 'pinned' ? (
            <Pin className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : (
            <FileText className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {/* Title - editable */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editTitle}
                  onChange={function (e) { setEditTitle(e.target.value); }}
                  className="h-8 text-sm"
                  onKeyDown={function (e) {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setEditTitle(doc.title);
                      setIsEditing(false);
                    }
                  }}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleSaveTitle}>Save</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={function () {
                    setEditTitle(doc.title);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{displayDate}</span>
              <span className="text-xs text-muted-foreground">&bull;</span>
              <span className="text-xs text-muted-foreground">{formatSize(doc.sizeBytes)}</span>
            </div>

            {/* Tags */}
            {doc.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {doc.tags.map(function (tag, idx) {
                  return (
                    <span
                      key={idx}
                      className="text-xs bg-secondary/30 text-secondary-foreground px-2 py-0.5 rounded flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={function () { onRemoveTag(doc.id, tag); }}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Day 23: Note preview */}
            {doc.note !== '' && (
              <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{doc.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-1 ml-2">
          {/* Day 29: Duplicate badge */}
          {doc.duplicateStatus !== 'none' && doc.duplicateStatus !== undefined && (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              Possible duplicate
            </Badge>
          )}
          {/* Day 23: Status badge */}
          <Badge className={IMPORT_STATUS_COLORS[doc.status]}>{IMPORT_STATUS_LABELS[doc.status]}</Badge>
          <Badge className={DOC_TYPE_COLORS[doc.type]}>{DOC_TYPE_LABELS[doc.type]}</Badge>
          <Badge className={CATEGORY_COLORS[doc.category]}>{CATEGORY_LABELS[doc.category]}</Badge>
          {/* Day 23: Link count badge */}
          {doc.linkedEntities.length > 0 && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Link2 className="w-3 h-3 mr-1" />
              {doc.linkedEntities.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 px-4 pb-4 border-t border-border/50 pt-3 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { setIsExpanded(!isExpanded); }}
          className="text-xs"
        >
          {isExpanded ? (
            <><ChevronUp className="w-4 h-4 mr-1" />Hide</>
          ) : (
            <><ChevronDown className="w-4 h-4 mr-1" />Details</>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { onView(doc.id); }}
          className="text-xs"
        >
          <Eye className="w-4 h-4 mr-1" />View
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { setIsEditing(true); }}
          className="text-xs"
        >
          <Edit2 className="w-4 h-4 mr-1" />Rename
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { onToggleHidden(doc.id); }}
          className="text-xs"
        >
          {doc.isHidden ? (
            <><Eye className="w-4 h-4 mr-1" />Show</>
          ) : (
            <><EyeOff className="w-4 h-4 mr-1" />Hide</>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { onResetFields(doc.id); }}
          className="text-xs"
        >
          <RotateCcw className="w-4 h-4 mr-1" />Reset
        </Button>

        {/* Day 23: Link to action */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { onOpenLinkModal(doc.id); }}
          className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
        >
          <Link2 className="w-4 h-4 mr-1" />Link
        </Button>

        {/* Day 29: Retention actions based on retentionStatus */}
        {effectiveRetentionStatus === 'active' && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={function () { onArchive(doc.id); }}
              className="text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-500/10"
            >
              Archive
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={function () { onSoftDelete(doc.id); }}
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />Delete
            </Button>
          </>
        )}
        {effectiveRetentionStatus === 'archived' && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={function () { onRestore(doc.id); }}
              className="text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
            >
              <RotateCcw className="w-4 h-4 mr-1" />Restore
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={function () { onSoftDelete(doc.id); }}
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />Delete
            </Button>
          </>
        )}
        {effectiveRetentionStatus === 'deleted' && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={function () { onRestore(doc.id); }}
              className="text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
            >
              <RotateCcw className="w-4 h-4 mr-1" />Restore
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={function () { onDelete(doc.id); }}
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />Delete Permanently
            </Button>
          </>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 p-4 bg-secondary/10 space-y-4">
          {/* Day 23: Status and edit controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status select (Day 23) */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Status</Label>
              <Select
                value={doc.status}
                onValueChange={function (val) { onUpdateStatus(doc.id, val as ImportStatus); }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_IMPORT_STATUSES.map(function (status) {
                    return (
                      <SelectItem key={status} value={status}>{IMPORT_STATUS_LABELS[status]}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Category select */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Category</Label>
              <Select
                value={doc.category}
                onValueChange={function (val) { onUpdateCategory(doc.id, val as DocumentCategory); }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map(function (cat) {
                    return (
                      <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Sensitivity select */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Sensitivity</Label>
              <Select
                value={doc.sensitivity}
                onValueChange={function (val) { onUpdateSensitivity(doc.id, val as SensitivityLabel); }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_SENSITIVITY_LABELS.map(function (sens) {
                    return (
                      <SelectItem key={sens} value={sens}>{SENSITIVITY_LABELS[sens]}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Add tag */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Add Tag</Label>
              <div className="flex gap-1">
                <Input
                  value={newTag}
                  onChange={function (e) { setNewTag(e.target.value); }}
                  placeholder="New tag..."
                  className="h-8 text-xs"
                  onKeyDown={function (e) {
                    if (e.key === 'Enter') handleAddTag();
                  }}
                />
                <Button type="button" size="sm" onClick={handleAddTag} className="h-8">
                  <Tag className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Day 23: Note editor */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Note</Label>
            {isEditingNote ? (
              <div className="space-y-2">
                <Textarea
                  value={editNote}
                  onChange={function (e) { setEditNote(e.target.value); }}
                  placeholder="Add a note about this import..."
                  rows={2}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleSaveNote}>Save Note</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={function () {
                      setEditNote(doc.note);
                      setIsEditingNote(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={function () { setIsEditingNote(true); }}
                className="text-xs bg-secondary/20 p-2 rounded min-h-[40px] cursor-pointer hover:bg-secondary/30 transition-colors"
              >
                {doc.note !== '' ? doc.note : <span className="text-muted-foreground italic">Click to add a note...</span>}
              </div>
            )}
          </div>

          {/* Day 24: Extracted Signals Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Extracted from this Import
              </Label>
              {/* Day 24 Fix: Re-detect details button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={function () { onReextractSignals(doc.id); }}
                className="text-xs h-6 px-2"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Re-detect
              </Button>
            </div>
            {doc.extractedSignals !== undefined && doc.extractedSignals.length > 0 ? (
              <div className="bg-secondary/20 p-3 rounded space-y-2">
                {/* Group signals by type for display */}
                {(function () {
                  // Deadlines first (important)
                  const deadlines = doc.extractedSignals.filter(function (s) { return s.type === 'deadline'; });
                  const urls = doc.extractedSignals.filter(function (s) { return s.type === 'url'; });
                  const emails = doc.extractedSignals.filter(function (s) { return s.type === 'email'; });
                  const phones = doc.extractedSignals.filter(function (s) { return s.type === 'phone'; });
                  const jobIds = doc.extractedSignals.filter(function (s) { return s.type === 'jobId' || s.type === 'announcementNumber'; });
                  const agencies = doc.extractedSignals.filter(function (s) { return s.type === 'agency'; });
                  const dates = doc.extractedSignals.filter(function (s) { return s.type === 'date'; });

                  const sections: React.ReactNode[] = [];

                  if (deadlines.length > 0) {
                    sections.push(
                      <div key="deadlines" className="flex items-start gap-2">
                        <CalendarClock className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {deadlines.map(function (sig) {
                            return (
                              <span key={sig.id} className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                                {sig.displayValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (urls.length > 0) {
                    sections.push(
                      <div key="urls" className="flex items-start gap-2">
                        <Link2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col gap-1">
                          {urls.map(function (sig) {
                            return (
                              <a
                                key={sig.id}
                                href={sig.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-cyan-400 hover:underline truncate max-w-[300px]"
                              >
                                {sig.displayValue}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (emails.length > 0) {
                    sections.push(
                      <div key="emails" className="flex items-start gap-2">
                        <Mail className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {emails.map(function (sig) {
                            return (
                              <span key={sig.id} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                {sig.displayValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (phones.length > 0) {
                    sections.push(
                      <div key="phones" className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {phones.map(function (sig) {
                            return (
                              <span key={sig.id} className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                                {sig.displayValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (jobIds.length > 0) {
                    sections.push(
                      <div key="jobIds" className="flex items-start gap-2">
                        <Hash className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {jobIds.map(function (sig) {
                            return (
                              <span key={sig.id} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                                {sig.displayValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (agencies.length > 0) {
                    sections.push(
                      <div key="agencies" className="flex items-start gap-2">
                        <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {agencies.map(function (sig) {
                            return (
                              <span key={sig.id} className="text-xs bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded">
                                {sig.displayValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (dates.length > 0) {
                    sections.push(
                      <div key="dates" className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {dates.map(function (sig) {
                            return (
                              <span key={sig.id} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                {sig.displayValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return sections;
                })()}

                {/* Day 24: Suggested Actions */}
                <div className="border-t border-border/50 pt-2 mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Suggested Actions:</p>
                  <div className="flex flex-wrap gap-2">
                    {/* Show "Open Job Search" if URL or job ID exists */}
                    {(doc.extractedSignals.some(function (s) { return s.type === 'url' || s.type === 'jobId' || s.type === 'announcementNumber'; })) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={function () { onOpenJobSearch(doc); }}
                        className="text-xs"
                      >
                        <Search className="w-3 h-3 mr-1" />
                        Open Job Search
                      </Button>
                    )}
                    {/* Show "Start Tailoring" if job-related content */}
                    {(doc.category === 'JobPosting' || doc.extractedSignals.some(function (s) { return s.type === 'jobId' || s.type === 'announcementNumber'; })) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={function () { onStartTailoring(doc); }}
                        className="text-xs"
                      >
                        <Target className="w-3 h-3 mr-1" />
                        Start Resume Tailoring
                      </Button>
                    )}
                    {/* Show "Track Deadline" if deadline exists */}
                    {doc.extractedSignals.some(function (s) { return s.type === 'deadline'; }) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={function () { onCaptureDeadline(doc); }}
                        className="text-xs"
                      >
                        <CalendarClock className="w-3 h-3 mr-1" />
                        Track Deadline
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-secondary/20 p-3 rounded text-xs text-muted-foreground italic">
                No key details detected yet.
              </div>
            )}
          </div>

          {/* Classification info */}
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Classification confidence:</span>{' '}
            {Math.round(doc.classificationConfidence * 100)}%
            {doc.classificationKeywords.length > 0 && (
              <span> • Keywords: {doc.classificationKeywords.join(', ')}</span>
            )}
          </div>

          {/* Preview for text content */}
          {doc.textContent !== null && doc.type === 'text' && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Content Preview</Label>
              <pre className="text-xs bg-secondary/20 p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                {doc.textContent.length > 2000
                  ? doc.textContent.substring(0, 2000) + '...'
                  : doc.textContent}
              </pre>
            </div>
          )}

          {/* Day 27: Tasks Section */}
          <TaskList
            tasks={tasksForImport}
            onCreateTask={function (taskData) { onCreateTask(doc.id, taskData); }}
            onCompleteTask={onCompleteTask}
            onDeleteTask={onDeleteTask}
            onUpdateTaskReminder={onUpdateTaskReminder}
            onSnoozeReminder={onSnoozeReminder}
          />

          {/* Day 27: Activity Section */}
          <ActivityFeed auditEvents={auditEventsForImport} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EMAIL ITEM COMPONENT (from Day 21, simplified)
// ============================================================================

interface EmailItemSimpleProps {
  email: EmailIngestedItem;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
}

/**
 * Renders a single email item in the import list (simplified from Day 21).
 */
function EmailItemSimple(props: EmailItemSimpleProps) {
  const email = props.email;
  const onDelete = props.onDelete;
  const onToggleHidden = props.onToggleHidden;

  const [isExpanded, setIsExpanded] = useState(false);

  // Format the email date for display
  const displayDate = email.date !== '' ? email.date : email.createdAt.substring(0, 10);

  // Get classification styling
  const classColor = EMAIL_CLASSIFICATION_COLORS[email.classification];
  const classLabel = EMAIL_CLASSIFICATION_LABELS[email.classification];

  // Get source type styling
  const sourceType: EmailSourceType = email.sourceType !== undefined && email.sourceType !== null
    ? email.sourceType
    : 'pasted';
  const sourceLabel = EMAIL_SOURCE_LABELS[sourceType];
  const sourceColor = EMAIL_SOURCE_COLORS[sourceType];

  return (
    <div
      className={
        'rounded-lg border border-border bg-card/50 transition-colors ' +
        (email.isHidden ? 'opacity-50' : '')
      }
    >
      {/* Header row */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Mail className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {email.subject !== '' ? email.subject : '(No Subject)'}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">
                From: {email.from !== '' ? email.from : '(Unknown)'}
              </span>
              <span className="text-xs text-muted-foreground">&bull;</span>
              <span className="text-xs text-muted-foreground">{displayDate}</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-1 ml-2">
          <Badge className={classColor}>{classLabel}</Badge>
          <Badge className={sourceColor}>{sourceLabel}</Badge>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 px-4 pb-4 border-t border-border/50 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { setIsExpanded(!isExpanded); }}
          className="text-xs"
        >
          {isExpanded ? (
            <><ChevronUp className="w-4 h-4 mr-1" />Hide</>
          ) : (
            <><ChevronDown className="w-4 h-4 mr-1" />Details</>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { onToggleHidden(email.id); }}
          className="text-xs"
        >
          {email.isHidden ? (
            <><Eye className="w-4 h-4 mr-1" />Show</>
          ) : (
            <><EyeOff className="w-4 h-4 mr-1" />Hide</>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={function () { onDelete(email.id); }}
          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-1" />Delete
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 p-4 bg-secondary/10">
          <pre className="text-xs bg-secondary/20 p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap font-mono">
            {email.raw}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ImportCenterPage() {
  // =========================================================================
  // ROUTER (Day 24 Fix: Use Next.js router instead of window.location.href)
  // =========================================================================

  const router = useRouter();

  // =========================================================================
  // STATE
  // =========================================================================

  const [activeTab, setActiveTab] = useState('files');

  // Files & Text Import state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop state (Day 22 Run 2 - Fix 1)
  const [isDragOver, setIsDragOver] = useState(false);

  // Email Import state
  const [emailPasteText, setEmailPasteText] = useState('');
  const emailFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEmlFile, setSelectedEmlFile] = useState<File | null>(null);

  // General UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Viewing state
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [viewingBlobUrl, setViewingBlobUrl] = useState<string | null>(null);
  const [viewingContent, setViewingContent] = useState<string | null>(null);

  // =========================================================================
  // DAY 23: Search, Filter, and Bulk Selection State
  // =========================================================================

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ImportStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState('');
  // Day 29: Retention view selector
  const [retentionView, setRetentionView] = useState<'active' | 'archived' | 'deleted'>('active');

  // Day 29: Delete confirmation dialog state (bulk)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  // Day 29: Individual delete confirmation dialog state
  const [showIndividualDeleteDialog, setShowIndividualDeleteDialog] = useState(false);
  const [individualDeleteDocId, setIndividualDeleteDocId] = useState<string | null>(null);
  const [individualDeleteConfirmChecked, setIndividualDeleteConfirmChecked] = useState(false);

  // Day 29: Track new archived/deleted/active files for badge counts
  const [newArchivedIds, setNewArchivedIds] = useState<Set<string>>(new Set());
  const [newDeletedIds, setNewDeletedIds] = useState<Set<string>>(new Set());
  const [newActiveIds, setNewActiveIds] = useState<Set<string>>(new Set());

  // Day 23: Link modal state
  const [linkModalDocId, setLinkModalDocId] = useState<string | null>(null);

  // Toast notifications
  const toastHook = useToast();
  const toast = toastHook.toast;

  // =========================================================================
  // DOCUMENT IMPORT STORE
  // =========================================================================

  const documents = useDocumentImportStore(selectDocuments);
  const docIsLoaded = useDocumentImportStore(selectDocumentImportIsLoaded);
  const loadDocsFromStorage = useDocumentImportStore(function (state) { return state.loadFromStorage; });
  const importFile = useDocumentImportStore(function (state) { return state.importFile; });
  const importText = useDocumentImportStore(function (state) { return state.importText; });
  const deleteDocument = useDocumentImportStore(function (state) { return state.deleteDocument; });
  // Day 29: Retention actions
  const archiveDocument = useDocumentImportStore(function (state) { return state.archiveDocument; });
  const restoreDocument = useDocumentImportStore(function (state) { return state.restoreDocument; });
  const softDeleteDocument = useDocumentImportStore(function (state) { return state.softDeleteDocument; });
  const toggleDocHidden = useDocumentImportStore(function (state) { return state.toggleHidden; });
  const updateDocTitle = useDocumentImportStore(function (state) { return state.updateTitle; });
  const updateDocCategory = useDocumentImportStore(function (state) { return state.updateCategory; });
  const updateDocSensitivity = useDocumentImportStore(function (state) { return state.updateSensitivity; });
  const addDocTag = useDocumentImportStore(function (state) { return state.addTag; });
  const removeDocTag = useDocumentImportStore(function (state) { return state.removeTag; });
  const resetDocFields = useDocumentImportStore(function (state) { return state.resetDocumentFields; });
  const getDocument = useDocumentImportStore(function (state) { return state.getDocument; });
  // Day 23: Triage and linking actions
  const updateDocStatus = useDocumentImportStore(function (state) { return state.updateStatus; });
  const updateDocNote = useDocumentImportStore(function (state) { return state.updateNote; });
  const bulkUpdateStatus = useDocumentImportStore(function (state) { return state.bulkUpdateStatus; });
  const bulkAddTag = useDocumentImportStore(function (state) { return state.bulkAddTag; });
  // Note: bulkRemoveTag action is available but not exposed in current UI - can add later
  const linkToEntity = useDocumentImportStore(function (state) { return state.linkToEntity; });
  const unlinkFromEntity = useDocumentImportStore(function (state) { return state.unlinkFromEntity; });
  // Day 24 Fix: Action creation and status update for suggested actions
  const createAction = useDocumentImportStore(function (state) { return state.createAction; });
  const updateActionStatus = useDocumentImportStore(function (state) { return state.updateActionStatus; });
  // Day 24 Fix: Re-extract signals from content
  const reextractSignals = useDocumentImportStore(function (state) { return state.reextractSignals; });

  // =========================================================================
  // DAY 23: Stores for Linking
  // =========================================================================

  const savedJobs = useSavedJobsStore(selectSavedJobs);
  const savedJobsLoaded = useSavedJobsStore(selectSavedJobsIsLoaded);
  const loadSavedJobs = useSavedJobsStore(function (state) { return state.loadFromStorage; });

  const jobAlerts = useJobAlertsStore(selectAlerts);
  const alertsLoaded = useJobAlertsStore(selectAlertsIsLoaded);
  const loadAlerts = useJobAlertsStore(function (state) { return state.loadFromStorage; });

  const targetJobs = useResumeBuilderStore(selectSavedTargetJobs);

  // =========================================================================
  // EMAIL INGESTION STORE
  // =========================================================================

  const emails = useEmailIngestionStore(selectEmails);
  const emailIsLoaded = useEmailIngestionStore(selectEmailIsLoaded);
  const loadEmailsFromStorage = useEmailIngestionStore(function (state) { return state.loadFromStorage; });
  const ingestEmailFromText = useEmailIngestionStore(function (state) { return state.ingestFromText; });
  const ingestEmlFile = useEmailIngestionStore(function (state) { return state.ingestFromEmlFile; });
  const deleteEmail = useEmailIngestionStore(function (state) { return state.deleteEmail; });
  const toggleEmailHidden = useEmailIngestionStore(function (state) { return state.toggleHidden; });

  // =========================================================================
  // DAY 27: TASK STORE
  // =========================================================================

  const tasks = useTaskStore(selectTasks);
  const tasksIsLoaded = useTaskStore(selectTasksIsLoaded);
  const loadTasksFromStorage = useTaskStore(function (state) { return state.loadFromStorage; });
  const createTaskFromImport = useTaskStore(function (state) { return state.createTaskFromImport; });
  const completeTask = useTaskStore(function (state) { return state.completeTask; });
  const deleteTask = useTaskStore(function (state) { return state.deleteTask; });
  const updateTaskReminder = useTaskStore(function (state) { return state.updateReminder; });
  const snoozeTaskReminder = useTaskStore(function (state) { return state.snoozeReminder; });
  const getTasksForImport = useTaskStore(function (state) { return state.getTasksForImport; });

  // =========================================================================
  // DAY 27: AUDIT LOG STORE
  // =========================================================================

  const auditLogIsLoaded = useAuditLogStore(selectAuditLogIsLoaded);
  const loadAuditLogFromStorage = useAuditLogStore(function (state) { return state.loadFromStorage; });
  const appendAuditEvent = useAuditLogStore(function (state) { return state.appendAuditEvent; });
  const getAuditEvents = useAuditLogStore(function (state) { return state.getAuditEvents; });

  // =========================================================================
  // EFFECTS
  // =========================================================================

  // Load from storage on mount
  useEffect(function () {
    if (!docIsLoaded) {
      loadDocsFromStorage();
    }
  }, [docIsLoaded, loadDocsFromStorage]);

  useEffect(function () {
    if (!emailIsLoaded) {
      loadEmailsFromStorage();
    }
  }, [emailIsLoaded, loadEmailsFromStorage]);

  // Day 23: Load linked stores for linking modal
  useEffect(function () {
    if (!savedJobsLoaded) {
      loadSavedJobs();
    }
  }, [savedJobsLoaded, loadSavedJobs]);

  useEffect(function () {
    if (!alertsLoaded) {
      loadAlerts();
    }
  }, [alertsLoaded, loadAlerts]);

  // Day 27: Load task store
  useEffect(function () {
    if (!tasksIsLoaded) {
      loadTasksFromStorage();
    }
  }, [tasksIsLoaded, loadTasksFromStorage]);

  // Day 27: Load audit log store
  useEffect(function () {
    if (!auditLogIsLoaded) {
      loadAuditLogFromStorage();
    }
  }, [auditLogIsLoaded, loadAuditLogFromStorage]);

  // =========================================================================
  // DAY 23: Filtered and Sorted Documents
  // =========================================================================

  /**
   * Filter and sort documents based on search query and filters.
   * - Pinned items always appear first
   * - Then sorted by createdAt (newest first)
   * - Archived items appear last (unless filtered)
   * Day 29: Filters by retentionStatus based on retentionView
   */
  const filteredDocuments = useMemo(function () {
    const result: ImportedDocument[] = [];

    // Apply filters
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      // Day 29: Retention status filter (primary filter)
      // Access retentionStatus directly (with fallback for backwards compatibility)
      const docRetentionStatus = doc.retentionStatus !== undefined ? doc.retentionStatus : 'active';
      if (docRetentionStatus !== retentionView) {
        continue;
      }

      // Status filter
      if (filterStatus !== 'all' && doc.status !== filterStatus) {
        continue;
      }

      // Type filter
      if (filterType !== 'all' && doc.type !== filterType) {
        continue;
      }

      // Search filter (case-insensitive)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const titleMatch = doc.title.toLowerCase().indexOf(query) !== -1;
        const noteMatch = doc.note.toLowerCase().indexOf(query) !== -1;
        let tagMatch = false;
        for (let j = 0; j < doc.tags.length; j++) {
          if (doc.tags[j].toLowerCase().indexOf(query) !== -1) {
            tagMatch = true;
            break;
          }
        }
        const contentMatch = doc.textContent !== null && doc.textContent.toLowerCase().indexOf(query) !== -1;

        if (!titleMatch && !noteMatch && !tagMatch && !contentMatch) {
          continue;
        }
      }

      result.push(doc);
    }

    // Sort: pinned first, then by createdAt (newest first)
    const pinned: ImportedDocument[] = [];
    const notPinned: ImportedDocument[] = [];
    const archived: ImportedDocument[] = [];

    for (let k = 0; k < result.length; k++) {
      const doc = result[k];
      if (doc.status === 'pinned') {
        pinned.push(doc);
      } else if (doc.status === 'archived') {
        archived.push(doc);
      } else {
        notPinned.push(doc);
      }
    }

    // Sort each group by createdAt (newest first)
    function sortByDate(a: ImportedDocument, b: ImportedDocument): number {
      return b.createdAt.localeCompare(a.createdAt);
    }
    pinned.sort(sortByDate);
    notPinned.sort(sortByDate);
    archived.sort(sortByDate);

    // Combine: pinned → not pinned → archived
    const sorted: ImportedDocument[] = [];
    for (let m = 0; m < pinned.length; m++) {
      sorted.push(pinned[m]);
    }
    for (let n = 0; n < notPinned.length; n++) {
      sorted.push(notPinned[n]);
    }
    for (let p = 0; p < archived.length; p++) {
      sorted.push(archived[p]);
    }

    return sorted;
  }, [documents, searchQuery, filterStatus, filterType, retentionView]);

  // Day 29: Calculate counts per retention view
  const retentionCounts = useMemo(function () {
    let activeCount = 0;
    let archivedCount = 0;
    let deletedCount = 0;
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      // Access retentionStatus directly (with fallback for backwards compatibility)
      const docRetentionStatus = doc.retentionStatus !== undefined ? doc.retentionStatus : 'active';
      if (docRetentionStatus === 'active') {
        activeCount = activeCount + 1;
      } else if (docRetentionStatus === 'archived') {
        archivedCount = archivedCount + 1;
      } else if (docRetentionStatus === 'deleted') {
        deletedCount = deletedCount + 1;
      }
    }
    return { active: activeCount, archived: archivedCount, deleted: deletedCount };
  }, [documents]);

  // Day 29: Calculate badge counts (only files that are currently in the status AND are new)
  const archivedBadgeCount = useMemo(function () {
    let count = 0;
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docRetentionStatus = doc.retentionStatus !== undefined ? doc.retentionStatus : 'active';
      if (docRetentionStatus === 'archived' && newArchivedIds.has(doc.id)) {
        count = count + 1;
      }
    }
    return count;
  }, [documents, newArchivedIds]);

  const deletedBadgeCount = useMemo(function () {
    let count = 0;
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docRetentionStatus = doc.retentionStatus !== undefined ? doc.retentionStatus : 'active';
      if (docRetentionStatus === 'deleted' && newDeletedIds.has(doc.id)) {
        count = count + 1;
      }
    }
    return count;
  }, [documents, newDeletedIds]);

  const activeBadgeCount = useMemo(function () {
    let count = 0;
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docRetentionStatus = doc.retentionStatus !== undefined ? doc.retentionStatus : 'active';
      if (docRetentionStatus === 'active' && newActiveIds.has(doc.id)) {
        count = count + 1;
      }
    }
    return count;
  }, [documents, newActiveIds]);

  // Clean up blob URL when viewing changes
  useEffect(function () {
    return function () {
      if (viewingBlobUrl !== null) {
        URL.revokeObjectURL(viewingBlobUrl);
      }
    };
  }, [viewingBlobUrl]);

  // =========================================================================
  // DAY 23: BULK SELECTION AND ACTION HANDLERS
  // =========================================================================

  /**
   * Toggle selection of a single document.
   */
  const handleToggleSelect = useCallback(function (id: string) {
    setSelectedDocIds(function (prev) {
      const newIds: string[] = [];
      let found = false;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] === id) {
          found = true;
        } else {
          newIds.push(prev[i]);
        }
      }
      if (!found) {
        newIds.push(id);
      }
      return newIds;
    });
  }, []);

  /**
   * Select all visible documents.
   */
  const handleSelectAll = useCallback(function () {
    const ids: string[] = [];
    for (let i = 0; i < filteredDocuments.length; i++) {
      ids.push(filteredDocuments[i].id);
    }
    setSelectedDocIds(ids);
  }, [filteredDocuments]);

  /**
   * Clear all selections.
   */
  const handleClearSelection = useCallback(function () {
    setSelectedDocIds([]);
  }, []);

  /**
   * Bulk mark selected documents as reviewed.
   */
  const handleBulkMarkReviewed = useCallback(function () {
    if (selectedDocIds.length === 0) return;
    bulkUpdateStatus(selectedDocIds, 'reviewed');
    setSuccessMessage('Marked ' + selectedDocIds.length + ' item(s) as reviewed');
    setSelectedDocIds([]);
  }, [selectedDocIds, bulkUpdateStatus]);

  /**
   * Bulk archive selected documents.
   * Day 29: Updates retentionStatus to 'archived' instead of ImportStatus.
   */
  const handleBulkArchive = useCallback(function () {
    if (selectedDocIds.length === 0) return;
    let archivedCount = 0;
    let failedCount = 0;
    const newArchivedSet = new Set(newArchivedIds);
    for (let i = 0; i < selectedDocIds.length; i++) {
      const success = archiveDocument(selectedDocIds[i]);
      if (success) {
        archivedCount = archivedCount + 1;
        newArchivedSet.add(selectedDocIds[i]);
      } else {
        failedCount = failedCount + 1;
      }
    }
    setNewArchivedIds(newArchivedSet);
    if (archivedCount > 0) {
      toast({
        title: 'Archived',
        description: 'Archived ' + archivedCount + ' item(s)',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      });
    }
    if (failedCount > 0) {
      toast({
        title: 'Archive Failed',
        description: 'Failed to archive ' + failedCount + ' item(s)',
        variant: 'destructive',
      });
    }
    setSelectedDocIds([]);
  }, [selectedDocIds, archiveDocument, toast, newArchivedIds]);

  /**
   * Bulk restore selected documents.
   * Day 29: Moves files from archived/deleted back to active.
   */
  const handleBulkRestore = useCallback(function () {
    if (selectedDocIds.length === 0) return;
    let restoredCount = 0;
    let failedCount = 0;
    const newArchivedSet = new Set(newArchivedIds);
    const newDeletedSet = new Set(newDeletedIds);
    const newActiveSet = new Set(newActiveIds);
    for (let i = 0; i < selectedDocIds.length; i++) {
      const success = restoreDocument(selectedDocIds[i]);
      if (success) {
        restoredCount = restoredCount + 1;
        // Remove from archived/deleted sets if present
        newArchivedSet.delete(selectedDocIds[i]);
        newDeletedSet.delete(selectedDocIds[i]);
        // Add to active set to show notification
        newActiveSet.add(selectedDocIds[i]);
      } else {
        failedCount = failedCount + 1;
      }
    }
    setNewArchivedIds(newArchivedSet);
    setNewDeletedIds(newDeletedSet);
    setNewActiveIds(newActiveSet);
    if (restoredCount > 0) {
      toast({
        title: 'Restored',
        description: 'Restored ' + restoredCount + ' item(s) to active',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      });
    }
    if (failedCount > 0) {
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore ' + failedCount + ' item(s)',
        variant: 'destructive',
      });
    }
    setSelectedDocIds([]);
  }, [selectedDocIds, restoreDocument, toast, newArchivedIds, newDeletedIds, newActiveIds]);

  /**
   * Bulk apply tag to selected documents.
   */
  const handleBulkApplyTag = useCallback(function () {
    if (selectedDocIds.length === 0 || bulkTagInput.trim() === '') return;
    const count = bulkAddTag(selectedDocIds, bulkTagInput.trim());
    setSuccessMessage('Added tag "' + bulkTagInput.trim() + '" to ' + count + ' item(s)');
    setBulkTagInput('');
  }, [selectedDocIds, bulkTagInput, bulkAddTag]);

  /**
   * Opens delete confirmation dialog.
   */
  const handleBulkDeleteClick = useCallback(function () {
    if (selectedDocIds.length === 0) return;
    setDeleteConfirmChecked(false);
    setShowDeleteDialog(true);
  }, [selectedDocIds.length]);

  /**
   * Confirms and executes bulk soft delete after dialog confirmation.
   * Day 29: Moves files to "deleted" view instead of permanently deleting.
   */
  const handleBulkDeleteConfirm = useCallback(function () {
    if (!deleteConfirmChecked || selectedDocIds.length === 0) return;
    setShowDeleteDialog(false);
    let deletedCount = 0;
    let failedCount = 0;
    const newDeletedSet = new Set(newDeletedIds);
    for (let i = 0; i < selectedDocIds.length; i++) {
      const success = softDeleteDocument(selectedDocIds[i]);
      if (success) {
        deletedCount = deletedCount + 1;
        newDeletedSet.add(selectedDocIds[i]);
      } else {
        failedCount = failedCount + 1;
      }
    }
    setNewDeletedIds(newDeletedSet);
    if (deletedCount > 0) {
      toast({
        title: 'Deleted',
        description: 'Moved ' + deletedCount + ' item(s) to deleted view',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      });
    }
    if (failedCount > 0) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete ' + failedCount + ' item(s)',
        variant: 'destructive',
      });
    }
    setSelectedDocIds([]);
    setDeleteConfirmChecked(false);
  }, [deleteConfirmChecked, selectedDocIds, softDeleteDocument, toast, newDeletedIds]);

  /**
   * Directly moves selected files from archived view to deleted view without confirmation dialog.
   */
  const handleBulkDeleteFromArchived = useCallback(function () {
    if (selectedDocIds.length === 0) return;
    let deletedCount = 0;
    let failedCount = 0;
    const newDeletedSet = new Set(newDeletedIds);
    for (let i = 0; i < selectedDocIds.length; i++) {
      const success = softDeleteDocument(selectedDocIds[i]);
      if (success) {
        deletedCount = deletedCount + 1;
        newDeletedSet.add(selectedDocIds[i]);
      } else {
        failedCount = failedCount + 1;
      }
    }
    setNewDeletedIds(newDeletedSet);
    if (deletedCount > 0) {
      toast({
        title: 'Deleted',
        description: 'Moved ' + deletedCount + ' item(s) to deleted view',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      });
    }
    if (failedCount > 0) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete ' + failedCount + ' item(s)',
        variant: 'destructive',
      });
    }
    setSelectedDocIds([]);
  }, [selectedDocIds, softDeleteDocument, toast, newDeletedIds]);

  /**
   * Handles individual archive action with toast and tracking.
   */
  const handleIndividualArchive = useCallback(function (id: string) {
    const success = archiveDocument(id);
    if (success) {
      const newArchivedSet = new Set(newArchivedIds);
      newArchivedSet.add(id);
      setNewArchivedIds(newArchivedSet);
      toast({
        title: 'Archived',
        description: 'File archived successfully',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      });
    } else {
      toast({
        title: 'Archive Failed',
        description: 'Failed to archive file',
        variant: 'destructive',
      });
    }
  }, [archiveDocument, toast, newArchivedIds]);

  /**
   * Handles individual restore action with toast and badge clearing.
   */
  const handleIndividualRestore = useCallback(function (id: string) {
    const success = restoreDocument(id);
    if (success) {
      // Remove from archived/deleted sets if present
      const newArchivedSet = new Set(newArchivedIds);
      newArchivedSet.delete(id);
      const newDeletedSet = new Set(newDeletedIds);
      newDeletedSet.delete(id);
      // Add to active set to show notification
      const newActiveSet = new Set(newActiveIds);
      newActiveSet.add(id);
      setNewArchivedIds(newArchivedSet);
      setNewDeletedIds(newDeletedSet);
      setNewActiveIds(newActiveSet);
      toast({
        title: 'Restored',
        description: 'File restored successfully',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      });
    } else {
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore file',
        variant: 'destructive',
      });
    }
  }, [restoreDocument, toast, newArchivedIds, newDeletedIds, newActiveIds]);

  /**
   * Handles individual soft delete action with toast and tracking.
   */
  const handleIndividualSoftDelete = useCallback(function (id: string) {
    const success = softDeleteDocument(id);
    if (success) {
      const newDeletedSet = new Set(newDeletedIds);
      newDeletedSet.add(id);
      setNewDeletedIds(newDeletedSet);
      toast({
        title: 'Deleted',
        description: 'File deleted successfully',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      });
    } else {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  }, [softDeleteDocument, toast, newDeletedIds]);

  /**
   * Opens individual delete confirmation dialog.
   */
  const handleIndividualDeleteClick = useCallback(function (id: string) {
    setIndividualDeleteDocId(id);
    setIndividualDeleteConfirmChecked(false);
    setShowIndividualDeleteDialog(true);
  }, []);

  /**
   * Confirms and executes individual delete after dialog confirmation.
   */
  const handleIndividualDeleteConfirm = useCallback(async function () {
    if (!individualDeleteConfirmChecked || individualDeleteDocId === null) return;
    const id = individualDeleteDocId;
    setShowIndividualDeleteDialog(false);
    const success = await deleteDocument(id);
    if (success) {
      const newDeletedSet = new Set(newDeletedIds);
      newDeletedSet.add(id);
      setNewDeletedIds(newDeletedSet);
      toast({
        title: 'Deleted',
        description: 'File deleted permanently',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      });
    } else {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
    setIndividualDeleteDocId(null);
    setIndividualDeleteConfirmChecked(false);
  }, [individualDeleteConfirmChecked, individualDeleteDocId, deleteDocument, toast, newDeletedIds]);

  /**
   * Open link modal for a document.
   */
  const handleOpenLinkModal = useCallback(function (id: string) {
    setLinkModalDocId(id);
  }, []);

  /**
   * Close link modal.
   */
  const handleCloseLinkModal = useCallback(function () {
    setLinkModalDocId(null);
  }, []);

  /**
   * Link document to an entity.
   */
  const handleLinkToEntity = useCallback(function (entityType: LinkableEntityType, entityId: string) {
    if (linkModalDocId === null) return;
    const success = linkToEntity(linkModalDocId, entityType, entityId);
    if (success) {
      setSuccessMessage('Linked import to ' + entityType);
    }
  }, [linkModalDocId, linkToEntity]);

  /**
   * Unlink document from an entity.
   */
  const handleUnlinkFromEntity = useCallback(function (entityType: LinkableEntityType, entityId: string) {
    if (linkModalDocId === null) return;
    const success = unlinkFromEntity(linkModalDocId, entityType, entityId);
    if (success) {
      setSuccessMessage('Unlinked import from ' + entityType);
    }
  }, [linkModalDocId, unlinkFromEntity]);

  // =========================================================================
  // DAY 24: ACTION HANDOFF HANDLERS
  // =========================================================================

  /**
   * Day 24 Fix: Open Job Search with seeded query from extracted signals.
   * Builds a query from job IDs, announcement numbers, or URLs.
   * Creates an action record and marks it as applied before navigating.
   */
  const handleOpenJobSearch = useCallback(function (doc: ImportedDocument) {
    // Build search query from extracted signals
    let query = '';
    let sourceSignalId: string | null = null;

    // Check for job IDs or announcement numbers first
    if (doc.extractedSignals !== undefined && doc.extractedSignals !== null) {
      for (let i = 0; i < doc.extractedSignals.length; i++) {
        const sig = doc.extractedSignals[i];
        if (sig.type === 'jobId' || sig.type === 'announcementNumber') {
          query = sig.value;
          sourceSignalId = sig.id;
          break;
        }
      }
    }

    // If no job ID, try to extract keywords from title
    if (query === '') {
      query = doc.title.replace(/\.[^.]+$/, ''); // Remove file extension
    }

    // Day 24 Fix: Step 1 - Create the action record
    const payload: Record<string, string> = { query: query };
    const action = createAction(
      doc.id,
      'open_job_search',
      payload,
      sourceSignalId !== null ? sourceSignalId : undefined
    );

    // Day 24 Fix: Step 2 - Mark action as applied immediately
    if (action !== null) {
      updateActionStatus(doc.id, action.id, 'applied');
    }

    // Day 24 Fix: Step 3 - Navigate using Next.js router (not window.location.href)
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    router.push('/dashboard/job-search?' + searchParams.toString());

    // Day 27: Append audit event for action applied
    appendAuditEvent({
      type: 'import_action_applied',
      summary: 'Applied "Open Job Search" with query: ' + query,
      importItemId: doc.id,
      actionId: action !== null ? action.id : null,
      source: 'user',
      metadata: { actionType: 'open_job_search', query: query },
    });

    setSuccessMessage('Opening Job Search with: ' + query);
  }, [createAction, updateActionStatus, router, appendAuditEvent]);

  /**
   * Day 24 Fix: Start resume tailoring mode.
   * Navigates to Resume Builder with tailoring activated.
   * Creates an action record and marks it as applied before navigating.
   */
  const handleStartTailoring = useCallback(function (doc: ImportedDocument) {
    // Extract job title or use document title
    let jobTitle = doc.title.replace(/\.[^.]+$/, ''); // Remove file extension

    // Check if we have a better title from the content
    if (doc.category === 'JobPosting' && doc.textContent !== null) {
      // Try to extract a job title pattern
      const titleMatch = doc.textContent.match(/(?:position|job|title)[:\s]+([^\n]+)/i);
      if (titleMatch !== null && titleMatch[1] !== undefined) {
        jobTitle = titleMatch[1].trim();
      }
    }

    // Day 24 Fix: Step 1 - Create the action record
    const payload: Record<string, string> = {
      source: 'import',
      hints: jobTitle,
    };
    const action = createAction(doc.id, 'start_resume_tailoring', payload);

    // Day 24 Fix: Step 2 - Mark action as applied immediately
    if (action !== null) {
      updateActionStatus(doc.id, action.id, 'applied');
    }

    // Day 24 Fix: Step 3 - Navigate using Next.js router (not window.location.href)
    const searchParams = new URLSearchParams();
    searchParams.set('tailor', 'true');
    searchParams.set('title', jobTitle);
    router.push('/dashboard/resume-builder?' + searchParams.toString());

    // Day 27: Append audit event for action applied
    appendAuditEvent({
      type: 'import_action_applied',
      summary: 'Applied "Start Resume Tailoring" for: ' + jobTitle,
      importItemId: doc.id,
      actionId: action !== null ? action.id : null,
      source: 'user',
      metadata: { actionType: 'start_resume_tailoring', jobTitle: jobTitle },
    });

    setSuccessMessage('Opening Resume Builder for: ' + jobTitle);
  }, [createAction, updateActionStatus, router, appendAuditEvent]);

  /**
   * Day 24 Fix: Capture deadline from extracted signal.
   * Creates an action record and marks it as applied, then updates the note.
   */
  const handleCaptureDeadline = useCallback(function (doc: ImportedDocument) {
    // Find the first deadline signal
    let deadline = '';
    let sourceSignalId: string | null = null;
    if (doc.extractedSignals !== undefined && doc.extractedSignals !== null) {
      for (let i = 0; i < doc.extractedSignals.length; i++) {
        const sig = doc.extractedSignals[i];
        if (sig.type === 'deadline') {
          deadline = sig.value;
          sourceSignalId = sig.id;
          break;
        }
      }
    }

    if (deadline === '') {
      setErrorMessage('No deadline found in this document.');
      return;
    }

    // Day 24 Fix: Step 1 - Create the action record
    const payload: Record<string, string> = { deadlineISO: deadline };
    const action = createAction(
      doc.id,
      'capture_deadline',
      payload,
      sourceSignalId !== null ? sourceSignalId : undefined
    );

    // Day 24 Fix: Step 2 - Mark action as applied immediately
    if (action !== null) {
      updateActionStatus(doc.id, action.id, 'applied');
    }

    // Day 24 Fix: Step 3 - Update the document note with the deadline
    // In PR2, this would also create a Taskboard reminder
    const currentNote = doc.note;
    const newNote = currentNote !== ''
      ? currentNote + '\n\nDeadline: ' + deadline
      : 'Deadline: ' + deadline;

    updateDocNote(doc.id, newNote);

    // Day 27: Append audit event for deadline tracked
    appendAuditEvent({
      type: 'deadline_tracked',
      summary: 'Tracked deadline: ' + deadline,
      importItemId: doc.id,
      actionId: action !== null ? action.id : null,
      source: 'user',
      metadata: { deadline: deadline },
    });

    setSuccessMessage('Deadline captured: ' + deadline);
  }, [updateDocNote, createAction, updateActionStatus, appendAuditEvent]);

  /**
   * Day 24 Fix: Re-extract signals from a document's content.
   * Useful if extraction logic improves or user wants to refresh detected signals.
   */
  const handleReextractSignals = useCallback(function (docId: string) {
    const success = reextractSignals(docId);
    if (success) {
      setSuccessMessage('Signals re-detected from content.');
    } else {
      setErrorMessage('Could not re-detect signals. Document may not have text content.');
    }
  }, [reextractSignals]);

  // =========================================================================
  // DAY 27: TASK AND AUDIT HANDLERS
  // =========================================================================

  /**
   * Day 27: Create a task from an import item and log audit event.
   */
  const handleCreateTask = useCallback(function (importItemId: string, taskData: CreateTaskData) {
    const task = createTaskFromImport(importItemId, taskData);

    // Append audit event
    appendAuditEvent({
      type: 'task_created',
      summary: 'Created task "' + task.title + '"',
      importItemId: importItemId,
      taskId: task.id,
      source: 'user',
      metadata: {
        taskTitle: task.title,
        priority: task.priority,
      },
    });

    setSuccessMessage('Task created: ' + task.title);
  }, [createTaskFromImport, appendAuditEvent]);

  /**
   * Day 27: Complete a task and log audit event.
   */
  const handleCompleteTask = useCallback(function (taskId: string) {
    // Get task info before completing for audit
    const tasksBefore = tasks;
    let taskTitle = 'Task';
    let importItemId: string | null = null;
    for (let i = 0; i < tasksBefore.length; i++) {
      if (tasksBefore[i].id === taskId) {
        taskTitle = tasksBefore[i].title;
        importItemId = tasksBefore[i].importItemId;
        break;
      }
    }

    const success = completeTask(taskId);
    if (success) {
      // Append audit event
      appendAuditEvent({
        type: 'task_completed',
        summary: 'Completed task "' + taskTitle + '"',
        importItemId: importItemId,
        taskId: taskId,
        source: 'user',
      });
      setSuccessMessage('Task completed: ' + taskTitle);
    }
  }, [tasks, completeTask, appendAuditEvent]);

  /**
   * Day 27: Delete a task and log audit event.
   */
  const handleDeleteTask = useCallback(function (taskId: string) {
    // Get task info before deleting for audit
    const tasksBefore = tasks;
    let taskTitle = 'Task';
    let importItemId: string | null = null;
    for (let i = 0; i < tasksBefore.length; i++) {
      if (tasksBefore[i].id === taskId) {
        taskTitle = tasksBefore[i].title;
        importItemId = tasksBefore[i].importItemId;
        break;
      }
    }

    const success = deleteTask(taskId);
    if (success) {
      // Append audit event
      appendAuditEvent({
        type: 'task_deleted',
        summary: 'Deleted task "' + taskTitle + '"',
        importItemId: importItemId,
        taskId: taskId,
        source: 'user',
      });
    }
  }, [tasks, deleteTask, appendAuditEvent]);

  /**
   * Day 27: Update task reminder and log audit event.
   */
  const handleUpdateTaskReminder = useCallback(function (taskId: string, reminder: Partial<TaskReminder>) {
    // Get task info for audit
    const tasksBefore = tasks;
    let taskTitle = 'Task';
    let importItemId: string | null = null;
    let wasEnabled = false;
    for (let i = 0; i < tasksBefore.length; i++) {
      if (tasksBefore[i].id === taskId) {
        taskTitle = tasksBefore[i].title;
        importItemId = tasksBefore[i].importItemId;
        wasEnabled = tasksBefore[i].reminder.enabled;
        break;
      }
    }

    const success = updateTaskReminder(taskId, reminder);
    if (success) {
      // Determine the audit event type
      let eventType: AuditEventType = 'reminder_changed';
      let summary = 'Changed reminder for "' + taskTitle + '"';

      if (reminder.enabled === true && !wasEnabled) {
        eventType = 'reminder_enabled';
        summary = 'Enabled reminder for "' + taskTitle + '"';
      } else if (reminder.enabled === false && wasEnabled) {
        eventType = 'reminder_disabled';
        summary = 'Disabled reminder for "' + taskTitle + '"';
      }

      // Append audit event
      // Convert null to empty string for metadata (type only accepts string | number | boolean)
      const remindAtValue = reminder.remindAt !== undefined && reminder.remindAt !== null
        ? reminder.remindAt
        : '';
      appendAuditEvent({
        type: eventType,
        summary: summary,
        importItemId: importItemId,
        taskId: taskId,
        source: 'user',
        metadata: reminder.remindAt !== undefined ? { remindAt: remindAtValue } : null,
      });
    }
  }, [tasks, updateTaskReminder, appendAuditEvent]);

  /**
   * Day 27: Snooze a task reminder and log audit event.
   */
  const handleSnoozeReminder = useCallback(function (taskId: string) {
    // Get task info for audit
    const tasksBefore = tasks;
    let taskTitle = 'Task';
    let importItemId: string | null = null;
    for (let i = 0; i < tasksBefore.length; i++) {
      if (tasksBefore[i].id === taskId) {
        taskTitle = tasksBefore[i].title;
        importItemId = tasksBefore[i].importItemId;
        break;
      }
    }

    const success = snoozeTaskReminder(taskId);
    if (success) {
      // Append audit event
      appendAuditEvent({
        type: 'reminder_snoozed',
        summary: 'Snoozed reminder for "' + taskTitle + '" by 1 day',
        importItemId: importItemId,
        taskId: taskId,
        source: 'user',
      });
      setSuccessMessage('Reminder snoozed by 1 day');
    }
  }, [tasks, snoozeTaskReminder, appendAuditEvent]);

  // =========================================================================
  // FILES & TEXT IMPORT HANDLERS
  // =========================================================================

  const handleFilesChange = useCallback(function (e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files !== null && files.length > 0) {
      const filesArray: File[] = [];
      for (let i = 0; i < files.length; i++) {
        filesArray.push(files[i]);
      }
      setSelectedFiles(filesArray);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, []);

  const handleRemoveFile = useCallback(function (index: number) {
    setSelectedFiles(function (prev) {
      const newList: File[] = [];
      for (let i = 0; i < prev.length; i++) {
        if (i !== index) {
          newList.push(prev[i]);
        }
      }
      return newList;
    });
  }, []);

  // =========================================================================
  // DRAG & DROP HANDLERS (Day 22 Run 2 - Fix 1)
  // These handlers implement actual drag/drop support for the file dropzone.
  // Uses the same SUPPORTED_FILE_MIME_TYPES and SUPPORTED_FILE_EXTENSIONS
  // constants from the store to ensure UI and store enforce the same list.
  // =========================================================================

  /**
   * Checks if a file is a supported type by MIME type or extension.
   * Uses the exported constants from documentImportStore for consistency.
   * Returns true if supported, false otherwise.
   */
  const isFileSupported = useCallback(function (file: File): boolean {
    // Check MIME type first (most reliable method)
    for (let i = 0; i < SUPPORTED_FILE_MIME_TYPES.length; i++) {
      if (file.type === SUPPORTED_FILE_MIME_TYPES[i]) {
        return true;
      }
    }
    // Fallback to extension check (some browsers may not provide MIME type)
    const lowerName = file.name.toLowerCase();
    for (let i = 0; i < SUPPORTED_FILE_EXTENSIONS.length; i++) {
      const ext = SUPPORTED_FILE_EXTENSIONS[i];
      // Check if filename ends with this extension
      if (lowerName.length >= ext.length) {
        const ending = lowerName.substring(lowerName.length - ext.length);
        if (ending === ext) {
          return true;
        }
      }
    }
    return false;
  }, []);

  /**
   * Handles dragover event on the dropzone.
   * Must call preventDefault to allow drop.
   */
  const handleDragOver = useCallback(function (e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Handles dragenter event - shows visual feedback.
   */
  const handleDragEnter = useCallback(function (e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  /**
   * Handles dragleave event - hides visual feedback.
   * Only hides when leaving the dropzone entirely (not child elements).
   */
  const handleDragLeave = useCallback(function (e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're leaving the dropzone entirely
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget;
    if (relatedTarget === null || !currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  /**
   * Handles drop event - processes dropped files.
   * Filters to supported types and shows error for unsupported files.
   */
  const handleDrop = useCallback(function (e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setErrorMessage('');
    setSuccessMessage('');

    const dataTransfer = e.dataTransfer;
    if (dataTransfer === null || dataTransfer === undefined) {
      return;
    }

    const droppedFiles = dataTransfer.files;
    if (droppedFiles === null || droppedFiles.length === 0) {
      return;
    }

    // Separate supported and unsupported files
    const supported: File[] = [];
    const unsupported: string[] = [];

    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i];
      if (isFileSupported(file)) {
        supported.push(file);
      } else {
        unsupported.push(file.name);
      }
    }

    // Set supported files
    if (supported.length > 0) {
      setSelectedFiles(supported);
    }

    // Show error for unsupported files
    if (unsupported.length > 0) {
      const unsupportedList = unsupported.join(', ');
      setErrorMessage(
        'Unsupported file type(s): ' + unsupportedList +
        '. Supported types: PDF, DOCX, TXT.'
      );
    }
  }, [isFileSupported]);

  const handleImportFiles = useCallback(async function () {
    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessing(true);

    try {
      if (selectedFiles.length === 0) {
        setErrorMessage('Please select files to import.');
        setIsProcessing(false);
        return;
      }

      let imported = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        await importFile(selectedFiles[i]);
        imported = imported + 1;
      }

      setSuccessMessage('Imported ' + imported + ' file(s) successfully.');
      setSelectedFiles([]);
      const input = fileInputRef.current;
      if (input !== null) {
        input.value = '';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import files';
      setErrorMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles, importFile]);

  const handleImportPastedText = useCallback(function () {
    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessing(true);

    try {
      if (pasteText.trim() === '') {
        setErrorMessage('Please paste text to import.');
        setIsProcessing(false);
        return;
      }

      const title = pasteTitle.trim() !== '' ? pasteTitle.trim() : null;
      const result = importText(pasteText, title);
      setSuccessMessage('Text imported: ' + result.title);
      setPasteText('');
      setPasteTitle('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import text';
      setErrorMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [pasteText, pasteTitle, importText]);

  // =========================================================================
  // EMAIL IMPORT HANDLERS
  // =========================================================================

  const handleEmailPasteChange = useCallback(function (e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEmailPasteText(e.target.value);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const handleImportEmailPasted = useCallback(function () {
    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessing(true);

    try {
      if (emailPasteText.trim() === '') {
        setErrorMessage('Please paste email content to import.');
        setIsProcessing(false);
        return;
      }

      const result = ingestEmailFromText(emailPasteText);
      setSuccessMessage('Email imported: ' + (result.subject !== '' ? result.subject : '(No Subject)'));
      setEmailPasteText('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import email';
      setErrorMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [emailPasteText, ingestEmailFromText]);

  const handleEmlFileChange = useCallback(function (e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files !== null && files.length > 0) {
      setSelectedEmlFile(files[0]);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, []);

  const handleImportEml = useCallback(async function () {
    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessing(true);

    try {
      if (selectedEmlFile === null) {
        setErrorMessage('Please select a .eml file to import.');
        setIsProcessing(false);
        return;
      }

      const result = await ingestEmlFile(selectedEmlFile);
      setSuccessMessage('Email imported: ' + (result.subject !== '' ? result.subject : '(No Subject)'));
      setSelectedEmlFile(null);
      const input = emailFileInputRef.current;
      if (input !== null) {
        input.value = '';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import email file';
      setErrorMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedEmlFile, ingestEmlFile]);

  // =========================================================================
  // VIEW HANDLERS
  // =========================================================================

  const handleViewDocument = useCallback(async function (id: string) {
    const doc = getDocument(id);
    if (doc === null) {
      setErrorMessage('Document not found.');
      return;
    }

    setViewingDocId(id);

    // For pasted text, just show content
    if (doc.type === 'text' && doc.textContent !== null) {
      setViewingContent(doc.textContent);
      setViewingBlobUrl(null);
      return;
    }

    // For files with blob storage
    if (doc.hasBlobStorage) {
      const url = await createDocumentBlobUrl(id);
      if (url !== null) {
        setViewingBlobUrl(url);
        setViewingContent(null);

        // For PDF, open in new tab
        if (doc.type === 'pdf') {
          window.open(url, '_blank');
        }
        // For TXT stored as blob, fetch and show content
        if (doc.type === 'txt') {
          try {
            const response = await fetch(url);
            const text = await response.text();
            setViewingContent(text);
          } catch (error) {
            console.error('Failed to fetch text content:', error);
          }
        }
        // For DOCX, offer download
        if (doc.type === 'docx') {
          // Create download link
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.title;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setSuccessMessage('Downloaded: ' + doc.title);
        }
      } else {
        setErrorMessage('Could not load document. File may be missing from storage.');
      }
    }
  }, [getDocument]);

  const handleCloseViewer = useCallback(function () {
    if (viewingBlobUrl !== null) {
      URL.revokeObjectURL(viewingBlobUrl);
    }
    setViewingDocId(null);
    setViewingBlobUrl(null);
    setViewingContent(null);
  }, [viewingBlobUrl]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Import Center</h1>
      </div>

      {/* OPSEC Warning + Privacy Clarification (Day 23) */}
      <Card className="border-amber-500/30 bg-amber-900/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">
                Import emails you already have. Save job notices and attachments here so PathOS can use them in your workflow.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PathOS does not access your mailbox — you&apos;re importing files and text you already have.
                For email digests and job alerts, go to <a href="/alerts" className="text-amber-500 hover:underline">Job Alerts</a>.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>OPSEC:</strong> Don&apos;t import classified or CUI content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {errorMessage !== '' && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {successMessage !== '' && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm p-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Tabs for Import Types */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">
            <FileText className="w-4 h-4 mr-2" />
            Files & Text
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email Import
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* FILES & TEXT TAB */}
        {/* ================================================================ */}
        <TabsContent value="files" className="space-y-6 mt-6">
          {/* File Upload Section */}
          <Card className="border-accent/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-600" />
                Upload Files
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop or click to upload PDF, DOCX, or TXT files.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />

              {/* 
                Dropzone with drag & drop support (Day 22 Run 2 - Fix 1).
                - Uses onDragOver, onDragEnter, onDragLeave, onDrop handlers
                - Applies visual feedback when dragging over
                - Filters dropped files to supported types (PDF/DOCX/TXT)
              */}
              <div
                onClick={function () {
                  const input = fileInputRef.current;
                  if (input !== null) input.click();
                }}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ' +
                  (isDragOver
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-accent/50 hover:bg-accent/5')
                }
              >
                <Upload className={'w-8 h-8 mx-auto mb-2 ' + (isDragOver ? 'text-amber-500' : 'text-accent')} />
                <p className="text-sm font-medium text-foreground">
                  {isDragOver ? 'Drop files to upload' : 'Drop files here or click to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Selected ({selectedFiles.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map(function (file, idx) {
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-lg text-sm">
                          <File className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={function (e) { e.stopPropagation(); handleRemoveFile(idx); }}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={handleImportFiles}
                disabled={isProcessing || selectedFiles.length === 0}
                className="w-full"
              >
                {isProcessing ? 'Importing...' : 'Import Files'}
              </Button>
            </CardContent>
          </Card>

          {/* Paste Text Section */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-amber-600" />
                Paste Text
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Paste any text content (job postings, notes, etc.) and save it to PathOS.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paste-title" className="text-xs font-medium text-muted-foreground">
                  Title (optional)
                </Label>
                <Input
                  id="paste-title"
                  placeholder="Give this text a title..."
                  value={pasteTitle}
                  onChange={function (e) { setPasteTitle(e.target.value); }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="paste-content" className="text-xs font-medium text-muted-foreground">
                  Content
                </Label>
                <Textarea
                  id="paste-content"
                  placeholder="Paste text content here..."
                  value={pasteText}
                  onChange={function (e) { setPasteText(e.target.value); }}
                  rows={6}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleImportPastedText}
                disabled={isProcessing || pasteText.trim() === ''}
                className="w-full"
              >
                {isProcessing ? 'Importing...' : 'Import Text'}
              </Button>
            </CardContent>
          </Card>

          {/* Imported Documents List (Day 23: with search, filters, bulk actions) */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  Imported Documents
                </CardTitle>
                <Badge variant="secondary">
                  {filteredDocuments.length} / {retentionView === 'active' ? retentionCounts.active : retentionView === 'archived' ? retentionCounts.archived : retentionCounts.deleted}
                </Badge>
              </div>

              {/* Day 29: Retention view selector */}
              <div className="flex items-center gap-2 mt-4">
                <Tabs
                  value={retentionView}
                  onValueChange={function (val) {
                    const newView = val as 'active' | 'archived' | 'deleted';
                    setRetentionView(newView);
                    // Clear badge when tab is clicked (user has seen the new files)
                    if (newView === 'active') {
                      setNewActiveIds(new Set());
                    } else if (newView === 'archived') {
                      setNewArchivedIds(new Set());
                    } else if (newView === 'deleted') {
                      setNewDeletedIds(new Set());
                    }
                  }}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="active" className="relative">
                      <span className="flex items-center">
                        Active
                        {activeBadgeCount > 0 && (
                          <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-green-500 text-white border-0 text-xs">
                            {activeBadgeCount}
                          </Badge>
                        )}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="relative">
                      <span className="flex items-center">
                        Archived
                        {archivedBadgeCount > 0 && (
                          <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-green-500 text-white border-0 text-xs">
                            {archivedBadgeCount}
                          </Badge>
                        )}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="deleted" className="relative">
                      <span className="flex items-center">
                        Deleted
                        {deletedBadgeCount > 0 && (
                          <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-red-500 text-white border-0 text-xs">
                            {deletedBadgeCount}
                          </Badge>
                        )}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Day 23: Search and Filters */}
              <div className="flex flex-col md:flex-row gap-3 mt-4">
                {/* Search box */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, tags, notes, or content..."
                    value={searchQuery}
                    onChange={function (e) { setSearchQuery(e.target.value); }}
                    className="pl-9"
                  />
                </div>

                {/* Status filter */}
                <Select
                  value={filterStatus}
                  onValueChange={function (val) { setFilterStatus(val as ImportStatus | 'all'); }}
                >
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {ALL_IMPORT_STATUSES.map(function (status) {
                      return (
                        <SelectItem key={status} value={status}>{IMPORT_STATUS_LABELS[status]}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Type filter */}
                <Select
                  value={filterType}
                  onValueChange={function (val) { setFilterType(val as DocumentType | 'all'); }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="txt">TXT</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Day 23: Bulk Actions Bar */}
              {selectedDocIds.length > 0 && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-secondary/30 rounded-lg flex-wrap">
                  <span className="text-sm font-medium">{selectedDocIds.length} selected</span>
                  <Button type="button" size="sm" variant="ghost" onClick={handleClearSelection}>
                    Clear
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <div className="h-4 w-px bg-border mx-1" />
                  {/* Day 29: Show restore button in archived/deleted views */}
                  {(retentionView === 'archived' || retentionView === 'deleted') && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleBulkRestore}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                      {/* Show delete button in archived view to move files to deleted view */}
                      {retentionView === 'archived' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={handleBulkDeleteFromArchived}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                  {/* Day 29: Show archive/delete buttons in active view */}
                  {retentionView === 'active' && (
                    <>
                      <Button type="button" size="sm" onClick={handleBulkMarkReviewed}>
                        Mark Reviewed
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={handleBulkArchive}>
                        Archive
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleBulkDeleteClick}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </>
                  )}
                  <div className="flex items-center gap-1">
                    <Input
                      value={bulkTagInput}
                      onChange={function (e) { setBulkTagInput(e.target.value); }}
                      placeholder="Tag..."
                      className="h-8 w-24 text-xs"
                      onKeyDown={function (e) {
                        if (e.key === 'Enter') handleBulkApplyTag();
                      }}
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={handleBulkApplyTag} disabled={bulkTagInput.trim() === ''}>
                      <Tag className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!docIsLoaded ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <File className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  {documents.length === 0 ? (
                    <>
                      <p>No documents imported yet.</p>
                      <p className="text-sm mt-1">Upload files or paste text above.</p>
                    </>
                  ) : (
                    <>
                      <p>No documents match your search/filters.</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map(function (doc) {
                    let isSelected = false;
                    for (let i = 0; i < selectedDocIds.length; i++) {
                      if (selectedDocIds[i] === doc.id) {
                        isSelected = true;
                        break;
                      }
                    }
                    // Day 27: Get tasks and audit events for this document
                    const docTasks = getTasksForImport(doc.id);
                    const docAuditEvents = getAuditEvents({ importItemId: doc.id, limit: 20 });

                    return (
                      <DocumentItem
                        key={doc.id}
                        doc={doc}
                        onToggleHidden={toggleDocHidden}
                        onUpdateTitle={updateDocTitle}
                        onUpdateCategory={updateDocCategory}
                        onUpdateSensitivity={updateDocSensitivity}
                        onAddTag={addDocTag}
                        onRemoveTag={removeDocTag}
                        onResetFields={resetDocFields}
                        onView={handleViewDocument}
                        onUpdateStatus={updateDocStatus}
                        onUpdateNote={updateDocNote}
                        onOpenLinkModal={handleOpenLinkModal}
                        isSelected={isSelected}
                        onToggleSelect={handleToggleSelect}
                        onOpenJobSearch={handleOpenJobSearch}
                        onStartTailoring={handleStartTailoring}
                        onCaptureDeadline={handleCaptureDeadline}
                        onReextractSignals={handleReextractSignals}
                        tasksForImport={docTasks}
                        auditEventsForImport={docAuditEvents}
                        onCreateTask={handleCreateTask}
                        onCompleteTask={handleCompleteTask}
                        onDeleteTask={handleDeleteTask}
                        onUpdateTaskReminder={handleUpdateTaskReminder}
                        onSnoozeReminder={handleSnoozeReminder}
                        onArchive={handleIndividualArchive}
                        onRestore={handleIndividualRestore}
                        onSoftDelete={handleIndividualSoftDelete}
                        onDelete={handleIndividualDeleteClick}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* EMAIL IMPORT TAB */}
        {/* ================================================================ */}
        <TabsContent value="email" className="space-y-6 mt-6">
          {/* Paste Email Section */}
          <Card className="border-accent/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-amber-600" />
                Paste an email (recommended)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Copy the email content (subject/from/date/body) and paste it below.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={'Paste email headers and body here...\n\nFrom: sender@example.com\nTo: recipient@example.com\nSubject: Your Pay Statement\nDate: Mon, 15 Dec 2025 10:00:00 -0500\n\nBody text here...'}
                value={emailPasteText}
                onChange={handleEmailPasteChange}
                rows={8}
                className="font-mono text-xs"
              />
              <Button
                onClick={handleImportEmailPasted}
                disabled={isProcessing || emailPasteText.trim() === ''}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Import Email Content'}
              </Button>
            </CardContent>
          </Card>

          {/* Upload .eml Section */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileType className="w-5 h-5 text-amber-600" />
                Upload a saved email file (.eml)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                If you have saved an email as a .eml file, upload it here.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={emailFileInputRef}
                type="file"
                accept=".eml,.txt,message/rfc822"
                onChange={handleEmlFileChange}
                className="hidden"
              />

              <div
                onClick={function () {
                  const input = emailFileInputRef.current;
                  if (input !== null) input.click();
                }}
                className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:bg-accent/5 transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                {selectedEmlFile !== null ? (
                  <p className="text-sm font-medium text-foreground">{selectedEmlFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Drop .eml file here or click to upload</p>
                )}
              </div>

              <Button
                onClick={handleImportEml}
                disabled={isProcessing || selectedEmlFile === null}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Import Saved Email'}
              </Button>
            </CardContent>
          </Card>

          {/* Imported Emails List */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-amber-600" />
                  Imported Emails
                </CardTitle>
                <Badge variant="secondary">{emails.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!emailIsLoaded ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : emails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No emails imported yet.</p>
                  <p className="text-sm mt-1">Paste email content or upload a .eml file above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emails.map(function (email) {
                    return (
                      <EmailItemSimple
                        key={email.id}
                        email={email}
                        onDelete={function (id) { deleteEmail(id); }}
                        onToggleHidden={toggleEmailHidden}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Text Content Viewer Modal */}
      {viewingDocId !== null && viewingContent !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Document Viewer</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={handleCloseViewer}>
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[60vh]">
              <pre className="text-sm bg-secondary/20 p-4 rounded whitespace-pre-wrap font-mono">
                {viewingContent}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Day 23: Link to Workflow Modal */}
      {linkModalDocId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-500" />
                Link to Workflow
              </CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={handleCloseLinkModal}>
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[60vh] space-y-4">
              {/* Current links */}
              {(function () {
                const doc = getDocument(linkModalDocId);
                if (doc === null) return null;
                if (doc.linkedEntities.length > 0) {
                  return (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Currently Linked</Label>
                      <div className="space-y-1">
                        {doc.linkedEntities.map(function (link, idx) {
                          return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                              <span className="text-sm">
                                {link.entityType === 'savedJob' && <Briefcase className="w-4 h-4 inline mr-1" />}
                                {link.entityType === 'targetRole' && <Target className="w-4 h-4 inline mr-1" />}
                                {link.entityType === 'jobAlert' && <Bell className="w-4 h-4 inline mr-1" />}
                                {link.entityType === 'savedJob' && 'Saved Job'}
                                {link.entityType === 'targetRole' && 'Target Role'}
                                {link.entityType === 'jobAlert' && 'Job Alert'}
                                : {link.entityId.substring(0, 8)}...
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={function () { handleUnlinkFromEntity(link.entityType, link.entityId); }}
                                className="text-red-400 hover:text-red-300"
                              >
                                Unlink
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Link to Saved Job */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  Link to Saved Job
                </Label>
                {savedJobs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No saved jobs available</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {savedJobs.map(function (job) {
                      const doc = getDocument(linkModalDocId);
                      let isLinked = false;
                      if (doc !== null) {
                        for (let i = 0; i < doc.linkedEntities.length; i++) {
                          if (doc.linkedEntities[i].entityType === 'savedJob' && doc.linkedEntities[i].entityId === job.id) {
                            isLinked = true;
                            break;
                          }
                        }
                      }
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={function () { handleLinkToEntity('savedJob', job.id); }}
                          disabled={isLinked}
                          className={'w-full text-left p-2 rounded text-sm transition-colors ' + (isLinked ? 'bg-green-500/10 text-green-400' : 'bg-secondary/20 hover:bg-secondary/40')}
                        >
                          {job.title} @ {job.organizationName}
                          {isLinked && <span className="ml-2 text-xs">(linked)</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Link to Target Role */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Link to Target Role
                </Label>
                {targetJobs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No target roles available</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {targetJobs.map(function (target) {
                      const doc = getDocument(linkModalDocId);
                      let isLinked = false;
                      if (doc !== null) {
                        for (let i = 0; i < doc.linkedEntities.length; i++) {
                          if (doc.linkedEntities[i].entityType === 'targetRole' && doc.linkedEntities[i].entityId === target.id) {
                            isLinked = true;
                            break;
                          }
                        }
                      }
                      return (
                        <button
                          key={target.id}
                          type="button"
                          onClick={function () { handleLinkToEntity('targetRole', target.id); }}
                          disabled={isLinked}
                          className={'w-full text-left p-2 rounded text-sm transition-colors ' + (isLinked ? 'bg-green-500/10 text-green-400' : 'bg-secondary/20 hover:bg-secondary/40')}
                        >
                          {target.title} - {target.grade}
                          {isLinked && <span className="ml-2 text-xs">(linked)</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Link to Job Alert */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  Link to Job Alert
                </Label>
                {jobAlerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No job alerts available</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {jobAlerts.map(function (alert) {
                      const doc = getDocument(linkModalDocId);
                      let isLinked = false;
                      if (doc !== null) {
                        for (let i = 0; i < doc.linkedEntities.length; i++) {
                          if (doc.linkedEntities[i].entityType === 'jobAlert' && doc.linkedEntities[i].entityId === alert.id) {
                            isLinked = true;
                            break;
                          }
                        }
                      }
                      return (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={function () { handleLinkToEntity('jobAlert', alert.id); }}
                          disabled={isLinked}
                          className={'w-full text-left p-2 rounded text-sm transition-colors ' + (isLinked ? 'bg-green-500/10 text-green-400' : 'bg-secondary/20 hover:bg-secondary/40')}
                        >
                          {alert.name}
                          {isLinked && <span className="ml-2 text-xs">(linked)</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Import Center</p>
              <p>
                All imported documents are stored locally in your browser. Files are saved in IndexedDB,
                metadata in localStorage. Use &quot;Delete All Local Data&quot; in Settings to clear everything.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day 29: Bulk Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Files</DialogTitle>
            <DialogDescription>
              You are about to move {selectedDocIds.length} file(s) to the deleted view. You can restore them later or permanently delete them from the Deleted tab.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="delete-confirm"
              checked={deleteConfirmChecked}
              onCheckedChange={function (checked) {
                setDeleteConfirmChecked(checked === true);
              }}
            />
            <Label
              htmlFor="delete-confirm"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I understand these files will be moved to the deleted view
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={function () {
                setShowDeleteDialog(false);
                setDeleteConfirmChecked(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              disabled={!deleteConfirmChecked}
            >
              Delete {selectedDocIds.length} file(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day 29: Individual Delete Confirmation Dialog */}
      <Dialog open={showIndividualDeleteDialog} onOpenChange={setShowIndividualDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              You are about to permanently delete this file. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="individual-delete-confirm"
              checked={individualDeleteConfirmChecked}
              onCheckedChange={function (checked) {
                setIndividualDeleteConfirmChecked(checked === true);
              }}
            />
            <Label
              htmlFor="individual-delete-confirm"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I understand this will permanently delete this file
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={function () {
                setShowIndividualDeleteDialog(false);
                setIndividualDeleteConfirmChecked(false);
                setIndividualDeleteDocId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleIndividualDeleteConfirm}
              disabled={!individualDeleteConfirmChecked}
            >
              Delete File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
