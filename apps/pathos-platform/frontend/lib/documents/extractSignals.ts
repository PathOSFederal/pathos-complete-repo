/**
 * ============================================================================
 * SIGNAL EXTRACTION FROM IMPORTED CONTENT (Day 24 - Import Actions v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Deterministic extraction of actionable signals from imported document content.
 * Uses lightweight regex patterns (no ML) to extract dates, URLs, contacts, IDs.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 * │  Import Center  │ --> │   THIS FILE     │ --> │ ExtractedSignal │
 * │  (raw content)  │     │  (extraction)   │     │  (structured)   │
 * └─────────────────┘     └─────────────────┘     └─────────────────┘
 *
 * EXTRACTED SIGNALS (v1):
 * - Dates (especially "apply by" / deadline patterns)
 * - URLs (http/https links)
 * - Email addresses
 * - Phone numbers (basic US patterns)
 * - Announcement/Requisition/Job IDs (best-effort pattern matching)
 * - Agency/Org names (best-effort, if clearly present)
 *
 * DESIGN DECISIONS:
 * - All extraction is deterministic and testable
 * - Each signal carries type, value, confidence, and source snippet
 * - Empty results are valid (no hallucination of fields)
 * - Confidence is simple: 'high' (clear pattern), 'medium' (partial), 'low' (guess)
 *
 * HOUSE RULES COMPLIANCE (Day 24):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses explicit assignments
 * - Over-commented for teaching-level clarity
 *
 * @version Day 24 - Import Actions & Extraction v1
 * ============================================================================
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Types of signals that can be extracted from imported content.
 *
 * DESIGN RATIONALE:
 * These cover the most actionable pieces of information in job-related emails
 * and documents. Each type maps to potential actions in the UI.
 */
export type SignalType =
  | 'date'
  | 'deadline'
  | 'url'
  | 'email'
  | 'phone'
  | 'jobId'
  | 'announcementNumber'
  | 'agency';

/**
 * Confidence level for an extracted signal.
 *
 * DESIGN RATIONALE:
 * Simple enum is easier to reason about than numeric 0-1 scores.
 * - high: Strong pattern match, likely correct
 * - medium: Partial match, reasonable guess
 * - low: Weak match, user should verify
 */
export type SignalConfidence = 'high' | 'medium' | 'low';

/**
 * Represents a single extracted signal.
 *
 * DESIGN DECISIONS:
 * - `value` is the actual extracted content (e.g., the URL string)
 * - `displayValue` is formatted for display (e.g., shortened URL)
 * - `sourceSnippet` shows context around where the signal was found
 * - `sourceRange` optionally gives character positions (for highlighting)
 */
export interface ExtractedSignal {
  /**
   * Unique identifier for this signal (for React keys, deduplication).
   */
  id: string;

  /**
   * Type of signal (date, url, email, etc.).
   */
  type: SignalType;

  /**
   * The raw extracted value.
   */
  value: string;

  /**
   * Formatted value for display (may be truncated or formatted).
   */
  displayValue: string;

  /**
   * Confidence level of the extraction.
   */
  confidence: SignalConfidence;

  /**
   * Short snippet of source text surrounding the signal (for context).
   */
  sourceSnippet: string;

  /**
   * Optional: character range in the original text [start, end].
   */
  sourceRange: [number, number] | null;

  /**
   * Optional: additional metadata (e.g., for dates: parsed ISO string).
   */
  metadata: Record<string, string> | null;
}

/**
 * Result of extracting signals from content.
 */
export interface ExtractionResult {
  /**
   * Array of all extracted signals, sorted by type and position.
   */
  signals: ExtractedSignal[];

  /**
   * Total count by type for quick stats.
   */
  counts: Record<SignalType, number>;

  /**
   * Whether any signals were found.
   */
  hasSignals: boolean;
}

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

/**
 * Pattern to match URLs (http/https).
 * Captures common URL formats while avoiding trailing punctuation.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+[^\s<>"{}|\\^`\[\].,;:!?'")\]]/gi;

/**
 * Pattern to match email addresses.
 * Standard email format with common TLDs.
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

/**
 * Pattern to match US phone numbers.
 * Covers: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890
 */
