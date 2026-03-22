/**
 * ============================================================================
 * DOCUMENT IMPORT STORE TESTS (Day 24 - Import Actions & Extraction v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the document import store.
 * Tests both helper functions AND behavioral store actions.
 *
 * TEST COVERAGE (Day 22):
 * 1. getDocumentType() recognizes PDF by MIME type and extension
 * 2. getDocumentType() recognizes DOCX by MIME type and extension
 * 3. getDocumentType() recognizes TXT by MIME type and extension
 * 4. getDocumentType() returns null for unsupported types
 *
 * TEST COVERAGE (Day 23):
 * 5. Status constants export correctly
 * 6. ALL_IMPORT_STATUSES includes expected values
 * 7. IMPORT_STATUS_LABELS has labels for all statuses
 *
 * TEST COVERAGE (Day 23 - Run 2 - Behavioral Tests):
 * 8. Status update persists after rehydration (save/load cycle)
 * 9. Note update persists after rehydration (save/load cycle)
 * 10. linkToEntity creates link correctly
 * 11. linkToEntity prevents duplicate links
 * 12. unlinkFromEntity removes link correctly
 * 13. getLinkedDocuments returns correct documents
 * 14. Store reset clears all documents and link metadata
 *
 * TEST COVERAGE (Day 24 - Import Actions & Extraction):
 * 15. Extracted signals array on imported document
 * 16. Extracted signals persist after save/load cycle
 * 17. createAction creates action correctly
 * 18. updateActionStatus updates status and sets completedAt
 * 19. removeAction removes action from document
 * 20. getQueuedActions returns only queued actions
 * 21. Actions persist after save/load cycle
 *
 * @version Day 24 - Import Actions & Extraction v1
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDocumentType,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_FILE_MIME_TYPES,
  // Day 23: Import status constants
  ALL_IMPORT_STATUSES,
  IMPORT_STATUS_LABELS,
  IMPORT_STATUS_COLORS,
  // Day 23 Run 2: Store and types for behavioral tests
  useDocumentImportStore,
  DOCUMENT_IMPORT_STORAGE_KEY,
} from './documentImportStore';
import type { ImportedDocument } from './documentImportStore';

// ============================================================================
// getDocumentType() TESTS
// ============================================================================

describe('getDocumentType', function () {
  // ==========================================================================
  // PDF DETECTION
  // ==========================================================================

  describe('PDF detection', function () {
    it('should recognize PDF by MIME type application/pdf', function () {
      const result = getDocumentType('application/pdf', 'document.pdf');
      expect(result).toBe('pdf');
    });

    it('should recognize PDF by MIME type even with wrong extension', function () {
      // MIME type takes precedence over extension
      const result = getDocumentType('application/pdf', 'document.xyz');
      expect(result).toBe('pdf');
    });

    it('should recognize PDF by .pdf extension when MIME is empty', function () {
      const result = getDocumentType('', 'resume.pdf');
      expect(result).toBe('pdf');
    });

    it('should recognize PDF by .pdf extension (case-insensitive)', function () {
      const result = getDocumentType('', 'Resume.PDF');
      expect(result).toBe('pdf');
    });

    it('should recognize PDF by .pdf extension with mixed case', function () {
      const result = getDocumentType('', 'MyDocument.Pdf');
      expect(result).toBe('pdf');
    });
  });

  // ==========================================================================
  // DOCX DETECTION
  // ==========================================================================

  describe('DOCX detection', function () {
    const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    it('should recognize DOCX by MIME type', function () {
      const result = getDocumentType(DOCX_MIME, 'document.docx');
      expect(result).toBe('docx');
    });

    it('should recognize DOCX by MIME type even with wrong extension', function () {
      const result = getDocumentType(DOCX_MIME, 'document.xyz');
      expect(result).toBe('docx');
    });

    it('should recognize DOCX by .docx extension when MIME is empty', function () {
      const result = getDocumentType('', 'resume.docx');
      expect(result).toBe('docx');
    });

    it('should recognize DOCX by .docx extension (case-insensitive)', function () {
      const result = getDocumentType('', 'Resume.DOCX');
      expect(result).toBe('docx');
    });

    it('should recognize DOCX by .docx extension with mixed case', function () {
      const result = getDocumentType('', 'MyDocument.DocX');
      expect(result).toBe('docx');
    });
  });

  // ==========================================================================
  // TXT DETECTION
  // ==========================================================================

  describe('TXT detection', function () {
    it('should recognize TXT by MIME type text/plain', function () {
      const result = getDocumentType('text/plain', 'notes.txt');
      expect(result).toBe('txt');
    });

    it('should recognize TXT by MIME type even with wrong extension', function () {
      const result = getDocumentType('text/plain', 'notes.xyz');
      expect(result).toBe('txt');
    });

    it('should recognize TXT by .txt extension when MIME is empty', function () {
      const result = getDocumentType('', 'notes.txt');
      expect(result).toBe('txt');
    });

    it('should recognize TXT by .txt extension (case-insensitive)', function () {
      const result = getDocumentType('', 'Notes.TXT');
      expect(result).toBe('txt');
    });

    it('should recognize TXT by .txt extension with mixed case', function () {
      const result = getDocumentType('', 'MyNotes.Txt');
      expect(result).toBe('txt');
    });
  });

  // ==========================================================================
  // UNSUPPORTED TYPE DETECTION
  // ==========================================================================

  describe('Unsupported type detection', function () {
    it('should return null for unknown MIME type and extension', function () {
      const result = getDocumentType('application/octet-stream', 'file.xyz');
      expect(result).toBeNull();
    });

    it('should return null for image files', function () {
      const result = getDocumentType('image/png', 'photo.png');
      expect(result).toBeNull();
    });

    it('should return null for .jpg files', function () {
      const result = getDocumentType('image/jpeg', 'photo.jpg');
      expect(result).toBeNull();
    });

    it('should return null for .zip files', function () {
      const result = getDocumentType('application/zip', 'archive.zip');
      expect(result).toBeNull();
    });

    it('should return null for .doc files (old Word format)', function () {
      // Old .doc format is NOT supported, only .docx
      const result = getDocumentType('application/msword', 'document.doc');
      expect(result).toBeNull();
    });

    it('should return null for .html files', function () {
      const result = getDocumentType('text/html', 'page.html');
      expect(result).toBeNull();
    });

    it('should return null for .xml files', function () {
      const result = getDocumentType('application/xml', 'data.xml');
      expect(result).toBeNull();
    });

    it('should return null for empty MIME and no extension', function () {
      const result = getDocumentType('', 'README');
      expect(result).toBeNull();
    });

    it('should return null for .exe files', function () {
      const result = getDocumentType('application/x-msdownload', 'program.exe');
      expect(result).toBeNull();
    });

    it('should return null for .json files', function () {
      const result = getDocumentType('application/json', 'config.json');
      expect(result).toBeNull();
    });

    it('should return null for .csv files (not TXT)', function () {
      // CSV is not plain text in our classification
      const result = getDocumentType('text/csv', 'data.csv');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge cases', function () {
    it('should not match .pdf in the middle of filename', function () {
      // Only extension at end should match
      const result = getDocumentType('', 'my.pdf.backup');
      expect(result).toBeNull();
    });

    /**
     * SECURITY TEST: .pdf.exe attack pattern
     * Malicious actors sometimes use double extensions to trick users.
     * A file named "resume.pdf.exe" should NOT be recognized as PDF.
     * This test ensures we only match the FINAL extension.
     */
    it('should not match .pdf.exe as PDF (double-extension security case)', function () {
      const result = getDocumentType('', 'resume.pdf.exe');
      expect(result).toBeNull();
    });

    /**
     * SECURITY TEST: .docx.exe attack pattern
     */
    it('should not match .docx.exe as DOCX (double-extension security case)', function () {
      const result = getDocumentType('', 'document.docx.exe');
      expect(result).toBeNull();
    });

    /**
     * SECURITY TEST: .txt.bat attack pattern
     */
    it('should not match .txt.bat as TXT (double-extension security case)', function () {
      const result = getDocumentType('', 'notes.txt.bat');
      expect(result).toBeNull();
    });

    it('should handle very long filenames with .pdf extension', function () {
      const longName = 'a'.repeat(200) + '.pdf';
      const result = getDocumentType('', longName);
      expect(result).toBe('pdf');
    });

    it('should handle filenames with spaces', function () {
      const result = getDocumentType('', 'my resume 2025.pdf');
      expect(result).toBe('pdf');
    });

    it('should handle filenames with special characters', function () {
      const result = getDocumentType('', 'résumé_français.docx');
      expect(result).toBe('docx');
    });

    it('should handle empty filename with valid MIME', function () {
      const result = getDocumentType('application/pdf', '');
      expect(result).toBe('pdf');
    });
  });
});

