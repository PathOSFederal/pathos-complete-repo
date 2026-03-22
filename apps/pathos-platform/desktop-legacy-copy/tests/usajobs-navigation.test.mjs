"use strict";

// =====================================================================
// WHY: Prove the Vitest pipeline works on a pure utility module.
// HOW: Exercise safe URL guards and a core navigation action.
// =====================================================================
import { describe, it, expect, vi } from "vitest";
import navigation from "../src/usajobs-navigation.js";

const HOME_URL = navigation.HOME_URL;
const handleUsaJobsNavigation = navigation.handleUsaJobsNavigation;
const isSafeExternalUrl = navigation.isSafeExternalUrl;

function createFakeContents() {
  return {
    canGoBack: vi.fn(function () {
      return true;
    }),
    canGoForward: vi.fn(function () {
      return false;
    }),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    loadURL: vi.fn(),
    getURL: vi.fn(function () {
      return "https://example.com/jobs";
    }),
  };
}

describe("isSafeExternalUrl", function () {
  it("returns true for http/https URLs", function () {
    expect(isSafeExternalUrl("https://example.com")).toBe(true);
    expect(isSafeExternalUrl("http://example.com")).toBe(true);
  });

  it("returns false for non-http inputs", function () {
    expect(isSafeExternalUrl("file:///C:/secret")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("")).toBe(false);
    expect(isSafeExternalUrl(null)).toBe(false);
  });
});

describe("handleUsaJobsNavigation", function () {
  it("calls back/forward only when available", function () {
    const contents = createFakeContents();
    contents.canGoBack = vi.fn(function () {
      return false;
    });
    contents.canGoForward = vi.fn(function () {
      return true;
    });
    const shell = { openExternal: vi.fn() };

    handleUsaJobsNavigation("back", contents, shell);
    handleUsaJobsNavigation("forward", contents, shell);

    expect(contents.goBack).not.toHaveBeenCalled();
    expect(contents.goForward).toHaveBeenCalledTimes(1);
  });

  it("reloads on refresh", function () {
    const contents = createFakeContents();
    const shell = { openExternal: vi.fn() };

    handleUsaJobsNavigation("refresh", contents, shell);

    expect(contents.reload).toHaveBeenCalledTimes(1);
  });

  it("routes home action to the HOME_URL", function () {
    const contents = createFakeContents();
    const shell = { openExternal: vi.fn() };

    handleUsaJobsNavigation("home", contents, shell);

    expect(contents.loadURL).toHaveBeenCalledTimes(1);
    expect(contents.loadURL).toHaveBeenCalledWith(HOME_URL);
  });

  // ===============================================================
  // WHY: External navigation should only open safe URLs.
  // HOW: Use the fake contents URL and assert shell.openExternal runs.
  // ===============================================================
  it("opens the current url when the action is open-external", function () {
    const contents = createFakeContents();
    const shell = { openExternal: vi.fn() };

    handleUsaJobsNavigation("open-external", contents, shell);

    expect(shell.openExternal).toHaveBeenCalledTimes(1);
    expect(shell.openExternal).toHaveBeenCalledWith(
      "https://example.com/jobs"
    );
  });

  it("does not open unsafe external urls", function () {
    const contents = createFakeContents();
    contents.getURL = vi.fn(function () {
      return "file:///C:/secret";
    });
    const shell = { openExternal: vi.fn() };

    handleUsaJobsNavigation("open-external", contents, shell);

    expect(shell.openExternal).not.toHaveBeenCalled();
  });
});
