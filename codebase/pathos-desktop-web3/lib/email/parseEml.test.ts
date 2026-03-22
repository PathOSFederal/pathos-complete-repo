/**
 * ============================================================================
 * EMAIL PARSING UTILITY TESTS (Day 21)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for email parsing and classification functions.
 * Tests cover header extraction, attachment detection, and classification.
 *
 * @version Day 21 - Email Ingestion Inbox v1
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { parseEmailText, classifyEmail } from './parseEml';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * Sample email text with standard headers.
 */
const SAMPLE_EMAIL_BASIC = [
  'From: sender@agency.gov',
  'To: recipient@example.com',
  'Subject: Your Pay Statement for PP 24',
  'Date: Mon, 15 Dec 2025 10:30:00 -0500',
  '',
  'Dear Employee,',
  '',
  'Your pay stub is attached.',
  '',
  'Best regards,',
  'HR Department',
].join('\n');

/**
 * Sample email text with CRLF line endings.
 */
const SAMPLE_EMAIL_CRLF = [
  'From: sender@agency.gov',
  'To: recipient@example.com',
  'Subject: PCS Relocation Orders',
  'Date: Tue, 16 Dec 2025 09:00:00 -0500',
  '',
  'Your PCS orders are attached.',
].join('\r\n');

/**
 * Sample email text with attachment.
 */
const SAMPLE_EMAIL_WITH_ATTACHMENT = [
  'From: hr@agency.gov',
  'To: employee@personal.com',
  'Subject: FEHB Plan Information',
  'Date: Wed, 17 Dec 2025 14:00:00 -0500',
  'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="----=_Part_0"',
  '',
  '------=_Part_0',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Please review your FEHB plan brochure.',
  '',
  '------=_Part_0',
  'Content-Type: application/pdf',
  'Content-Disposition: attachment; filename="fehb-brochure.pdf"',
  '',
  'PDF content here',
  '',
  '------=_Part_0--',
].join('\n');

/**
 * Sample email with USAJOBS job posting content.
 */
const SAMPLE_EMAIL_JOB_POSTING = [
  'From: notifications@usajobs.gov',
  'To: jobseeker@personal.com',
  'Subject: New job announcement: Program Analyst',
  'Date: Thu, 18 Dec 2025 11:00:00 -0500',
  '',
  'A new vacancy announcement has been posted that matches your search.',
  '',
  'Position: Program Analyst',
  'Announcement Number: USAJOBS-2025-12345',
  'Agency: Department of Veterans Affairs',
].join('\n');

/**
 * Sample email with no clear classification.
 */
const SAMPLE_EMAIL_OTHER = [
  'From: friend@personal.com',
  'To: me@personal.com',
  'Subject: Lunch tomorrow?',
  'Date: Fri, 19 Dec 2025 08:00:00 -0500',
  '',
  'Hey, want to grab lunch tomorrow?',
].join('\n');

/**
 * Sample email with multiple attachments.
 */
const SAMPLE_EMAIL_MULTIPLE_ATTACHMENTS = [
  'From: sender@example.com',
  'To: recipient@example.com',
  'Subject: W2 and LES Documents',
  'Date: Sat, 20 Dec 2025 10:00:00 -0500',
  'Content-Type: multipart/mixed; boundary="boundary123"',
  '',
  '--boundary123',
  'Content-Type: text/plain',
  '',
  'Here are your W2 and LES documents.',
  '',
  '--boundary123',
  'Content-Type: application/pdf',
  'Content-Disposition: attachment; filename="w2-2025.pdf"',
  '',
  'PDF data',
  '',
  '--boundary123',
  'Content-Type: application/pdf',
  'Content-Disposition: attachment; filename=les-pp24.pdf',
  '',
  'PDF data',
  '',
  '--boundary123--',
].join('\n');

// ============================================================================
// HEADER EXTRACTION TESTS
// ============================================================================

