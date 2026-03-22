/**
 * ============================================================================
 * DEDUPE MODULE TESTS (Day 29)
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  computeImportFingerprint,
  isProbableDuplicate,
  dedupeIncomingImport,
} from './dedupe';
import type { ImportedDocument } from '@/store/documentImportStore';
import type { ExtractedSignal } from '@/lib/documents';

/**
 * Creates a mock ImportedDocument for testing.
 */
function createMockDocument(
  id: string,
  title: string,
  sizeBytes: number,
  signals: ExtractedSignal[]
): ImportedDocument {
  return {
    id: id,
    createdAt: new Date().toISOString(),
    title: title,
    type: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: sizeBytes,
    category: 'Other',
    sensitivity: 'Unknown',
    tags: [],
    isHidden: false,
    status: 'new',
    note: '',
    linkedEntities: [],
    extractedSignals: signals,
    actions: [],
    hasBlobStorage: true,
    textContent: null,
    classificationKeywords: [],
    classificationConfidence: 0.5,
    duplicateOfId: null,
    duplicateReasons: [],
    duplicateStatus: 'none',
    retentionStatus: 'active',
  };
}

/**
 * Creates a mock ExtractedSignal for testing.
 */
function createMockSignal(
  id: string,
  type: string,
  value: string,
  sourceSnippet: string
): ExtractedSignal {
  return {
    id: id,
    type: type as ExtractedSignal['type'],
    value: value,
    displayValue: value,
    confidence: 'high',
    sourceSnippet: sourceSnippet,
    sourceRange: null,
    metadata: null,
  };
}

describe('computeImportFingerprint', function () {
  it('should generate fingerprint for attachment based on filename and size', function () {
    const doc = createMockDocument('doc1', 'test.pdf', 1024, []);
    const fingerprint = computeImportFingerprint(doc);
    expect(fingerprint).toContain('attachment:');
    expect(fingerprint).toContain('test.pdf');
    expect(fingerprint).toContain('1024');
  });

  it('should generate fingerprint for deadline-based item', function () {
    const deadlineSignal = createMockSignal('sig1', 'deadline', '2025-12-31', 'Apply by 2025-12-31');
    // Use type 'text' so attachment matching doesn't take precedence
    const doc = createMockDocument('doc1', 'Application', 100, [deadlineSignal]);
    doc.type = 'text';
    doc.sizeBytes = 0; // Text items with no size won't match attachment path
    const fingerprint = computeImportFingerprint(doc);
    expect(fingerprint).toContain('deadline');
  });
});

describe('isProbableDuplicate', function () {
  it('should detect duplicates with same filename and size', function () {
    const doc1 = createMockDocument('doc1', 'test.pdf', 1024, []);
    const doc2 = createMockDocument('doc2', 'test.pdf', 1024, []);
    expect(isProbableDuplicate(doc1, doc2)).toBe(true);
  });

  it('should not detect duplicates with different sizes', function () {
    const doc1 = createMockDocument('doc1', 'test.pdf', 1024, []);
    const doc2 = createMockDocument('doc2', 'test.pdf', 2048, []);
    expect(isProbableDuplicate(doc1, doc2)).toBe(false);
  });

  it('should detect duplicates with same deadline and date', function () {
    const deadline1 = createMockSignal('sig1', 'deadline', '2025-12-31', 'Apply by 2025-12-31');
    const date1 = createMockSignal('sig2', 'date', '2025-12-31', 'Date: 2025-12-31');
    const deadline2 = createMockSignal('sig3', 'deadline', '2025-12-31', 'Apply by 2025-12-31');
    const date2 = createMockSignal('sig4', 'date', '2025-12-31', 'Date: 2025-12-31');

    const doc1 = createMockDocument('doc1', 'App', 100, [deadline1, date1]);
    const doc2 = createMockDocument('doc2', 'App', 100, [deadline2, date2]);
    expect(isProbableDuplicate(doc1, doc2)).toBe(true);
  });
});

describe('dedupeIncomingImport', function () {
  it('should return keep decision for non-duplicate', function () {
    const existing = createMockDocument('doc1', 'test1.pdf', 1024, []);
    const incoming = createMockDocument('doc2', 'test2.pdf', 2048, []);
    const result = dedupeIncomingImport([existing], incoming);
    expect(result.decision).toBe('keep');
    expect(result.duplicateOfId).toBe(null);
    expect(result.reasons.length).toBe(0);
  });

  it('should return duplicate decision with reasons', function () {
    const existing = createMockDocument('doc1', 'test.pdf', 1024, []);
    const incoming = createMockDocument('doc2', 'test.pdf', 1024, []);
    const result = dedupeIncomingImport([existing], incoming);
    expect(result.decision).toBe('duplicate');
    expect(result.duplicateOfId).toBe('doc1');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('should skip items that are themselves duplicates', function () {
    const original = createMockDocument('doc1', 'test.pdf', 1024, []);
    const duplicate = createMockDocument('doc2', 'test.pdf', 1024, []);
    duplicate.duplicateOfId = 'doc1';
    const incoming = createMockDocument('doc3', 'test.pdf', 1024, []);
    const result = dedupeIncomingImport([original, duplicate], incoming);
    expect(result.decision).toBe('duplicate');
    expect(result.duplicateOfId).toBe('doc1'); // Should point to original, not duplicate
  });
});
