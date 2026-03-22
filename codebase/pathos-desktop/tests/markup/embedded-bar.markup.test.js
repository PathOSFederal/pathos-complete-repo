"use strict";

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const htmlPath = path.join(__dirname, "../../src/renderer/index.html");

describe("embedded bar markup", function () {
  it("embedded bar buttons include aria-label and title", function () {
    const html = fs.readFileSync(htmlPath, "utf8");
    const buttons = [
      { id: "usajobs-back", label: "Back" },
      { id: "usajobs-forward", label: "Forward" },
      { id: "usajobs-refresh", label: "Refresh" },
      { id: "usajobs-home", label: "Home" },
      {
        id: "usajobs-open-external",
        label: "Open current page in your default browser",
      },
    ];

    buttons.forEach(function (button) {
      expect(html.indexOf(`id="${button.id}"`) !== -1).toBe(true);
      expect(html.indexOf(`aria-label="${button.label}"`) !== -1).toBe(true);
      expect(html.indexOf(`title="${button.label}"`) !== -1).toBe(true);
    });
  });

  it("trust microcopy renders in the PathAdvisor rail", function () {
    const html = fs.readFileSync(htmlPath, "utf8");
    const trustCopy =
      "You're viewing external sources inside PathOS. PathOS does not access your data.";

    expect(html.indexOf(trustCopy) !== -1).toBe(true);
  });
});
