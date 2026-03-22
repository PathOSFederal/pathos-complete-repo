/**
 * ============================================================================
 * DIGEST COMPOSER UTILITY (Day 20)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Composes email digest content for job alert matches. Generates plain text
 * email body and subject, respecting privacy settings and user preferences.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │  Alerts Center  │ --> │   THIS FILE     │ --> │ mailto: URL    │
 * │  (UI Component) │     │  (Digest Logic) │     │ or clipboard   │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Generate subject line (deterministic, short)
 * 2. Generate body text (plain text, respects privacy)
 * 3. Build mailto: URL with safe encoding
 * 4. Provide preview blocks for in-app rendering
 * 5. Handle max URL length with copy fallback
 *
 * HOUSE RULES COMPLIANCE (Day 20):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses explicit loops and Object.assign
 * - Over-commented for teaching-level clarity
 *
 * @version Day 20 - Email Digest v1
 * ============================================================================
 */

import type { JobAlert, EmailDigestSettings } from '@/store/jobAlertsStore';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Job data needed for digest rendering.
 * Simplified shape to avoid dependency on full job model.
 */
export interface DigestJobData {
  id: string;
  title: string;
  organization: string;
  location: string;
  salary: string;
  gradeLevel: string;
  url: string;
}

/**
 * Result of generating a digest.
 */
export interface DigestResult {
  /**
   * Subject line for the email.
   */
  subject: string;

  /**
   * Plain text body for the email.
   */
  bodyText: string;

  /**
   * Preview blocks for in-app rendering.
   * Each block is a section of the digest.
   */
  previewBlocks: DigestPreviewBlock[];

  /**
   * Whether the digest was generated successfully.
   * False if onlyWhenNew is true and there are no new matches.
   */
  generated: boolean;

  /**
   * Reason digest was not generated (if generated is false).
   */
  skipReason: string | null;

  /**
   * Total count of jobs included in the digest.
   */
  jobCount: number;

  /**
   * Count of new jobs (not previously seen).
   */
  newJobCount: number;
}

/**
 * A preview block for in-app rendering.
 */
export interface DigestPreviewBlock {
  type: 'header' | 'summary' | 'job' | 'footer';
  content: string;
}

/**
 * Options for generating a digest.
 */
export interface DigestOptions {
  /**
   * Email digest settings from user preferences.
   */
  settings: EmailDigestSettings;

  /**
   * Array of alerts to include in digest.
   */
  alerts: JobAlert[];

  /**
   * Map of alert ID to array of job data for matches.
   */
  jobsByAlert: Record<string, DigestJobData[]>;

  /**
   * Map of alert ID to array of NEW job IDs (not previously seen).
   */
  newJobIdsByAlert: Record<string, string[]>;

  /**
   * Whether global privacy hide is enabled.
   * If true, salary and location are redacted regardless of settings.
   */
  globalPrivacyHide: boolean;

  /**
   * Current date for the digest header.
   */
  date: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum length for mailto: URL before fallback to copy.
 * Most browsers/email clients have limits around 2000-8000 characters.
 * We use a conservative limit to ensure compatibility.
 */
export const MAX_MAILTO_LENGTH = 2000;

/**
 * Redacted value placeholder.
 */
const REDACTED = '[REDACTED]';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats a date for the digest header.
 *
 * @param date - The date to format
 * @returns Formatted date string (e.g., "December 14, 2025")
 */
function formatDigestDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return month + ' ' + day + ', ' + year;
}

/**
 * Counts total jobs across all alerts.
 *
 * @param jobsByAlert - Map of alert ID to job arrays
 * @returns Total job count
 */
function countTotalJobs(jobsByAlert: Record<string, DigestJobData[]>): number {
  let count = 0;
  const alertIds = Object.keys(jobsByAlert);
  for (let i = 0; i < alertIds.length; i++) {
    const jobs = jobsByAlert[alertIds[i]];
    if (jobs !== undefined && jobs !== null) {
      count = count + jobs.length;
    }
  }
  return count;
}

/**
 * Counts total new jobs across all alerts.
 *
 * @param newJobIdsByAlert - Map of alert ID to new job ID arrays
 * @returns Total new job count
 */
