/**
 * ============================================================================
 * EMAIL UTILITIES BARREL EXPORT (Day 21)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Re-exports all email-related utilities from a single entry point.
 *
 * @version Day 21 - Email Ingestion Inbox v1
 * ============================================================================
 */

export {
  parseEmailText,
  parseEmlFile,
  classifyEmail,
} from './parseEml';

export type {
  ParsedEmail,
  EmailAttachment,
  EmailClassification,
} from './parseEml';














