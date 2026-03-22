/**
 * ============================================================================
 * SSR-SAFE STORAGE HELPERS (Day 20)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides SSR-safe wrappers for localStorage access.
 * These helpers prevent "window is not defined" errors in Next.js SSR context.
 *
 * WHY THIS EXISTS:
 * Next.js pages can be server-rendered where `window` and `localStorage` do not exist.
 * These helpers check for browser environment before accessing storage.
 *
 * USAGE:
 * Instead of:
 *   localStorage.getItem('key')
 * Use:
 *   storageGet('key')
 *
 * NOTE:
 * This file provides infrastructure. Existing stores are NOT migrated yet.
 * Migration of existing localStorage calls is deferred to future work.
 *
 * @version Day 20 - Initial creation
 * ============================================================================
 */

/**
 * Check if code is running in a browser environment.
 *
 * WHY: In Next.js SSR, `window` is undefined. This helper allows safe checks
 * before accessing browser-only APIs like localStorage.
 *
 * @returns true if running in browser, false if SSR/Node
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * SSR-safe localStorage.getItem wrapper.
 *
 * @param key - The localStorage key to retrieve
 * @returns The stored value, or null if not found or in SSR context
 */
export function storageGet(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    // Handle cases where localStorage is disabled or quota exceeded
    console.error('[storage] Failed to get item:', key, error);
    return null;
  }
}

/**
 * SSR-safe localStorage.setItem wrapper.
 *
 * @param key - The localStorage key to set
 * @param value - The value to store
 * @returns true if successful, false if failed or in SSR context
 */
export function storageSet(key: string, value: string): boolean {
  if (!isBrowser()) {
    return false;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle cases where localStorage is disabled or quota exceeded
    console.error('[storage] Failed to set item:', key, error);
    return false;
  }
}

/**
 * SSR-safe localStorage.removeItem wrapper.
 *
 * @param key - The localStorage key to remove
 * @returns true if successful, false if failed or in SSR context
 */
export function storageRemove(key: string): boolean {
  if (!isBrowser()) {
    return false;
  }
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    // Handle cases where localStorage is disabled or access denied
    console.error('[storage] Failed to remove item:', key, error);
    return false;
  }
}

/**
 * SSR-safe JSON parse from localStorage.
 *
 * Convenience helper that combines storageGet + JSON.parse with error handling.
 *
 * @param key - The localStorage key to retrieve and parse
 * @param defaultValue - Value to return if key not found or parse fails
 * @returns Parsed value or defaultValue
 */
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

/**
 * SSR-safe JSON stringify + localStorage.setItem.
 *
 * Convenience helper that combines JSON.stringify + storageSet.
 *
 * @param key - The localStorage key to set
 * @param value - The value to stringify and store
 * @returns true if successful, false if failed
 */
export function storageSetJSON<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    return storageSet(key, serialized);
  } catch (error) {
    console.error('[storage] Failed to stringify value for key:', key, error);
    return false;
  }
}

