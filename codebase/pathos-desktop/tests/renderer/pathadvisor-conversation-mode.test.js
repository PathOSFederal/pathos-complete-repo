// @vitest-environment jsdom
"use strict";

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";

const htmlPath = path.resolve(process.cwd(), "src", "renderer", "index.html");

function getRailFragment(html) {
  const start = html.indexOf("pathadvisor-rail");
  if (start === -1) {
    return "";
  }
  const openAside = html.lastIndexOf("<aside", start);
  const closeAside = html.indexOf("</aside>", start);
  if (openAside === -1 || closeAside === -1) {
    return "";
  }
  return html.slice(openAside, closeAside + "</aside>".length);
}

describe("PathAdvisor fixed layout (Day 65 lock)", function () {
  let railHtml;

  beforeEach(function () {
    const fullHtml = fs.readFileSync(htmlPath, "utf8");
    railHtml = getRailFragment(fullHtml);
    expect(railHtml.length > 0).toBe(true);
    document.body.innerHTML = railHtml;
  });

  it("removes expand/collapse toggle UI and mode attributes", function () {
    const rail = document.querySelector("#pathadvisor-rail");
    expect(rail !== null).toBe(true);
    expect(rail.getAttribute("data-pathadvisor-ui")).toBe(null);
    expect(document.querySelector("#live-advisor-detach")).toBe(null);
    expect(document.querySelector("[data-advisor-show-guidance]")).toBe(null);
  });

  it("keeps fixed guidance structure visible", function () {
    const rail = document.querySelector("#pathadvisor-rail");
    expect(rail !== null).toBe(true);
    expect(rail.querySelector(".advisor-context-capsule") !== null).toBe(true);
    expect(rail.querySelector("[data-advisor-cta-choose-job-idle]") !== null).toBe(true);
    expect(rail.querySelector("[data-advisor-guidance-form]") !== null).toBe(true);
  });

  it("retains hidden alternate sections in DOM for compatibility", function () {
    const rail = document.querySelector("#pathadvisor-rail");
    expect(rail !== null).toBe(true);
    expect(rail.querySelector(".advisor-expanded-only") !== null).toBe(true);
    expect(rail.querySelector(".advisor-chat-block") !== null).toBe(true);
    expect(rail.querySelectorAll(".advisor-v2-hidden").length >= 1).toBe(true);
  });
});
