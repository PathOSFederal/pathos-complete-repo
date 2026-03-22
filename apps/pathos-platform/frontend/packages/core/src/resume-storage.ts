/**
 * ============================================================================
 * RESUME STORAGE -- Local-only resume draft + versioning persistence
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

import { storageGetJSON, storageSetJSON } from './storage';
import type { ResumeStore, ResumeDraft, ResumeVersion } from './resume-types';
import { RESUME_SCHEMA_VERSION, createDefaultDraft } from './resume-types';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

export const RESUME_STORE_KEY = 'pathos:resume-store';

// ---------------------------------------------------------------------------
// Store read/write
// ---------------------------------------------------------------------------

function defaultStore(): ResumeStore {
  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    draft: createDefaultDraft(),
    versions: [],
  };
}

export function loadResumeStore(): ResumeStore {
  const raw = storageGetJSON<Record<string, unknown>>(RESUME_STORE_KEY, {});
  if (!raw || raw.schemaVersion !== RESUME_SCHEMA_VERSION) {
    return defaultStore();
  }
  return raw as unknown as ResumeStore;
}

export function saveResumeStore(store: ResumeStore): boolean {
  const stamped: ResumeStore = { ...store, schemaVersion: RESUME_SCHEMA_VERSION };
  return storageSetJSON(RESUME_STORE_KEY, stamped);
}

// ---------------------------------------------------------------------------
// Draft helpers
// ---------------------------------------------------------------------------

export function updateDraft(store: ResumeStore, draft: ResumeDraft): ResumeStore {
  return { ...store, draft: draft };
}

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return 'rv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

export function createVersion(store: ResumeStore, label: string): ResumeStore {
  const version: ResumeVersion = {
    id: generateId(),
    label: label,
    createdAt: new Date().toISOString(),
    snapshot: JSON.parse(JSON.stringify(store.draft)),
  };
  return {
    ...store,
    versions: [version].concat(store.versions),
  };
}

export function restoreVersion(store: ResumeStore, versionId: string): ResumeStore {
  const version = store.versions.find(function (v) { return v.id === versionId; });
  if (!version) return store;
  return {
    ...store,
    draft: JSON.parse(JSON.stringify(version.snapshot)),
  };
}

export function deleteVersion(store: ResumeStore, versionId: string): ResumeStore {
  return {
    ...store,
    versions: store.versions.filter(function (v) { return v.id !== versionId; }),
  };
}

export function listVersions(store: ResumeStore): ResumeVersion[] {
  return store.versions;
}

// ---------------------------------------------------------------------------
// Export + clear
// ---------------------------------------------------------------------------

export function exportResumeJSON(store: ResumeStore): string {
  return JSON.stringify(store, null, 2);
}

export function clearResumeData(): ResumeStore {
  const empty = defaultStore();
  storageSetJSON(RESUME_STORE_KEY, empty);
  return empty;
}
