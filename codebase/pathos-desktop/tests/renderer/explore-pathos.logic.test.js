"use strict";

// ===============================================================
// WHY: Explore reasoning should stay deterministic and complete.
// HOW: Validate the mock response includes roles + reasoning content.
// ===============================================================
import { describe, it, expect } from "vitest";
import explore from "../../src/renderer/explore-pathos.js";

describe("explore-pathos logic", function () {
  it("explore pathos returns role recommendations", function () {
    const payload = explore.buildExploreRecommendations(explore.DEFAULT_PROMPT);
    expect(Array.isArray(payload.roles)).toBe(true);
    expect(payload.roles.length).toBe(4);
  });

  it("why this matches me includes reasoning and tradeoff", function () {
    const payload = explore.buildExploreRecommendations(explore.DEFAULT_PROMPT);
    const firstRole = payload.roles[0];
    expect(firstRole.reasoning).toBeTruthy();
    expect(firstRole.reasoning.summary).toBeTruthy();
    expect(firstRole.reasoning.reasons).toBeTruthy();
    expect(firstRole.reasoning.tradeoff).toBeTruthy();
  });
});
