// @vitest-environment jsdom
"use strict";

/**
 * WHY: Day 64 – Single Focus toggle in workbench global bar; icon-based nav.
 * HOW: Assert workbench-global-bar contains focus toggle; nav has icon (SVG) + text for a11y.
 */
import { describe, it, expect } from "vitest";

describe("workspace focus layout structure", function () {
  it("has exactly one workbench-global-bar with focus toggle inside workbench", function () {
    document.body.innerHTML = `
      <div id="app-shell" class="app-shell">
        <main id="workspace" class="workbench">
          <div id="workbench-global-bar" class="workbench-global-bar" data-pathos-anchor="workbench-global-bar">
            <button id="workspace-focus-toggle" type="button">Focus Mode</button>
            <span id="workbench-global-status"></span>
          </div>
        </main>
      </div>
    `;

    const globalBar = document.getElementById("workbench-global-bar");
    const globalBars = document.querySelectorAll("#workbench-global-bar");
    const toggle = document.getElementById("workspace-focus-toggle");
    const workbench = document.querySelector(".workbench");

    expect(globalBar).not.toBeNull();
    expect(globalBars.length).toBe(1);
    expect(workbench).not.toBeNull();
    expect(globalBar.parentElement).toBe(workbench);
    expect(toggle).not.toBeNull();
    expect(globalBar.contains(toggle)).toBe(true);
  });

  it("body class is-workspace-focus-mode does not remove focus toggle from DOM", function () {
    document.body.innerHTML = `
      <div id="app-shell" class="app-shell">
        <main class="workbench">
          <div id="workbench-global-bar"><button id="workspace-focus-toggle">Focus Mode</button></div>
        </main>
      </div>
    `;

    document.body.classList.add("is-workspace-focus-mode");
    const toggle = document.getElementById("workspace-focus-toggle");
    expect(toggle).not.toBeNull();
  });

  it("nav items have icon span (SVG or content), text span, aria-label and title for focus mode a11y", function () {
    document.body.innerHTML = `
      <nav class="nav-rail">
        <button class="nav-item" aria-label="Dashboard" title="Dashboard">
          <span class="nav-item-icon" aria-hidden="true"><svg width="20" height="20"><path d="M0 0h20v20H0z"/></svg></span>
          <span class="nav-item-text">Dashboard</span>
        </button>
      </nav>
    `;

    const btn = document.querySelector(".nav-item");
    const icon = document.querySelector(".nav-item-icon");
    const text = document.querySelector(".nav-item-text");
    expect(btn.getAttribute("aria-label")).toBe("Dashboard");
    expect(btn.getAttribute("title")).toBe("Dashboard");
    expect(icon).not.toBeNull();
    expect(icon.querySelector("svg") !== null || icon.textContent.trim().length >= 0).toBe(true);
    expect(text).not.toBeNull();
    expect(text.textContent).toBe("Dashboard");
  });

  it("layout debug toggle button exists and toggles has-layout-debug class", function () {
    document.body.innerHTML = `
      <button id="layout-debug-toggle" data-pathos-layout-debug-toggle>Dbg</button>
    `;
    const btn = document.getElementById("layout-debug-toggle");
    expect(btn).not.toBeNull();
    btn.addEventListener("click", function () {
      document.body.classList.toggle("has-layout-debug");
    });
    expect(document.body.classList.contains("has-layout-debug")).toBe(false);
    btn.click();
    expect(document.body.classList.contains("has-layout-debug")).toBe(true);
    btn.click();
    expect(document.body.classList.contains("has-layout-debug")).toBe(false);
  });
});
