/**
 * ============================================================================
 * INDEXEDDB WRAPPER FOR BLOB STORAGE (Day 22 - Universal Document Import v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides a simple IndexedDB wrapper for storing binary file content (Blobs).
 * This is used by the document import feature to store PDF, DOCX, and TXT files
 * locally without hitting localStorage size limits.
 *
 * WHY INDEXEDDB:
 * - localStorage has a ~5MB limit per origin
 * - IndexedDB can store much larger amounts of data (browser-dependent, often 50MB+)
 * - IndexedDB natively supports Blob storage
 * - Files persist across page refreshes
 *
 * ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │   UI/Store      │ --> │   THIS FILE     │ --> │   IndexedDB    │
 * │  (Import docs)  │     │  (Wrapper)      │     │   (Browser)    │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *
 * KEY DESIGN DECISIONS:
 * 1. Single database (pathos-documents-db) with single object store (blobs)
 * 2. Documents keyed by unique ID (matches metadata in localStorage/Zustand)
 * 3. Stores Blob objects directly (no base64 encoding overhead)
 * 4. Provides simple CRUD: put, get, delete, clear
 *
 * HOUSE RULES COMPLIANCE (Day 22):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 22 - Universal Document Import v1
 * ============================================================================
 */

import { isBrowser } from '@/lib/storage';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * IndexedDB database name for document blobs.
 * Using a descriptive name that clearly identifies the purpose.
 */
export const DOCUMENT_DB_NAME = 'pathos-documents-db';

/**
 * Version number for the database schema.
 * Increment this if the object store structure changes.
 */
export const DOCUMENT_DB_VERSION = 1;

/**
 * Name of the object store that holds document blobs.
 */
export const DOCUMENT_STORE_NAME = 'blobs';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a stored document blob with metadata.
 *
 * DESIGN RATIONALE:
 * We store the blob along with basic metadata so we can reconstruct
 * a File object when needed (e.g., for viewing or downloading).
 */
export interface StoredDocumentBlob {
  /**
   * Unique document ID (matches metadata in Zustand store).
   * This is the primary key in IndexedDB.
   */
  id: string;

  /**
   * The binary content as a Blob.
   */
  blob: Blob;

  /**
   * Original filename for download/display purposes.
   */
  filename: string;

  /**
   * MIME type (e.g., 'application/pdf', 'text/plain').
   */
  mimeType: string;

  /**
   * File size in bytes.
   */
  sizeBytes: number;

