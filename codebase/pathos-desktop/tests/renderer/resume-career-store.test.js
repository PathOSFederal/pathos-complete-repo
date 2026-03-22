"use strict";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import store from "../../src/renderer/resume-career-store.js";

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

describe("resume career store actions", function () {
  // ===============================================================
  // WHY: Cover validation branches for resume creation.
  // HOW: Provide missing or invalid fields via public API calls.
  // ===============================================================
  it("handles missing job fields when creating a resume", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });

    const created = resumeStore.createResumeForJob({
      jobId: " ",
      announcementNumber: 123,
      title: null,
      agency: null,
      grade: 5,
    });

    expect(created).toBeTruthy();
    expect(typeof created.job.jobId).toBe("string");
    expect(created.job.jobId.trim()).toBeTruthy();
    expect(created.job.announcementNumber).toBe("");
    expect(created.job.title).toBe("Untitled Role");
    expect(created.job.agency).toBe("Agency");
    expect(created.job.grade).toBe("");
  });

  it("no-ops when createResumeForJob receives no job", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });

    const created = resumeStore.createResumeForJob(null);
    const state = resumeStore.getState();

    expect(created).toBeNull();
    expect(state.resumes.length).toBe(0);
  });

  it("creates and selects a resume for a job", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const job = {
      jobId: "ED-2026-0234",
      announcementNumber: "ED-2026-0234",
      title: "Program Analyst",
      agency: "Department of Education",
      grade: "GS-9",
    };

    const created = resumeStore.createResumeForJob(job);
    const state = resumeStore.getState();

    expect(created).toBeTruthy();
    expect(state.resumes.length).toBe(1);
    expect(state.activeResumeId).toBe(created.id);
  });

  it("selects an existing resume by id", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const first = resumeStore.createResumeForJob({
      jobId: "SELECT-1",
      announcementNumber: "SELECT-1",
      title: "First Role",
      agency: "Agency",
      grade: "GS-7",
    });
    const second = resumeStore.createResumeForJob({
      jobId: "SELECT-2",
      announcementNumber: "SELECT-2",
      title: "Second Role",
      agency: "Agency",
      grade: "GS-9",
    });

    resumeStore.selectResume(first.id);
    resumeStore.selectResume(second.id);
    const state = resumeStore.getState();

    expect(state.activeResumeId).toBe(second.id);
  });

  it("subscribes and unsubscribes listeners safely", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    let calls = 0;
    let lastReason = "";
    const listener = function (state, reason) {
      calls += 1;
      lastReason = reason;
    };

    const unsubscribe = resumeStore.subscribe(listener);
    resumeStore.createResumeForJob({
      jobId: "LISTENER-1",
      announcementNumber: "LISTENER-1",
      title: "Listener Role",
      agency: "Agency",
      grade: "GS-7",
    });
    unsubscribe();
    unsubscribe();
    resumeStore.createResumeForJob({
      jobId: "LISTENER-2",
      announcementNumber: "LISTENER-2",
      title: "Listener Role",
      agency: "Agency",
      grade: "GS-7",
    });

    expect(calls).toBe(1);
    expect(lastReason).toBe("create-resume");
  });

  it("archives resumes and blocks delete for non-draft", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "DRAFT-1",
      announcementNumber: "DRAFT-1",
      title: "Draft Role",
      agency: "Agency",
      grade: "GS-7",
    });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "APPLIED-1",
        announcementNumber: "APPLIED-1",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-9",
      },
      { status: "Applied" }
    );

    resumeStore.archiveResume(draft.id);
    resumeStore.deleteResume(applied.id);
    const state = resumeStore.getState();

    const draftEntry = state.resumes.find(function (resume) {
      return resume.id === draft.id;
    });

    expect(draftEntry.status).toBe("Archived");
    expect(state.resumes.length).toBe(2);
  });

  it("records export metadata", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const created = resumeStore.createResumeForJob({
      jobId: "EXPORT-1",
      announcementNumber: "EXPORT-1",
      title: "Export Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.exportResume(created.id);
    const state = resumeStore.getState();
    const entry = state.resumes.find(function (resume) {
      return resume.id === created.id;
    });

    expect(entry.lastExportedAt).toBeTruthy();
    expect(entry.lastExportedFile).toMatch(/Export-Role/);
  });

  it("no-ops export for an unknown resume id", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const created = resumeStore.createResumeForJob({
      jobId: "EXPORT-2",
      announcementNumber: "EXPORT-2",
      title: "Export Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.exportResume("missing");
    const state = resumeStore.getState();
    const entry = state.resumes.find(function (resume) {
      return resume.id === created.id;
    });

    expect(entry.lastExportedAt).toBeNull();
    expect(entry.lastExportedFile).toBe("");
  });

  it("creates a new version when applied resumes are updated", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "APPLIED-2",
        announcementNumber: "APPLIED-2",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-11",
      },
      { status: "Applied" }
    );

    resumeStore.applyPromptUpdate(applied.id, "Update experience bullets");
    const state = resumeStore.getState();
    const active = state.resumes.find(function (resume) {
      return resume.id === state.activeResumeId;
    });

    expect(state.resumes.length).toBe(2);
    expect(active.version).toBe(applied.version + 1);
    expect(active.status).toBe("Draft");
  });

  // ===============================================================
  // WHY: Ensure prompt updates no-op safely when needed.
  // HOW: Use unknown IDs and confirm state is unchanged.
  // ===============================================================
  it("no-ops prompt updates for unknown resume ids", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    resumeStore.createResumeForJob({
      jobId: "PROMPT-1",
      announcementNumber: "PROMPT-1",
      title: "Prompt Role",
      agency: "Agency",
      grade: "GS-9",
    });

    resumeStore.applyPromptUpdate("missing", "Update");
    const state = resumeStore.getState();

    expect(state.resumes.length).toBe(1);
    expect(state.promptLog.length).toBe(0);
  });

  it("updates draft resumes in place", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "DRAFT-2",
      announcementNumber: "DRAFT-2",
      title: "Draft Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.applyPromptUpdate(draft.id, "Tighten summary");
    const state = resumeStore.getState();
    const active = state.resumes.find(function (resume) {
      return resume.id === draft.id;
    });

    expect(state.resumes.length).toBe(1);
    expect(active.updatedAt).toBeTruthy();
  });

  it("keeps prompt log unchanged for empty prompt updates", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "PROMPT-2",
      announcementNumber: "PROMPT-2",
      title: "Draft Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.applyPromptUpdate(draft.id, "   ");
    const state = resumeStore.getState();

    expect(state.promptLog.length).toBe(0);
  });

  it("preserves applied resumes when creating a new draft version", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "APPLIED-3",
        announcementNumber: "APPLIED-3",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-12",
      },
      { status: "Applied" }
    );

    resumeStore.applyPromptUpdate(applied.id, "Add metrics");
    const state = resumeStore.getState();
    const appliedEntry = state.resumes.find(function (resume) {
      return resume.id === applied.id;
    });

    expect(state.resumes.length).toBe(2);
    expect(appliedEntry.status).toBe("Applied");
  });

  // ===============================================================
  // WHY: Validate archive/delete no-op behavior for unknown IDs.
  // HOW: Use non-existent IDs and confirm state stays stable.
  // ===============================================================
  it("archives a draft resume and leaves unknown ids unchanged", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "ARCHIVE-1",
      announcementNumber: "ARCHIVE-1",
      title: "Archive Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.archiveResume(draft.id);
    resumeStore.archiveResume("missing");
    const state = resumeStore.getState();
    const entry = state.resumes.find(function (resume) {
      return resume.id === draft.id;
    });

    expect(entry.status).toBe("Archived");
  });

  it("deletes draft resumes but blocks applied deletes and unknown ids", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "DELETE-1",
      announcementNumber: "DELETE-1",
      title: "Delete Role",
      agency: "Agency",
      grade: "GS-7",
    });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "DELETE-2",
        announcementNumber: "DELETE-2",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-9",
      },
      { status: "Applied" }
    );

    resumeStore.deleteResume("missing");
    resumeStore.deleteResume(applied.id);
    resumeStore.deleteResume(draft.id);
    const state = resumeStore.getState();

    expect(state.resumes.length).toBe(1);
    expect(state.resumes[0].id).toBe(applied.id);
  });
});

