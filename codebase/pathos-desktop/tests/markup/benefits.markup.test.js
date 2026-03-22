"use strict";

// ===============================================================
// WHY: Markup tests protect critical workspace wiring without a browser.
// HOW: Read the static HTML and assert the Benefits workspace surfaces exist.
// ===============================================================
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const htmlPath = path.join(__dirname, "../../src/renderer/index.html");

// ===============================================================
// WHY: The left nav must expose Benefits & Compensation routing.
// HOW: Verify the nav button id and label are present in the HTML.
// ===============================================================
describe("benefits markup", function () {
  it("benefits nav entry renders", function () {
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html.indexOf('id="nav-benefits-comp"') !== -1).toBe(true);
    expect(html.indexOf("Benefits &amp; Compensation") !== -1).toBe(true);
  });

  // ===============================================================
  // WHY: Calculator frames rely on a trust banner and embedded viewport.
  // HOW: Assert both the trust copy and viewport container exist.
  // ===============================================================
  it("benefits embedded frame includes trust banner and viewport", function () {
    const html = fs.readFileSync(htmlPath, "utf8");
    const normalized = html.replace(/\s+/g, " ");
    const trustCopy =
      "External tool opened in a separate window. PathOS does not collect, read, or modify any data entered there.";
    expect(normalized.indexOf(trustCopy) !== -1).toBe(true);
    expect(html.indexOf('data-benefits-frame="calculator"') !== -1).toBe(true);
  });
});
