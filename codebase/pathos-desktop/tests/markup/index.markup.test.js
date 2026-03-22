"use strict";

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import resolveAppHtmlPath from "./resolve-app-html-path.js";

function indexOfOrFail(html, value) {
  const index = html.indexOf(value);
  expect(index !== -1).toBe(true);
  return index;
}

describe("dashboard markup", function () {
  it("renders dashboard sections and workspace focus toggle", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html.indexOf("Current State") !== -1).toBe(true);
    expect(html.indexOf("What Changed Since Last Time") !== -1).toBe(true);
    expect(html.indexOf("Next Best Actions") !== -1).toBe(true);
    expect(html.indexOf("workspace-focus-toggle") !== -1).toBe(true);
    expect(html.indexOf("workbench-global-bar") !== -1).toBe(true);
  });

  it("global bar has single Focus Mode toggle and Alerts (Bell) control", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html.indexOf("workbench-global-bar") !== -1).toBe(true);
    expect(html.indexOf("workspace-focus-toggle") !== -1).toBe(true);
    expect(html.indexOf("data-alert-popover") !== -1).toBe(true);
  });

  it("PathAdvisor has no Overview/Focus toggle (Day 64)", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html.indexOf("advisor-focus-toggle") === -1).toBe(true);
  });

  it("keeps left navigation order for Day 58", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");

    const dashboard = indexOfOrFail(html, 'id="nav-saved-jobs"');
    const jobSearch = indexOfOrFail(html, 'id="nav-explore"');
    const explorePathos = indexOfOrFail(html, 'id="nav-explore-pathos"');
    const alerts = indexOfOrFail(html, 'id="nav-alert-center"');
    const resume = indexOfOrFail(html, 'id="nav-resume-assets"');
    const activity = indexOfOrFail(html, 'id="nav-activity-log"');
    const benefits = indexOfOrFail(html, 'id="nav-benefits-comp"');
    const settings = indexOfOrFail(html, 'id="nav-settings"');

    expect(dashboard < jobSearch).toBe(true);
    expect(jobSearch < explorePathos).toBe(true);
    expect(explorePathos < alerts).toBe(true);
    expect(alerts < resume).toBe(true);
    expect(resume < activity).toBe(true);
    expect(activity < benefits).toBe(true);
    expect(benefits < settings).toBe(true);
  });
});

// ===============================================================
// WHY: Day 65 lock - PathAdvisor uses one fixed layout and no expand/collapse UI.
// HOW: Assert toggle controls removed and alternate layouts hidden by CSS.
// ===============================================================
describe("PathAdvisor sidebar (Day 65 lock)", function () {
  it("renders fixed sidebar layout and removes expand/collapse controls", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html.indexOf("pathadvisor-rail") !== -1).toBe(true);
    expect(html.indexOf("advisor-header-thin") !== -1).toBe(true);
    expect(html.indexOf("advisor-context-capsule") !== -1).toBe(true);
    expect(html.indexOf('data-pathos-anchor="advisor-chat-messages"') !== -1).toBe(true);
    expect(html.indexOf("advisor-input-section") !== -1).toBe(true);
    expect(html.indexOf("live-advisor-detach") === -1).toBe(true);
    expect(html.indexOf("data-advisor-show-guidance") === -1).toBe(true);
    expect(html.indexOf('<aside id="pathadvisor-rail"') !== -1).toBe(true);
  });

  it("hides alternate advisor layouts so only fixed layout renders", function () {
    const cssPath = path.resolve(process.cwd(), "src", "renderer", "styles.css");
    const css = fs.readFileSync(cssPath, "utf8");
    expect(css.indexOf(".advisor-rail .advisor-expanded-only") !== -1).toBe(true);
    expect(css.indexOf(".advisor-rail .advisor-chat-block") !== -1).toBe(true);
    expect(css.indexOf("display: none") !== -1).toBe(true);
  });

  it("sidebar width CSS var is applied", function () {
    const cssPath = path.resolve(process.cwd(), "src", "renderer", "styles.css");
    const css = fs.readFileSync(cssPath, "utf8");
    expect(css.indexOf("--advisor-rail-width") !== -1).toBe(true);
    expect(css.indexOf("var(--advisor-rail-width)") !== -1).toBe(true);
    expect(css.indexOf("width: var(--advisor-rail-width)") !== -1).toBe(true);
  });
});

