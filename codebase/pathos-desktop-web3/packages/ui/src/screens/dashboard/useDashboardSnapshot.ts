/**
 * ============================================================================
 * USE DASHBOARD SNAPSHOT — "What changed since last visit" (SSR-safe)
 * ============================================================================
 *
 * PURPOSE: Compares current view model to last persisted snapshot and exposes
 * a small "changes" object (counts and short strings) for the dashboard UI.
 * Persists snapshot after render. No broken placeholders when no snapshot
 * exists: either hide the line or show a calm default.
 *
 * STORAGE KEYS (localStorage):
 * - pathos_dashboard_snapshot_v1 — last view model snapshot (JSON).
 * - pathos_dashboard_dismissed_focus_v1 — array of dismissed focus item ids (JSON).
 *
 * SSR: All localStorage access guarded with typeof window !== 'undefined'.
 */

import { useState, useEffect } from 'react';
import type { DashboardViewModel } from './dashboardModel';

/** Snapshot shape persisted to pathos_dashboard_snapshot_v1. */
export interface DashboardSnapshot {
  focusCount: number;
  trackCount: number;
  signalCount: number;
  lastUpdated: string;
  /** Serialized at save time for simple change detection. */
  focusIds: string[];
  signalIds: string[];
}

/** Small "changes since last visit" for UI. No broken placeholders. */
export interface DashboardChanges {
  /** True when we have a prior snapshot to compare against. */
  hasPriorVisit: boolean;
  /** Count of focus items that are new or changed since last snapshot. */
  focusChangedCount: number;
  /** Count of signals that are new since last snapshot. */
  signalsNewCount: number;
  /** Short summary line when there are changes; empty when none or no prior. */
  summaryLine: string;
}

const SNAPSHOT_KEY = 'pathos_dashboard_snapshot_v1';
const DISMISSED_KEY = 'pathos_dashboard_dismissed_focus_v1';

/**
 * Reduces view model to a comparable snapshot (no full payload in storage).
 */
export function viewModelToSnapshot(vm: DashboardViewModel): DashboardSnapshot {
  const focusIds: string[] = [];
  for (let i = 0; i < vm.focus.length; i++) {
    focusIds.push(vm.focus[i].id);
  }
  const signalIds: string[] = [];
  for (let i = 0; i < vm.signals.length; i++) {
    signalIds.push(vm.signals[i].id);
  }
  return {
    focusCount: vm.focus.length,
    trackCount: vm.tracks.length,
    signalCount: vm.signals.length,
    lastUpdated: vm.lastUpdated,
    focusIds,
    signalIds,
  };
}

