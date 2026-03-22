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

const buildSelection = function (overrides) {
  const base = {
    source: "USAJOBS",
    sourceJobId: "12345",
    title: "Program Analyst",
    agency: "Department of Education",
    location: "Remote",
    grade: "GS-11",
    postingUrl: "https://www.usajobs.gov/job/12345",
    capturedAt: new Date().toISOString(),
  };
  if (overrides && typeof overrides === "object") {
    return Object.assign({}, base, overrides);
  }
  return base;
};

beforeEach(function () {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-06T12:00:00Z"));
});

afterEach(function () {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("job selection store recent selections", function () {
  it("dedupes recent selections and caps to max length", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    selectionStore.addRecentSelection(buildSelection({ title: "Program Analyst" }));
    selectionStore.addRecentSelection(buildSelection({ title: "Updated Analyst" }));

    let state = selectionStore.getState();
    expect(state.recentSelections.length).toBe(1);
    expect(state.recentSelections[0].title).toBe("Updated Analyst");

    for (let i = 0; i < store.MAX_RECENT_SELECTIONS + 5; i += 1) {
      selectionStore.addRecentSelection(
        buildSelection({
          sourceJobId: `ROLE-${i}`,
          postingUrl: `https://www.usajobs.gov/job/${10000 + i}`,
        })
      );
    }

    state = selectionStore.getState();
    expect(state.recentSelections.length).toBe(store.MAX_RECENT_SELECTIONS);
  });

  it("stores selection details for activity log rendering", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    const entry = selectionStore.addRecentSelection(
      buildSelection({
        title: "Program Analyst",
        agency: "Department of Education",
        location: "Remote",
      })
    );

    expect(entry.title).toBe("Program Analyst");
    expect(entry.reason).toBe("Selected job for review");
    expect(entry.agency).toBe("Department of Education");
    expect(entry.location).toBe("Remote");
    expect(entry.postingUrl).toBe("https://www.usajobs.gov/job/12345");
    expect(entry.source).toBe("USAJOBS");
    expect(selectionStore.getState().recentSelections[0].id).toBe(entry.id);
  });

  it("upgrades status from viewed to selected to promoted", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    const viewed = selectionStore.logJobViewed(
      buildSelection({ sourceJobId: "ROLE-50", title: "Role 50" })
    );
    const selected = selectionStore.logJobSelected(
      buildSelection({ sourceJobId: "ROLE-50", title: "Role 50" })
    );
    selectionStore.logJobPromoted(selected.id);
    const state = selectionStore.getState();

    expect(viewed.status).toBe("viewed");
    expect(state.recentSelections[0].status).toBe("promoted");
    expect(state.recentSelections[0].reason).toBe("Added to Resume & Career");
    expect(state.resumeTargets.length).toBe(1);
  });

  it("accepts selections with fallback url fields", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    const fallbackCases = [
      { field: "announcementUrl", value: "https://example.gov/announcement/1" },
      { field: "usajobsUrl", value: "https://www.usajobs.gov/job/555" },
      { field: "url", value: "https://example.gov/job/2" },
    ];

    fallbackCases.forEach((fallback) => {
      const entry = selectionStore.addRecentSelection(
        buildSelection({
          sourceJobId: `ROLE-${fallback.field}`,
          postingUrl: " ",
          [fallback.field]: fallback.value,
        })
      );
      expect(entry.postingUrl).toBe(fallback.value);
    });

    const state = selectionStore.getState();
    expect(state.recentSelections.length).toBe(fallbackCases.length);
  });

  it("rejects selections with no usable url fields", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    const entry = selectionStore.addRecentSelection(
      buildSelection({
        sourceJobId: "ROLE-NO-URL",
        postingUrl: " ",
        announcementUrl: " ",
        usajobsUrl: "",
        url: "",
        postingUri: "",
      })
    );

    expect(entry).toBeNull();
    expect(selectionStore.getState().recentSelections.length).toBe(0);
  });

  it("dedupes selections when fallback postingUrl matches", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    const sharedUrl = "https://www.usajobs.gov/job/777";

    selectionStore.addRecentSelection(
      buildSelection({
        sourceJobId: "",
        postingUrl: " ",
        url: sharedUrl,
        title: "Selected USAJOBS posting",
      })
    );
    selectionStore.addRecentSelection(
      buildSelection({
        sourceJobId: "",
        postingUrl: sharedUrl,
        title: "Program Analyst",
      })
    );

    const state = selectionStore.getState();
    expect(state.recentSelections.length).toBe(1);
    expect(state.recentSelections[0].title).toBe("Program Analyst");
  });

  it("keeps real titles when a generic fallback arrives", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    selectionStore.addRecentSelection(buildSelection({ title: "Program Analyst" }));
    selectionStore.addRecentSelection(
      buildSelection({ title: "Selected USAJOBS posting" })
    );

    const state = selectionStore.getState();
    expect(state.recentSelections[0].title).toBe("Program Analyst");
  });

  it("persists recent selections across reloads", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-1" }));
    selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-2" }));

    const hydrated = store.createJobSelectionStore(storage);
    expect(hydrated.getState().recentSelections.length).toBe(2);
  });
});

