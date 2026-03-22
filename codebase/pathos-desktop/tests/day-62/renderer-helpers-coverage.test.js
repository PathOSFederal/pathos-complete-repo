"use strict";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildDecisionSummary,
  deriveAgencyAbbrev,
  formatActivityLogTimestamp,
  formatResumeTimestamp,
  formatTimestamp,
  normalizeActivityErrorMessage,
} from "../../src/renderer/lib/renderer-helpers.js";

beforeEach(function () {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-07T13:15:00Z"));
});

afterEach(function () {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Day 62 coverage helpers for renderer utilities", function () {
  // ===============================================================
  // WHY: Activity Log formatting should handle all error shapes.
  // HOW: Exercise the String(error) fallback branch explicitly.
  // ===============================================================
  it("normalizes non-string error objects safely", function () {
    const message = normalizeActivityErrorMessage({ message: 123 });
    expect(message).toBe("[object Object]");
  });

  // ===============================================================
  // WHY: Activity Log timestamps should always render a label.
  // HOW: Call the formatter with frozen time and ensure output exists.
  // ===============================================================
  it("formats activity log timestamps into a display string", function () {
    const formatted = formatActivityLogTimestamp();
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  // ===============================================================
  // WHY: Resume timestamps should format valid dates without fallback.
  // HOW: Provide a valid ISO timestamp and confirm it is not "Just now".
  // ===============================================================
  it("formats valid resume timestamps via the shared formatter", function () {
    const formatted = formatResumeTimestamp("2026-02-07T09:00:00Z");
    expect(formatted).not.toBe("—");
    expect(formatted).not.toBe("Just now");
  });

  // ===============================================================
  // WHY: Decision summaries must handle empty thread inputs cleanly.
  // HOW: Provide blank fields to trigger default values.
  // ===============================================================
  it("builds decision summaries with untitled defaults", function () {
    const summary = buildDecisionSummary({
      title: "",
      context: "",
      keyFactors: "",
      tradeoffs: "",
      recommendation: "",
      nextSteps: "",
    });

    expect(summary).toContain("Untitled Decision");
    expect(summary).toContain("Context\n-");
    expect(summary).toContain("Key Factors\n-");
    expect(summary).toContain("Recommendation\n-");
  });

  // ===============================================================
  // WHY: Decision summary fields should respect provided content.
  // HOW: Provide non-empty context, tradeoffs, and next steps values.
  // ===============================================================
  it("uses provided decision details when available", function () {
    const summary = buildDecisionSummary({
      title: "Decision Beta",
      context: "Short context",
      keyFactors: "Factor X",
      tradeoffs: "Tradeoff Y",
      recommendation: "Proceed",
      nextSteps: "Notify team",
    });

    expect(summary).toContain("Decision Beta");
    expect(summary).toContain("Context\nShort context");
    expect(summary).toContain("Tradeoffs\nTradeoff Y");
    expect(summary).toContain("Next Steps\nNotify team");
  });

  // ===============================================================
  // WHY: Agency abbreviations must fall back when letters are missing.
  // HOW: Supply numeric-only agency text to hit the fallback branch.
  // ===============================================================
  it("falls back to a short prefix when no letters are present", function () {
    expect(deriveAgencyAbbrev("12345")).toBe("123");
  });

  // ===============================================================
  // WHY: Format timestamp should return a locale string for valid input.
  // HOW: Provide a valid timestamp and assert it does not use fallback.
  // ===============================================================
  it("formats valid timestamps instead of returning fallback", function () {
    const formatted = formatTimestamp("2026-02-07T09:00:00Z");
    expect(formatted).not.toBe("Just now");
  });
});
