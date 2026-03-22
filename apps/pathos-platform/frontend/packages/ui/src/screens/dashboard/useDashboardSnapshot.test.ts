import { describe, it, expect } from 'vitest';
import type { DashboardViewModel, FocusItem } from './dashboardModel';
import {
  filterFocusByDismissedIds,
  computeChanges,
  loadSnapshotFromStorage,
  viewModelToSnapshot,
} from './useDashboardSnapshot';

function makeViewModel(): DashboardViewModel {
  return {
    focus: [
      {
        id: 'focus-hero',
        title: 'Hero',
        reason: 'Reason',
        actionLabel: 'Do',
        actionRoute: '/dashboard/resume-builder',
        updatedAt: 'now',
      },
      {
        id: 'focus-small-0',
        title: 'Small',
        reason: 'Reason',
        actionLabel: 'Do',
        actionRoute: '/import',
        updatedAt: 'now',
      },
    ],
    tracks: [
      {
        id: 'track-a',
        type: 'applications',
        title: 'Applications',
        statusSummary: '1 tracked',
        route: '/import',
        updatedAt: 'now',
      },
    ],
    signals: [
      {
        id: 'signal-1',
        type: 'update',
        title: 'Update',
        detail: 'Detail',
        severity: 'info',
        updatedAt: 'now',
      },
    ],
    lastUpdated: 'now',
    updatesSinceVisit: [],
    readinessDeltas: [],
    timelineEstimates: [],
    timelineDisclaimer: '',
    timelineMethodology: '',
  };
}

describe('useDashboardSnapshot helpers', function () {
  it('filters dismissed focus ids from visible focus list', function () {
    const focus: FocusItem[] = makeViewModel().focus;
    const visible = filterFocusByDismissedIds(focus, ['focus-hero']);

    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('focus-small-0');
  });

  it('returns calm defaults when no prior snapshot exists', function () {
    const current = viewModelToSnapshot(makeViewModel());
    const changes = computeChanges(current, null);

    expect(changes.hasPriorVisit).toBe(false);
    expect(changes.focusChangedCount).toBe(0);
    expect(changes.signalsNewCount).toBe(0);
    expect(changes.summaryLine).toBe('');
  });

  it('returns changed indicators when prior snapshot differs', function () {
    const current = viewModelToSnapshot(makeViewModel());
    const prior = {
      focusCount: 1,
      trackCount: 1,
      signalCount: 0,
      lastUpdated: 'before',
      focusIds: ['focus-hero'],
      signalIds: [],
    };

    const changes = computeChanges(current, prior);

    expect(changes.hasPriorVisit).toBe(true);
    expect(changes.focusChangedCount + changes.signalsNewCount).toBeGreaterThan(0);
    expect(changes.summaryLine.length).toBeGreaterThan(0);
  });

  it('SSR guard path does not throw when window is undefined', function () {
    const globalRef = globalThis as { window?: unknown };
    const originalWindow = globalRef.window;
    delete globalRef.window;

    const run = function () {
      return loadSnapshotFromStorage();
    };

    expect(run).not.toThrow();
    expect(run()).toBeNull();

    if (originalWindow !== undefined) {
      globalRef.window = originalWindow;
    }
  });
});
