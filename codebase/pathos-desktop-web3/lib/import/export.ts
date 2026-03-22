/**
 * ============================================================================
 * IMPORT EXPORT MODULE (Day 29 - Export v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides export functionality for imported items in a trust-first, auditable way.
 * Exports support JSON format with optional "with sources" mode that includes
 * extracted signals with source snippet pointers and audit events.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────────┐
 * │  Import UI      │ --> │   THIS FILE     │ --> │ Browser Download   │
 * │  (Export button)│     │  (Export logic) │     │  (File save)       │
 * └─────────────────┘     └─────────────────┘     └────────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. exportItemsAsJson - Export selected items as JSON
 * 2. exportItemsWithSources - Export with provenance fields
 * 3. Respect privacy visibility controls (exclude hidden content unless overridden)
 * 4. Generate browser download (local-only, no external calls)
 *
 * HOUSE RULES COMPLIANCE (Day 29):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 29 - Export v1
 * ============================================================================
 */

import type { ImportedDocument } from '@/store/documentImportStore';
import type { ExtractedSignal } from '@/lib/documents';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Options for export operations.
 */
export interface ExportOptions {
  /**
   * Whether to include source snippets and provenance fields.
   */
  withSources: boolean;

  /**
   * Whether to include hidden/private content.
   * Default: false (respects privacy controls)
   */
  includeHidden: boolean;

  /**
   * Optional: include audit events linked to items.
   * Requires access to audit log store.
   */
  includeAuditEvents: boolean;
}

/**
 * Exported item structure (with optional sources).
 */
export interface ExportedItem {
  /**
   * Document ID.
   */
  id: string;

  /**
   * ISO 8601 timestamp when imported.
   */
  createdAt: string;

  /**
   * Display title.
   */
  title: string;

  /**
   * Document type.
   */
  type: string;

  /**
   * File size in bytes.
   */
  sizeBytes: number;

  /**
   * Category.
   */
  category: string;

  /**
   * Sensitivity label.
   */
  sensitivity: string;

  /**
   * Tags array.
   */
  tags: string[];

  /**
   * Triage status.
   */
  status: string;

  /**
   * Note field.
   */
  note: string;

  /**
   * Extracted signals (if withSources is true).
   */
  extractedSignals?: ExportedSignal[];

  /**
   * Linked entities (if withSources is true).
   */
  linkedEntities?: Array<{
    entityType: string;
    entityId: string;
    linkedAt: string;
  }>;

  /**
   * Audit events (if includeAuditEvents is true).
   */
  auditEvents?: Array<{
    id: string;
    timestamp: string;
    type: string;
    summary: string;
  }>;
}

/**
 * Exported signal structure (includes source snippet).
 */
export interface ExportedSignal {
  /**
   * Signal ID.
   */
  id: string;

  /**
   * Signal type.
   */
  type: string;

  /**
   * Extracted value.
   */
  value: string;

  /**
   * Display value.
   */
  displayValue: string;

  /**
   * Confidence level.
   */
  confidence: string;

  /**
   * Source snippet showing context.
   */
  sourceSnippet: string;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Exports selected items as JSON.
 *
 * HOW IT WORKS:
 * 1. Filter items based on includeHidden option
 * 2. Transform items to exported format
 * 3. Include sources if requested
 * 4. Generate JSON string
 * 5. Trigger browser download
 *
 * DESIGN RATIONALE:
 * All exports are local-only (browser file save).
 * No external API calls or cloud storage.
 *
 * @param items - Array of items to export
 * @param options - Export options
 * @returns Promise resolving when download is triggered
 */
export async function exportItemsAsJson(
  items: ImportedDocument[],
  options: ExportOptions
): Promise<void> {
  // Filter items based on privacy controls
  const filteredItems = filterItemsForExport(items, options.includeHidden);

  // Transform to exported format
  const exportedItems: ExportedItem[] = [];
  for (let i = 0; i < filteredItems.length; i++) {
    const item = filteredItems[i];
    const exported: ExportedItem = {
      id: item.id,
      createdAt: item.createdAt,
      title: item.title,
      type: item.type,
      sizeBytes: item.sizeBytes,
      category: item.category,
      sensitivity: item.sensitivity,
      tags: copyArray(item.tags),
      status: item.status,
      note: item.note,
    };

    // Include sources if requested
    if (options.withSources) {
      exported.extractedSignals = exportSignals(item.extractedSignals);
      exported.linkedEntities = exportLinkedEntities(item.linkedEntities);
    }

    // Include audit events if requested (requires audit log store)
    // Note: This would need access to auditLogStore, which we'll handle via callback
    // For v1, we'll leave this as optional and handle it in the UI layer

    exportedItems.push(exported);
  }

  // Generate JSON string
  const jsonString = JSON.stringify(exportedItems, null, 2);

  // Trigger browser download
  downloadJsonFile(jsonString, 'pathos-import-export.json');
}

/**
 * Filters items for export based on privacy controls.
 *
 * @param items - Array of items to filter
 * @param includeHidden - Whether to include hidden items
 * @returns Filtered array
 */
function filterItemsForExport(items: ImportedDocument[], includeHidden: boolean): ImportedDocument[] {
  if (includeHidden) {
    return items;
  }

  const filtered: ImportedDocument[] = [];
  for (let i = 0; i < items.length; i++) {
    if (!items[i].isHidden) {
      filtered.push(items[i]);
    }
  }
  return filtered;
}

/**
 * Exports extracted signals with source snippets.
 *
 * @param signals - Array of extracted signals
 * @returns Array of exported signals
 */
function exportSignals(signals: ExtractedSignal[]): ExportedSignal[] {
  const exported: ExportedSignal[] = [];
  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    exported.push({
      id: sig.id,
      type: sig.type,
      value: sig.value,
      displayValue: sig.displayValue,
      confidence: sig.confidence,
      sourceSnippet: sig.sourceSnippet,
    });
  }
  return exported;
}

/**
 * Exports linked entities.
 *
 * @param linkedEntities - Array of linked entities
 * @returns Array of exported linked entities
 */
function exportLinkedEntities(
  linkedEntities: Array<{ entityType: string; entityId: string; linkedAt: string }>
): Array<{ entityType: string; entityId: string; linkedAt: string }> {
  const exported: Array<{ entityType: string; entityId: string; linkedAt: string }> = [];
  for (let i = 0; i < linkedEntities.length; i++) {
    const link = linkedEntities[i];
    exported.push({
      entityType: link.entityType,
      entityId: link.entityId,
      linkedAt: link.linkedAt,
    });
  }
  return exported;
}

/**
 * Copies an array (shallow copy).
 *
 * @param arr - Array to copy
 * @returns Copied array
 */
function copyArray<T>(arr: T[]): T[] {
  const copy: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    copy.push(arr[i]);
  }
  return copy;
}

/**
 * Triggers a browser download of a JSON file.
 *
 * HOW IT WORKS:
 * Creates a Blob with JSON content, creates a temporary URL,
 * triggers download via anchor element, then revokes the URL.
 *
 * @param jsonString - JSON string to download
 * @param filename - Filename for the download
 */
function downloadJsonFile(jsonString: string, filename: string): void {
  // Create blob
  const blob = new Blob([jsonString], { type: 'application/json' });

  // Create temporary URL
  const url = URL.createObjectURL(blob);

  // Create anchor element
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;

  // Trigger download
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
