"use strict";

// ===============================================================
// WHY: Markup tests protect critical Explore (PathOS) wiring.
// HOW: Read the static HTML and assert the new view surfaces exist.
// ===============================================================
import fs from "node:fs";
import { describe, it, expect } from "vitest";
import resolveAppHtmlPath from "./resolve-app-html-path.js";

describe("explore-pathos markup", function () {
  it("explore pathos view renders core controls", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html.indexOf('id="explore-pathos-view"') !== -1).toBe(true);
    expect(html.indexOf("Explore Careers (Guided by PathOS)") !== -1).toBe(
      true
    );
    expect(html.indexOf('data-pathos-anchor="explore-pathos-intro"') !== -1).toBe(
      true
    );
    expect(html.indexOf("USAJOBS (Official Listings)") !== -1).toBe(true);
    expect(html.indexOf("Need the official posting?") !== -1).toBe(true);
    expect(html.indexOf("Open USAJOBS.") !== -1).toBe(true);
    expect(html.indexOf("data-explore-submit") !== -1).toBe(true);
  });
});
