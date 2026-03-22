/**
 * ============================================================================
 * IMPORT DEDUPLICATION MODULE (Day 29 - Import Dedupe v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides deterministic deduplication logic for imported items to prevent
 * accidental duplicates in the Email Import Inbox / Import Center.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────────┐
 * │  Import UI      │ --> │   THIS FILE     │ --> │ documentImportStore │
 * │  (New import)   │     │  (Dedupe logic) │     │  (State + Persist) │
 * └─────────────────┘     └─────────────────┘     └────────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. computeImportFingerprint - Generate stable fingerprint for an import item
 * 2. isProbableDuplicate - Check if two items are likely duplicates
 * 3. dedupeIncomingImport - Check incoming item against existing items and return decision
 *
 * DEDUPE HEURISTICS (v1, deterministic):
 * - Prefer stable fields: messageId, subject + normalized date, sender + subject
 * - Attachment dedupe: filename + size + lastModified (or content hash if available)
 * - Always include reasons in output, no hidden logic
 *
 * HOUSE RULES COMPLIANCE (Day 29):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 29 - Import Dedupe v1
 * ============================================================================
 */

import type { ImportedDocument } from '@/store/documentImportStore';
import type { ExtractedSignal } from '@/lib/documents';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Status of duplicate detection for an import item.
 *
 * DESIGN RATIONALE:
 * - none: No duplicate detected
 * - possible_duplicate: Likely duplicate, user can override
 * - confirmed_duplicate: Strong match, should be flagged
 * - overridden: User chose to keep despite duplicate flag
 */
export type DuplicateStatus = 'none' | 'possible_duplicate' | 'confirmed_duplicate' | 'overridden';

/**
 * Result of deduplication check for an incoming import.
 *
 * DESIGN RATIONALE:
 * Always includes reasons array so users understand why something was flagged.
 * No hidden logic - all decision factors are visible.
 */
export interface DedupeResult {
  /**
   * Decision: whether this is a duplicate and what action to take.
   */
  decision: 'keep' | 'duplicate';

  /**
   * ID of the existing item this duplicates (if decision is 'duplicate').
   */
  duplicateOfId: string | null;

  /**
   * Array of reasons why this was flagged as duplicate.
   * Examples: "Same messageId", "Same subject and date", "Same attachment filename and size"
   */
  reasons: string[];
}

// ============================================================================
// FINGERPRINT COMPUTATION
// ============================================================================

/**
 * Computes a stable fingerprint for an import item.
 *
 * HOW IT WORKS:
 * 1. For attachments: filename + size (most stable for files)
 * 2. Fall back to deadline + normalized date if available
 * 3. Fall back to date + title if available
 * 4. Fall back to title + size + created date
 *
 * DESIGN RATIONALE:
 * Fingerprints should be stable across imports of the same content.
 * We use deterministic hashing-like strings (not actual crypto hashes for v1).
 *
 * @param item - Import item to fingerprint
 * @returns Stable fingerprint string
 */
export function computeImportFingerprint(item: ImportedDocument): string {
  // For attachments: use filename + size (most stable for files)
  if (item.type !== 'text' && item.sizeBytes > 0) {
    return `attachment:${normalizeString(item.title)}|${item.sizeBytes}`;
  }

  // Extract deadline and date from extracted signals
  const deadlineSignals = findSignalsByType(item.extractedSignals, 'deadline');
  const dateSignals = findSignalsByType(item.extractedSignals, 'date');

  if (deadlineSignals.length > 0) {
    const firstDeadline = deadlineSignals[0];
    if (firstDeadline.value !== null) {
      // Try to parse date from deadline value
      const normalizedDate = parseAndNormalizeDate(firstDeadline.value);
      if (normalizedDate !== '') {
        return `deadline+date:${normalizeString(firstDeadline.value)}|${normalizedDate}`;
      }
      return `deadline:${normalizeString(firstDeadline.value)}`;
    }
  }

  // Use date + title if available
  if (dateSignals.length > 0 && item.title !== '') {
    const firstDate = dateSignals[0];
    if (firstDate.value !== null) {
      const normalizedDate = parseAndNormalizeDate(firstDate.value);
      if (normalizedDate !== '') {
        return `date+title:${normalizedDate}|${normalizeString(item.title)}`;
      }
    }
  }

  // Fallback: use title + size + created date (less stable but better than nothing)
  const createdDate = normalizeDate(item.createdAt);
  return `fallback:${normalizeString(item.title)}|${item.sizeBytes}|${createdDate}`;
}