describe("job selection store resume targets", function () {
  it("adds resume targets only when explicitly requested", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    selectionStore.logJobSelected(buildSelection({ sourceJobId: "ROLE-10" }));

    expect(selectionStore.getState().resumeTargets.length).toBe(0);
  });

  it("persists resume targets and removes them", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    const entry = selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-11" }));

    selectionStore.addToResumeTargets(entry.id);
    let state = selectionStore.getState();
    expect(state.resumeTargets.length).toBe(1);

    const hydrated = store.createJobSelectionStore(storage);
    state = hydrated.getState();
    expect(state.resumeTargets.length).toBe(1);

    hydrated.removeFromResumeTargets(state.resumeTargets[0].id);
    expect(hydrated.getState().resumeTargets.length).toBe(0);
  });
});

describe("activity log resume events", function () {
  it("records resume export events in activity history", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    const entry = selectionStore.logResumeExported({ jobId: "EXPORT-99" });
    const state = selectionStore.getState();

    expect(entry.type).toBe("resume_event");
    expect(entry.status).toBe("exported");
    expect(entry.reason).toBe("Exported resume for USAJOBS");
    expect(state.activityEvents.length).toBe(1);
  });

  it("persists resume export events across reloads", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    selectionStore.logResumeExported({ jobId: "EXPORT-100" });
    const hydrated = store.createJobSelectionStore(storage);
    const state = hydrated.getState();

    expect(state.activityEvents.length).toBe(1);
    expect(state.activityEvents[0].jobId).toBe("EXPORT-100");
    expect(state.activityEvents[0].reason).toBe("Exported resume for USAJOBS");
  });
});

describe("job selection view models", function () {
  it("hides titles when privacy is enabled", function () {
    const selection = buildSelection({ title: "Hidden Role" });

    expect(store.buildSelectionDisplayTitle(selection, true)).toBe("Job selection hidden");
    expect(store.buildSelectionDisplayTitle(selection, false)).toBe("Hidden Role");
  });
});

describe("activity log unread tracking", function () {
  it("calculates unread count from lastSeenActivityAt", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-20" }));
    const state = selectionStore.getState();
    expect(store.calculateUnreadCount(state.recentSelections, state.lastSeenActivityAt)).toBe(1);

    selectionStore.markActivityLogRead();
    const nextState = selectionStore.getState();
    expect(store.calculateUnreadCount(nextState.recentSelections, nextState.lastSeenActivityAt)).toBe(
      0
    );
  });

  it("increments unread count after a new selection post-read", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-30" }));
    selectionStore.markActivityLogRead();
    vi.setSystemTime(new Date("2026-02-06T12:01:00Z"));
    selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-31" }));

    const state = selectionStore.getState();
    expect(store.calculateUnreadCount(state.recentSelections, state.lastSeenActivityAt)).toBe(1);
  });

  it("counts selections after lastSeenActivityAt", function () {
    const selections = [
      buildSelection({
        sourceJobId: "ROLE-40",
        capturedAt: "2026-02-06T11:59:00.000Z",
      }),
      buildSelection({
        sourceJobId: "ROLE-41",
        capturedAt: "2026-02-06T12:01:00.000Z",
      }),
    ];

    expect(
      store.calculateUnreadCount(selections, "2026-02-06T12:00:00.000Z")
    ).toBe(1);
  });

  it("counts resume events alongside job selections", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);

    selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-55" }));
    selectionStore.logResumeExported({ jobId: "ROLE-55" });
    const state = selectionStore.getState();
    const combined = state.recentSelections.concat(state.activityEvents);

    expect(store.calculateUnreadCount(combined, state.lastSeenActivityAt)).toBe(2);
  });

  it("persists lastSeenActivityAt", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    selectionStore.markActivityLogRead();

    const hydrated = store.createJobSelectionStore(storage);
    expect(hydrated.getState().lastSeenActivityAt).toBeTruthy();
  });
});

describe("resume badge tracking", function () {
  it("increments unread when a resume target is added", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    const entry = selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-70" }));

    selectionStore.addToResumeTargets(entry.id);
    const state = selectionStore.getState();

    expect(
      store.calculateResumeUnreadCount(state.resumeTargets, state.lastSeenResumeAt)
    ).toBe(1);
  });

  it("clears unread count after marking resume targets read", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    const entry = selectionStore.addRecentSelection(buildSelection({ sourceJobId: "ROLE-71" }));
    selectionStore.addToResumeTargets(entry.id);

    selectionStore.markResumeTargetsRead();
    const state = selectionStore.getState();

    expect(
      store.calculateResumeUnreadCount(state.resumeTargets, state.lastSeenResumeAt)
    ).toBe(0);
  });

  it("persists lastSeenResumeAt across reloads", function () {
    const storage = createMemoryStorage();
    const selectionStore = store.createJobSelectionStore(storage);
    selectionStore.markResumeTargetsRead();

    const hydrated = store.createJobSelectionStore(storage);
    expect(hydrated.getState().lastSeenResumeAt).toBeTruthy();
  });
});