const PHONE_PATTERN = /(?:\+1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;

/**
 * Patterns for deadline/apply-by dates.
 * Matches phrases like "apply by December 31", "deadline: 12/31/2025", etc.
 */
const DEADLINE_PATTERNS = [
  /(?:apply\s+by|deadline|closes?|closing\s+date|due\s+by|must\s+be\s+received\s+by)[:\s]+([A-Za-z]+\s+\d{1,2},?\s*\d{2,4})/gi,
  /(?:apply\s+by|deadline|closes?|closing\s+date|due\s+by)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
  /(?:application\s+deadline|position\s+closes?)[:\s]+([A-Za-z]+\s+\d{1,2},?\s*\d{2,4})/gi,
];

/**
 * Pattern for general dates (fallback).
 * Matches: January 15, 2025; 01/15/2025; 2025-01-15
 */
const DATE_PATTERNS = [
  /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{2,4}/gi,
  /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
  /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g,
];

/**
 * Patterns for job/announcement IDs.
 * Covers USAJOBS format (e.g., DE-12345678-25, HHS-OS-2025-0001)
 */
const JOB_ID_PATTERNS = [
  /(?:job\s+id|control\s+number|announcement\s+number?|requisition\s+id?|vacancy\s+id)[:\s#]+([A-Z0-9\-]+)/gi,
  /\b([A-Z]{2,4}[\-]\d{6,10}[\-]\d{2,4})\b/g,  // DE-12345678-25 format
  /\b([A-Z]{2,5}[\-][A-Z]{2,4}[\-]\d{4}[\-]\d{4})\b/g,  // HHS-OS-2025-0001 format
  /\b(USAJobs\s+#?\s*[\d\-]+)/gi,
];

/**
 * Patterns for federal agency names.
 * Best-effort matching for common agencies.
 */
const AGENCY_PATTERNS = [
  /(?:Department\s+of\s+)([\w\s]+?)(?:\s+\(|,|\.|$)/gi,
  /\b(DOD|DOJ|DOE|HHS|DHS|VA|USDA|DOL|DOT|EPA|NASA|FBI|CIA|NSA|USCIS|IRS|SSA|GSA|OPM|FEMA)\b/g,
  /(?:agency|employer)[:\s]+([A-Z][A-Za-z\s]+?)(?:\s+\(|,|\.|$)/gi,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a unique ID for a signal.
 */
function generateSignalId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return 'sig-' + timestamp + '-' + randomPart;
}

/**
 * Gets a snippet of text surrounding a match position.
 *
 * @param text - Full text
 * @param startIndex - Start index of the match
 * @param endIndex - End index of the match
 * @param contextChars - Number of characters to include before/after
 * @returns Snippet string with ellipsis if truncated
 */
function getSourceSnippet(
  text: string,
  startIndex: number,
  endIndex: number,
  contextChars: number
): string {
  const snippetStart = Math.max(0, startIndex - contextChars);
  const snippetEnd = Math.min(text.length, endIndex + contextChars);

  let snippet = '';

  // Add leading ellipsis if truncated
  if (snippetStart > 0) {
    snippet = '...';
  }

  // Get the snippet and normalize whitespace
  const rawSnippet = text.substring(snippetStart, snippetEnd);
  snippet = snippet + rawSnippet.replace(/\s+/g, ' ').trim();

  // Add trailing ellipsis if truncated
  if (snippetEnd < text.length) {
    snippet = snippet + '...';
  }

  return snippet;
}

/**
 * Truncates a string for display, adding ellipsis if needed.
 *
 * @param value - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
function truncateForDisplay(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength - 3) + '...';
}

/**
 * Deduplicates signals by value within a type.
 * Keeps the first occurrence (highest position).
 *
 * @param signals - Array of signals to deduplicate
 * @returns Deduplicated array
 */
function deduplicateSignals(signals: ExtractedSignal[]): ExtractedSignal[] {
  const seen: Record<string, boolean> = {};
  const result: ExtractedSignal[] = [];

  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];
    const key = signal.type + ':' + signal.value.toLowerCase();

    if (seen[key] !== true) {
      seen[key] = true;
      result.push(signal);
    }
  }

  return result;
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extracts URLs from text.
 */
function extractUrls(text: string): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];
  const regex = new RegExp(URL_PATTERN.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + value.length;

    // Skip very short URLs (likely false positives)
    if (value.length < 10) {
      continue;
    }

    signals.push({
      id: generateSignalId(),
      type: 'url',
      value: value,
      displayValue: truncateForDisplay(value, 50),
      confidence: 'high',
      sourceSnippet: getSourceSnippet(text, startIndex, endIndex, 30),
      sourceRange: [startIndex, endIndex],
      metadata: null,
    });
  }

  return signals;
}

/**
 * Extracts email addresses from text.
 */
function extractEmails(text: string): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];
  const regex = new RegExp(EMAIL_PATTERN.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + value.length;

    signals.push({
      id: generateSignalId(),
      type: 'email',
      value: value.toLowerCase(),
      displayValue: value.toLowerCase(),
      confidence: 'high',
      sourceSnippet: getSourceSnippet(text, startIndex, endIndex, 30),
      sourceRange: [startIndex, endIndex],
      metadata: null,
    });
  }

  return signals;
}