/**
 * Normalizes a string for fingerprint comparison.
 *
 * HOW IT WORKS:
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes extra spaces
 *
 * @param str - String to normalize
 * @returns Normalized string
 */
function normalizeString(str: string): string {
  let normalized = str.toLowerCase();
  normalized = normalized.trim();
  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

/**
 * Normalizes an ISO date string to YYYY-MM-DD format.
 *
 * @param isoDate - ISO 8601 date string
 * @returns Normalized date string (YYYY-MM-DD)
 */
function normalizeDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    // If parsing fails, return empty string
    return '';
  }
}

/**
 * Parses a date string (various formats) and normalizes to YYYY-MM-DD.
 *
 * HOW IT WORKS:
 * Tries to parse common date formats and normalize to YYYY-MM-DD.
 * Returns empty string if parsing fails.
 *
 * @param dateStr - Date string in various formats
 * @returns Normalized date string (YYYY-MM-DD) or empty string
 */
function parseAndNormalizeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Finds all signals of a given type in the extracted signals array.
 *
 * @param signals - Array of extracted signals
 * @param type - Signal type to find
 * @returns Array of matching signals
 */
function findSignalsByType(signals: ExtractedSignal[], type: string): ExtractedSignal[] {
  const result: ExtractedSignal[] = [];
  for (let i = 0; i < signals.length; i++) {
    if (signals[i].type === type) {
      result.push(signals[i]);
    }
  }
  return result;
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Checks if two import items are probable duplicates.
 *
 * HOW IT WORKS:
 * 1. Compare fingerprints (fast path)
 * 2. If fingerprints match, they are duplicates
 * 3. If fingerprints differ but share key fields, check heuristic match
 *
 * DESIGN RATIONALE:
 * We use fingerprints for fast comparison, but also check heuristics
 * for cases where fingerprints might differ slightly (e.g., date normalization).
 *
 * @param a - First import item
 * @param b - Second import item
 * @returns true if items are probable duplicates
 */
export function isProbableDuplicate(a: ImportedDocument, b: ImportedDocument): boolean {
  // Fast path: compare fingerprints
  const fingerprintA = computeImportFingerprint(a);
  const fingerprintB = computeImportFingerprint(b);

  if (fingerprintA === fingerprintB) {
    return true;
  }

  // Heuristic check: same attachment filename + size
  if (a.type !== 'text' && b.type !== 'text') {
    if (
      normalizeString(a.title) === normalizeString(b.title) &&
      a.sizeBytes === b.sizeBytes &&
      a.sizeBytes > 0
    ) {
      return true;
    }
  }

  // Heuristic check: same deadline + same date
  const deadlinesA = findSignalsByType(a.extractedSignals, 'deadline');
  const deadlinesB = findSignalsByType(b.extractedSignals, 'deadline');

  if (deadlinesA.length > 0 && deadlinesB.length > 0) {
    const deadlineA = deadlinesA[0];
    const deadlineB = deadlinesB[0];

    if (
      deadlineA.value !== null &&
      deadlineB.value !== null &&
      normalizeString(deadlineA.value) === normalizeString(deadlineB.value)
    ) {
      // Check if dates match
      const datesA = findSignalsByType(a.extractedSignals, 'date');
      const datesB = findSignalsByType(b.extractedSignals, 'date');

      if (datesA.length > 0 && datesB.length > 0) {
        const dateA = datesA[0];
        const dateB = datesB[0];

        if (dateA.value !== null && dateB.value !== null) {
          const normalizedA = parseAndNormalizeDate(dateA.value);
          const normalizedB = parseAndNormalizeDate(dateB.value);

          if (normalizedA !== '' && normalizedB !== '' && normalizedA === normalizedB) {
            return true;
          }
        }
      }
    }
  }

  // Heuristic check: same title + same date
  if (
    normalizeString(a.title) === normalizeString(b.title) &&
    normalizeString(a.title) !== ''
  ) {
    const datesA = findSignalsByType(a.extractedSignals, 'date');
    const datesB = findSignalsByType(b.extractedSignals, 'date');

    if (datesA.length > 0 && datesB.length > 0) {
      const dateA = datesA[0];
      const dateB = datesB[0];

      if (dateA.value !== null && dateB.value !== null) {
        const normalizedA = parseAndNormalizeDate(dateA.value);
        const normalizedB = parseAndNormalizeDate(dateB.value);

        if (normalizedA !== '' && normalizedB !== '' && normalizedA === normalizedB) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks an incoming import against existing items and returns deduplication decision.
 *
 * HOW IT WORKS:
 * 1. Iterate through existing items
 * 2. Check if incoming item is duplicate of any existing item
 * 3. Collect all reasons for duplicate detection
 * 4. Return decision with reasons
 *
 * DESIGN RATIONALE:
 * Always includes reasons array so users understand why something was flagged.
 * No hidden logic - all decision factors are visible.
 *
 * @param existingItems - Array of existing import items
 * @param incomingItem - New import item to check
 * @returns DedupeResult with decision and reasons
 */
export function dedupeIncomingImport(
  existingItems: ImportedDocument[],
  incomingItem: ImportedDocument
): DedupeResult {
  const reasons: string[] = [];
  let duplicateOfId: string | null = null;

  // Check against each existing item
  for (let i = 0; i < existingItems.length; i++) {
    const existing = existingItems[i];

    // Skip if existing item is itself a duplicate (we want to point to original)
    if (existing.duplicateOfId !== null && existing.duplicateOfId !== undefined) {
      continue;
    }

    if (isProbableDuplicate(incomingItem, existing)) {
      duplicateOfId = existing.id;

      // Collect reasons
      const fingerprintIncoming = computeImportFingerprint(incomingItem);
      const fingerprintExisting = computeImportFingerprint(existing);

      if (fingerprintIncoming === fingerprintExisting) {
        reasons.push('Same fingerprint');
      }

      // Check attachment match
      if (incomingItem.type !== 'text' && existing.type !== 'text') {
        if (
          normalizeString(incomingItem.title) === normalizeString(existing.title) &&
          incomingItem.sizeBytes === existing.sizeBytes &&
          incomingItem.sizeBytes > 0
        ) {
          reasons.push('Same filename and size');
        }
      }

      // Check deadline + date match
      const deadlinesIncoming = findSignalsByType(incomingItem.extractedSignals, 'deadline');
      const deadlinesExisting = findSignalsByType(existing.extractedSignals, 'deadline');

      if (deadlinesIncoming.length > 0 && deadlinesExisting.length > 0) {
        const deadlineIncoming = deadlinesIncoming[0];
        const deadlineExisting = deadlinesExisting[0];

        if (
          deadlineIncoming.value !== null &&
          deadlineExisting.value !== null &&
          normalizeString(deadlineIncoming.value) === normalizeString(deadlineExisting.value)
        ) {
          reasons.push('Same deadline');

          const datesIncoming = findSignalsByType(incomingItem.extractedSignals, 'date');
          const datesExisting = findSignalsByType(existing.extractedSignals, 'date');

          if (datesIncoming.length > 0 && datesExisting.length > 0) {
            const dateIncoming = datesIncoming[0];
            const dateExisting = datesExisting[0];

            if (dateIncoming.value !== null && dateExisting.value !== null) {
              const normalizedIncoming = parseAndNormalizeDate(dateIncoming.value);
              const normalizedExisting = parseAndNormalizeDate(dateExisting.value);

              if (normalizedIncoming !== '' && normalizedExisting !== '' && normalizedIncoming === normalizedExisting) {
                reasons.push('Same date');
              }
            }
          }
        }
      }

      // Check title + date match
      if (
        normalizeString(incomingItem.title) === normalizeString(existing.title) &&
        normalizeString(incomingItem.title) !== ''
      ) {
        reasons.push('Same title');

        const datesIncoming = findSignalsByType(incomingItem.extractedSignals, 'date');
        const datesExisting = findSignalsByType(existing.extractedSignals, 'date');

        if (datesIncoming.length > 0 && datesExisting.length > 0) {
          const dateIncoming = datesIncoming[0];
          const dateExisting = datesExisting[0];

          if (dateIncoming.value !== null && dateExisting.value !== null) {
            const normalizedIncoming = parseAndNormalizeDate(dateIncoming.value);
            const normalizedExisting = parseAndNormalizeDate(dateExisting.value);

            if (normalizedIncoming !== '' && normalizedExisting !== '' && normalizedIncoming === normalizedExisting) {
              reasons.push('Same date');
            }
          }
        }
      }

      // If we found a duplicate, return early (check first match only)
      break;
    }
  }

  if (duplicateOfId !== null) {
    return {
      decision: 'duplicate',
      duplicateOfId: duplicateOfId,
      reasons: reasons,
    };
  }

  return {
    decision: 'keep',
    duplicateOfId: null,
    reasons: [],
  };
}
