/**
 * ============================================================================
 * PATH ADVISOR CONTEXT LOG STORE — Global append-only context log
 * ============================================================================
 *
 * PURPOSE: PathAdvisor behaves as a large, open "Context Log" across PathOS.
 * Each meaningful click (job select, dimension click, dashboard focus, etc.)
 * appends an entry. Entries are grouped by anchor (jobId/resumeId/cardId/screen)
 * with collapsible history per anchor. Dedupe prevents repeated identical clicks.
 *
 * GUARDRAILS:
 * 1) Dedupe: appendEntry accepts dedupeKey; if latest entry for that anchor
 *    has the same dedupeKey, do not append — set active and return.
 * 2) Grouping: UI (PathAdvisorCard) groups by anchorKey; only active anchor
 *    expanded by default; new entry makes that anchor active and expanded.
 *
 * SSR SAFETY: Guard any window/document usage with typeof window !== 'undefined'.
 * BOUNDARY: No next/* or electron/*. Uses const/let only; no ?. or ?? or spread.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types (deterministic, audit-friendly)
// ---------------------------------------------------------------------------

export type PathAdvisorAnchorType = 'job' | 'resume' | 'card' | 'screen' | 'other';

export interface PathAdvisorAnchor {
  type: PathAdvisorAnchorType;
  id: string;
  label: string;
}

export interface PathAdvisorContextSection {
  title?: string;
  lines?: string[];
  bullets?: string[];
  meta?: Record<string, string>;
}

export interface PathAdvisorContextCta {
  label: string;
  action: 'nav' | 'noop';
  route?: string;
}

export type PathAdvisorContextTag = 'localOnly' | 'demo' | 'explainability';

export interface PathAdvisorContextEntry {
  id: string;
  createdAtISO: string;
  screen: string;
  anchor: PathAdvisorAnchor;
  title: string;
  subtitle?: string;
  sections: PathAdvisorContextSection[];
  ctas?: PathAdvisorContextCta[];
  tags?: PathAdvisorContextTag[];
}

/** Key for grouping: `${screen}:${anchor.type}:${anchor.id}` */
export function buildAnchorKey(screen: string, anchor: PathAdvisorAnchor): string {
  return screen + ':' + anchor.type + ':' + anchor.id;
}

// ---------------------------------------------------------------------------
// Store state and actions
// ---------------------------------------------------------------------------

interface PathAdvisorContextLogState {
  /** Grouped by anchorKey. Each key maps to an array of entries (newest last). */
  entriesByAnchor: Record<string, PathAdvisorContextEntry[]>;
  /** Which anchor is currently "active" (expanded by default in UI). */
  activeAnchorKey: string | undefined;
  /**
   * Append an entry. If options.dedupeKey is set and the latest entry for
   * this anchorKey has the same dedupeKey, do not append; set active and return.
   * If options.makeActive !== false, set this anchor as active after append.
   */
  appendEntry: (
    entry: PathAdvisorContextEntry,
    options?: { dedupeKey?: string; makeActive?: boolean }
  ) => void;
  /** Remove all entries for one anchor. */
  clearAnchor: (anchorKey: string) => void;
  /** Remove all entries for one screen (all anchors under that screen). */
  clearScreen: (screen: string) => void;
  /** Remove all entries and clear active. */
  clearAll: () => void;
  /** Set which anchor is active (for UI expand/collapse). */
  setActiveAnchor: (anchorKey: string | undefined) => void;
}

