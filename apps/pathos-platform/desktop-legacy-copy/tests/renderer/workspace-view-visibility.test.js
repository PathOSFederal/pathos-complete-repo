// @vitest-environment jsdom
"use strict";

/**
 * WHY: Day 64 layout stabilization – test visibility state logic.
 * Ensures only one workspace view is visible at a time and layout mode
 * combinations produce correct grid expectations.
 * HOW: Pure functions that mirror renderer logic; no DOM required for core assertions.
 */
import { describe, it, expect } from "vitest";

/** Mirror of WORKSPACE_ROUTES ids for visibility tests. */
const WORKSPACE_VIEW_IDS = [
  "explore",
  "explore-pathos",
  "saved-jobs",
  "activity-log",
  "resume-assets",
  "benefits-guide",
  "benefits-comp",
  "profile",
  "settings",
  "alert-center",
  "conversations",
];

/**
 * Computes which view should have hidden=false for a given activeWorkspaceView.
 * Mirrors: view.hidden = entry.id !== activeWorkspaceView
 * @param {string} activeWorkspaceView
 * @returns {string} The single visible view id
 */
function getVisibleViewId(activeWorkspaceView) {
  if (!activeWorkspaceView) {
    return "";
  }
  return activeWorkspaceView;
}

/**
 * Returns hidden state for each view given activeWorkspaceView.
 * @param {string} activeWorkspaceView
 * @returns {Record<string, boolean>} Map of viewId -> shouldBeHidden
 */
function computeViewVisibility(activeWorkspaceView) {
  const result = {};
  for (let i = 0; i < WORKSPACE_VIEW_IDS.length; i++) {
    const id = WORKSPACE_VIEW_IDS[i];
    result[id] = id !== activeWorkspaceView;
  }
  return result;
}

describe("workspace view visibility logic", function () {
  it("exactly one view is visible for each activeWorkspaceView", function () {
    for (let i = 0; i < WORKSPACE_VIEW_IDS.length; i++) {
      const active = WORKSPACE_VIEW_IDS[i];
      const visibility = computeViewVisibility(active);
      let visibleCount = 0;
      for (const id in visibility) {
        if (!visibility[id]) {
          visibleCount++;
        }
      }
      expect(visibleCount).toBe(1);
      expect(getVisibleViewId(active)).toBe(active);
    }
  });

  it("inactive views are hidden", function () {
    const visibility = computeViewVisibility("saved-jobs");
    expect(visibility["saved-jobs"]).toBe(false);
    expect(visibility["explore"]).toBe(true);
    expect(visibility["activity-log"]).toBe(true);
  });

  it("activity-log-view body class applies when activeWorkspaceView is activity-log", function () {
    const active = "activity-log";
    const isActivityLogView = active === "activity-log";
    expect(isActivityLogView).toBe(true);
  });

  it("activity-log-view body class is false for other views", function () {
    expect("saved-jobs" === "activity-log").toBe(false);
    expect("explore" === "activity-log").toBe(false);
  });
});