// ===============================================================
// WHY: Day 65 lock - Recent Activity tray overlays nav+center and never extends under PathAdvisor.
// HOW: Assert tray is inside workspace-left wrapper and PathAdvisor is outside it.
// ===============================================================
describe("Recent Activity tray width and placement", function () {
  it("tray is mounted within workspace-left wrapper (nav + center)", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    const wrapperIdx = html.indexOf('class="workspace-left"');
    const mainOpenIdx = html.indexOf('<main id="workspace"');
    const mainCloseIdx = html.indexOf("</main>");
    const trayIdx = html.indexOf('class="activity-tray-container');
    const navIdx = html.indexOf('id="left-nav"');
    const workspaceIdx = html.indexOf('id="workspace"');
    const railIdx = html.indexOf('id="pathadvisor-rail"');

    expect(wrapperIdx !== -1).toBe(true);
    expect(trayIdx !== -1).toBe(true);
    expect(navIdx !== -1).toBe(true);
    expect(workspaceIdx !== -1).toBe(true);
    expect(railIdx !== -1).toBe(true);
    expect(navIdx > wrapperIdx).toBe(true);
    expect(workspaceIdx > wrapperIdx).toBe(true);
    expect(trayIdx > wrapperIdx).toBe(true);
    expect(mainOpenIdx !== -1).toBe(true);
    expect(mainCloseIdx !== -1).toBe(true);
    // Tray must be a sibling under workspace-left (nav+center wrapper), not nested inside center main.
    expect(trayIdx > mainCloseIdx).toBe(true);
    expect(trayIdx < railIdx).toBe(true);
    expect(html.indexOf("activity-tray--collapsed") !== -1).toBe(true);
    const mainSlice = html.slice(mainOpenIdx, mainCloseIdx);
    expect(mainSlice.indexOf("activity-tray-container") === -1).toBe(true);
  });

  it("PathAdvisor remains outside tray wrapper and full-height", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    const cssPath = path.resolve(process.cwd(), "src", "renderer", "styles.css");
    const css = fs.readFileSync(cssPath, "utf8");
    const railIdx = html.indexOf('id="pathadvisor-rail"');
    const trayIdx = html.indexOf('class="activity-tray-container');

    expect(railIdx !== -1).toBe(true);
    expect(trayIdx !== -1).toBe(true);
    expect(railIdx > trayIdx).toBe(true);
    expect(html.indexOf("advisor-rail--full-height") !== -1).toBe(true);
    expect(css.indexOf("height: 100%") !== -1).toBe(true);
  });

  it("tray keeps overlay positioning and bounded expanded height", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    const cssPath = path.resolve(process.cwd(), "src", "renderer", "styles.css");
    const css = fs.readFileSync(cssPath, "utf8");
    const trayRuleMatch = css.match(
      /\.activity-tray-container\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?bottom:\s*0;[\s\S]*?\}/
    );

    expect(Boolean(trayRuleMatch)).toBe(true);
    expect(css.indexOf("--activity-tray-max-height") !== -1).toBe(true);
    expect(css.indexOf(".activity-body") !== -1).toBe(true);
    expect(css.indexOf("overflow-y: auto") !== -1).toBe(true);
    expect(css.indexOf(".activity-tray-container.activity-tray--collapsed") !== -1).toBe(
      true
    );
    expect(css.indexOf("height: var(--activity-tray-collapsed-height)") !== -1).toBe(
      true
    );
    expect(css.indexOf("padding: 0 16px") !== -1).toBe(true);
    expect(css.indexOf(".activity-tray-container.activity-tray--collapsed .activity-header-subtitle") !== -1).toBe(
      true
    );
    expect(html.indexOf('class="activity-header-subtitle"') !== -1).toBe(true);
    expect(css.indexOf(".activity-tray-container.activity-tray--collapsed .activity-header") !== -1).toBe(
      true
    );
    expect(css.indexOf("justify-content: space-between") !== -1).toBe(true);
    expect(css.indexOf("width: auto") !== -1).toBe(true);
    expect(css.indexOf("left: 0") !== -1).toBe(true);
    expect(css.indexOf("right: 0") !== -1).toBe(true);
    expect(css.indexOf("bottom: 0") !== -1).toBe(true);
    expect(css.indexOf("margin-left: 0") !== -1).toBe(true);
    expect(css.indexOf("transform: none") !== -1).toBe(true);
    expect(css.indexOf(".activity-tray-container > .activity-log") !== -1).toBe(true);
    expect(css.indexOf("max-width: none") !== -1).toBe(true);
    expect(css.indexOf("display: none") !== -1).toBe(true);
  });

  it("anchors tray to workspace-left consistently across focus and non-focus modes", function () {
    const cssPath = path.resolve(process.cwd(), "src", "renderer", "styles.css");
    const css = fs.readFileSync(cssPath, "utf8");
    const workspaceLeftRule = css.match(
      /\.workspace-left\s*\{[\s\S]*?height:\s*100%;[\s\S]*?overflow:\s*hidden;[\s\S]*?position:\s*relative;[\s\S]*?\}/
    );
    expect(Boolean(workspaceLeftRule)).toBe(true);
    expect(css.indexOf("body.is-workspace-focus-mode .activity-tray-container.is-collapsed") === -1).toBe(
      true
    );
    expect(css.indexOf("body.is-workspace-focus-mode .activity-tray-container:not(.is-collapsed)") === -1).toBe(
      true
    );
    expect(css.indexOf("body.is-workspace-focus-mode .activity-log.is-collapsed") === -1).toBe(
      true
    );
    expect(css.indexOf("body.is-workspace-focus-mode .activity-log:not(.is-collapsed)") === -1).toBe(
      true
    );
  });

  it("USAJOBS viewport has clip wrapper and tray overlay z-index is above center content", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    const cssPath = path.resolve(process.cwd(), "src", "renderer", "styles.css");
    const rendererJsPath = path.resolve(
      process.cwd(),
      "src",
      "renderer",
      "renderer.js"
    );
    const css = fs.readFileSync(cssPath, "utf8");
    const rendererJs = fs.readFileSync(rendererJsPath, "utf8");
    expect(html.indexOf("usajobs-viewport-clip") !== -1).toBe(true);
    expect(css.indexOf(".usajobs-viewport-clip") !== -1).toBe(true);
    expect(css.indexOf("overflow: hidden") !== -1).toBe(true);
    expect(css.indexOf(".usajobs-viewport") !== -1).toBe(true);
    expect(css.indexOf("z-index: 0") !== -1).toBe(true);
    expect(css.indexOf("--activity-tray-collapsed-height: 48px") !== -1).toBe(true);
    expect(css.indexOf("--activity-tray-expanded-height: 240px") !== -1).toBe(true);
    expect(
      css.indexOf(".workspace-left.activity-tray-route-explore .usajobs-viewport-clip") !==
        -1
    ).toBe(true);
    expect(
      css.indexOf(
        "height: calc(100% - var(--activity-tray-collapsed-height));"
      ) !== -1
    ).toBe(true);
    expect(
      css.indexOf(
        ".workspace-left.activity-tray-open.activity-tray-route-explore .usajobs-viewport-clip"
      ) !== -1
    ).toBe(true);
    expect(
      css.indexOf(
        "height: calc(100% - var(--activity-tray-expanded-height));"
      ) !== -1
    ).toBe(true);
    expect(
      css.indexOf(
        ".workspace-left.activity-tray-open.activity-tray-route-explore .usajobs-viewport-clip"
      ) !== -1
    ).toBe(true);
    expect(rendererJs.indexOf("activity-tray-open") !== -1).toBe(true);
    expect(rendererJs.indexOf("activity-tray-route-explore") !== -1).toBe(true);
    expect(css.indexOf(".activity-tray-container") !== -1).toBe(true);
    expect(css.indexOf("z-index: 1000") !== -1).toBe(true);
    expect(css.indexOf("transform: none") !== -1).toBe(true);
  });

  it("invokes USAJOBS viewport resize hook when tray state changes on explore route", function () {
    const rendererJsPath = path.resolve(
      process.cwd(),
      "src",
      "renderer",
      "renderer.js"
    );
    const rendererJs = fs.readFileSync(rendererJsPath, "utf8");
    expect(rendererJs.indexOf("const resizeUsajobsViewportForTray = () =>") !== -1).toBe(
      true
    );
    expect(rendererJs.indexOf('activeWorkspaceView !== "explore"') !== -1).toBe(true);
    expect(rendererJs.indexOf("const setCollapsedState = (log, toggle, isCollapsed) =>") !== -1).toBe(true);
    expect(rendererJs.indexOf("syncWorkspaceLeftTrayState(log, isCollapsed);") !== -1).toBe(
      true
    );
    expect(rendererJs.indexOf("resizeUsajobsViewportForTray();") !== -1).toBe(true);
    expect(
      rendererJs.indexOf("window.requestAnimationFrame(() => {") !== -1
    ).toBe(true);
    expect(rendererJs.indexOf('tray.classList.toggle("activity-tray--collapsed", isCollapsed);') !== -1).toBe(
      true
    );
    expect(rendererJs.indexOf('tray.classList.toggle("activity-tray--open", !isCollapsed);') !== -1).toBe(
      true
    );
  });
});

