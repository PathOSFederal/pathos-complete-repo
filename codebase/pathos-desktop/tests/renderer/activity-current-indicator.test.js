"use strict";

import { describe, it, expect } from "vitest";
import { buildActivityCurrentJobIndicator } from "../../src/renderer/lib/renderer-helpers.js";

describe("activity current job indicator", function () {
  it("marks the active job and disables set-current actions", function () {
    const selection = {
      sourceJobId: "ROLE-9",
      postingUrl: "https://www.usajobs.gov/job/9",
    };
    const result = buildActivityCurrentJobIndicator("ROLE-9", selection);

    expect(result.isCurrent).toBe(true);
    expect(result.label).toBe("CURRENT");
    expect(result.disableSetCurrent).toBe(true);
  });

  it("matches on canonical job ids and returns false for empty inputs", function () {
    const selection = {
      jobId: "CANON-1",
      sourceJobId: "ROLE-1",
      postingUrl: "https://www.usajobs.gov/job/1",
    };

    expect(buildActivityCurrentJobIndicator("CANON-1", selection).isCurrent).toBe(true);
    expect(buildActivityCurrentJobIndicator("   ", selection).isCurrent).toBe(false);
    expect(buildActivityCurrentJobIndicator("ROLE-1", selection).isCurrent).toBe(true);
    expect(
      buildActivityCurrentJobIndicator("https://www.usajobs.gov/job/1", selection).isCurrent
    ).toBe(true);
  });
});
