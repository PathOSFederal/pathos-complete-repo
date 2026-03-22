"use strict";

// =====================================================================
// WHY: Prove renderer-safe utilities can be tested without Electron.
// HOW: Import the shared Benefits tools module and assert core helpers.
// =====================================================================
import { describe, it, expect } from "vitest";
import benefitsTools from "../src/renderer/benefits-tools.js";

const getBenefitsToolById = benefitsTools.getBenefitsToolById;
const getAllBenefitsTools = benefitsTools.getAllBenefitsTools;
const getBenefitsToolsByType = benefitsTools.getBenefitsToolsByType;
const getBenefitsToolGroups = benefitsTools.getBenefitsToolGroups;

describe("benefits-tools helpers", function () {
  it("returns a tool by id when present", function () {
    const tool = getBenefitsToolById("opm-fehb-compare");

    expect(tool).not.toBe(null);
    expect(tool.id).toBe("opm-fehb-compare");
    expect(tool.type).toBe("calculator");
  });

  it("returns null for unknown tool ids", function () {
    const tool = getBenefitsToolById("missing-tool");

    expect(tool).toBe(null);
  });

  it("returns a copy of the tool list", function () {
    const listA = getAllBenefitsTools();
    const listB = getAllBenefitsTools();

    expect(Array.isArray(listA)).toBe(true);
    expect(listA.length).toBeGreaterThan(0);
    expect(listA).not.toBe(listB);
  });

  it("filters tools by type", function () {
    const calculators = getBenefitsToolsByType("calculator");
    const references = getBenefitsToolsByType("reference");

    expect(calculators.length).toBeGreaterThan(0);
    expect(references.length).toBeGreaterThan(0);
    expect(
      calculators.every(function (tool) {
        return tool.type === "calculator";
      })
    ).toBe(true);
  });

  it("returns tool groups with ids", function () {
    const groups = getBenefitsToolGroups();

    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]).toHaveProperty("id");
    expect(groups[0]).toHaveProperty("toolIds");
  });
});
