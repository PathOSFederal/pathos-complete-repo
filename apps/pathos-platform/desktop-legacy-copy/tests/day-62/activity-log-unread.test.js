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
  sourceJobId: "DAY-62-ACTIVITY",
  title: "Program Analyst",
  agency: "Department of Education",
  location: "Remote",
  grade: "GS-11",
  postingUrl: "https://www.usajobs.gov/job/55555",
  capturedAt: new Date().toISOString(),
  ...overrides,
});

beforeEach(function () {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-07T10:00:00Z"));
});

afterEach(function () {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Day 62 Activity Log unread lifecycle", function () {
  // ===============================================================
  // WHY: New selections should increment the Activity Log unread badge.
  // HOW: Add selections, mark read, and compare unread counts.
  // ===============================================================
  it("increments on new selections and clears only when marked read", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    selectionStore.addRecentSelection(buildSelection());
    let state = selectionStore.getState();
    let unread = store.calculateUnreadCount(
      state.recentSelections,
      state.lastSeenActivityAt
    );
    expect(unread).toBe(1);

    selectionStore.markActivityLogRead();
    state = selectionStore.getState();
    unread = store.calculateUnreadCount(
      state.recentSelections,
      state.lastSeenActivityAt
    );
    expect(unread).toBe(0);
    const lastSeen = state.lastSeenActivityAt;

    vi.setSystemTime(new Date("2026-02-07T10:05:00Z"));
    selectionStore.addRecentSelection(
      buildSelection({ sourceJobId: "DAY-62-ACTIVITY-2" })
    );
    state = selectionStore.getState();
    unread = store.calculateUnreadCount(
      state.recentSelections,
      state.lastSeenActivityAt
    );
    expect(state.lastSeenActivityAt).toBe(lastSeen);
    expect(unread).toBe(1);
  });

  // ===============================================================
  // WHY: Unread state must survive reloads for Day 62 persistence.
  // HOW: Rehydrate a store and recompute unread from persisted state.
  // ===============================================================
  it("persists unread state across reloads", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    selectionStore.addRecentSelection(buildSelection());
    selectionStore.markActivityLogRead();

    vi.setSystemTime(new Date("2026-02-07T10:10:00Z"));
    selectionStore.addRecentSelection(
      buildSelection({ sourceJobId: "DAY-62-ACTIVITY-3" })
    );

    const hydrated = store.createJobSelectionStore(storage);
    const hydratedState = hydrated.getState();
    const unread = store.calculateUnreadCount(
      hydratedState.recentSelections,
      hydratedState.lastSeenActivityAt
    );

    expect(unread).toBe(1);
  });
});
