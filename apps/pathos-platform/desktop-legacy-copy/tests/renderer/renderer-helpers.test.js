import { describe, expect, it } from "vitest";
import {
  buildDecisionSummary,
  deriveAgencyAbbrev,
  formatResumeTimestamp,
  formatTimestamp,
  normalizeActivityErrorMessage,
} from "../../src/renderer/lib/renderer-helpers.js";

describe("renderer helpers", () => {
  it("normalizes error messages consistently", () => {
    expect(normalizeActivityErrorMessage("  Boom \n  now ")).toBe("Boom now");
    expect(normalizeActivityErrorMessage({ message: "oops" })).toBe("oops");
    expect(normalizeActivityErrorMessage(null)).toBe("");
  });

  it("formats timestamps with a safe fallback", () => {
    expect(formatTimestamp("not-a-date")).toBe("Just now");
  });

  it("formats resume timestamps with a placeholder for invalid input", () => {
    expect(formatResumeTimestamp(null)).toBe("—");
    expect(formatResumeTimestamp("not-a-date")).toBe("Just now");
  });

  it("derives agency abbreviations", () => {
    expect(deriveAgencyAbbrev("Department of Energy")).toBe("DOE");
    expect(deriveAgencyAbbrev("")).toBe("");
  });

  it("builds decision summaries with safe defaults", () => {
    const summary = buildDecisionSummary({
      title: "Decision Alpha",
      context: "",
      keyFactors: "Factor A",
      tradeoffs: "",
      recommendation: "Do the thing",
      nextSteps: "",
    });

    expect(summary).toContain("Decision Alpha");
    expect(summary).toContain("Context\n-");
    expect(summary).toContain("Key Factors\nFactor A");
    expect(summary).toContain("Recommendation\nDo the thing");
    expect(summary).toContain("Next Steps\n-");
  });
});
