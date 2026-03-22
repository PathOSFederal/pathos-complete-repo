import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadTodayStore,
  saveTodayStore,
  seedTodayIfEmpty,
  addTodayItem,
  toggleTodayItem,
  removeTodayItem,
  clearCompletedItems,
  setLastViewedJob,
  clearTodayData,
  exportTodayJSON,
  TODAY_STORE_KEY,
} from '@pathos/core';

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

describe('today-storage', function () {
  it('loads empty store by default', function () {
    const store = loadTodayStore();
    expect(store.items).toEqual([]);
    expect(store.lastViewedJobId).toBeNull();
  });

  it('seeds default items when empty', function () {
    let store = loadTodayStore();
    store = seedTodayIfEmpty(store);
    expect(store.items.length).toBe(3);
    expect(store.items[0].done).toBe(false);
  });

  it('does not re-seed when items exist', function () {
    let store = loadTodayStore();
    store = seedTodayIfEmpty(store);
    const count = store.items.length;
    store = seedTodayIfEmpty(store);
    expect(store.items.length).toBe(count);
  });

  it('adds a custom item', function () {
    let store = loadTodayStore();
    store = addTodayItem(store, 'Custom task');
    expect(store.items.length).toBe(1);
    expect(store.items[0].title).toBe('Custom task');
  });

  it('toggles item completion', function () {
    let store = loadTodayStore();
    store = addTodayItem(store, 'Toggle me');
    const id = store.items[0].id;
    store = toggleTodayItem(store, id);
    expect(store.items[0].done).toBe(true);
    store = toggleTodayItem(store, id);
    expect(store.items[0].done).toBe(false);
  });

  it('removes an item', function () {
    let store = loadTodayStore();
    store = addTodayItem(store, 'Remove me');
    const id = store.items[0].id;
    store = removeTodayItem(store, id);
    expect(store.items.length).toBe(0);
  });

  it('clears completed items', function () {
    let store = loadTodayStore();
    store = addTodayItem(store, 'Done task');
    store = addTodayItem(store, 'Open task');
    store = toggleTodayItem(store, store.items[0].id);
    store = clearCompletedItems(store);
    expect(store.items.length).toBe(1);
    expect(store.items[0].title).toBe('Open task');
  });

  it('persists and reloads', function () {
    let store = loadTodayStore();
    store = addTodayItem(store, 'Persist me');
    saveTodayStore(store);
    const reloaded = loadTodayStore();
    expect(reloaded.items.length).toBe(1);
  });

  it('sets lastViewedJobId', function () {
    let store = loadTodayStore();
    store = setLastViewedJob(store, 'job-123');
    expect(store.lastViewedJobId).toBe('job-123');
  });

  it('clearTodayData resets storage', function () {
    let store = loadTodayStore();
    store = addTodayItem(store, 'Wipe me');
    saveTodayStore(store);
    const empty = clearTodayData();
    expect(empty.items).toEqual([]);
  });

  it('exports valid JSON', function () {
    let store = loadTodayStore();
    store = seedTodayIfEmpty(store);
    const json = exportTodayJSON(store);
    const parsed = JSON.parse(json);
    expect(parsed.items.length).toBe(3);
  });

  it('resets on schema version mismatch', function () {
    fakeStorage[TODAY_STORE_KEY] = JSON.stringify({ schemaVersion: 999, items: [{ id: '1', title: 'x', done: false, createdAt: '' }], lastViewedJobId: null });
    const store = loadTodayStore();
    expect(store.items).toEqual([]);
  });
});