// ===============================================================
// WHY: Validate resume career persistence behavior.
// HOW: Round-trip through storage and handle malformed data.
// ===============================================================
describe("resume career store persistence", function () {
  it("round-trips state through serialize and hydrate", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const created = resumeStore.createResumeForJob({
      jobId: "ROUNDTRIP-1",
      announcementNumber: "ROUNDTRIP-1",
      title: "Round Trip Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.applyPromptUpdate(created.id, "Add measurable impact");
    store.persistResumeCareerState(storage, resumeStore.getState());
    const hydrated = store.loadResumeCareerState(storage, false);

    expect(hydrated.resumes.length).toBe(1);
    expect(hydrated.resumes[0].job.jobId).toBe("ROUNDTRIP-1");
    expect(hydrated.promptLog.length).toBe(1);
    expect(hydrated.activeResumeId).toBe(hydrated.resumes[0].id);
  });

  it("seeds sample resumes when configured", function () {
    const storage = createMemoryStorage();
    const seeded = store.loadResumeCareerState(storage, true);

    expect(seeded.resumes.length).toBe(2);
    expect(seeded.activeResumeId).toBe(seeded.resumes[0].id);
  });

  it("handles empty or malformed localStorage safely", function () {
    const storage = createMemoryStorage();
    const emptyHydrated = store.loadResumeCareerState(storage, false);

    storage.setItem(store.RESUME_CAREER_STORAGE_KEY, "{");
    const malformedHydrated = store.loadResumeCareerState(storage, false);

    expect(emptyHydrated.resumes.length).toBe(0);
    expect(emptyHydrated.activeResumeId).toBeNull();
    expect(malformedHydrated.resumes.length).toBe(0);
    expect(malformedHydrated.activeResumeId).toBeNull();
  });
});

// ===============================================================
// WHY: Exercise helper branches in state sanitization.
// HOW: Provide malformed snapshots and ensure safe defaults.
// ===============================================================
describe("resume career state helpers", function () {
  it("sanitizes malformed resume snapshots", function () {
    const sanitized = store.sanitizeResumeCareerState({
      resumes: [
        {
          id: 99,
          job: { jobId: 10, announcementNumber: null, title: 77 },
          status: "Unknown",
          version: "2",
          createdAt: 123,
          updatedAt: 456,
          lastExportedAt: 789,
          lastExportedFile: 1011,
          workExperience: [
            "not-an-object",
            { id: 1, duties: ["ok", 2, null] },
          ],
          education: null,
        },
      ],
      activeResumeId: "missing",
      promptLog: [
        null,
        {
          id: 5,
          resumeId: null,
          prompt: 12,
          createdAt: 99,
        },
      ],
    });

    expect(sanitized.resumes.length).toBe(1);
    expect(sanitized.resumes[0].status).toBe("Draft");
    expect(sanitized.resumes[0].workExperience.length).toBe(1);
    expect(sanitized.promptLog.length).toBe(1);
    expect(sanitized.activeResumeId).toBe(sanitized.resumes[0].id);
  });

  it("sets window export when window is available", async function () {
    const originalWindow = globalThis.window;
    globalThis.window = {};

    const imported = await import(
      "../../src/renderer/resume-career-store.js?window=1"
    );

    expect(globalThis.window.PathOSResumeCareerStore).toBe(imported.default);
    globalThis.window = originalWindow;
  });
});
"use strict";

// ===============================================================
// WHY: Resume career logic depends on timestamps and random IDs.
// HOW: Freeze Date and Math.random to keep tests deterministic.
// ===============================================================
let randomSeed = 0;

beforeEach(function () {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-05T12:00:00Z"));
  randomSeed = 0;
  vi.spyOn(Math, "random").mockImplementation(function () {
    randomSeed += 1;
    return randomSeed / 1000;
  });
});

afterEach(function () {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("resume career store actions", function () {
  // ===============================================================
  // WHY: Cover validation branches for resume creation.
  // HOW: Provide missing or invalid fields via public API calls.
  // ===============================================================
  it("handles missing job fields when creating a resume", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });

    const created = resumeStore.createResumeForJob({
      jobId: " ",
      announcementNumber: 123,
      title: null,
      agency: null,
      grade: 5,
    });

    expect(created).toBeTruthy();
    expect(typeof created.job.jobId).toBe("string");
    expect(created.job.jobId.trim()).toBeTruthy();
    expect(created.job.announcementNumber).toBe("");
    expect(created.job.title).toBe("Untitled Role");
    expect(created.job.agency).toBe("Agency");
    expect(created.job.grade).toBe("");
  });

  it("no-ops when createResumeForJob receives no job", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });

    const created = resumeStore.createResumeForJob(null);
    const state = resumeStore.getState();

    expect(created).toBeNull();
    expect(state.resumes.length).toBe(0);
  });

  it("creates and selects a resume for a job", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const job = {
      jobId: "ED-2026-0234",
      announcementNumber: "ED-2026-0234",
      title: "Program Analyst",
      agency: "Department of Education",
      grade: "GS-9",
    };

    const created = resumeStore.createResumeForJob(job);
    const state = resumeStore.getState();

    expect(created).toBeTruthy();
    expect(state.resumes.length).toBe(1);
    expect(state.activeResumeId).toBe(created.id);
  });

  it("selects an existing resume by id", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const first = resumeStore.createResumeForJob({
      jobId: "SELECT-1",
      announcementNumber: "SELECT-1",
      title: "First Role",
      agency: "Agency",
      grade: "GS-7",
    });
    const second = resumeStore.createResumeForJob({
      jobId: "SELECT-2",
      announcementNumber: "SELECT-2",
      title: "Second Role",
      agency: "Agency",
      grade: "GS-9",
    });

    resumeStore.selectResume(first.id);
    resumeStore.selectResume(second.id);
    const state = resumeStore.getState();

    expect(state.activeResumeId).toBe(second.id);
  });

  // ===============================================================
  // WHY: Ensure selectResume no-ops for missing IDs.
  // HOW: Attempt selection with an unknown id and confirm no change.
  // ===============================================================
  it("does not change active resume when selection id is missing", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const created = resumeStore.createResumeForJob({
      jobId: "SELECT-MISS",
      announcementNumber: "SELECT-MISS",
      title: "Only Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.selectResume("missing");
    const state = resumeStore.getState();

    expect(state.activeResumeId).toBe(created.id);
  });

  it("subscribes and unsubscribes listeners safely", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    let calls = 0;
    let lastReason = "";
    const listener = function (state, reason) {
      calls += 1;
      lastReason = reason;
    };

    const unsubscribe = resumeStore.subscribe(listener);
    resumeStore.createResumeForJob({
      jobId: "LISTENER-1",
      announcementNumber: "LISTENER-1",
      title: "Listener Role",
      agency: "Agency",
      grade: "GS-7",
    });
    unsubscribe();
    unsubscribe();
    resumeStore.createResumeForJob({
      jobId: "LISTENER-2",
      announcementNumber: "LISTENER-2",
      title: "Listener Role",
      agency: "Agency",
      grade: "GS-7",
    });

    expect(calls).toBe(1);
    expect(lastReason).toBe("create-resume");
  });

  it("archives resumes and blocks delete for non-draft", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "DRAFT-1",
      announcementNumber: "DRAFT-1",
      title: "Draft Role",
      agency: "Agency",
      grade: "GS-7",
    });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "APPLIED-1",
        announcementNumber: "APPLIED-1",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-9",
      },
      { status: "Applied" }
    );

    resumeStore.archiveResume(draft.id);
    resumeStore.deleteResume(applied.id);
    const state = resumeStore.getState();

    const draftEntry = state.resumes.find(function (resume) {
      return resume.id === draft.id;
    });

    expect(draftEntry.status).toBe("Archived");
    expect(state.resumes.length).toBe(2);
  });

  it("records export metadata", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const created = resumeStore.createResumeForJob({
      jobId: "EXPORT-1",
      announcementNumber: "EXPORT-1",
      title: "Export Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.exportResume(created.id);
    const state = resumeStore.getState();
    const entry = state.resumes.find(function (resume) {
      return resume.id === created.id;
    });

    expect(entry.lastExportedAt).toBeTruthy();
    expect(entry.lastExportedFile).toMatch(/Export-Role/);
  });

  it("no-ops export for an unknown resume id", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const created = resumeStore.createResumeForJob({
      jobId: "EXPORT-2",
      announcementNumber: "EXPORT-2",
      title: "Export Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.exportResume("missing");
    const state = resumeStore.getState();
    const entry = state.resumes.find(function (resume) {
      return resume.id === created.id;
    });

    expect(entry.lastExportedAt).toBeNull();
    expect(entry.lastExportedFile).toBe("");
  });

  it("creates a new version when applied resumes are updated", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "APPLIED-2",
        announcementNumber: "APPLIED-2",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-11",
      },
      { status: "Applied" }
    );

    resumeStore.applyPromptUpdate(applied.id, "Update experience bullets");
    const state = resumeStore.getState();
    const active = state.resumes.find(function (resume) {
      return resume.id === state.activeResumeId;
    });

    expect(state.resumes.length).toBe(2);
    expect(active.version).toBe(applied.version + 1);
    expect(active.status).toBe("Draft");
  });

  // ===============================================================
  // WHY: Cover the safeEntry guard in applied update cloning.
  // HOW: Inject invalid work experience entries before updating.
  // ===============================================================
  it("skips invalid work entries when cloning applied resumes", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "APPLIED-4",
        announcementNumber: "APPLIED-4",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-12",
      },
      { status: "Applied" }
    );

    resumeStore.getState().resumes[0].workExperience = [null];
    resumeStore.applyPromptUpdate(applied.id, "Trim bullets");
    const state = resumeStore.getState();
    const active = state.resumes.find(function (resume) {
      return resume.id === state.activeResumeId;
    });

    expect(active.workExperience.length).toBe(0);
    expect(state.resumes.length).toBe(2);
  });

  // ===============================================================
  // WHY: Ensure prompt updates no-op safely when needed.
  // HOW: Use unknown IDs and confirm state is unchanged.
  // ===============================================================
  it("no-ops prompt updates for unknown resume ids", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    resumeStore.createResumeForJob({
      jobId: "PROMPT-1",
      announcementNumber: "PROMPT-1",
      title: "Prompt Role",
      agency: "Agency",
      grade: "GS-9",
    });

    resumeStore.applyPromptUpdate("missing", "Update");
    const state = resumeStore.getState();

    expect(state.resumes.length).toBe(1);
    expect(state.promptLog.length).toBe(0);
  });

  it("updates draft resumes in place", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "DRAFT-2",
      announcementNumber: "DRAFT-2",
      title: "Draft Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.applyPromptUpdate(draft.id, "Tighten summary");
    const state = resumeStore.getState();
    const active = state.resumes.find(function (resume) {
      return resume.id === draft.id;
    });

    expect(state.resumes.length).toBe(1);
    expect(active.updatedAt).toBeTruthy();
  });

  it("keeps prompt log unchanged for empty prompt updates", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "PROMPT-2",
      announcementNumber: "PROMPT-2",
      title: "Draft Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.applyPromptUpdate(draft.id, "   ");
    const state = resumeStore.getState();

    expect(state.promptLog.length).toBe(0);
  });

  it("preserves applied resumes when creating a new draft version", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "APPLIED-3",
        announcementNumber: "APPLIED-3",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-12",
      },
      { status: "Applied" }
    );

    resumeStore.applyPromptUpdate(applied.id, "Add metrics");
    const state = resumeStore.getState();
    const appliedEntry = state.resumes.find(function (resume) {
      return resume.id === applied.id;
    });

    expect(state.resumes.length).toBe(2);
    expect(appliedEntry.status).toBe("Applied");
  });

  // ===============================================================
  // WHY: Validate archive/delete no-op behavior for unknown IDs.
  // HOW: Use non-existent IDs and confirm state stays stable.
  // ===============================================================
  it("archives a draft resume and leaves unknown ids unchanged", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "ARCHIVE-1",
      announcementNumber: "ARCHIVE-1",
      title: "Archive Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.archiveResume(draft.id);
    resumeStore.archiveResume("missing");
    const state = resumeStore.getState();
    const entry = state.resumes.find(function (resume) {
      return resume.id === draft.id;
    });

    expect(entry.status).toBe("Archived");
  });

  it("deletes draft resumes but blocks applied deletes and unknown ids", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const draft = resumeStore.createResumeForJob({
      jobId: "DELETE-1",
      announcementNumber: "DELETE-1",
      title: "Delete Role",
      agency: "Agency",
      grade: "GS-7",
    });
    const applied = resumeStore.createResumeForJob(
      {
        jobId: "DELETE-2",
        announcementNumber: "DELETE-2",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-9",
      },
      { status: "Applied" }
    );

    resumeStore.deleteResume("missing");
    resumeStore.deleteResume(applied.id);
    resumeStore.deleteResume(draft.id);
    const state = resumeStore.getState();

    expect(state.resumes.length).toBe(1);
    expect(state.resumes[0].id).toBe(applied.id);
  });

  // ===============================================================
  // WHY: Ensure deleting the active resume updates selection.
  // HOW: Delete the selected draft and confirm fallback selection.
  // ===============================================================
  it("reassigns active resume when the selected draft is deleted", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const first = resumeStore.createResumeForJob({
      jobId: "ACTIVE-1",
      announcementNumber: "ACTIVE-1",
      title: "Active Role",
      agency: "Agency",
      grade: "GS-7",
    });
    const second = resumeStore.createResumeForJob({
      jobId: "ACTIVE-2",
      announcementNumber: "ACTIVE-2",
      title: "Backup Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.selectResume(first.id);
    resumeStore.deleteResume(first.id);
    const state = resumeStore.getState();

    expect(state.resumes.length).toBe(1);
    expect(state.activeResumeId).toBe(second.id);
  });
});

