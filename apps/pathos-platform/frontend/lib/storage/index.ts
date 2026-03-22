/**
 * ============================================================================
 * STORAGE LIBRARY BARREL EXPORT (Day 22)
 * ============================================================================
 *
 * Re-exports all storage-related utilities for convenient imports.
 *
 * @version Day 22 - Added IndexedDB wrapper
 * ============================================================================
 */

// SSR-safe localStorage helpers
export { isBrowser, storageGet, storageSet, storageRemove, storageGetJSON, storageSetJSON } from '../storage';

// IndexedDB wrapper for blob storage (Day 22)
export {
  DOCUMENT_DB_NAME,
  DOCUMENT_DB_VERSION,
  DOCUMENT_STORE_NAME,
  openDocumentDB,
  putDocumentBlob,
  getDocumentBlob,
  deleteDocumentBlob,
  clearAllDocumentBlobs,
  deleteDocumentDatabase,
  getAllDocumentIds,
  createDocumentBlobUrl,
} from './indexeddb';

export type { StoredDocumentBlob } from './indexeddb';
