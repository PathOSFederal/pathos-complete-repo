"use strict";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

describe("selected job helpers", function () {
  it("extracts job ids from USAJOBS posting urls", function () {
    const cases = [
      { input: "https://www.usajobs.gov/job/123456789", expected: "123456789" },
      { input: "https://www.usajobs.gov/Job/987654321/", expected: "987654321" },
      { input: "https://www.usajobs.gov/Search/Results", expected: "" },
      { input: "https://example.com/job/123", expected: "" },
      { input: "", expected: "" },
    ];

    cases.forEach((testCase) => {
      expect(store.extractUsaJobsJobId(testCase.input)).toBe(testCase.expected);
    });
  });

  it("maps explore roles into selected jobs", function () {
    const role = {
      id: "role-2210",
      title: "IT Specialist",
      agency: "Department of Energy",
      location: "Austin, TX",
      gradeBand: "GS-12",
      usajobsUrl: "https://www.usajobs.gov/job/123456789",
    };

    const selected = store.buildSelectedJobFromExploreRole(role);

    expect(selected.source).toBe("Explore");
    expect(selected.sourceJobId).toBe("role-2210");
    expect(selected.title).toBe("IT Specialist");
    expect(selected.agency).toBe("Department of Energy");
    expect(selected.location).toBe("Austin, TX");
    expect(selected.grade).toBe("GS-12");
    expect(selected.postingUrl).toBe("https://www.usajobs.gov/job/123456789");
  });

  it("maps USAJOBS navigation into selected jobs", function () {
    const selected = store.buildSelectedJobFromUsaJobsNavigation({
      url: "https://www.usajobs.gov/job/456789123",
      title: "Policy Analyst",
      agency: "Department of the Interior",
    });

    expect(selected.source).toBe("USAJOBS");
    expect(selected.sourceJobId).toBe("456789123");
    expect(selected.title).toBe("Policy Analyst");
    expect(selected.agency).toBe("Department of the Interior");
    expect(selected.postingUrl).toBe("https://www.usajobs.gov/job/456789123");
  });

  it("drops generic USAJOBS titles", function () {
    const selected = store.buildSelectedJobFromUsaJobsNavigation({
      url: "https://www.usajobs.gov/job/123456789",
      title: "USAJOBS - Job Announcement",
    });

    expect(selected.title).toBe("");
  });

  it("uses document titles when payload titles are generic", function () {
    const selected = store.buildSelectedJobFromUsaJobsNavigation({
      url: "https://www.usajobs.gov/job/222333444",
      title: "USAJOBS - Job Announcement",
      docTitle: "Program Analyst",
      agency: "Department of Energy",
    });

    expect(selected.title).toBe("Program Analyst");
    expect(selected.agency).toBe("Department of Energy");
  });

  it("rejects generic USAJOBS titles", function () {
    expect(store.isGenericUsaJobsTitle("USAJOBS - Job Announcement")).toBe(true);
    expect(store.isGenericUsaJobsTitle("USAJOBS - Search")).toBe(true);
    expect(store.isGenericUsaJobsTitle("https://www.usajobs.gov/job/123456789")).toBe(true);
    expect(store.isGenericUsaJobsTitle("")).toBe(true);
  });

  it("accepts real USAJOBS titles", function () {
    expect(store.isGenericUsaJobsTitle("Policy Analyst")).toBe(false);
  });

  it("keeps existing good titles when candidate is generic", function () {
    const title = store.chooseUsaJobsTitle(
      "Policy Analyst",
      "USAJOBS - Job Announcement",
      "Selected USAJOBS posting"
    );

    expect(title).toBe("Policy Analyst");
  });

  it("prefers real titles over fallbacks", function () {
    const title = store.chooseUsaJobsTitle(
      "",
      "Program Analyst",
      "Selected USAJOBS posting"
    );

    expect(title).toBe("Program Analyst");
  });
});

describe("selected job store persistence", function () {
  it("round-trips selected job state through storage", function () {
    const storage = createMemoryStorage();
    const selectedJobStore = store.createSelectedJobStore(storage);
    const payload = {
      source: "Explore",
      sourceJobId: "ROLE-1",
      title: "Program Analyst",
      agency: "Department of Education",
      location: "Remote (United States)",
      grade: "GS-11",
      postingUrl: "https://www.usajobs.gov/job/555666777",
      capturedAt: "2026-02-06T12:00:00.000Z",
    };

    selectedJobStore.setSelectedJob(payload, "test-set");
    const hydrated = store.createSelectedJobStore(storage);

    expect(hydrated.getState().selectedJob.title).toBe("Program Analyst");
    expect(hydrated.getState().selectedJob.sourceJobId).toBe("ROLE-1");
  });

  it("accepts fallback url fields when setting selected job", function () {
    const storage = createMemoryStorage();
    const selectedJobStore = store.createSelectedJobStore(storage);
    const fallbacks = [
      { field: "announcementUrl", value: "https://example.gov/announcement/88" },
      { field: "usajobsUrl", value: "https://www.usajobs.gov/job/808080" },
      { field: "url", value: "https://example.gov/job/909090" },
    ];

    fallbacks.forEach((fallback) => {
      const entry = selectedJobStore.setSelectedJob({
        source: "Explore",
        sourceJobId: `ROLE-${fallback.field}`,
        title: "Program Analyst",
        postingUrl: " ",
        [fallback.field]: fallback.value,
      });
      expect(entry.postingUrl).toBe(fallback.value);
    });
  });

  it("rejects selected jobs without any usable url fields", function () {
    const storage = createMemoryStorage();
    const selectedJobStore = store.createSelectedJobStore(storage);
    const entry = selectedJobStore.setSelectedJob({
      source: "Explore",
      sourceJobId: "ROLE-NO-URL",
      title: "Program Analyst",
      postingUrl: " ",
      announcementUrl: " ",
      usajobsUrl: "",
      url: "",
      postingUri: "",
    });

    expect(entry).toBeNull();
    expect(selectedJobStore.getState().selectedJob).toBeNull();
  });

  it("clears selected jobs and persists the empty state", function () {
    const storage = createMemoryStorage();
    const selectedJobStore = store.createSelectedJobStore(storage);
    selectedJobStore.setSelectedJob({
      source: "USAJOBS",
      sourceJobId: "909090",
      title: "Systems Engineer",
      postingUrl: "https://www.usajobs.gov/job/909090",
      capturedAt: "2026-02-06T12:00:00.000Z",
    });

    selectedJobStore.clearSelectedJob("test-clear");
    const hydrated = store.createSelectedJobStore(storage);

    expect(hydrated.getState().selectedJob).toBeNull();
  });
});

describe("selected job store window export", function () {
  it("sets window export when window is available", async function () {
    const originalWindow = globalThis.window;
    globalThis.window = {};

    const imported = await import(
      "../../src/renderer/selected-job-store.js?window=1"
    );

    expect(globalThis.window.PathOSSelectedJobStore).toBe(imported.default);
    globalThis.window = originalWindow;
  });
});

beforeEach(function () {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-06T12:00:00Z"));
});

afterEach(function () {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