  /**
   * ISO 8601 timestamp when the blob was stored.
   */
  storedAt: string;
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Opens (or creates) the IndexedDB database.
 *
 * HOW IT WORKS:
 * 1. Check if we're in a browser environment
 * 2. Call indexedDB.open() which returns an IDBOpenDBRequest
 * 3. Handle upgrade events to create object stores if needed
 * 4. Return a promise that resolves to the database instance
 *
 * WHY PROMISE WRAPPER:
 * IndexedDB uses an event-based API. Wrapping in a Promise makes it
 * easier to use with async/await and matches modern JavaScript patterns.
 *
 * @returns Promise resolving to IDBDatabase, or null if not supported
 */
export function openDocumentDB(): Promise<IDBDatabase | null> {
  return new Promise(function (resolve, reject) {
    // SSR guard - IndexedDB only exists in browsers
    if (!isBrowser()) {
      resolve(null);
      return;
    }

    // Check if IndexedDB is supported
    if (typeof indexedDB === 'undefined') {
      console.warn('[IndexedDB] IndexedDB is not supported in this environment');
      resolve(null);
      return;
    }

    // Open (or create) the database
    const request = indexedDB.open(DOCUMENT_DB_NAME, DOCUMENT_DB_VERSION);

    /**
     * onupgradeneeded fires when:
     * 1. Database doesn't exist yet (first time)
     * 2. Version number is higher than existing
     *
     * This is where we create object stores.
     */
    request.onupgradeneeded = function (event) {
      const target = event.target;
      if (target === null || target === undefined) {
        return;
      }
      const db = (target as IDBOpenDBRequest).result;

      // Create the blobs object store if it doesn't exist
      if (!db.objectStoreNames.contains(DOCUMENT_STORE_NAME)) {
        // keyPath: 'id' means each record's 'id' property is the primary key
        db.createObjectStore(DOCUMENT_STORE_NAME, { keyPath: 'id' });
      }
    };

    /**
     * onsuccess fires when the database is successfully opened.
     */
    request.onsuccess = function (event) {
      const target = event.target;
      if (target === null || target === undefined) {
        reject(new Error('Failed to get database from event'));
        return;
      }
      const db = (target as IDBOpenDBRequest).result;
      resolve(db);
    };

    /**
     * onerror fires if opening the database fails.
     * Common causes: user denied storage permission, private browsing mode.
     */
    request.onerror = function (event) {
      const target = event.target;
      if (target === null || target === undefined) {
        reject(new Error('IndexedDB open failed'));
        return;
      }
      const error = (target as IDBOpenDBRequest).error;
      console.error('[IndexedDB] Failed to open database:', error);
      reject(error);
    };
  });
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Stores a document blob in IndexedDB.
 *
 * HOW IT WORKS:
 * 1. Open the database
 * 2. Start a readwrite transaction
 * 3. Put the blob record (upsert - creates or updates)
 * 4. Return a promise that resolves when complete
 *
 * @param id - Unique document ID
 * @param blob - The Blob to store
 * @param filename - Original filename
 * @param mimeType - MIME type of the file
 * @returns Promise resolving to true on success, false on failure
 */
export async function putDocumentBlob(
  id: string,
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<boolean> {
  try {
    const db = await openDocumentDB();

    // SSR or IndexedDB not supported
    if (db === null) {
      console.warn('[IndexedDB] Database not available, cannot store blob');
      return false;
    }

    return new Promise(function (resolve, reject) {
      // Start a transaction on the blobs store
      const transaction = db.transaction(DOCUMENT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DOCUMENT_STORE_NAME);

      // Create the record to store
      const record: StoredDocumentBlob = {
        id: id,
        blob: blob,
        filename: filename,
        mimeType: mimeType,
        sizeBytes: blob.size,
        storedAt: new Date().toISOString(),
      };

      // Put the record (upsert)
      const request = store.put(record);

      request.onsuccess = function () {
        resolve(true);
      };

      request.onerror = function (event) {
        const target = event.target;
        if (target !== null && target !== undefined) {
          console.error('[IndexedDB] Failed to store blob:', (target as IDBRequest).error);
        }
        reject(new Error('Failed to store blob'));
      };

      // Close the database when transaction completes
      transaction.oncomplete = function () {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in putDocumentBlob:', error);
    return false;
  }
}

/**
 * Retrieves a document blob from IndexedDB.
 *
 * @param id - The document ID to retrieve
 * @returns Promise resolving to StoredDocumentBlob or null if not found
 */
export async function getDocumentBlob(id: string): Promise<StoredDocumentBlob | null> {
  try {
    const db = await openDocumentDB();

    // SSR or IndexedDB not supported
    if (db === null) {
      return null;
    }

    return new Promise(function (resolve, reject) {
      const transaction = db.transaction(DOCUMENT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(DOCUMENT_STORE_NAME);

      const request = store.get(id);

      request.onsuccess = function (event) {
        const target = event.target;
        if (target === null || target === undefined) {
          resolve(null);
          return;
        }
        const result = (target as IDBRequest).result;
        if (result === undefined || result === null) {
          resolve(null);
          return;
        }
        resolve(result as StoredDocumentBlob);
      };

      request.onerror = function (event) {
        const target = event.target;
        if (target !== null && target !== undefined) {
          console.error('[IndexedDB] Failed to get blob:', (target as IDBRequest).error);
        }
        reject(new Error('Failed to get blob'));
      };

      transaction.oncomplete = function () {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in getDocumentBlob:', error);
    return null;
  }
}

/**
 * Deletes a document blob from IndexedDB.
 *
 * @param id - The document ID to delete
 * @returns Promise resolving to true on success, false on failure
 */
export async function deleteDocumentBlob(id: string): Promise<boolean> {
  try {
    const db = await openDocumentDB();

    // SSR or IndexedDB not supported
    if (db === null) {
      return false;
    }

    return new Promise(function (resolve, reject) {
      const transaction = db.transaction(DOCUMENT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DOCUMENT_STORE_NAME);

      const request = store.delete(id);

      request.onsuccess = function () {
        resolve(true);
      };

      request.onerror = function (event) {
        const target = event.target;
        if (target !== null && target !== undefined) {
          console.error('[IndexedDB] Failed to delete blob:', (target as IDBRequest).error);
        }
        reject(new Error('Failed to delete blob'));
      };

      transaction.oncomplete = function () {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in deleteDocumentBlob:', error);
    return false;
  }
}

/**
 * Clears all document blobs from IndexedDB.
 * Called by "Delete All Local Data" feature.
 *
 * @returns Promise resolving to true on success, false on failure
 */
export async function clearAllDocumentBlobs(): Promise<boolean> {
  try {
    const db = await openDocumentDB();

    // SSR or IndexedDB not supported
    if (db === null) {
      return false;
    }

    return new Promise(function (resolve, reject) {
      const transaction = db.transaction(DOCUMENT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DOCUMENT_STORE_NAME);

      const request = store.clear();

      request.onsuccess = function () {
        resolve(true);
      };

      request.onerror = function (event) {
        const target = event.target;
        if (target !== null && target !== undefined) {
          console.error('[IndexedDB] Failed to clear blobs:', (target as IDBRequest).error);
        }
        reject(new Error('Failed to clear blobs'));
      };

      transaction.oncomplete = function () {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in clearAllDocumentBlobs:', error);
    return false;
  }
}

/**
 * Deletes the entire IndexedDB database.
 * More thorough than clearAllDocumentBlobs - removes the database itself.
 * Called by "Delete All Local Data" feature for complete cleanup.
 *
 * @returns Promise resolving to true on success, false on failure
 */
export async function deleteDocumentDatabase(): Promise<boolean> {
  // SSR guard
  if (!isBrowser()) {
    return false;
  }

  // Check if IndexedDB is supported
  if (typeof indexedDB === 'undefined') {
    return false;
  }

  return new Promise(function (resolve) {
    const request = indexedDB.deleteDatabase(DOCUMENT_DB_NAME);

    request.onsuccess = function () {
      resolve(true);
    };

    request.onerror = function (event) {
      const target = event.target;
      if (target !== null && target !== undefined) {
        console.error('[IndexedDB] Failed to delete database:', (target as IDBRequest).error);
      }
      resolve(false);
    };

    // onblocked fires if other tabs have the database open
    request.onblocked = function () {
      console.warn('[IndexedDB] Database deletion blocked - other tabs may have it open');
      // Still resolve false since deletion didn't complete
      resolve(false);
    };
  });
}

/**
 * Gets all document IDs stored in IndexedDB.
 * Useful for reconciling with metadata store.
 *
 * @returns Promise resolving to array of document IDs
 */
export async function getAllDocumentIds(): Promise<string[]> {
  try {
    const db = await openDocumentDB();

    // SSR or IndexedDB not supported
    if (db === null) {
      return [];
    }

    return new Promise(function (resolve, reject) {
      const transaction = db.transaction(DOCUMENT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(DOCUMENT_STORE_NAME);

      const request = store.getAllKeys();

      request.onsuccess = function (event) {
        const target = event.target;
        if (target === null || target === undefined) {
          resolve([]);
          return;
        }
        const keys = (target as IDBRequest).result;
        if (!Array.isArray(keys)) {
          resolve([]);
          return;
        }
        // Convert IDBValidKey[] to string[]
        const ids: string[] = [];
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (typeof key === 'string') {
            ids.push(key);
          }
        }
        resolve(ids);
      };

      request.onerror = function (event) {
        const target = event.target;
        if (target !== null && target !== undefined) {
          console.error('[IndexedDB] Failed to get all keys:', (target as IDBRequest).error);
        }
        reject(new Error('Failed to get all keys'));
      };

      transaction.oncomplete = function () {
        db.close();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error in getAllDocumentIds:', error);
    return [];
  }
}

/**
 * Creates a Blob URL for viewing/downloading a document.
 *
 * IMPORTANT: Caller is responsible for revoking the URL with URL.revokeObjectURL()
 * when done to prevent memory leaks.
 *
 * @param id - The document ID
 * @returns Promise resolving to Blob URL string, or null if not found
 */
export async function createDocumentBlobUrl(id: string): Promise<string | null> {
  const stored = await getDocumentBlob(id);
  if (stored === null) {
    return null;
  }
  return URL.createObjectURL(stored.blob);
}
