/* eslint-disable no-undef */
"use strict";

// ===============================================================
// WHY: Centralize Benefits & Compensation tool metadata in one place.
// HOW: Expose a tiny UMD module so renderer logic and tests share the
//      same definitions without requiring a build step or bundler.
// ===============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PathOSBenefitsTools = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  // ===============================================================
  // WHY: The app needs a single source of truth for tool URLs, labels,
  //      and trust cues so UI copy stays consistent across frames.
  // HOW: Store a canonical array and derive lookup helpers from it.
  // ===============================================================
  const BENEFITS_TOOLS = [
    {
      id: "opm-fehb-compare",
      title: "OPM FEHB Plan Comparison",
      sourceName: "OPM",
      url: "https://www.opm.gov/healthcare-insurance/healthcare/plan-information/compare-plans/",
      type: "calculator",
      placeholder: false,
      guidance: [
        "Start with the plan type to narrow the comparison set.",
        "Confirm coverage level before interpreting premiums.",
        "Use the results as a reference, not a commitment.",
      ],
    },
    {
      id: "tsp-calculators",
      title: "TSP Calculators",
      sourceName: "TSP",
      url: "https://www.tsp.gov/calculators/",
      type: "calculator",
      placeholder: false,
      guidance: [
        "Pick the calculator that matches the decision you need.",
        "Review the assumptions before using the output.",
        "Capture only the deltas that affect your comparison.",
      ],
    },
    {
      id: "opm-gs-pay-tables",
      title: "OPM GS Pay Tables",
      sourceName: "OPM",
      url: "https://www.opm.gov/policy-data-oversight/pay-leave/salaries-wages/",
      type: "reference",
      placeholder: false,
      guidance: [
        "Start with the base GS table to ground the range.",
        "Use locality tables to adjust for region-specific pay.",
        "Confirm special rate tables apply to the role.",
      ],
    },
    {
      id: "public-401k-estimator",
      title: "Public 401k Estimator",
      sourceName: "Placeholder source",
      url: "https://example.com",
      type: "calculator",
      placeholder: true,
      guidance: [
        "Treat this as a placeholder until a verified source is set.",
        "Only compare structure-level outputs, not exact numbers.",
        "Flag any assumptions that need a real data source.",
      ],
    },
    {
      id: "private-salary-estimates",
      title: "Public Private Salary Estimates",
      sourceName: "Placeholder source",
      url: "https://example.com",
      type: "reference",
      placeholder: true,
      guidance: [
        "This is a placeholder reference until a vetted source is linked.",
        "Use ranges and structure, not precise compensation values.",
        "Cross-check with multiple sources before acting.",
      ],
    },
  ];

  // ===============================================================
  // WHY: Fast id lookup avoids repeated array scans in the renderer.
  // HOW: Build a plain object map keyed by id for safe access.
  // ===============================================================
  const BENEFITS_TOOL_INDEX = BENEFITS_TOOLS.reduce(function (acc, tool) {
    acc[tool.id] = tool;
    return acc;
  }, {});

  // ===============================================================
  // WHY: Consumers need a stable, immutable view of all tools.
  // HOW: Return a shallow-copied array to prevent mutation.
  // ===============================================================
  function getAllBenefitsTools() {
    return BENEFITS_TOOLS.slice();
  }

  // ===============================================================
  // WHY: Renderer logic needs to resolve a single tool by id.
  // HOW: Read from the index and return null on missing keys.
  // ===============================================================
  function getBenefitsToolById(toolId) {
    if (typeof toolId !== "string") {
      return null;
    }
    return BENEFITS_TOOL_INDEX[toolId] || null;
  }

  // ===============================================================
  // WHY: Tool choosers need filtered lists by type.
  // HOW: Filter by the `type` field and return a new array.
  // ===============================================================
  function getBenefitsToolsByType(type) {
    if (typeof type !== "string") {
      return [];
    }
    return BENEFITS_TOOLS.filter(function (tool) {
      return tool.type === type;
    });
  }

  // ===============================================================
  // WHY: Chooser frames are grouped by narrative context, not type.
  // HOW: Return grouped metadata keyed by chooser ids.
  // ===============================================================
  function getBenefitsToolGroups() {
    return [
      {
        id: "tsp-calculators",
        title: "TSP Calculators – What Each One Is For",
        toolIds: ["tsp-calculators", "public-401k-estimator"],
      },
      {
        id: "federal-pay",
        title: "Federal Pay Systems – What You’re Looking At",
        toolIds: ["opm-gs-pay-tables", "private-salary-estimates"],
      },
    ];
  }

  return {
    BENEFITS_TOOLS,
    getAllBenefitsTools,
    getBenefitsToolById,
    getBenefitsToolsByType,
    getBenefitsToolGroups,
  };
});
