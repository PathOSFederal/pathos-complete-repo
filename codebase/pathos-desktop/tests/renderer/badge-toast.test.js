"use strict";

import { describe, it, expect, vi } from "vitest";
import { incrementBadgeWithToast } from "../../src/renderer/lib/renderer-helpers.js";

describe("incrementBadgeWithToast", function () {
  it("calls badge increment and toast emitter for user actions", function () {
    const incrementBadge = vi.fn();
    const toast = vi.fn();

    incrementBadgeWithToast({
      incrementBadge,
      toast,
      toastTitle: "Added to Resume & Career",
      toastBody: "Program Analyst",
    });

    expect(incrementBadge).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith("Added to Resume & Career", "Program Analyst");
  });

  it("no-ops safely when payload is missing handlers", function () {
    expect(() => incrementBadgeWithToast(null)).not.toThrow();
    expect(() => incrementBadgeWithToast({})).not.toThrow();
  });
});
