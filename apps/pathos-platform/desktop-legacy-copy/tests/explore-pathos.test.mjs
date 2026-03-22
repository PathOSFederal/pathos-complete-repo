"use strict";

// =====================================================================
// WHY: Explore PathOS logic drives mock recommendations deterministically.
// HOW: Validate intent parsing and output shaping with pure inputs.
// =====================================================================
import { describe, it, expect } from "vitest";
import explorePathos from "../src/renderer/explore-pathos.js";

const {
  DEFAULT_PROMPT,
  EXAMPLE_PROMPTS,
  buildIntentTokens,
  buildExploreRecommendations,
  getExamplePrompt,
} = explorePathos;

describe("explore-pathos helpers", function () {
  it("builds intent tokens from prompt text", function () {
    const tokens = buildIntentTokens(
      "Looking for remote 2210 roles, want fast promotion and no relocation."
    );

    expect(tokens.seriesPreference).toBe("2210");
    expect(tokens.remotePreference).toBe("prefers-remote");
    expect(tokens.relocationOpenness).toBe("local");
    expect(tokens.promotionTimeline).toBe("accelerated");
  });

  it("returns a stable example prompt list", function () {
    expect(EXAMPLE_PROMPTS.length).toBeGreaterThan(0);
    expect(EXAMPLE_PROMPTS[0]).toBe(DEFAULT_PROMPT);
  });

  it("cycles example prompts by index", function () {
    expect(getExamplePrompt(0)).toBe(EXAMPLE_PROMPTS[0]);
    expect(getExamplePrompt(99)).toBe(
      EXAMPLE_PROMPTS[99 % EXAMPLE_PROMPTS.length]
    );
    expect(getExamplePrompt(-1)).toBe(EXAMPLE_PROMPTS[0]);
  });

  it("builds recommendations with roles + advisor summary", function () {
    const output = buildExploreRecommendations("Looking for 0343 roles.");

    expect(output.prompt).toBe("Looking for 0343 roles.");
    expect(output.intentTokens.seriesPreference).toBe("0343");
    expect(Array.isArray(output.roles)).toBe(true);
    expect(output.roles.length).toBeGreaterThan(0);
    expect(output.advisor).toBeTruthy();
    expect(typeof output.advisor.summary).toBe("string");
  });
});
