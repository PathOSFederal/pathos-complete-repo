/* eslint-disable no-undef */
"use strict";

// =====================================================================
// WHY: Renderer boot errors must only show banners before readiness.
// HOW: Centralize banner gating to reuse in tests and renderer.js.
// =====================================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PathOSRendererDiagnostics = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  const DEFAULT_FATAL_MESSAGE =
    "PathOS UI failed to initialize (renderer error). Open DevTools to view details.";

  function normalizeErrorMessage(error) {
    if (!error) {
      return "";
    }
    const raw =
      typeof error === "string"
        ? error
        : error && typeof error.message === "string"
          ? error.message
          : String(error);
    return raw.replace(/\s+/g, " ").trim().slice(0, 160);
  }

  function createRendererDiagnostics(options = {}) {
    const getBannerById =
      typeof options.getBannerById === "function"
        ? options.getBannerById
        : (bannerId) =>
            typeof document !== "undefined" ? document.getElementById(bannerId) : null;
    const appendActivityLogEntry =
      typeof options.appendActivityLogEntry === "function"
        ? options.appendActivityLogEntry
        : () => {};
    const normalizeActivityErrorMessage =
      typeof options.normalizeActivityErrorMessage === "function"
        ? options.normalizeActivityErrorMessage
        : normalizeErrorMessage;
    const isReady = typeof options.isReady === "function" ? options.isReady : () => false;
    const onConsoleError =
      typeof options.onConsoleError === "function" ? options.onConsoleError : () => {};

    function hideRendererBanner(bannerId) {
      const banner = getBannerById(bannerId);
      if (!banner) {
        return;
      }
      banner.hidden = true;
      banner.style.display = "none";
    }

    function hideAllRendererBanners() {
      hideRendererBanner("renderer-fatal-banner");
      hideRendererBanner("renderer-error-banner");
    }

    hideAllRendererBanners();

    function showRendererFatalBanner(message) {
      const banner = getBannerById("renderer-fatal-banner");
      if (!banner) {
        return;
      }
      hideRendererBanner("renderer-error-banner");
      if (typeof message === "string" && message.trim()) {
        banner.textContent = message.trim();
      }
      banner.hidden = false;
      banner.style.display = "flex";
    }

    function showRendererErrorBanner(message) {
      const banner = getBannerById("renderer-error-banner");
      if (!banner) {
        return;
      }
      hideRendererBanner("renderer-fatal-banner");
      if (typeof message === "string" && message.trim()) {
        const messageNode = banner.querySelector(".renderer-error-banner__message");
        if (messageNode) {
          messageNode.textContent = message.trim();
        }
      }
      banner.hidden = false;
      banner.style.display = "flex";
    }

    function handleRendererError(label, error) {
      onConsoleError(label, error);
      const errorDetail = normalizeActivityErrorMessage(error);
      const errorSuffix = errorDetail ? ` (${errorDetail})` : "";
      if (!isReady()) {
        showRendererFatalBanner(DEFAULT_FATAL_MESSAGE);
        appendActivityLogEntry(
          `UI failed to initialize (renderer error). Open DevTools.${errorSuffix}`,
          {
            level: "error",
          }
        );
        return;
      }
      hideAllRendererBanners();
      appendActivityLogEntry(`Renderer runtime error${errorSuffix}`, {
        level: "error",
      });
    }

    function markRendererReady() {
      hideAllRendererBanners();
      appendActivityLogEntry("UI initialized successfully", { level: "info" });
    }

    return {
      handleRendererError,
      markRendererReady,
      hideAllRendererBanners,
      showRendererFatalBanner,
      showRendererErrorBanner,
    };
  }

  return {
    createRendererDiagnostics,
  };
});
