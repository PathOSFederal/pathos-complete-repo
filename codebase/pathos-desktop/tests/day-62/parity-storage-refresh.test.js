"use strict";

import { describe, it, expect } from "vitest";
import store from "../../src/renderer/selected-job-store.js";

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

describe("Day 62 docked vs detached selection parity", function () {
  // ===============================================================
  // WHY: Detached windows should rehydrate the same selected job.
  // HOW: Sync through storage and refresh the second instance.
  // ===============================================================
  it("refreshes selected job state from shared storage", function () {
    const storage = createMemoryStorage();
    const primaryStore = store.createSelectedJobStore(storage);
    const secondaryStore = store.createSelectedJobStore(storage);

    expect(secondaryStore.getState().selectedJob).toBeNull();

    primaryStore.setSelectedJob({
      source: "USAJOBS",
      sourceJobId: "999999",
      title: "Policy Analyst",
      agency: "Department of Energy",
      location: "Remote",
      grade: "GS-12",
      postingUrl: "https://www.usajobs.gov/job/999999",
      capturedAt: "2026-02-07T12:00:00Z",
    });

    secondaryStore.refreshFromStorage("day-62-parity");

    const hydrated = secondaryStore.getState().selectedJob;
    expect(hydrated).toBeTruthy();
    expect(hydrated.postingUrl).toBe("https://www.usajobs.gov/job/999999");
    expect(hydrated.title).toBe("Policy Analyst");
  });
});
