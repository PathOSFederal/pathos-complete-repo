"use strict";

// =====================================================================
// WHY: Main-process logic must be testable without Electron imports.
// HOW: Exercise pure sanitizers and validators from the helper module.
// =====================================================================
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import helpers from "../src/main-helpers.js";

const {
  createLiveAdvisorThread,
  createDecisionThread,
  sanitizeStringArray,
  sanitizeLiveMessage,
  sanitizeLiveAdvisorThread,
  sanitizeDecisionThread,
  isValidAdvisorSurfaceOwner,
  isAllowedExternalUrl,
} = helpers;

describe("main helper utilities", function () {
  beforeEach(function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(function () {
    vi.useRealTimers();
  });

  it("creates default threads", function () {
    expect(createLiveAdvisorThread()).toEqual({ messages: [] });
    expect(createDecisionThread()).toHaveProperty("title");
  });

  it("sanitizes string arrays", function () {
    expect(sanitizeStringArray(["a", 1, "b"])).toEqual(["a", "b"]);
    expect(sanitizeStringArray(null)).toEqual([]);
  });

  it("sanitizes live messages with defaults", function () {
    const sanitized = sanitizeLiveMessage({ role: "user", content: "Hello" });

    expect(sanitized).toBeTruthy();
    expect(sanitized.role).toBe("user");
    expect(typeof sanitized.id).toBe("string");
  });

  it("sanitizes live advisor threads", function () {
    const thread = sanitizeLiveAdvisorThread({
      messages: [{ role: "assistant", content: "Hi" }, "bad"],
    });

    expect(thread.messages.length).toBe(1);
    expect(thread.messages[0].role).toBe("assistant");
  });

  it("sanitizes decision threads with fallback defaults", function () {
    const fallback = createDecisionThread();
    const nextThread = sanitizeDecisionThread({ title: 42 }, fallback);

    expect(nextThread.title).toBe(fallback.title);
    expect(nextThread.context).toBe(fallback.context);
  });

  it("validates advisor surface owners", function () {
    expect(isValidAdvisorSurfaceOwner("main")).toBe(true);
    expect(isValidAdvisorSurfaceOwner("benefits-popout")).toBe(true);
    expect(isValidAdvisorSurfaceOwner("other")).toBe(false);
  });

  it("guards external URLs", function () {
    expect(isAllowedExternalUrl("https://example.com")).toBe(true);
    expect(isAllowedExternalUrl("http://example.com")).toBe(true);
    expect(isAllowedExternalUrl("file:///secret")).toBe(false);
  });
});
