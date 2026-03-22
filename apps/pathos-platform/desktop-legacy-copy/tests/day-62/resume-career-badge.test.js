"use strict";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import store from "../../src/renderer/job-selection-store.js";

const createMemoryStorage = function () {
  const data = {};
  return {
    getItem: function (key) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        return data[key];
      }
      return null;
    },
    setItem: function (key, value) {
      data[key] = value;
    },
  };
};

const buildSelection = (overrides = {}) => ({
  source: "USAJOBS",
  sourceJobId: "DAY-62-RESUME",
  title: "Program Analyst",
  agency: "Department of Education",
  location: "Remote",
  grade: "GS-11",
  postingUrl: "https://www.usajobs.gov/job/88888",
  capturedAt: new Date().toISOString(),
  ...overrides,
});

beforeEach(function () {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-07T11:00:00Z"));
});

afterEach(function () {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Day 62 Resume & Career opt-in and badge", function () {
  // ===============================================================
  // WHY: Resume & Career requires explicit opt-in from job selection.
  // HOW: Add a selection, then add to resume targets explicitly.
  // ===============================================================
  it("adds resume targets only on explicit action", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    const entry = selectionStore.addRecentSelection(buildSelection());
    expect(selectionStore.getState().resumeTargets.length).toBe(0);

    selectionStore.addToResumeTargets(entry.id);
    expect(selectionStore.getState().resumeTargets.length).toBe(1);
  });

  // ===============================================================
  // WHY: Resume & Career badge tracks unread targets across reloads.
  // HOW: Add targets, mark read, then rehydrate to verify counts.
  // ===============================================================
  it("increments, clears on open, and persists unread counts", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    const first = selectionStore.addRecentSelection(buildSelection());
    selectionStore.addToResumeTargets(first.id);
    let state = selectionStore.getState();
    let unread = store.calculateResumeUnreadCount(
      state.resumeTargets,
      state.lastSeenResumeAt
    );
    expect(unread).toBe(1);

    selectionStore.markResumeTargetsRead();
    state = selectionStore.getState();
    unread = store.calculateResumeUnreadCount(
      state.resumeTargets,
      state.lastSeenResumeAt
    );
    expect(unread).toBe(0);

    vi.setSystemTime(new Date("2026-02-07T11:10:00Z"));
    const second = selectionStore.addRecentSelection(
      buildSelection({ sourceJobId: "DAY-62-RESUME-2" })
    );
    selectionStore.addToResumeTargets(second.id);
    state = selectionStore.getState();
    unread = store.calculateResumeUnreadCount(
      state.resumeTargets,
      state.lastSeenResumeAt
    );
    expect(unread).toBe(1);

    const hydrated = store.createJobSelectionStore(storage);
    const hydratedState = hydrated.getState();
    const hydratedUnread = store.calculateResumeUnreadCount(
      hydratedState.resumeTargets,
      hydratedState.lastSeenResumeAt
    );
    expect(hydratedUnread).toBe(1);
  });
});
