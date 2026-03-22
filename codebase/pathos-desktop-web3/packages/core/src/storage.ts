/**
 * SSR-safe storage helpers for PathOS.
 * This file MUST NOT import from next/* or electron/*.
 */

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function storageGet(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('[storage] Failed to get item:', key, error);
    return null;
  }
}

export function storageSet(key: string, value: string): boolean {
  if (!isBrowser()) {
    return false;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('[storage] Failed to set item:', key, error);
    return false;
  }
}

export function storageRemove(key: string): boolean {
  if (!isBrowser()) {
    return false;
  }
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('[storage] Failed to remove item:', key, error);
    return false;
  }
}

export function storageGetJSON<T>(key: string, defaultValue: T): T {
  const stored = storageGet(key);
  if (stored === null || stored === '') {
    return defaultValue;
  }
  try {
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error('[storage] Failed to parse JSON for key:', key, error);
    return defaultValue;
  }
}

export function storageSetJSON<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    return storageSet(key, serialized);
  } catch (error) {
    console.error('[storage] Failed to stringify value for key:', key, error);
    return false;
  }
}