export function loadSnapshotFromStorage(): DashboardSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (raw === null || raw === '') {
      return null;
    }
    const parsed = JSON.parse(raw) as DashboardSnapshot;
    if (
      typeof parsed.focusCount !== 'number' ||
      typeof parsed.trackCount !== 'number' ||
      typeof parsed.signalCount !== 'number' ||
      !Array.isArray(parsed.focusIds) ||
      !Array.isArray(parsed.signalIds)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Computes change counts and a short summary by comparing current snapshot
 * to prior. If no prior snapshot, returns hasPriorVisit: false and calm defaults.
 */
export function computeChanges(
  current: DashboardSnapshot,
  prior: DashboardSnapshot | null
): DashboardChanges {
  if (prior === null) {
    return {
      hasPriorVisit: false,
      focusChangedCount: 0,
      signalsNewCount: 0,
      summaryLine: '',
    };
  }

  let focusChangedCount = 0;
  const priorFocusIds = prior.focusIds;
  const priorSet: Record<string, boolean> = {};
  for (let i = 0; i < priorFocusIds.length; i++) {
    priorSet[priorFocusIds[i]] = true;
  }
  for (let i = 0; i < current.focusIds.length; i++) {
    const id = current.focusIds[i];
    if (!priorSet[id]) {
      focusChangedCount++;
    }
  }
  const currentSet: Record<string, boolean> = {};
  for (let i = 0; i < current.focusIds.length; i++) {
    currentSet[current.focusIds[i]] = true;
  }
  for (let i = 0; i < priorFocusIds.length; i++) {
    if (!currentSet[priorFocusIds[i]]) {
      focusChangedCount++;
    }
  }

  let signalsNewCount = 0;
  const priorSignalSet: Record<string, boolean> = {};
  for (let i = 0; i < prior.signalIds.length; i++) {
    priorSignalSet[prior.signalIds[i]] = true;
  }
  for (let i = 0; i < current.signalIds.length; i++) {
    if (!priorSignalSet[current.signalIds[i]]) {
      signalsNewCount++;
    }
  }

  let summaryLine = '';
  if (focusChangedCount > 0 || signalsNewCount > 0) {
    if (focusChangedCount > 0 && signalsNewCount > 0) {
      summaryLine = 'Resume, application, or timeline updates since last visit.';
    } else if (focusChangedCount > 0) {
      summaryLine = 'Resume or application focus changed since last visit.';
    } else {
      summaryLine = 'New timeline or readiness activity since last visit.';
    }
  }

  return {
    hasPriorVisit: true,
    focusChangedCount,
    signalsNewCount,
    summaryLine,
  };
}

/**
 * Filters focus items by dismissed ids.
 * Pure helper used by tests and any callers that want deterministic filtering.
 */
export function filterFocusByDismissedIds<T extends { id: string }>(
  focusItems: T[],
  dismissedIds: string[]
): T[] {
  const dismissedSet: Record<string, boolean> = {};
  for (let i = 0; i < dismissedIds.length; i++) {
    dismissedSet[dismissedIds[i]] = true;
  }
  const visible: T[] = [];
  for (let i = 0; i < focusItems.length; i++) {
    if (!dismissedSet[focusItems[i].id]) {
      visible.push(focusItems[i]);
    }
  }
  return visible;
}

export interface UseDashboardSnapshotResult {
  /** Changes since last visit; calm when no prior snapshot. */
  changes: DashboardChanges;
  /** Dismissed focus item ids (from pathos_dashboard_dismissed_focus_v1). */
  dismissedFocusIds: string[];
  /** Call to dismiss a focus item by id. */
  dismissFocusId: (id: string) => void;
  /** Call to undo dismiss (remove id from dismissed set). */
  undoDismissFocusId: (id: string) => void;
}

/**
 * Hook: provides changes since last visit and dismissed focus ids.
 * Updates snapshot in localStorage after the view model is applied (effect after render).
 * SSR-safe: no localStorage access on server.
 */
export function useDashboardSnapshot(
  viewModel: DashboardViewModel | null
): UseDashboardSnapshotResult {
  const [priorSnapshot, setPriorSnapshot] = useState<DashboardSnapshot | null>(null);
  const [dismissedFocusIds, setDismissedFocusIds] = useState<string[]>([]);

  // Sync from external system (localStorage) on mount; SSR-safe.
  useEffect(
    function () {
      if (typeof window === 'undefined') {
        return;
      }
      const prior = loadSnapshotFromStorage();
      setPriorSnapshot(prior);
    },
    []
  );

  // Sync dismissed ids from localStorage on mount; SSR-safe.
  useEffect(
    function () {
      if (typeof window === 'undefined') {
        return;
      }
      try {
        const raw = window.localStorage.getItem(DISMISSED_KEY);
        if (raw !== null && raw !== '') {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const ids: string[] = [];
            for (let i = 0; i < parsed.length; i++) {
              if (typeof parsed[i] === 'string') {
                ids.push(parsed[i]);
              }
            }
            setDismissedFocusIds(ids);
          }
        }
      } catch {
        // ignore
      }
    },
    []
  );

  const currentSnapshot =
    viewModel !== null ? viewModelToSnapshot(viewModel) : null;

  const changes: DashboardChanges =
    currentSnapshot !== null && priorSnapshot !== null
      ? computeChanges(currentSnapshot, priorSnapshot)
      : priorSnapshot !== null
        ? computeChanges(
            {
              focusCount: 0,
              trackCount: 0,
              signalCount: 0,
              lastUpdated: '',
              focusIds: [],
              signalIds: [],
            },
            priorSnapshot
          )
        : {
            hasPriorVisit: false,
            focusChangedCount: 0,
            signalsNewCount: 0,
            summaryLine: '',
          };

  const snapshotLastUpdated = currentSnapshot !== null ? currentSnapshot.lastUpdated : '';
  const snapshotFocusKey = currentSnapshot !== null ? currentSnapshot.focusIds.join(',') : '';
  const snapshotSignalKey = currentSnapshot !== null ? currentSnapshot.signalIds.join(',') : '';
  useEffect(
    function () {
      if (typeof window === 'undefined' || currentSnapshot === null) {
        return;
      }
      try {
        window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(currentSnapshot));
      } catch {
        // ignore
      }
    },
    // Intentionally use serialized keys so we don't re-run on every viewModel object reference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentSnapshot is derived from viewModel; keys are stable
    [snapshotLastUpdated, snapshotFocusKey, snapshotSignalKey]
  );

  function dismissFocusId(id: string) {
    if (typeof window === 'undefined') {
      return;
    }
    setDismissedFocusIds(function (prev) {
      const next: string[] = [];
      let found = false;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] === id) {
          found = true;
        } else {
          next.push(prev[i]);
        }
      }
      if (!found) {
        next.push(id);
      }
      try {
        window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function undoDismissFocusId(id: string) {
    if (typeof window === 'undefined') {
      return;
    }
    setDismissedFocusIds(function (prev) {
      const next: string[] = [];
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] !== id) {
          next.push(prev[i]);
        }
      }
      try {
        window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return {
    changes,
    dismissedFocusIds,
    dismissFocusId,
    undoDismissFocusId,
  };
}