/**
 * Extracts phone numbers from text.
 */
function extractPhones(text: string): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];
  const regex = new RegExp(PHONE_PATTERN.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + value.length;

    // Skip if it looks like a date or other number sequence
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 11) {
      continue;
    }

    signals.push({
      id: generateSignalId(),
      type: 'phone',
      value: value,
      displayValue: value,
      confidence: 'medium',
      sourceSnippet: getSourceSnippet(text, startIndex, endIndex, 30),
      sourceRange: [startIndex, endIndex],
      metadata: null,
    });
  }

  return signals;
}

/**
 * Extracts deadline dates from text.
 * These are specifically "apply by" or "deadline" dates.
 */
function extractDeadlines(text: string): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];

  for (let i = 0; i < DEADLINE_PATTERNS.length; i++) {
    const pattern = DEADLINE_PATTERNS[i];
    const regex = new RegExp(pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const dateValue = match[1];
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;

      signals.push({
        id: generateSignalId(),
        type: 'deadline',
        value: dateValue,
        displayValue: dateValue,
        confidence: 'high',
        sourceSnippet: getSourceSnippet(text, startIndex, endIndex, 30),
        sourceRange: [startIndex, endIndex],
        metadata: { context: fullMatch },
      });
    }
  }

  return signals;
}

/**
 * Extracts general dates from text (non-deadline).
 */
function extractDates(text: string, existingDeadlines: ExtractedSignal[]): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];

  // Build a set of deadline values to avoid duplicating
  const deadlineValues: Record<string, boolean> = {};
  for (let i = 0; i < existingDeadlines.length; i++) {
    deadlineValues[existingDeadlines[i].value.toLowerCase()] = true;
  }

  for (let i = 0; i < DATE_PATTERNS.length; i++) {
    const pattern = DATE_PATTERNS[i];
    const regex = new RegExp(pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + value.length;

      // Skip if this date was already captured as a deadline
      if (deadlineValues[value.toLowerCase()] === true) {
        continue;
      }

      signals.push({
        id: generateSignalId(),
        type: 'date',
        value: value,
        displayValue: value,
        confidence: 'medium',
        sourceSnippet: getSourceSnippet(text, startIndex, endIndex, 30),
        sourceRange: [startIndex, endIndex],
        metadata: null,
      });
    }
  }

  return signals;
}

/**
 * Extracts job/announcement IDs from text.
 */
function extractJobIds(text: string): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];

  for (let i = 0; i < JOB_ID_PATTERNS.length; i++) {
    const pattern = JOB_ID_PATTERNS[i];
    const regex = new RegExp(pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const idValue = match[1] !== undefined ? match[1] : fullMatch;
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;

      // Skip very short IDs
      if (idValue.length < 6) {
        continue;
      }

      // Determine type: if it's a labeled ID, use announcementNumber; else jobId
      const signalType: SignalType = fullMatch.toLowerCase().indexOf('announcement') !== -1
        ? 'announcementNumber'
        : 'jobId';

      signals.push({
        id: generateSignalId(),
        type: signalType,
        value: idValue.toUpperCase(),
        displayValue: idValue.toUpperCase(),
        confidence: fullMatch.length > idValue.length ? 'high' : 'medium',
        sourceSnippet: getSourceSnippet(text, startIndex, endIndex, 30),
        sourceRange: [startIndex, endIndex],
        metadata: null,
      });
    }
  }

  return signals;
}

/**
 * Extracts agency names from text.
 */
function extractAgencies(text: string): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];

  for (let i = 0; i < AGENCY_PATTERNS.length; i++) {
    const pattern = AGENCY_PATTERNS[i];
    const regex = new RegExp(pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const agencyValue = match[1] !== undefined ? match[1].trim() : fullMatch.trim();
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;

      // Skip if too short
      if (agencyValue.length < 2) {
        continue;
      }

      // Skip common words that aren't agencies
      const lowerValue = agencyValue.toLowerCase();
      if (
        lowerValue === 'the' ||
        lowerValue === 'a' ||
        lowerValue === 'an' ||
        lowerValue === 'this'
      ) {
        continue;
      }

      signals.push({
        id: generateSignalId(),
        type: 'agency',
        value: agencyValue,
        displayValue: agencyValue,
        confidence: agencyValue.length <= 4 ? 'high' : 'medium', // Acronyms are more certain
        sourceSnippet: getSourceSnippet(text, startIndex, endIndex, 30),
        sourceRange: [startIndex, endIndex],
        metadata: null,
      });
    }
  }

  return signals;
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extracts all signals from text content.
 *
 * HOW IT WORKS:
 * 1. Extract each signal type independently
 * 2. Deduplicate within each type
 * 3. Combine and count results
 *
 * Day 24 Fix: The filename parameter is now used in extraction.
 * Filenames often contain job IDs, dates, or URLs (e.g., "DE-12345678-25.pdf").
 * We combine text + filename into a single extraction source.
 *
 * @param text - The text content to analyze
 * @param filename - Optional filename for context (used to detect IDs/dates in attachment names)
 * @returns ExtractionResult with all signals and counts
 */
