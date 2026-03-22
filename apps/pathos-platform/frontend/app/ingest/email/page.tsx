'use client';

/**
 * ============================================================================
 * EMAIL IMPORT INBOX PAGE (Day 21 - Email Import Inbox v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides a UI for users to import email content into PathOS via three paths:
 * 1. Paste an email (recommended) - copy/paste email content directly
 * 2. Upload attachments - upload PDF/DOCX/TXT files
 * 3. Advanced: Import saved email file (.eml) - collapsible option
 *
 * FEATURES:
 * - Paste textarea for email content (recommended default)
 * - Multi-file upload for attachments (PDF/DOCX/TXT)
 * - Collapsible .eml upload for advanced users
 * - Inbox list showing imported emails with source type badges
 * - Per-item visibility toggle (privacy controls)
 * - Delete action per email item
 * - Inline expand to view details
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * Route: /ingest/email
 * Store: emailIngestionStore
 * Persistence: pathos.emailIngestion.v1
 *
 * HOUSE RULES COMPLIANCE (Day 21):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 * - UI copy uses "Import" (never "ingest/ingestion")
 *
 * @version Day 21 - Email Import Inbox v1
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mail,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileText,
  ClipboardPaste,
  X,
  AlertCircle,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEmailIngestionStore, selectEmails, selectIsLoaded } from '@/store/emailIngestionStore';
import type { EmailIngestedItem, EmailSourceType } from '@/store/emailIngestionStore';
import type { EmailClassification } from '@/lib/email';

// ============================================================================
// CLASSIFICATION DISPLAY HELPERS
// ============================================================================

/**
 * Maps classification categories to display colors.
 *
 * DESIGN RATIONALE:
 * Each category gets a distinct color for visual differentiation.
 * Colors match the overall PathOS dark theme aesthetic.
 */