export const usePathAdvisorContextLogStore = create<PathAdvisorContextLogState>(function (set) {
  return {
    entriesByAnchor: {},
    activeAnchorKey: undefined,

    appendEntry: function (entry, options) {
      const anchorKey = buildAnchorKey(entry.screen, entry.anchor);
      const makeActive = options === undefined || options.makeActive === undefined ? true : options.makeActive;
      const dedupeKey = options !== undefined ? options.dedupeKey : undefined;

      set(function (state) {
        const list = state.entriesByAnchor[anchorKey];
        const nextByAnchor = Object.assign({}, state.entriesByAnchor);

        if (dedupeKey !== undefined && dedupeKey !== '' && list !== undefined && list.length > 0) {
          const last = list[list.length - 1];
          const lastDedupe = (last as PathAdvisorContextEntry & { _dedupeKey?: string })._dedupeKey;
          if (lastDedupe === dedupeKey) {
            return {
              activeAnchorKey: makeActive ? anchorKey : state.activeAnchorKey,
            };
          }
        }

        const entryWithDedupe = Object.assign({}, entry) as PathAdvisorContextEntry & { _dedupeKey?: string };
        if (dedupeKey !== undefined) {
          entryWithDedupe._dedupeKey = dedupeKey;
        }

        const nextList = list !== undefined ? list.slice(0) : [];
        nextList.push(entryWithDedupe);
        nextByAnchor[anchorKey] = nextList;

        return {
          entriesByAnchor: nextByAnchor,
          activeAnchorKey: makeActive ? anchorKey : state.activeAnchorKey,
        };
      });
    },

    clearAnchor: function (anchorKey) {
      set(function (state) {
        const nextByAnchor = Object.assign({}, state.entriesByAnchor);
        delete nextByAnchor[anchorKey];
        const nextActive = state.activeAnchorKey === anchorKey ? undefined : state.activeAnchorKey;
        return {
          entriesByAnchor: nextByAnchor,
          activeAnchorKey: nextActive,
        };
      });
    },

    clearScreen: function (screen) {
      set(function (state) {
        const nextByAnchor = Object.assign({}, state.entriesByAnchor);
        const keys = Object.keys(nextByAnchor);
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (k !== undefined && k.indexOf(screen + ':') === 0) {
            delete nextByAnchor[k];
          }
        }
        const active = state.activeAnchorKey;
        const activeStillPresent = active !== undefined && nextByAnchor[active] !== undefined;
        return {
          entriesByAnchor: nextByAnchor,
          activeAnchorKey: activeStillPresent ? active : undefined,
        };
      });
    },

    clearAll: function () {
      set({
        entriesByAnchor: {},
        activeAnchorKey: undefined,
      });
    },

    setActiveAnchor: function (anchorKey) {
      set({ activeAnchorKey: anchorKey });
    },
  };
});

// ---------------------------------------------------------------------------
// Selectors (for UI: get entries for a screen, optionally by anchor)
// ---------------------------------------------------------------------------

/**
 * Get all anchor keys that have entries for the given screen.
 * Order: by first entry createdAtISO descending (most recent first).
 */
export function getAnchorKeysForScreen(
  entriesByAnchor: Record<string, PathAdvisorContextEntry[]>,
  screen: string
): string[] {
  const prefix = screen + ':';
  const keys: string[] = [];
  const keyList = Object.keys(entriesByAnchor);
  for (let i = 0; i < keyList.length; i++) {
    const k = keyList[i];
    if (k !== undefined && k.indexOf(prefix) === 0) {
      keys.push(k);
    }
  }
  keys.sort(function (a, b) {
    const listA = entriesByAnchor[a];
    const listB = entriesByAnchor[b];
    const lastA = listA !== undefined && listA.length > 0 ? listA[listA.length - 1] : undefined;
    const lastB = listB !== undefined && listB.length > 0 ? listB[listB.length - 1] : undefined;
    const isoA = lastA !== undefined ? lastA.createdAtISO : '';
    const isoB = lastB !== undefined ? lastB.createdAtISO : '';
    return isoB.localeCompare(isoA);
  });
  return keys;
}

/**
 * Get entries for one anchor (ordered by createdAtISO ascending).
 */
export function getEntriesForAnchor(
  entriesByAnchor: Record<string, PathAdvisorContextEntry[]>,
  anchorKey: string
): PathAdvisorContextEntry[] {
  const list = entriesByAnchor[anchorKey];
  if (list === undefined) return [];
  return list.slice(0);
}
