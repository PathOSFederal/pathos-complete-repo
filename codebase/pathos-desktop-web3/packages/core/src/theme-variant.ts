/**
 * Theme variant storage and resolution helpers.
 * This file MUST NOT import from next/* or electron/*.
 */

import { storageGet, storageSet, storageRemove } from './storage';
import { THEME_VARIANT_STORAGE_KEY } from './storage-keys';

export type ThemeVariant = 'legacy' | 'mix' | 'shared';

export const DEFAULT_THEME_VARIANT: ThemeVariant = 'legacy';
export const THEME_VARIANTS: ThemeVariant[] = ['legacy', 'mix', 'shared'];
export const THEME_VARIANT_CHANGED_EVENT = 'pathos:theme-variant-changed';

export function isThemeVariant(value: unknown): value is ThemeVariant {
  return value === 'legacy' || value === 'mix' || value === 'shared';
}

export function parseThemeVariant(value: unknown): ThemeVariant | null {
  return isThemeVariant(value) ? value : null;
}

export function loadThemeVariantPreference(): ThemeVariant | null {
  return parseThemeVariant(storageGet(THEME_VARIANT_STORAGE_KEY));
}

export function saveThemeVariantPreference(themeVariant: ThemeVariant): boolean {
  const didSave = storageSet(THEME_VARIANT_STORAGE_KEY, themeVariant);
  if (didSave && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(THEME_VARIANT_CHANGED_EVENT, {
        detail: { themeVariant },
      })
    );
  }
  return didSave;
}

export function clearThemeVariantPreference(): boolean {
  const didClear = storageRemove(THEME_VARIANT_STORAGE_KEY);
  if (didClear && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(THEME_VARIANT_CHANGED_EVENT, {
        detail: { themeVariant: null },
      })
    );
  }
  return didClear;
}

export function resolveThemeVariant(input?: {
  queryTheme?: unknown;
  persistedTheme?: unknown;
  defaultTheme?: ThemeVariant;
}): ThemeVariant {
  const queryTheme = parseThemeVariant(input?.queryTheme);
  if (queryTheme !== null) {
    return queryTheme;
  }

  const persistedTheme = parseThemeVariant(input?.persistedTheme);
  if (persistedTheme !== null) {
    return persistedTheme;
  }

  return input?.defaultTheme ?? DEFAULT_THEME_VARIANT;
}