// ===============================================================
// WHY: Validate resume career persistence behavior.
// HOW: Round-trip through storage and handle malformed data.
// ===============================================================
describe("resume career store persistence", function () {
  // ===============================================================
  // WHY: Cover default seeding behavior in store creation.
  // HOW: Create the store without explicit options.
  // ===============================================================
  it("seeds resumes by default when storage is empty", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage);
    const state = resumeStore.getState();

    expect(state.resumes.length).toBe(2);
    expect(state.activeResumeId).toBe(state.resumes[0].id);
  });

  it("round-trips state through serialize and hydrate", function () {
    const storage = createMemoryStorage();
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const created = resumeStore.createResumeForJob({
      jobId: "ROUNDTRIP-1",
      announcementNumber: "ROUNDTRIP-1",
      title: "Round Trip Role",
      agency: "Agency",
      grade: "GS-7",
    });

    resumeStore.applyPromptUpdate(created.id, "Add measurable impact");
    store.persistResumeCareerState(storage, resumeStore.getState());
    const hydrated = store.loadResumeCareerState(storage, false);

    expect(hydrated.resumes.length).toBe(1);
    expect(hydrated.resumes[0].job.jobId).toBe("ROUNDTRIP-1");
    expect(hydrated.promptLog.length).toBe(1);
    expect(hydrated.activeResumeId).toBe(hydrated.resumes[0].id);
  });

  it("seeds sample resumes when configured", function () {
    const storage = createMemoryStorage();
    const seeded = store.loadResumeCareerState(storage, true);

    expect(seeded.resumes.length).toBe(2);
    expect(seeded.activeResumeId).toBe(seeded.resumes[0].id);
  });

  it("handles empty or malformed localStorage safely", function () {
    const storage = createMemoryStorage();
    const emptyHydrated = store.loadResumeCareerState(storage, false);

    storage.setItem(store.RESUME_CAREER_STORAGE_KEY, "{");
    const malformedHydrated = store.loadResumeCareerState(storage, false);

    expect(emptyHydrated.resumes.length).toBe(0);
    expect(emptyHydrated.activeResumeId).toBeNull();
    expect(malformedHydrated.resumes.length).toBe(0);
    expect(malformedHydrated.activeResumeId).toBeNull();
  });

  // ===============================================================
  // WHY: Cover best-effort persistence error handling.
  // HOW: Throw in setItem and confirm no crash.
  // ===============================================================
  it("swallows storage write errors during persistence", function () {
    const storage = {
      getItem: function () {
        return null;
      },
      setItem: function () {
        throw new Error("Write failed");
      },
    };
    const resumeStore = store.createResumeCareerStore(storage, { seedResumes: false });
    const created = resumeStore.createResumeForJob({
      jobId: "WRITE-FAIL",
      announcementNumber: "WRITE-FAIL",
      title: "Write Fail Role",
      agency: "Agency",
      grade: "GS-7",
    });

    expect(created).toBeTruthy();
  });

  // ===============================================================
  // WHY: Cover the seeded fallback path on storage errors.
  // HOW: Throw inside getItem and request seeded resumes.
  // ===============================================================
  it("seeds resumes when storage throws and seeding is enabled", function () {
    const storage = {
      getItem: function () {
        throw new Error("Storage unavailable");
      },
      setItem: function () {},
    };
    const seeded = store.loadResumeCareerState(storage, true);

    expect(seeded.resumes.length).toBe(2);
    expect(seeded.activeResumeId).toBe(seeded.resumes[0].id);
  });
});