const CLASSIFICATION_COLORS: Record<EmailClassification, string> = {
  PayStub: 'bg-green-500/20 text-green-400 border-green-500/30',
  RelocationOrders: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FEHB: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  JobPosting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

/**
 * Maps classification categories to human-readable labels.
 */
const CLASSIFICATION_LABELS: Record<EmailClassification, string> = {
  PayStub: 'Pay Stub',
  RelocationOrders: 'Relocation Orders',
  FEHB: 'FEHB',
  JobPosting: 'Job Posting',
  Other: 'Other',
};

/**
 * Maps source types to display labels for badges.
 * Day 21: User-friendly labels for import source.
 */
const SOURCE_TYPE_LABELS: Record<EmailSourceType, string> = {
  pasted: 'Pasted Email',
  attachments: 'Attachments',
  eml: 'Saved Email (.eml)',
};

/**
 * Maps source types to badge colors.
 */
const SOURCE_TYPE_COLORS: Record<EmailSourceType, string> = {
  pasted: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  attachments: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  eml: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

// ============================================================================
// EMAIL ITEM COMPONENT
// ============================================================================

interface EmailItemProps {
  email: EmailIngestedItem;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
}

/**
 * Renders a single email item in the inbox list.
 *
 * FEATURES:
 * - Shows subject, from, date
 * - Classification badge
 * - Source type badge (Pasted Email / Attachments / Saved Email)
 * - Attachments list
 * - Expand/collapse to show raw email
 * - Visibility toggle
 * - Delete button
 */
function EmailItem(props: EmailItemProps) {
  const email = props.email;
  const onDelete = props.onDelete;
  const onToggleHidden = props.onToggleHidden;

  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Handle expand/collapse toggle.
   */
  const handleToggleExpand = useCallback(function () {
    setIsExpanded(function (prev) {
      return !prev;
    });
  }, []);

  /**
   * Handle delete click.
   */
  const handleDelete = useCallback(
    function () {
      onDelete(email.id);
    },
    [onDelete, email.id]
  );

  /**
   * Handle visibility toggle click.
   */
  const handleToggleVisibility = useCallback(
    function () {
      onToggleHidden(email.id);
    },
    [onToggleHidden, email.id]
  );

  // Format the email date for display
  const displayDate = email.date !== '' ? email.date : email.createdAt.substring(0, 10);

  // Get classification styling
  const classColor = CLASSIFICATION_COLORS[email.classification];
  const classLabel = CLASSIFICATION_LABELS[email.classification];

  // Get source type styling (Day 21)
  // Handle backwards compatibility for items without sourceType
  const sourceType: EmailSourceType = email.sourceType !== undefined && email.sourceType !== null
    ? email.sourceType
    : 'pasted';
  const sourceLabel = SOURCE_TYPE_LABELS[sourceType];
  const sourceColor = SOURCE_TYPE_COLORS[sourceType];

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
            {/* Subject */}
            <p className="text-sm font-medium text-foreground truncate">
              {email.subject !== '' ? email.subject : '(No Subject)'}
            </p>

            {/* From and Date */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">
                From: {email.from !== '' ? email.from : '(Unknown)'}
              </span>
              <span className="text-xs text-muted-foreground">&bull;</span>
              <span className="text-xs text-muted-foreground">{displayDate}</span>
            </div>

            {/* Attachments */}
            {email.attachments.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Paperclip className="w-3 h-3 text-muted-foreground" />
                {email.attachments.map(function (att, idx) {
                  return (
                    <span
                      key={idx}
                      className="text-xs bg-secondary/30 text-secondary-foreground px-2 py-0.5 rounded"
                    >
                      {att.filename}
                      {att.contentType !== undefined && att.contentType !== null && (
                        <span className="text-muted-foreground"> ({att.contentType})</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
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
          onClick={handleToggleExpand}
          className="text-xs"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              View Details
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToggleVisibility}
          className="text-xs"
        >
          {email.isHidden ? (
            <>
              <Eye className="w-4 h-4 mr-1" />
              Show
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 mr-1" />
              Hide
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 p-4 bg-secondary/10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">To:</span>
              <span>{email.to !== '' ? email.to : '(Unknown)'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Date:</span>
              <span>{email.date !== '' ? email.date : '(Unknown)'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Imported:</span>
              <span>{new Date(email.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Source:</span>
              <span>{sourceLabel}</span>
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Raw Content
            </Label>
            <pre className="text-xs bg-secondary/20 p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap font-mono">
              {email.raw}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

/**
 * Email Import Inbox page component.
 * Day 21: Revised with user-friendly import paths.
 *
 * FEATURES:
 * 1. Paste an email (recommended default) - textarea for email content
 * 2. Upload attachments - multi-file upload for PDF/DOCX/TXT
 * 3. Advanced: Import saved email file (.eml) - collapsible section
 * 4. Inbox list - shows all imported emails with source type badges
 * 5. Per-item actions - view, hide, delete
 */
export default function EmailImportPage() {
  // =========================================================================
  // STATE
  // =========================================================================

  /**
   * Textarea content for pasting email text.
   */
  const [pasteText, setPasteText] = useState('');

  /**
   * File input ref for attachments upload (Section 2).
   */
  const attachmentsInputRef = useRef<HTMLInputElement>(null);

  /**
   * Selected files for attachments upload (Section 2).
   */
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);

  /**
   * File input ref for .eml upload (Section 3 - Advanced).
   */
  const emlFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Currently selected .eml file for upload (Section 3 - Advanced).
   */
  const [selectedEmlFile, setSelectedEmlFile] = useState<File | null>(null);

  /**
   * Whether the advanced .eml section is expanded.
   */
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  /**
   * Loading state while processing.
   */
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Error message for display.
   */
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Success message for display.
   */
  const [successMessage, setSuccessMessage] = useState('');

  // =========================================================================
  // STORE
  // =========================================================================

  const emails = useEmailIngestionStore(selectEmails);
  const isLoaded = useEmailIngestionStore(selectIsLoaded);
  const loadFromStorage = useEmailIngestionStore(function (state) {
    return state.loadFromStorage;
  });
  const ingestFromText = useEmailIngestionStore(function (state) {
    return state.ingestFromText;
  });
  const importFromAttachments = useEmailIngestionStore(function (state) {
    return state.importFromAttachments;
  });
  const ingestFromEmlFile = useEmailIngestionStore(function (state) {
    return state.ingestFromEmlFile;
  });
  const deleteEmail = useEmailIngestionStore(function (state) {
    return state.deleteEmail;
  });
  const toggleHidden = useEmailIngestionStore(function (state) {
    return state.toggleHidden;
  });

  // =========================================================================
  // EFFECTS
  // =========================================================================

  /**
   * Load emails from storage on mount.
   */
  useEffect(function () {
    if (!isLoaded) {
      loadFromStorage();
    }
  }, [isLoaded, loadFromStorage]);

  // =========================================================================
  // HANDLERS - SECTION 1: PASTE EMAIL
  // =========================================================================

  /**
   * Handle paste textarea change.
   */
  const handlePasteChange = useCallback(function (e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPasteText(e.target.value);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  /**
   * Handle import from pasted text.
   */
  const handleImportPasted = useCallback(
    function () {
      setErrorMessage('');
      setSuccessMessage('');
      setIsProcessing(true);

      try {
        if (pasteText.trim() === '') {
          setErrorMessage('Please paste email content to import.');
          setIsProcessing(false);
          return;
        }

        const result = ingestFromText(pasteText);
        setSuccessMessage(
          'Email imported: ' + (result.subject !== '' ? result.subject : '(No Subject)')
        );
        setPasteText('');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to import email';
        setErrorMessage(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [pasteText, ingestFromText]
  );

  // =========================================================================
  // HANDLERS - SECTION 2: UPLOAD ATTACHMENTS
  // =========================================================================

  /**
   * Handle attachments file input change.
   */
  const handleAttachmentsChange = useCallback(function (e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files !== null && files.length > 0) {
      // Convert FileList to array
      const filesArray: File[] = [];
      for (let i = 0; i < files.length; i++) {
        filesArray.push(files[i]);
      }
      setSelectedAttachments(filesArray);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, []);

  /**
   * Handle click on attachments upload area.
   */
  const handleAttachmentsUploadClick = useCallback(function () {
    const input = attachmentsInputRef.current;
    if (input !== null) {
      input.click();
    }
  }, []);

  /**
   * Handle remove attachment from selected list.
   */
  const handleRemoveAttachment = useCallback(function (index: number) {
    setSelectedAttachments(function (prev) {
      const newList: File[] = [];
      for (let i = 0; i < prev.length; i++) {
        if (i !== index) {
          newList.push(prev[i]);
        }
      }
      return newList;
    });
  }, []);

  /**
   * Handle import from attachments.
   */
  const handleImportAttachments = useCallback(
    async function () {
      setErrorMessage('');
      setSuccessMessage('');
      setIsProcessing(true);

      try {
        if (selectedAttachments.length === 0) {
          setErrorMessage('Please select files to import.');
          setIsProcessing(false);
          return;
        }

        const result = await importFromAttachments(selectedAttachments);
        setSuccessMessage(
          'Attachments imported: ' + result.attachments.length + ' file(s)'
        );
        setSelectedAttachments([]);
        // Reset file input
        const input = attachmentsInputRef.current;
        if (input !== null) {
          input.value = '';
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to import attachments';
        setErrorMessage(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedAttachments, importFromAttachments]
  );

  // =========================================================================
  // HANDLERS - SECTION 3: ADVANCED .EML UPLOAD
  // =========================================================================

  /**
   * Handle .eml file input change.
   */
  const handleEmlFileChange = useCallback(function (e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files !== null && files.length > 0) {
      setSelectedEmlFile(files[0]);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, []);

  /**
   * Handle click on .eml upload area.
   */
  const handleEmlUploadClick = useCallback(function () {
    const input = emlFileInputRef.current;
    if (input !== null) {
      input.click();
    }
  }, []);

  /**
   * Handle import from .eml file.
   */
  const handleImportEml = useCallback(
    async function () {
      setErrorMessage('');
      setSuccessMessage('');
      setIsProcessing(true);

      try {
        if (selectedEmlFile === null) {
          setErrorMessage('Please select a .eml file to import.');
          setIsProcessing(false);
          return;
        }

        const result = await ingestFromEmlFile(selectedEmlFile);
        setSuccessMessage(
          'Email imported: ' + (result.subject !== '' ? result.subject : '(No Subject)')
        );
        setSelectedEmlFile(null);
        // Reset file input
        const input = emlFileInputRef.current;
        if (input !== null) {
          input.value = '';
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to import email file';
        setErrorMessage(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedEmlFile, ingestFromEmlFile]
  );

  // =========================================================================
  // HANDLERS - EMAIL LIST
  // =========================================================================

  /**
   * Handle delete action from email item.
   */
  const handleDelete = useCallback(
    function (id: string) {
      deleteEmail(id);
    },
    [deleteEmail]
  );

  /**
   * Handle toggle hidden action from email item.
   */
  const handleToggleHidden = useCallback(
    function (id: string) {
      toggleHidden(id);
    },
    [toggleHidden]
  );

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Email Import Inbox (v1)</h1>
      </div>

      {/* Friendly Callout */}
      <Card className="border-amber-500/30 bg-amber-900/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-foreground text-lg">Import emails you have already received</p>
              <p className="text-muted-foreground mt-1">
                Save job notices and attachments here so PathOS can use them in your workflow.
              </p>
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                For emails from PathOS, go to{' '}
                <Link href="/alerts" className="text-amber-600 hover:underline">
                  Job Alerts
                </Link>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error/Success Messages - Global */}
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

      {/* ================================================================== */}
      {/* SECTION 1: PASTE AN EMAIL (RECOMMENDED) */}
      {/* ================================================================== */}
      <Card className="border-accent/50 bg-card">
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
            id="paste-email"
            placeholder={'Paste email headers and body here...\n\nFrom: sender@example.com\nTo: recipient@example.com\nSubject: Your Pay Statement\nDate: Mon, 15 Dec 2025 10:00:00 -0500\n\nBody text here...'}
            value={pasteText}
            onChange={handlePasteChange}
            rows={8}
            className="font-mono text-xs"
          />

          <Button 
            onClick={handleImportPasted} 
            disabled={isProcessing || pasteText.trim() === ''} 
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Import Email Content'}
          </Button>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 2: UPLOAD ATTACHMENTS */}
      {/* ================================================================== */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-amber-600" />
            Upload attachments
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Upload PDF, DOCX, or TXT files directly. Multiple files allowed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hidden file input */}
          <input
            ref={attachmentsInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            multiple
            onChange={handleAttachmentsChange}
            className="hidden"
          />

          {/* Upload area */}
          <div
            onClick={handleAttachmentsUploadClick}
            className="border-2 border-dashed border-accent/50 rounded-lg p-6 text-center hover:bg-accent/5 transition-colors cursor-pointer"
          >
            <Upload className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">Accepted: .pdf, .docx, .txt</p>
          </div>

          {/* Selected files list with remove buttons */}
          {selectedAttachments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Selected files ({selectedAttachments.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedAttachments.map(function (file, idx) {
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-secondary/30 text-secondary-foreground px-3 py-1.5 rounded-lg text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={function (e) {
                          e.stopPropagation();
                          handleRemoveAttachment(idx);
                        }}
                        className="text-muted-foreground hover:text-red-400 transition-colors"
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
            onClick={handleImportAttachments}
            disabled={isProcessing || selectedAttachments.length === 0}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Import Attachments'}
          </Button>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 3: ADVANCED - IMPORT SAVED EMAIL FILE (.EML) */}
      {/* ================================================================== */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <Card className="border-border/50 bg-card/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Advanced: Import a saved email file (.eml)
                </span>
                {isAdvancedOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <p className="text-xs text-muted-foreground">
                If you have saved an email as a .eml file, you can upload it here.
              </p>

              {/* Hidden file input for .eml */}
              <input
                ref={emlFileInputRef}
                type="file"
                accept=".eml,.txt,text/plain,message/rfc822"
                onChange={handleEmlFileChange}
                className="hidden"
              />

              {/* Upload area */}
              <div
                onClick={handleEmlUploadClick}
                className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:bg-accent/5 transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                {selectedEmlFile !== null ? (
                  <>
                    <p className="text-sm font-medium text-foreground">{selectedEmlFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to change file</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Drop .eml file here or click to upload
                    </p>
                  </>
                )}
              </div>

              <Button
                onClick={handleImportEml}
                disabled={isProcessing || selectedEmlFile === null}
                variant="secondary"
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Import Saved Email'}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ================================================================== */}
      {/* INBOX LIST - IMPORTED EMAILS */}
      {/* ================================================================== */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Imported Emails
            </CardTitle>
            <Badge variant="secondary">{emails.length} email(s)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!isLoaded ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No emails imported yet.</p>
              <p className="text-sm mt-1">Paste an email or upload attachments above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map(function (email) {
                return (
                  <EmailItem
                    key={email.id}
                    email={email}
                    onDelete={handleDelete}
                    onToggleHidden={handleToggleHidden}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Email Import (v1)</p>
              <p>
                This feature provides local-only email parsing and classification. Emails are stored
                in your browser&apos;s localStorage and are not sent to any server. Use &quot;Delete
                All Local Data&quot; in Settings to clear all imported emails.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