describe("PathAdvisor fixed composer sizing", function () {
  it("keeps minimal composer in a row with full-width textarea", function () {
    const cssPath = path.resolve(process.cwd(), "src", "renderer", "styles.css");
    const css = fs.readFileSync(cssPath, "utf8");
    expect(css.indexOf(".advisor-input.advisor-input-minimal") !== -1).toBe(true);
    expect(css.indexOf("flex-direction: row") !== -1).toBe(true);
    expect(css.indexOf(".advisor-input.advisor-input-minimal textarea") !== -1).toBe(
      true
    );
    expect(css.indexOf("width: 100%") !== -1).toBe(true);
    expect(css.indexOf("flex: 0 0 auto") !== -1).toBe(true);
  });
});

// ===============================================================
// WHY: Activity Log route must render as a normal center page, not tray UI.
// HOW: Assert nav, center route content, and PathAdvisor all exist in markup.
// ===============================================================
describe("Activity Log route layout", function () {
  it("renders nav + center route content + PathAdvisor", function () {
    const htmlPath = resolveAppHtmlPath();
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html.indexOf('id="left-nav"') !== -1).toBe(true);
    expect(html.indexOf('id="activity-log-view"') !== -1).toBe(true);
    expect(html.indexOf("data-activity-log-page") !== -1).toBe(true);
    expect(html.indexOf('id="pathadvisor-rail"') !== -1).toBe(true);
  });
});
