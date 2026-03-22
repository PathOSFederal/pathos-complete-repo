"use strict";

// =====================================================================
// WHY: USAJOBS helper logic is shared and must stay predictable.
// HOW: Exercise URL validation, fallbacks, and guardrails with edge cases.
// =====================================================================
import { describe, it, expect, vi } from "vitest";
import usaJobsHelpers from "../../src/renderer/lib/usajobs-helpers.js";

const {
  isValidUsaJobsUrl,
  buildUsaJobsFallbackUrl,
  resolveUsaJobsReferenceUrl,
  isAllowedBenefitsUrl,
} = usaJobsHelpers;

describe("usajobs-helpers", function () {
  it("validates USAJOBS URLs with the approved prefix", function () {
    const cases = [
      { input: null, expected: false },
      { input: undefined, expected: false },
      { input: "", expected: false },
      { input: "   ", expected: false },
      { input: 123, expected: false },
      { input: { href: "https://www.usajobs.gov/" }, expected: false },
      { input: "http://www.usajobs.gov/", expected: false },
      { input: "https://example.com", expected: false },
      { input: "https://www.usajobs.gov/Search/Results", expected: true },
    ];

    cases.forEach((testCase) => {
      expect(isValidUsaJobsUrl(testCase.input)).toBe(testCase.expected);
    });
  });

  it("builds a fallback URL with role keywords when present", function () {
    const url = buildUsaJobsFallbackUrl({
      title: "Program Analyst",
      series: "0343",
    });

    expect(url.indexOf("https://www.usajobs.gov/Search/Results?") === 0).toBe(
      true
    );
    expect(url).toContain("k=Program%20Analyst%200343");
    expect(url).toContain("j=0343");
  });

  it("defaults fallback keywords when role data is empty", function () {
    const url = buildUsaJobsFallbackUrl({});

    expect(url).toContain("k=federal%20jobs");
  });

  it("resolves a valid USAJOBS reference url without warning", function () {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const role = { usajobsUrl: "https://www.usajobs.gov/Search/Results" };

    expect(resolveUsaJobsReferenceUrl(role)).toBe(role.usajobsUrl);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("falls back and warns when the USAJOBS url is invalid", function () {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const role = { id: "role-1", usajobsUrl: "https://example.com" };
    const resolved = resolveUsaJobsReferenceUrl(role);

    expect(
      resolved.indexOf("https://www.usajobs.gov/Search/Results?") === 0
    ).toBe(true);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("falls back when the role is missing a usable url", function () {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resolved = resolveUsaJobsReferenceUrl({});

    expect(
      resolved.indexOf("https://www.usajobs.gov/Search/Results?") === 0
    ).toBe(true);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("allows only http and https destinations for benefits navigation", function () {
    const cases = [
      { input: "https://example.com", expected: true },
      { input: "http://example.com", expected: true },
      { input: "ftp://example.com", expected: false },
      { input: "javascript:alert(1)", expected: false },
      { input: null, expected: false },
      { input: undefined, expected: false },
      { input: "", expected: false },
    ];

    cases.forEach((testCase) => {
      expect(isAllowedBenefitsUrl(testCase.input)).toBe(testCase.expected);
    });
  });
});