// ============================================================================
// SUPPORTED TYPES CONSTANTS TESTS
// ============================================================================

describe('Supported types constants', function () {
  it('SUPPORTED_FILE_EXTENSIONS should include .pdf, .docx, .txt', function () {
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('.pdf');
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('.docx');
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('.txt');
  });

  it('SUPPORTED_FILE_EXTENSIONS should have exactly 3 entries', function () {
    expect(SUPPORTED_FILE_EXTENSIONS.length).toBe(3);
  });

  it('SUPPORTED_FILE_MIME_TYPES should include PDF MIME type', function () {
    expect(SUPPORTED_FILE_MIME_TYPES).toContain('application/pdf');
  });

  it('SUPPORTED_FILE_MIME_TYPES should include DOCX MIME type', function () {
    expect(SUPPORTED_FILE_MIME_TYPES).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('SUPPORTED_FILE_MIME_TYPES should include TXT MIME type', function () {
    expect(SUPPORTED_FILE_MIME_TYPES).toContain('text/plain');
  });

  it('SUPPORTED_FILE_MIME_TYPES should have exactly 3 entries', function () {
    expect(SUPPORTED_FILE_MIME_TYPES.length).toBe(3);
  });
});

// ============================================================================
// DAY 23: IMPORT STATUS CONSTANTS TESTS
// ============================================================================

describe('Import status constants (Day 23)', function () {
  describe('ALL_IMPORT_STATUSES', function () {
    it('should include all four status values', function () {
      expect(ALL_IMPORT_STATUSES).toContain('new');
      expect(ALL_IMPORT_STATUSES).toContain('reviewed');
      expect(ALL_IMPORT_STATUSES).toContain('pinned');
      expect(ALL_IMPORT_STATUSES).toContain('archived');
    });

    it('should have exactly 4 statuses', function () {
      expect(ALL_IMPORT_STATUSES.length).toBe(4);
    });
  });

  describe('IMPORT_STATUS_LABELS', function () {
    it('should have a label for new status', function () {
      expect(IMPORT_STATUS_LABELS['new']).toBe('New');
    });

    it('should have a label for reviewed status', function () {
      expect(IMPORT_STATUS_LABELS['reviewed']).toBe('Reviewed');
    });

    it('should have a label for pinned status', function () {
      expect(IMPORT_STATUS_LABELS['pinned']).toBe('Pinned');
    });

    it('should have a label for archived status', function () {
      expect(IMPORT_STATUS_LABELS['archived']).toBe('Archived');
    });
  });

  describe('IMPORT_STATUS_COLORS', function () {
    it('should have a color class for each status', function () {
      expect(typeof IMPORT_STATUS_COLORS['new']).toBe('string');
      expect(typeof IMPORT_STATUS_COLORS['reviewed']).toBe('string');
      expect(typeof IMPORT_STATUS_COLORS['pinned']).toBe('string');
      expect(typeof IMPORT_STATUS_COLORS['archived']).toBe('string');
    });

    it('new status should have blue color class', function () {
      expect(IMPORT_STATUS_COLORS['new']).toContain('blue');
    });

    it('pinned status should have amber color class', function () {
      expect(IMPORT_STATUS_COLORS['pinned']).toContain('amber');
    });
  });
});

// ============================================================================
// DAY 23 RUN 2: BEHAVIORAL TESTS (Store Actions)
// ============================================================================
//
// These tests verify actual store behavior, not just constants.
// We mock localStorage to test persistence without browser dependency.
// ============================================================================

/**
 * Creates a mock ImportedDocument for testing.
 * This helper creates a valid document object without going through importText().
 *
 * @param id - Document ID
 * @param overrides - Optional property overrides
 * @returns A valid ImportedDocument object
 */
function createMockDocument(id: string, overrides?: Partial<ImportedDocument>): ImportedDocument {
  const defaults: ImportedDocument = {
    id: id,
    createdAt: new Date().toISOString(),
    title: 'Test Document ' + id,
    type: 'text',
    mimeType: 'text/plain',
    sizeBytes: 100,
    category: 'Other',
    sensitivity: 'Unknown',
    tags: [],
    isHidden: false,
    status: 'new',
    note: '',
    linkedEntities: [],
    extractedSignals: [], // Day 24
    actions: [], // Day 24
    hasBlobStorage: false,
    textContent: 'Test content for document ' + id,
    classificationKeywords: [],
    classificationConfidence: 0.5,
    duplicateStatus: 'none', // Day 29
    duplicateOfId: null, // Day 29
    duplicateReasons: [], // Day 29
    retentionStatus: 'active', // Day 29
  };

  // Apply overrides manually (no spread operator per house rules)
  const result: ImportedDocument = Object.assign({}, defaults);
  if (overrides !== undefined && overrides !== null) {
    const keys = Object.keys(overrides);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as keyof ImportedDocument;
      const value = overrides[key];
      if (value !== undefined) {
        // Use Object.assign to set the value (avoids type casting issues)
        const patch: Partial<ImportedDocument> = {};
        (patch as Record<string, unknown>)[key] = value;
        Object.assign(result, patch);
      }
    }
  }
  return result;
}

describe('Document Import Store Behavioral Tests (Day 23 Run 2)', function () {
  // Mock localStorage for persistence tests
  let mockStorage: Record<string, string> = {};

  beforeEach(function () {
    // Reset mock storage before each test
    mockStorage = {};

    // Mock window to pass SSR guards
    // The store checks `typeof window !== 'undefined'` before accessing localStorage
    vi.stubGlobal('window', {});

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: function (key: string): string | null {
        const value = mockStorage[key];
        return value !== undefined ? value : null;
      },
      setItem: function (key: string, value: string): void {
        mockStorage[key] = value;
      },
      removeItem: function (key: string): void {
        delete mockStorage[key];
      },
      clear: function (): void {
        mockStorage = {};
      },
    });

    // Mock FileReader for file import tests (Day 29)
    vi.stubGlobal('FileReader', function (this: FileReader) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const reader = this;
      reader.readAsText = function (file: File): void {
        // Read file content from File object
        // In test environment, File content is in the array passed to constructor
        const fileAsRecord = file as unknown as Record<string, unknown>;
        const fileParts = fileAsRecord['_parts'] as string[] | undefined;
        const content = fileParts !== undefined && fileParts.length > 0 ? fileParts[0] : '';
        // Simulate async read
        setTimeout(function () {
          if (reader.onload !== null && reader.onload !== undefined) {
            const event = {
              target: {
                result: content,
              },
            } as ProgressEvent<FileReader>;
            reader.onload(event);
          }
        }, 0);
      };
      reader.onload = null;
      reader.onerror = null;
      // Note: reader.result is read-only, so we don't set it here
    });

    // Reset the store to initial state
    // We can't call reset() because it's async and clears IndexedDB
    // Instead, directly set the state
    useDocumentImportStore.setState({
      documents: [],
      isLoaded: true,
    });
  });

  afterEach(function () {
    vi.unstubAllGlobals();
  });

  // ==========================================================================
  // STATUS UPDATE PERSISTENCE TESTS
  // ==========================================================================

  describe('Status update persistence', function () {
    it('should persist status update after save/load cycle', function () {
      // ARRANGE: Create a document and add it to state
      const doc = createMockDocument('doc-1', { status: 'new' });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Update status to 'reviewed'
      const updated = useDocumentImportStore.getState().updateStatus('doc-1', 'reviewed');
      expect(updated).toBe(true);

      // Verify in-memory state updated
      const beforeSave = useDocumentImportStore.getState().getDocument('doc-1');
      expect(beforeSave).not.toBeNull();
      if (beforeSave !== null) {
        expect(beforeSave.status).toBe('reviewed');
      }

      // ACT: Save to storage
      useDocumentImportStore.getState().saveToStorage();

      // ACT: Clear state and reload from storage (simulate page refresh)
      useDocumentImportStore.setState({ documents: [], isLoaded: false });
      useDocumentImportStore.getState().loadFromStorage();

      // ASSERT: Status should persist
      const afterLoad = useDocumentImportStore.getState().getDocument('doc-1');
      expect(afterLoad).not.toBeNull();
      if (afterLoad !== null) {
        expect(afterLoad.status).toBe('reviewed');
      }
    });

    it('should persist pinned status after save/load cycle', function () {
      // ARRANGE
      const doc = createMockDocument('doc-pinned', { status: 'new' });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Update to pinned, save, clear, reload
      useDocumentImportStore.getState().updateStatus('doc-pinned', 'pinned');
      useDocumentImportStore.getState().saveToStorage();
      useDocumentImportStore.setState({ documents: [], isLoaded: false });
      useDocumentImportStore.getState().loadFromStorage();

      // ASSERT
      const reloaded = useDocumentImportStore.getState().getDocument('doc-pinned');
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.status).toBe('pinned');
      }
    });
  });

  // ==========================================================================
  // NOTE UPDATE PERSISTENCE TESTS
  // ==========================================================================

  describe('Note update persistence', function () {
    it('should persist note update after save/load cycle', function () {
      // ARRANGE
      const doc = createMockDocument('doc-note', { note: '' });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Update note
      const testNote = 'This is a test note for the document';
      const updated = useDocumentImportStore.getState().updateNote('doc-note', testNote);
      expect(updated).toBe(true);

      // Save and reload
      useDocumentImportStore.getState().saveToStorage();
      useDocumentImportStore.setState({ documents: [], isLoaded: false });
      useDocumentImportStore.getState().loadFromStorage();

      // ASSERT: Note should persist
      const reloaded = useDocumentImportStore.getState().getDocument('doc-note');
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.note).toBe(testNote);
      }
    });

    it('should persist empty note (clearing a note)', function () {
      // ARRANGE: Start with a note
      const doc = createMockDocument('doc-clear-note', { note: 'Initial note' });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Clear note
      useDocumentImportStore.getState().updateNote('doc-clear-note', '');
      useDocumentImportStore.getState().saveToStorage();
      useDocumentImportStore.setState({ documents: [], isLoaded: false });
      useDocumentImportStore.getState().loadFromStorage();

      // ASSERT
      const reloaded = useDocumentImportStore.getState().getDocument('doc-clear-note');
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.note).toBe('');
      }
    });
  });

  // ==========================================================================
  // LINKING TESTS
  // ==========================================================================

  describe('linkToEntity', function () {
    it('should create a link to a saved job', function () {
      // ARRANGE
      const doc = createMockDocument('doc-link-1');
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const linked = useDocumentImportStore.getState().linkToEntity(
        'doc-link-1',
        'savedJob',
        'job-123'
      );

      // ASSERT
      expect(linked).toBe(true);
      const updated = useDocumentImportStore.getState().getDocument('doc-link-1');
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.linkedEntities.length).toBe(1);
        expect(updated.linkedEntities[0].entityType).toBe('savedJob');
        expect(updated.linkedEntities[0].entityId).toBe('job-123');
        expect(updated.linkedEntities[0].linkedAt).toBeDefined();
      }
    });

    it('should prevent duplicate links to same entity', function () {
      // ARRANGE
      const doc = createMockDocument('doc-dupe', {
        linkedEntities: [{
          entityType: 'savedJob',
          entityId: 'job-456',
          linkedAt: new Date().toISOString(),
        }],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Try to link again to same entity
      const linked = useDocumentImportStore.getState().linkToEntity(
        'doc-dupe',
        'savedJob',
        'job-456'
      );

      // ASSERT: Should return false (already linked)
      expect(linked).toBe(false);
      const updated = useDocumentImportStore.getState().getDocument('doc-dupe');
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.linkedEntities.length).toBe(1); // Still only one link
      }
    });

    it('should allow linking to multiple different entities', function () {
      // ARRANGE
      const doc = createMockDocument('doc-multi-link');
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Link to three different entities
      useDocumentImportStore.getState().linkToEntity('doc-multi-link', 'savedJob', 'job-a');
      useDocumentImportStore.getState().linkToEntity('doc-multi-link', 'targetRole', 'role-b');
      useDocumentImportStore.getState().linkToEntity('doc-multi-link', 'jobAlert', 'alert-c');

      // ASSERT
      const updated = useDocumentImportStore.getState().getDocument('doc-multi-link');
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.linkedEntities.length).toBe(3);
      }
    });

    it('should return false for non-existent document', function () {
      // ARRANGE
      useDocumentImportStore.setState({ documents: [], isLoaded: true });

      // ACT
      const linked = useDocumentImportStore.getState().linkToEntity(
        'non-existent',
        'savedJob',
        'job-123'
      );

      // ASSERT
      expect(linked).toBe(false);
    });
  });

  describe('unlinkFromEntity', function () {
    it('should remove a link from document', function () {
      // ARRANGE
      const doc = createMockDocument('doc-unlink', {
        linkedEntities: [{
          entityType: 'savedJob',
          entityId: 'job-to-remove',
          linkedAt: new Date().toISOString(),
        }],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const unlinked = useDocumentImportStore.getState().unlinkFromEntity(
        'doc-unlink',
        'savedJob',
        'job-to-remove'
      );

      // ASSERT
      expect(unlinked).toBe(true);
      const updated = useDocumentImportStore.getState().getDocument('doc-unlink');
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.linkedEntities.length).toBe(0);
      }
    });

    it('should return false when link does not exist', function () {
      // ARRANGE
      const doc = createMockDocument('doc-no-link');
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const unlinked = useDocumentImportStore.getState().unlinkFromEntity(
        'doc-no-link',
        'savedJob',
        'non-existent-job'
      );

      // ASSERT
      expect(unlinked).toBe(false);
    });
  });

  describe('getLinkedDocuments', function () {
    it('should return documents linked to a specific entity', function () {
      // ARRANGE: Create 3 docs, 2 linked to same job
      const doc1 = createMockDocument('doc-linked-1', {
        linkedEntities: [{
          entityType: 'savedJob',
          entityId: 'target-job',
          linkedAt: new Date().toISOString(),
        }],
      });
      const doc2 = createMockDocument('doc-linked-2', {
        linkedEntities: [{
          entityType: 'savedJob',
          entityId: 'target-job',
          linkedAt: new Date().toISOString(),
        }],
      });
      const doc3 = createMockDocument('doc-not-linked');
      useDocumentImportStore.setState({ documents: [doc1, doc2, doc3], isLoaded: true });

      // ACT
      const linked = useDocumentImportStore.getState().getLinkedDocuments('savedJob', 'target-job');

      // ASSERT
      expect(linked.length).toBe(2);
      const ids = linked.map(function (d) { return d.id; });
      expect(ids).toContain('doc-linked-1');
      expect(ids).toContain('doc-linked-2');
      expect(ids).not.toContain('doc-not-linked');
    });

    it('should return empty array when no documents linked', function () {
      // ARRANGE
      const doc = createMockDocument('doc-unrelated');
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const linked = useDocumentImportStore.getState().getLinkedDocuments('savedJob', 'no-such-job');

      // ASSERT
      expect(linked.length).toBe(0);
    });
  });

  // ==========================================================================
  // RESET/DELETE ALL LOCAL DATA TESTS
  // ==========================================================================

  describe('Store reset (Delete All Local Data)', function () {
    it('should clear all documents on reset', async function () {
      // ARRANGE
      const doc1 = createMockDocument('doc-reset-1');
      const doc2 = createMockDocument('doc-reset-2', {
        linkedEntities: [{
          entityType: 'savedJob',
          entityId: 'some-job',
          linkedAt: new Date().toISOString(),
        }],
      });
      useDocumentImportStore.setState({ documents: [doc1, doc2], isLoaded: true });
      useDocumentImportStore.getState().saveToStorage();

      // Verify documents exist before reset
      expect(useDocumentImportStore.getState().documents.length).toBe(2);
      expect(mockStorage[DOCUMENT_IMPORT_STORAGE_KEY]).toBeDefined();

      // ACT: Reset (simulate Delete All Local Data)
      await useDocumentImportStore.getState().reset();

      // ASSERT: Documents should be cleared
      expect(useDocumentImportStore.getState().documents.length).toBe(0);
      // localStorage should also be cleared
      expect(mockStorage[DOCUMENT_IMPORT_STORAGE_KEY]).toBeUndefined();
    });

    it('should clear linked entities when clearing documents', async function () {
      // ARRANGE
      const doc = createMockDocument('doc-with-links', {
        linkedEntities: [
          { entityType: 'savedJob', entityId: 'job-1', linkedAt: new Date().toISOString() },
          { entityType: 'targetRole', entityId: 'role-1', linkedAt: new Date().toISOString() },
        ],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // Verify links exist
      const beforeReset = useDocumentImportStore.getState().getLinkedDocuments('savedJob', 'job-1');
      expect(beforeReset.length).toBe(1);

      // ACT
      await useDocumentImportStore.getState().reset();

      // ASSERT: No linked documents should exist
      const afterReset = useDocumentImportStore.getState().getLinkedDocuments('savedJob', 'job-1');
      expect(afterReset.length).toBe(0);
    });
  });

  // ==========================================================================
  // LINKING PERSISTENCE TESTS
  // ==========================================================================

  describe('Linking persistence', function () {
    it('should persist links after save/load cycle', function () {
      // ARRANGE
      const doc = createMockDocument('doc-persist-link');
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Link, save, clear, reload
      useDocumentImportStore.getState().linkToEntity('doc-persist-link', 'savedJob', 'persisted-job');
      useDocumentImportStore.getState().saveToStorage();
      useDocumentImportStore.setState({ documents: [], isLoaded: false });
      useDocumentImportStore.getState().loadFromStorage();

      // ASSERT
      const reloaded = useDocumentImportStore.getState().getDocument('doc-persist-link');
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.linkedEntities.length).toBe(1);
        expect(reloaded.linkedEntities[0].entityType).toBe('savedJob');
        expect(reloaded.linkedEntities[0].entityId).toBe('persisted-job');
      }
    });
  });

  // ==========================================================================
  // DAY 24: EXTRACTED SIGNALS TESTS
  // ==========================================================================

  describe('Day 24: Extracted signals', function () {
    it('should have extractedSignals array on imported document', function () {
      // ARRANGE: Create document with extractedSignals
      const doc = createMockDocument('doc-with-signals', {
        extractedSignals: [
          {
            id: 'sig-1',
            type: 'url',
            value: 'https://example.com',
            displayValue: 'https://example.com',
            confidence: 'high',
            sourceSnippet: '...visit https://example.com for...',
            sourceRange: [10, 30],
            metadata: null,
          },
        ],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const retrieved = useDocumentImportStore.getState().getDocument('doc-with-signals');

      // ASSERT
      expect(retrieved).not.toBeNull();
      if (retrieved !== null) {
        expect(retrieved.extractedSignals).toBeDefined();
        expect(retrieved.extractedSignals.length).toBe(1);
        expect(retrieved.extractedSignals[0].type).toBe('url');
        expect(retrieved.extractedSignals[0].value).toBe('https://example.com');
      }
    });

    it('should persist extractedSignals after save/load cycle', function () {
      // ARRANGE
      const doc = createMockDocument('doc-signals-persist', {
        extractedSignals: [
          {
            id: 'sig-deadline',
            type: 'deadline',
            value: 'January 15, 2025',
            displayValue: 'January 15, 2025',
            confidence: 'high',
            sourceSnippet: '...apply by January 15, 2025...',
            sourceRange: null,
            metadata: { context: 'apply by January 15, 2025' },
          },
        ],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Save, clear, reload
      useDocumentImportStore.getState().saveToStorage();
      useDocumentImportStore.setState({ documents: [], isLoaded: false });
      useDocumentImportStore.getState().loadFromStorage();

      // ASSERT
      const reloaded = useDocumentImportStore.getState().getDocument('doc-signals-persist');
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.extractedSignals.length).toBe(1);
        expect(reloaded.extractedSignals[0].type).toBe('deadline');
        expect(reloaded.extractedSignals[0].value).toBe('January 15, 2025');
      }
    });
  });

  // ==========================================================================
  // DAY 24: IMPORT ACTIONS TESTS
  // ==========================================================================

  describe('Day 24: Import actions', function () {
    it('should create an action for a document', function () {
      // ARRANGE
      const doc = createMockDocument('doc-for-action');
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const action = useDocumentImportStore.getState().createAction(
        'doc-for-action',
        'open_job_search',
        { query: 'software developer' },
        'sig-source-1'
      );

      // ASSERT
      expect(action).not.toBeNull();
      if (action !== null) {
        expect(action.type).toBe('open_job_search');
        expect(action.status).toBe('queued');
        expect(action.payload.query).toBe('software developer');
        expect(action.sourceSignalId).toBe('sig-source-1');
      }

      // Verify action is in document
      const updated = useDocumentImportStore.getState().getDocument('doc-for-action');
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.actions.length).toBe(1);
      }
    });

    it('should update action status', function () {
      // ARRANGE
      const doc = createMockDocument('doc-action-status', {
        actions: [{
          id: 'action-to-update',
          type: 'capture_deadline',
          createdAt: new Date().toISOString(),
          status: 'queued',
          sourceSignalId: null,
          payload: { deadline: '2025-01-15' },
          note: '',
          completedAt: null,
        }],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const result = useDocumentImportStore.getState().updateActionStatus(
        'doc-action-status',
        'action-to-update',
        'applied'
      );

      // ASSERT
      expect(result).toBe(true);
      const updated = useDocumentImportStore.getState().getDocument('doc-action-status');
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.actions[0].status).toBe('applied');
        expect(updated.actions[0].completedAt).not.toBeNull();
      }
    });

    it('should return false when updating non-existent action', function () {
      // ARRANGE
      const doc = createMockDocument('doc-no-action');
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const result = useDocumentImportStore.getState().updateActionStatus(
        'doc-no-action',
        'non-existent-action',
        'applied'
      );

      // ASSERT
      expect(result).toBe(false);
    });

    it('should remove an action', function () {
      // ARRANGE
      const doc = createMockDocument('doc-remove-action', {
        actions: [
          {
            id: 'action-keep',
            type: 'open_job_search',
            createdAt: new Date().toISOString(),
            status: 'queued',
            sourceSignalId: null,
            payload: {},
            note: '',
            completedAt: null,
          },
          {
            id: 'action-remove',
            type: 'capture_deadline',
            createdAt: new Date().toISOString(),
            status: 'queued',
            sourceSignalId: null,
            payload: {},
            note: '',
            completedAt: null,
          },
        ],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const result = useDocumentImportStore.getState().removeAction('doc-remove-action', 'action-remove');

      // ASSERT
      expect(result).toBe(true);
      const updated = useDocumentImportStore.getState().getDocument('doc-remove-action');
      expect(updated).not.toBeNull();
      if (updated !== null) {
        expect(updated.actions.length).toBe(1);
        expect(updated.actions[0].id).toBe('action-keep');
      }
    });

    it('should get queued actions only', function () {
      // ARRANGE
      const doc = createMockDocument('doc-queued-actions', {
        actions: [
          {
            id: 'action-queued',
            type: 'open_job_search',
            createdAt: new Date().toISOString(),
            status: 'queued',
            sourceSignalId: null,
            payload: {},
            note: '',
            completedAt: null,
          },
          {
            id: 'action-applied',
            type: 'capture_deadline',
            createdAt: new Date().toISOString(),
            status: 'applied',
            sourceSignalId: null,
            payload: {},
            note: '',
            completedAt: new Date().toISOString(),
          },
        ],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT
      const queued = useDocumentImportStore.getState().getQueuedActions('doc-queued-actions');

      // ASSERT
      expect(queued.length).toBe(1);
      expect(queued[0].id).toBe('action-queued');
    });

    it('should persist actions after save/load cycle', function () {
      // ARRANGE
      const doc = createMockDocument('doc-action-persist', {
        actions: [{
          id: 'action-to-persist',
          type: 'start_resume_tailoring',
          createdAt: new Date().toISOString(),
          status: 'queued',
          sourceSignalId: 'sig-job-id',
          payload: { jobTitle: 'Software Developer' },
          note: 'From job posting',
          completedAt: null,
        }],
      });
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Save, clear, reload
      useDocumentImportStore.getState().saveToStorage();
      useDocumentImportStore.setState({ documents: [], isLoaded: false });
      useDocumentImportStore.getState().loadFromStorage();

      // ASSERT
      const reloaded = useDocumentImportStore.getState().getDocument('doc-action-persist');
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.actions.length).toBe(1);
        expect(reloaded.actions[0].type).toBe('start_resume_tailoring');
        expect(reloaded.actions[0].payload.jobTitle).toBe('Software Developer');
      }
    });
  });

  // ==========================================================================
  // DAY 29: DEDUPLICATION TESTS
  // ==========================================================================

  describe('duplicate detection', function () {
    it('should mark second import as duplicate when same file imported twice', async function () {
      // ARRANGE: Create a mock file
      const fileContent = 'Test document content';
      const fileName = 'test-document.txt';
      const mockFile = new File([fileContent], fileName, { type: 'text/plain' });

      // ACT: Import the same file twice
      const store = useDocumentImportStore.getState();
      store.reset();
      const firstDoc = await store.importFile(mockFile);
      const secondDoc = await store.importFile(mockFile);

      // ASSERT: Second doc should be marked as duplicate
      expect(secondDoc.duplicateStatus).toBe('possible_duplicate');
      expect(secondDoc.duplicateOfId).toBe(firstDoc.id);
      expect(secondDoc.duplicateReasons.length).toBeGreaterThan(0);
      expect(secondDoc.duplicateReasons).toContain('Same filename');
      expect(secondDoc.duplicateReasons).toContain('Same file size');
      expect(secondDoc.duplicateReasons).toContain('Same content hash');

      // First doc should not be marked as duplicate
      const reloadedFirst = store.getDocument(firstDoc.id);
      expect(reloadedFirst).not.toBeNull();
      if (reloadedFirst !== null) {
        expect(reloadedFirst.duplicateStatus).toBe('none');
        expect(reloadedFirst.duplicateOfId).toBeNull();
        expect(reloadedFirst.duplicateReasons.length).toBe(0);
      }
    });

    it('should not mark as duplicate when files differ', async function () {
      // ARRANGE: Create two different files
      const file1Content = 'First document';
      const file2Content = 'Second document';
      const mockFile1 = new File([file1Content], 'file1.txt', { type: 'text/plain' });
      const mockFile2 = new File([file2Content], 'file2.txt', { type: 'text/plain' });

      // ACT: Import both files
      const store = useDocumentImportStore.getState();
      store.reset();
      const firstDoc = await store.importFile(mockFile1);
      const secondDoc = await store.importFile(mockFile2);

      // ASSERT: Neither should be marked as duplicate
      expect(firstDoc.duplicateStatus).toBe('none');
      expect(secondDoc.duplicateStatus).toBe('none');
      expect(firstDoc.duplicateOfId).toBeNull();
      expect(secondDoc.duplicateOfId).toBeNull();
    });
  });

  // ==========================================================================
  // DAY 29: RETENTION STATUS TESTS
  // ==========================================================================

  describe('retention status management', function () {
    it('should default new documents to retentionStatus active', async function () {
      // ARRANGE: Create a mock file
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      // ACT: Import file
      const store = useDocumentImportStore.getState();
      store.reset();
      const doc = await store.importFile(mockFile);

      // ASSERT: retentionStatus should be 'active'
      expect(doc.retentionStatus).toBe('active');
    });

    it('should archive document and set retentionStatus to archived', function () {
      // ARRANGE: Create a document
      const store = useDocumentImportStore.getState();
      store.reset();
      const doc: ImportedDocument = {
        id: 'doc-archive-test',
        createdAt: new Date().toISOString(),
        title: 'Test Document',
        type: 'text',
        mimeType: 'text/plain',
        sizeBytes: 10,
        category: 'Other',
        sensitivity: 'Personal',
        tags: [],
        isHidden: false,
        status: 'new',
        note: '',
        linkedEntities: [],
        extractedSignals: [],
        actions: [],
        hasBlobStorage: false,
        textContent: 'test',
        classificationKeywords: [],
        classificationConfidence: 0.5,
        duplicateStatus: 'none',
        duplicateOfId: null,
        duplicateReasons: [],
        retentionStatus: 'active',
      };
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Archive document
      const success = store.archiveDocument('doc-archive-test');

      // ASSERT
      expect(success).toBe(true);
      const archived = store.getDocument('doc-archive-test');
      expect(archived).not.toBeNull();
      if (archived !== null) {
        expect(archived.retentionStatus).toBe('archived');
      }
    });

    it('should restore archived document and set retentionStatus to active', function () {
      // ARRANGE: Create an archived document
      const store = useDocumentImportStore.getState();
      store.reset();
      const doc: ImportedDocument = {
        id: 'doc-restore-test',
        createdAt: new Date().toISOString(),
        title: 'Test Document',
        type: 'text',
        mimeType: 'text/plain',
        sizeBytes: 10,
        category: 'Other',
        sensitivity: 'Personal',
        tags: [],
        isHidden: false,
        status: 'new',
        note: '',
        linkedEntities: [],
        extractedSignals: [],
        actions: [],
        hasBlobStorage: false,
        textContent: 'test',
        classificationKeywords: [],
        classificationConfidence: 0.5,
        duplicateStatus: 'none',
        duplicateOfId: null,
        duplicateReasons: [],
        retentionStatus: 'archived',
      };
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Restore document
      const success = store.restoreDocument('doc-restore-test');

      // ASSERT
      expect(success).toBe(true);
      const restored = store.getDocument('doc-restore-test');
      expect(restored).not.toBeNull();
      if (restored !== null) {
        expect(restored.retentionStatus).toBe('active');
      }
    });

    it('should soft delete document and set retentionStatus to deleted', function () {
      // ARRANGE: Create an active document
      const store = useDocumentImportStore.getState();
      store.reset();
      const doc: ImportedDocument = {
        id: 'doc-soft-delete-test',
        createdAt: new Date().toISOString(),
        title: 'Test Document',
        type: 'text',
        mimeType: 'text/plain',
        sizeBytes: 10,
        category: 'Other',
        sensitivity: 'Personal',
        tags: [],
        isHidden: false,
        status: 'new',
        note: '',
        linkedEntities: [],
        extractedSignals: [],
        actions: [],
        hasBlobStorage: false,
        textContent: 'test',
        classificationKeywords: [],
        classificationConfidence: 0.5,
        duplicateStatus: 'none',
        duplicateOfId: null,
        duplicateReasons: [],
        retentionStatus: 'active',
      };
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Soft delete document
      const success = store.softDeleteDocument('doc-soft-delete-test');

      // ASSERT
      expect(success).toBe(true);
      const softDeleted = store.getDocument('doc-soft-delete-test');
      expect(softDeleted).not.toBeNull();
      if (softDeleted !== null) {
        expect(softDeleted.retentionStatus).toBe('deleted');
      }
    });

    it('should persist retentionStatus after save/load cycle', function () {
      // ARRANGE: Create a document with archived retentionStatus
      const store = useDocumentImportStore.getState();
      store.reset();
      const doc: ImportedDocument = {
        id: 'doc-retention-persist',
        createdAt: new Date().toISOString(),
        title: 'Test Document',
        type: 'text',
        mimeType: 'text/plain',
        sizeBytes: 10,
        category: 'Other',
        sensitivity: 'Personal',
        tags: [],
        isHidden: false,
        status: 'new',
        note: '',
        linkedEntities: [],
        extractedSignals: [],
        actions: [],
        hasBlobStorage: false,
        textContent: 'test',
        classificationKeywords: [],
        classificationConfidence: 0.5,
        duplicateStatus: 'none',
        duplicateOfId: null,
        duplicateReasons: [],
        retentionStatus: 'archived',
      };
      useDocumentImportStore.setState({ documents: [doc], isLoaded: true });

      // ACT: Save, clear, reload
      store.saveToStorage();
      useDocumentImportStore.setState({ documents: [], isLoaded: false });
      store.loadFromStorage();

      // ASSERT
      const reloaded = store.getDocument('doc-retention-persist');
      expect(reloaded).not.toBeNull();
      if (reloaded !== null) {
        expect(reloaded.retentionStatus).toBe('archived');
      }
    });
  });
});
