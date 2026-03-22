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
  sourceJobId: "DAY-62-ROLE",
  title: "Program Analyst",
  agency: "Department of Education",
  location: "Remote",
  grade: "GS-11",
  postingUrl: "https://www.usajobs.gov/job/12345",
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

describe("Day 62 job selection pipeline", function () {
  // ===============================================================
  // WHY: Activity Log depends on persisted recent selections.
  // HOW: Add a selection, then rehydrate a new store from storage.
  // ===============================================================
  it("creates a recent selection entry and persists it", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    const entry = selectionStore.addRecentSelection(buildSelection());

    expect(entry).toBeTruthy();
    expect(selectionStore.getState().recentSelections.length).toBe(1);
    expect(selectionStore.getState().recentSelections[0].postingUrl).toBe(
      "https://www.usajobs.gov/job/12345"
    );

    const hydrated = store.createJobSelectionStore(storage);
    const hydratedState = hydrated.getState();

    expect(hydratedState.recentSelections.length).toBe(1);
    expect(hydratedState.recentSelections[0].title).toBe("Program Analyst");
  });

  // ===============================================================
  // WHY: Day 62 normalization accepts multiple URL field names.
  // HOW: Supply each fallback field and confirm postingUrl is set.
  // ===============================================================
  it("normalizes postingUrl from fallback URL fields", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    const fallbackCases = [
      { field: "postingUrl", value: "https://example.gov/posting/1" },
      { field: "announcementUrl", value: "https://example.gov/announcement/2" },
      { field: "usajobsUrl", value: "https://www.usajobs.gov/job/333" },
      { field: "url", value: "https://example.gov/job/4" },
      { field: "postingUri", value: "https://example.gov/posting/5" },
    ];

    fallbackCases.forEach((fallback, index) => {
      const entry = selectionStore.addRecentSelection(
        buildSelection({
          sourceJobId: `DAY-62-ROLE-${index}`,
          postingUrl: " ",
          [fallback.field]: fallback.value,
        })
      );
      expect(entry).toBeTruthy();
      expect(entry.postingUrl).toBe(fallback.value);
    });

    expect(selectionStore.getState().recentSelections.length).toBe(
      fallbackCases.length
    );
  });

  // ===============================================================
  // WHY: Day 62 should reject selections that cannot be linked.
  // HOW: Provide blank URLs and assert nothing is recorded.
  // ===============================================================
  it("returns null when no usable url fields are present", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    const entry = selectionStore.addRecentSelection(
      buildSelection({
        postingUrl: " ",
        announcementUrl: "",
        usajobsUrl: "",
        url: "",
        postingUri: "",
      })
    );

    expect(entry).toBeNull();
    expect(selectionStore.getState().recentSelections.length).toBe(0);
  });
});