export function extractSignals(text: string, filename?: string): ExtractionResult {
  // Handle null/empty input gracefully
  if (text === null || text === undefined || text.trim() === '') {
    // Day 24 Fix: Even if text is empty, check filename for signals
    if (filename === undefined || filename === null || filename.trim() === '') {
      return {
        signals: [],
        counts: {
          date: 0,
          deadline: 0,
          url: 0,
          email: 0,
          phone: 0,
          jobId: 0,
          announcementNumber: 0,
          agency: 0,
        },
        hasSignals: false,
      };
    }
    // If we have a filename but no text, use filename as the source
    text = '';
  }

  // Day 24 Fix: Combine text + filename into a single extraction source.
  // This allows detection of IDs/dates embedded in attachment names.
  // We add the filename on a separate line to avoid contaminating text matching.
  let normalizedText = text;
  if (filename !== undefined && filename !== null && filename.trim() !== '') {
    normalizedText = text + '\n' + filename;
  }

  // =========================================================================
  // EXTRACT ALL SIGNAL TYPES
  // =========================================================================

  // Extract deadlines first (they take priority over general dates)
  const deadlines = extractDeadlines(normalizedText);

  // Extract other signal types
  const urls = extractUrls(normalizedText);
  const emails = extractEmails(normalizedText);
  const phones = extractPhones(normalizedText);
  const dates = extractDates(normalizedText, deadlines);
  const jobIds = extractJobIds(normalizedText);
  const agencies = extractAgencies(normalizedText);

  // =========================================================================
  // COMBINE AND DEDUPLICATE
  // =========================================================================

  // Combine all signals
  const allSignals: ExtractedSignal[] = [];
  for (let i = 0; i < deadlines.length; i++) allSignals.push(deadlines[i]);
  for (let i = 0; i < dates.length; i++) allSignals.push(dates[i]);
  for (let i = 0; i < urls.length; i++) allSignals.push(urls[i]);
  for (let i = 0; i < emails.length; i++) allSignals.push(emails[i]);
  for (let i = 0; i < phones.length; i++) allSignals.push(phones[i]);
  for (let i = 0; i < jobIds.length; i++) allSignals.push(jobIds[i]);
  for (let i = 0; i < agencies.length; i++) allSignals.push(agencies[i]);

  // Deduplicate
  const dedupedSignals = deduplicateSignals(allSignals);

  // =========================================================================
  // COUNT BY TYPE
  // =========================================================================

  const counts: Record<SignalType, number> = {
    date: 0,
    deadline: 0,
    url: 0,
    email: 0,
    phone: 0,
    jobId: 0,
    announcementNumber: 0,
    agency: 0,
  };

  for (let i = 0; i < dedupedSignals.length; i++) {
    const signal = dedupedSignals[i];
    counts[signal.type] = counts[signal.type] + 1;
  }

  return {
    signals: dedupedSignals,
    counts: counts,
    hasSignals: dedupedSignals.length > 0,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Human-readable labels for signal types.
 */
export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  date: 'Date',
  deadline: 'Deadline',
  url: 'Link',
  email: 'Email',
  phone: 'Phone',
  jobId: 'Job ID',
  announcementNumber: 'Announcement #',
  agency: 'Agency',
};

/**
 * Icons for signal types (Lucide icon names).
 */
export const SIGNAL_TYPE_ICONS: Record<SignalType, string> = {
  date: 'Calendar',
  deadline: 'CalendarClock',
  url: 'Link',
  email: 'Mail',
  phone: 'Phone',
  jobId: 'Hash',
  announcementNumber: 'FileText',
  agency: 'Building',
};

/**
 * Badge colors for signal types (Tailwind classes).
 */
export const SIGNAL_TYPE_COLORS: Record<SignalType, string> = {
  date: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  deadline: 'bg-red-500/20 text-red-400 border-red-500/30',
  url: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  email: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  phone: 'bg-green-500/20 text-green-400 border-green-500/30',
  jobId: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  announcementNumber: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  agency: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

/**
 * All signal types for iteration.
 */
export const ALL_SIGNAL_TYPES: SignalType[] = [
  'deadline',
  'date',
  'url',
  'email',
  'phone',
  'jobId',
  'announcementNumber',
  'agency',
];
