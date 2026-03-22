/**
 * ============================================================================
 * ALERTS LIBRARY (Day 20)
 * ============================================================================
 *
 * Barrel export for alert-related utilities.
 *
 * @version Day 20 - Email Digest v1
 * ============================================================================
 */

export {
  generateDigest,
  generateDigestSubject,
  buildMailtoUrl,
  copyToClipboard,
  MAX_MAILTO_LENGTH,
} from './digest';

export type {
  DigestJobData,
  DigestResult,
  DigestPreviewBlock,
  DigestOptions,
} from './digest';
