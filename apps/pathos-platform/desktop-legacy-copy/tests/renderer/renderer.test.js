// @vitest-environment jsdom
"use strict";

// =====================================================================
// WHY: Boot-time renderer errors must show banners while runtime errors must not.
// HOW: Exercise diagnostics gating with a jsdom-backed DOM and Activity Log.
// =====================================================================
import { describe, it, expect, beforeEach } from "vitest";
import rendererDiagnostics from "../../src/renderer/renderer-diagnostics.js";

const { createRendererDiagnostics } = rendererDiagnostics;

describe("renderer diagnostics banner gating", function () {
  let ready = false;
  let activityEntries = [];
  let diagnostics = null;

  const appendActivityLogEntry = (message, options = {}) => {
    activityEntries.push({ message, level: options.level || "" });
  };

  beforeEach(function () {
    ready = false;
    activityEntries = [];
    document.body.innerHTML = `
      <div id="renderer-fatal-banner" hidden></div>
      <div id="renderer-error-banner" hidden>
        <div class="renderer-error-banner__message"></div>
      </div>
    `;
    diagnostics = createRendererDiagnostics({
      getBannerById: (bannerId) => document.getElementById(bannerId),
      appendActivityLogEntry,
      normalizeActivityErrorMessage: (error) =>
        error && typeof error.message === "string" ? error.message : String(error || ""),
      isReady: () => ready,
      onConsoleError: () => {},
    });
  });

  it("shows the banner and logs errors during boot", function () {
    diagnostics.handleRendererError("boot error", new Error("boom"));

    const fatalBanner = document.getElementById("renderer-fatal-banner");
    const errorBanner = document.getElementById("renderer-error-banner");

    expect(fatalBanner.hidden).toBe(false);
    expect(fatalBanner.style.display).toBe("flex");
    expect(errorBanner.hidden).toBe(true);
    expect(activityEntries.length).toBe(1);
    expect(activityEntries[0].level).toBe("error");
    expect(activityEntries[0].message).toMatch(/UI failed to initialize/);
  });

  it("keeps banners hidden and logs runtime errors after ready", function () {
    ready = true;
    diagnostics.handleRendererError("runtime error", new Error("bad"));

    const fatalBanner = document.getElementById("renderer-fatal-banner");
    const errorBanner = document.getElementById("renderer-error-banner");

    expect(fatalBanner.hidden).toBe(true);
    expect(errorBanner.hidden).toBe(true);
    expect(activityEntries.length).toBe(1);
    expect(activityEntries[0].level).toBe("error");
    expect(activityEntries[0].message).toMatch(/Renderer runtime error/);
  });
});