function countNewJobs(newJobIdsByAlert: Record<string, string[]>): number {
  let count = 0;
  const alertIds = Object.keys(newJobIdsByAlert);
  for (let i = 0; i < alertIds.length; i++) {
    const ids = newJobIdsByAlert[alertIds[i]];
    if (ids !== undefined && ids !== null) {
      count = count + ids.length;
    }
  }
  return count;
}


// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generates a digest subject line.
 *
 * HOW IT WORKS:
 * 1. Count total jobs
 * 2. Include date
 * 3. Keep it short and descriptive
 *
 * @param options - Digest generation options
 * @returns Subject line string
 */
export function generateDigestSubject(options: DigestOptions): string {
  const totalJobs = countTotalJobs(options.jobsByAlert);
  const newJobs = countNewJobs(options.newJobIdsByAlert);
  const dateStr = formatDigestDate(options.date);

  if (newJobs > 0) {
    return 'PathOS Job Digest: ' + newJobs + ' new match' + (newJobs === 1 ? '' : 'es') + ' - ' + dateStr;
  }

  if (totalJobs > 0) {
    return 'PathOS Job Digest: ' + totalJobs + ' job' + (totalJobs === 1 ? '' : 's') + ' - ' + dateStr;
  }

  return 'PathOS Job Digest - ' + dateStr;
}

/**
 * Generates a digest body in plain text.
 *
 * HOW IT WORKS:
 * 1. Check if digest should be generated
 * 2. Build header with summary
 * 3. For each alert with matches, list jobs
 * 4. Respect privacy settings for salary/location
 * 5. Add footer
 *
 * @param options - Digest generation options
 * @returns DigestResult with body and metadata
 */
