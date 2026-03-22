import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadResumeStore,
  saveResumeStore,
  updateDraft,
  createVersion,
  restoreVersion,
  deleteVersion,
  listVersions,
  exportResumeJSON,
  clearResumeData,
  RESUME_STORE_KEY,
  createDefaultDraft,
} from '@pathos/core';
import type { ResumeDraft } from '@pathos/core';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const fakeStorage: Record<string, string> = {};

beforeEach(function () {
  Object.keys(fakeStorage).forEach(function (k) { delete fakeStorage[k]; });
  Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: function (k: string) { return fakeStorage[k] ?? null; },
      setItem: function (k: string, v: string) { fakeStorage[k] = v; },
      removeItem: function (k: string) { delete fakeStorage[k]; },
    },
    writable: true,
    configurable: true,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resume-storage', function () {
  it('loads default empty store', function () {
    const store = loadResumeStore();
    expect(store.draft.contact.fullName).toBe('');
    expect(store.versions).toEqual([]);
  });

  it('updates draft and persists', function () {
    let store = loadResumeStore();
    const draft: ResumeDraft = { ...createDefaultDraft(), summary: 'Test summary' };
    store = updateDraft(store, draft);
    saveResumeStore(store);
    const reloaded = loadResumeStore();
    expect(reloaded.draft.summary).toBe('Test summary');
  });

  it('creates a version snapshot', function () {
    let store = loadResumeStore();
    const draft: ResumeDraft = { ...createDefaultDraft(), summary: 'Version 1 content' };
    store = updateDraft(store, draft);
    store = createVersion(store, 'v1');
    expect(store.versions.length).toBe(1);
    expect(store.versions[0].label).toBe('v1');
    expect(store.versions[0].snapshot.summary).toBe('Version 1 content');
  });

  it('restores a version to current draft', function () {
    let store = loadResumeStore();
    const draft1: ResumeDraft = { ...createDefaultDraft(), summary: 'Original' };
    store = updateDraft(store, draft1);
    store = createVersion(store, 'v1');
    const draft2: ResumeDraft = { ...createDefaultDraft(), summary: 'Modified' };
    store = updateDraft(store, draft2);
    expect(store.draft.summary).toBe('Modified');
    store = restoreVersion(store, store.versions[0].id);
    expect(store.draft.summary).toBe('Original');
  });

  it('deletes a version', function () {
    let store = loadResumeStore();
    store = createVersion(store, 'v1');
    store = createVersion(store, 'v2');
    expect(store.versions.length).toBe(2);
    store = deleteVersion(store, store.versions[0].id);
    expect(store.versions.length).toBe(1);
  });

  it('listVersions returns all versions', function () {
    let store = loadResumeStore();
    store = createVersion(store, 'v1');
    store = createVersion(store, 'v2');
    const versions = listVersions(store);
    expect(versions.length).toBe(2);
  });

  it('exports valid JSON', function () {
    let store = loadResumeStore();
    store = updateDraft(store, { ...createDefaultDraft(), summary: 'Export test' });
    store = createVersion(store, 'v1');
    const json = exportResumeJSON(store);
    const parsed = JSON.parse(json);
    expect(parsed.draft.summary).toBe('Export test');
    expect(parsed.versions.length).toBe(1);
  });

  it('clearResumeData wipes storage', function () {
    let store = loadResumeStore();
    store = updateDraft(store, { ...createDefaultDraft(), summary: 'Will be deleted' });
    saveResumeStore(store);
    const empty = clearResumeData();
    expect(empty.draft.summary).toBe('');
    expect(empty.versions).toEqual([]);
  });

  it('resets on schema version mismatch', function () {
    fakeStorage[RESUME_STORE_KEY] = JSON.stringify({ schemaVersion: 999, draft: {}, versions: [] });
    const store = loadResumeStore();
    expect(store.draft.summary).toBe('');
  });
});
