// @vitest-environment jsdom
"use strict";

/**
 * WHY: Day 64 – Workspace Focus Mode store. Persistence and toggle behavior.
 * HOW: Assert getWorkspaceMode, setWorkspaceMode, toggleWorkspaceMode, localStorage.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  WORKSPACE_MODE_STORAGE_KEY,
  getWorkspaceMode,
  setWorkspaceMode,
  toggleWorkspaceMode,
  initWorkspaceFocusStore,
  clearWorkspaceModeFromStorage,
} from "../../src/renderer/workspace-focus-store.js";

beforeEach(function () {
  localStorage.clear();
});

afterEach(function () {
  localStorage.clear();
});

describe("workspace focus store", function () {
  it("defaults to standard mode", function () {
    initWorkspaceFocusStore();
    expect(getWorkspaceMode()).toBe("standard");
  });

  it("loads focus mode from localStorage on init", function () {
    localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, "focus");
    initWorkspaceFocusStore();
    expect(getWorkspaceMode()).toBe("focus");
  });

  it("ignores invalid localStorage value and defaults to standard", function () {
    localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, "invalid");
    initWorkspaceFocusStore();
    expect(getWorkspaceMode()).toBe("standard");
  });

  it("setWorkspaceMode updates state and persists", function () {
    initWorkspaceFocusStore();
    setWorkspaceMode("focus");
    expect(getWorkspaceMode()).toBe("focus");
    expect(localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe("focus");

    setWorkspaceMode("standard");
    expect(getWorkspaceMode()).toBe("standard");
    expect(localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe("standard");
  });

  it("toggleWorkspaceMode switches between standard and focus", function () {
    initWorkspaceFocusStore();
    expect(getWorkspaceMode()).toBe("standard");

    const next1 = toggleWorkspaceMode();
    expect(next1).toBe("focus");
    expect(getWorkspaceMode()).toBe("focus");

    const next2 = toggleWorkspaceMode();
    expect(next2).toBe("standard");
    expect(getWorkspaceMode()).toBe("standard");
  });

  it("clearWorkspaceModeFromStorage removes key from localStorage", function () {
    localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, "focus");
    clearWorkspaceModeFromStorage();
    expect(localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBeNull();
  });
});
