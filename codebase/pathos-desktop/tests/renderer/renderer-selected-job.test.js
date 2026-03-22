/* @vitest-environment jsdom */
"use strict";

import { describe, it, expect } from "vitest";
import { mergeUsaJobsSelection } from "../../src/renderer/renderer.js";
import selectedJobStore from "../../src/renderer/selected-job-store.js";

describe("renderer USAJOBS selection merge", function () {
  it("keeps real titles instead of fallback", function () {
    const selection = {
      source: "USAJOBS",
      sourceJobId: "123456789",
      title: "Program Analyst",
      agency: "Department of Education",
      location: "Remote",
      grade: "GS-11",
      postingUrl: "https://www.usajobs.gov/job/123456789",
      capturedAt: "2026-02-06T12:00:00.000Z",
    };

    const merged = mergeUsaJobsSelection(
      null,
      selection,
      selectedJobStore.chooseUsaJobsTitle
    );

    expect(merged.title).toBe("Program Analyst");
  });
});
