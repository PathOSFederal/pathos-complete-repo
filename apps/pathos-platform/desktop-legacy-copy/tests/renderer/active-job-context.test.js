"use strict";

import { describe, it, expect } from "vitest";
import context from "../../src/renderer/active-job-context.js";

describe("active job context store", function () {
  it("sets and clears active job context", function () {
    const store = context.createActiveJobContextStore();
    const payload = {
      jobId: "ROLE-1",
      title: "Program Analyst",
      announcementNumber: "PA-123",
      source: "Explore",
    };

    const created = store.setActiveJob(payload);
    const state = store.getState();

    expect(created).toBeTruthy();
    expect(state.activeJob.jobId).toBe("ROLE-1");
    expect(state.activeJob.title).toBe("Program Analyst");

    store.clearActiveJob("manual-clear");
    expect(store.getState().activeJob).toBeNull();
  });

  it("clears invalid job payloads", function () {
    const store = context.createActiveJobContextStore();

    store.setActiveJob({ jobId: "", title: "" });

    expect(store.getState().activeJob).toBeNull();
  });

  it("handles rapid job switching safely", function () {
    const store = context.createActiveJobContextStore();
    store.setActiveJob({
      jobId: "ROLE-1",
      title: "First Role",
      announcementNumber: "",
      source: "Explore",
    });
    store.setActiveJob({
      jobId: "ROLE-2",
      title: "Second Role",
      announcementNumber: "ANN-2",
      source: "USAJOBS",
    });

    const state = store.getState();
    expect(state.activeJob.jobId).toBe("ROLE-2");
    expect(state.activeJob.title).toBe("Second Role");
  });
});

describe("active job context helpers", function () {
  it("builds resume awareness text when no job is active", function () {
    const copy = context.buildResumeActiveJobStatus(null);

    expect(copy).toMatch(/No job selected/);
  });

  it("builds resume awareness text for active job", function () {
    const copy = context.buildResumeActiveJobStatus({
      jobId: "ROLE-3",
      title: "Cybersecurity Specialist",
      announcementNumber: "CY-444",
      source: "Explore",
    });

    expect(copy).toMatch(/Primed for/);
    expect(copy).toMatch(/Cybersecurity Specialist/);
    expect(copy).toMatch(/Announcement CY-444/);
  });

  it("keeps resume state unchanged when building advisor copy", function () {
    const resumeState = {
      resumes: [{ id: "RES-1" }],
    };
    const snapshot = JSON.stringify(resumeState);

    const copy = context.buildAdvisorActiveJobObservation(
      {
        jobId: "ROLE-4",
        title: "Policy Analyst",
        announcementNumber: "",
        source: "Explore",
      },
      resumeState
    );

    expect(copy).toMatch(/Policy Analyst/);
    expect(JSON.stringify(resumeState)).toBe(snapshot);
  });

  it("derives explore roles into active job contexts", function () {
    const role = {
      id: "role-123",
      title: "IT Specialist",
    };

    const built = context.buildActiveJobContextFromExploreRole(role);

    expect(built.jobId).toBe("role-123");
    expect(built.title).toBe("IT Specialist");
    expect(built.source).toBe("Explore");
  });

  it("detects active job presence in role lists", function () {
    const activeJob = {
      jobId: "role-abc",
      title: "Role ABC",
      announcementNumber: "",
      source: "Explore",
    };
    const roles = [{ id: "role-abc" }, { id: "role-def" }];

    expect(context.isActiveJobInRoleList(activeJob, roles)).toBe(true);
  });

  it("sets window export when window is available", async function () {
    const originalWindow = globalThis.window;
    globalThis.window = {};

    const imported = await import(
      "../../src/renderer/active-job-context.js?window=1"
    );

    expect(globalThis.window.PathOSActiveJobContext).toBe(imported.default);
    globalThis.window = originalWindow;
  });
});
