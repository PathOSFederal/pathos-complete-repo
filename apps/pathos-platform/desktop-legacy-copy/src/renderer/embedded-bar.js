/* eslint-disable no-undef */
"use strict";

// ============================================
// EMBEDDED BAR HELPERS (PERSISTENT CONTROLS)
// ============================================
// WHY: The persistent toolbar still needs deterministic logic that works in
//      the browser runtime and Node tests without introducing DOM dependencies.
// HOW: Expose small helpers through a UMD wrapper so renderer.js can call
//      them via window while tests can require the same functions directly.
// ============================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PathOSEmbeddedBar = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  const HOME_URL = "https://www.usajobs.gov/";

  // WHY: Ensure we always store a URL string for auditing or debugging.
  // HOW: Normalize to the USAJOBS home URL when data is missing.
  function normalizeUrl(rawUrl) {
    if (typeof rawUrl !== "string") {
      return HOME_URL;
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return HOME_URL;
    }
    return trimmed;
  }

  // WHY: Preserve the latest URL without rendering a full address field.
  // HOW: Store the normalized URL on the bar dataset for easy inspection.
  function storeCurrentUrl(bar, rawUrl) {
    const nextUrl = normalizeUrl(rawUrl);
    if (bar && bar.dataset) {
      bar.dataset.currentUrl = nextUrl;
    }
    return nextUrl;
  }

  // WHY: Disabled back/forward states prevent broken navigation affordances.
  // HOW: Toggle the disabled property using explicit booleans.
  function updateNavButtons(elements, canGoBack, canGoForward) {
    if (!elements) {
      return;
    }
    if (elements.backButton) {
      elements.backButton.disabled = !canGoBack;
    }
    if (elements.forwardButton) {
      elements.forwardButton.disabled = !canGoForward;
    }
  }

  // WHY: Loading feedback should be visible without changing bar height.
  // HOW: Toggle a class on the bar and aria-hidden on the indicator.
  function setLoadingState(bar, loadingIndicator, isLoading) {
    if (bar) {
      bar.classList.toggle("is-loading", isLoading);
    }
    if (loadingIndicator) {
      loadingIndicator.setAttribute("aria-hidden", isLoading ? "false" : "true");
    }
  }

  return {
    HOME_URL,
    normalizeUrl,
    storeCurrentUrl,
    updateNavButtons,
    setLoadingState,
  };
});