describe('parseEmailText', function () {
  describe('header extraction', function () {
    it('should extract From header', function () {
      const result = parseEmailText(SAMPLE_EMAIL_BASIC);
      expect(result.from).toBe('sender@agency.gov');
    });

    it('should extract To header', function () {
      const result = parseEmailText(SAMPLE_EMAIL_BASIC);
      expect(result.to).toBe('recipient@example.com');
    });

    it('should extract Subject header', function () {
      const result = parseEmailText(SAMPLE_EMAIL_BASIC);
      expect(result.subject).toBe('Your Pay Statement for PP 24');
    });

    it('should extract Date header', function () {
      const result = parseEmailText(SAMPLE_EMAIL_BASIC);
      expect(result.date).toBe('Mon, 15 Dec 2025 10:30:00 -0500');
    });

    it('should handle CRLF line endings', function () {
      const result = parseEmailText(SAMPLE_EMAIL_CRLF);
      expect(result.from).toBe('sender@agency.gov');
      expect(result.subject).toBe('PCS Relocation Orders');
    });

    it('should return empty string for missing headers', function () {
      const result = parseEmailText('Body only text without headers');
      expect(result.from).toBe('');
      expect(result.to).toBe('');
      expect(result.subject).toBe('');
      expect(result.date).toBe('');
    });

    it('should handle empty input', function () {
      const result = parseEmailText('');
      expect(result.from).toBe('');
      expect(result.to).toBe('');
      expect(result.subject).toBe('');
      expect(result.date).toBe('');
      expect(result.attachments).toHaveLength(0);
      expect(result.classification).toBe('Other');
    });
  });

  describe('attachment detection', function () {
    it('should detect attachment with quoted filename', function () {
      const result = parseEmailText(SAMPLE_EMAIL_WITH_ATTACHMENT);
      expect(result.attachments.length).toBeGreaterThanOrEqual(1);
      expect(result.attachments[0].filename).toBe('fehb-brochure.pdf');
    });

    it('should detect attachment content type', function () {
      const result = parseEmailText(SAMPLE_EMAIL_WITH_ATTACHMENT);
      expect(result.attachments.length).toBeGreaterThanOrEqual(1);
      expect(result.attachments[0].contentType).toBe('application/pdf');
    });

    it('should detect multiple attachments', function () {
      const result = parseEmailText(SAMPLE_EMAIL_MULTIPLE_ATTACHMENTS);
      expect(result.attachments.length).toBe(2);
      
      // Check filenames (order may vary)
      const filenames = result.attachments.map(function (a) { return a.filename; });
      expect(filenames).toContain('w2-2025.pdf');
      expect(filenames).toContain('les-pp24.pdf');
    });

    it('should return empty array for emails without attachments', function () {
      const result = parseEmailText(SAMPLE_EMAIL_OTHER);
      expect(result.attachments).toHaveLength(0);
    });
  });

  describe('classification', function () {
    it('should classify pay stub emails', function () {
      const result = parseEmailText(SAMPLE_EMAIL_BASIC);
      expect(result.classification).toBe('PayStub');
    });

    it('should classify relocation orders emails', function () {
      const result = parseEmailText(SAMPLE_EMAIL_CRLF);
      expect(result.classification).toBe('RelocationOrders');
    });

    it('should classify FEHB emails', function () {
      const result = parseEmailText(SAMPLE_EMAIL_WITH_ATTACHMENT);
      expect(result.classification).toBe('FEHB');
    });

    it('should classify job posting emails', function () {
      const result = parseEmailText(SAMPLE_EMAIL_JOB_POSTING);
      expect(result.classification).toBe('JobPosting');
    });

    it('should classify other emails', function () {
      const result = parseEmailText(SAMPLE_EMAIL_OTHER);
      expect(result.classification).toBe('Other');
    });
  });
});

// ============================================================================
// CLASSIFICATION FUNCTION TESTS
// ============================================================================

