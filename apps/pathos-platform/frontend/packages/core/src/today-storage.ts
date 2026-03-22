/**
 * ============================================================================
 * TODAY STORAGE -- Lightweight daily checklist persistence
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

import { storageGetJSON, storageSetJSON } from './storage';
import type { TodayStore, TodayItem } from './today-types';
import { TODAY_SCHEMA_VERSION, createDefaultTodayItems } from './today-types';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

export const TODAY_STORE_KEY = 'pathos:today-store';

// ---------------------------------------------------------------------------
// Store read/write
// ---------------------------------------------------------------------------

function defaultStore(): TodayStore {
  return {
    schemaVersion: TODAY_SCHEMA_VERSION,
    items: [],
    lastViewedJobId: null,
  };
}

export function loadTodayStore(): TodayStore {
  const raw = storageGetJSON<Record<string, unknown>>(TODAY_STORE_KEY, {});
  if (!raw || raw.schemaVersion !== TODAY_SCHEMA_VERSION) {
    return defaultStore();
  }
  return raw as unknown as TodayStore;
}

export function saveTodayStore(store: TodayStore): boolean {
  const stamped: TodayStore = { ...store, schemaVersion: TODAY_SCHEMA_VERSION };
  return storageSetJSON(TODAY_STORE_KEY, stamped);
}

// ---------------------------------------------------------------------------
// Seed with defaults if empty
// ---------------------------------------------------------------------------

export function seedTodayIfEmpty(store: TodayStore): TodayStore {
  if (store.items.length > 0) return store;
  return { ...store, items: createDefaultTodayItems() };
}

// ---------------------------------------------------------------------------
// Item CRUD
// ---------------------------------------------------------------------------

function generateId(): string {
  return 'td-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

export function addTodayItem(store: TodayStore, title: string): TodayStore {
  const item: TodayItem = {
    id: generateId(),
    title: title,
    done: false,
    createdAt: new Date().toISOString(),
  };
  return { ...store, items: store.items.concat([item]) };
}

export function toggleTodayItem(store: TodayStore, itemId: string): TodayStore {
  return {
    ...store,
    items: store.items.map(function (item) {
      if (item.id !== itemId) return item;
      return { ...item, done: !item.done };
    }),
  };
}

export function removeTodayItem(store: TodayStore, itemId: string): TodayStore {
  return {
    ...store,
    items: store.items.filter(function (item) { return item.id !== itemId; }),
  };
}

export function clearCompletedItems(store: TodayStore): TodayStore {
  return {
    ...store,
    items: store.items.filter(function (item) { return !item.done; }),
  };
}

export function setLastViewedJob(store: TodayStore, jobId: string | null): TodayStore {
  return { ...store, lastViewedJobId: jobId };
}

export function clearTodayData(): TodayStore {
  const empty = defaultStore();
  storageSetJSON(TODAY_STORE_KEY, empty);
  return empty;
}

export function exportTodayJSON(store: TodayStore): string {
  return JSON.stringify(store, null, 2);
}
