/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRendererDiagnostics } from "../../src/renderer/renderer-diagnostics.js";

function buildDiagnosticsDom() {
  document.body.innerHTML = `
    <div id="renderer-fatal-banner" hidden></div>
    <div id="renderer-error-banner" hidden>
      <span class="renderer-error-banner__message"></span>
    </div>
  `;
}

function createHarness() {
  const activityLog = [];
  let ready = false;

  const diagnostics = createRendererDiagnostics({
    isReady: () => ready,
    appendActivityLogEntry: (message, meta = {}) => {
      activityLog.push({ message, level: meta.level });
    },
    getBannerById: (bannerId) => document.getElementById(bannerId),
  });

  return {
    diagnostics,
    activityLog,
    setReady: (value) => {
      ready = value;
    },
    getFatalBanner: () => document.getElementById("renderer-fatal-banner"),
    getErrorBanner: () => document.getElementById("renderer-error-banner"),
  };
}

describe("renderer diagnostics", () => {
  beforeEach(() => {
    buildDiagnosticsDom();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("starts with banners hidden", () => {
    const { getFatalBanner, getErrorBanner } = createHarness();

    expect(getFatalBanner().hidden).toBe(true);
    expect(getFatalBanner().style.display).toBe("none");
    expect(getErrorBanner().hidden).toBe(true);
    expect(getErrorBanner().style.display).toBe("none");
  });

  it("shows a fatal banner and logs on pre-ready window errors", () => {
    const { diagnostics, activityLog, getFatalBanner, getErrorBanner } = createHarness();

    diagnostics.handleRendererError("window.onerror", new Error("boom"));

    expect(getFatalBanner().hidden).toBe(false);
    expect(getFatalBanner().style.display).toBe("flex");
    expect(getErrorBanner().hidden).toBe(true);
    expect(activityLog).toHaveLength(1);
    expect(activityLog[0].level).toBe("error");
    expect(activityLog[0].message).toContain("UI failed to initialize");
  });

  it("keeps only the fatal banner visible on pre-ready unhandled rejections", () => {
    const { diagnostics, activityLog, getFatalBanner, getErrorBanner } = createHarness();

    diagnostics.handleRendererError("unhandledrejection", new Error("nope"));

    expect(getFatalBanner().hidden).toBe(false);
    expect(getErrorBanner().hidden).toBe(true);
    expect(activityLog).toHaveLength(1);
    expect(activityLog[0].level).toBe("error");
  });

  it("logs post-ready errors without showing banners", () => {
    const { diagnostics, activityLog, setReady, getFatalBanner, getErrorBanner } =
      createHarness();

    setReady(true);
    diagnostics.markRendererReady();
    diagnostics.handleRendererError("window.onerror", new Error("late boom"));

    expect(getFatalBanner().hidden).toBe(true);
    expect(getErrorBanner().hidden).toBe(true);
    expect(
      activityLog.some((entry) => entry.message.includes("UI initialized successfully"))
    ).toBe(true);
    expect(activityLog.some((entry) => entry.level === "error")).toBe(true);
    expect(
      activityLog.some((entry) => entry.message.includes("Renderer runtime error"))
    ).toBe(true);
    expect(
      activityLog.some((entry) => entry.message.includes("UI failed to initialize"))
    ).toBe(false);
  });

  it("logs string rejection reasons safely after ready", () => {
    const { diagnostics, activityLog, setReady, getFatalBanner, getErrorBanner } =
      createHarness();

    setReady(true);
    diagnostics.markRendererReady();
    diagnostics.handleRendererError("unhandledrejection", "plain failure");

    expect(getFatalBanner().hidden).toBe(true);
    expect(getErrorBanner().hidden).toBe(true);
    expect(activityLog.some((entry) => entry.message.includes("(plain failure)"))).toBe(
      true
    );
  });

  it("hides banners when marking the renderer ready after a pre-ready error", () => {
    const { diagnostics, setReady, getFatalBanner } = createHarness();

    diagnostics.handleRendererError("window.onerror", new Error("boom"));
    expect(getFatalBanner().hidden).toBe(false);

    setReady(true);
    diagnostics.markRendererReady();
    expect(getFatalBanner().hidden).toBe(true);
  });

  it("shows the non-fatal banner message when invoked directly", () => {
    const { diagnostics, getFatalBanner, getErrorBanner } = createHarness();

    diagnostics.showRendererErrorBanner("A recoverable error");

    expect(getErrorBanner().hidden).toBe(false);
    expect(getErrorBanner().style.display).toBe("flex");
    expect(getFatalBanner().hidden).toBe(true);
    expect(
      getErrorBanner().querySelector(".renderer-error-banner__message").textContent
    ).toBe("A recoverable error");
  });

  // ===============================================================
  // WHY: Exercise the empty-message branch for fatal banner updates.
  // HOW: Provide whitespace and confirm the existing text is preserved.
  // ===============================================================
  it("keeps the fatal banner text when message is blank", function () {
    const { diagnostics, getFatalBanner } = createHarness();

    getFatalBanner().textContent = "Existing fatal message";
    diagnostics.showRendererFatalBanner("   ");

    expect(getFatalBanner().textContent).toBe("Existing fatal message");
    expect(getFatalBanner().hidden).toBe(false);
  });

  it("does not throw if banners are missing", () => {
    document.body.innerHTML = "";
    const { diagnostics, activityLog } = createHarness();

    expect(() =>
      diagnostics.handleRendererError("window.onerror", new Error("boom"))
    ).not.toThrow();
    expect(() =>
      diagnostics.handleRendererError("unhandledrejection", new Error("nope"))
    ).not.toThrow();
    expect(activityLog.some((entry) => entry.level === "error")).toBe(true);
  });

  it("handles null and object rejection reasons safely", () => {
    const { diagnostics, activityLog } = createHarness();

    expect(() =>
      diagnostics.handleRendererError("unhandledrejection", null)
    ).not.toThrow();
    expect(() =>
      diagnostics.handleRendererError("unhandledrejection", { reason: "nope" })
    ).not.toThrow();

    expect(activityLog.some((entry) => entry.message.includes("[object Object]"))).toBe(
      true
    );
  });

  it("invokes the console hook and custom normalizer", () => {
    const activityLog = [];
    const onConsoleError = vi.fn();
    const diagnostics = createRendererDiagnostics({
      isReady: () => false,
      onConsoleError,
      normalizeActivityErrorMessage: () => "normalized message",
      appendActivityLogEntry: (message, meta = {}) => {
        activityLog.push({ message, level: meta.level });
      },
    });

    diagnostics.handleRendererError("window.onerror", new Error("boom"));

    expect(onConsoleError).toHaveBeenCalled();
    expect(activityLog[0].message).toContain("(normalized message)");
  });

  it("skips error banner work when the banner is missing", () => {
    document.body.innerHTML = "";
    const diagnostics = createRendererDiagnostics();

    expect(() => diagnostics.showRendererErrorBanner("missing")).not.toThrow();
  });

  it("handles missing document safely in the default lookup", () => {
    const originalDocument = globalThis.document;
    globalThis.document = undefined;
    try {
      const diagnostics = createRendererDiagnostics();
      expect(() =>
        diagnostics.handleRendererError("window.onerror", new Error("boom"))
      ).not.toThrow();
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it("does not crash when banner elements are missing", () => {
    const activityLog = [];
    const diagnostics = createRendererDiagnostics({
      isReady: () => false,
      getBannerById: () => null,
      appendActivityLogEntry: (message, meta = {}) => {
        activityLog.push({ message, level: meta.level });
      },
    });

    expect(() =>
      diagnostics.handleRendererError("window.onerror", new Error("boom"))
    ).not.toThrow();
    expect(activityLog).toHaveLength(1);
    expect(activityLog[0].level).toBe("error");
  });
});