describe('classifyEmail', function () {
  describe('PayStub classification', function () {
    it('should classify by "paystub" keyword', function () {
      const result = classifyEmail('Your paystub is ready', '', []);
      expect(result).toBe('PayStub');
    });

    it('should classify by "pay stub" keyword', function () {
      const result = classifyEmail('Your pay stub is ready', '', []);
      expect(result).toBe('PayStub');
    });

    it('should classify by "earnings" keyword', function () {
      const result = classifyEmail('Earnings statement', '', []);
      expect(result).toBe('PayStub');
    });

    it('should classify by "les" keyword', function () {
      const result = classifyEmail('', 'Your LES is attached', []);
      expect(result).toBe('PayStub');
    });

    it('should classify by "w-2" keyword', function () {
      const result = classifyEmail('W-2 Form', '', []);
      expect(result).toBe('PayStub');
    });

    it('should classify by "w2" keyword', function () {
      const result = classifyEmail('', '', ['w2-2024.pdf']);
      expect(result).toBe('PayStub');
    });
  });

  describe('RelocationOrders classification', function () {
    it('should classify by "pcs" keyword', function () {
      const result = classifyEmail('PCS Orders', '', []);
      expect(result).toBe('RelocationOrders');
    });

    it('should classify by "orders" keyword', function () {
      const result = classifyEmail('Your orders are ready', '', []);
      expect(result).toBe('RelocationOrders');
    });

    it('should classify by "relocation" keyword', function () {
      const result = classifyEmail('Relocation Information', '', []);
      expect(result).toBe('RelocationOrders');
    });
  });

  describe('FEHB classification', function () {
    it('should classify by "fehb" keyword', function () {
      const result = classifyEmail('FEHB Enrollment', '', []);
      expect(result).toBe('FEHB');
    });

    it('should classify by "plan brochure" keyword', function () {
      const result = classifyEmail('Plan brochure attached', '', []);
      expect(result).toBe('FEHB');
    });

    it('should classify by "health benefits" keyword', function () {
      const result = classifyEmail('Health benefits update', '', []);
      expect(result).toBe('FEHB');
    });
  });

  describe('JobPosting classification', function () {
    it('should classify by "usajobs" keyword', function () {
      const result = classifyEmail('USAJOBS notification', '', []);
      expect(result).toBe('JobPosting');
    });

    it('should classify by "vacancy" keyword', function () {
      const result = classifyEmail('Vacancy Announcement', '', []);
      expect(result).toBe('JobPosting');
    });

    it('should classify by "announcement" keyword', function () {
      const result = classifyEmail('', 'New job announcement available', []);
      expect(result).toBe('JobPosting');
    });

    it('should classify by "job posting" keyword', function () {
      const result = classifyEmail('New job posting', '', []);
      expect(result).toBe('JobPosting');
    });
  });

  describe('Other classification', function () {
    it('should return Other for unrecognized content', function () {
      const result = classifyEmail('Hello friend', 'Want to meet for coffee?', []);
      expect(result).toBe('Other');
    });

    it('should return Other for empty input', function () {
      const result = classifyEmail('', '', []);
      expect(result).toBe('Other');
    });
  });

  describe('priority order', function () {
    it('should prioritize PayStub over JobPosting when both keywords present', function () {
      // PayStub has higher priority than JobPosting
      const result = classifyEmail('USAJOBS paystub notification', '', []);
      expect(result).toBe('PayStub');
    });

    it('should classify by attachment filename', function () {
      const result = classifyEmail('Document attached', '', ['orders.pdf']);
      expect(result).toBe('RelocationOrders');
    });
  });

  describe('case insensitivity', function () {
    it('should match keywords case-insensitively', function () {
      const result1 = classifyEmail('PAYSTUB', '', []);
      const result2 = classifyEmail('PayStub', '', []);
      const result3 = classifyEmail('paystub', '', []);
      
      expect(result1).toBe('PayStub');
      expect(result2).toBe('PayStub');
      expect(result3).toBe('PayStub');
    });
  });
});