// ===============================================================
// WHY: Exercise helper branches in state sanitization + window export.
// HOW: Provide malformed snapshots and simulate a window environment.
// ===============================================================
describe("resume career state helpers", function () {
  // ===============================================================
  // WHY: Cover base return when sanitize input is invalid.
  // HOW: Pass null and confirm empty defaults.
  // ===============================================================
  it("returns the empty state for non-object inputs", function () {
    const sanitized = store.sanitizeResumeCareerState(null);

    expect(sanitized.resumes.length).toBe(0);
    expect(sanitized.activeResumeId).toBeNull();
    expect(sanitized.promptLog.length).toBe(0);
  });

  it("sanitizes malformed resume snapshots", function () {
    const sanitized = store.sanitizeResumeCareerState({
      resumes: [
        {
          id: 99,
          job: { jobId: 10, announcementNumber: null, title: 77 },
          status: "Unknown",
          version: "2",
          createdAt: 123,
          updatedAt: 456,
          lastExportedAt: 789,
          lastExportedFile: 1011,
          workExperience: [
            "not-an-object",
            { id: 1, duties: ["ok", 2, null] },
          ],
          education: null,
        },
      ],
      activeResumeId: "missing",
      promptLog: [
        null,
        {
          id: 5,
          resumeId: null,
          prompt: 12,
          createdAt: 99,
        },
      ],
    });

    expect(sanitized.resumes.length).toBe(1);
    expect(sanitized.resumes[0].status).toBe("Draft");
    expect(sanitized.resumes[0].workExperience.length).toBe(1);
    expect(sanitized.promptLog.length).toBe(1);
    expect(sanitized.activeResumeId).toBe(sanitized.resumes[0].id);
  });

  // ===============================================================
  // WHY: Cover prompt log branches for valid string fields.
  // HOW: Provide a well-formed prompt log entry to sanitize.
  // ===============================================================
  it("keeps prompt log entries with valid strings", function () {
    const sanitized = store.sanitizeResumeCareerState({
      resumes: [],
      activeResumeId: null,
      promptLog: [
        {
          id: "LOG-1",
          resumeId: "RESUME-1",
          prompt: "Focus on impact metrics",
          createdAt: "2026-02-05T12:00:00.000Z",
        },
      ],
    });

    expect(sanitized.promptLog.length).toBe(1);
    expect(sanitized.promptLog[0].id).toBe("LOG-1");
    expect(sanitized.promptLog[0].prompt).toBe("Focus on impact metrics");
  });

  // ===============================================================
  // WHY: Cover cloneResume null guard in sanitize.
  // HOW: Include non-object entries inside resumes.
  // ===============================================================
  it("skips non-object resumes during sanitization", function () {
    const sanitized = store.sanitizeResumeCareerState({
      resumes: [null, "not-an-object"],
    });

    expect(sanitized.resumes.length).toBe(0);
  });

  // ===============================================================
  // WHY: Cover safeEntry false branch in applied update cloning.
  // HOW: Call helper directly with malformed work experience data.
  // ===============================================================
  it("ignores invalid work experience entries in helper updates", function () {
    const state = store.createEmptyResumeCareerState();
    const applied = store.createResumeForJobInState(
      state,
      {
        jobId: "APPLIED-RAW",
        announcementNumber: "APPLIED-RAW",
        title: "Applied Role",
        agency: "Agency",
        grade: "GS-9",
      },
      { status: "Applied" }
    );

    applied.workExperience = [null];
    const updated = store.applyPromptUpdateInState(
      state,
      applied.id,
      "Update content"
    );

    expect(state.resumes.length).toBe(2);
    expect(updated.workExperience.length).toBe(0);
  });

  it("sets window export when window is available", async function () {
    const originalWindow = globalThis.window;
    globalThis.window = {};

    const imported = await import("../../src/renderer/resume-career-store.js?window=1");

    expect(globalThis.window.PathOSResumeCareerStore).toBe(imported.default);
    globalThis.window = originalWindow;
  });

});
