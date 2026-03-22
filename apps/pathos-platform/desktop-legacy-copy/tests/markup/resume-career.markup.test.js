"use strict";

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const htmlPath = path.join(__dirname, "../../src/renderer/index.html");

describe("resume career markup", function () {
  it("renders read-only microcopy and sample resume cards", function () {
    const html = fs.readFileSync(htmlPath, "utf8");
    const microcopyAnchor = "data-resume-readonly-copy";
    const microcopySnippet = "read-only view of your federal resume";
    const scrollAnchor = "data-testid=\"resume-career-scroll\"";

    expect(html.indexOf(microcopyAnchor) !== -1).toBe(true);
    expect(html.toLowerCase().indexOf(microcopySnippet) !== -1).toBe(true);
    expect(html.indexOf(scrollAnchor) !== -1).toBe(true);

    const cards = html.match(/data-resume-card/g) || [];
    expect(cards.length).toBe(2);
  });

  it("renders the resume career headers and microcopy", function () {
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html.indexOf("Resume &amp; Career") !== -1).toBe(true);
    expect(html.indexOf("Your Federal Resumes") !== -1).toBe(true);
    expect(html.toLowerCase().indexOf("read-only view of your federal resume") !== -1).toBe(
      true
    );
  });
});
