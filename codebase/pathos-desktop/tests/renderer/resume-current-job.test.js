"use strict";

import { describe, it, expect } from "vitest";
import {
  buildResumeCurrentJobActionOutput,
  buildResumeCurrentJobActionState,
  buildResumeCurrentJobViewModel,
  RESUME_CURRENT_JOB_ACTIONS,
} from "../../src/renderer/resume-current-job.js";

describe("resume current job view model", function () {
  it("builds an empty view model when no job is selected", function () {
    const viewModel = buildResumeCurrentJobViewModel(null);

    expect(viewModel.hasSelection).toBe(false);
    expect(viewModel.title).toMatch(/No job selected/);
    expect(viewModel.summary).toMatch(/Job Search/);
    expect(viewModel.meta).toBe("");
  });

  it("maps a selected job into the view model", function () {
    const viewModel = buildResumeCurrentJobViewModel({
      source: "USAJOBS",
      sourceJobId: "123456",
      title: "Program Analyst",
      agency: "Department of Education",
      location: "Remote (United States)",
      grade: "GS-11",
      postingUrl: "https://www.usajobs.gov/job/123456",
      capturedAt: "2026-02-06T18:00:00Z",
    });

    expect(viewModel.hasSelection).toBe(true);
    expect(viewModel.title).toBe("Program Analyst");
    expect(viewModel.summary).toMatch(/Department of Education/);
    expect(viewModel.summary).toMatch(/Remote/);
    expect(viewModel.summary).toMatch(/GS-11/);
    expect(viewModel.meta).toMatch(/usajobs.gov/);
    expect(viewModel.sourceBadge).toBe("USAJOBS");
  });

  it("uses a fallback title and summary when details are limited", function () {
    const viewModel = buildResumeCurrentJobViewModel({
      source: "USAJOBS",
      sourceJobId: "333222",
      title: "",
      agency: "",
      location: "",
      grade: "",
      postingUrl: "https://www.usajobs.gov/job/333222",
      capturedAt: "2026-02-06T18:00:00Z",
    });

    expect(viewModel.title).toBe("Selected USAJOBS posting");
    expect(viewModel.summary).toMatch(/Posting link saved/);
    expect(viewModel.meta).toMatch(/usajobs.gov/);
  });
});

describe("resume current job action state", function () {
  it("exposes no actions when empty", function () {
    const actions = buildResumeCurrentJobActionState(null);
    const visible = actions.filter((action) => action.isVisible);

    expect(visible.length).toBe(0);
  });

  it("exposes only view and clear actions when a job is selected", function () {
    const actions = buildResumeCurrentJobActionState({
      postingUrl: "https://www.usajobs.gov/job/123",
    });
    const ids = actions.filter((action) => action.isVisible).map((action) => action.id);

    expect(ids).toContain(RESUME_CURRENT_JOB_ACTIONS.VIEW_POSTING);
    expect(ids).toContain(RESUME_CURRENT_JOB_ACTIONS.CLEAR_SELECTION);
  });
});

describe("resume current job action outputs", function () {
  it("returns posting output when a job is selected", function () {
    const output = buildResumeCurrentJobActionOutput(
      RESUME_CURRENT_JOB_ACTIONS.VIEW_POSTING,
      { postingUrl: "https://www.usajobs.gov/job/555" }
    );

    expect(output).toEqual({
      type: "open-posting",
      url: "https://www.usajobs.gov/job/555",
    });
  });

  it("returns clear output for clear selection action", function () {
    const output = buildResumeCurrentJobActionOutput(
      RESUME_CURRENT_JOB_ACTIONS.CLEAR_SELECTION,
      null
    );

    expect(output).toEqual({ type: "clear-selection" });
  });
});
