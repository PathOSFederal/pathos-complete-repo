"use strict";

// =====================================================================
// WHY: Embedded bar helpers are pure logic and must be deterministic.
// HOW: Exercise URL normalization and UI state helpers with plain objects.
// =====================================================================
import { describe, it, expect, vi } from "vitest";
import embeddedBar from "../src/renderer/embedded-bar.js";

const {
  HOME_URL,
  normalizeUrl,
  storeCurrentUrl,
  updateNavButtons,
  setLoadingState,
} = embeddedBar;

describe("embedded-bar helpers", function () {
  it("normalizes missing or blank urls to the HOME_URL", function () {
    const cases = [
      { input: null, expected: HOME_URL },
      { input: undefined, expected: HOME_URL },
      { input: "", expected: HOME_URL },
      { input: "   ", expected: HOME_URL },
      { input: "https://example.com", expected: "https://example.com" },
    ];

    cases.forEach(function (testCase) {
      expect(normalizeUrl(testCase.input)).toBe(testCase.expected);
    });
  });

  it("stores the normalized url on the dataset", function () {
    const bar = { dataset: {} };
    const url = storeCurrentUrl(bar, " https://example.com ");

    expect(url).toBe("https://example.com");
    expect(bar.dataset.currentUrl).toBe("https://example.com");
  });

  it("updates nav button disabled states", function () {
    const elements = {
      backButton: { disabled: false },
      forwardButton: { disabled: false },
    };

    updateNavButtons(elements, true, false);

    expect(elements.backButton.disabled).toBe(false);
    expect(elements.forwardButton.disabled).toBe(true);
  });

  it("toggles loading classes and aria attributes", function () {
    const bar = {
      classList: {
        toggle: vi.fn(),
      },
    };
    const loadingIndicator = {
      setAttribute: vi.fn(),
    };

    setLoadingState(bar, loadingIndicator, true);

    expect(bar.classList.toggle).toHaveBeenCalledWith("is-loading", true);
    expect(loadingIndicator.setAttribute).toHaveBeenCalledWith(
      "aria-hidden",
      "false"
    );
  });
});