export function generateDigest(options: DigestOptions): DigestResult {
  const settings = options.settings;
  const alerts = options.alerts;
  const jobsByAlert = options.jobsByAlert;
  const newJobIdsByAlert = options.newJobIdsByAlert;
  const globalPrivacyHide = options.globalPrivacyHide;
  const date = options.date;

  const totalJobs = countTotalJobs(jobsByAlert);
  const newJobCount = countNewJobs(newJobIdsByAlert);

  // Check if we should skip generation
  if (settings.onlyWhenNew && newJobCount === 0) {
    return {
      subject: '',
      bodyText: '',
      previewBlocks: [],
      generated: false,
      skipReason: 'No new matches found. Digest skipped because "only when new" is enabled.',
      jobCount: totalJobs,
      newJobCount: 0,
    };
  }

  // Determine what to include/redact
  const shouldRedactSalary = globalPrivacyHide || !settings.includeSalary;
  const shouldRedactLocation = globalPrivacyHide || !settings.includeLocation;

  // Build preview blocks and body text
  const previewBlocks: DigestPreviewBlock[] = [];
  const bodyLines: string[] = [];

  // Header
  const headerLine = '=== PathOS Job Digest ===';
  const dateLine = formatDigestDate(date);
  previewBlocks.push({ type: 'header', content: headerLine + '\n' + dateLine });
  bodyLines.push(headerLine);
  bodyLines.push(dateLine);
  bodyLines.push('');

  // Summary
  let summaryText = 'Summary: ';
  if (newJobCount > 0) {
    summaryText = summaryText + newJobCount + ' new match' + (newJobCount === 1 ? '' : 'es');
    if (totalJobs > newJobCount) {
      summaryText = summaryText + ', ' + totalJobs + ' total jobs';
    }
  } else {
    summaryText = summaryText + totalJobs + ' job' + (totalJobs === 1 ? '' : 's') + ' matching your alerts';
  }
  previewBlocks.push({ type: 'summary', content: summaryText });
  bodyLines.push(summaryText);
  bodyLines.push('');

  // Per-alert sections
  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];
    const jobs = jobsByAlert[alert.id];
    const newIds = newJobIdsByAlert[alert.id];

    if (jobs === undefined || jobs === null || jobs.length === 0) {
      continue;
    }

    // Create a set of new job IDs for quick lookup
    const newIdSet: Set<string> = new Set();
    if (newIds !== undefined && newIds !== null) {
      for (let j = 0; j < newIds.length; j++) {
        newIdSet.add(newIds[j]);
      }
    }

    bodyLines.push('--- ' + alert.name + ' ---');
    bodyLines.push('');

    for (let k = 0; k < jobs.length; k++) {
      const job = jobs[k];
      const isNew = newIdSet.has(job.id);

      // Job title line
      let titleLine = job.title;
      if (isNew) {
        titleLine = '[NEW] ' + titleLine;
      }
      bodyLines.push(titleLine);

      // Organization
      bodyLines.push('  Organization: ' + job.organization);

      // Grade
      if (job.gradeLevel !== '') {
        bodyLines.push('  Grade: ' + job.gradeLevel);
      }

      // Location (if not redacted)
      if (!shouldRedactLocation && job.location !== '') {
        bodyLines.push('  Location: ' + job.location);
      } else if (shouldRedactLocation) {
        bodyLines.push('  Location: ' + REDACTED);
      }

      // Salary (if not redacted)
      if (!shouldRedactSalary && job.salary !== '') {
        bodyLines.push('  Salary: ' + job.salary);
      } else if (shouldRedactSalary) {
        bodyLines.push('  Salary: ' + REDACTED);
      }

      // URL
      if (job.url !== '') {
        bodyLines.push('  Link: ' + job.url);
      }

      bodyLines.push('');

      // Add as preview block
      let jobBlockContent = titleLine + '\n';
      jobBlockContent = jobBlockContent + '  Organization: ' + job.organization + '\n';
      if (job.gradeLevel !== '') {
        jobBlockContent = jobBlockContent + '  Grade: ' + job.gradeLevel + '\n';
      }
      if (!shouldRedactLocation && job.location !== '') {
        jobBlockContent = jobBlockContent + '  Location: ' + job.location + '\n';
      } else if (shouldRedactLocation) {
        jobBlockContent = jobBlockContent + '  Location: ' + REDACTED + '\n';
      }
      if (!shouldRedactSalary && job.salary !== '') {
        jobBlockContent = jobBlockContent + '  Salary: ' + job.salary + '\n';
      } else if (shouldRedactSalary) {
        jobBlockContent = jobBlockContent + '  Salary: ' + REDACTED + '\n';
      }
      if (job.url !== '') {
        jobBlockContent = jobBlockContent + '  Link: ' + job.url;
      }
      previewBlocks.push({ type: 'job', content: jobBlockContent });
    }
  }

  // Footer
  const footerLine = '---\nGenerated by PathOS (local-only, Tier 1)';
  previewBlocks.push({ type: 'footer', content: footerLine });
  bodyLines.push('---');
  bodyLines.push('Generated by PathOS (local-only, Tier 1)');

  // Join body lines
  const bodyText = bodyLines.join('\n');

  // Generate subject
  const subject = generateDigestSubject(options);

  return {
    subject: subject,
    bodyText: bodyText,
    previewBlocks: previewBlocks,
    generated: true,
    skipReason: null,
    jobCount: totalJobs,
    newJobCount: newJobCount,
  };
}

/**
 * Builds a mailto: URL from subject and body.
 *
 * HOW IT WORKS:
 * 1. Encode subject and body with encodeURIComponent
 * 2. Build URL with email, subject, and body parameters
 * 3. Check if URL exceeds max length
 *
 * @param email - Recipient email address
 * @param subject - Email subject
 * @param body - Email body
 * @returns Object with url and whether it exceeded max length
 */
export function buildMailtoUrl(
  email: string,
  subject: string,
  body: string
): { url: string; exceededMaxLength: boolean } {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  const url = 'mailto:' + email + '?subject=' + encodedSubject + '&body=' + encodedBody;

  const exceededMaxLength = url.length > MAX_MAILTO_LENGTH;

  return {
    url: url,
    exceededMaxLength: exceededMaxLength,
  };
}

/**
 * Copies text to clipboard.
 *
 * HOW IT WORKS:
 * 1. Use navigator.clipboard.writeText if available
 * 2. Falls back to execCommand for older browsers
 *
 * @param text - Text to copy
 * @returns Promise resolving to true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // SSR guard
  if (typeof window === 'undefined') {
    return false;
  }

  // Try modern clipboard API
  if (navigator !== undefined && navigator !== null && navigator.clipboard !== undefined) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('[Digest] Clipboard API failed:', error);
    }
  }

  // Fallback to execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error('[Digest] Failed to copy to clipboard:', error);
    return false;
  }
}
